import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseTrafficSource } from "@/lib/trafficSource";
import { prisma } from "@/lib/db";
import { generateOrderCode } from "@/lib/orderCode";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { planIdFor, createCheckoutSession, SpecialCheckoutKind } from "@/lib/whop";
import { TIP_PRICE_USD, YEAR_READING_PRICE_USD, LOVE_READING_PRICE_USD } from "@/lib/pricing";
import { AI_FOLLOWUP_PRICE_USD } from "@/lib/aiQuota";

const ORDER_TTL_MS = 48 * 60 * 60 * 1000;
const SITE_URL = "https://wyndralore.com";

const PRICE_BY_KIND: Record<SpecialCheckoutKind, number> = {
  ai_followup: AI_FOLLOWUP_PRICE_USD,
  year_reading: YEAR_READING_PRICE_USD,
  love_reading: LOVE_READING_PRICE_USD,
  tip: TIP_PRICE_USD,
};

/**
 * Checkout for the one-time specials (tip / follow-up question / year & love readings).
 * Same shape as /api/orders and /api/ai-reading/purchase: creates our Order, then a Whop
 * session carrying the orderCode (and the creator's ?a= code) — the webhook does the granting.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind as SpecialCheckoutKind;
  if (!(kind in PRICE_BY_KIND)) {
    return NextResponse.json({ error: "Invalid purchase kind." }, { status: 400 });
  }

  // Bounce back to where the buyer was; only same-site paths, never external.
  const rawRedirect = typeof body?.redirectPath === "string" ? body.redirectPath : "/account";
  const redirectUrl = `${SITE_URL}${rawRedirect.startsWith("/") ? rawRedirect : "/account"}`;

  const expiresAt = new Date(Date.now() + ORDER_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    try {
      const order = await prisma.order.create({
        data: { code, userId: user.id, plan: kind, kind, amountUsd: PRICE_BY_KIND[kind], expiresAt, ...parseTrafficSource(body?.source) },
      });
      await trackEvent("order_created", { anonId: await getAnonId(), userId: user.id, props: { kind } });

      const planId = planIdFor(kind);
      const whopAffiliate = typeof body?.whopAffiliate === "string" ? body.whopAffiliate.trim() : undefined;
      const sessionId = await createCheckoutSession(planId, order.code, redirectUrl, whopAffiliate || undefined);
      return NextResponse.json({ order, planId, sessionId }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
