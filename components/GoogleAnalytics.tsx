import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Loads GA4's gtag.js. Renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID isn't set, so
// preview/dev stay clean — same dormant-until-configured pattern as MetaPixel/AdSenseScript.
// gtag.js tracks pageviews on its own (including client-side route changes via the History
// API), so no separate route-change listener is needed here the way MetaPixel needs one.
export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
