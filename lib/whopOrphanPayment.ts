import crypto from "node:crypto";
import { prisma } from "./db";
import { hashPassword } from "./password";
import { generateResetToken } from "./passwordReset";
import { generateOrderCode } from "./orderCode";
import { markOrderPaid } from "./paymentProcessing";
import { planTargetFor } from "./whop";
import { PLANS, planOption, PlanId } from "./pricing";
import { AI_SINGLE_PRICE_USD, AI_OVERAGE_PRICE_USD } from "./aiQuota";
import { sendEmail, whopOrphanClaimEmail } from "./email";
import { trackEvent } from "./analytics";

const SITE_URL = "https://wyndralore.com";
const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface OrphanPaymentInput {
  paymentId: string;
  whopPlanId: string;
  email: string;
  amountUsd: number;
  netUsd?: number;
}

/**
 * Credits a payment that arrived with no `metadata.orderCode` — i.e. someone bought straight from
 * Whop (whop.com/checkout/<plan_id> or the store page) rather than through our own checkout, so no
 * Order of ours exists.
 *
 * This should be rare: those pages show a bare product card to someone who has never drawn a card,
 * which is not how anyone buys a tarot membership. But Whop keeps plans publicly purchasable
 * regardless of visibility — `visible`, `hidden` and `quick_link` all render a working checkout, and
 * only `archived` doesn't (which would break our own sessions too) — so the door cannot be closed.
 * Given that, the one unacceptable outcome is taking someone's money and silently granting nothing,
 * which is exactly what the webhook did before this existed. An unrecognised charge is also how a
 * legitimate sale becomes a chargeback, and chargeback exposure in this category is what got us
 * turned away by two processors already.
 *
 * Identity comes from the Whop account's email. If it matches one of ours, they're credited straight
 * away. If not, we create a placeholder account and email a claim link — the same pattern
 * creator-outreach already uses (lib/creatorGrant.ts).
 */
export async function creditOrphanedWhopPayment(input: OrphanPaymentInput): Promise<string> {
  const target = planTargetFor(input.whopPlanId);
  if (!target) {
    console.error(`[whop] orphaned payment ${input.paymentId} for unknown plan ${input.whopPlanId} — cannot credit`);
    return "unknown plan, not credited";
  }

  const email = input.email.trim().toLowerCase();
  const isAiRead = target.plan === "ai_single" || target.plan === "ai_overage";
  const amountUsd = isAiRead
    ? target.plan === "ai_single"
      ? AI_SINGLE_PRICE_USD
      : AI_OVERAGE_PRICE_USD
    : planOption(target.plan as PlanId, target.billingMode).amountUsd;

  let user = await prisma.user.findUnique({ where: { email } });
  let claimToken: string | null = null;

  if (!user) {
    // Unusable random password — they take ownership through the claim link, same as a creator
    // invite. Without this they would have paid and have no way to reach what they bought.
    const { token, tokenHash, expiresAt } = generateResetToken(CLAIM_TOKEN_TTL_MS);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
        isPlaceholder: true,
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });
    claimToken = token;
  }

  const order = await prisma.order.create({
    data: {
      code: generateOrderCode(),
      userId: user.id,
      plan: target.plan,
      ...(isAiRead ? { kind: target.plan } : {}),
      amountUsd,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  // Reuses the exact same crediting path as a normal purchase — plan activation, AI quota, the
  // confirmation email, GA4/Meta purchase events. Nothing here is Whop-specific.
  await markOrderPaid(order, input.amountUsd, input.netUsd);

  if (claimToken) {
    const { subject, html } = whopOrphanClaimEmail(
      isAiRead ? "AI deep reading" : PLANS[target.plan as PlanId].label,
      `${SITE_URL}/reset-password?token=${claimToken}`
    );
    const sent = await sendEmail({ to: email, subject, html });
    if (!sent.ok) {
      // They have paid and cannot log in — the one failure here that actually strands a customer.
      console.error(`[whop] CLAIM EMAIL FAILED for orphaned payment ${input.paymentId} (${email}):`, sent.error);
    }
  }

  await trackEvent("whop_orphan_payment_credited", {
    userId: user.id,
    props: { paymentId: input.paymentId, plan: target.plan, newAccount: !!claimToken },
  });

  return claimToken ? "credited via new placeholder account" : "credited to existing account by email";
}
