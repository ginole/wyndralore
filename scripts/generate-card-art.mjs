// Generates 78 procedural, copyright-free tarot card face SVGs + 1 card back.
// Dark navy ground, single champagne-gold line art — see PRD §3.1 / §6.1.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "cards");
mkdirSync(OUT_DIR, { recursive: true });

const W = 400;
const H = 640;
const GOLD = "#c9a96e";
const GOLD_BRIGHT = "#e4c894";
const GOLD_LUMEN = "#f0dcae"; // brightest highlight — nameplate text, focal accents
const INK = "#0b0e1a";
const INK_RAISED = "#12162a";

// Per-suit halo tints (subtle — linework stays gold everywhere, only the ambient
// glow behind the icon shifts hue so suits read differently at a glance).
const SUIT_ACCENTS = {
  wands: "#d89a5e", // ember
  cups: "#8fb3c9", // moonwater
  swords: "#b9c2cf", // steel
  pentacles: "#a9c49a", // verdant
};

// Tiny deterministic PRNG so star-speck placement is stable across regenerations.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toRad = (deg) => (deg * Math.PI) / 180;

// ---------- primitive helpers (all return SVG fragment strings) ----------

function ring(cx, cy, r, opacity = 1, width = 1.4) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="${width}" opacity="${opacity}"/>`;
}

function dot(cx, cy, r = 2.2, fill = GOLD) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
}

function line(x1, y1, x2, y2, width = 1.4, opacity = 1) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GOLD}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"/>`;
}

function poly(points, opts = {}) {
  const { fill = "none", stroke = GOLD, width = 1.4, opacity = 1 } = opts;
  return `<polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`;
}

function pathD(d, opts = {}) {
  const { fill = "none", stroke = GOLD, width = 1.4, opacity = 1 } = opts;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function rayBurst(cx, cy, rInner, rOuter, count, opts = {}) {
  const { width = 1.4, opacity = 1, skip = 0 } = opts;
  let out = "";
  for (let i = skip; i < count; i++) {
    const a = toRad((360 / count) * i - 90);
    const x1 = cx + rInner * Math.cos(a);
    const y1 = cy + rInner * Math.sin(a);
    const x2 = cx + rOuter * Math.cos(a);
    const y2 = cy + rOuter * Math.sin(a);
    out += line(x1, y1, x2, y2, width, opacity);
  }
  return out;
}

function starPoints(cx, cy, points, rOuter, rInner, rotateDeg = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = toRad(rotateDeg + (360 / (points * 2)) * i);
    pts.push([+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)]);
  }
  return pts;
}

function star(cx, cy, points, rOuter, rInner, opts = {}) {
  return poly(starPoints(cx, cy, points, rOuter, rInner, opts.rotateDeg), opts);
}

function crescent(cx, cy, r, opts = {}) {
  const { opacity = 1, width = 1.4 } = opts;
  const d = `M ${cx + r * 0.55} ${cy - r} A ${r} ${r} 0 1 0 ${cx + r * 0.55} ${cy + r} A ${r * 0.72} ${r * 0.72} 0 1 1 ${cx + r * 0.55} ${cy - r} Z`;
  return pathD(d, { width, opacity, fill: GOLD, stroke: "none" });
}

function wave(x, y, w, amp, cycles = 2, opts = {}) {
  const { width = 1.4, opacity = 1 } = opts;
  let d = `M ${x} ${y}`;
  const step = w / (cycles * 2);
  for (let i = 0; i < cycles * 2; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const cx1 = x + step * i + step / 2;
    d += ` Q ${cx1} ${y + amp * dir}, ${x + step * (i + 1)} ${y}`;
  }
  return pathD(d, { width, opacity });
}

function chain(cx, cy, count, r = 9, opts = {}) {
  let out = "";
  const spacing = r * 1.5;
  const startX = cx - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    out += ring(startX + i * spacing, cy, r, opts.opacity ?? 1, opts.width ?? 1.3);
  }
  return out;
}

function lightningBolt(cx, cy, h, opts = {}) {
  const w = h * 0.4;
  const d = `M ${cx + w * 0.3} ${cy - h / 2} L ${cx - w * 0.4} ${cy} L ${cx + w * 0.05} ${cy} L ${cx - w * 0.3} ${cy + h / 2} L ${cx + w * 0.45} ${cy - h * 0.05} L ${cx + w * 0.05} ${cy - h * 0.1} Z`;
  return pathD(d, { ...opts, fill: GOLD, stroke: "none" });
}

function pillar(x, yTop, h, opts = {}) {
  const w = 14;
  return (
    line(x, yTop, x, yTop + h, opts.width ?? 1.4, opts.opacity ?? 1) +
    line(x - w / 2, yTop, x + w / 2, yTop, opts.width ?? 1.4, opts.opacity ?? 1) +
    line(x - w / 2, yTop + h, x + w / 2, yTop + h, opts.width ?? 1.4, opts.opacity ?? 1)
  );
}

function crownPoints(cx, cy, spikes, rOuter, rBase, opts = {}) {
  return star(cx, cy, spikes, rOuter, rBase, { ...opts, rotateDeg: -90 });
}

function wreath(cx, cy, r, count = 24, opts = {}) {
  let out = ring(cx, cy, r, opts.opacity ?? 0.7, 1);
  for (let i = 0; i < count; i++) {
    const a = toRad((360 / count) * i);
    out += dot(cx + r * Math.cos(a), cy + r * Math.sin(a), 1.6, GOLD);
  }
  return out;
}

// ---------- suit glyph symbols (used as <symbol> + <use>) ----------

const SUIT_SYMBOLS = {
  wands: `<g>
    <line x1="0" y1="-18" x2="0" y2="18" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" transform="rotate(18)"/>
    <line x1="-5" y1="-10" x2="5" y2="-6" stroke="${GOLD}" stroke-width="1.3" transform="rotate(18)"/>
    <line x1="-5" y1="2" x2="5" y2="6" stroke="${GOLD}" stroke-width="1.3" transform="rotate(18)"/>
  </g>`,
  cups: `<g>
    <path d="M -9 -12 L 9 -12 L 5 6 A 5 5 0 0 1 -5 6 Z" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
    <line x1="0" y1="6" x2="0" y2="14" stroke="${GOLD}" stroke-width="1.6"/>
    <line x1="-6" y1="16" x2="6" y2="16" stroke="${GOLD}" stroke-width="1.6"/>
  </g>`,
  swords: `<g>
    <line x1="0" y1="-18" x2="0" y2="14" stroke="${GOLD}" stroke-width="2"/>
    <line x1="-7" y1="-6" x2="7" y2="-6" stroke="${GOLD}" stroke-width="1.6"/>
    <circle cx="0" cy="17" r="2.2" fill="${GOLD}"/>
  </g>`,
  pentacles: `<g>
    ${ring(0, 0, 13, 1, 1.5)}
    ${star(0, 0, 5, 8.4, 3.4, { width: 1.2 })}
  </g>`,
};

function suitSymbolId(suit) {
  return `sym-${suit}`;
}

function defs(accent = GOLD_BRIGHT) {
  return `<defs>
    <radialGradient id="bgGrad" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${INK_RAISED}"/>
      <stop offset="100%" stop-color="${INK}"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="35%" stop-color="${GOLD}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${GOLD}" stop-opacity="0.14"/>
      <stop offset="65%" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.13"/>
      <stop offset="45%" stop-color="${accent}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${Object.entries(SUIT_SYMBOLS)
      .map(([suit, inner]) => `<symbol id="${suitSymbolId(suit)}" viewBox="-20 -20 40 40">${inner}</symbol>`)
      .join("\n")}
  </defs>`;
}

function diamond(cx, cy, r, fill = GOLD_BRIGHT, opacity = 1) {
  return `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${fill}" opacity="${opacity}"/>`;
}

function frame(seed = 1) {
  // Star specks in the side margins (outside the icon/pip zone) — a light dusting,
  // deterministically placed per card so regeneration is stable.
  const rand = mulberry32(seed * 7919 + 13);
  let specks = "";
  for (let i = 0; i < 6; i++) {
    const left = i % 2 === 0;
    const x = left ? 42 + rand() * 32 : 326 + rand() * 32;
    const y = 120 + rand() * 400;
    const s = 3 + rand() * 1.5;
    specks += `<g stroke="${GOLD}" stroke-width="0.9" stroke-linecap="round" opacity="${(0.35 + rand() * 0.25).toFixed(2)}"><line x1="${x.toFixed(1)}" y1="${(y - s).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + s).toFixed(1)}"/><line x1="${(x - s).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + s).toFixed(1)}" y2="${y.toFixed(1)}"/></g>`;
  }
  return `
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
    <ellipse cx="${W / 2}" cy="330" rx="185" ry="215" fill="url(#halo)"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sheen)"/>
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${GOLD}" stroke-width="1.6" opacity="0.9"/>
    <rect x="21" y="21" width="${W - 42}" height="${H - 42}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.5"/>
    <rect x="27" y="27" width="${W - 54}" height="${H - 54}" fill="none" stroke="${GOLD}" stroke-width="0.4" opacity="0.25"/>
    ${[
      [44, 44],
      [W - 44, 44],
      [44, H - 44],
      [W - 44, H - 44],
    ]
      .map(([x, y]) => diamond(x, y, 6))
      .join("")}
    <g fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.5">
      <path d="M30 58 Q30 30 58 30"/>
      <path d="M${W - 30} 58 Q${W - 30} 30 ${W - 58} 30"/>
      <path d="M30 ${H - 58} Q30 ${H - 30} 58 ${H - 30}"/>
      <path d="M${W - 30} ${H - 58} Q${W - 30} ${H - 30} ${W - 58} ${H - 30}"/>
    </g>
    ${specks}
  `;
}

function nameplate(topLabel, mainLabel) {
  return `
    <text x="${W / 2}" y="70" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" letter-spacing="4" fill="${GOLD_LUMEN}">${topLabel}</text>
    ${diamond(W / 2 - 26 - topLabel.length * 7, 64, 4, GOLD, 0.8)}
    ${diamond(W / 2 + 26 + topLabel.length * 7, 64, 4, GOLD, 0.8)}
    <line x1="${W / 2 - 60}" y1="88" x2="${W / 2 - 8}" y2="88" stroke="${GOLD}" stroke-width="0.9" opacity="0.5"/>
    <line x1="${W / 2 + 8}" y1="88" x2="${W / 2 + 60}" y2="88" stroke="${GOLD}" stroke-width="0.9" opacity="0.5"/>
    ${diamond(W / 2, 88, 4.5, GOLD, 0.7)}
    ${(() => {
      // Long names shrink to stay clear of the bottom corner diamonds (inner edges ≈ x 50/350).
      // Georgia caps advance ≈ 0.68em + 1.5px letter-spacing per char.
      const fs = Math.min(25, Math.floor((300 / mainLabel.length - 1.5) / 0.68));
      const half = (mainLabel.length * (0.68 * fs + 1.5)) / 2;
      let out = `<text x="${W / 2}" y="${H - 46}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fs}" letter-spacing="1.5" fill="${GOLD_LUMEN}">${mainLabel}</text>`;
      const inner = W / 2 - half - 14;
      if (inner >= 64) {
        const start = Math.max(40, inner - 28);
        out +=
          `<line x1="${start}" y1="${H - 52}" x2="${inner}" y2="${H - 52}" stroke="${GOLD}" stroke-width="0.8" opacity="0.45"/>` +
          `<line x1="${W - inner}" y1="${H - 52}" x2="${W - start}" y2="${H - 52}" stroke="${GOLD}" stroke-width="0.8" opacity="0.45"/>`;
      }
      return out;
    })()}
  `;
}

function svgWrap(inner, { accent = GOLD_BRIGHT, seed = 1 } = {}) {
  // The icon + nameplate live in one glow-filtered group: feGaussianBlur underlays a soft
  // bloom while feMerge keeps the source lines crisp on top. Frame/specks stay unfiltered.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(accent)}${frame(seed)}<g filter="url(#glow)">${inner}</g></svg>`;
}

// ---------- Major Arcana icon composers (id -> icon fragment, centered at 200,340) ----------

const CX = W / 2;
const CY = 340;

const MAJOR_ICONS = [
  // 0 The Fool — a burst of sunrise rays above a single rising dot, standing at an edge
  () => rayBurst(CX, CY, 30, 78, 12, { width: 1.3 }) + ring(CX, CY, 30, 1, 1.5) + dot(CX, CY + 95, 3) + line(CX - 70, CY + 95, CX + 70, CY + 95, 1.2, 0.6),
  // 1 The Magician — infinity above a vertical wand, four small suit glyphs around
  () =>
    pathD(`M ${CX - 26} ${CY - 70} C ${CX - 46} ${CY - 90}, ${CX - 6} ${CY - 90}, ${CX} ${CY - 70} C ${CX + 6} ${CY - 90}, ${CX + 46} ${CY - 90}, ${CX + 26} ${CY - 70} C ${CX + 46} ${CY - 50}, ${CX + 6} ${CY - 50}, ${CX} ${CY - 70} C ${CX - 6} ${CY - 50}, ${CX - 46} ${CY - 50}, ${CX - 26} ${CY - 70} Z`) +
    line(CX, CY - 30, CX, CY + 70, 2) +
    [-1, 1].map((s) => `<use href="#${suitSymbolId("cups")}" x="${CX + s * 55}" y="${CY - 10}" width="30" height="30"/>`).join("") +
    [-1, 1].map((s) => `<use href="#${suitSymbolId("swords")}" x="${CX + s * 55}" y="${CY + 40}" width="30" height="30"/>`).join(""),
  // 2 The High Priestess — crescent between two pillars
  () => pillar(CX - 60, CY - 70, 140) + pillar(CX + 60, CY - 70, 140) + crescent(CX, CY, 34) + ring(CX, CY, 50, 0.5, 1),
  // 3 The Empress — venus symbol inside a dotted wreath
  () => wreath(CX, CY, 88, 26) + ring(CX, CY - 12, 26, 1, 1.6) + line(CX, CY + 14, CX, CY + 46, 1.6) + line(CX - 16, CY + 30, CX + 16, CY + 30, 1.6),
  // 4 The Emperor — ram horns above a throne block
  () =>
    pathD(`M ${CX - 8} ${CY - 60} C ${CX - 50} ${CY - 60}, ${CX - 50} ${CY - 10}, ${CX - 14} ${CY - 20}`) +
    pathD(`M ${CX + 8} ${CY - 60} C ${CX + 50} ${CY - 60}, ${CX + 50} ${CY - 10}, ${CX + 14} ${CY - 20}`) +
    `<rect x="${CX - 34}" y="${CY + 10}" width="68" height="60" fill="none" stroke="${GOLD}" stroke-width="1.6"/>` +
    line(CX - 34, CY + 30, CX + 34, CY + 30, 1),
  // 5 The Hierophant — two pillars, crossbar, crossed keys above
  () =>
    pillar(CX - 55, CY - 40, 110) +
    pillar(CX + 55, CY - 40, 110) +
    line(CX - 55, CY - 60, CX + 55, CY - 60, 1.4) +
    line(CX - 22, CY - 95, CX + 22, CY - 65, 1.6) +
    line(CX + 22, CY - 95, CX - 22, CY - 65, 1.6),
  // 6 The Lovers — two overlapping circles beneath radiating rays
  () => rayBurst(CX, CY - 90, 8, 34, 10, { width: 1.2 }) + ring(CX - 24, CY + 20, 46, 1, 1.5) + ring(CX + 24, CY + 20, 46, 1, 1.5),
  // 7 The Chariot — a squared body over two wheels, star above
  () =>
    star(CX, CY - 90, 6, 16, 7) +
    `<rect x="${CX - 46}" y="${CY - 40}" width="92" height="60" fill="none" stroke="${GOLD}" stroke-width="1.6"/>` +
    ring(CX - 32, CY + 46, 22, 1, 1.5) +
    ring(CX + 32, CY + 46, 22, 1, 1.5) +
    star(CX - 32, CY + 46, 6, 20, 0, { width: 0.8, opacity: 0.5 }) +
    star(CX + 32, CY + 46, 6, 20, 0, { width: 0.8, opacity: 0.5 }),
  // 8 Strength — infinity above a long calm wave (steady power, not force)
  () =>
    pathD(`M ${CX - 26} ${CY - 90} C ${CX - 46} ${CY - 110}, ${CX - 6} ${CY - 110}, ${CX} ${CY - 90} C ${CX + 6} ${CY - 110}, ${CX + 46} ${CY - 110}, ${CX + 26} ${CY - 90} C ${CX + 46} ${CY - 70}, ${CX + 6} ${CY - 70}, ${CX} ${CY - 90} C ${CX - 6} ${CY - 70}, ${CX - 46} ${CY - 70}, ${CX - 26} ${CY - 90} Z`) +
    wave(CX - 90, CY + 20, 180, 26, 3) +
    ring(CX, CY + 20, 100, 0.35, 1),
  // 9 The Hermit — a star inside a lantern atop a staff
  () => line(CX, CY - 20, CX, CY + 100, 1.8) + ring(CX, CY - 55, 34, 1, 1.5) + star(CX, CY - 55, 6, 16, 6),
  // 10 Wheel of Fortune — an eight-spoked wheel
  () => ring(CX, CY, 78, 1, 1.8) + ring(CX, CY, 46, 0.7, 1.2) + rayBurst(CX, CY, 46, 78, 8, { width: 1.4 }) + dot(CX, CY, 4),
  // 11 Justice — scales on a stand
  () =>
    line(CX, CY - 90, CX, CY + 40, 1.8) +
    line(CX - 66, CY - 60, CX + 66, CY - 60, 1.6) +
    line(CX - 66, CY - 60, CX - 66, CY - 20, 1) +
    line(CX + 66, CY - 60, CX + 66, CY - 20, 1) +
    `<circle cx="${CX - 66}" cy="${CY - 8}" r="16" fill="none" stroke="${GOLD}" stroke-width="1.4"/>` +
    `<circle cx="${CX + 66}" cy="${CY - 8}" r="16" fill="none" stroke="${GOLD}" stroke-width="1.4"/>` +
    line(CX - 40, CY + 40, CX + 40, CY + 40, 1.6),
  // 12 The Hanged Man — inverted triangle hung from a bar, calm halo
  () =>
    line(CX - 60, CY - 70, CX + 60, CY - 70, 1.6) +
    line(CX, CY - 70, CX, CY - 30, 1.4) +
    poly(
      [
        [CX - 42, CY - 30],
        [CX + 42, CY - 30],
        [CX, CY + 60],
      ],
      { width: 1.6 },
    ) +
    ring(CX, CY - 10, 20, 0.7, 1.2),
  // 13 Death — a rising form breaking free of a horizon line (transformation, not an end)
  () =>
    line(CX - 90, CY + 40, CX + 90, CY + 40, 1.4, 0.7) +
    poly(
      [
        [CX, CY - 90],
        [CX - 36, CY + 30],
        [CX + 36, CY + 30],
      ],
      { width: 1.6 },
    ) +
    rayBurst(CX, CY - 90, 4, 30, 9, { width: 1.1, opacity: 0.8 }),
  // 14 Temperance — two vessels connected by a flowing arc, wings resting
  () =>
    ring(CX - 46, CY, 30, 1, 1.5) +
    ring(CX + 46, CY, 30, 1, 1.5) +
    pathD(`M ${CX - 46} ${CY - 30} Q ${CX} ${CY - 70}, ${CX + 46} ${CY - 30}`) +
    pathD(`M ${CX - 90} ${CY + 10} Q ${CX - 60} ${CY - 20}, ${CX - 20} ${CY + 4}`) +
    pathD(`M ${CX + 90} ${CY + 10} Q ${CX + 60} ${CY - 20}, ${CX + 20} ${CY + 4}`),
  // 15 The Devil — a linked chain beneath an inverted triangle (patterns that can be released)
  () =>
    poly(
      [
        [CX, CY - 20],
        [CX - 40, CY + 50],
        [CX + 40, CY + 50],
      ],
      { width: 1.6 },
    ) +
    chain(CX, CY + 90, 3, 10) +
    ring(CX, CY - 70, 22, 0.8, 1.3),
  // 16 The Tower — a cracked tower with light breaking through at the top
  () =>
    `<rect x="${CX - 30}" y="${CY - 90}" width="60" height="160" fill="none" stroke="${GOLD}" stroke-width="1.6"/>` +
    lightningBolt(CX, CY - 20, 130, { opacity: 0.9 }) +
    rayBurst(CX, CY - 92, 6, 40, 9, { width: 1.1, opacity: 0.75 }),
  // 17 The Star — one large star over rippling water
  () => star(CX, CY - 40, 8, 60, 26, { width: 1.6 }) + wave(CX - 100, CY + 70, 200, 16, 4, { opacity: 0.7 }) + [...Array(6)].map((_, i) => star(CX - 110 + i * 44, CY - 110 + (i % 2) * 20, 6, 8, 3, { width: 1, opacity: 0.6 })).join(""),
  // 18 The Moon — crescent over a quiet path between two distant rises
  () =>
    crescent(CX, CY - 70, 34) +
    pathD(`M ${CX - 100} ${CY + 90} Q ${CX} ${CY}, ${CX + 100} ${CY + 90}`, { opacity: 0.8 }) +
    poly(
      [
        [CX - 90, CY + 90],
        [CX - 55, CY + 30],
        [CX - 20, CY + 90],
      ],
      { width: 1, opacity: 0.5 },
    ) +
    poly(
      [
        [CX + 20, CY + 90],
        [CX + 55, CY + 30],
        [CX + 90, CY + 90],
      ],
      { width: 1, opacity: 0.5 },
    ),
  // 19 The Sun — a full radiant sunburst
  () => ring(CX, CY, 46, 1, 1.8) + rayBurst(CX, CY, 50, 96, 16, { width: 1.4 }) + ring(CX, CY, 30, 0.6, 1),
  // 20 Judgement — a rising flare with a figure abstracted as a simple rounded form
  () =>
    rayBurst(CX, CY - 40, 20, 70, 11, { width: 1.2 }) +
    `<rect x="${CX - 16}" y="${CY + 30}" width="32" height="60" rx="16" fill="none" stroke="${GOLD}" stroke-width="1.6"/>` +
    ring(CX, CY + 20, 12, 1, 1.3),
  // 21 The World — a wreath encircling a four-point star (the four elements, complete)
  () => wreath(CX, CY, 92, 30) + star(CX, CY, 4, 46, 16, { width: 1.6 }),
];

const ROMAN = [
  "0",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
];

// ---------- Minor Arcana pip layouts (fractions within a usable box) ----------

const PIP_BOX = { x0: 90, y0: 140, x1: 310, y1: 500 };
function pipLayout(n) {
  const fx = (f) => PIP_BOX.x0 + f * (PIP_BOX.x1 - PIP_BOX.x0);
  const fy = (f) => PIP_BOX.y0 + f * (PIP_BOX.y1 - PIP_BOX.y0);
  const layouts = {
    1: [[0.5, 0.5]],
    2: [
      [0.5, 0.12],
      [0.5, 0.88],
    ],
    3: [
      [0.5, 0.1],
      [0.5, 0.5],
      [0.5, 0.9],
    ],
    4: [
      [0.22, 0.15],
      [0.78, 0.15],
      [0.22, 0.85],
      [0.78, 0.85],
    ],
    5: [
      [0.22, 0.15],
      [0.78, 0.15],
      [0.5, 0.5],
      [0.22, 0.85],
      [0.78, 0.85],
    ],
    6: [
      [0.22, 0.15],
      [0.78, 0.15],
      [0.22, 0.5],
      [0.78, 0.5],
      [0.22, 0.85],
      [0.78, 0.85],
    ],
    7: [
      [0.22, 0.1],
      [0.78, 0.1],
      [0.5, 0.32],
      [0.22, 0.54],
      [0.78, 0.54],
      [0.22, 0.85],
      [0.78, 0.85],
    ],
    8: [
      [0.22, 0.08],
      [0.78, 0.08],
      [0.22, 0.36],
      [0.78, 0.36],
      [0.22, 0.63],
      [0.78, 0.63],
      [0.22, 0.9],
      [0.78, 0.9],
    ],
    9: [
      [0.2, 0.12],
      [0.5, 0.12],
      [0.8, 0.12],
      [0.2, 0.5],
      [0.5, 0.5],
      [0.8, 0.5],
      [0.2, 0.88],
      [0.5, 0.88],
      [0.8, 0.88],
    ],
    10: [
      [0.25, 0.06],
      [0.75, 0.06],
      [0.25, 0.27],
      [0.75, 0.27],
      [0.25, 0.48],
      [0.75, 0.48],
      [0.25, 0.69],
      [0.75, 0.69],
      [0.25, 0.9],
      [0.75, 0.9],
    ],
  };
  return layouts[n].map(([fx1, fy1]) => [fx(fx1), fy(fy1)]);
}

const RANK_NAMES = {
  1: "Ace",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Page",
  12: "Knight",
  13: "Queen",
  14: "King",
};

function pipCard(suit, n) {
  const size = n <= 4 ? 46 : n <= 7 ? 40 : 34;
  return pipLayout(n)
    .map(([x, y]) => `<use href="#${suitSymbolId(suit)}" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}"/>`)
    .join("");
}

function courtCard(suit, rank) {
  // rank: 11 Page, 12 Knight, 13 Queen, 14 King
  const headY = CY - 90;
  let crown = "";
  if (rank === 11) crown = poly([[CX - 8, headY - 34], [CX + 8, headY - 34], [CX, headY - 50]], { width: 1.4 });
  if (rank === 12) crown = poly([[CX - 14, headY - 30], [CX + 14, headY - 30], [CX, headY - 56]], { width: 1.4 });
  if (rank === 13) crown = crownPoints(CX, headY - 40, 5, 20, 10, { width: 1.4 });
  if (rank === 14) crown = crownPoints(CX, headY - 40, 6, 24, 10, { width: 1.4 });
  return (
    crown +
    ring(CX, headY, 26, 1, 1.6) +
    poly(
      [
        [CX - 60, CY + 110],
        [CX + 60, CY + 110],
        [CX + 40, headY + 18],
        [CX - 40, headY + 18],
      ],
      { width: 1.6 },
    ) +
    `<use href="#${suitSymbolId(suit)}" x="${CX - 65}" y="${CY + 20}" width="40" height="40"/>`
  );
}

// ---------- assemble & write files ----------

const files = [];

// card back
{
  const inner = `
    ${ring(CX, CY, 150, 0.8, 1.6)}
    ${ring(CX, CY, 120, 0.5, 1)}
    ${rayBurst(CX, CY, 60, 150, 12, { width: 1, opacity: 0.5 })}
    ${star(CX, CY, 8, 60, 26, { width: 1.8 })}
    <text x="${CX}" y="${CY + 8}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="${GOLD_LUMEN}">W</text>
    <text x="${CX}" y="${H - 46}" text-anchor="middle" font-family="Georgia, serif" font-size="14" letter-spacing="5" fill="${GOLD}" opacity="0.8">WYNDRALORE</text>
  `;
  const svg = svgWrap(inner, { seed: 999 });
  writeFileSync(join(OUT_DIR, "back.svg"), svg, "utf8");
  files.push("back.svg");
}

const MAJOR_NAMES = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

for (let id = 0; id < 22; id++) {
  const name = MAJOR_NAMES[id];
  const icon = MAJOR_ICONS[id]();
  const inner = icon + nameplate(ROMAN[id], name.toUpperCase());
  const svg = svgWrap(inner, { seed: id + 1 });
  const fname = `major-${String(id).padStart(2, "0")}-${slugify(name.replace(/^The /, ""))}.svg`;
  writeFileSync(join(OUT_DIR, fname), svg, "utf8");
  files.push(fname);
}

const SUITS = ["wands", "cups", "swords", "pentacles"];
for (const [suitIdx, suit] of SUITS.entries()) {
  for (let rank = 1; rank <= 14; rank++) {
    const rankName = RANK_NAMES[rank];
    const name = `${rankName} of ${suit[0].toUpperCase()}${suit.slice(1)}`;
    const icon = rank <= 10 ? pipCard(suit, rank) : courtCard(suit, rank);
    const inner = icon + nameplate(rank <= 10 ? String(rank).padStart(2, "0") : rankName.toUpperCase(), name.toUpperCase());
    const svg = svgWrap(inner, { accent: SUIT_ACCENTS[suit], seed: 100 + suitIdx * 14 + rank });
    const fname = `minor-${suit}-${slugify(rankName)}.svg`;
    writeFileSync(join(OUT_DIR, fname), svg, "utf8");
    files.push(fname);
  }
}

console.log(`Generated ${files.length} SVG files in ${OUT_DIR}`);
