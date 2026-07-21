import type { MetadataRoute } from "next";
import { getAllCards, getCardSlug } from "@/lib/cards";

const BASE = "https://wyndralore.com";

// Content pages that exist in both English and 繁體 carry hreflang alternates so Google discovers
// and pairs the two language versions. x-default points at the English URL.
function bilingual(englishPath: string) {
  const en = `${BASE}${englishPath === "/" ? "" : englishPath}`;
  const tw = `${BASE}/tw${englishPath === "/" ? "" : englishPath}`;
  return { en, "zh-Hant-TW": tw, "x-default": en };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // English-only routes (no 繁體 version): draw, pricing, keyword landing pages, legal.
  const englishOnly = ["/pricing", "/reading/daily", "/reading/three-card", "/reading/yes-no", "/reading/pick-a-card", "/birth-card", "/yes-or-no-tarot", "/terms", "/privacy"].map(
    (path) => ({
      url: `${BASE}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }),
  );

  // Homepage + card library exist in both languages — emit both URLs, each annotated with the pair.
  const bilingualStatic = [
    { path: "/", priority: 1 },
    { path: "/cards", priority: 0.7 },
  ].flatMap(({ path, priority }) => {
    const languages = bilingual(path);
    return [
      { url: `${BASE}${path === "/" ? "" : path}`, changeFrequency: "monthly" as const, priority, alternates: { languages } },
      { url: `${BASE}/tw${path === "/" ? "" : path}`, changeFrequency: "monthly" as const, priority, alternates: { languages } },
    ];
  });

  // All 78 card pages, English + 繁體, each paired.
  const cardRoutes = getAllCards().flatMap((card) => {
    const slug = getCardSlug(card);
    const languages = bilingual(`/cards/${slug}`);
    return [
      { url: `${BASE}/cards/${slug}`, changeFrequency: "monthly" as const, priority: 0.6, alternates: { languages } },
      { url: `${BASE}/tw/cards/${slug}`, changeFrequency: "monthly" as const, priority: 0.6, alternates: { languages } },
    ];
  });

  return [...bilingualStatic, ...englishOnly, ...cardRoutes];
}
