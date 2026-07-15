import { cookies } from "next/headers";
import { prisma } from "./db";

export const ANON_COOKIE = "wl_anon";

export type AnalyticsEventName =
  | "visit"
  | "signup"
  | "reading_completed"
  | "quota_exhausted"
  | "share_click"
  | "ad_completed"
  | "pricing_view"
  | "order_created"
  | "payment_completed"
  | "ai_read_purchased"
  | "ai_deep_reading_generated"
  | "creator_invite_sent"
  | "admin_manual_grant"
  | "master_dashboard_viewed"
  | "affiliate_withdraw_requested"
  | "affiliate_payout_sent";

/** Server-side event recording. Never throws into the caller — analytics must not break UX. */
export async function trackEvent(
  name: AnalyticsEventName,
  opts: { anonId?: string | null; userId?: string | null; props?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        anonId: opts.anonId ?? null,
        userId: opts.userId ?? null,
        props: opts.props ? JSON.stringify(opts.props) : null,
      },
    });
  } catch (err) {
    console.warn("[analytics] failed to record event", name, err);
  }
}

/** Reads (and lazily returns) the anonymous visitor id from the first-party cookie. */
export async function getAnonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_COOKIE)?.value ?? null;
}
