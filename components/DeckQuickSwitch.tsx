"use client";

import { useDeckPrefs } from "./DeckPrefs";
import { useAppT } from "@/lib/useLocale";

/**
 * A one-line, in-context deck switcher: the card-back variant sits where backs are on screen
 * (the shuffle step), the face variant where faces are (the reveal, the card library). The full
 * picker with thumbnails lives on /account; this exists because nobody goes looking for a
 * settings page mid-ritual.
 */
export default function DeckQuickSwitch({ kind, className = "" }: { kind: "face" | "back"; className?: string }) {
  const { deckStyle, cardBackStyle, setDeckStyle, setCardBackStyle } = useDeckPrefs();
  const t = useAppT();

  const options =
    kind === "face"
      ? ([
          { value: "classic", label: t.deck.classic },
          { value: "minimal", label: t.deck.wyndralore },
        ] as const)
      : ([
          { value: "lunar", label: t.deck.lunar },
          { value: "damask", label: t.deck.damask },
        ] as const);
  const active = kind === "face" ? deckStyle : cardBackStyle;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-moon-dim/60">{kind === "face" ? t.deck.faceLabel : t.deck.backLabel}</span>
      <div className="inline-flex overflow-hidden rounded-full border border-ink-line">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => (kind === "face" ? setDeckStyle(opt.value as "minimal" | "classic") : setCardBackStyle(opt.value as "lunar" | "damask"))}
            className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] transition-colors ${
              active === opt.value ? "bg-gold/15 text-gold-bright" : "text-moon-dim hover:text-moon"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
