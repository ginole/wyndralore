export type Suit = "wands" | "cups" | "swords" | "pentacles";
export type Arcana = "major" | "minor";
export type Theme = "general" | "love" | "career" | "wellness";
export type Orientation = "upright" | "reversed";

export interface TarotCard {
  id: number;
  name: string;
  arcana: Arcana;
  suit: Suit | null;
  number: number;
  keywords_upright: string[];
  keywords_reversed: string[];
  meaning_upright: string;
  meaning_reversed: string;
  love_upright: string;
  love_reversed: string;
  career_upright: string;
  career_reversed: string;
  wellness_upright: string;
  wellness_reversed: string;
  affirmation: string;
  image: string;
}

/** Lightweight projection of a card, safe to ship to the client for shuffle/select UI. */
export interface DeckCard {
  id: number;
  name: string;
  image: string;
  arcana: Arcana;
  suit: Suit | null;
}

export interface SpreadConfig {
  slug: string;
  title: string;
  subtitle: string;
  count: number;
  free: boolean;
  positions: string[];
}

export interface DrawnCard {
  position: string;
  card: TarotCard;
  orientation: Orientation;
}

/** Fixed 3-position spread for the Masters storefront's AI-style product — same "Past / Present /
 * Future" vocabulary as the site's own free three-card spread. Shared between the client draw
 * ritual (components/MasterDrawRitual) and the server-side validation of what it submits
 * (lib/masters.ts's recordAiStyleDraw), so the two can never drift out of sync. */
export const AI_STYLE_POSITIONS = ["Past", "Present", "Future"] as const;
