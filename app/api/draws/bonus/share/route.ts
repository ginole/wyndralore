import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { grantShareBonus } from "@/lib/quota";

// PRD §4.1: can't verify a share actually happened, so the client gates this on
// "clicked Share and stayed 3+ seconds" before calling — capped at 1/day server-side.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const clientDate = typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10);

  const result = await grantShareBonus(userId, clientDate);
  if (!result.ok) {
    return NextResponse.json({ error: "Share bonus already claimed today." }, { status: 429 });
  }
  return NextResponse.json({ ok: true, quota: result.status });
}
