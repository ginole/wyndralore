import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { grantCreatorPremium } from "@/lib/creatorGrant";
import { ensureAffiliateCode } from "@/lib/affiliate";
import { sendEmail, creatorInviteEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid creator email" }, { status: 400 });
  }

  const { userId, planGranted, wasNewAccount, actionLink } = await grantCreatorPremium(email, req.nextUrl.origin);

  // Assign the creator their own affiliate code (if they don't have one) and build their referral
  // link — we generate this ourselves now (no more manual Lemon Squeezy link to paste).
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const withCode = await ensureAffiliateCode(user);
  const viaLink = `${req.nextUrl.origin}/?via=${withCode.affiliateCode}`;

  const { subject, html } = creatorInviteEmail(email, viaLink, actionLink);
  const result = await sendEmail({ to: email, subject, html });
  if (!result.ok) {
    console.error(`[creator-invite] invite email failed to send for user ${userId}:`, result.error);
  }

  await prisma.creatorInvite.create({
    data: { email, affiliateLink: viaLink, userId, wasNewAccount, planGranted, emailSent: result.ok },
  });
  await trackEvent("creator_invite_sent", { userId, props: { emailSent: result.ok, wasNewAccount } });

  return NextResponse.json({ ok: true, emailSent: result.ok, userId, wasNewAccount, planGranted, viaLink });
}
