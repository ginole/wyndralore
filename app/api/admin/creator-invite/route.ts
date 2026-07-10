import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { grantCreatorPremium } from "@/lib/creatorGrant";
import { sendEmail, creatorInviteEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

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

  const { userId, planGranted, wasNewAccount, actionLink } = await grantCreatorPremium(email, req.nextUrl.origin);

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
