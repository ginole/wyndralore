import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAffiliateBalances, AFFILIATE_MIN_PAYOUT_USD } from "@/lib/affiliate";
import { sendEmail, masterWithdrawalRequestedEmail } from "@/lib/email";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";
import { trackEvent } from "@/lib/analytics";

const ADMIN_EMAIL = "gino.c138@gmail.com";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !user.affiliateCode) return NextResponse.json({ error: "Not a partner." }, { status: 403 });
  if (user.affiliateStatus === "paused") {
    return NextResponse.json({ error: "Your partner account is paused." }, { status: 403 });
  }
  if (!user.affiliatePayoutMethod || !user.affiliatePayoutHandle) {
    return NextResponse.json({ error: "Set a payout method first." }, { status: 400 });
  }

  // Cap requests so a partner can't email-bomb the admin.
  const rl = await checkRateLimit("affiliate_withdraw", user.id, 3, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

  const bal = await getAffiliateBalances(user.id);
  if (bal.netAvailableUsd < AFFILIATE_MIN_PAYOUT_USD) {
    return NextResponse.json({ error: `Minimum payout is $${AFFILIATE_MIN_PAYOUT_USD}.` }, { status: 400 });
  }

  const { subject, html } = masterWithdrawalRequestedEmail(user.email, bal.netAvailableUsd, user.affiliatePayoutMethod, user.affiliatePayoutHandle);
  await sendEmail({ to: ADMIN_EMAIL, subject, html });
  await trackEvent("affiliate_withdraw_requested", { userId: user.id, props: { amountUsd: bal.netAvailableUsd } });

  return NextResponse.json({ ok: true });
}
