import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlanId, isBillingMode, planOption, PLANS, BillingMode } from "@/lib/pricing";
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
  // A retired tier is still a valid PlanId (existing holders keep it), but it can no longer be
  // bought — reject here too, not just by hiding the card on /pricing, since this endpoint is
  // callable directly.
  if (!PLANS[plan].purchasable) {
    return NextResponse.json({ error: "That plan is no longer available." }, { status: 400 });
  }

  // Auto-renew vs one-time. A plan with no subscription price is always one-time regardless of what
  // the client asked for.
  const requested = typeof body?.billingMode === "string" && isBillingMode(body.billingMode) ? body.billingMode : "onetime";
  const billingMode: BillingMode = PLANS[plan].sub ? requested : "onetime";
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
