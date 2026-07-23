"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";
import { currentTrafficSource } from "@/components/TrafficSourceCapture";

// Records a "visit" event per pathname change (SPA-aware). Kept intentionally minimal —
// see PRD §9 for the funnel this feeds.
export default function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    // Stamp the campaign onto the visit. Orders already carry it (Order.utmSource), but an order
    // is the LAST step — on a small ad budget there may be none at all, and then the spend teaches
    // nothing. Every AnalyticsEvent shares an anonId, so putting the source on the visit makes the
    // middle of the funnel readable: of the visitors from a campaign, how many finished a reading,
    // how many signed up. That is the only thing a few hundred pesos can actually measure.
    // Omitted entirely for direct traffic, so ordinary visits carry no extra payload.
    // currentTrafficSource, not storedTrafficSource: this effect runs BEFORE TrafficSourceCapture
    // has written anything on the first page of a session, so reading storage alone left every ad
    // landing unattributed — and a landing is usually the only pageview an ad visitor produces.
    const src = currentTrafficSource();
    track("visit", {
      path: pathname,
      ...(src?.utmSource ? { utmSource: src.utmSource, utmCampaign: src.utmCampaign } : {}),
    });
    // Both trees — the 繁體 pricing page is the same funnel step. (Found 2026-07-23: the first
    // TW registrant viewed /tc/pricing twice and the funnel query showed "0 pricing" — this
    // hardcoded English path was silently dropping every 繁體 pricing view.)
    if (pathname === "/pricing" || pathname === "/tc/pricing") track("pricing_view");
  }, [pathname]);

  return null;
}
