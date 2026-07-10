import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { grantCreatorPremium } from "@/lib/creatorGrant";
import { sendEmail, masterInviteEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

// Replaces the old admin-fills-everything onboarding: ONE invite covers free Premium + (if she
// has one) her Lemon Squeezy affiliate link for membership referrals AND her "Meet Our Masters"
// storefront setup — a single email, single action link, instead of two separate creator
// programs. She fills her own storefront profile (POST /api/masters/onboard); it lands as
// `pending_review` until an admin approves it.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const affiliateLinkRaw = typeof body?.affiliateLink === "string" ? body.affiliateLink.trim() : "";
  const affiliateLink = affiliateLinkRaw && /^https?:\/\//i.test(affiliateLinkRaw) ? affiliateLinkRaw : null;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const { userId, planGranted, wasNewAccount, claimToken } = await grantCreatorPremium(email, origin);

  // CreatorInvite requires a non-null affiliateLink (it's an affiliate-program audit row) — only
  // log one when she actually has a link. The premium grant above happens either way.
  if (affiliateLink) {
    await prisma.creatorInvite.create({
      data: { email, affiliateLink, userId, wasNewAccount, planGranted, emailSent: false },
    });
  }

  const setupLink = claimToken ? `${origin}/masters/onboard?token=${claimToken}` : `${origin}/masters/onboard`;
  const { subject, html } = masterInviteEmail(affiliateLink, setupLink);
  const result = await sendEmail({ to: email, subject, html });
  if (!result.ok) console.error(`[admin/masters/invite] invite email failed for ${email}:`, result.error);

  await trackEvent("creator_invite_sent", { userId, props: { masterInvite: true, affiliateLink, emailSent: result.ok, wasNewAccount } });

  return NextResponse.json({ ok: true, emailSent: result.ok, wasNewAccount });
}
