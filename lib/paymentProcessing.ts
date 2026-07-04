import { Order } from "@prisma/client";
import { prisma } from "./db";
import { planExpiryFrom, PlanId } from "./pricing";
import { sendEmail, paymentConfirmationEmail } from "./email";
import { trackEvent } from "./analytics";

/** Shared by the Wise webhook handler and the admin manual-match action. */
export async function markOrderPaid(order: Order, amountUsd: number) {
  const paidAt = new Date();
  const [, user] = await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "paid", paidAt, paidAmountUsd: amountUsd } }),
    prisma.user.update({
      where: { id: order.userId },
      data: { plan: order.plan, planExpiresAt: planExpiryFrom(order.plan as PlanId, paidAt) },
    }),
  ]);

  const { subject, html } = paymentConfirmationEmail(order.plan, order.code);
  const result = await sendEmail({ to: user.email, subject, html });
  if (!result.ok) {
    console.error(`[payment-confirmation] email failed to send for order ${order.code}:`, result.error);
  }
  await trackEvent("payment_completed", { userId: order.userId, props: { plan: order.plan, amountUsd } });
}
