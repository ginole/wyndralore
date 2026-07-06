import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { parseReadingRequestBody } from "@/lib/aiReadingRequest";
import { isAiReadingConfigured, streamDeepReading } from "@/lib/claude";
import { consumeAiDeepRead, refundAiDeepRead } from "@/lib/aiQuota";
import { trackEvent } from "@/lib/analytics";

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

  const consumed = await consumeAiDeepRead(userId);
  if (!consumed.ok) {
    return NextResponse.json({ error: "No AI deep readings remaining.", quota: consumed.status }, { status: 402 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamDeepReading(parsed)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        await trackEvent("ai_deep_reading_generated", { userId, props: { source: consumed.source } });
      } catch (err) {
        console.error("[ai-reading/deep] generation failed:", err);
        await refundAiDeepRead(userId, consumed.source);
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
