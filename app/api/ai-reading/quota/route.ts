import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFreshAiQuotaStatus } from "@/lib/aiQuota";
import { isAiReadingConfigured } from "@/lib/claude";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [quota, user] = await Promise.all([
    getFreshAiQuotaStatus(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { aiFollowupCredits: true } }),
  ]);
  return NextResponse.json({
    configured: isAiReadingConfigured(),
    quota: { ...quota, followupCredits: user?.aiFollowupCredits ?? 0 },
  });
}
