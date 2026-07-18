import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const isDev = process.env.NODE_ENV !== "production";

// Third-party origins the site legitimately loads: GA4 (googletagmanager / google-analytics),
// Meta Pixel (connect.facebook.net / facebook.com), and Google AdSense (googlesyndication /
// doubleclick / google.com ad frames). Anything not listed here is blocked by the CSP.
const GA = ["https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://*.analytics.google.com"];
const META = ["https://connect.facebook.net", "https://www.facebook.com"];
const ADSENSE = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.googleadservices.com",
];
// Paddle.js (checkout overlay) — cdn.paddle.com serves the script; the overlay itself opens an
// iframe and makes API calls from various paddle.com subdomains (checkout, buy, api, and their
// sandbox-* equivalents) that aren't documented as a fixed list, so a single wildcard covers the
// vendor rather than risking missing one and re-debugging a CSP block later.
// DORMANT: Paddle declined the domain on category grounds (2026-07-15) and no longer serves any
// checkout here. Left in the allowlist only because removing it is churn with no security gain.
const PADDLE = ["https://*.paddle.com"];
// Whop embedded checkout — the live processor. js.whop.com serves the loader, the checkout itself
// renders in an iframe from whop.com and talks to api/sandbox-api subdomains. Same reasoning as
// Paddle's entry: one vendor wildcard beats enumerating hosts and re-debugging a silent CSP block.
// This exact trap already cost real time once — Paddle.js was blocked outright by this CSP and the
// failure was invisible in the on-page error UI (see the LS→Paddle migration notes).
//
// ⚠️ THE APEX ENTRY IS LOAD-BEARING — DO NOT COLLAPSE THESE TWO INTO THE WILDCARD.
// A CSP wildcard host-source matches SUBDOMAINS ONLY: `*.whop.com` covers js.whop.com and
// sandbox.whop.com but NOT bare `whop.com`. @whop/checkout frames the apex
// (`https://whop.com/…`), so with only the wildcard the production checkout iframe was blocked
// outright — Chrome renders "This content is blocked. Contact the site owner", the buyer cannot
// pay, and NOTHING is logged server-side. Live from go-live 2026-07-15 until 2026-07-18, which is
// why not one real card charge ever completed.
// Sandbox hid it perfectly: sandbox.whop.com IS a subdomain, so the sandbox purchase that
// "verified the whole chain end-to-end" passed through the wildcard and proved nothing about prod.
const WHOP = ["https://whop.com", "https://*.whop.com"];

// A CSP that still allows the ad/analytics stack: those vendors inject inline <script> snippets
// (Meta Pixel, gtag init), so 'unsafe-inline' in script-src is unavoidable without moving every
// page to per-request nonces + dynamic rendering (which would kill static/CDN caching for a
// content site). React's automatic output-escaping remains the primary XSS defense; the CSP's
// concrete wins here are: locking script/frame/connect origins to a known allowlist, blocking
// plugins (object-src 'none'), preventing <base> hijacking, restricting form posts, and — most
// importantly — frame-ancestors 'none' to stop clickjacking. 'unsafe-eval' is dev-only (React's
// dev runtime uses eval for error overlays); it is NOT allowed in production.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${[...GA, ...META, ...ADSENSE, ...PADDLE, ...WHOP].join(" ")}`,
  `style-src 'self' 'unsafe-inline' ${[...PADDLE, ...WHOP].join(" ")}`, // next/font + Tailwind emit inline styles; the checkout loads its own stylesheet
  `img-src 'self' data: blob: https:`, // ad creatives + tracking pixels come from many advertiser hosts
  `font-src 'self' data:`,
  `connect-src 'self' ${[...GA, ...META, ...ADSENSE, ...PADDLE, ...WHOP].join(" ")}`,
  `frame-src 'self' ${[...ADSENSE, ...PADDLE, ...WHOP].join(" ")}`, // AdSense renders ad units in iframes it injects; Whop's checkout is an iframe too
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Force HTTPS for 2 years incl. subdomains, and allow HSTS preloading.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Belt-and-suspenders with CSP frame-ancestors 'none' for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to powerful features the site never uses; also disables Chrome's ad-topics API.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
