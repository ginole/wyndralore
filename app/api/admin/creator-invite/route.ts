import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/password";
import { grantCreatorPremium } from "@/lib/creatorGrant";
import { ensureAffiliateCode } from "@/lib/affiliate";
import { CREATOR_AFFILIATE_ENABLED, WHOP_STORE_URL } from "@/lib/featureFlags";
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

  // Being a creator is permanent and separate from the complimentary month — she is still a creator
  // long after that plan lapses. It's what unlocks the Whop-username field on /account, which in
  // turn makes her share card carry her commission link.
  await prisma.user.update({ where: { id: userId }, data: { isCreator: true } });

  // Commission is Whop's job now (see lib/featureFlags.ts), so the invite points the creator at our
  // Whop store to grab their own link rather than handing them one of ours.
  //
  // Deliberately do NOT assign an affiliateCode while the flag is off. It isn't merely useless: a
  // code sets `isPartner`, which renders a "Your Partner Dashboard" button on /account pointing at
  // /partner — which now 404s. Every creator we invited would get a broken link.
  let viaLink = WHOP_STORE_URL;
  if (CREATOR_AFFILIATE_ENABLED) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const withCode = await ensureAffiliateCode(user);
    viaLink = `${req.nextUrl.origin}/?via=${withCode.affiliateCode}`;
  }

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
