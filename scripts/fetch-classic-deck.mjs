// Downloads the 78 public-domain 1909 deck scans from Wikimedia Commons and converts them
// into /public/cards/classic/*.webp, mirroring the minimal set's basenames (see DeckPrefs).
// Original scans are ~1110×1920 (≈0.58 ratio); the site renders 5:8 (0.625), so each card is
// padded horizontally with its own sampled edge colour before resizing — extending the scan's
// cream border rather than letterboxing it with bars.
//
// Usage: node scripts/fetch-classic-deck.mjs [--skip-download]
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "scripts", ".classic-raw"); // gitignored cache of originals
const OUT_DIR = join(ROOT, "public", "cards", "classic");
const UA = { "User-Agent": "WyndraloreDeckFetcher/1.0 (hello@wyndralore.com)" };

const MAJORS = [
  ["RWS_Tarot_00_Fool", "major-00-fool"],
  ["RWS_Tarot_01_Magician", "major-01-magician"],
  ["RWS_Tarot_02_High_Priestess", "major-02-high-priestess"],
  ["RWS_Tarot_03_Empress", "major-03-empress"],
  ["RWS_Tarot_04_Emperor", "major-04-emperor"],
  ["RWS_Tarot_05_Hierophant", "major-05-hierophant"],
  ["RWS_Tarot_06_Lovers", "major-06-lovers"],
  ["RWS_Tarot_07_Chariot", "major-07-chariot"],
  ["RWS_Tarot_08_Strength", "major-08-strength"],
  ["RWS_Tarot_09_Hermit", "major-09-hermit"],
  ["RWS_Tarot_10_Wheel_of_Fortune", "major-10-wheel-of-fortune"],
  ["RWS_Tarot_11_Justice", "major-11-justice"],
  ["RWS_Tarot_12_Hanged_Man", "major-12-hanged-man"],
  ["RWS_Tarot_13_Death", "major-13-death"],
  ["RWS_Tarot_14_Temperance", "major-14-temperance"],
  ["RWS_Tarot_15_Devil", "major-15-devil"],
  ["RWS_Tarot_16_Tower", "major-16-tower"],
  ["RWS_Tarot_17_Star", "major-17-star"],
  ["RWS_Tarot_18_Moon", "major-18-moon"],
  ["RWS_Tarot_19_Sun", "major-19-sun"],
  ["RWS_Tarot_20_Judgement", "major-20-judgement"],
  ["RWS_Tarot_21_World", "major-21-world"],
];

const RANKS = ["ace", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "page", "knight", "queen", "king"];
const SUITS = [
  ["Wands", "wands"],
  ["Cups", "cups"],
  ["Swords", "swords"],
  ["Pents", "pentacles"],
];

const FILES = [...MAJORS];
for (const [commons, ours] of SUITS) {
  RANKS.forEach((rank, i) => {
    FILES.push([`${commons}${String(i + 1).padStart(2, "0")}`, `minor-${ours}-${rank}`]);
  });
}

async function resolveUrls() {
  const map = new Map();
  // imageinfo accepts up to 50 titles per request
  for (let i = 0; i < FILES.length; i += 50) {
    const batch = FILES.slice(i, i + 50);
    const titles = batch.map(([c]) => `File:${c}.jpg`).join("|");
    const url = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=${encodeURIComponent(titles)}`;
    const j = await (await fetch(url, { headers: UA })).json();
    for (const p of Object.values(j.query.pages)) {
      if (p.missing !== undefined) throw new Error(`Commons file missing: ${p.title}`);
      map.set(p.title.replace("File:", "").replace(/ /g, "_"), p.imageinfo[0].url);
    }
  }
  return map;
}

async function download(urlMap) {
  mkdirSync(RAW_DIR, { recursive: true });
  let n = 0;
  for (const [commons] of FILES) {
    const dest = join(RAW_DIR, `${commons}.jpg`);
    if (existsSync(dest)) { n++; continue; }
    const url = urlMap.get(`${commons}.jpg`);
    if (!url) throw new Error(`no url for ${commons}`);
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`download ${commons} -> ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    n++;
    if (n % 10 === 0) console.log(`downloaded ${n}/${FILES.length}`);
    await new Promise((res) => setTimeout(res, 250)); // be polite to Commons
  }
  console.log(`raw files ready: ${n}`);
}

async function convert() {
  mkdirSync(OUT_DIR, { recursive: true });
  const TARGET_W = 640, TARGET_H = 1024; // 5:8, 2x the 320px display width
  for (const [commons, ours] of FILES) {
    const src = join(RAW_DIR, `${commons}.jpg`);
    const img = sharp(src);
    const meta = await img.metadata();
    // Pad the width out to 5:8 using the scan's own cream border colour. Sample ~25px inside
    // the edge: the outermost pixels carry scanner shadow and read several shades darker than
    // the card stock, which made the first attempt's padding look like a grey mat.
    const wantW = Math.round((meta.height * 5) / 8);
    const padTotal = Math.max(0, wantW - meta.width);
    const stats = await sharp(src)
      .extract({ left: 22, top: Math.round(meta.height / 2) - 60, width: 14, height: 120 })
      .stats();
    const bg = {
      r: Math.round(stats.channels[0].mean),
      g: Math.round(stats.channels[1].mean),
      b: Math.round(stats.channels[2].mean),
    };
    // Two passes on purpose: sharp applies its pipeline in a FIXED internal order (resize
    // before extend), regardless of chain order — a single chain would crop the card first and
    // glue the padding onto the already-resized image, producing uneven widths.
    const padded = await img
      .extend({ left: Math.floor(padTotal / 2), right: Math.ceil(padTotal / 2), background: bg })
      .toBuffer();
    await sharp(padded)
      .resize(TARGET_W, TARGET_H)
      .webp({ quality: 74, effort: 6 })
      .toFile(join(OUT_DIR, `${ours}.webp`));
  }
  console.log(`converted ${FILES.length} -> ${OUT_DIR}`);
}

const skipDownload = process.argv.includes("--skip-download");
const urlMap = skipDownload ? null : await resolveUrls();
if (!skipDownload) await download(urlMap);
await convert();
