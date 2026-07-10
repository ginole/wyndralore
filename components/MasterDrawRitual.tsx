"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AI_STYLE_POSITIONS, DeckCard, Orientation } from "@/lib/types";
import DeckStack, { SHUFFLE_SETTLE_MS } from "./DeckStack";
import CardFan from "./CardFan";
import CardFace from "./CardFace";

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Selection {
  position: string;
  card: DeckCard;
  orientation: Orientation;
}

// The buyer's own hand-shuffle-and-draw ritual for a paid ai_style order — reuses the same
// DeckStack/CardFan components as the site's free reading, scoped to the fixed Past/Present/Future
// spread, so a $9.9 purchase still means shuffling for herself rather than the system drawing for
// her. On success, refreshes the server-rendered reading page (which now finds cardsDrawn set).
export default function MasterDrawRitual({ code, deck, masterName }: { code: string; deck: DeckCard[]; masterName: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"shuffle" | "select" | "submitting">("shuffle");
  const [shuffledDeck, setShuffledDeck] = useState<DeckCard[]>(deck);
  const [isShuffling, setIsShuffling] = useState(true);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShuffledDeck(shuffleArray(deck));
    const t = setTimeout(() => setIsShuffling(false), SHUFFLE_SETTLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleShuffleAgain() {
    setIsShuffling(true);
    setShuffledDeck(shuffleArray(deck));
    setTimeout(() => setIsShuffling(false), SHUFFLE_SETTLE_MS);
  }

  const takenIds = new Set(selected.map((s) => s.card.id));

  async function handleSelectCard(card: DeckCard) {
    if (selected.length >= AI_STYLE_POSITIONS.length) return;
    const orientation: Orientation = Math.random() < 0.5 ? "upright" : "reversed";
    const position = AI_STYLE_POSITIONS[selected.length]!;
    const next = [...selected, { position, card, orientation }];
    setSelected(next);

    if (next.length === AI_STYLE_POSITIONS.length) {
      setPhase("submitting");
      setError(null);
      try {
        const res = await fetch(`/api/masters/reading/${code}/draw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards: next.map((s) => ({ position: s.position, cardId: s.card.id, orientation: s.orientation })),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Something went wrong — please try again.");
          setPhase("select");
          setSelected([]);
          return;
        }
        router.refresh();
      } catch {
        setError("Network error — please try again.");
        setPhase("select");
        setSelected([]);
      }
    }
  }

  if (phase === "shuffle") {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">In {masterName}&apos;s Style</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Shuffle the deck</h1>
        <p className="mt-3 max-w-sm text-sm text-moon-dim">Shuffle as many times as feels right, then draw your three cards yourself.</p>

        <div className="mt-12">
          <DeckStack isShuffling={isShuffling} />
        </div>

        <p className="mt-8 h-4 text-xs uppercase tracking-[0.3em] text-gold-dim transition-opacity duration-500">
          {isShuffling ? "Shuffling…" : "The deck is ready when you are."}
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handleShuffleAgain}
            className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => setPhase("select")}
            className={`rounded-full bg-gold px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright ${
              isShuffling ? "" : "btn-breathe"
            }`}
          >
            Continue to Draw
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[75vh] w-full min-w-0 max-w-4xl flex-col px-6 py-14 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">In {masterName}&apos;s Style</p>
      <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Draw your cards</h1>
      <p className="mt-3 text-sm text-moon-dim">
        {phase === "submitting"
          ? "Revealing your reading…"
          : selected.length < AI_STYLE_POSITIONS.length
            ? `Select ${AI_STYLE_POSITIONS.length - selected.length} more card${AI_STYLE_POSITIONS.length - selected.length > 1 ? "s" : ""}.`
            : "Revealing…"}
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mx-auto mt-8 flex flex-wrap justify-center gap-4">
        {AI_STYLE_POSITIONS.map((pos, i) => {
          const s = selected[i];
          return (
            <div key={pos} className="w-16 sm:w-20">
              <div
                className={`aspect-[5/8] w-full overflow-hidden rounded-md border transition-shadow duration-300 ${
                  s ? "border-gold-dim shadow-[0_0_18px_-2px_rgba(228,200,148,0.35)]" : "border-dashed border-ink-line"
                }`}
              >
                {s ? (
                  <div className="reveal-fade h-full w-full">
                    <CardFace src={s.card.image} alt={s.card.name} orientation={s.orientation} />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-ink-raised/40" />
                )}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-moon-dim">{pos}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-auto min-w-0">
        <CardFan cards={shuffledDeck} takenIds={takenIds} onSelect={handleSelectCard} disabled={phase !== "select"} />
      </div>
    </section>
  );
}
