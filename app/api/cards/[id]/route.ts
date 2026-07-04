import { NextRequest, NextResponse } from "next/server";
import { getCardById } from "@/lib/cards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCardById(Number(id));
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
