import type { Metadata } from "next";
import PricingPage from "@/app/pricing/page";

// The pricing UI is a shared client component; it localizes itself from the /tw path (useLocale)
// and the Whop checkout logic is untouched. This wrapper just adds 繁體 metadata.
export const metadata: Metadata = {
  title: "方案與定價 — Wyndralore 進階會員",
  description: "無限次占卜、所有進階牌陣、占卜筆記。訂閱更划算，或一次買斷，絕無隱藏收費。",
};

export default function TwPricingPage() {
  return <PricingPage />;
}
