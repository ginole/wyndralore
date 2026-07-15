import { Order } from "@prisma/client";
import { prisma } from "./db";
import { planExpiryFrom, PlanId } from "./pricing";
import { sendEmail, paymentConfirmationEmail, aiReadPurchaseEmail } from "./email";
import { trackEvent } from "./analytics";
import { grantExtraAiReads } from "./aiQuota";
import { sendMetaPurchaseEvent } from "./metaCapi";
import { sendGa4PurchaseEvent } from "./ga4";
import { recordAffiliateCommission } from "./affiliate";

/** Shared by the Wise/Paddle webhook handlers and the admin manual-match action. `netUsd` is the
 * seller's earnings after processor fee + tax (Paddle supplies it); callers that can't pass it let
 * the affiliate commission estimate net from gross. */
export async function markOrderPaid(order: Order, amountUsd: number, netUsd?: number) {
  const paidAt = new Date();

  // Atomically claim the "not yet paid → paid" transition first. Lemon Squeezy (and Wise,
  // previously) can redeliver the same webhook — the caller's own `order.status === "paid"`
  // check happens on a stale read, so two near-simultaneous deliveries can both pass it and
  // both proceed to grant credits/upgrade the plan twice. Whoever's update actually flips the
  // row (count === 1) is the one allowed to continue; a loser here means someone else already
  // handled this order, so it's safe to just return.
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: { not: "paid" } },
    data: { status: "paid", paidAt, paidAmountUsd: amountUsd },
  });
  if (claimed.count === 0) return;

  // Credit the referring partner, if this buyer was referred by one (any product kind). Idempotent
  // per order; a no-op for unattributed buyers.
  await recordAffiliateCommission(order, amountUsd, netUsd);

  if (order.kind === "ai_overage" || order.kind === "ai_single") {
    await grantExtraAiReads(order.userId, 1);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: order.userId } });
    const { subject, html } = aiReadPurchaseEmail();
    const result = await sendEmail({ to: user.email, subject, html });
    if (!result.ok) {
      console.error(`[payment-confirmation] AI-read email failed to send for order ${order.code}:`, result.error);
    }
    await trackEvent("ai_read_purchased", { userId: order.userId, props: { kind: order.kind, amountUsd } });
    await sendMetaPurchaseEvent({ email: user.email, value: amountUsd, eventId: order.code, contentName: order.plan });
    await sendGa4PurchaseEvent({ userId: order.userId, value: amountUsd, transactionId: order.code, itemName: order.plan });
    return;
  }

  // Plan purchase/renewal — also (re)anchors the AI deep-read quota cycle to this payment,
  // since Lemon Squeezy plans are one-time purchases with no billing-cycle object of their own
  // (see lib/aiQuota.ts).
  // Don't shorten an expiry that a concurrent subscription.created may have already set to the exact
  // Paddle billing-period end (which is a little later than our +30/+365 approximation). Keep
  // whichever is later; a null (lifetime) always wins since it means "never expires".
  const computedExpiry = planExpiryFrom(order.plan as PlanId, paidAt);
  const existing = await prisma.user.findUnique({ where: { id: order.userId }, select: { planExpiresAt: true } });
  const planExpiresAt =
    computedExpiry && existing?.planExpiresAt && existing.planExpiresAt > computedExpiry ? existing.planExpiresAt : computedExpiry;

  const user = await prisma.user.update({
    where: { id: order.userId },
    data: {
      plan: order.plan,
      planExpiresAt,
      aiQuotaCycleStart: paidAt,
      aiDeepReadsUsed: 0,
    },
  });

  const { subject, html } = paymentConfirmationEmail(order.plan, order.code);
  const result = await sendEmail({ to: user.email, subject, html });
  if (!result.ok) {
    console.error(`[payment-confirmation] email failed to send for order ${order.code}:`, result.error);
  }
  await trackEvent("payment_completed", { userId: order.userId, props: { plan: order.plan, amountUsd } });
  await sendMetaPurchaseEvent({ email: user.email, value: amountUsd, eventId: order.code, contentName: order.plan });
  await sendGa4PurchaseEvent({ userId: order.userId, value: amountUsd, transactionId: order.code, itemName: order.plan });
}
