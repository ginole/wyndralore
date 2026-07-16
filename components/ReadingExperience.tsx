"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DeckCard, Orientation, SpreadConfig, Theme } from "@/lib/types";
import { canDraw, recordDraw, recordGuestDailyStreak } from "@/lib/dailyLimit";
import { useAuth, todayLocal, QuotaStatus } from "./AuthProvider";
import { track } from "@/lib/track";
import DeckStack, { SHUFFLE_SETTLE_MS } from "./DeckStack";
import CardFan from "./CardFan";
import CardFace from "./CardFace";
import DrawnCardBlock from "./DrawnCardBlock";
import AdBonusModal from "./AdBonusModal";
import ShareCardModal from "./ShareCardModal";
import AiReadingPanel from "./AiReadingPanel";
import FortuneShareCard from "./FortuneShareCard";
import TipBlock from "./TipBlock";

type Phase = "checking" | "limited" | "intro" | "shuffle" | "select" | "reveal";

interface Selection {
  position: string;
  card: DeckCard;
  orientation: Orientation;
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "general", label: "General" },
  { value: "love", label: "Love" },
  { value: "career", label: "Career" },
  { value: "wellness", label: "Wellness" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchQuotaStatus(): Promise<QuotaStatus | undefined> {
  const res = await fetch(`/api/draws/status?date=${todayLocal()}`, { cache: "no-store" });
  const data = await res.json();
  return data.quota;
}

// Stashed here right before sending the buyer to Lemon Squeezy for an AI-read purchase, so
// they land back on the exact reading they paid for instead of having to redraw from scratch —
// see the `?resume=1` handling below and AiReadingPanel's `onBeforePurchase`.
const RESUME_STORAGE_KEY = "wl_resume_reading";
const RESUME_MAX_AGE_MS = 30 * 60 * 1000;

interface ResumePayload {
  spreadSlug: string;
  selected: Selection[];
  theme: Theme;
  question: string;
  savedAt: number;
}

interface ReadingExperienceProps {
  spread: SpreadConfig;
  deck: DeckCard[];
  // Present only when a non-member is opening this PREMIUM spread with a referral-earned unlock
  // credit (vs. a paid plan). Drives the "using 1 free unlock" note; the credit is spent
  // server-side at first card pick.
  creditUnlock?: { creditsRemaining: number };
}

export default function ReadingExperience({ spread, deck, creditUnlock }: ReadingExperienceProps) {
  const { user, quota, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const [question, setQuestion] = useState("");
  const [theme, setTheme] = useState<Theme>("general");
  const [shuffledDeck, setShuffledDeck] = useState<DeckCard[]>(deck);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [journalState, setJournalState] = useState<"idle" | "saving" | "saved">("idle");
  const [aiReadingText, setAiReadingText] = useState<string | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const didInit = useRef(false);
  const trackedReveal = useRef(false);
  const quotaConsumedRef = useRef(false);

  useEffect(() => {
    // Resolve the initial phase exactly once auth settles — never again, so a later
    // quota refresh (e.g. after claiming a bonus) can't yank the user back to "intro".
    if (authLoading || didInit.current) return;
    didInit.current = true;

    // Returning from an AI-read purchase checkout — restore the exact reading instead of
    // making the buyer redraw (the draw's quota was already spent before they left for
    // checkout, so re-gating by quota here would be wrong).
    if (new URLSearchParams(window.location.search).get("resume") === "1") {
      const raw = sessionStorage.getItem(RESUME_STORAGE_KEY);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as ResumePayload;
          if (saved.spreadSlug === spread.slug && Date.now() - saved.savedAt < RESUME_MAX_AGE_MS) {
            sessionStorage.removeItem(RESUME_STORAGE_KEY);
            window.history.replaceState({}, "", window.location.pathname);
            setSelected(saved.selected);
            setTheme(saved.theme);
            setQuestion(saved.question);
            setPhase("reveal");
            return;
          }
        } catch {
          // malformed/stale payload — fall through to the normal quota-gated phase below
        }
      }
    }

    // Premium spreads are already access-gated on the server (reached here only via an active
    // plan or a referral unlock credit), so they don't re-gate on the daily free-draw quota.
    const allowed = !spread.free
      ? true
      : user
        ? Boolean(quota?.isPremium) || (quota?.remaining ?? 0) > 0
        : canDraw();
    setPhase(allowed ? "intro" : "limited");
  }, [authLoading, user, quota, spread.slug, spread.free]);

  function handleBeforePurchase() {
    const payload: ResumePayload = { spreadSlug: spread.slug, selected, theme, question, savedAt: Date.now() };
    sessionStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(payload));
  }

  useEffect(() => {
    if (phase === "select" && selected.length === spread.count) {
      const t = setTimeout(() => setPhase("reveal"), 700);
      return () => clearTimeout(t);
    }
  }, [phase, selected, spread.count]);

  useEffect(() => {
    if (!bonusMessage) return;
    const t = setTimeout(() => setBonusMessage(null), 4000);
    return () => clearTimeout(t);
  }, [bonusMessage]);

  useEffect(() => {
    if (phase === "reveal" && !trackedReveal.current) {
      trackedReveal.current = true;
      track("reading_completed", { spread: spread.slug, theme });
    }
    if (phase === "limited") track("quota_exhausted", { spread: spread.slug });
  }, [phase, spread.slug, theme]);

  const takenIds = useMemo(() => new Set(selected.map((s) => s.card.id)), [selected]);
  // Stable reference so the share card isn't regenerated on unrelated re-renders (note typing,
  // AI reading completing) — only when the actual drawn cards change.
  const fortuneCards = useMemo(() => selected.map((s) => ({ image: s.card.image, orientation: s.orientation })), [selected]);

  function startShuffle() {
    setSelected([]);
    setNote("");
    setJournalState("idle");
    setAiReadingText(null);
    trackedReveal.current = false;
    quotaConsumedRef.current = false;
    setShuffledDeck(shuffleArray(deck));
    setIsShuffling(true);
    setPhase("shuffle");
    setTimeout(() => setIsShuffling(false), SHUFFLE_SETTLE_MS);
  }

  async function handleSaveToJournal() {
    setJournalState("saving");
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spread: spread.slug,
        theme,
        question: question.trim() || undefined,
        note: note.trim() || undefined,
        cards: selected.map((s) => ({ position: s.position, cardId: s.card.id, orientation: s.orientation })),
        aiReading: aiReadingText || undefined,
      }),
    });
    setJournalState(res.ok ? "saved" : "idle");
  }

  // Quota lifecycle (拒绝提前扣费): NOTHING is consumed while shuffling or browsing the fan.
  // The draw is only spent at the instant the first card is actually chosen — the moment the
  // reading's information is revealed. Refreshing or leaving before that costs nothing.
  function handleBegin() {
    startShuffle();
  }

  function handleShuffleAgain() {
    setIsShuffling(true);
    setShuffledDeck(shuffleArray(deck));
    setTimeout(() => setIsShuffling(false), SHUFFLE_SETTLE_MS);
  }

  function consumeQuotaOnFirstPick() {
    if (quotaConsumedRef.current) return;
    quotaConsumedRef.current = true;
    if (user) {
      fetch("/api/draws/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayLocal(), spread: spread.slug }),
      }).then(async (res) => {
        refreshAuth();
        if (!res.ok) {
          // Quota vanished between the intro check and the pick (e.g. spent in another tab).
          setSelected([]);
          setPhase("limited");
          return;
        }
        const data = await res.json().catch(() => null);
        if (typeof data?.streak === "number") setStreak(data.streak);
      });
    } else {
      recordDraw();
      if (spread.slug === "daily") setStreak(recordGuestDailyStreak(todayLocal()));
    }
  }

  function handleSelectCard(card: DeckCard) {
    if (selected.length >= spread.count) return;
    consumeQuotaOnFirstPick();
    setSelected((prev) => {
      if (prev.length >= spread.count || prev.some((s) => s.card.id === card.id)) return prev;
      const orientation: Orientation = Math.random() < 0.5 ? "upright" : "reversed";
      const position = spread.positions[prev.length];
      return [...prev, { position, card, orientation }];
    });
  }

  async function handleDrawAgain() {
    if (user) {
      const status = await fetchQuotaStatus();
      refreshAuth();
      setPhase(status && (status.isPremium || (status.remaining ?? 0) > 0) ? "intro" : "limited");
    } else {
      setPhase(canDraw() ? "intro" : "limited");
    }
  }

  // PRD §4.1: can't verify a real share, so grant on the "clicked + waited 3s" contract.
  async function grantShareBonusIfAvailable() {
    if (!user || !quota?.shareBonusAvailable) return;
    const res = await fetch("/api/draws/bonus/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayLocal() }),
    });
    if (res.ok) {
      setBonusMessage("+1 reading unlocked!");
      refreshAuth();
    }
  }

  // Called by ShareCardModal after the user has engaged the share sheet.
  function handleShareBonusFromModal() {
    grantShareBonusIfAvailable();
  }

  // Lightweight text share used from the "limited" (out-of-quota) screen.
  async function handleTextShare() {
    track("share_click", { context: "limited" });
    const shareData = {
      title: "Wyndralore Tarot",
      text: "I just drew a reading on Wyndralore — a tarot experience built for quiet reflection. Try a free reading of your own.",
      url: "https://wyndralore.com",
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setBonusMessage("Link copied to clipboard!");
      }
    } catch {
      // Share sheet dismissed — we still grant per PRD §4.1.
    }
    setTimeout(grantShareBonusIfAvailable, 3000);
  }

  async function handleAdBonusComplete() {
    setShowAdModal(false);
    const res = await fetch("/api/draws/bonus/ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayLocal() }),
    });
    refreshAuth();
    if (res.ok) {
      const status = await fetchQuotaStatus();
      if (status && (status.isPremium || (status.remaining ?? 0) > 0)) setPhase("intro");
    }
  }

  if (phase === "checking") {
    return <div className="min-h-[60vh]" />;
  }

  if (phase === "limited") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Today&apos;s reading is complete</p>
        <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">You&apos;ve used today&apos;s free reading</h1>
        <p className="mt-4 text-sm leading-relaxed text-moon-dim">
          Your free draw resets tomorrow. Premium members read without limits.
        </p>

        {user ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            {quota?.shareBonusAvailable && (
              <button
                type="button"
                onClick={handleTextShare}
                className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
              >
                Share for +1 Reading
              </button>
            )}
            {quota?.adBonusAvailable && (
              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
              >
                Watch an Ad for +1 Reading
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/account"
            className="mt-8 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4 hover:text-gold-bright"
          >
            Sign in to unlock bonus readings
          </Link>
        )}

        <Link
          href="/pricing"
          className="cta-gold mt-6 rounded-full px-7 py-3 text-sm font-medium uppercase tracking-[0.2em]"
        >
          Go Premium for Unlimited
        </Link>
        <Link href="/" className="mt-6 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon">
          Back to Wyndralore
        </Link>

        {showAdModal && <AdBonusModal onComplete={handleAdBonusComplete} onClose={() => setShowAdModal(false)} />}
      </section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spread.count} card{spread.count > 1 ? "s" : ""}</p>
        <h1 className="font-display mt-4 text-4xl text-moon sm:text-5xl">{spread.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-moon-dim sm:text-base">{spread.subtitle}</p>
        {spread.free && user && quota && !quota.isPremium && (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold-dim">
            {quota.remaining} of {quota.limit} readings left today
          </p>
        )}
        {creditUnlock && (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold-bright">
            ✦ Unlocking with 1 of your {creditUnlock.creditsRemaining} free premium {creditUnlock.creditsRemaining === 1 ? "unlock" : "unlocks"}
          </p>
        )}

        <label className="mt-10 w-full text-left">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your question (optional)</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's on your mind right now?"
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-ink-raised/60 p-4 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold-dim focus:outline-none"
          />
        </label>

        <div className="mt-8 w-full text-left">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Read this through the lens of</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  theme === opt.value
                    ? "border-gold bg-gold/10 text-gold-bright"
                    : "border-ink-line text-moon-dim hover:border-gold-dim"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleBegin}
          className="cta-gold mt-10 w-full max-w-xs rounded-full px-9 py-4 text-sm font-medium uppercase tracking-[0.2em] sm:w-auto"
        >
          Begin Shuffling
        </button>
      </section>
    );
  }

  if (phase === "shuffle") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spread.title}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Shuffle the deck</h1>
        <p className="mt-3 max-w-sm text-sm text-moon-dim">Shuffle as many times as feels right, then continue when you&apos;re ready to draw.</p>

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
            className={`cta-gold rounded-full px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] ${
              isShuffling ? "" : "btn-breathe"
            }`}
          >
            Continue to Select
          </button>
        </div>
      </section>
    );
  }

  if (phase === "select") {
    return (
      <section className="mx-auto flex min-h-[75vh] w-full min-w-0 max-w-4xl flex-col px-6 py-14 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spread.title}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Choose your card{spread.count > 1 ? "s" : ""}</h1>
        <p className="mt-3 text-sm text-moon-dim">
          {selected.length < spread.count
            ? `Select ${spread.count - selected.length} more card${spread.count - selected.length > 1 ? "s" : ""}.`
            : "Revealing..."}
        </p>

        <div className="mx-auto mt-8 flex flex-wrap justify-center gap-4">
          {spread.positions.map((pos, i) => {
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
          <CardFan cards={shuffledDeck} takenIds={takenIds} onSelect={handleSelectCard} disabled={selected.length >= spread.count} />
        </div>
      </section>
    );
  }

  // reveal
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spread.title}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Your Reading</h1>
        {question.trim() && <p className="mt-3 text-sm italic text-moon-dim">&ldquo;{question.trim()}&rdquo;</p>}
        {spread.slug === "daily" && streak !== null && streak > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold-dim/60 px-4 py-1.5 text-xs tracking-wide text-gold-bright">
            <span aria-hidden>🔥</span>
            {streak === 1 ? "Day 1 of your streak — come back tomorrow" : `${streak}-day streak — see you tomorrow`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-10">
        {selected.map((s, i) => (
          <DrawnCardBlock key={s.card.id} position={s.position} deckCard={s.card} orientation={s.orientation} theme={theme} index={i} />
        ))}
      </div>

      <AiReadingPanel
        cards={selected.map((s) => ({ position: s.position, name: s.card.name, orientation: s.orientation }))}
        theme={theme}
        question={question.trim() || undefined}
        isAuthenticated={Boolean(user)}
        isPremium={Boolean(user?.isPremium)}
        spreadSlug={spread.slug}
        onDeepReadingComplete={setAiReadingText}
        onBeforePurchase={handleBeforePurchase}
      />

      <FortuneShareCard
        spreadTitle={spread.title}
        cards={fortuneCards}
        firstCardId={selected[0].card.id}
        referralCode={user?.referralCode ?? null}
        whopUsername={user?.whopUsername ?? null}
      />

      <TipBlock spreadSlug={spread.slug} />

      {user?.isPremium && (
        <div className="mt-12 border-t border-ink-line/60 pt-8">
          <label className="block text-left">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Add a note (saved to your journal)</span>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (journalState === "saved") setJournalState("idle");
              }}
              placeholder="What does this reading bring up for you?"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-ink-raised/60 p-4 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold-dim focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="mt-14 flex flex-wrap items-center justify-center gap-4 border-t border-ink-line/60 pt-10">
        <button
          type="button"
          onClick={() => {
            track("share_click", { spread: spread.slug });
            setShowShareModal(true);
          }}
          className="rounded-full border border-ink-line px-6 py-3 text-sm uppercase tracking-[0.2em] text-moon-dim transition-colors hover:border-gold-dim hover:text-moon"
        >
          Share
        </button>
        {user?.isPremium ? (
          <button
            type="button"
            onClick={handleSaveToJournal}
            disabled={journalState !== "idle"}
            className="rounded-full border border-gold-dim px-6 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            {journalState === "saving" ? "Saving…" : journalState === "saved" ? "Saved ✓" : "Save to Journal"}
          </button>
        ) : (
          <Link
            href="/pricing"
            title="Unlocks with Premium"
            className="rounded-full border border-ink-line px-6 py-3 text-sm uppercase tracking-[0.2em] text-moon-dim/60 transition-colors hover:border-gold-dim hover:text-moon"
          >
            Save to Journal 🔒
          </Link>
        )}
        <button
          type="button"
          onClick={handleDrawAgain}
          className="cta-gold rounded-full px-7 py-3 text-sm font-medium uppercase tracking-[0.2em]"
        >
          Draw Again
        </button>
      </div>
      {bonusMessage && <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-gold">{bonusMessage}</p>}
      <div className="mt-6 text-center">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon">
          Back to Spreads
        </Link>
      </div>

      {showShareModal && (
        <ShareCardModal
          cardId={selected[0].card.id}
          onShareGranted={handleShareBonusFromModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </section>
  );
}
