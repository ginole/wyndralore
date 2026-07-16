import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** A saved special reading — owner only. 404 (not 403) for anyone else: whether an id exists
 * is nobody else's business. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const reading = await prisma.specialReading.findUnique({ where: { id } });
  if (!reading || reading.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: reading.id,
    kind: reading.kind,
    title: reading.title,
    cards: JSON.parse(reading.cards),
    input: reading.input ? JSON.parse(reading.input) : null,
    aiText: reading.aiText,
    createdAt: reading.createdAt,
  });
}
