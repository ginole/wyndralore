"use client";

import { useDeckPrefs, deckImageSrc, cardBackSrc, DeckStyle, CardBackStyle } from "./DeckPrefs";
import { useAppT } from "@/lib/useLocale";

/**
 * The deck-appearance picker on /account: which card art the reader sees (our minimal gold
 * line-art vs the classic 1909 deck) and which card back. Works for guests too (localStorage)
 * but lives on /account where people expect settings; signed-in choices sync across devices.
 */
export default function DeckStylePanel() {
  const { deckStyle, cardBackStyle, setDeckStyle, setCardBackStyle } = useDeckPrefs();
  const t = useAppT();

  const faceOptions: { value: DeckStyle; label: string; sample: string }[] = [
    { value: "classic", label: t.deck.classic, sample: deckImageSrc("/cards/major-17-star.svg", "classic") },
    { value: "minimal", label: t.deck.wyndralore, sample: deckImageSrc("/cards/major-17-star.svg", "minimal") },
  ];
  const backOptions: { value: CardBackStyle; label: string }[] = [
    { value: "lunar", label: t.deck.lunarFull },
    { value: "damask", label: t.deck.damaskFull },
  ];

  return (
    <div className="mt-6 w-full rounded-2xl border border-ink-line bg-ink-raised/50 p-6 text-left">
      <h2 className="font-display text-lg text-gold-bright">{t.deck.appearanceTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-moon-dim">{t.deck.appearanceBody}</p>

      <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-gold-dim">{t.deck.facesLabel}</p>
      <div className="mt-2 flex gap-3">
        {faceOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDeckStyle(opt.value)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
              deckStyle === opt.value ? "border-gold bg-gold/10" : "border-ink-line hover:border-gold-dim"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={opt.sample} alt={opt.label} width={64} height={102} loading="lazy" className="w-16 rounded-md" />
            <span className={`text-xs ${deckStyle === opt.value ? "text-gold-bright" : "text-moon-dim"}`}>{opt.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-gold-dim">{t.deck.backLabel}</p>
      <div className="mt-2 flex gap-3">
        {backOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setCardBackStyle(opt.value)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
              cardBackStyle === opt.value ? "border-gold bg-gold/10" : "border-ink-line hover:border-gold-dim"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardBackSrc(opt.value)} alt={opt.label} width={64} height={102} loading="lazy" className="w-16 rounded-md" />
            <span className={`text-xs ${cardBackStyle === opt.value ? "text-gold-bright" : "text-moon-dim"}`}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
