import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { parseReadingRequestBody, ParsedReadingRequest } from "@/lib/aiReadingRequest";
import { prisma } from "@/lib/db";
import { getSpread } from "@/lib/spreads";
import { getCardByName } from "@/lib/cards";
import { isAiReadingConfigured, streamDeepReading } from "@/lib/claude";
import { consumeAiDeepRead, getFreshAiQuotaStatus } from "@/lib/aiQuota";
import { trackEvent } from "@/lib/analytics";

// Deep readings can take longer than Vercel's default serverless timeout (10s on Hobby,
// 15s default on Pro) to fully stream ~900 output tokens. Ask for more headroom — on Hobby
// this is silently capped back down to 10s regardless (a real platform limit, not fixable
// from app code), but on Pro it actually takes effect.
export const maxDuration = 60;

/**
 * Persists a reading the querent bought outright. Best-effort by design: this runs after the text
 * has already streamed to them and after the credit is spent, so a failure here must not turn a
 * delivered reading into an error — it is logged and swallowed, and they still have the reading on
 * screen. Returns the entry id so the client can show it as already saved instead of offering a
 * Save button that would file a duplicate.
 */
async function savePaidReadingToJournal(
  userId: string,
  spreadSlug: string,
  parsed: ParsedReadingRequest,
  reading: string
): Promise<string | null> {
  try {
    const spread = getSpread(spreadSlug);
    if (!spread || !reading.trim()) return null;
    const cards = parsed.cards.map((c) => ({
      position: c.position,
      cardId: getCardByName(c.name)?.id,
      orientation: c.orientation,
    }));
    if (cards.some((c) => c.cardId == null)) return null;
    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        spread: spreadSlug,
        theme: parsed.theme,
        question: parsed.question ?? null,
        aiReading: reading.slice(0, 5000),
        cards: JSON.stringify(cards),
      },
    });
    return entry.id;
  } catch (err) {
    console.error("[ai-reading/deep] could not journal a paid reading (it was still delivered):", err);
    return null;
  }
}

// Paid tier: ~1500-character narrative, streamed as Server-Sent Events so the frontend can
// render it with a typewriter/fade-in effect (AI-reading PRD §1) instead of waiting on the
// full ~900-token generation.
export async function POST(req: NextRequest) {
  if (!isAiReadingConfigured()) {
    return NextResponse.json({ error: "AI reading is not configured yet." }, { status: 503 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = parseReadingRequestBody(body);
  if (!parsed) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Check-then-commit, not consume-then-refund: a killed serverless function (timeout) never
  // reaches a refund line, so consuming the quota upfront risks silently burning a free read
  // for a reading the querent never saw. Only actually spend it once generation has fully
  // streamed. This does open a narrow race between two concurrent requests both passing the
  // check — acceptable for a low-stakes quota like this one.
  const availability = await getFreshAiQuotaStatus(userId);
  if (availability.deepReadsRemaining <= 0 && availability.extraReadsAvailable <= 0) {
    return NextResponse.json({ error: "No AI deep readings remaining.", quota: availability }, { status: 402 });
  }

  const spreadSlug = typeof body?.spreadSlug === "string" ? body.spreadSlug : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let full = "";
        for await (const chunk of streamDeepReading(parsed)) {
          full += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        const consumed = await consumeAiDeepRead(userId);

        // A reading bought outright (source "extra" — an ai_single or ai_overage credit) is saved
        // to the Journal here, on the server, whatever plan the buyer is on. Journaling is
        // otherwise a member feature, and that is fine for a free daily draw — but something the
        // querent PAID for must not evaporate when they close the tab, which is exactly what used
        // to happen: POST /api/journal 403s a free user, so the $2.99 they just spent bought ~1500
        // characters that existed only until the page unloaded. "I paid and it's gone" is a refund,
        // and chargebacks in this category are what got us dropped by two processors.
        //
        // Done here rather than by letting the client save, because `source` is the only
        // unforgeable evidence of payment: trusting a client-sent "this one was paid for" flag
        // would hand every free user a way to bypass the paywall entirely.
        const journalEntryId = consumed.ok && consumed.source === "extra"
          ? await savePaidReadingToJournal(userId, spreadSlug, parsed, full)
          : null;

        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ journalEntryId })}\n\n`));
        await trackEvent("ai_deep_reading_generated", { userId, props: { source: consumed.ok ? consumed.source : "none" } });
      } catch (err) {
        console.error("[ai-reading/deep] generation failed:", err);
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
