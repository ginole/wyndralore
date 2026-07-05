import Script from "next/script";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

// Loads the AdSense account-level script. Renders nothing when NEXT_PUBLIC_ADSENSE_CLIENT_ID
// isn't set, so preview/dev stay clean. This alone also satisfies AdSense's "code snippet"
// site-verification option — no separate verification script needed.
export default function AdSenseScript() {
  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
