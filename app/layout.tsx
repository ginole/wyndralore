import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import VisitTracker from "@/components/VisitTracker";
import ReferralCapture from "@/components/ReferralCapture";
import AffiliateCapture from "@/components/AffiliateCapture";
import WhopAffiliateCapture from "@/components/WhopAffiliateCapture";
import { CREATOR_AFFILIATE_ENABLED } from "@/lib/featureFlags";
import MetaPixel from "@/components/MetaPixel";
import AdSenseScript from "@/components/AdSenseScript";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Roman-inscription accent face for the small tracked-uppercase labels and gold CTAs —
// the engraved look tarot decks themselves use for card titles. Two weights only.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wyndralore.com"),
  title: "Wyndralore — Free Online Tarot Reading with a Ritual Feel",
  description:
    "Draw your card. Shuffle, reveal, and read — a tarot experience built for quiet reflection, not fortune-telling. Free daily readings, no account required.",
  openGraph: {
    title: "Wyndralore — Free Online Tarot Reading with a Ritual Feel",
    description:
      "Draw your card. Shuffle, reveal, and read — a tarot experience built for quiet reflection, not fortune-telling.",
    url: "https://wyndralore.com",
    siteName: "Wyndralore",
    type: "website",
  },
  verification: {
    // Google Search Console site-ownership check (property: wyndralore.com).
    google: "HSZIVxMVQzpiI7nZnJDi1uri9FLh7Wz8CFY6xk",
    other: {
      // AdSense's "meta tag" site-verification option.
      "google-adsense-account": "ca-pub-8054274022999562",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-ink text-moon">
        <AuthProvider>
          <Suspense fallback={null}>
            <VisitTracker />
            <ReferralCapture />
            {/* Three separate loops, easy to confuse:
                • ReferralCapture — ?ref=, friend invites → spread credits. Ours, live.
                • AffiliateCapture — ?via=, our own cash commission engine. Retired, see featureFlags.
                • WhopAffiliateCapture — ?a=<whop-username>, creator commission paid by Whop. Live. */}
            {CREATOR_AFFILIATE_ENABLED && <AffiliateCapture />}
            <WhopAffiliateCapture />
            <MetaPixel />
            <AdSenseScript />
            <GoogleAnalytics />
          </Suspense>
          <SiteHeader />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
