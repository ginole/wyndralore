import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlanId, isBillingMode, planOption, BillingMode } from "@/lib/pricing";
import { generateOrderCode } from "@/lib/orderCode";
import { trackEvent, getAnonId } from "@/lib/analytics";
import { priceIdFor } from "@/lib/paddle";

const ORDER_TTL_MS = 48 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  if (typeof plan !== "string" || !isPlanId(plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  // Auto-renew vs one-time. Lifetime has no subscription price, so it's always one-time regardless
  // of what the client asked for.
  const requested = typeof body?.billingMode === "string" && isBillingMode(body.billingMode) ? body.billingMode : "onetime";
  const billingMode: BillingMode = plan === "lifetime" ? "onetime" : requested;
  const option = planOption(plan, billingMode);
  const expiresAt = new Date(Date.now() + ORDER_TTL_MS);

  // Retry on the astronomically unlikely event of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    try {
      const order = await prisma.order.create({
        data: { code, userId: user.id, plan, amountUsd: option.amountUsd, expiresAt },
      });
      await trackEvent("order_created", { anonId: await getAnonId(), userId: user.id, props: { plan, billingMode } });

      const priceId = priceIdFor(plan, billingMode);
      return NextResponse.json({ order, priceId }, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "Could not generate an order code, try again." }, { status: 500 });
}
