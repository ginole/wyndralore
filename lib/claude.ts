import Anthropic from "@anthropic-ai/sdk";
import { getAllCards } from "./cards";
import { Theme, Orientation } from "./types";

// The AI-reading PRD named "Claude 3.5 Sonnet" (its cost/quality target was tuned against it),
// but that model is retired — claude-sonnet-5 is the current-generation equivalent. Re-check
// the ≤$0.05/call cost target if this is bumped again later.
const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export function isAiReadingConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const PERSONA = `You are the voice behind Wyndralore's "AI-Powered Personal Insight Engine" (智能觉察引擎) — a tarot reading interpreter.

Your single defining trait, and the reason this reading is worth more than a human reader's guess: you carry zero personal bias
and pass zero moral judgment. A human reader brings their own mood, projections, and opinions about the querent's situation into
the room. You bring none of that — you are a clear, objective mirror, reflecting only the symbolic logic of the 78-card tarot
library below (centuries of esoteric tradition, not modern pop psychology) back at the querent's own question. Lead with that
objectivity; it is the credibility of this feature, not a disclaimer to soften.

Wyndralore's whole identity is "a ritual, not a gimmick" — the querent already shuffled and chose these cards by hand before you
ever saw them. Honor that: write like a grounded, precise, quietly confident reader speaking in person, never like a chatbot or a
horoscope-app novelty. No meta-commentary about being an AI, no disclaimers that tarot isn't real, no generic affirmations that
could apply to any reading — every sentence must be earned by the specific cards and orientations given.

Be economical. Never pad toward a length target with filler, throat-clearing, or restated setup — say only what the cards and the
question actually support, then stop.`;

// Serialized once per server process and reused as a cached prompt prefix (PRD §1 — prompt
// caching keeps the 78-card library nearly free to include on every call after the first).
let cardLibraryBlock: string | null = null;

function buildCardLibraryBlock(): string {
  const lines = getAllCards().map((c) =>
    [
      `### ${c.name} (${c.arcana}${c.suit ? `, ${c.suit}` : ""})`,
      `Upright keywords: ${c.keywords_upright.join(", ")}`,
      `Reversed keywords: ${c.keywords_reversed.join(", ")}`,
      `Upright meaning: ${c.meaning_upright}`,
      `Reversed meaning: ${c.meaning_reversed}`,
      `Love — upright: ${c.love_upright} | reversed: ${c.love_reversed}`,
      `Career — upright: ${c.career_upright} | reversed: ${c.career_reversed}`,
      `Wellness — upright: ${c.wellness_upright} | reversed: ${c.wellness_reversed}`,
    ].join("\n")
  );
  return `Full 78-card tarot meaning library:\n\n${lines.join("\n\n")}`;
}

function getCardLibraryBlock(): string {
  if (!cardLibraryBlock) cardLibraryBlock = buildCardLibraryBlock();
  return cardLibraryBlock;
}

function systemBlocks(): Anthropic.Messages.TextBlockParam[] {
  return [
    { type: "text", text: PERSONA },
    // Only this block is marked cacheable — it's the large, fixed-across-calls part.
    // A brand-new low-traffic site can easily see >5min gaps between readings, which would
    // make every call pay the full cache-write price on this (large) card library block. A
    // 1-hour TTL costs more to write (2x vs 1.25x) but survives much bigger gaps between
    // readings, so it actually lowers average cost for sparse traffic instead of raising it.
    { type: "text", text: getCardLibraryBlock(), cache_control: { type: "ephemeral", ttl: "1h" } },
  ];
}

export interface ReadingCardInput {
  position: string;
  name: string;
  orientation: Orientation;
}

interface ReadingPromptArgs {
  cards: ReadingCardInput[];
  theme: Theme;
  question?: string;
}

function drawSummary({ cards, theme, question }: ReadingPromptArgs): string {
  const cardLines = cards.map((c) => `- ${c.position}: ${c.name} (${c.orientation})`).join("\n");
  const questionLine = question?.trim() ? `The querent's question: "${question.trim()}"` : "The querent gave no specific question — read generally.";
  return `Theme focus: ${theme}\n${questionLine}\n\nCards drawn:\n${cardLines}`;
}

async function* streamText(systemMessage: Anthropic.Messages.TextBlockParam[], userMessage: string, maxTokens: number): AsyncGenerator<string> {
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemMessage,
    messages: [{ role: "user", content: userMessage }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

/** Free tier: one ultra-short line (~30 chars, hard-capped) at the bottom of the report. */
export function streamFreeSummary(args: ReadingPromptArgs): AsyncGenerator<string> {
  const prompt = `${drawSummary(args)}\n\nWrite ONE line of at most 35 characters — a single distilled insight, no punctuation at the end, no preamble, no quotes around it. This must stand alone with no more context.`;
  // Small max_tokens keeps this call's cost near-zero regardless of the cached library size.
  return streamText(systemBlocks(), prompt, 20);
}

/** Paid tier: a ~1500-character narrative reading tied to the querent's question. */
export function streamDeepReading(args: ReadingPromptArgs): AsyncGenerator<string> {
  const prompt = `${drawSummary(
    args
  )}\n\nWrite a deep narrative reading of about 1500 characters. Trace the subconscious "energy flow" between the drawn cards — how they build on or tension against each other — and close with concrete, actionable advice tied directly to the querent's question. Write in flowing prose, no headers or bullet lists.`;
  return streamText(systemBlocks(), prompt, 900);
}
