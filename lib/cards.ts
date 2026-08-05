import cardsData from "@/data/cards.json";
import zhTWData from "@/data/cards.zh-TW.json";
import { TarotCard, DeckCard } from "./types";
import type { Locale } from "./i18n";

const CARDS = cardsData as TarotCard[];

// 繁體 (Taiwan) translations, keyed by card id. Every field is optional — anything missing falls
// back to the English base, so the site never breaks while translation is still in progress. Only
// the text fields are translated; id/arcana/suit/number/image come from the English base.
type CardOverride = Partial<Omit<TarotCard, "id" | "arcana" | "suit" | "number" | "image">> & { id: number };
const ZH_TW_BY_ID = new Map((zhTWData as CardOverride[]).map((c) => [c.id, c]));

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Slugs are always derived from the ENGLISH name and keyed by id, so /cards/the-fool and
// /tw/cards/the-fool are the same slug — which is what lets the two language versions pair up for
// hreflang. Never derive a slug from a localized (繁體) card name.
const SLUG_BY_ID = new Map(CARDS.map((c) => [c.id, slugify(c.name)]));

function localize(card: TarotCard, locale: Locale): TarotCard {
  if (locale === "en") return card;
  const override = ZH_TW_BY_ID.get(card.id);
  if (!override) return card;
  return { ...card, ...override };
}

export function getAllCards(locale: Locale = "en"): TarotCard[] {
  return locale === "en" ? CARDS : CARDS.map((c) => localize(c, locale));
}

export function getCardById(id: number, locale: Locale = "en"): TarotCard | undefined {
  const card = CARDS.find((c) => c.id === id);
  return card ? localize(card, locale) : undefined;
}

/**
 * Look up a card by its ENGLISH name. Used server-side for deck matching (AI readings, journal),
 * where card identity is always the English name — do NOT localize the lookup key.
 */
export function getCardByName(name: string): TarotCard | undefined {
  return CARDS.find((c) => c.name === name);
}

/** Every localized name → its English base card. Built once; ids are unique per card. */
const CARD_BY_LOCALIZED_NAME = new Map<string, TarotCard>(
  CARDS.flatMap((c) => {
    const localized = ZH_TW_BY_ID.get(c.id)?.name;
    return localized && localized !== c.name ? ([[localized, c]] as [string, TarotCard][]) : [];
  }),
);

/**
 * Resolve a card by its name in ANY shipped locale.
 *
 * `getCardByName` above is English-only on purpose — English names are the stored identity for
 * journal entries and deck matching, and that invariant should stay. But the 繁體 reading page
 * hands ReadingExperience the zh-TW deck manifest, so the browser posts 繁體 card names to the AI
 * endpoints, and validating those with the English-only lookup rejected every one of them: the
 * free summary AND both paid endpoints (deep, follow-up) returned 400 for every 繁體 draw, and
 * failed silently because the client swallows non-OK responses. Proven against the running API:
 * "The Star" → 200, 「星星」 → 400.
 *
 * Use this ONLY where a name arrives from a localized client. Anything that persists or matches
 * on card identity should keep using `getCardByName`.
 */
export function resolveCardByAnyLocaleName(name: string): TarotCard | undefined {
  return getCardByName(name) ?? CARD_BY_LOCALIZED_NAME.get(name);
}

/** The stable English slug for a card. Works for both English and localized cards (keyed by id). */
export function getCardSlug(card: TarotCard): string {
  return SLUG_BY_ID.get(card.id) ?? slugify(card.name);
}

export function getCardBySlug(slug: string, locale: Locale = "en"): TarotCard | undefined {
  const card = CARDS.find((c) => getCardSlug(c) === slug);
  return card ? localize(card, locale) : undefined;
}

/**
 * Sibling cards to link to from a card page — the previous and next card in deck order plus a few
 * more from the same suit / arcana.
 *
 * This exists for SEO, not decoration. Before 2026-07-26 every card page linked only to /cards and
 * the draw page, so all 78 detail pages sat at the same crawl depth with no path between them —
 * one of the classic shapes behind Search Console's "Discovered – currently not indexed". Giving
 * each page ~6 links to its neighbours turns the library into a connected graph instead of a
 * flat list hanging off one hub.
 *
 * Deterministic (no randomness) so the generated HTML is stable between builds.
 */
export function getRelatedCards(card: TarotCard, locale: Locale = "en", count = 6): TarotCard[] {
  const family = CARDS.filter((c) =>
    card.arcana === "major" ? c.arcana === "major" : c.suit === card.suit,
  );
  const idx = family.findIndex((c) => c.id === card.id);
  const picks: TarotCard[] = [];
  // Walk outwards from the card's position: …, -2, -1, +1, +2, … wrapping inside the family.
  for (let step = 1; picks.length < count && step <= family.length; step += 1) {
    for (const offset of [step, -step]) {
      if (picks.length >= count) break;
      const next = family[(idx + offset + family.length * 2) % family.length];
      if (next && next.id !== card.id && !picks.some((p) => p.id === next.id)) picks.push(next);
    }
  }
  return picks.map((c) => (locale === "en" ? c : localize(c, locale)));
}

/** Strips the long-form text fields — this is the only shape safe to hand to client components. */
export function getDeckManifest(locale: Locale = "en"): DeckCard[] {
  return getAllCards(locale).map(({ id, name, image, arcana, suit }) => ({ id, name, image, arcana, suit }));
}
