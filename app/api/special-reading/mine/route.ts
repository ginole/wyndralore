import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** The signed-in user's saved special readings, newest first — the /account list. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const readings = await prisma.specialReading.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    // `cards` rides along so the journal can show a purchased reading the way it shows every other
    // one — as cards, not as a bare line of text. /account only ever needed the title.
    select: { id: true, kind: true, title: true, createdAt: true, cards: true },
  });
  return NextResponse.json({ readings });
}
