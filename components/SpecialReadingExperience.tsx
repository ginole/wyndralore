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
import { storedTrafficSource } from "@/components/TrafficSourceCapture";
import { readSseStream } from "@/lib/sse";
import DeckQuickSwitch from "./DeckQuickSwitch";
import { YEAR_READING_PRICE_USD, LOVE_READING_PRICE_USD } from "@/lib/pricing";
import { useLocale } from "@/lib/useLocale";
import { getAppDict } from "@/lib/i18nApp";

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

function nextTwelveMonths(monthsLocale: string): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + 1 + i, 1).toLocaleString(monthsLocale, { month: "long", year: "numeric" })
  );
}

const CONFIG: Record<Kind, { priceUsd: number; creditField: "yearReadingCredits" | "loveReadingCredits" }> = {
  year_reading: { priceUsd: YEAR_READING_PRICE_USD, creditField: "yearReadingCredits" },
  love_reading: { priceUsd: LOVE_READING_PRICE_USD, creditField: "loveReadingCredits" },
};

export default function SpecialReadingExperience({ kind, deck }: { kind: Kind; deck: DeckCard[] }) {
  const { user, loading, refresh } = useAuth();
  const cfg = CONFIG[kind];
  const locale = useLocale();
  const t = getAppDict(locale).special;
  const tw = locale === "zh-TW";
  const L = (p: string) => (tw ? `/tc${p}` : p);
  // A localized view of the config's copy, keyed by kind.
  const label = t.labels[kind];
  const title = t.titles[kind];

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

  const dfltA = tw ? "你" : "You";
  const dfltB = tw ? "對方" : "Them";
  const positions = useMemo(() => {
    if (kind === "year_reading") return [t.themeOfYear, ...nextTwelveMonths(t.monthsLocale)];
    const a = nameA.trim() || dfltA;
    const b = nameB.trim() || dfltB;
    return [t.youName(a), t.themName(b), t.connection, t.challenge, t.heading];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, nameA, nameB, locale]);

  const credits = user ? user[cfg.creditField] : 0;

  async function handleBuy() {
    setBuying(true);
    try {
      const res = await fetch("/api/orders/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          redirectPath: L(kind === "year_reading" ? "/reading/year-ahead" : "/reading/love-compatibility"),
          whopAffiliate: storedWhopAffiliate(), source: storedTrafficSource(),
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
    const genTitle =
      kind === "year_reading"
        ? t.genTitleYear(positions[1], positions[12])
        : t.genTitleLove(nameA.trim() || dfltA, nameB.trim() || dfltB);
    try {
      const res = await fetch("/api/special-reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: genTitle,
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
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{label}</p>
        <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">{title}</h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-moon-dim">{t.pitches[kind]}</p>
        <ul className="mt-6 space-y-2 text-sm text-moon-dim">
          {t.bullets[kind].map((b) => (
            <li key={b} className="flex items-start gap-2 text-left">
              <span className="mt-0.5 text-gold">✦</span>
              {b}
            </li>
          ))}
        </ul>

        {!user ? (
          <Link
            href={L("/account")}
            className="mt-10 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
          >
            {t.signInToBegin}
          </Link>
        ) : credits > 0 ? (
          <>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-gold-bright">{t.readingWaiting}</p>
            <button
              type="button"
              onClick={beginRitual}
              className="mt-4 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
            >
              {t.beginRitual}
            </button>
          </>
        ) : polling ? (
          <p className="mt-10 text-sm text-moon-dim">{t.confirmingPayment}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBuy}
              disabled={buying}
              className="mt-10 rounded-full bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
            >
              {buying ? t.oneMoment : t.unlock(cfg.priceUsd)}
            </button>
            <p className="mt-3 text-xs text-moon-dim/70">{t.oneTimeNote}</p>
          </>
        )}
      </section>
    );
  }

  // Setup (love only): the two names + optional question
  if (phase === "setup") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon">{t.whoReading}</h1>
        <div className="mt-8 flex w-full flex-col gap-3">
          <input
            value={nameA}
            onChange={(e) => setNameA(e.target.value.slice(0, 40))}
            placeholder={t.yourName}
            className="rounded-full border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
          />
          <input
            value={nameB}
            onChange={(e) => setNameB(e.target.value.slice(0, 40))}
            placeholder={t.theirName}
            className="rounded-full border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
          />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            placeholder={t.connectionQuestion}
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
          {t.cont}
        </button>
      </section>
    );
  }

  // Shuffle
  if (phase === "shuffle") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon">{t.shuffleTitle}</h1>
        <p className="mt-3 max-w-sm text-sm text-moon-dim">{t.shuffleBody(positions.length)}</p>
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
            {t.shuffleBtn}
          </button>
          <button
            type="button"
            onClick={() => setPhase("select")}
            disabled={isShuffling}
            className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            {t.continueSelect}
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
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon">{t.chooseCards}</h1>
        <p className="mt-2 text-sm text-moon-dim">
          {selected.length < positions.length
            ? t.selectMore(positions[selected.length], positions.length - selected.length)
            : t.allDrawn}
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
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{label}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">
          {kind === "year_reading" ? t.yearTitle : t.loveTitle(nameA.trim() || dfltA, nameB.trim() || dfltB)}
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
        {genState === "streaming" && !aiText && <p className="text-center text-sm text-moon-dim">{t.readingArc}</p>}
        {aiText && <p className="whitespace-pre-wrap text-sm leading-relaxed text-moon">{aiText}</p>}
        {genState === "error" && (
          <p className="text-center text-sm text-moon-dim">
            {t.genError}{" "}
            <button type="button" className="text-gold underline underline-offset-4" onClick={() => { generationStarted.current = false; setGenState("idle"); void generate(selected); }}>
              {t.tryAgain}
            </button>
          </p>
        )}
        {genState === "done" && (
          <p className="mt-6 border-t border-ink-line/60 pt-4 text-center text-xs text-gold-dim">
            {t.savedPermanent}
            {savedId && (
              <>
                {" · "}
                <Link href={L(`/readings/${savedId}`)} className="text-gold underline underline-offset-4">
                  {t.openOwnPage}
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
