import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeUser } from "@/lib/serializeUser";
import { getQuotaStatus } from "@/lib/quota";
import { ensureReferralCode } from "@/lib/referral";

export async function GET(req: NextRequest) {
  let user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  // Backfill a referral code for accounts created before the referral feature shipped, so
  // every signed-in user always has a shareable invite link.
  if (!user.referralCode) user = await ensureReferralCode(user);

  // Stamp "last seen" for the admin's retention view, throttled to once a day — this endpoint runs
  // on every page load a signed-in user makes, and a write per pageview would be wasteful. Comparing
  // to the UTC day is enough: the question is "which day did they last come back", not the minute.
  const today = new Date().toISOString().slice(0, 10);
  if (!user.lastSeenAt || user.lastSeenAt.toISOString().slice(0, 10) !== today) {
    // Fire-and-forget: a returning user must never wait on, or be failed by, an analytics write.
    prisma.user
      .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      .catch((err) => console.warn("[me] lastSeenAt update failed:", err));
  }

  const clientDate = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const quota = getQuotaStatus(user, clientDate);
  const master = await prisma.masterProfile.findUnique({ where: { userId: user.id }, select: { id: true } });

  return NextResponse.json({ user: serializeUser(user, Boolean(master)), quota });
}
