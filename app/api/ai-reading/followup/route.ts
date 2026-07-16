import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseReadingRequestBody } from "@/lib/aiReadingRequest";
import { isAiReadingConfigured, streamFollowupAnswer } from "@/lib/claude";
import { trackEvent } from "@/lib/analytics";

export const maxDuration = 60;

/**
 * A paid follow-up question against a deep reading the querent just received ($1.99, or a
 * previously purchased credit). Same SSE shape as /api/ai-reading/deep, and the same
 * check-then-commit rule: the credit is only spent after the answer fully streams, so a
 * timeout can't silently burn a credit for an answer nobody saw.
 */
export async function POST(req: NextRequest) {
  if (!isAiReadingConfigured()) {
    return NextResponse.json({ error: "AI reading is not configured yet." }, { status: 503 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = parseReadingRequestBody(body);
  if (!parsed) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const previousReading = typeof body?.previousReading === "string" ? body.previousReading.trim().slice(0, 2400) : "";
  const followupQuestion = typeof body?.followupQuestion === "string" ? body.followupQuestion.trim().slice(0, 300) : "";
  if (!previousReading || !followupQuestion) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiFollowupCredits: true } });
  if (!user || user.aiFollowupCredits <= 0) {
    return NextResponse.json({ error: "No follow-up credits." }, { status: 402 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamFollowupAnswer(parsed, previousReading, followupQuestion)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        // Concurrency-safe spend: only decrement if a credit is still there.
        await prisma.user.updateMany({
          where: { id: userId, aiFollowupCredits: { gt: 0 } },
          data: { aiFollowupCredits: { decrement: 1 } },
        });
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        await trackEvent("ai_deep_reading_generated", { userId, props: { source: "followup" } });
      } catch (err) {
        console.error("[ai-reading/followup] generation failed:", err);
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
