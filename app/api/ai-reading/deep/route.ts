import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { parseReadingRequestBody } from "@/lib/aiReadingRequest";
import { isAiReadingConfigured, streamDeepReading } from "@/lib/claude";
import { consumeAiDeepRead, getFreshAiQuotaStatus } from "@/lib/aiQuota";
import { trackEvent } from "@/lib/analytics";

// Deep readings can take longer than Vercel's default serverless timeout (10s on Hobby,
// 15s default on Pro) to fully stream ~900 output tokens. Ask for more headroom — on Hobby
// this is silently capped back down to 10s regardless (a real platform limit, not fixable
// from app code), but on Pro it actually takes effect.
export const maxDuration = 60;

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamDeepReading(parsed)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        const consumed = await consumeAiDeepRead(userId);
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
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
