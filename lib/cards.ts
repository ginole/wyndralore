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

/** The stable English slug for a card. Works for both English and localized cards (keyed by id). */
export function getCardSlug(card: TarotCard): string {
  return SLUG_BY_ID.get(card.id) ?? slugify(card.name);
}

export function getCardBySlug(slug: string, locale: Locale = "en"): TarotCard | undefined {
  const card = CARDS.find((c) => getCardSlug(c) === slug);
  return card ? localize(card, locale) : undefined;
}

/** Strips the long-form text fields — this is the only shape safe to hand to client components. */
export function getDeckManifest(locale: Locale = "en"): DeckCard[] {
  return getAllCards(locale).map(({ id, name, image, arcana, suit }) => ({ id, name, image, arcana, suit }));
}
