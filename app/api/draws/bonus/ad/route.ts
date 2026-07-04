import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { grantAdBonus } from "@/lib/quota";

// PRD §4.1: rewarded-ad bonus, capped at 3/day. The client only calls this after the
// ad-watch (or the 15s fallback placeholder, see components/AdBonusModal.tsx) completes.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const clientDate = typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10);

  const result = await grantAdBonus(userId, clientDate);
  if (!result.ok) {
    return NextResponse.json({ error: "Ad bonus cap reached for today." }, { status: 429 });
  }
  return NextResponse.json({ ok: true, quota: result.status });
}
