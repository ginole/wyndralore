import cardsData from "@/data/cards.json";
import { TarotCard, DeckCard } from "./types";

const CARDS = cardsData as TarotCard[];

export function getAllCards(): TarotCard[] {
  return CARDS;
}

export function getCardById(id: number): TarotCard | undefined {
  return CARDS.find((c) => c.id === id);
}

export function getCardByName(name: string): TarotCard | undefined {
  return CARDS.find((c) => c.name === name);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getCardSlug(card: TarotCard): string {
  return slugify(card.name);
}

export function getCardBySlug(slug: string): TarotCard | undefined {
  return CARDS.find((c) => getCardSlug(c) === slug);
}

/** Strips the long-form text fields — this is the only shape safe to hand to client components. */
export function getDeckManifest(): DeckCard[] {
  return CARDS.map(({ id, name, image, arcana, suit }) => ({ id, name, image, arcana, suit }));
}
