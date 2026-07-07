"use client";

import { useEffect } from "react";
import { REF_PARAM, REF_STORAGE_KEY } from "@/lib/referral";

// Stashes a `?ref=CODE` from the landing URL into localStorage so it survives the visitor
// browsing around before they register — at which point the account page forwards it to the
// register API for attribution. Renders nothing. First code wins (don't let a later bare visit
// overwrite an existing pending referral).
export default function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get(REF_PARAM);
      if (code && !window.localStorage.getItem(REF_STORAGE_KEY)) {
        window.localStorage.setItem(REF_STORAGE_KEY, code.trim().toUpperCase().slice(0, 16));
      }
    } catch {
      /* private mode / storage disabled — referral just won't attribute, no harm */
    }
  }, []);

  return null;
}
