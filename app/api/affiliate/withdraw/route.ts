import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestPartnerPayout, AFFILIATE_MIN_PAYOUT_USD } from "@/lib/affiliate";
import { sendEmail, masterWithdrawalRequestedEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";
import { CREATOR_AFFILIATE_ENABLED } from "@/lib/featureFlags";

const ADMIN_EMAIL = "gino.c138@gmail.com";

export async function POST() {
  // Retired in favour of Whop's native affiliate program, which pays creators itself — see
  // lib/featureFlags.ts. Gated here too, not just on /partner: the route is callable directly.
  if (!CREATOR_AFFILIATE_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user || !user.affiliateCode) return NextResponse.json({ error: "Not a partner." }, { status: 403 });
  if (user.affiliateStatus === "paused") {
    return NextResponse.json({ error: "Your partner account is paused." }, { status: 403 });
  }
  if (!user.affiliatePayoutMethod || !user.affiliatePayoutHandle) {
    return NextResponse.json({ error: "Set a payout method first." }, { status: 400 });
  }

  // Atomically move the withdrawable balance to "requested" — a repeat click then finds nothing to
  // request and sends no second email. This (not a rate limit) is the real one-request-at-a-time
  // guard: the balance stays "requested" until the admin pays it out.
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
