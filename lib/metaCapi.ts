import crypto from "node:crypto";

// Server-side Meta (Facebook) Conversions API. Fires a Purchase event straight from our payment
// webhook so ad ROAS tracking is accurate even though the payment lands server-side (Lemon
// Squeezy webhook) with no reliable client-side moment to fire the browser pixel from.
//
// No-ops unless BOTH NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set, so it stays
// dormant in dev/preview and until the Meta setup is finished — same pattern as the browser pixel.

const GRAPH_VERSION = "v21.0";

/** Meta requires user identifiers to be SHA-256 hashed, lowercased and trimmed first. */
function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

interface PurchaseEventArgs {
  email: string;
  value: number;
  currency?: string;
  /** Dedup key shared with any client-side Purchase event (we use the order code). */
  eventId: string;
  contentName?: string;
}

export async function sendMetaPurchaseEvent(args: PurchaseEventArgs): Promise<void> {
  await sendEvent("Purchase", args.email, args.eventId, {
    value: args.value,
    currency: args.currency ?? "USD",
    ...(args.contentName ? { content_name: args.contentName } : {}),
  });
}

/**
 * CompleteRegistration for a SOCIAL sign-up. The password form fires this from the browser
 * (lib/pixel.ts), but an OAuth registration completes inside a server-side callback while the
 * browser is still mid-redirect from Google/LINE — there is no client moment to fire it in.
 */
export async function sendMetaRegistrationEvent(args: { email: string; eventId: string }): Promise<void> {
  await sendEvent("CompleteRegistration", args.email, args.eventId);
}

async function sendEvent(
  eventName: string,
  email: string,
  eventId: string,
  customData?: Record<string, unknown>,
): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) return; // dormant until configured

  const body = {
    access_token: token,
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId,
        user_data: { em: [hashEmail(email)] },
        ...(customData ? { custom_data: customData } : {}),
      },
    ],
  };

  // Never throw into the caller — conversion tracking must not break payment processing or a login.
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[meta-capi] ${eventName} event failed (${res.status}):`, text.slice(0, 300));
    }
  } catch (err) {
    console.warn(`[meta-capi] ${eventName} event error:`, err);
  }
}
