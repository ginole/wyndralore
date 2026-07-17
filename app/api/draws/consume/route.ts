import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { consumeDraw, isPremiumActive } from "@/lib/quota";
import { getSpread } from "@/lib/spreads";
import { spendPremiumSpreadCredit } from "@/lib/premiumSpread";
import { creditReferrerForReading } from "@/lib/referral";
import { recordDailyStreak } from "@/lib/streak";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const clientDate = typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
  const spreadSlug = typeof body?.spread === "string" ? body.spread : undefined;
  const spread = spreadSlug ? getSpread(spreadSlug) : undefined;

  // A PREMIUM (paid) spread is unlocked one of two ways: an active plan (unlimited, spends
  // nothing) or a referral-earned unlock credit (spend exactly one). It never touches the daily
  // free-draw quota. Free spreads fall through to the normal daily-quota path below.
  if (spread && !spread.free) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!isPremiumActive(user)) {
      const spent = await spendPremiumSpreadCredit(userId);
      if (!spent) {
        return NextResponse.json({ error: "No premium unlocks left." }, { status: 402 });
      }
    }
    // Completing a reading is what pays out this account's referrer (guarded to once).
    await creditReferrerForReading(userId);
    return NextResponse.json({ ok: true, remaining: null });
  }

  const result = await consumeDraw(userId, clientDate);
  if (!result.ok) {
    return NextResponse.json({ error: "Daily free reading already used." }, { status: 429 });
  }
  await creditReferrerForReading(userId);
  // The daily ritual counts the streak in either mode — one card or three piles.
  const streak =
    spreadSlug === "daily" || spreadSlug === "pick-a-card" ? await recordDailyStreak(userId, clientDate) : undefined;
  return NextResponse.json({ ok: true, remaining: result.remaining, streak: streak?.streak, bestStreak: streak?.best });
}
