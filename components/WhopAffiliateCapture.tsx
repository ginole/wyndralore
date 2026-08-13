"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WHOP_EXAMPLE_AFFILIATE } from "@/lib/featureFlags";

export const WHOP_AFF_PARAM = "a";
export const WHOP_AFF_STORAGE_KEY = "wl_whop_aff";

/**
 * Catches `?a=<whop-username>` from a creator's link and keeps it until checkout, where it rides
 * along as the session's `affiliate_code` and Whop pays the creator 30% automatically.
 *
 * Why creators link here and not to their Whop affiliate link: Whop's own link lands the visitor on
 * a bare product card on whop.com — no cards drawn, no reading seen, nothing experienced — and asks
 * a stranger for $6.90. That does not convert for this product, so the creator's traffic bounces and
 * she concludes we are worthless. Sending her audience here instead lets them actually draw first,
 * which is the entire funnel; Whop still handles attribution and payout, it just does it off a
 * session we created.
 *
 * localStorage, not a cookie: the visit and the purchase are often days apart, and this survives the
 * gap. First link wins — an early recommendation shouldn't be stolen by whoever they clicked last.
 */
export default function WhopAffiliateCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get(WHOP_AFF_PARAM);
    if (!code) return;
    // The invite email's worked example is a real stranger's Whop username. Storing it would also
    // poison first-link-wins: a real creator's link clicked later could never overwrite it.
    if (code === WHOP_EXAMPLE_AFFILIATE) return;
    try {
      if (localStorage.getItem(WHOP_AFF_STORAGE_KEY)) return;
      localStorage.setItem(WHOP_AFF_STORAGE_KEY, code);
    } catch {
      // Private mode / storage disabled — the sale still works, it just isn't attributed.
    }
  }, [params]);

  // Move the code onto the ACCOUNT as soon as there is one. localStorage is per-browser, so before
  // this the whole attribution died the moment a viewer switched device — tap the link on a phone,
  // pay on a laptop, and the creator lost that commission with nothing on any screen to show it.
  // Fire-and-forget: the endpoint is a no-op unless there's a session AND the column is still empty
  // (first-touch, write-once), so re-running it on every navigation is harmless.
  useEffect(() => {
    let code: string | null = null;
    try {
      code = localStorage.getItem(WHOP_AFF_STORAGE_KEY);
    } catch {
      return;
    }
    if (!code) return;
    void fetch("/api/whop-affiliate/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {
      // Never surface this — it's bookkeeping, and a failure just leaves us where we were before.
    });
  }, [params]);

  return null;
}

/** The stored creator code, for the checkout callers to pass to /api/orders. */
export function storedWhopAffiliate(): string | undefined {
  try {
    return localStorage.getItem(WHOP_AFF_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
