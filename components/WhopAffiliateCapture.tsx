"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
    try {
      if (localStorage.getItem(WHOP_AFF_STORAGE_KEY)) return;
      localStorage.setItem(WHOP_AFF_STORAGE_KEY, code);
    } catch {
      // Private mode / storage disabled — the sale still works, it just isn't attributed.
    }
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
