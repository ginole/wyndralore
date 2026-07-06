import { NextRequest, NextResponse } from "next/server";
import { parseReadingRequestBody } from "@/lib/aiReadingRequest";
import { isAiReadingConfigured, streamFreeSummary } from "@/lib/claude";

// Free tier: a single ~30-char line, cheap enough that no auth/quota gating is needed —
// only draw quota (lib/quota.ts) gates whether the user got a reading at all.
export async function POST(req: NextRequest) {
  if (!isAiReadingConfigured()) {
    return NextResponse.json({ error: "AI reading is not configured yet." }, { status: 503 });
  }

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
