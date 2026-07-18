"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const TRAFFIC_SOURCE_STORAGE_KEY = "wl_src";

export interface TrafficSource {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

// Long enough for real campaign names, short enough that nobody can stuff the DB through a URL.
const MAX_LEN = 120;

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, MAX_LEN);
  return trimmed || undefined;
}

/**
 * Records where a visitor came from, once, and keeps it until they buy.
 *
 * This is the ONLY thing that can answer "did the ad make money". The Meta Pixel cannot be created
 * (Business Verification is blocked upstream and is user-clicks-only), and GA4's purchase event is
 * fired server-side from the payment webhook under a synthetic client_id — lib/ga4.ts says so
 * outright: it "won't merge into that visitor's actual GA timeline". So GA4 knows a sale happened
 * and knows nothing about where it came from. Spending on ads without this means watching clicks and
 * orders as two unconnected numbers and guessing at the line between them.
 *
 * Deliberately mirrors WhopAffiliateCapture, which already solved the same problem for creator
 * links, including the two decisions that matter:
 *   • localStorage, not a cookie or React state — the visit and the purchase are often days apart.
 *   • FIRST touch wins. The ad that introduced someone deserves the credit, not whatever link they
 *     happened to click last on their way back. (It also makes the value stable, so re-landing on a
 *     campaign URL can't rewrite history.)
 *
 * Falls silent on any storage failure: private mode must cost an attribution row, never a sale.
 */
export default function TrafficSourceCapture() {
  const params = useSearchParams();

  useEffect(() => {
    try {
      if (localStorage.getItem(TRAFFIC_SOURCE_STORAGE_KEY)) return; // first touch already recorded

      const utmSource = clean(params.get("utm_source"));
      const utmMedium = clean(params.get("utm_medium"));
      const utmCampaign = clean(params.get("utm_campaign"));
      // A referrer only counts when it is somebody ELSE — internal navigation is not a source.
      const raw = typeof document !== "undefined" ? document.referrer : "";
      let referrer: string | undefined;
      if (raw) {
        try {
          const host = new URL(raw).hostname;
          if (host && host !== window.location.hostname) referrer = clean(host);
        } catch {
          /* unparseable referrer — treat as none */
        }
      }

      // Nothing worth recording: a direct visit with no campaign and no external referrer. Store
      // nothing rather than an empty row, so a LATER visit that does carry a source can still win.
      if (!utmSource && !utmMedium && !utmCampaign && !referrer) return;

      localStorage.setItem(
        TRAFFIC_SOURCE_STORAGE_KEY,
        JSON.stringify({ utmSource, utmMedium, utmCampaign, referrer } satisfies TrafficSource)
      );
    } catch {
      // Private mode / storage disabled — the sale still works, it just isn't attributed.
    }
  }, [params]);

  return null;
}

/** The stored first-touch source, for the checkout callers to pass to the order endpoints. */
export function storedTrafficSource(): TrafficSource | undefined {
  try {
    const raw = localStorage.getItem(TRAFFIC_SOURCE_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as TrafficSource;
    return typeof parsed === "object" && parsed ? parsed : undefined;
  } catch {
    return undefined;
  }
}
