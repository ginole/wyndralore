import crypto from "node:crypto";
import { prisma } from "./db";
import { PlanId } from "./pricing";

const API_BASE = "https://api.lemonsqueezy.com/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

function variantIdFor(plan: PlanId): string {
  const key = `LEMONSQUEEZY_VARIANT_${plan.toUpperCase()}`;
  return requireEnv(key);
}

// First-purchase discount codes — set up in Lemon Squeezy scoped to their respective variants
// (Monthly $9.90 -> $5, Yearly $49 -> $39). Lifetime never discounts.
const FIRST_TIME_DISCOUNT: Partial<Record<PlanId, string>> = {
  monthly: "FIRSTMONTH",
  yearly: "FIRSTYEAR",
};

/** True if this user has never had a fully paid order (any plan) — eligible for the first-purchase discount. */
export async function isFirstTimeBuyer(userId: string): Promise<boolean> {
  const priorPaid = await prisma.order.findFirst({ where: { userId, status: "paid" } });
  return !priorPaid;
}

interface CreateCheckoutArgs {
  plan: PlanId;
  orderCode: string;
  email: string;
  firstTimeBuyer: boolean;
}

/** Creates a Lemon Squeezy hosted checkout and returns its URL. */
export async function createLemonSqueezyCheckout({ plan, orderCode, email, firstTimeBuyer }: CreateCheckoutArgs): Promise<string> {
  const discountCode = firstTimeBuyer ? FIRST_TIME_DISCOUNT[plan] : undefined;

  const res = await fetch(`${API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("LEMONSQUEEZY_API_KEY")}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email,
            custom: { order_code: orderCode },
            ...(discountCode ? { discount_code: discountCode } : {}),
          },
        },
        relationships: {
          store: { data: { type: "stores", id: requireEnv("LEMONSQUEEZY_STORE_ID") } },
          variant: { data: { type: "variants", id: variantIdFor(plan) } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lemon Squeezy checkout creation failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (typeof url !== "string") throw new Error("Lemon Squeezy response missing checkout URL");
  return url;
}

/** Verifies the `X-Signature` header (HMAC-SHA256 hex digest of the raw body). */
export function verifyLemonSqueezySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET not set — skipping signature verification (dev mode only).");
    return true;
  }
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}
