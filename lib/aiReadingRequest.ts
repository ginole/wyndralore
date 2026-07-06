import { Theme } from "./types";
import { ReadingCardInput } from "./claude";

const THEMES: Theme[] = ["general", "love", "career", "wellness"];

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
    if (typeof position !== "string" || typeof name !== "string") return null;
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
