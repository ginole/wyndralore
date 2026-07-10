import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordAiStyleDraw } from "@/lib/masters";

// Called once by the buyer's own draw ritual (components/MasterDrawRitual) after she's shuffled
// and picked her 3 cards — persists them onto the paid ai_style order so the reading page can
// generate/reveal her reading. See recordAiStyleDraw for the actual validation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { code } = await params;
  const order = await prisma.masterOrder.findUnique({ where: { code } });
  if (!order || order.buyerId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const ok = await recordAiStyleDraw(order, body?.cards);
  if (!ok) return NextResponse.json({ error: "This reading can't be drawn right now." }, { status: 409 });

  return NextResponse.json({ ok: true });
}
