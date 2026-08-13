"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";
import { currentTrafficSource } from "@/components/TrafficSourceCapture";
import { WHOP_AFF_PARAM, WHOP_AFF_STORAGE_KEY } from "@/components/WhopAffiliateCapture";

// Records a "visit" event per pathname change (SPA-aware). Kept intentionally minimal —
// see PRD §9 for the funnel this feeds.
export default function VisitTracker() {
  const pathname = usePathname();
  const params = useSearchParams();
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
    // Stamp the creator code too. Before this, `?a=` went into localStorage and nowhere else, so a
    // creator's link left NO server-side trace until someone bought — meaning a creator who sent a
    // thousand viewers and made no sale saw a blank dashboard, unable to tell "nobody clicked" from
    // "they clicked and didn't buy". Those are opposite problems with opposite fixes, and it is the
    // first thing a creator doing due diligence asks for.
    // Read the URL param first for the same reason as currentTrafficSource(): on the landing
    // pageview this effect runs BEFORE WhopAffiliateCapture has written to storage, and a landing is
    // usually the only pageview a creator's visitor produces.
    const aff = params?.get(WHOP_AFF_PARAM) ?? readStoredAffiliate();
    track("visit", {
      path: pathname,
      ...(src?.utmSource ? { utmSource: src.utmSource, utmCampaign: src.utmCampaign } : {}),
      ...(aff ? { aff } : {}),
    });
    // Both trees — the 繁體 pricing page is the same funnel step. (Found 2026-07-23: the first
    // TW registrant viewed /tc/pricing twice and the funnel query showed "0 pricing" — this
    // hardcoded English path was silently dropping every 繁體 pricing view.)
    if (pathname === "/pricing" || pathname === "/tc/pricing") track("pricing_view");
    // params is deliberately NOT a dependency: this effect is gated on pathname changes, and adding
    // it would re-fire the visit event on every query-string change (TrafficSourceCapture strips
    // utm_* from the address bar right after reading them, which is exactly such a change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

/** The already-captured code, for pageviews deeper into a session that no longer carry `?a=`. */
function readStoredAffiliate(): string | null {
  try {
    return localStorage.getItem(WHOP_AFF_STORAGE_KEY);
  } catch {
    return null;
  }
}
