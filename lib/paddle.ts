import crypto from "node:crypto";
import { PlanId } from "./pricing";

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

/** The Paddle Price id for a membership plan or AI-read kind — set up in lib/masters.ts-style env vars. */
export function priceIdFor(planOrKind: PlanId | AiReadCheckoutKind): string {
  return requireEnv(PRICE_ENV[planOrKind]);
}

const FIRST_TIME_DISCOUNT_ENV: Partial<Record<PlanId, string>> = {
  monthly: "PADDLE_DISCOUNT_FIRSTMONTH",
  yearly: "PADDLE_DISCOUNT_FIRSTYEAR",
};

/** The first-purchase discount id for a plan, if one exists (lifetime never discounts). Eligibility
 * (has this buyer ever paid before?) is decided by the caller via isFirstTimeBuyer — this just
 * resolves which discount env var applies once the caller has already decided to offer one. */
export function firstTimeDiscountIdFor(plan: PlanId): string | undefined {
  const envName = FIRST_TIME_DISCOUNT_ENV[plan];
  return envName ? process.env[envName] || undefined : undefined;
}

/**
 * The Price id we expect a paid transaction to actually be for, based on what we created the
 * checkout with — same anti-fraud purpose as expectedVariantIdForOrder in lib/lemonsqueezy.ts: a
 * $1.99 add-on checkout's custom_data.orderCode could otherwise be pointed at a $79 lifetime
 * order and get it credited for free.
 */
export function expectedPriceIdForOrder(order: { kind: string; plan: string }): string {
  if (order.kind === "ai_single" || order.kind === "ai_overage") return priceIdFor(order.kind);
  return priceIdFor(order.plan as PlanId);
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
