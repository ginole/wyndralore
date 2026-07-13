import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requestWithdrawal, MIN_WITHDRAWAL_USD } from "@/lib/masters";
import { sendEmail, masterWithdrawalRequestedEmail } from "@/lib/email";

// Called by the master's own dashboard (components/WithdrawButton) when she clicks "Request
// Withdrawal" — flips her available ledger to `requested` and emails the admin immediately, since
// there's no automated payout API; the admin still sends the money by hand.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const master = await prisma.masterProfile.findUnique({ where: { userId: user.id } });
  if (!master) return NextResponse.json({ error: "No storefront found." }, { status: 404 });

  const result = await requestWithdrawal(master.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: `You need at least $${MIN_WITHDRAWAL_USD} available to request a withdrawal.` },
      { status: 400 }
    );
  }

  const { subject, html } = masterWithdrawalRequestedEmail(master.displayName, result.amountUsd, master.payoutMethod, master.payoutHandle);
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "gino.c138@gmail.com";
  const sent = await sendEmail({ to: adminEmail, subject, html });
  if (!sent.ok) console.error("[masters/withdraw] admin notification email failed:", sent.error);

  return NextResponse.json({ ok: true, amountUsd: result.amountUsd });
}
