import { NextRequest, NextResponse } from "next/server";
import { ANON_COOKIE } from "@/lib/analytics";

// Next 16 renamed `middleware` → `proxy` (the exported function is `proxy`); it now defaults to the
// Node.js runtime, so we can read Vercel's geo header directly. This file does two things, in order:
//
//   1. Geo auto-detection for the 繁體 (Taiwan) edition — a Taiwan IP on an English content path
//      that HAS a 繁體 version (homepage, card library) is redirected to /tc. There is no language
//      switcher anywhere; this redirect is the only way the two editions connect for humans.
//   2. The original job: assign an anonymous visitor-id cookie so analytics can stitch a funnel
//      without any PII.
//
// Crawlers are never redirected — Google must index the English URL and its /tc counterpart
// independently (they're tied together with hreflang, not a redirect).

const TW_PREFIX = "/tc";

const BOT_UA =
  /bot|crawl|slurp|spider|mediapartners|facebookexternalhit|embedly|quora link preview|bitlybot|whatsapp|telegrambot|applebot|bingpreview|duckduckbot|yandex|baidu|petalbot/i;

// Reading paths that have a /tc twin — the spreads plus the two one-off special readings
// (year-ahead / love-compatibility, which are their own static routes under /tc/reading/).
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
// Standalone English paths that have an exact /tc twin.
const TW_EXACT_PATHS = new Set([
  "/pricing",
  "/account",
  "/journal",
  "/yes-or-no-tarot",
  "/terms",
  "/privacy",
  "/refunds",
]);

/** English content paths that have a 繁體 equivalent under /tc. */
function isTwRedirectable(pathname: string): boolean {
  if (pathname === "/" || pathname === "/cards" || pathname.startsWith("/cards/")) return true;
  if (TW_EXACT_PATHS.has(pathname)) return true;
  const m = pathname.match(/^\/reading\/([^/]+)$/);
  if (m && TW_READING_SLUGS.has(m[1])) return true;
  // Permanent saved special-reading pages have a /tc twin too.
  if (/^\/readings\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 0) Legacy /tw → /tc permanent redirect. The 繁體 edition moved from /tw to /tc; this keeps old
  //    links working (a live ad landing URL, anything already shared) and lets crawlers update.
  //    Preserves the query so utm_* and the ?a= affiliate code survive the hop.
  if (pathname === "/tw" || pathname.startsWith("/tw/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/tc" + pathname.slice(3); // "/tw".length === 3
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  // 1) Language routing for pages that have a 繁體 twin. An explicit choice (the footer switch sets
  //    the `wl_lang` cookie) ALWAYS wins over geo — that's what lets a Taiwan visitor pick English
  //    and stay (no bounce-back loop), and a Malaysia/Singapore visitor pick 中文 and stick. With no
  //    explicit choice, only Taiwan / Hong Kong / Macau auto-redirect to 繁體; everyone else (incl.
  //    bilingual MY/SG, and all Western visitors) stays on English. Crawlers are never redirected.
  if (isTwRedirectable(pathname) && !pathname.startsWith(TW_PREFIX)) {
    const lang = req.cookies.get("wl_lang")?.value;
    const country = req.headers.get("x-vercel-ip-country") ?? "";
    const ua = req.headers.get("user-agent") ?? "";
    const wantsTc = lang === "zh" || (lang !== "en" && ["TW", "HK", "MO"].includes(country));
    if (wantsTc && !BOT_UA.test(ua)) {
      const url = req.nextUrl.clone();
      url.pathname = pathname === "/" ? TW_PREFIX : `${TW_PREFIX}${pathname}`;
      url.search = search; // preserve utm_* / ?a=
      // 307 (temporary) so search engines don't cache it or treat /tc as the canonical of /.
      return NextResponse.redirect(url);
    }
  }

  // 2) Anonymous visitor id cookie (original behaviour). Skip card DETAIL pages on both trees —
  //    they are statically generated for SEO, and a Set-Cookie would make them non-CDN-cacheable.
  //    (The old matcher excluded /cards/ for exactly this reason; /tc/cards/ is the same case.)
  const res = NextResponse.next();
  const skipCookie = pathname.startsWith("/cards/") || pathname.startsWith("/tc/cards/");
  if (!skipCookie) {
    if (!req.cookies.get(ANON_COOKIE)) {
      const anonId = crypto.randomUUID();
      res.cookies.set(ANON_COOKIE, anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    // Expose the visitor's country (non-httpOnly, non-sensitive) so the footer language switch can
    // offer 中文 ONLY in Traditional-Chinese regions — a Western visitor never sees a Chinese entry
    // point (the category trust constraint). Set only for those regions, so its mere presence gates.
    const cc = req.headers.get("x-vercel-ip-country") ?? "";
    if (["TW", "HK", "MO", "MY", "SG"].includes(cc) && req.cookies.get("wl_cc")?.value !== cc) {
      res.cookies.set("wl_cc", cc, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    }
  }
  return res;
}

export const config = {
  // Widened from the original (which excluded cards/) so the geo redirect can run on the card
  // library too. Cookie-setting on card detail pages is still skipped inside the function above, so
  // their caching is unaffected.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
