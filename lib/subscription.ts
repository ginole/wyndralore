import { prisma } from "./db";

function paddleApiBase(): string {
  return process.env.PADDLE_ENVIRONMENT === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
}

/**
 * Cancels a Paddle subscription at the END of the current billing period — the buyer keeps access
 * until currentPeriodEnd, matching our "cancel anytime, no lock-in" promise. Paddle then fires
 * subscription.updated/canceled, which the webhook reflects onto the user. Returns true on success.
 */
export async function cancelPaddleSubscription(subscriptionId: string): Promise<boolean> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) return false;
  const res = await fetch(`${paddleApiBase()}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ effective_from: "next_billing_period" }),
  });
  return res.ok;
}

// The Paddle subscription entity as delivered in subscription.* webhooks — only the fields we use.
export interface PaddleSubscriptionData {
  id?: string;
  status?: string;
  custom_data?: { orderCode?: string } | null;
  current_billing_period?: { starts_at?: string; ends_at?: string } | null;
  items?: { price?: { id?: string } }[];
}

async function userIdFromOrderCode(orderCode?: string): Promise<string | null> {
  if (!orderCode) return null;
  const order = await prisma.order.findUnique({ where: { code: orderCode }, select: { userId: true } });
  return order?.userId ?? null;
}

function periodEndOf(data: PaddleSubscriptionData): Date | null {
  const end = data.current_billing_period?.ends_at;
  return end ? new Date(end) : null;
}

/**
 * subscription.created — link the new Paddle subscription to the buyer (found via the checkout's
 * custom_data.orderCode) and align their plan expiry to Paddle's billing period. The initial plan
 * activation itself is handled by the transaction.completed → markOrderPaid path; this just records
 * the subscription so we can extend it on renewal and cancel it later.
 */
export async function linkSubscriptionToUser(data: PaddleSubscriptionData): Promise<void> {
  if (!data.id) return;
  const userId = await userIdFromOrderCode(data.custom_data?.orderCode);
  if (!userId) return;
  const periodEnd = periodEndOf(data);
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: data.id,
      subscriptionStatus: data.status ?? "active",
      autoRenew: true,
      ...(periodEnd ? { currentPeriodEnd: periodEnd, planExpiresAt: periodEnd } : {}),
    },
  });
}

/**
 * subscription.updated — fires on renewals (the billing period advances) and on status changes.
 * When the period has moved forward we treat it as a renewal: extend access to the new period end
 * and reset the AI deep-read quota cycle. Matched by subscriptionId; falls back to linking if we
 * never recorded the created event.
 */
export async function applySubscriptionUpdate(data: PaddleSubscriptionData): Promise<void> {
  if (!data.id) return;
  const user = await prisma.user.findUnique({ where: { subscriptionId: data.id } });
  if (!user) {
    await linkSubscriptionToUser(data);
    return;
  }
  const periodEnd = periodEndOf(data);
  const renewed = !!periodEnd && !!user.currentPeriodEnd && periodEnd.getTime() > user.currentPeriodEnd.getTime();
  const active = data.status === "active" || data.status === "trialing";
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: data.status ?? user.subscriptionStatus,
      autoRenew: active,
      ...(periodEnd ? { currentPeriodEnd: periodEnd, planExpiresAt: periodEnd } : {}),
      ...(renewed ? { aiQuotaCycleStart: new Date(), aiDeepReadsUsed: 0 } : {}),
    },
  });
}

/**
 * subscription.canceled — stop future renewals. Access is NOT revoked immediately: planExpiresAt
 * already points at currentPeriodEnd, so premium simply lapses when the paid period runs out.
 */
export async function markSubscriptionCanceled(data: PaddleSubscriptionData): Promise<void> {
  if (!data.id) return;
  const user = await prisma.user.findUnique({ where: { subscriptionId: data.id } });
  if (!user) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "canceled", autoRenew: false },
  });
}
