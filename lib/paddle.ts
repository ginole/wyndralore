import crypto from "node:crypto";
import { PlanId, BillingMode } from "./pricing";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

export type AiReadCheckoutKind = "ai_single" | "ai_overage";

const PRICE_ENV: Record<PlanId | AiReadCheckoutKind, string> = {
  monthly: "PADDLE_PRICE_MONTHLY",
  yearly: "PADDLE_PRICE_YEARLY",
  lifetime: "PADDLE_PRICE_LIFETIME",
  ai_single: "PADDLE_PRICE_AI_SINGLE",
  ai_overage: "PADDLE_PRICE_AI_OVERAGE",
};

// The auto-renewing (subscription) prices — only monthly/yearly have one. lifetime + AI reads are
// always one-time, so they have no entry here and fall through to the one-time PRICE_ENV.
const SUB_PRICE_ENV: Partial<Record<PlanId, string>> = {
  monthly: "PADDLE_PRICE_MONTHLY_SUB",
  yearly: "PADDLE_PRICE_YEARLY_SUB",
};

/** The Paddle Price id for a membership plan (in the given billing mode) or AI-read kind. Defaults
 * to the one-time price; only monthly/yearly + "sub" resolve to a recurring subscription price. */
export function priceIdFor(planOrKind: PlanId | AiReadCheckoutKind, billingMode: BillingMode = "onetime"): string {
  if (billingMode === "sub" && (planOrKind === "monthly" || planOrKind === "yearly")) {
    return requireEnv(SUB_PRICE_ENV[planOrKind]!);
  }
  return requireEnv(PRICE_ENV[planOrKind]);
}

/**
 * The Price id(s) we accept for a paid transaction, based on what the order is for — same anti-fraud
 * purpose as expectedVariantIdForOrder in lib/lemonsqueezy.ts: a $1.99 add-on checkout's
 * custom_data.orderCode could otherwise be pointed at a $129 lifetime order and get it credited for
 * free. Returns BOTH the one-time and subscription price for a membership plan, because the order
 * itself doesn't record which billing mode the buyer picked — either legitimate price must pass.
 */
export function expectedPriceIdsForOrder(order: { kind: string; plan: string }): string[] {
  if (order.kind === "ai_single" || order.kind === "ai_overage") return [priceIdFor(order.kind)];
  const plan = order.plan as PlanId;
  const ids = [priceIdFor(plan, "onetime")];
  if (plan === "monthly" || plan === "yearly") ids.push(priceIdFor(plan, "sub"));
  return ids;
}

/**
 * Verifies Paddle's `Paddle-Signature` header: `ts=<unix>;h1=<hex>`, where h1 is the HMAC-SHA256
 * of `${ts}:${rawBody}` using the notification destination's signing secret. Same fail-closed
 * pattern as verifyLemonSqueezySignature in lib/lemonsqueezy.ts.
 */
export function verifyPaddleSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[paddle] PADDLE_WEBHOOK_SECRET not set — skipping signature verification (dev mode only).");
    return true;
  }
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(h1, "utf8");
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}
