"use client";

import { useEffect } from "react";
import { VIA_PARAM, VIA_STORAGE_KEY } from "@/lib/affiliate";

// Stashes a `?via=CODE` (a partner's affiliate link) into localStorage so it survives the visitor
// browsing around before they register — the account page forwards it to the register API for
// attribution. Separate from ReferralCapture's `?ref=` (friend invites → spread credits); this one
// drives cash commission. First code wins. Renders nothing.
export default function AffiliateCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get(VIA_PARAM);
      if (code && !window.localStorage.getItem(VIA_STORAGE_KEY)) {
        window.localStorage.setItem(VIA_STORAGE_KEY, code.trim().toUpperCase().slice(0, 16));
      }
    } catch {
      /* private mode / storage disabled — attribution just won't happen, no harm */
    }
  }, []);

  return null;
}
