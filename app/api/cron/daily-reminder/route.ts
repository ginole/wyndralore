import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";
import { sendEmail, dailyReminderEmail } from "@/lib/email";

// Premium members who opted in and haven't drawn today get a morning nudge. Members-only by
// design while Resend is on the free 100/day tier — the transactional mail (receipts, claim
// links) must never be crowded out by reminders, so this also hard-caps itself well below it.
const MAX_SENDS_PER_RUN = 60;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The cron fires at a fixed UTC hour; lastDailyDate is the user's local date. Comparing
  // against the server's UTC date is deliberately loose — worst case someone who drew late
  // last night gets a nudge they didn't need, which the copy is written to survive.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      dailyReminderOptIn: true,
      plan: { not: "free" },
      OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
      NOT: { lastDailyDate: todayUtc },
    },
    select: { id: true, email: true, dailyStreak: true },
    take: MAX_SENDS_PER_RUN,
  });

  let sent = 0;
  for (const user of users) {
    const { subject, html } = dailyReminderEmail(user.dailyStreak);
    const result = await sendEmail({ to: user.email, subject, html });
    if (result.ok) sent++;
    else console.error(`[daily-reminder] send failed for ${user.id}:`, result.error);
  }

  return NextResponse.json({ ok: true, candidates: users.length, sent });
}
