import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlanId, PLANS } from "@/lib/pricing";
import { generateOrderCode } from "@/lib/orderCode";
import { trackEvent, getAnonId } from "@/lib/analytics";

const ORDER_TTL_MS = 48 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  if (typeof plan !== "string" || !isPlanId(plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const definition = PLANS[plan];
  const expiresAt = new Date(Date.now() + ORDER_TTL_MS);

  // Retry on the astronomically unlikely event of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    try {
      const order = await prisma.order.create({
        data: { code, userId, plan, amountUsd: definition.amountUsd, expiresAt },
      });
      await trackEvent("order_created", { anonId: await getAnonId(), userId, props: { plan } });
      return NextResponse.json({ order }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
