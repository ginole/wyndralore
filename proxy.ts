import { NextRequest, NextResponse } from "next/server";
import { ANON_COOKIE } from "@/lib/analytics";
import { getAllGuides } from "@/lib/guides";

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
// Guide article slugs that have a /tc twin. Built from the same source the pages are generated
// from, so a slug can never redirect to a 繁體 URL that doesn't exist (the /tc/guides tree uses the
// identical generateStaticParams). The index /guides is handled separately below.
const TW_GUIDE_SLUGS = new Set(getAllGuides().map((g) => g.slug));

// Standalone English paths that have an exact /tc twin.
const TW_EXACT_PATHS = new Set([
  "/pricing",
  "/account",
  "/journal",
  "/yes-or-no-tarot",
  "/terms",
  "/privacy",
  "/refunds",
  // Password reset / creator-claim links are always minted on the English path (the invite and the
  // admin both build them from the site root), so this redirect is the only thing that puts a 華語
  // recipient on the 繁體 form. It matters more than its size suggests: for an invited creator this
  // is the FIRST screen she sees, and it's the screen where she decides whether an unfamiliar site
  // is safe. `url.search` is preserved below, so the ?token= survives the hop.
  "/reset-password",
]);

/** A request for a file, not a page. `/cards/` holds BOTH the card-library pages (/cards/the-fool)
 *  and the card artwork itself (/cards/back-lunar.svg, /cards/classic/major-00-fool.webp), so the
 *  prefix rule below cannot tell them apart on its own — and redirecting a file is fatal, because
 *  /tc/cards/back-lunar.svg is not a file and 404s.
 *
 *  This is not hypothetical: it was live. Every visitor in Taiwan, Hong Kong, Macau, Malaysia and
 *  Singapore — the entire audience /tc exists for — got a 307 on every card image and therefore a
 *  tarot site with no tarot cards on it. It stayed invisible because the founder browses from the
 *  Philippines, which is not on the redirect list, so the site looked perfect to him. A creator in
 *  Malaysia reported it. */
const FILE_REQUEST = /\.[a-z0-9]{2,5}$/i;

/** English content paths that have a 繁體 equivalent under /tc. */
function isTwRedirectable(pathname: string): boolean {
  if (FILE_REQUEST.test(pathname)) return false;
  if (pathname === "/" || pathname === "/cards" || pathname.startsWith("/cards/")) return true;
  if (TW_EXACT_PATHS.has(pathname)) return true;
  const m = pathname.match(/^\/reading\/([^/]+)$/);
  if (m && TW_READING_SLUGS.has(m[1])) return true;
  // Permanent saved special-reading pages have a /tc twin too.
  if (/^\/readings\/[^/]+$/.test(pathname)) return true;
  // The guides index and every guide article have a /tc twin. Without this, a TW/HK/MO/MY/SG
  // visitor landing on an English /guides URL (e.g. from Google) would be stranded on English —
  // the "geo redirect silently doesn't fire for these pages" failure, the same class of bug as the
  // card-image 404 that was invisible from the Philippines for 27 days.
  if (pathname === "/guides") return true;
  const g = pathname.match(/^\/guides\/([^/]+)$/);
  if (g && TW_GUIDE_SLUGS.has(g[1])) return true;
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
  //    and stay (no bounce-back loop), and a Malaysia/Singapore visitor pick English and stick. With
  //    no explicit choice, Taiwan / Hong Kong / Macau / Malaysia / Singapore auto-redirect to 繁體;
  //    everyone else (all Western visitors) stays on English. Crawlers are never redirected.
  //
  //    MY/SG were originally excluded on the reasoning that they are bilingual and officially use
  //    Simplified. Added 2026-07-25 (founder's call) because the 繁體 short-video channel is now the
  //    top of the funnel: a 華人 viewer who watches a 繁體 Short and clicks through should land in
  //    the language they were just reading, wherever they are. The footer switch is the escape hatch
  //    for the English-preferring MY/SG visitor, and their choice sticks.
  if (isTwRedirectable(pathname) && !pathname.startsWith(TW_PREFIX)) {
    const lang = req.cookies.get("wl_lang")?.value;
    const country = req.headers.get("x-vercel-ip-country") ?? "";
    const ua = req.headers.get("user-agent") ?? "";
    const wantsTc =
      lang === "zh" || (lang !== "en" && ["TW", "HK", "MO", "MY", "SG"].includes(country));
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
  const skipCookie =
    pathname.startsWith("/cards/") ||
    pathname.startsWith("/tc/cards/") ||
    // The guides are statically generated SEO content on both trees; a Set-Cookie would make them
    // non-CDN-cacheable, exactly the reason card detail pages are skipped.
    pathname === "/guides" ||
    pathname.startsWith("/guides/") ||
    pathname === "/tc/guides" ||
    pathname.startsWith("/tc/guides/");
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
