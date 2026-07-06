import { Order } from "@prisma/client";
import { prisma } from "./db";
import { planExpiryFrom, PlanId } from "./pricing";
import { sendEmail, paymentConfirmationEmail, aiReadPurchaseEmail } from "./email";
import { trackEvent } from "./analytics";
import { grantExtraAiReads } from "./aiQuota";
import { sendMetaPurchaseEvent } from "./metaCapi";

/** Shared by the Wise webhook handler and the admin manual-match action. */
export async function markOrderPaid(order: Order, amountUsd: number) {
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
    return;
  }

  // Plan purchase/renewal — also (re)anchors the AI deep-read quota cycle to this payment,
  // since Lemon Squeezy plans are one-time purchases with no billing-cycle object of their own
  // (see lib/aiQuota.ts).
  const user = await prisma.user.update({
    where: { id: order.userId },
    data: {
      plan: order.plan,
      planExpiresAt: planExpiryFrom(order.plan as PlanId, paidAt),
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
}
