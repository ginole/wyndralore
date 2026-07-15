import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderCode } from "@/lib/orderCode";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { planIdFor, createCheckoutSession, AiReadCheckoutKind } from "@/lib/whop";
import { AI_SINGLE_PRICE_USD, AI_OVERAGE_PRICE_USD } from "@/lib/aiQuota";
import { getSpread } from "@/lib/spreads";

const ORDER_TTL_MS = 48 * 60 * 60 * 1000;
const SITE_URL = "https://wyndralore.com";

const PRICE_BY_KIND: Record<AiReadCheckoutKind, number> = {
  ai_single: AI_SINGLE_PRICE_USD,
  ai_overage: AI_OVERAGE_PRICE_USD,
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawKind = body?.kind;
  if (rawKind !== "ai_single" && rawKind !== "ai_overage") {
    return NextResponse.json({ error: "Invalid purchase kind." }, { status: 400 });
  }
  const kind: AiReadCheckoutKind = rawKind;

  // Bounce the buyer back to the exact spread they were reading, not just some generic page —
  // the frontend restores their drawn cards from sessionStorage when it sees `?resume=1`.
  const spreadSlug = typeof body?.spreadSlug === "string" ? body.spreadSlug : "";
  if (!getSpread(spreadSlug)) return NextResponse.json({ error: "Invalid spread." }, { status: 400 });
  const redirectUrl = `${SITE_URL}/reading/${spreadSlug}?resume=1`;

  const expiresAt = new Date(Date.now() + ORDER_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    try {
      const order = await prisma.order.create({
        data: { code, userId: user.id, plan: kind, kind, amountUsd: PRICE_BY_KIND[kind], expiresAt },
      });
      await trackEvent("order_created", { anonId: await getAnonId(), userId: user.id, props: { kind } });

      // The session carries our orderCode through Whop's checkout and back on the webhook, plus the
      // creator's Whop username when the buyer came in on a ?a= link, so Whop can pay her.
      const planId = planIdFor(kind);
      const whopAffiliate = typeof body?.whopAffiliate === "string" ? body.whopAffiliate.trim() : undefined;
      const sessionId = await createCheckoutSession(planId, order.code, redirectUrl, whopAffiliate || undefined);
      return NextResponse.json({ order, planId, sessionId, redirectUrl }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
