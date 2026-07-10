import crypto from "node:crypto";
import { prisma } from "./db";
import { hashPassword } from "./password";
import { generateResetToken } from "./passwordReset";

export const CREATOR_PLAN_DAYS = 30;
// Placeholder accounts (creator hasn't signed up yet) get a longer window to claim their
// account via the reset-password link than a normal 1-hour forgot-password request.
export const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreatorGrantResult {
  userId: string;
  planGranted: string;
  wasNewAccount: boolean;
  /** Where to send her: a claim link (new/placeholder account) or the plain login page. */
  actionLink: string;
  /** Raw claim token, when one was issued (null for an existing account that already has its own
   * password) — callers that need to point somewhere other than /reset-password build their own
   * link from this rather than using `actionLink` directly. */
  claimToken: string | null;
}

/**
 * Grants a creator free 30-day Premium (never downgrading a better existing plan) and returns
 * where to send her next. Shared by the standalone "达人邀请" flow (affiliate-only, no
 * storefront) and the "Meet Our Masters" invite flow (affiliate + storefront) — both need
 * exactly this same find-or-create + never-downgrade + claim-link logic, just followed by a
 * different email and (for masters) a different destination page.
 */
export async function grantCreatorPremium(email: string, origin: string): Promise<CreatorGrantResult> {
  const now = new Date();
  const grantedExpiry = new Date(now.getTime() + CREATOR_PLAN_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  let planGranted: string;
  let wasNewAccount = false;
  let actionLink = `${origin}/account`;
  let claimToken: string | null = null;

  if (existing) {
    // Never downgrade a paying customer. Lifetime stays lifetime; a plan that already runs
    // longer than our 30-day grant keeps its later expiry. Only extend when it actually helps.
    const keepExisting =
      existing.plan === "lifetime" ||
      (existing.planExpiresAt !== null && existing.planExpiresAt.getTime() >= grantedExpiry.getTime());

    // If the account is an unclaimed placeholder, re-issue a fresh claim link so a repeat
    // invite still lets them set a password (a plain /account login would be a dead end).
    if (existing.isPlaceholder) {
      const { token, tokenHash, expiresAt } = generateResetToken(CLAIM_TOKEN_TTL_MS);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: keepExisting
          ? { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt }
          : {
              plan: "monthly",
              planExpiresAt: grantedExpiry,
              aiQuotaCycleStart: now,
              aiDeepReadsUsed: 0,
              resetTokenHash: tokenHash,
              resetTokenExpiresAt: expiresAt,
            },
      });
      userId = updated.id;
      planGranted = updated.plan;
      claimToken = token;
      actionLink = `${origin}/reset-password?token=${token}`;
    } else if (keepExisting) {
      userId = existing.id;
      planGranted = existing.plan;
    } else {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { plan: "monthly", planExpiresAt: grantedExpiry, aiQuotaCycleStart: now, aiDeepReadsUsed: 0 },
      });
      userId = updated.id;
      planGranted = updated.plan;
    }
  } else {
    // No account yet — create a placeholder with an unusable random password. The creator
    // claims it via the reset-password link in the invite email (same flow as forgot-password).
    const placeholderPasswordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const { token, tokenHash, expiresAt } = generateResetToken(CLAIM_TOKEN_TTL_MS);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: placeholderPasswordHash,
        plan: "monthly",
        planExpiresAt: grantedExpiry,
        aiQuotaCycleStart: now,
        isPlaceholder: true,
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });
    userId = created.id;
    planGranted = created.plan;
    wasNewAccount = true;
    claimToken = token;
    actionLink = `${origin}/reset-password?token=${token}`;
  }

  return { userId, planGranted, wasNewAccount, actionLink, claimToken };
}
