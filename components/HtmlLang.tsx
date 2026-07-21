"use client";

import { useEffect } from "react";

// Sets <html lang> on the client for the 繁體 subtree. The root layout renders <html lang="en">
// statically (kept static so the live English site is untouched and stays CDN-cacheable); Google
// determines language from visible content + hreflang, not this attribute, so setting it client-side
// is purely an accessibility/correctness nicety for the 繁體 pages. Resets on unmount (leaving /tw).
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);
  return null;
}
