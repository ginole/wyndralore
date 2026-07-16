"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DeckCard, Orientation } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import DeckStack, { SHUFFLE_SETTLE_MS } from "./DeckStack";
import CardFan from "./CardFan";
import CardFace from "./CardFace";
import WhopCheckoutModal, { WhopCheckoutTarget } from "./WhopCheckoutModal";
import { storedWhopAffiliate } from "./WhopAffiliateCapture";
import { readSseStream } from "@/lib/sse";
import DeckQuickSwitch from "./DeckQuickSwitch";
import { YEAR_READING_PRICE_USD, LOVE_READING_PRICE_USD } from "@/lib/pricing";

type Kind = "year_reading" | "love_reading";

interface Selection {
  position: string;
  card: DeckCard;
  orientation: Orientation;
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function nextTwelveMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + 1 + i, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
  );
}

const CONFIG: Record<
  Kind,
  {
    label: string;
    title: string;
    priceUsd: number;
    creditField: "yearReadingCredits" | "loveReadingCredits";
    pitch: string;
    bullets: string[];
  }
> = {
  year_reading: {
    label: "Year Ahead",
    title: "Your Year Ahead",
    priceUsd: YEAR_READING_PRICE_USD,
    creditField: "yearReadingCredits",
    pitch:
      "Thirteen cards: one theme for the whole year, then one card for each of the next twelve months — read as a single unfolding story, written for you and saved forever.",
    bullets: [
      "A theme card + 12 months, drawn by your own hand",
      "A long written reading that walks your year month by month",
      "Saved to your account permanently — return to it as the year unfolds",
    ],
  },
  love_reading: {
    label: "Love Compatibility",
    title: "Love Compatibility",
    priceUsd: LOVE_READING_PRICE_USD,
    creditField: "loveReadingCredits",
    pitch:
      "Five cards for two people: your energy, theirs, the connection between you, its challenge, and where it's heading — read as one bond, not two fortunes.",
    bullets: [
      "Both of you in the cards, by name",
      "An honest written reading of the connection itself",
      "Saved to your account permanently",
    ],
  },
};

export default function SpecialReadingExperience({ kind, deck }: { kind: Kind; deck: DeckCard[] }) {
  const { user, loading, refresh } = useAuth();
  const cfg = CONFIG[kind];

  const [phase, setPhase] = useState<"entry" | "setup" | "shuffle" | "select" | "reveal">("entry");
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [question, setQuestion] = useState("");
  const [shuffledDeck, setShuffledDeck] = useState<DeckCard[]>(deck);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [aiText, setAiText] = useState("");
  const [genState, setGenState] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<WhopCheckoutTarget | null>(null);
  const [buying, setBuying] = useState(false);
  const [polling, setPolling] = useState(false);
  const generationStarted = useRef(false);

  const positions = useMemo(() => {
    if (kind === "year_reading") return ["Theme of the Year", ...nextTwelveMonths()];
    const a = nameA.trim() || "You";
    const b = nameB.trim() || "Them";
    return [`You (${a})`, `Them (${b})`, "The Connection", "The Challenge", "Where It's Heading"];
  }, [kind, nameA, nameB]);

  const credits = user ? user[cfg.creditField] : 0;

  async function handleBuy() {
    setBuying(true);
    try {
      const res = await fetch("/api/orders/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          redirectPath: kind === "year_reading" ? "/reading/year-ahead" : "/reading/love-compatibility",
          whopAffiliate: storedWhopAffiliate(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.planId && data?.sessionId) setCheckout({ planId: data.planId, sessionId: data.sessionId });
    } finally {
      setBuying(false);
    }
  }

  /** Whop's onComplete = "card went through"; the credit lands via our webhook a beat later. */
  async function pollForCredit() {
    setPolling(true);
    const before = credits;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      await refresh();
      // refresh() updates context; read the fresh value on next render via a direct fetch instead.
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if ((me?.user?.[cfg.creditField] ?? 0) > before) break;
    }
    setPolling(false);
  }

  function beginRitual() {
    setPhase(kind === "love_reading" ? "setup" : "shuffle");
    setIsShuffling(true);
    setShuffledDeck(shuffleArray(deck));
    setTimeout(() => setIsShuffling(false), SHUFFLE_SETTLE_MS);
  }

  function handleShuffleAgain() {
    setIsShuffling(true);
    setShuffledDeck(shuffleArray(deck));
    setTimeout(() => setIsShuffling(false), SHUFFLE_SETTLE_MS);
  }

  function handleSelectCard(card: DeckCard) {
    if (selected.length >= positions.length) return;
    setSelected((prev) => {
      if (prev.length >= positions.length || prev.some((s) => s.card.id === card.id)) return prev;
      const orientation: Orientation = Math.random() < 0.5 ? "upright" : "reversed";
      const next = [...prev, { position: positions[prev.length], card, orientation }];
      if (next.length === positions.length) {
        // All cards drawn — move to reveal and start generation on the next tick.
        setTimeout(() => {
          setPhase("reveal");
          void generate(next);
        }, 600);
      }
      return next;
    });
  }

  async function generate(cards: Selection[]) {
    if (generationStarted.current) return;
    generationStarted.current = true;
    setGenState("streaming");
    const title =
      kind === "year_reading"
        ? `Your Year Ahead · ${positions[1]} – ${positions[12]}`
        : `${nameA.trim() || "You"} & ${nameB.trim() || "Them"} · Love Compatibility`;
    try {
      const res = await fetch("/api/special-reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          cards: cards.map((s) => ({ position: s.position, name: s.card.name, orientation: s.orientation })),
          input: { nameA: nameA.trim() || undefined, nameB: nameB.trim() || undefined, question: question.trim() || undefined },
        }),
      });
      if (!res.ok) {
        setGenState("error");
        return;
      }
      const done = await readSseStream(res, (chunk) => setAiText((prev) => prev + chunk));
      if (typeof done?.id === "string") setSavedId(done.id);
      setGenState(aiText || done ? "done" : "error");
      void refresh(); // credit was spent — sync the header/account state
    } catch {
      setGenState("error");
    }
  }

  // ---------- render ----------

  if (loading) {
    return <section className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6 text-moon-dim">…</section>;
  }

  // Entry: sales pitch (no credit) or begin (credit in hand)
  if (phase === "entry") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <WhopCheckoutModal
          target={checkout}
          email={user?.email}
          onClose={() => setCheckout(null)}
          onComplete={() => {
            setCheckout(null);
            void pollForCredit();
          }}
        />
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{cfg.label}</p>
        <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">{cfg.title}</h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-moon-dim">{cfg.pitch}</p>
        <ul className="mt-6 space-y-2 text-sm text-moon-dim">
          {cfg.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-left">
              <span className="mt-0.5 text-gold">✦</span>
              {b}
            </li>
          ))}
        </ul>

        {!user ? (
          <Link
            href="/account"
            className="mt-10 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
          >
            Sign in to begin
          </Link>
        ) : credits > 0 ? (
          <>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-gold-bright">A reading is waiting for you</p>
            <button
              type="button"
              onClick={beginRitual}
              className="mt-4 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
            >
              Begin the ritual
            </button>
          </>
        ) : polling ? (
          <p className="mt-10 text-sm text-moon-dim">Confirming your payment…</p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBuy}
              disabled={buying}
              className="mt-10 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
            >
              {buying ? "One moment…" : `Unlock — $${cfg.priceUsd}`}
            </button>
            <p className="mt-3 text-xs text-moon-dim/70">One-time purchase · yours forever · no subscription</p>
          </>
        )}
      </section>
    );
  }

  // Setup (love only): the two names + optional question
  if (phase === "setup") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{cfg.label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon">Who are we reading?</h1>
        <div className="mt-8 flex w-full flex-col gap-3">
          <input
            value={nameA}
            onChange={(e) => setNameA(e.target.value.slice(0, 40))}
            placeholder="Your name"
            className="rounded-full border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
          />
          <input
            value={nameB}
            onChange={(e) => setNameB(e.target.value.slice(0, 40))}
            placeholder="Their name"
            className="rounded-full border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
          />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            placeholder="Anything specific on your mind about this connection? (optional)"
            rows={2}
            className="rounded-xl border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setPhase("shuffle")}
          disabled={!nameA.trim() || !nameB.trim()}
          className="mt-8 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-50"
        >
          Continue
        </button>
      </section>
    );
  }

  // Shuffle
  if (phase === "shuffle") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{cfg.label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon">Shuffle the deck</h1>
        <p className="mt-3 max-w-sm text-sm text-moon-dim">
          Shuffle as many times as feels right, then continue when you&apos;re ready to draw {positions.length} cards.
        </p>
        <div className="mt-10">
          <DeckStack isShuffling={isShuffling} />
        </div>
        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={handleShuffleAgain}
            disabled={isShuffling}
            className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => setPhase("select")}
            disabled={isShuffling}
            className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            Continue to Select
          </button>
        </div>
        <DeckQuickSwitch kind="back" className="mt-8" />
      </section>
    );
  }

  // Select
  if (phase === "select") {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{cfg.label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon">Choose your cards</h1>
        <p className="mt-2 text-sm text-moon-dim">
          {selected.length < positions.length
            ? `${positions[selected.length]} — select ${positions.length - selected.length} more card${positions.length - selected.length > 1 ? "s" : ""}.`
            : "All drawn."}
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-7">
          {positions.map((pos, i) => (
            <div key={pos} className="flex flex-col items-center gap-1.5">
              <div className="aspect-[5/8] w-full rounded-lg border border-dashed border-ink-line">
                {selected[i] && <CardFace src={selected[i].card.image} alt={selected[i].card.name} orientation={selected[i].orientation} />}
              </div>
              <span className="text-[9px] uppercase tracking-wide text-moon-dim/70">{pos.replace(/ \d{4}$/, "")}</span>
            </div>
          ))}
        </div>

        <CardFan cards={shuffledDeck} takenIds={new Set(selected.map((s) => s.card.id))} onSelect={handleSelectCard} disabled={selected.length >= positions.length} />
      </section>
    );
  }

  // Reveal + streaming reading
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{cfg.label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">
          {kind === "year_reading" ? "Your Year Ahead" : `${nameA.trim() || "You"} & ${nameB.trim() || "Them"}`}
        </h1>
        <div className="mt-5">
          <DeckQuickSwitch kind="face" />
        </div>
      </div>

      <div className={`grid gap-3 ${kind === "year_reading" ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-7" : "grid-cols-3 sm:grid-cols-5"}`}>
        {selected.map((s) => (
          <div key={s.card.id} className="flex flex-col items-center gap-1.5">
            <div className="aspect-[5/8] w-full">
              <CardFace src={s.card.image} alt={s.card.name} orientation={s.orientation} shine="hover" />
            </div>
            <span className="text-center text-[9px] uppercase leading-tight tracking-wide text-moon-dim/70">{s.position}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-gold-dim/40 bg-ink-raised/40 p-6">
        {genState === "streaming" && !aiText && <p className="text-center text-sm text-moon-dim">Reading the arc of your cards…</p>}
        {aiText && <p className="whitespace-pre-wrap text-sm leading-relaxed text-moon">{aiText}</p>}
        {genState === "error" && (
          <p className="text-center text-sm text-moon-dim">
            Something went wrong generating your reading — your credit was NOT spent.{" "}
            <button type="button" className="text-gold underline underline-offset-4" onClick={() => { generationStarted.current = false; setGenState("idle"); void generate(selected); }}>
              Try again
            </button>
          </p>
        )}
        {genState === "done" && (
          <p className="mt-6 border-t border-ink-line/60 pt-4 text-center text-xs text-gold-dim">
            Saved to your account permanently
            {savedId && (
              <>
                {" · "}
                <Link href={`/readings/${savedId}`} className="text-gold underline underline-offset-4">
                  open your reading&apos;s own page
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
