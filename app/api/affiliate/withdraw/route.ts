import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestPartnerPayout, AFFILIATE_MIN_PAYOUT_USD } from "@/lib/affiliate";
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

  // Secondary guard; the real spam-stop is that requestPartnerPayout consumes the available balance.
  const rl = await checkRateLimit("affiliate_withdraw", user.id, 3, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

  // Atomically move the withdrawable balance to "requested" so a repeat click has nothing left to
  // request (and sends no second email). Returns 0 if below the minimum or already requested.
  const amount = await requestPartnerPayout(user.id);
  if (amount <= 0) {
    return NextResponse.json(
      { error: `Nothing to withdraw — you need at least $${AFFILIATE_MIN_PAYOUT_USD} available, or a payout is already pending.` },
      { status: 400 }
    );
  }

  const { subject, html } = masterWithdrawalRequestedEmail(user.email, amount, user.affiliatePayoutMethod, user.affiliatePayoutHandle);
  await sendEmail({ to: ADMIN_EMAIL, subject, html });
  await trackEvent("affiliate_withdraw_requested", { userId: user.id, props: { amountUsd: amount } });

  return NextResponse.json({ ok: true });
}
