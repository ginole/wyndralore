import type { MetadataRoute } from "next";
import { getAllCards, getCardSlug } from "@/lib/cards";

const BASE = "https://wyndralore.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/cards", "/pricing", "/reading/daily", "/reading/three-card", "/reading/yes-no", "/birth-card", "/yes-or-no-tarot", "/terms", "/privacy"].map(
    (path) => ({
      url: `${BASE}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const cardRoutes = getAllCards().map((card) => ({
    url: `${BASE}/cards/${getCardSlug(card)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...cardRoutes];
}
