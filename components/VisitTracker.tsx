"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

// Records a "visit" event per pathname change (SPA-aware). Kept intentionally minimal —
// see PRD §9 for the funnel this feeds.
export default function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    track("visit", { path: pathname });
    if (pathname === "/pricing") track("pricing_view");
  }, [pathname]);

  return null;
}
