#!/usr/bin/env node
// Region self-check — the routine that did not exist, which is why the 繁體 edition served a 404 on
// every card image for 27 days (2026-07-21 → 2026-08-17).
//
// WHY THIS FILE EXISTS, because the reasoning is the whole point: the founder browses from the
// Philippines. PH is not in the geo-redirect list, so the entire class of bug that only fires for
// TW / HK / MO / MY / SG is INVISIBLE from his machine and from mine. "It works for me" is not
// evidence on this site. The only way to see what a Taiwanese visitor sees is to send
// `x-vercel-ip-country` yourself — and Vercel's edge OVERWRITES that header on production, so
// spoofing against wyndralore.com proves exactly nothing. Therefore the geo suite below refuses to
// run against anything but a local server, and a run that could not execute it reports INCOMPLETE
// rather than PASS. A green tick that cannot see the bug is worse than no tick.
//
// Usage
//   node scripts/region-check.mjs                 both suites (auto-starts `next dev` if :3000 is free)
//   node scripts/region-check.mjs --geo           geo/redirect matrix only (local)
//   node scripts/region-check.mjs --live          production pages + assets only (no server needed)
//   node scripts/region-check.mjs --live --full   every URL in the production sitemap (~360)
//   node scripts/region-check.mjs --no-serve      never spawn a server; use one already on :3000
//
// Exit codes: 0 = all checks passed · 1 = a check failed · 2 = incomplete (a suite could not run).

import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const argv = new Set(process.argv.slice(2));
const WANT_GEO = argv.has("--geo") || !argv.has("--live");
const WANT_LIVE = argv.has("--live") || !argv.has("--geo");
const FULL = argv.has("--full");
const NO_SERVE = argv.has("--no-serve");

const LOCAL = "http://localhost:3000";
const PROD = "https://wyndralore.com";

// The five regions the 繁體 edition is built for (proxy.ts step 1), and a control group that must
// stay on English. VN is in the control group on purpose: TikTok's audience is 92.5% Vietnamese, so
// a redirect leaking to VN would be a real, large-scale bug.
const TC_COUNTRIES = ["TW", "HK", "MO", "MY", "SG"];
const EN_COUNTRIES = ["US", "PH", "TH", "CN", "GB", "VN", "JP"];

// English paths that MUST hand a 華語 visitor to /tc. Keep in step with proxy.ts's TW_EXACT_PATHS,
// TW_READING_SLUGS and TW_GUIDE_SLUGS — a path that quietly stops redirecting strands the visitor
// on English, which is the same failure class as the card-image 404, just less visible.
const TC_PAGES = [
  "/",
  "/cards",
  "/cards/the-fool",
  "/guides",
  "/guides/what-is-tarot",
  "/pricing",
  "/account",
  "/journal",
  "/yes-or-no-tarot",
  "/terms",
  "/privacy",
  "/refunds",
  "/contact",
  "/reading/daily",
  "/reading/pick-a-card",
];

// THE REGRESSION GUARD. /cards/ holds both pages and artwork; redirecting artwork sends
// /cards/back-lunar.svg to /tc/cards/back-lunar.svg, which is not a file. These must never redirect
// for anybody, in any region, ever.
const FILE_PATHS = [
  "/cards/back-lunar.svg",
  "/cards/back-damask.svg",
  "/cards/major-00-fool.svg",
  "/cards/classic/major-00-fool.webp",
  "/cards/classic/major-21-world.webp",
];

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HUMAN =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const CONTENT_TYPES = {
  svg: "image/svg+xml", webp: "image/webp", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", ico: "image/", gif: "image/gif", css: "text/css",
  js: "javascript", json: "json", txt: "text/plain", woff2: "font/woff2", xml: "xml",
};

// ── tiny harness ────────────────────────────────────────────────────────────────
let pass = 0;
const failures = [];
const notes = [];
const c = { red: "\x1b[31m", grn: "\x1b[32m", yel: "\x1b[33m", dim: "\x1b[2m", off: "\x1b[0m" };

function ok(label) {
  pass++;
  process.stdout.write(`  ${c.grn}✓${c.off} ${c.dim}${label}${c.off}\n`);
}
function bad(label, detail) {
  failures.push({ label, detail });
  process.stdout.write(`  ${c.red}✗ ${label}${c.off}\n      ${detail}\n`);
}
function head(t) {
  process.stdout.write(`\n${t}\n`);
}

async function req(base, path, { country, ua = HUMAN, cookie } = {}) {
  const headers = { "user-agent": ua };
  if (country) headers["x-vercel-ip-country"] = country;
  if (cookie) headers.cookie = cookie;
  const res = await fetch(base + path, { headers, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), res };
}

/** Run `jobs` (thunks) with a bounded pool so a 360-URL sweep doesn't open 360 sockets. */
async function pool(jobs, size = 8) {
  const it = jobs[Symbol.iterator]();
  await Promise.all(
    Array.from({ length: Math.min(size, jobs.length) }, async () => {
      for (let n = it.next(); !n.done; n = it.next()) await n.value();
    })
  );
}

/** Compare a Location header against an expected path, tolerating absolute vs relative form. */
function locPath(location, base) {
  if (!location) return null;
  try {
    const u = new URL(location, base);
    return u.pathname + u.search;
  } catch {
    return location;
  }
}

// ── suite A: geo / redirect matrix (LOCAL ONLY) ─────────────────────────────────
async function geoSuite(base) {
  head(`${c.yel}A. 地區重導向矩陣${c.off}  ${c.dim}(${base} — spoofed x-vercel-ip-country)${c.off}`);

  // A1 — the five 繁體 regions must be handed to /tc on every bilingual page.
  for (const country of TC_COUNTRIES) {
    for (const path of TC_PAGES) {
      const want = path === "/" ? "/tc" : "/tc" + path;
      const { status, location } = await req(base, path, { country });
      const got = locPath(location, base);
      if (status === 307 && got === want) ok(`${country} ${path} → ${want}`);
      else bad(`${country} ${path} 沒有導到 ${want}`, `got ${status}${got ? " → " + got : ""}`);
    }
  }

  // A2 — everyone else stays on English. A redirect leaking here would send Western (and, given the
  // TikTok audience, Vietnamese) visitors to a language they cannot read.
  for (const country of EN_COUNTRIES) {
    for (const path of ["/", "/cards", "/guides", "/pricing", "/contact"]) {
      const { status, location } = await req(base, path, { country });
      const got = locPath(location, base);
      if (got && got.startsWith("/tc")) bad(`${country} ${path} 被誤導到繁體`, `${status} → ${got}`);
      else ok(`${country} ${path} 留在英文 (${status})`);
    }
  }

  // A3 — THE 27-DAY BUG. Artwork must never be redirected, for any region.
  for (const country of [...TC_COUNTRIES, "US", "PH"]) {
    for (const path of FILE_PATHS) {
      const { status, location } = await req(base, path, { country });
      const got = locPath(location, base);
      if (got)
        bad(`${country} ${path} 被重導 — 圖片會 404`, `${status} → ${got}  ← 這正是壞了 27 天的那個 bug`);
      else if (status !== 200) bad(`${country} ${path} 檔案不存在`, `status ${status}`);
      else ok(`${country} ${path} 200，未被重導`);
    }
  }

  // A4 — crawlers are never redirected (Google must index both trees independently, paired by
  // hreflang rather than by a redirect).
  for (const country of TC_COUNTRIES) {
    const { status, location } = await req(base, "/", { country, ua: GOOGLEBOT });
    if (location) bad(`Googlebot@${country} 被重導`, `${status} → ${locPath(location, base)}`);
    else ok(`Googlebot@${country} 未被重導 (${status})`);
  }

  // A5 — an explicit language choice always beats geo, in both directions. This is what stops a
  // Taiwan visitor who picked English from being bounced back on every navigation.
  {
    const a = await req(base, "/", { country: "TW", cookie: "wl_lang=en" });
    if (a.location) bad("wl_lang=en @TW 仍被導到繁體", `→ ${locPath(a.location, base)}`);
    else ok("wl_lang=en @TW 留在英文");

    const b = await req(base, "/", { country: "US", cookie: "wl_lang=zh" });
    if (locPath(b.location, base) === "/tc") ok("wl_lang=zh @US 導到 /tc");
    else bad("wl_lang=zh @US 沒有導到 /tc", `${b.status} → ${locPath(b.location, base)}`);
  }

  // A6 — query strings survive the hop. If they don't, a creator's ?a= commission and every utm_*
  // is destroyed at the redirect — silently, and only for the 華語 audience the links are aimed at.
  {
    const q = "/?a=haokongbu&utm_source=yt";
    const { status, location } = await req(base, q, { country: "MY" });
    const got = locPath(location, base);
    if (got === "/tc?a=haokongbu&utm_source=yt") ok("MY /?a=…&utm_source=… 參數保留");
    else bad("MY 重導時掉了 query — 達人分潤會斷", `${status} → ${got}`);
  }

  // A7 — the legacy /tw tree still 308s to /tc (old ad landing URLs and anything already shared).
  for (const [from, want] of [
    ["/tw", "/tc"],
    ["/tw/cards/the-fool?a=x", "/tc/cards/the-fool?a=x"],
  ]) {
    const { status, location } = await req(base, from, { country: "US" });
    const got = locPath(location, base);
    if (status === 308 && got === want) ok(`${from} → 308 ${want}`);
    else bad(`${from} 沒有 308 到 ${want}`, `${status} → ${got}`);
  }

  // A8 — negative controls. /birth-card has no 繁體 twin, and /tc must not redirect onto itself.
  for (const [path, why] of [
    ["/birth-card", "英文獨有頁不該被導"],
    ["/tc", "繁體頁不該再被導（迴圈）"],
  ]) {
    const { status, location } = await req(base, path, { country: "TW" });
    if (location) bad(`TW ${path} — ${why}`, `${status} → ${locPath(location, base)}`);
    else ok(`TW ${path} 未被重導 (${status})`);
  }
}

// ── suite B: production reality ─────────────────────────────────────────────────
function assetsIn(html) {
  const out = new Set();
  const push = (u) => {
    if (!u) return;
    u = u.trim();
    if (u.startsWith("/_next/image")) {
      const inner = new URLSearchParams(u.split("?")[1] || "").get("url");
      if (inner && inner.startsWith("/")) out.add(inner);
      return;
    }
    if (u.startsWith("/") && !u.startsWith("//")) out.add(u.split("#")[0]);
  };
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi))
    for (const part of m[1].split(",")) push(part.trim().split(/\s+/)[0]);
  for (const m of html.matchAll(
    /<link[^>]+rel=["'](?:stylesheet|preload|icon)["'][^>]*href=["']([^"']+)["']/gi
  ))
    push(m[1]);
  for (const m of html.matchAll(/url\((["']?)(\/[^)"']+)\1\)/gi)) push(m[2]);
  // Only assets, not page links — a page 404 is B1's job via the sitemap.
  return [...out].filter((u) => /\.[a-z0-9]{2,5}(\?|$)/i.test(u));
}

async function liveSuite(base) {
  head(`${c.yel}B1. 線上頁面${c.off}  ${c.dim}(${base})${c.off}`);

  // Default is a spine of both trees; --full walks the whole sitemap, which is the authoritative
  // list (app/sitemap.ts) and therefore picks up new pages without editing this file.
  let pages = [
    "/", "/tc", "/cards", "/tc/cards", "/cards/the-fool", "/tc/cards/the-fool",
    "/guides", "/tc/guides", "/guides/what-is-tarot", "/tc/guides/what-is-tarot",
    "/pricing", "/tc/pricing", "/contact", "/tc/contact", "/refunds", "/tc/refunds",
    "/terms", "/tc/terms", "/privacy", "/tc/privacy", "/reset-password", "/tc/reset-password",
    "/birth-card", "/sitemap.xml", "/robots.txt",
  ];
  if (FULL) {
    try {
      const xml = await (await fetch(base + "/sitemap.xml")).text();
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
      if (urls.length) pages = [...new Set([...urls, "/sitemap.xml", "/robots.txt"])];
      else notes.push("sitemap.xml 沒有解析出任何 URL — 已退回預設清單");
    } catch (e) {
      notes.push(`讀不到 sitemap.xml（${e.message || e}）— 已退回預設清單`);
    }
  }
  process.stdout.write(`  ${c.dim}${pages.length} pages${c.off}\n`);
  await pool(
    pages.map((p) => async () => {
      try {
        const { status } = await req(base, p);
        if (status === 200) ok(`${p} 200`);
        else bad(`${p} 不是 200`, `status ${status}`);
      } catch (e) {
        bad(`${p} 請求失敗`, String(e.message || e));
      }
    })
  );

  // Every asset the key pages actually reference must exist. This is the check that would catch a
  // deleted or renamed card file. ⚠️ It CANNOT catch the geo-redirect flavour of the same symptom —
  // from here the file 200s; only suite A sees what Taiwan sees.
  head(`${c.yel}B2. 頁面實際引用的靜態檔${c.off}`);
  const scrape = ["/", "/tc", "/cards", "/tc/cards", "/cards/the-fool", "/tc/cards/the-fool"];
  const assets = new Map(); // asset path → the page that referenced it
  for (const page of scrape) {
    try {
      const r = await fetch(base + page, { headers: { "user-agent": HUMAN } });
      if (!r.ok) {
        bad(`抓不到 ${page} 的 HTML`, `status ${r.status}`);
        continue;
      }
      for (const a of assetsIn(await r.text())) if (!assets.has(a)) assets.set(a, page);
    } catch (e) {
      bad(`抓不到 ${page} 的 HTML`, String(e.message || e));
    }
  }
  if (!assets.size) bad("兩棵樹的頁面都沒解析出任何靜態檔", "解析器可能失效了，別把這當成通過");
  else process.stdout.write(`  ${c.dim}${assets.size} assets referenced${c.off}\n`);
  await pool(
    [...assets].map(([path, from]) => async () => {
      try {
        const res = await fetch(base + path, {
          headers: { "user-agent": HUMAN },
          redirect: "manual",
        });
        const ext = (path.match(/\.([a-z0-9]{2,5})(?:\?|$)/i) || [])[1]?.toLowerCase();
        const ct = res.headers.get("content-type") || "";
        if (res.status !== 200) bad(`${path}（${from} 引用）不是 200`, `status ${res.status}`);
        else if (ext && CONTENT_TYPES[ext] && !ct.includes(CONTENT_TYPES[ext]))
          bad(`${path} content-type 不對`, `want ${CONTENT_TYPES[ext]}, got ${ct}`);
        else ok(`${path} 200 ${ct.split(";")[0]}`);
      } catch (e) {
        bad(`${path} 請求失敗`, String(e.message || e));
      }
    })
  );
}

// ── local server plumbing ───────────────────────────────────────────────────────
function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.setTimeout(800);
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(base, ms = 180_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(base + "/robots.txt", { redirect: "manual" });
      if (r.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function startDev() {
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(cmd, ["run", "dev"], { stdio: "ignore", shell: process.platform === "win32" });
}

function stopDev(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    // Must be SYNCHRONOUS. `npm run dev` is a cmd wrapper around the real next process, so killing
    // the handle alone orphans a server holding :3000 — and an async spawn here never gets to run,
    // because the report below calls process.exit() first. That orphan is not cosmetic: the next
    // run would silently REUSE it ("沿用 :3000") and therefore test whatever code that stale server
    // was started with, which is exactly how a check ends up certifying the wrong build.
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

// ── main ────────────────────────────────────────────────────────────────────────
let incomplete = false;
let dev = null;

process.stdout.write(
  `\n${c.yel}Wyndralore 地區自檢${c.off}  ${c.dim}${new Date().toISOString()}${c.off}\n` +
    `${c.dim}菲律賓（和西方）視角看不到繁體地區的 bug — 這支腳本存在的唯一理由。${c.off}\n`
);

try {
  if (WANT_GEO) {
    const already = await portOpen(3000);
    if (!already && NO_SERVE) {
      incomplete = true;
      notes.push("--no-serve 且 :3000 沒有服務 — 地區矩陣整組沒跑。先開 `npm run dev`。");
    } else {
      if (already) {
        process.stdout.write(`\n${c.dim}沿用 :3000 上已在跑的服務。${c.off}\n`);
        notes.push(":3000 本來就有服務，這次是沿用它 — 測到的是那台服務啟動時的程式碼，不保證是你現在的工作目錄。");
      } else {
        process.stdout.write(`\n${c.dim}:3000 沒開，正在啟動 next dev（首次編譯較慢）…${c.off}\n`);
        dev = startDev();
      }
      if (await waitForServer(LOCAL)) await geoSuite(LOCAL);
      else {
        incomplete = true;
        notes.push("本地服務起不來 — 地區矩陣整組沒跑。");
      }
    }
  } else {
    incomplete = true;
    notes.push(
      "--live 模式：地區矩陣沒跑。線上無法偽造 x-vercel-ip-country，所以這次沒有任何檢查看得見「只有繁體地區才壞」的那類 bug。"
    );
  }

  if (WANT_LIVE) await liveSuite(PROD);
  else {
    incomplete = true;
    notes.push("--geo 模式：線上頁面與圖片沒檢查（本地過了不代表線上是同一份 build）。");
  }
} finally {
  stopDev(dev);
}

// ── report ──────────────────────────────────────────────────────────────────────
head(`${c.yel}結果${c.off}`);
process.stdout.write(`  通過 ${pass} · 失敗 ${failures.length}\n`);
for (const n of notes) process.stdout.write(`  ${c.yel}⚠ ${n}${c.off}\n`);
if (failures.length) {
  process.stdout.write(`\n  ${c.red}失敗項目：${c.off}\n`);
  for (const f of failures) process.stdout.write(`   • ${f.label}\n     ${c.dim}${f.detail}${c.off}\n`);
  process.stdout.write(`\n${c.red}FAIL${c.off}\n`);
  process.exit(1);
}
if (incomplete) {
  process.stdout.write(`\n${c.yel}INCOMPLETE — 跑過的都過了，但有整組沒跑。這不等於沒問題。${c.off}\n`);
  process.exit(2);
}
process.stdout.write(`\n${c.grn}PASS${c.off}\n`);
