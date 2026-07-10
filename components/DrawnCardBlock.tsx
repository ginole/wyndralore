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
      className="reveal-fade flex flex-col gap-6 border-b border-ink-line/60 pb-10 last:border-b-0 sm:grid sm:grid-cols-[160px_1fr] sm:gap-10"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="w-32 shrink-0 sm:w-full">
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
      <div
        className="pt-1 transition-opacity duration-700"
        style={{ opacity: textVisible ? 1 : 0 }}
      >
        <h3 className="font-display text-2xl text-moon sm:text-3xl">
          {deckCard.name}
          <span className="ml-3 align-middle text-xs font-sans uppercase tracking-[0.2em] text-gold-dim">
            {orientation === "upright" ? "Upright" : "Reversed"}
          </span>
        </h3>
        {card ? (
          <>
            <ul className="mt-4 flex flex-wrap gap-2">
              {keywords.map((k) => (
                <li key={k} className="rounded-full border border-gold-dim/50 px-3 py-1 text-xs text-gold">
                  {k}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-moon-dim sm:text-base">{meaning}</p>
            <p className="font-display mt-5 max-w-xl text-lg italic text-gold-bright">&ldquo;{card.affirmation}&rdquo;</p>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-line" />
            <div className="h-3 w-full animate-pulse rounded bg-ink-line" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-ink-line" />
          </div>
        )}
      </div>
    </div>
  );
}
