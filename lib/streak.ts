import { prisma } from "./db";

// Daily-card streak. Dates are the CLIENT's local YYYY-MM-DD (the same convention as the
// draw quota's quotaDate): a streak day should roll over at the reader's midnight, not the
// server's — a 11pm draw and an 8am draw the next morning are consecutive days to her.

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function prevYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Counts a completed daily draw toward the user's streak. Idempotent per day (drawing twice
 * changes nothing), consecutive-day aware, and resets to 1 after a gap. Returns the streak to
 * show the reader right now.
 */
export async function recordDailyStreak(userId: string, clientDate: string): Promise<{ streak: number; best: number }> {
  const date = YMD.test(clientDate) ? clientDate : new Date().toISOString().slice(0, 10);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { dailyStreak: true, bestStreak: true, lastDailyDate: true },
  });
  if (user.lastDailyDate === date) return { streak: user.dailyStreak, best: user.bestStreak };
  const streak = user.lastDailyDate === prevYmd(date) ? user.dailyStreak + 1 : 1;
  const best = Math.max(streak, user.bestStreak);
  await prisma.user.update({
    where: { id: userId },
    data: { dailyStreak: streak, bestStreak: best, lastDailyDate: date },
  });
  return { streak, best };
}
