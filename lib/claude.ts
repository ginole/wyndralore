import Anthropic from "@anthropic-ai/sdk";
import { resolveCardByAnyLocaleName } from "./cards";
import { Theme, Orientation } from "./types";
import type { Locale } from "./i18n";

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

// Output language used to be EMERGENT: no prompt mentioned it, and the model simply mirrored the
// question's language. That happened to be right, but nothing guaranteed it, and a paid reading in
// the wrong language is a refund. Hence the explicit rule.
//
// ⚠️ NAME NO LANGUAGES HERE. The first version of this rule read "a question in Chinese gets a
// Chinese reading, one in Spanish a Spanish reading". Measured against real API calls, that flipped
// ENGLISH questions — and questions with no text at all — into Chinese: naming a language, next to
// the 智能觉察引擎 already sitting in the line below, reads as a hint about which language to favour
// rather than as a neutral example. Baseline (no rule at all) got English right in both cases, so
// the well-meant examples were strictly worse than saying nothing. Keep this abstract, and re-run a
// real generation for each case if you touch the wording — this is not checkable by reading it.
// ⚠️ The no-question fallback is the ONLY part that varies, and only by which edition the draw
// came from. Every other word is byte-identical to the long-tuned wording above, and the English
// prompt is unchanged, so the behaviour measured for it cannot regress.
//
// Why it has to vary at all: this rule was written when the site was English-only, so "no question
// → English" was correct. Since /tc shipped, the commonest 繁體 flow — land on /tc and draw
// without typing anything — was getting an English reading on a fully 繁體 page.
function languageRule(locale: Locale): string {
  const noQuestion =
    locale === "zh-TW"
      ? // Must be this emphatic. A softer "write in Traditional Chinese as written in Taiwan"
        // produced SIMPLIFIED characters on production (风暴已过 星光照见…) — the persona above
        // carries the brand string 智能觉察引擎, which is itself simplified and sits in the model's
        // context as a hint about which script to favour. On a 繁體 site aimed at Taiwan, simplified
        // output is worse than English: it reads as mainland-made, which is the exact trust problem
        // this edition exists to avoid.
        // The three clauses after the first are UNCONDITIONAL for this edition, not tied to
        // "no question": a 繁體 reader who types a Chinese question gets Chinese via the
        // match-their-language line above, and the defects below were all observed in that prose.
        // Kept inside the zh-TW branch so the English prompt stays byte-identical.
        //
        // Observed in real paid output on 2026-08-13, each one making a $4.99–$9.90 reading look
        // machine-made on a page whose whole job is looking trustworthy:
        //   · an English word left mid-sentence — 「…換來真正能落地的connection。」
        //   · ASCII commas mixed with full-width ones — 「風暴之後,有安穩的光」
        //   · a stray simplified 无 where 無 belongs
        "If they gave no question at all, write in Traditional Chinese characters (繁體中文) as used in Taiwan. Whenever you write in Chinese, all of the following are absolute: use Traditional characters only and never simplified ones; use full-width Chinese punctuation throughout (，。、；：？！「」) and never ASCII commas, periods or quotation marks; and never leave an English word or abbreviation sitting in the Chinese prose — render every term in Chinese instead."
      : "If they gave no question at all, write in English.";
  return `Write the reading in whatever language the querent wrote their question in, matching them without comment.
${noQuestion} Card names, position labels and their meanings are always supplied to you in
English; when you are writing in another language, render them naturally in that language rather than leaving them in English.`;
}

// The brand string is the ROOT of the simplified leak, not just a bystander: 智能觉察引擎 is itself
// simplified, and it sits in the model's context as a standing hint about which script to favour —
// which is why an earlier, softer language rule produced 风暴已过 星光照见 on production. Rendering it
// in Traditional for the 繁體 edition removes the contamination at source instead of fighting it with
// more instructions downstream. The string is internal to this prompt (grep: it appears nowhere in
// the UI), so the two spellings cost nothing. English keeps the original bytes exactly.
const personaBrand = (locale: Locale) => (locale === "zh-TW" ? "智能覺察引擎" : "智能觉察引擎");

const buildPersona = (locale: Locale) => `You are the voice behind Wyndralore's "AI-Powered Personal Insight Engine" (${personaBrand(locale)}) — a tarot reading interpreter.

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
question actually support, then stop.

${languageRule(locale)}`;

// Only the meanings for the cards actually drawn go in the prompt — not the full 78-card
// library. Sending all 78 cards every time (the original design) made every call slow to
// process and expensive; a reading only ever needs 1-10 cards' worth of meaning text, so this
// cuts input size by roughly an order of magnitude. That's also why there's no prompt caching
// here anymore: the content is small and varies per request (different cards each time), so
// caching had nothing stable to reuse — it was adding write-cost overhead for no benefit.
function buildDrawnCardsBlock({ cards, theme }: ReadingPromptArgs): string {
  const lines = cards.map((c) => {
    // Resolve in any locale. This looked up English names only, so every 繁體 draw fell into the
    // "(meaning unavailable)" branch below: the model received a bare card name with no meaning,
    // no keywords and no theme focus, and quietly improvised from general knowledge — including
    // for PAID deep readings. Nothing on screen revealed it; the reading just came out thinner
    // than its English twin. What comes back is the English base card, which is exactly what the
    // language rule already promises the model ("supplied to you in English").
    const card = resolveCardByAnyLocaleName(c.name);
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

function systemBlocks(locale: Locale = "en"): Anthropic.Messages.TextBlockParam[] {
  return [{ type: "text", text: buildPersona(locale) }];
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
  /** Which edition the draw came from. Only decides the language when no question was typed. */
  locale?: Locale;
}

function drawSummary(args: ReadingPromptArgs): string {
  const { theme, question } = args;
  const questionLine = question?.trim() ? `The querent's question: "${question.trim()}"` : "The querent gave no specific question — read generally.";
  return `Theme focus: ${theme}\n${questionLine}\n\nCards drawn:\n${buildDrawnCardsBlock(args)}`;
}

/**
 * Full-widths ASCII punctuation that the model leaves sitting directly after a Chinese character
 * (「風暴之後,有安穩的光」). The prompt already asks for full-width punctuation and that cut the rate
 * roughly in half — but "roughly in half" is not a fix for something a reader sees on every line of
 * a paid reading, and this particular defect is perfectly mechanical. Instructions are for judgement;
 * this is not judgement.
 *
 * Only converts when the PREVIOUS character is Chinese, which is what keeps prices ($6.90) and any
 * genuinely Latin fragment intact — there the previous character is a digit or a letter.
 *
 * Streams, so it carries the final character of each chunk over to the next one: the punctuation and
 * the Chinese character before it routinely arrive in separate chunks, and judging a chunk in
 * isolation would miss exactly those.
 */
async function* normalizeCjkPunctuation(source: AsyncGenerator<string>, locale: Locale): AsyncGenerator<string> {
  if (locale !== "zh-TW") {
    yield* source;
    return;
  }
  const MAP: Record<string, string> = { ",": "，", ";": "；", ":": "：", "!": "！", "?": "？", ".": "。" };
  const isCjk = (ch: string) => /[一-鿿]/.test(ch);
  // Whether a mark converts depends only on the character BEFORE it, which is always already known —
  // so this needs no lookahead, just the last character carried across the chunk boundary. An earlier
  // version withheld the final character of each chunk "in case", and the bug that fell out of it was
  // that the very last character of a reading never got converted — and a reading almost always ends
  // on punctuation.
  let prev = "";
  for await (const chunk of source) {
    let out = "";
    for (const ch of chunk) {
      out += MAP[ch] && isCjk(prev) ? MAP[ch] : ch;
      prev = ch;
    }
    if (out) yield out;
  }
}

async function* streamText(
  systemMessage: Anthropic.Messages.TextBlockParam[],
  userMessage: string,
  maxTokens: number,
  locale: Locale = "en"
): AsyncGenerator<string> {
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
  async function* raw(): AsyncGenerator<string> {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
  yield* normalizeCjkPunctuation(raw(), locale);
}

/** Free tier: one ultra-short line (~30 chars, hard-capped) at the bottom of the report. */
export function streamFreeSummary(args: ReadingPromptArgs): AsyncGenerator<string> {
  const prompt = `${drawSummary(args)}\n\nWrite ONE line of at most 35 characters — a single distilled insight, no punctuation at the end, no preamble, no quotes around it. This must stand alone with no more context.`;
  // Small max_tokens keeps this call's cost near-zero regardless of the cached library size.
  return streamText(systemBlocks(args.locale), prompt, 20, args.locale ?? "en");
}

/** Year Ahead ($9.90): a theme card plus one card per month for the coming twelve. The month
 * names ride in as positions, so the narrative can anchor to real months the reader will live. */
export function streamYearAheadReading(args: ReadingPromptArgs): AsyncGenerator<string> {
  // Length is specified as STRUCTURE (sentences per section), never as a character count.
  // A character target is not portable across languages: "about 2600 characters" is a normal essay
  // in English and an enormous one in 繁體, and worse, 2600 CJK characters cost roughly 2600 output
  // tokens — so under the old 1500-token cap the model had to wrap up early. A real $9.90 reading
  // measured 1,095 characters across 13 cards, ~84 per card, which is under a sentence a month.
  // Sentence counts scale correctly in both languages and the generous cap below lets them land.
  const prompt = `${drawSummary(
    args
  )}\n\nThis is a YEAR AHEAD reading: the first card is the theme of the reader's whole year, the rest are one card per month, in order. Open with 4–5 sentences on the theme card as the year's undercurrent. Then walk the months IN ORDER — give EVERY month its own passage of 4–6 sentences that reads the card in that month's seasonal context, says what it asks of the reader and what it warns them of, and stays concrete enough to recognise when it arrives. Never merge months together and never leave a month with a single line: twelve months, twelve passages. Let months speak to each other (a seed planted in one month blooming or being tested in a later one). Close with 4–5 sentences of practical counsel for the year as one arc. Flowing prose with the month names woven in naturally; no headers, no bullet lists.`;
  return streamText(systemBlocks(args.locale), prompt, 6000, args.locale ?? "en");
}

/** Love Compatibility ($4.99): two people, five cards. The names arrive in the position labels
 * (You (Ana) / Them (Sam)); read the bond between them, honestly but never cruelly. */
export function streamLoveReading(args: ReadingPromptArgs): AsyncGenerator<string> {
  // Same reasoning as the Year Ahead above: structure, not a character count, and a cap that CJK
  // can actually reach (1400 characters of 繁體 does not fit in 850 tokens).
  const prompt = `${drawSummary(
    args
  )}\n\nThis is a TWO-PERSON compatibility reading. The five positions are: each person's card, the connection between them, its challenge, and where it's heading. Give EVERY one of the five cards its own passage of 4–5 sentences. Read each person's energy as it MEETS the other's — this is about the BOND, not two separate fortunes; when you read one person's card, say what it does to the other. Be honest and specific about the challenge card without being cruel. On the last card, say where this is heading if nothing changes, and what would change it. Close with 3–4 sentences on what this pair can actually do with what the cards show. Use their names naturally. Flowing prose, no headers.`;
  return streamText(systemBlocks(args.locale), prompt, 3500, args.locale ?? "en");
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
  // Same CJK ceiling as the special readings: "about 700 characters" cannot fit in 500 tokens
  // when a character costs about a token, so the 繁體 follow-up was cut short of what it promised.
  return streamText(systemBlocks(args.locale), prompt, 1200, args.locale ?? "en");
}

/** Paid tier: a ~1500-character narrative reading tied to the querent's question. */
export function streamDeepReading(args: ReadingPromptArgs): AsyncGenerator<string> {
  const prompt = `${drawSummary(
    args
  )}\n\nWrite a deep narrative reading of about 1500 characters. Trace the subconscious "energy flow" between the drawn cards — how they build on or tension against each other — and close with concrete, actionable advice tied directly to the querent's question. Write in flowing prose, no headers or bullet lists.`;
  // Same CJK ceiling: "about 1500 characters" against a 900-token cap meant the $2.99 deep reading
  // was structurally unable to reach its own target in 繁體, while English fit comfortably.
  return streamText(systemBlocks(args.locale), prompt, 2200, args.locale ?? "en");
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

Be economical. Never pad toward a length target with filler — say only what the cards and the question actually support, then stop.

${languageRule(args.locale ?? "en")}`;

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
