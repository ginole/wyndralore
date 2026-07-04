import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.slice(0, 2000) : null;

  const updated = await prisma.journalEntry.update({ where: { id }, data: { note } });
  return NextResponse.json({ id: updated.id, note: updated.note });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
