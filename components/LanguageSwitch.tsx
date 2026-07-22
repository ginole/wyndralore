"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { localeFromPathname, toEnglishPath, TW_PREFIX } from "@/lib/i18n";

// Regions where a 繁體 option is offered on the English site. A Western visitor (any other geo, and
// no prior language choice) never sees a Chinese entry point — the category trust constraint.
const ZH_REGIONS = ["TW", "HK", "MO", "MY", "SG"];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function choose(lang: "en" | "zh") {
  // proxy.ts honours this over geo, so the choice sticks and can't bounce back.
  document.cookie = `wl_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Footer language switch. On /tc it always offers "English"; on the English site it offers "中文"
 * only to Traditional-Chinese regions (or to anyone who has already switched once) — so a Western
 * visitor never sees a Chinese entry. A full-page <a> navigation is used on purpose so proxy.ts
 * runs with the freshly-set wl_lang cookie.
 */
export default function LanguageSwitch() {
  const pathname = usePathname() ?? "/";
  const isZh = localeFromPathname(pathname) === "zh-TW";
  const [allowZhEntry, setAllowZhEntry] = useState(false);

  useEffect(() => {
    const cc = readCookie("wl_cc");
    const chose = readCookie("wl_lang");
    setAllowZhEntry((cc !== null && ZH_REGIONS.includes(cc)) || chose !== null);
  }, []);

  if (isZh) {
    // On the 繁體 site: always offer a way back to English (to the same page's English twin).
    return (
      <a href={toEnglishPath(pathname)} onClick={() => choose("en")} className="transition-colors hover:text-gold">
        English
      </a>
    );
  }
  // On the English site: only surface 中文 in Traditional-Chinese regions; go to the 繁體 home to
  // avoid landing on a path that has no 繁體 twin.
  if (!allowZhEntry) return null;
  return (
    <a href={TW_PREFIX} onClick={() => choose("zh")} className="transition-colors hover:text-gold">
      中文
    </a>
  );
}
