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
  // This endpoint is unauthenticated, so `props` is attacker-controlled. Cap its serialized
  // size before persisting it so it can't be used to stuff arbitrarily large blobs into the
  // analytics table (storage-exhaustion abuse). 1 KB is well beyond any legitimate funnel prop.
  let props: unknown;
  if (body?.props && typeof body.props === "object") {
    const serialized = JSON.stringify(body.props);
    props = serialized.length <= 1024 ? body.props : undefined;
  }
  await trackEvent(name as AnalyticsEventName, { anonId, userId, props: props as Record<string, unknown> | undefined });

  return NextResponse.json({ ok: true });
}
