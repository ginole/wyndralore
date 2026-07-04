import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { consumeDraw } from "@/lib/quota";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const clientDate = typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10);

  const result = await consumeDraw(userId, clientDate);
  if (!result.ok) {
    return NextResponse.json({ error: "Daily free reading already used." }, { status: 429 });
  }
  return NextResponse.json({ ok: true, remaining: result.remaining });
}
