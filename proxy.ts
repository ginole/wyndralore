import { NextRequest, NextResponse } from "next/server";
import { ANON_COOKIE } from "@/lib/analytics";

// Next 16 renamed `middleware` → `proxy` (the exported function is `proxy`); it now defaults to the
// Node.js runtime, so we can read Vercel's geo header directly. This file does two things, in order:
//
//   1. Geo auto-detection for the 繁體 (Taiwan) edition — a Taiwan IP on an English content path
//      that HAS a 繁體 version (homepage, card library) is redirected to /tw. There is no language
//      switcher anywhere; this redirect is the only way the two editions connect for humans.
//   2. The original job: assign an anonymous visitor-id cookie so analytics can stitch a funnel
//      without any PII.
//
// Crawlers are never redirected — Google must index the English URL and its /tw counterpart
// independently (they're tied together with hreflang, not a redirect).

const TW_PREFIX = "/tw";

const BOT_UA =
  /bot|crawl|slurp|spider|mediapartners|facebookexternalhit|embedly|quora link preview|bitlybot|whatsapp|telegrambot|applebot|bingpreview|duckduckbot|yandex|baidu|petalbot/i;

// Reading paths that have a /tw twin — the spreads plus the two one-off special readings
// (year-ahead / love-compatibility, which are their own static routes under /tw/reading/).
const TW_READING_SLUGS = new Set([
  "daily",
  "yes-no",
  "pick-a-card",
  "three-card",
  "love",
  "career",
  "celtic-cross",
  "year-ahead",
  "love-compatibility",
]);
// Standalone English paths that have an exact /tw twin.
const TW_EXACT_PATHS = new Set([
  "/pricing",
  "/account",
  "/journal",
  "/yes-or-no-tarot",
  "/terms",
  "/privacy",
  "/refunds",
]);

/** English content paths that have a 繁體 equivalent under /tw. */
function isTwRedirectable(pathname: string): boolean {
  if (pathname === "/" || pathname === "/cards" || pathname.startsWith("/cards/")) return true;
  if (TW_EXACT_PATHS.has(pathname)) return true;
  const m = pathname.match(/^\/reading\/([^/]+)$/);
  if (m && TW_READING_SLUGS.has(m[1])) return true;
  // Permanent saved special-reading pages have a /tw twin too.
  if (/^\/readings\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Taiwan geo redirect. Only for the paths that actually have a 繁體 version, and never for
  //    paths already in the 繁體 tree or for crawlers.
  if (isTwRedirectable(pathname) && !pathname.startsWith(TW_PREFIX)) {
    const country = req.headers.get("x-vercel-ip-country");
    const ua = req.headers.get("user-agent") ?? "";
    if (country === "TW" && !BOT_UA.test(ua)) {
      const url = req.nextUrl.clone();
      url.pathname = pathname === "/" ? TW_PREFIX : `${TW_PREFIX}${pathname}`;
      url.search = search; // preserve utm_* etc.
      // 307 (temporary) so search engines don't cache it or treat /tw as the canonical of /.
      return NextResponse.redirect(url);
    }
  }

  // 2) Anonymous visitor id cookie (original behaviour). Skip card DETAIL pages on both trees —
  //    they are statically generated for SEO, and a Set-Cookie would make them non-CDN-cacheable.
  //    (The old matcher excluded /cards/ for exactly this reason; /tw/cards/ is the same case.)
  const res = NextResponse.next();
  const skipCookie = pathname.startsWith("/cards/") || pathname.startsWith("/tw/cards/");
  if (!skipCookie && !req.cookies.get(ANON_COOKIE)) {
    const anonId = crypto.randomUUID();
    res.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  // Widened from the original (which excluded cards/) so the geo redirect can run on the card
  // library too. Cookie-setting on card detail pages is still skipped inside the function above, so
  // their caching is unaffected.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
