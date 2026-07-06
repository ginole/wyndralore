import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getFreshAiQuotaStatus } from "@/lib/aiQuota";
import { isAiReadingConfigured } from "@/lib/claude";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  return NextResponse.json({ configured: isAiReadingConfigured(), quota: await getFreshAiQuotaStatus(userId) });
}
