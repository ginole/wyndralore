import type { Metadata } from "next";
import { hreflangAlternates, SITE_URL, TW_PREFIX } from "@/lib/i18n";
import PricingClient from "@/app/pricing/PricingClient";

// The pricing UI is a shared client component; it localizes itself from the /tc path (useLocale)
// and the Whop checkout logic is untouched. This wrapper just adds 繁體 metadata.
// ⚠️ Import the CLIENT component, not `@/app/pricing/page` — that route is now a server component
// with its own English metadata, and nesting it here would ship the wrong title on /tc/pricing.
export const metadata: Metadata = {
  title: "方案與定價 — Wyndralore 進階會員",
  description: "無限次占卜、所有進階牌陣、占卜筆記。訂閱更划算，或一次買斷，絕無隱藏收費。",
  alternates: { canonical: `${TW_PREFIX}/pricing`, ...hreflangAlternates("/pricing") },
  openGraph: {
    title: "方案與定價 — Wyndralore 進階會員",
    description: "無限次占卜、所有進階牌陣、占卜筆記。",
    url: `${SITE_URL}${TW_PREFIX}/pricing`,
    siteName: "Wyndralore",
    type: "website",
  },
};

export default function TwPricingPage() {
  return <PricingClient />;
}
