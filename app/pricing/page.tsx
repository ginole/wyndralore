import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/i18n";
import PricingClient from "./PricingClient";

// The pricing UI is a client component (checkout state, auth, Whop modal), which is why it lives in
// PricingClient.tsx: a "use client" file cannot export `metadata`, so before this split the English
// pricing page shipped with NO title, description or canonical at all and inherited the site-wide
// homepage title — while /tc/pricing (a thin server wrapper) had proper 繁體 metadata. This server
// page restores parity; /tc/pricing now imports the same client component.
export const metadata: Metadata = {
  title: "Pricing — Wyndralore Premium Tarot Membership",
  description:
    "Unlimited readings, every premium spread, and your private tarot journal. Subscribe monthly or yearly, or buy a single deep reading — no hidden fees.",
  alternates: { canonical: "/pricing", ...hreflangAlternates("/pricing") },
  openGraph: {
    title: "Pricing — Wyndralore Premium Tarot Membership",
    description: "Unlimited readings, every premium spread, and your private tarot journal.",
    url: "https://wyndralore.com/pricing",
    siteName: "Wyndralore",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
