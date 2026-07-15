import { prisma } from "./db";

// ─────────────────────────────────────────────────────────────────────────────
// Whop — the live processor. Everything below the Paddle divider is dormant
// (Paddle rejected the domain on product-category grounds and is not retryable),
// kept in place the same way lib/lemonsqueezy.ts was when Paddle replaced it.
// ─────────────────────────────────────────────────────────────────────────────

/** The Whop membership entity as delivered in membership.* webhooks — only the fields we use.
 * Shapes taken from the official @whop/sdk types (Shared.Membership), not from prose docs. */
export interface WhopMembershipData {
  id?: string;
  status?: string; // trialing|active|past_due|completed|canceled|expired|unresolved|drafted|canceling
  cancel_at_period_end?: boolean;
  renewal_period_end?: string | null;
  metadata?: { orderCode?: string } | null;
}

function whopPeriodEndOf(data: WhopMembershipData): Date | null {
  return data.renewal_period_end ? new Date(data.renewal_period_end) : null;
}

/**
 * membership.activated — link the new Whop membership to the buyer (found via the checkout session's
 * metadata.orderCode) and align their plan expiry to Whop's renewal period. The initial plan
 * activation itself is handled by the payment.succeeded → markOrderPaid path; this just records the
 * membership so we can extend it on renewal and cancel it later. Mirrors linkSubscriptionToUser.
 */
export async function linkMembershipToUser(data: WhopMembershipData): Promise<void> {
  if (!data.id) return;
  const userId = await userIdFromOrderCode(data.metadata?.orderCode);
  if (!userId) return;
  const periodEnd = whopPeriodEndOf(data);
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: data.id,
      subscriptionStatus: data.status ?? "active",
      autoRenew: !data.cancel_at_period_end,
      ...(periodEnd ? { currentPeriodEnd: periodEnd, planExpiresAt: periodEnd } : {}),
    },
  });
}

/**
 * membership.cancel_at_period_end_changed / went_valid — the renewal + scheduled-cancel lifecycle.
 * When the period has moved forward we treat it as a renewal: extend access and reset the AI
 * deep-read quota cycle.
 *
 * Whop exposes `cancel_at_period_end` as a plain boolean, which is what the equivalent Paddle code
 * had to infer from `scheduled_change.action === "cancel"` — and getting that inference wrong once
 * let a scheduled cancel silently re-enable auto-renew. The rule is the same and still load-bearing:
 * a membership scheduled to cancel stays "active" until the period actually ends but will NOT renew,
 * so autoRenew must go false the moment the flag is set.
 */
export async function applyMembershipUpdate(data: WhopMembershipData): Promise<void> {
  if (!data.id) return;
  const user = await prisma.user.findUnique({ where: { subscriptionId: data.id } });
  if (!user) {
    await linkMembershipToUser(data);
    return;
  }
  const periodEnd = whopPeriodEndOf(data);
  const renewed = !!periodEnd && !!user.currentPeriodEnd && periodEnd.getTime() > user.currentPeriodEnd.getTime();
  const scheduledCancel = data.cancel_at_period_end === true;
  const active = (data.status === "active" || data.status === "trialing") && !scheduledCancel;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: scheduledCancel ? "canceled" : data.status ?? user.subscriptionStatus,
      autoRenew: active,
      ...(periodEnd ? { currentPeriodEnd: periodEnd, planExpiresAt: periodEnd } : {}),
      ...(renewed ? { aiQuotaCycleStart: new Date(), aiDeepReadsUsed: 0 } : {}),
    },
  });
}

/**
 * membership.deactivated / went_invalid — stop future renewals. Access is NOT revoked here:
 * planExpiresAt already points at the paid period end, so premium simply lapses when it runs out.
 */
export async function markMembershipCanceled(data: WhopMembershipData): Promise<void> {
  if (!data.id) return;
  const user = await prisma.user.findUnique({ where: { subscriptionId: data.id } });
  if (!user) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "canceled", autoRenew: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Paddle — DORMANT. Paddle declined wyndralore.com on 2026-07-15 (their AUP bans
// "pseudo-science ... fortune-telling"); this path can no longer take money. Left
// intact rather than deleted, matching how the Lemon Squeezy code was handled.
// ─────────────────────────────────────────────────────────────────────────────

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
  scheduled_change?: { action?: string; effective_at?: string } | null;
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
  // A subscription scheduled to cancel stays "active" in Paddle until the period actually ends, but
  // it will NOT renew — so autoRenew must go false the moment a cancel is scheduled. Without this,
  // the subscription.updated that Paddle fires in response to our own cancel would immediately flip
  // auto-renew back on and undo the cancellation from the user's point of view.
  const scheduledCancel = data.scheduled_change?.action === "cancel";
  const active = (data.status === "active" || data.status === "trialing") && !scheduledCancel;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: scheduledCancel ? "canceled" : data.status ?? user.subscriptionStatus,
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
