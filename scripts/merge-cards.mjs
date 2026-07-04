// Merges the 5 partial card-content files into one validated data/cards.json,
// filling the "image" field to match the files generate-card-art.mjs produced.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data", "cards");
const OUT_FILE = join(__dirname, "..", "data", "cards.json");

const REQUIRED_FIELDS = [
  "id",
  "name",
  "arcana",
  "suit",
  "number",
  "keywords_upright",
  "keywords_reversed",
  "meaning_upright",
  "meaning_reversed",
  "love_upright",
  "love_reversed",
  "career_upright",
  "career_reversed",
  "wellness_upright",
  "wellness_reversed",
  "affirmation",
  "image",
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function imagePathFor(card) {
  if (card.arcana === "major") {
    return `/cards/major-${String(card.id).padStart(2, "0")}-${slugify(card.name.replace(/^The /, ""))}.svg`;
  }
  const rankName = card.name.split(" of ")[0];
  return `/cards/minor-${card.suit}-${slugify(rankName)}.svg`;
}

const files = ["major.json", "wands.json", "cups.json", "swords.json", "pentacles.json"];
let all = [];
for (const f of files) {
  const p = join(DATA_DIR, f);
  if (!existsSync(p)) throw new Error(`Missing ${p}`);
  const raw = readFileSync(p, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${f}: ${e.message}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${f} is not an array`);
  all.push(...parsed);
}

// validate
const seenIds = new Set();
const errors = [];
for (const card of all) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in card)) errors.push(`Card id=${card.id ?? "?"} (${card.name ?? "?"}) missing field "${field}"`);
  }
  if (seenIds.has(card.id)) errors.push(`Duplicate id ${card.id}`);
  seenIds.add(card.id);
  card.image = imagePathFor(card);
  const svgPath = join(__dirname, "..", "public", card.image);
  if (!existsSync(svgPath)) errors.push(`Missing generated image for id=${card.id}: ${card.image}`);
}
if (all.length !== 78) errors.push(`Expected 78 cards, got ${all.length}`);
for (let i = 0; i < 78; i++) {
  if (!seenIds.has(i)) errors.push(`Missing card id ${i}`);
}

if (errors.length) {
  console.error("VALIDATION ERRORS:");
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
}

all.sort((a, b) => a.id - b.id);
writeFileSync(OUT_FILE, JSON.stringify(all, null, 2), "utf8");
console.log(`Merged ${all.length} cards -> ${OUT_FILE}`);
