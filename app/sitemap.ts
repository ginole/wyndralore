import type { MetadataRoute } from "next";
import { getAllCards, getCardSlug } from "@/lib/cards";

const BASE = "https://wyndralore.com";
const TW = "/tc";

// Content pages that exist in both English and 繁體 carry hreflang alternates so Google discovers
// and pairs the two language versions. x-default points at the English URL.
function bilingual(englishPath: string) {
  const en = `${BASE}${englishPath === "/" ? "" : englishPath}`;
  const tw = `${BASE}${TW}${englishPath === "/" ? "" : englishPath}`;
  return { en, "zh-Hant-TW": tw, "x-default": en };
}

/** One sitemap entry per language for a path that exists in both trees. */
function pair(path: string, priority: number) {
  const languages = bilingual(path);
  const suffix = path === "/" ? "" : path;
  return [
    { url: `${BASE}${suffix}`, changeFrequency: "monthly" as const, priority, alternates: { languages } },
    { url: `${BASE}${TW}${suffix}`, changeFrequency: "monthly" as const, priority, alternates: { languages } },
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  // ⚠️ Keep this list honest. Until 2026-07-26 it declared /pricing, /reading/*, /yes-or-no-tarot
  // and the legal pages "English-only (no 繁體 version)" — which stopped being true the day the /tc
  // edition shipped. The effect was that roughly half the 繁體 site was never submitted to Google
  // at all, and the half that was had no reciprocal hreflang from these pages.
  const BILINGUAL: [string, number][] = [
    ["/", 1],
    ["/cards", 0.8],
    ["/pricing", 0.7],
    ["/yes-or-no-tarot", 0.7],
    // The four free spreads that are statically generated. Premium-gated spreads (love, career,
    // celtic-cross) are deliberately left out: they render an upsell to logged-out crawlers.
    ["/reading/daily", 0.7],
    ["/reading/yes-no", 0.7],
    ["/reading/pick-a-card", 0.7],
    ["/reading/three-card", 0.7],
    ["/reading/year-ahead", 0.6],
    ["/reading/love-compatibility", 0.6],
    ["/terms", 0.3],
    ["/privacy", 0.3],
    ["/refunds", 0.3],
  ];

  // Genuinely English-only: the birth-card calculator has no /tc twin (see the todo memo).
  const englishOnly = ["/birth-card"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // All 78 card pages, English + 繁體, each paired.
  const cardRoutes = getAllCards().flatMap((card) => pair(`/cards/${getCardSlug(card)}`, 0.6));

  return [...BILINGUAL.flatMap(([path, priority]) => pair(path, priority)), ...englishOnly, ...cardRoutes];
}
