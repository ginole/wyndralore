import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAiReadingConfigured, streamYearAheadReading, streamLoveReading, ReadingCardInput } from "@/lib/claude";
import { getCardByName } from "@/lib/cards";
import { trackEvent } from "@/lib/analytics";

export const maxDuration = 60;

const KINDS = {
  year_reading: { creditField: "yearReadingCredits", maxCards: 13 },
  love_reading: { creditField: "loveReadingCredits", maxCards: 5 },
} as const;
type SpecialKind = keyof typeof KINDS;

interface ParsedBody {
  kind: SpecialKind;
  cards: ReadingCardInput[];
  title: string;
  input: { nameA?: string; nameB?: string; question?: string };
}

/** Own validator — parseReadingRequestBody caps at 10 cards, and the year wheel draws 13. */
function parseBody(body: unknown): ParsedBody | null {
  const b = body as Record<string, unknown> | null;
  const kind = b?.kind as SpecialKind;
  if (!b || !(kind in KINDS)) return null;
  const rawCards = b.cards;
  if (!Array.isArray(rawCards) || rawCards.length < 1 || rawCards.length > KINDS[kind].maxCards) return null;
  const cards: ReadingCardInput[] = [];
  for (const c of rawCards) {
    const position = typeof c?.position === "string" ? c.position.slice(0, 40) : "";
    const name = typeof c?.name === "string" ? c.name : "";
    const orientation = c?.orientation === "reversed" ? "reversed" : "upright";
    if (!position || !getCardByName(name)) return null;
    cards.push({ position, name, orientation });
  }
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const input = {
    nameA: str((b.input as Record<string, unknown>)?.nameA, 40),
    nameB: str((b.input as Record<string, unknown>)?.nameB, 40),
    question: str((b.input as Record<string, unknown>)?.question, 300),
  };
  const title = str(b.title, 80) ?? (kind === "year_reading" ? "Your Year Ahead" : "Love Compatibility");
  return { kind, cards, title, input };
}

/**
 * Generates a purchased special reading (Year Ahead / Love Compatibility) as SSE, then SAVES it
 * and spends the credit — in that order, so a timeout can never burn a $9.90 credit on a reading
 * nobody received. The done event carries the saved reading's id: the permanent /readings/[id]
 * page is part of what was paid for.
 */
export async function POST(req: NextRequest) {
  if (!isAiReadingConfigured()) {
    return NextResponse.json({ error: "AI reading is not configured yet." }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = parseBody(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const creditField = KINDS[parsed.kind].creditField;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { yearReadingCredits: true, loveReadingCredits: true },
  });
  if (!user || user[creditField] <= 0) {
    return NextResponse.json({ error: "No reading credit." }, { status: 402 });
  }

  const generator =
    parsed.kind === "year_reading"
      ? streamYearAheadReading({ cards: parsed.cards, theme: "general", question: parsed.input.question })
      : streamLoveReading({ cards: parsed.cards, theme: "love", question: parsed.input.question });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";
        for await (const chunk of generator) {
          fullText += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        if (!fullText.trim()) throw new Error("empty generation");

        // Persist first, then spend — both after a complete stream.
        const cardsWithImages = parsed.cards.map((c) => ({
          ...c,
          image: getCardByName(c.name)?.image ?? "",
        }));
        const saved = await prisma.specialReading.create({
          data: {
            userId,
            kind: parsed.kind,
            title: parsed.title,
            cards: JSON.stringify(cardsWithImages),
            input: JSON.stringify(parsed.input),
            aiText: fullText,
          },
        });
        await prisma.user.updateMany({
          where: { id: userId, [creditField]: { gt: 0 } },
          data: { [creditField]: { decrement: 1 } },
        });
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ id: saved.id })}\n\n`));
        await trackEvent("ai_deep_reading_generated", { userId, props: { source: parsed.kind } });
      } catch (err) {
        console.error("[special-reading] generation failed:", err);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "Generation failed." })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
