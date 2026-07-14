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
const PADDLE = ["https://*.paddle.com"];

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
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${[...GA, ...META, ...ADSENSE, ...PADDLE].join(" ")}`,
  `style-src 'self' 'unsafe-inline' ${[...PADDLE].join(" ")}`, // next/font + Tailwind emit inline styles; Paddle's checkout loads its own stylesheet
  `img-src 'self' data: blob: https:`, // ad creatives + tracking pixels come from many advertiser hosts
  `font-src 'self' data:`,
  `connect-src 'self' ${[...GA, ...META, ...ADSENSE, ...PADDLE].join(" ")}`,
  `frame-src 'self' ${[...ADSENSE, ...PADDLE].join(" ")}`, // AdSense renders ad units in iframes it injects; Paddle's checkout overlay is an iframe too
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
