import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import VisitTracker from "@/components/VisitTracker";
import MetaPixel from "@/components/MetaPixel";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-ink text-moon">
        <AuthProvider>
          <Suspense fallback={null}>
            <VisitTracker />
            <MetaPixel />
          </Suspense>
          <SiteHeader />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
