import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderCode } from "@/lib/orderCode";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { createAiReadCheckout, AiReadCheckoutKind } from "@/lib/lemonsqueezy";
import { AI_SINGLE_PRICE_USD, AI_OVERAGE_PRICE_USD } from "@/lib/aiQuota";

const ORDER_TTL_MS = 48 * 60 * 60 * 1000;

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

  const expiresAt = new Date(Date.now() + ORDER_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    try {
      const order = await prisma.order.create({
        data: { code, userId: user.id, plan: kind, kind, amountUsd: PRICE_BY_KIND[kind], expiresAt },
      });
      await trackEvent("order_created", { anonId: await getAnonId(), userId: user.id, props: { kind } });

      const checkoutUrl = await createAiReadCheckout({ kind, orderCode: order.code, email: user.email });
      return NextResponse.json({ order, checkoutUrl }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
