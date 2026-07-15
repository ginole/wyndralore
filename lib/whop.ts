import crypto from "node:crypto";
import { PlanId, BillingMode } from "./pricing";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

/** Sandbox and production are the same API on different hosts — everything else is env-driven. */
export function whopApiBase(): string {
  return process.env.WHOP_ENVIRONMENT === "sandbox" ? "https://sandbox-api.whop.com/api" : "https://api.whop.com/api";
}

export type AiReadCheckoutKind = "ai_single" | "ai_overage";

// The one-time Whop Plan for each product. `lifetime` is deliberately absent: the tier was retired
// from sale (see PLANS.lifetime.purchasable in lib/pricing.ts — Whop prohibits offers advertising
// "lifetime" access), so no Whop plan exists for it and planIdFor("lifetime") throws by design.
const PLAN_ENV: Partial<Record<PlanId | AiReadCheckoutKind, string>> = {
  monthly: "WHOP_PLAN_MONTHLY",
  yearly: "WHOP_PLAN_YEARLY",
  ai_single: "WHOP_PLAN_AI_SINGLE",
  ai_overage: "WHOP_PLAN_AI_OVERAGE",
};

// The auto-renewing plans — only monthly/yearly have one. AI reads are always one-time.
const SUB_PLAN_ENV: Partial<Record<PlanId, string>> = {
  monthly: "WHOP_PLAN_MONTHLY_SUB",
  yearly: "WHOP_PLAN_YEARLY_SUB",
};

/** The Whop Plan id for a membership plan (in the given billing mode) or AI-read kind. Defaults to
 * the one-time plan; only monthly/yearly + "sub" resolve to a recurring plan. Mirrors priceIdFor()
 * in lib/paddle.ts. */
export function planIdFor(planOrKind: PlanId | AiReadCheckoutKind, billingMode: BillingMode = "onetime"): string {
  if (billingMode === "sub" && (planOrKind === "monthly" || planOrKind === "yearly")) {
    return requireEnv(SUB_PLAN_ENV[planOrKind]!);
  }
  const envName = PLAN_ENV[planOrKind];
  if (!envName) throw new Error(`No Whop plan configured for "${planOrKind}" (retired or unknown product)`);
  return requireEnv(envName);
}

/**
 * The Plan id(s) we accept for a paid webhook, based on what the order is for — same anti-fraud
 * purpose as expectedPriceIdsForOrder in lib/paddle.ts: a $1.99 add-on checkout's metadata.orderCode
 * could otherwise be pointed at a $49 yearly order and get it credited for free. Returns BOTH the
 * one-time and subscription plan for a membership, because the order doesn't record which billing
 * mode the buyer picked — either legitimate plan must pass.
 */
export function expectedPlanIdsForOrder(order: { kind: string; plan: string }): string[] {
  if (order.kind === "ai_single" || order.kind === "ai_overage") return [planIdFor(order.kind)];
  const plan = order.plan as PlanId;
  const ids = [planIdFor(plan, "onetime")];
  if (plan === "monthly" || plan === "yearly") ids.push(planIdFor(plan, "sub"));
  return ids;
}

/**
 * Creates a Whop checkout session so our own `orderCode` rides through the purchase and comes back
 * on the webhook as `data.metadata.orderCode` — the exact analogue of Paddle's `customData`, and the
 * only way the webhook can tell which Order a payment belongs to. Returns the session id, which the
 * client hands to Whop's embedded checkout.
 *
 * Uses v1 `/checkout_configurations` rather than v2 `/checkout_sessions` deliberately: the two are
 * the same resource (v1's input type is literally named CreateCheckoutSessionInput, and both return
 * the same `ch_…` id and `?session=` purchase URL), but **sandbox only exposes /api/v1** — v2 would
 * work in production and then fail the moment we point at sandbox.
 *
 * Do NOT send company_id: the API key already scopes the company and passing it 400s with
 * "Cannot provide company_id for this configuration".
 */
export async function createCheckoutSession(
  planId: string,
  orderCode: string,
  redirectUrl?: string
): Promise<string> {
  const res = await fetch(`${whopApiBase()}/v1/checkout_configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("WHOP_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      mode: "payment",
      metadata: { orderCode },
      ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Whop checkout session failed (${res.status}): ${await res.text()}`);
  }
  const session = (await res.json()) as { id?: string };
  if (!session.id) throw new Error("Whop checkout session returned no id");
  return session.id;
}

/**
 * Cancels a Whop membership at the END of the current billing period — the buyer keeps access until
 * renewal_period_end, matching our "cancel anytime, no lock-in" promise. Whop then fires
 * membership.cancel_at_period_end_changed, which the webhook reflects onto the user. Mirrors
 * cancelPaddleSubscription in lib/subscription.ts. Returns true on success.
 */
export async function cancelWhopMembership(membershipId: string): Promise<boolean> {
  const key = process.env.WHOP_API_KEY;
  if (!key) return false;
  const res = await fetch(`${whopApiBase()}/v1/memberships/${membershipId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancellation_mode: "at_period_end" }),
  });
  return res.ok;
}

const REPLAY_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verifies a Whop webhook. Whop follows the Standard Webhooks spec, which is NOT Paddle's scheme:
 *   • headers: `webhook-id`, `webhook-timestamp` (unix seconds), `webhook-signature`
 *   • signature header holds one or more space-separated `v1,<base64>` entries (secrets can be
 *     rotated, so several may be valid at once) — accept if ANY matches.
 *   • signed content is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 with the secret's base64-DECODED
 *     bytes, compared as base64.
 *
 * ⚠️ Whop issues the secret as **`ws_<base64>`**, NOT the spec's `whsec_<base64>`. That matters: the
 * reference `standardwebhooks` library only strips `whsec_`, so handing it Whop's key makes it
 * base64-decode the literal "ws_…" — and `_` isn't in the base64 alphabet, so you get either a throw
 * or (in Node's lenient decoder) a silently wrong key and a 100% signature-failure rate. Verified by
 * decoding a real key: strip `ws_` → the remaining 64 chars are clean base64 → a 48-byte key;
 * decoding the whole string yields 50 bytes of garbage. Both prefixes are stripped here.
 *
 * Fails closed in production when the secret is unset, matching verifyPaddleSignature.
 */
export function verifyWhopSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null }
): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[whop] WHOP_WEBHOOK_SECRET not set — skipping signature verification (dev mode only).");
    return true;
  }
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Reject stale deliveries so a captured request can't be replayed indefinitely.
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(Date.now() / 1000 - sentAt) > REPLAY_TOLERANCE_SECONDS) return false;

  const keyBytes = Buffer.from(secret.replace(/^(whsec_|ws_)/, ""), "base64");
  const expected = crypto.createHmac("sha256", keyBytes).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  const expectedBuf = Buffer.from(expected, "utf8");

  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const givenBuf = Buffer.from(value, "utf8");
    if (givenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, givenBuf);
  });
}
