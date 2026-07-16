import Anthropic from "@anthropic-ai/sdk";
import { getCardByName } from "./cards";
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
the room. You bring none of that — you are a clear, objective mirror, reflecting only the symbolic logic of the tarot cards drawn
below (centuries of esoteric tradition, not modern pop psychology) back at the querent's own question. Lead with that objectivity;
it is the credibility of this feature, not a disclaimer to soften.

Wyndralore's whole identity is "a ritual, not a gimmick" — the querent already shuffled and chose these cards by hand before you
ever saw them. Honor that: write like a grounded, precise, quietly confident reader speaking in person, never like a chatbot or a
horoscope-app novelty. No meta-commentary about being an AI, no disclaimers that tarot isn't real, no generic affirmations that
could apply to any reading — every sentence must be earned by the specific cards and orientations given.

Be economical. Never pad toward a length target with filler, throat-clearing, or restated setup — say only what the cards and the
question actually support, then stop.`;

// Only the meanings for the cards actually drawn go in the prompt — not the full 78-card
// library. Sending all 78 cards every time (the original design) made every call slow to
// process and expensive; a reading only ever needs 1-10 cards' worth of meaning text, so this
// cuts input size by roughly an order of magnitude. That's also why there's no prompt caching
// here anymore: the content is small and varies per request (different cards each time), so
// caching had nothing stable to reuse — it was adding write-cost overhead for no benefit.
function buildDrawnCardsBlock({ cards, theme }: ReadingPromptArgs): string {
  const lines = cards.map((c) => {
    const card = getCardByName(c.name);
    if (!card) return `### ${c.position}: ${c.name} (${c.orientation})\n(meaning unavailable)`;
    const meaning = c.orientation === "upright" ? card.meaning_upright : card.meaning_reversed;
    const themeMeaning =
      theme === "love"
        ? c.orientation === "upright" ? card.love_upright : card.love_reversed
        : theme === "career"
          ? c.orientation === "upright" ? card.career_upright : card.career_reversed
          : theme === "wellness"
            ? c.orientation === "upright" ? card.wellness_upright : card.wellness_reversed
            : null;
    const keywords = c.orientation === "upright" ? card.keywords_upright : card.keywords_reversed;
    return [
      `### ${c.position}: ${card.name} (${c.orientation})`,
      `Keywords: ${keywords.join(", ")}`,
      `Meaning: ${meaning}`,
      themeMeaning ? `${theme} focus: ${themeMeaning}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return lines.join("\n\n");
}

function systemBlocks(): Anthropic.Messages.TextBlockParam[] {
  return [{ type: "text", text: PERSONA }];
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

function drawSummary(args: ReadingPromptArgs): string {
  const { theme, question } = args;
  const questionLine = question?.trim() ? `The querent's question: "${question.trim()}"` : "The querent gave no specific question — read generally.";
  return `Theme focus: ${theme}\n${questionLine}\n\nCards drawn:\n${buildDrawnCardsBlock(args)}`;
}

async function* streamText(systemMessage: Anthropic.Messages.TextBlockParam[], userMessage: string, maxTokens: number): AsyncGenerator<string> {
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    // claude-sonnet-5 runs adaptive (extended) thinking by default when this is omitted —
    // billed as extra output tokens we never see. A tarot summary/reading doesn't need
    // multi-step reasoning, so disable it explicitly; this was likely the main cost driver.
    thinking: { type: "disabled" },
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

/** Paid follow-up ($1.99): one more question asked against a deep reading the querent just
 * received. The previous reading rides along as context so the answer stays consistent with
 * what the cards already said, rather than re-reading them from scratch. */
export function streamFollowupAnswer(
  args: ReadingPromptArgs,
  previousReading: string,
  followupQuestion: string
): AsyncGenerator<string> {
  const prompt = `${drawSummary(args)}\n\nYou already gave the querent this reading:\n"""\n${previousReading}\n"""\n\nThe querent now asks a follow-up question: "${followupQuestion}"\n\nAnswer it in about 700 characters, staying consistent with the reading above — deepen or clarify it through the same drawn cards, don't contradict it or introduce new cards. Flowing prose, no headers.`;
  return streamText(systemBlocks(), prompt, 500);
}

/** Paid tier: a ~1500-character narrative reading tied to the querent's question. */
export function streamDeepReading(args: ReadingPromptArgs): AsyncGenerator<string> {
  const prompt = `${drawSummary(
    args
  )}\n\nWrite a deep narrative reading of about 1500 characters. Trace the subconscious "energy flow" between the drawn cards — how they build on or tension against each other — and close with concrete, actionable advice tied directly to the querent's question. Write in flowing prose, no headers or bullet lists.`;
  return streamText(systemBlocks(), prompt, 900);
}

const STYLE_TONE_DESCRIPTIONS: Record<string, string> = {
  gentle: "gentle and healing — soft, validating language, focused on comfort and self-compassion",
  direct: "direct and sharp — plain-spoken, no hedging, names the hard truth of a card without softening it",
  playful: "playful and witty — warm humor, light touch, never mocking the querent's situation",
  poetic: "mystic and poetic — imagery-rich, unhurried, leans into the symbolic/ritual register",
};

export interface MasterStyleProfile {
  displayName: string;
  styleTone: string;
  focusAreas: string[];
  voiceSamples: string[];
  avoidTopics: string | null;
}

/**
 * "Meet Our Masters" storefront's $9.90 product — an AI reading styled after a specific
 * creator's own established voice, built from her onboarding profile (lib/masters.ts).
 *
 * Deliberately styles her TONE and vocabulary rather than impersonating her identity: the prompt
 * never instructs the model to claim "I am [name]" in first person. The product page/emails are
 * already explicit that this is an AI interpretation in her style (see lib/lemonsqueezy.ts's
 * MASTER_VARIANT_ENV comment on buyer-facing honesty) — having the generated text itself claim to
 * literally BE her, unreviewed, would quietly contradict that same disclosure.
 */
export async function generateMasterStyleReading(master: MasterStyleProfile, args: ReadingPromptArgs): Promise<string> {
  const toneDesc = STYLE_TONE_DESCRIPTIONS[master.styleTone] ?? STYLE_TONE_DESCRIPTIONS.gentle;
  const persona = `You are writing an AI-generated tarot reading styled after ${master.displayName}'s own established reading voice, for Wyndralore's "Meet Our Masters" storefront.

Her reading style is ${toneDesc}.
${master.focusAreas.length ? `Her usual focus areas: ${master.focusAreas.join(", ")}.` : ""}
${
  master.voiceSamples.length
    ? `Match her actual phrasing as closely as the reading allows — here are real lines of hers:\n${master.voiceSamples.map((s) => `- "${s}"`).join("\n")}`
    : ""
}
${master.avoidTopics ? `Do not address these topics even if the question touches them: ${master.avoidTopics}.` : ""}

Write in her voice and tone — but this is an AI interpretation styled after her, not literally her. Never write "I am ${master.displayName}" or claim personal authorship in the first person as her; write as a reading delivered in her style, not as an impersonation of her identity.

Be economical. Never pad toward a length target with filler — say only what the cards and the question actually support, then stop.`;

  const prompt = `${drawSummary(args)}\n\nWrite a narrative reading of about 900 characters. Trace how the drawn cards speak to each other and close with concrete advice tied to the querent's question. Flowing prose, no headers or bullet lists.`;

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 700,
    thinking: { type: "disabled" },
    system: [{ type: "text", text: persona }],
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}
