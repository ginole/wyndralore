import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { trackEvent, getAnonId, AnalyticsEventName } from "@/lib/analytics";

const ALLOWED: AnalyticsEventName[] = [
  "visit",
  "reading_completed",
  "quota_exhausted",
  "share_click",
  "ad_completed",
  "pricing_view",
  // signup / order_created / payment_completed are recorded server-side at their source of truth.
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = body?.name;
  if (typeof name !== "string" || !ALLOWED.includes(name as AnalyticsEventName)) {
    return NextResponse.json({ ok: false }, { status: 204 });
  }

  const [anonId, userId] = await Promise.all([getAnonId(), getSessionUserId()]);
  const props = body?.props && typeof body.props === "object" ? body.props : undefined;
  await trackEvent(name as AnalyticsEventName, { anonId, userId, props });

  return NextResponse.json({ ok: true });
}
