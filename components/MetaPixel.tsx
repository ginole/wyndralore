"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, pixelTrack } from "@/lib/pixel";

// Injects the Meta (Facebook) Pixel base code and fires a PageView on every route change so
// SPA navigations still register as pageviews for FB ad optimization. Renders nothing (and
// injects nothing) when NEXT_PUBLIC_META_PIXEL_ID is unset, so preview/dev stay clean.
export default function MetaPixel() {
  const pathname = usePathname();
  // The base snippet already fires the first PageView; skip firing a duplicate for the
  // initial render and only track subsequent client-side navigations.
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    pixelTrack("PageView");
  }, [pathname]);

  if (!META_PIXEL_ID) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}
