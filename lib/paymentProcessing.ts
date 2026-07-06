import { Order } from "@prisma/client";
import { prisma } from "./db";
import { planExpiryFrom, PlanId } from "./pricing";
import { sendEmail, paymentConfirmationEmail, aiReadPurchaseEmail } from "./email";
import { trackEvent } from "./analytics";
import { grantExtraAiReads } from "./aiQuota";

/** Shared by the Wise webhook handler and the admin manual-match action. */
export async function markOrderPaid(order: Order, amountUsd: number) {
  const paidAt = new Date();

  if (order.kind === "ai_overage" || order.kind === "ai_single") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "paid", paidAt, paidAmountUsd: amountUsd } });
    await grantExtraAiReads(order.userId, 1);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: order.userId } });
    const { subject, html } = aiReadPurchaseEmail();
    const result = await sendEmail({ to: user.email, subject, html });
    if (!result.ok) {
      console.error(`[payment-confirmation] AI-read email failed to send for order ${order.code}:`, result.error);
    }
    await trackEvent("ai_read_purchased", { userId: order.userId, props: { kind: order.kind, amountUsd } });
    return;
  }

  // Plan purchase/renewal — also (re)anchors the AI deep-read quota cycle to this payment,
  // since Lemon Squeezy plans are one-time purchases with no billing-cycle object of their own
  // (see lib/aiQuota.ts).
  const [, user] = await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "paid", paidAt, paidAmountUsd: amountUsd } }),
    prisma.user.update({
      where: { id: order.userId },
      data: {
        plan: order.plan,
        planExpiresAt: planExpiryFrom(order.plan as PlanId, paidAt),
        aiQuotaCycleStart: paidAt,
        aiDeepReadsUsed: 0,
      },
    }),
  ]);

  const { subject, html } = paymentConfirmationEmail(order.plan, order.code);
  const result = await sendEmail({ to: user.email, subject, html });
  if (!result.ok) {
    console.error(`[payment-confirmation] email failed to send for order ${order.code}:`, result.error);
  }
  await trackEvent("payment_completed", { userId: order.userId, props: { plan: order.plan, amountUsd } });
}
