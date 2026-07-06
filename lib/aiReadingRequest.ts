import { Theme } from "./types";
import { ReadingCardInput } from "./claude";
import { getCardByName } from "./cards";

const THEMES: Theme[] = ["general", "love", "career", "wellness"];
// Longest real spread position label is "Hopes & Fears" (Celtic Cross) — generous cap well
// above that, just to bound the string rather than pin it to spread data.
const MAX_POSITION_LENGTH = 40;

export interface ParsedReadingRequest {
  cards: ReadingCardInput[];
  theme: Theme;
  question?: string;
}

/** Validates the shared request shape for both the free-summary and deep-reading endpoints. */
export function parseReadingRequestBody(body: unknown): ParsedReadingRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { cards, theme, question } = body as Record<string, unknown>;

  if (!Array.isArray(cards) || cards.length === 0 || cards.length > 10) return null;
  const parsedCards: ReadingCardInput[] = [];
  for (const c of cards) {
    if (typeof c !== "object" || c === null) return null;
    const { position, name, orientation } = c as Record<string, unknown>;
    if (typeof position !== "string" || position.length === 0 || position.length > MAX_POSITION_LENGTH) return null;
    // name must be a real card from the deck — this also bounds its length implicitly and
    // closes off using this endpoint as an unauthenticated way to inject arbitrary long text
    // into a Claude prompt (name/position previously had no length cap at all).
    if (typeof name !== "string" || !getCardByName(name)) return null;
    if (orientation !== "upright" && orientation !== "reversed") return null;
    parsedCards.push({ position, name, orientation });
  }

  if (typeof theme !== "string" || !THEMES.includes(theme as Theme)) return null;

  return {
    cards: parsedCards,
    theme: theme as Theme,
    question: typeof question === "string" && question.trim() ? question.trim().slice(0, 300) : undefined,
  };
}
