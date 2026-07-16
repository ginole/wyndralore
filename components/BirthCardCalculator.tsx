"use client";

import { useState } from "react";
import Link from "next/link";
import CardFace from "./CardFace";

// Major arcana lookup: birth-card numbers run 1–22 where 22 is The Fool (0).
const MAJORS: { name: string; slug: string; file: string; essence: string }[] = [
  { name: "The Magician", slug: "the-magician", file: "major-01-magician", essence: "willpower, focus, making it real" },
  { name: "The High Priestess", slug: "the-high-priestess", file: "major-02-high-priestess", essence: "intuition, inner knowing, mystery" },
  { name: "The Empress", slug: "the-empress", file: "major-03-empress", essence: "nurture, abundance, creation" },
  { name: "The Emperor", slug: "the-emperor", file: "major-04-emperor", essence: "structure, authority, protection" },
  { name: "The Hierophant", slug: "the-hierophant", file: "major-05-hierophant", essence: "tradition, learning, guidance" },
  { name: "The Lovers", slug: "the-lovers", file: "major-06-lovers", essence: "choice, union, values" },
  { name: "The Chariot", slug: "the-chariot", file: "major-07-chariot", essence: "drive, victory, direction" },
  { name: "Strength", slug: "strength", file: "major-08-strength", essence: "gentle courage, patience, heart" },
  { name: "The Hermit", slug: "the-hermit", file: "major-09-hermit", essence: "reflection, wisdom, the inner lantern" },
  { name: "Wheel of Fortune", slug: "wheel-of-fortune", file: "major-10-wheel-of-fortune", essence: "cycles, luck, turning points" },
  { name: "Justice", slug: "justice", file: "major-11-justice", essence: "truth, balance, cause and effect" },
  { name: "The Hanged Man", slug: "the-hanged-man", file: "major-12-hanged-man", essence: "surrender, new perspective" },
  { name: "Death", slug: "death", file: "major-13-death", essence: "transformation, endings that free you" },
  { name: "Temperance", slug: "temperance", file: "major-14-temperance", essence: "harmony, alchemy, the middle path" },
  { name: "The Devil", slug: "the-devil", file: "major-15-devil", essence: "desire, attachment, shadow work" },
  { name: "The Tower", slug: "the-tower", file: "major-16-tower", essence: "revelation, sudden clarity" },
  { name: "The Star", slug: "the-star", file: "major-17-star", essence: "hope, healing, guidance" },
  { name: "The Moon", slug: "the-moon", file: "major-18-moon", essence: "dreams, the subconscious, cycles of feeling" },
  { name: "The Sun", slug: "the-sun", file: "major-19-sun", essence: "joy, vitality, success" },
  { name: "Judgement", slug: "judgement", file: "major-20-judgement", essence: "awakening, calling, renewal" },
  { name: "The World", slug: "the-world", file: "major-21-world", essence: "completion, wholeness, arrival" },
  { name: "The Fool", slug: "the-fool", file: "major-00-fool", essence: "beginnings, trust, the open road" },
];

function digitSum(n: number): number {
  return String(n)
    .split("")
    .reduce((a, c) => a + Number(c), 0);
}

/** The Tarot School method: month + day + year summed, digit-reduced to ≤22, then the reduction
 * chain gives the card pair (e.g. 2013 → 6 gives just The Lovers; 15 → 15 & 6; 19 → 19, 10 & 1). */
function birthCardChain(y: number, m: number, d: number): number[] {
  let sum = y + m + d;
  while (sum > 22) sum = digitSum(sum);
  const chain = [sum];
  while (chain[chain.length - 1] > 9) chain.push(digitSum(chain[chain.length - 1]));
  return chain;
}

export default function BirthCardCalculator() {
  const [value, setValue] = useState("");
  const [chain, setChain] = useState<number[] | null>(null);

  function handleCalc() {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return;
    setChain(birthCardChain(Number(m[1]), Number(m[2]), Number(m[3])));
  }

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-gold-dim/40 bg-ink-raised/40 p-8 text-center">
      <label className="block text-xs uppercase tracking-[0.25em] text-gold-dim" htmlFor="birth-date">
        Your date of birth
      </label>
      <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <input
          id="birth-date"
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-full border border-ink-line bg-ink px-6 py-3 text-sm text-moon focus:border-gold focus:outline-none [color-scheme:dark]"
        />
        <button
          type="button"
          onClick={handleCalc}
          disabled={!value}
          className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-50"
        >
          Reveal my card
        </button>
      </div>

      {chain && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.25em] text-gold-dim">
            {chain.length > 1 ? "Your birth cards" : "Your birth card"}
          </p>
          <div className="mt-6 flex flex-wrap items-start justify-center gap-8">
            {chain.map((n) => {
              const card = MAJORS[n - 1];
              return (
                <Link key={n} href={`/cards/${card.slug}`} className="group block w-40">
                  <div className="aspect-[5/8] w-full overflow-hidden rounded-xl transition-transform group-hover:scale-[1.03]">
                    <CardFace src={`/cards/${card.file}.svg`} alt={card.name} shine="hover" />
                  </div>
                  <p className="mt-3 font-display text-lg text-gold-bright">{card.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-moon-dim">{card.essence}</p>
                </Link>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-moon-dim">
            {chain.length > 1
              ? "These cards travel together: the first is the pattern your life keeps returning to, the second is the essence underneath it."
              : "A single-card chain is rare — this one energy runs straight through everything you do."}
          </p>
          <Link
            href="/reading/daily"
            className="mt-8 inline-block rounded-full bg-gold px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
          >
            Now draw your card for today
          </Link>
        </div>
      )}
    </div>
  );
}
