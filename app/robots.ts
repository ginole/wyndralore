import type { MetadataRoute } from "next";
import { MASTERS_MARKETPLACE_ENABLED } from "@/lib/featureFlags";

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/account", "/journal", "/api/", "/order/"];
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
