import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const eventCount = (name: string, since?: Date) =>
    prisma.analyticsEvent.count({ where: { name, ...(since ? { createdAt: { gte: since } } : {}) } });

  const [
    signupsToday,
    signupsWeek,
    drawsToday,
    drawsWeek,
    ordersWeek,
    ordersPaidWeek,
    planCounts,
    unmatchedCount,
    visitsWeek,
    signupEventsWeek,
    readingsWeek,
    quotaExhaustedWeek,
    shareClicksWeek,
    adsCompletedWeek,
    pricingViewsWeek,
    orderCreatedEventsWeek,
    paymentCompletedWeek,
    planSelectionGroups,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.drawEvent.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.drawEvent.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfWeek }, status: "paid" } }),
    prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
    prisma.wiseWebhookEvent.count({ where: { status: { in: ["unmatched", "underpaid", "duplicate"] } } }),
    eventCount("visit", startOfWeek),
    eventCount("signup", startOfWeek),
    eventCount("reading_completed", startOfWeek),
    eventCount("quota_exhausted", startOfWeek),
    eventCount("share_click", startOfWeek),
    eventCount("ad_completed", startOfWeek),
    eventCount("pricing_view", startOfWeek),
    eventCount("order_created", startOfWeek),
    eventCount("payment_completed", startOfWeek),
    prisma.order.groupBy({ by: ["plan"], where: { status: "paid" }, _count: { plan: true } }),
  ]);

  return NextResponse.json({
    signupsToday,
    signupsWeek,
    drawsToday,
    drawsWeek,
    ordersWeek,
    ordersPaidWeek,
    conversionRate: ordersWeek > 0 ? ordersPaidWeek / ordersWeek : 0,
    planCounts: planCounts.map((p) => ({ plan: p.plan, count: p._count.plan })),
    unmatchedCount,
    funnel: {
      visits: visitsWeek,
      signups: signupEventsWeek,
      readings: readingsWeek,
      quotaExhausted: quotaExhaustedWeek,
      shareClicks: shareClicksWeek,
      adsCompleted: adsCompletedWeek,
      pricingViews: pricingViewsWeek,
      ordersCreated: orderCreatedEventsWeek,
      paymentsCompleted: paymentCompletedWeek,
      visitToSignup: visitsWeek > 0 ? signupEventsWeek / visitsWeek : 0,
      pricingToOrder: pricingViewsWeek > 0 ? orderCreatedEventsWeek / pricingViewsWeek : 0,
      orderToPayment: orderCreatedEventsWeek > 0 ? paymentCompletedWeek / orderCreatedEventsWeek : 0,
    },
    paidPlanMix: planSelectionGroups.map((p) => ({ plan: p.plan, count: p._count.plan })),
  });
}
