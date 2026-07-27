import type { MetadataRoute } from "next";
import { MASTERS_MARKETPLACE_ENABLED } from "@/lib/featureFlags";

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/admin",
    "/account",
    "/journal",
    "/api/",
    "/order/",
    // ⚠️ The 繁體 mirrors were missing until 2026-07-26: /account and /journal were blocked but
    // /tc/account and /tc/journal were wide open, so the private half of the 繁體 edition was
    // crawlable while its English twin was not.
    "/tc/account",
    "/tc/journal",
    // Individual saved readings are one person's reading, not a landing page — thin, near-duplicate
    // and sometimes personal. Same for the token links (referral, delivered reading, password reset).
    "/readings/",
    "/tc/readings/",
    "/r/",
    "/deliver/",
    "/reset-password",
  ];
  // Paused ahead of a payment-processor application — see lib/featureFlags.ts. Stops the route
  // from showing up in search results while every visit to it 404s anyway.
  if (!MASTERS_MARKETPLACE_ENABLED) disallow.push("/masters");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: "https://wyndralore.com/sitemap.xml",
  };
}
