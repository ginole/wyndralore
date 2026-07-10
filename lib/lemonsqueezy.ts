import crypto from "node:crypto";
import { prisma } from "./db";
import { PlanId } from "./pricing";
import { MasterProductKind } from "./masters";

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

const SITE_URL = "https://wyndralore.com";

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
          // Without this, Lemon Squeezy's own "Thank you" screen is the end of the flow —
          // the buyer has to manually navigate back. Send them straight to their account page.
          product_options: { redirect_url: `${SITE_URL}/account` },
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

export type AiReadCheckoutKind = "ai_single" | "ai_overage";

const AI_READ_VARIANT_ENV: Record<AiReadCheckoutKind, string> = {
  ai_single: "LEMONSQUEEZY_VARIANT_AI_SINGLE",
  ai_overage: "LEMONSQUEEZY_VARIANT_AI_OVERAGE",
};

/**
 * The variant id we expect a paid order to actually be for, based on what we created the
 * checkout with. The webhook handler compares this against the variant Lemon Squeezy says was
 * purchased — otherwise a $1.99 add-on checkout could be pointed (via custom_data.order_code)
 * at a $79 lifetime order and get credited for the wrong thing entirely.
 */
export function expectedVariantIdForOrder(order: { kind: string; plan: string }): string {
  if (order.kind === "ai_single" || order.kind === "ai_overage") {
    return requireEnv(AI_READ_VARIANT_ENV[order.kind]);
  }
  return variantIdFor(order.plan as PlanId);
}

interface CreateAiReadCheckoutArgs {
  kind: AiReadCheckoutKind;
  orderCode: string;
  email: string;
  /** Where to send the buyer after paying — the exact reading page they came from, so the
   * "ritual" of the specific cards they already drew isn't broken by a redraw. */
  redirectUrl: string;
}

/** Creates a Lemon Squeezy checkout for a one-off AI deep-reading credit (not a plan purchase). */
export async function createAiReadCheckout({ kind, orderCode, email, redirectUrl }: CreateAiReadCheckoutArgs): Promise<string> {
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
          checkout_data: { email, custom: { order_code: orderCode } },
          product_options: { redirect_url: redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: requireEnv("LEMONSQUEEZY_STORE_ID") } },
          variant: { data: { type: "variants", id: requireEnv(AI_READ_VARIANT_ENV[kind]) } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lemon Squeezy AI-read checkout creation failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (typeof url !== "string") throw new Error("Lemon Squeezy response missing checkout URL");
  return url;
}

// "Meet Our Masters" storefront (AI-reading PRD follow-up). Both products are shared across every
// master — WHICH master and buyer an order belongs to is carried entirely in our own MasterOrder
// row (looked up by order_code), never as separate Lemon Squeezy products per creator. This is the
// same shared-product/custom_data-attribution shape as the AI-read add-ons above, just for a
// different pair of SKUs.
const MASTER_VARIANT_ENV: Record<MasterProductKind, string> = {
  ai_style: "LEMONSQUEEZY_VARIANT_MASTER_AI_STYLE",
  live_voice: "LEMONSQUEEZY_VARIANT_MASTER_LIVE_VOICE",
};

/** The variant id a paid MasterOrder is expected to actually be for — same anti-fraud purpose as
 * `expectedVariantIdForOrder`: stops a $9.90 checkout's custom_data being pointed at a $39 order. */
export function expectedVariantIdForMasterOrder(kind: MasterProductKind): string {
  return requireEnv(MASTER_VARIANT_ENV[kind]);
}

interface CreateMasterCheckoutArgs {
  kind: MasterProductKind;
  orderCode: string;
  email: string;
  /** Where to send the buyer after paying — back to the master's storefront page. */
  redirectUrl: string;
}

/** Creates a Lemon Squeezy checkout for a "Meet Our Masters" storefront purchase. */
export async function createMasterCheckout({ kind, orderCode, email, redirectUrl }: CreateMasterCheckoutArgs): Promise<string> {
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
          checkout_data: { email, custom: { order_code: orderCode } },
          product_options: { redirect_url: redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: requireEnv("LEMONSQUEEZY_STORE_ID") } },
          variant: { data: { type: "variants", id: expectedVariantIdForMasterOrder(kind) } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lemon Squeezy master checkout creation failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (typeof url !== "string") throw new Error("Lemon Squeezy response missing checkout URL");
  return url;
}

/**
 * Issues a full refund for a Lemon Squeezy order via their Orders API. Used by the SLA-sweep cron
 * when a master misses her delivery deadline — refunding proactively, before the buyer has any
 * reason to dispute with their bank, is the actual chargeback defense (see the Masters marketplace
 * fund-architecture brainstorm: a fast refund beats a slow one every time).
 */
export async function refundLemonSqueezyOrder(lsOrderId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/orders/${lsOrderId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("LEMONSQUEEZY_API_KEY")}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Lemon Squeezy refund failed (${res.status}): ${body}` };
  }
  return { ok: true };
}

/** Verifies the `X-Signature` header (HMAC-SHA256 hex digest of the raw body). */
export function verifyLemonSqueezySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed in production — an unset secret must never mean "accept anything". The
    // permissive skip is for local dev only, where a misconfigured/missing secret is expected.
    if (process.env.NODE_ENV === "production") return false;
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
