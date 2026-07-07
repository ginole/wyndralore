import { NextRequest, NextResponse } from "next/server";
import { parseReadingRequestBody } from "@/lib/aiReadingRequest";
import { isAiReadingConfigured, streamFreeSummary } from "@/lib/claude";
import { clientIpFrom } from "@/lib/adminThrottle";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

// Free tier: a single ~30-char line. Each call is cheap (max_tokens=20), but this endpoint is
// UNAUTHENTICATED and calls a paid third-party API on every request — so it must be rate limited
// per-IP, or it's a trivial cost/abuse amplifier (OWASP A04 / cost-security). 20 requests per
// 5 minutes is far above any real human's reading pace while crushing scripted flooding.
const SUMMARY_LIMIT = 20;
const SUMMARY_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!isAiReadingConfigured()) {
    return NextResponse.json({ error: "AI reading is not configured yet." }, { status: 503 });
  }

  const rl = await checkRateLimit("ai_summary", clientIpFrom(req), SUMMARY_LIMIT, SUMMARY_WINDOW_MS);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const parsed = parseReadingRequestBody(body);
  if (!parsed) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    let text = "";
    for await (const chunk of streamFreeSummary(parsed)) text += chunk;
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("[ai-reading/summary] generation failed:", err);
    return NextResponse.json({ error: "Could not generate the AI summary." }, { status: 502 });
  }
}
