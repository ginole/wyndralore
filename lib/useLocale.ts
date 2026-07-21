"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname, type Locale } from "./i18n";
import { getAppDict } from "./i18nApp";

// Client hook: derive the locale from the current path (/tw* → zh-TW, else en). Shared client
// components (the draw, pricing, account…) use this so they localize automatically under /tw
// WITHOUT any prop-threading and WITHOUT forcing dynamic server rendering. English callers get
// "en" and are byte-for-byte unchanged — the live site can't regress.
export function useLocale(): Locale {
  return localeFromPathname(usePathname() ?? "/");
}

/** The funnel/app dictionary for the current locale. */
export function useAppT() {
  return getAppDict(useLocale());
}
