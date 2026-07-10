"use client";

import { useEffect, useState } from "react";
import { DeckCard, Orientation, TarotCard, Theme } from "@/lib/types";
import CardFace from "./CardFace";
import CardBack from "./CardBack";
import FlipCard from "./FlipCard";

const THEME_FIELD: Record<Theme, { meaning: keyof TarotCard; upright: keyof TarotCard; reversed: keyof TarotCard }> = {
  general: { meaning: "meaning_upright", upright: "meaning_upright", reversed: "meaning_reversed" },
  love: { meaning: "love_upright", upright: "love_upright", reversed: "love_reversed" },
  career: { meaning: "career_upright", upright: "career_upright", reversed: "career_reversed" },
  wellness: { meaning: "wellness_upright", upright: "wellness_upright", reversed: "wellness_reversed" },
};

interface DrawnCardBlockProps {
  position: string;
  deckCard: DeckCard;
  orientation: Orientation;
  theme: Theme;
  index: number;
}

export default function DrawnCardBlock({ position, deckCard, orientation, theme, index }: DrawnCardBlockProps) {
  const [card, setCard] = useState<TarotCard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cards/${deckCard.id}`)
      .then((r) => r.json())
      .then((data: TarotCard) => {
        if (!cancelled) setCard(data);
      });
    return () => {
      cancelled = true;
    };
  }, [deckCard.id]);

  // The ritual reveal (PRD §6.3.4-5): the card arrives face-down, flips over with a light
  // sweep, then the reading text fades in — staggered per card position.
  useEffect(() => {
    const flipDelay = 350 + index * 450;
    const flipTimer = setTimeout(() => setFlipped(true), flipDelay);
    const textTimer = setTimeout(() => setTextVisible(true), flipDelay + 420);
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(textTimer);
    };
  }, [index]);

  const fields = THEME_FIELD[theme];
  const meaning = card ? (card[orientation === "upright" ? fields.upright : fields.reversed] as string) : "";
  const keywords = card ? (orientation === "upright" ? card.keywords_upright : card.keywords_reversed) : [];

  return (
    <div
      className="reveal-fade grid grid-cols-[128px_1fr] gap-x-5 gap-y-5 border-b border-ink-line/60 pb-10 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-x-10 sm:gap-y-0"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="col-start-1 row-start-1">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold-dim">{position}</p>
        <div className="aspect-[5/8] w-full">
          <FlipCard
            flipped={flipped}
            back={<CardBack shine="loop" />}
            front={<CardFace src={deckCard.image} alt={deckCard.name} orientation={orientation} priority={index === 0} />}
            ariaLabel={`${deckCard.name}, ${orientation}`}
          />
        </div>
      </div>

      {/* Text group. On mobile `contents` dissolves this box so the heading sits in the grid cell
          beside the card (filling the space that was empty) while the long meaning drops to its own
          full-width row below. On desktop it's a normal block in the right column, so heading →
          keywords → meaning flow together beside the card exactly as before. */}
      <div className="contents sm:col-start-2 sm:row-start-1 sm:block sm:pt-1">
        <div
          className="col-start-2 row-start-1 self-center transition-opacity duration-700"
          style={{ opacity: textVisible ? 1 : 0 }}
        >
          <h3 className="font-display text-2xl text-moon sm:text-3xl">
            {deckCard.name}
            <span className="ml-3 align-middle text-xs font-sans uppercase tracking-[0.2em] text-gold-dim">
              {orientation === "upright" ? "Upright" : "Reversed"}
            </span>
          </h3>
          {card && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {keywords.map((k) => (
                <li key={k} className="rounded-full border border-gold-dim/50 px-3 py-1 text-xs text-gold">
                  {k}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="col-span-2 col-start-1 row-start-2 transition-opacity duration-700 sm:mt-4"
          style={{ opacity: textVisible ? 1 : 0 }}
        >
          {card ? (
            <>
              <p className="max-w-2xl text-sm leading-relaxed text-moon-dim sm:text-base">{meaning}</p>
              <p className="font-display mt-5 max-w-xl text-lg italic text-gold-bright">&ldquo;{card.affirmation}&rdquo;</p>
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-ink-line" />
              <div className="h-3 w-full animate-pulse rounded bg-ink-line" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-ink-line" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
