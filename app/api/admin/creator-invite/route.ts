import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail, hashPassword } from "@/lib/password";
import { generateResetToken } from "@/lib/passwordReset";
import { sendEmail, creatorInviteEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";
import crypto from "node:crypto";

const CREATOR_PLAN_DAYS = 30;
// Placeholder accounts (creator hasn't signed up yet) get a longer window to claim their
// account via the reset-password link than a normal 1-hour forgot-password request.
const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const affiliateLink = typeof body?.affiliateLink === "string" ? body.affiliateLink.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid creator email" }, { status: 400 });
  }
  if (!affiliateLink || !/^https?:\/\//i.test(affiliateLink)) {
    return NextResponse.json({ error: "Affiliate link must be a valid http(s) URL" }, { status: 400 });
  }

  const now = new Date();
  const grantedExpiry = new Date(now.getTime() + CREATOR_PLAN_DAYS * 24 * 60 * 60 * 1000);
  const origin = req.nextUrl.origin;

  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  let planGranted: string;
  let wasNewAccount = false;
  let actionLink = `${origin}/account`;

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
    actionLink = `${origin}/reset-password?token=${token}`;
  }

  const { subject, html } = creatorInviteEmail(email, affiliateLink, actionLink);
  const result = await sendEmail({ to: email, subject, html });
  if (!result.ok) {
    console.error(`[creator-invite] invite email failed to send for user ${userId}:`, result.error);
  }

  await prisma.creatorInvite.create({
    data: { email, affiliateLink, userId, wasNewAccount, planGranted, emailSent: result.ok },
  });
  await trackEvent("creator_invite_sent", { userId, props: { affiliateLink, emailSent: result.ok, wasNewAccount } });

  return NextResponse.json({ ok: true, emailSent: result.ok, userId, wasNewAccount, planGranted });
}
