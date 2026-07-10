import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";
import { payoutsDue } from "@/lib/masters";
import { sendEmail, payoutReminderEmail } from "@/lib/email";

// Runs on the 3rd and 18th of each month (see vercel.json) — the twice-monthly Masters payout
// day, timed to land after Lemon Squeezy has already settled to the platform's own account.
// Purely a reminder: it does NOT move any money itself (no PH company / Wise Business account
// to batch-pay through yet — see the fund-architecture brainstorm) — an admin sends each master
// their commission by hand (PayPal/Wise personal, per her onboarding choice), then marks it paid
// in the admin dashboard's payouts panel.
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "gino.c138@gmail.com";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await payoutsDue();
  const lines = due.map((d) => ({
    masterName: d.master.displayName,
    totalUsd: d.totalUsd,
    payoutMethod: d.master.payoutMethod,
    payoutHandle: d.master.payoutHandle,
  }));

  const { subject, html } = payoutReminderEmail(lines);
  const result = await sendEmail({ to: ADMIN_NOTIFICATION_EMAIL, subject, html });
  if (!result.ok) console.error("[cron/masters-payout-reminder] reminder email failed to send:", result.error);

  return NextResponse.json({ ok: true, mastersOwed: due.length, totalUsd: lines.reduce((s, l) => s + l.totalUsd, 0) });
}
