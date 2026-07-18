"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const TRAFFIC_SOURCE_STORAGE_KEY = "wl_src";

// Only these come out of the address bar. Everything else — `a` (Whop creator commission), `ref`,
// `via`, `resume`, and anything added later — is left exactly as it was.
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

// Give the analytics tags time to read the campaign off the URL before it changes under them. GA4's
// gtag takes its own campaign attribution from the landing URL, and both it and this component load
// after hydration, so the order between them is not guaranteed. A second is comfortably longer than
// gtag needs and is barely perceptible next to how long the visitor spends on the page.
const STRIP_DELAY_MS = 1000;

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

  // Record the source. Separate from the tidy-up below on purpose: a returning visitor whose first
  // touch is already stored still arrives on an ugly URL and should still get it cleaned.
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

  /**
   * Take the utm_* parameters back out of the address bar once they have been read.
   *
   * Cosmetic only — an ad click otherwise leaves the visitor staring at a tracking-shaped URL for
   * their whole session, which reads as spam on a site asking to be trusted with a personal
   * question. Nothing depends on the parameters staying: the source is in localStorage by the time
   * this runs, and it is localStorage the checkout reads.
   *
   * Two things are deliberately NOT touched:
   *   • `a` — the Whop creator code. WhopAffiliateCapture reads it from the URL in its own effect,
   *     and the order the two components run in is not guaranteed. Removing it here could delete a
   *     creator's commission before she was ever credited for the referral.
   *   • `fbclid` — Meta appends this to ad clicks and the Pixel turns it into the _fbc cookie. Strip
   *     it and the attribution on the Pixel we just got working breaks.
   * Both survive, along with anything else present; only the five utm_* keys are removed.
   *
   * replaceState rather than a router navigation: no re-render, no refetch, no history entry, so
   * Back still goes where the visitor expects.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!UTM_PARAMS.some((k) => url.searchParams.has(k))) return;

    const timer = setTimeout(() => {
      const next = new URL(window.location.href);
      UTM_PARAMS.forEach((k) => next.searchParams.delete(k));
      window.history.replaceState(window.history.state, "", `${next.pathname}${next.search}${next.hash}`);
    }, STRIP_DELAY_MS);
    return () => clearTimeout(timer);
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
