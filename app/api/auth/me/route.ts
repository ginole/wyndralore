import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeUser } from "@/lib/serializeUser";
import { getQuotaStatus } from "@/lib/quota";
import { ensureReferralCode } from "@/lib/referral";

export async function GET(req: NextRequest) {
  let user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  // Backfill a referral code for accounts created before the referral feature shipped, so
  // every signed-in user always has a shareable invite link.
  if (!user.referralCode) user = await ensureReferralCode(user);

  const clientDate = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const quota = getQuotaStatus(user, clientDate);

  return NextResponse.json({ user: serializeUser(user), quota });
}
