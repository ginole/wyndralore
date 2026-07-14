import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlanId, PLANS } from "@/lib/pricing";
import { generateOrderCode } from "@/lib/orderCode";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { isFirstTimeBuyer } from "@/lib/lemonsqueezy";
import { priceIdFor, firstTimeDiscountIdFor } from "@/lib/paddle";

const ORDER_TTL_MS = 48 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

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
        data: { code, userId: user.id, plan, amountUsd: definition.amountUsd, expiresAt },
      });
      await trackEvent("order_created", { anonId: await getAnonId(), userId: user.id, props: { plan } });

      const firstTimeBuyer = plan !== "lifetime" && (await isFirstTimeBuyer(user.id));
      const priceId = priceIdFor(plan);
      const discountId = firstTimeBuyer ? firstTimeDiscountIdFor(plan) : undefined;

      return NextResponse.json({ order, priceId, discountId }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
