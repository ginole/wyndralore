import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPremiumActive } from "@/lib/quota";
import { getSpread } from "@/lib/spreads";
import { getCardById } from "@/lib/cards";
import { JournalCardRef } from "@/lib/journalTypes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Rehydrate card refs with names/images so the client doesn't need to re-fetch each card.
  const hydrated = entries.map((entry) => {
    const cards = (JSON.parse(entry.cards) as JournalCardRef[]).map((ref) => {
      const card = getCardById(ref.cardId);
      return {
        position: ref.position,
        orientation: ref.orientation,
        cardId: ref.cardId,
        name: card?.name ?? "Unknown",
        image: card?.image ?? "",
      };
    });
    return {
      id: entry.id,
      spread: entry.spread,
      spreadTitle: getSpread(entry.spread)?.title ?? entry.spread,
      theme: entry.theme,
      question: entry.question,
      note: entry.note,
      cards,
      createdAt: entry.createdAt,
    };
  });

  return NextResponse.json({ entries: hydrated });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isPremiumActive(user)) {
    return NextResponse.json({ error: "Journaling is a Premium feature." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const spread = typeof body?.spread === "string" ? body.spread : "";
  const theme = typeof body?.theme === "string" ? body.theme : "general";
  const question = typeof body?.question === "string" ? body.question.slice(0, 500) : null;
  const note = typeof body?.note === "string" ? body.note.slice(0, 2000) : null;
  const rawCards = Array.isArray(body?.cards) ? body.cards : null;

  if (!getSpread(spread) || !rawCards || rawCards.length === 0) {
    return NextResponse.json({ error: "Invalid reading data." }, { status: 400 });
  }

  // Validate + normalize card refs against the real deck before persisting.
  const cards: JournalCardRef[] = [];
  for (const c of rawCards) {
    const card = getCardById(Number(c?.cardId));
    if (!card) return NextResponse.json({ error: "Unknown card in reading." }, { status: 400 });
    cards.push({
      position: String(c.position ?? ""),
      cardId: card.id,
      orientation: c.orientation === "reversed" ? "reversed" : "upright",
    });
  }

  const entry = await prisma.journalEntry.create({
    data: { userId: user.id, spread, theme, question, note, cards: JSON.stringify(cards) },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
