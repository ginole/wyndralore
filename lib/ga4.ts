import crypto from "node:crypto";

// Server-side GA4 Measurement Protocol. Fires a `purchase` event straight from our payment
// webhook — same reason as lib/metaCapi.ts's Purchase event: the payment lands server-side
// (Lemon Squeezy webhook) with no browser present to fire gtag('event', 'purchase', ...) from.
//
// No-ops unless BOTH NEXT_PUBLIC_GA_MEASUREMENT_ID and GA4_API_SECRET are set, so it stays
// dormant in dev/preview and until the Measurement Protocol secret is created in the GA4 UI
// (Admin → Data Streams → Web stream → Measurement Protocol API secrets).

interface PurchaseEventArgs {
  /** Stable per-user id to bucket the event under — there's no real _ga cookie available from a
   * server-side webhook, so this is a synthetic client_id (hashed user id), not a true GA session.
   * Good enough to record the event + value; won't merge into that visitor's actual GA timeline. */
  userId: string;
  value: number;
  currency?: string;
  transactionId: string;
  itemName?: string;
}

export async function sendGa4PurchaseEvent(args: PurchaseEventArgs): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return; // dormant until configured

  const clientId = crypto.createHash("sha256").update(args.userId).digest("hex").slice(0, 32);

  const body = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: args.transactionId,
          value: args.value,
          currency: args.currency ?? "USD",
          ...(args.itemName ? { items: [{ item_name: args.itemName }] } : {}),
        },
      },
    ],
  };

  // Never throw into the caller — conversion tracking must not break payment processing.
  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[ga4] purchase event failed (${res.status}):`, text.slice(0, 300));
    }
  } catch (err) {
    console.warn("[ga4] purchase event error:", err);
  }
}
