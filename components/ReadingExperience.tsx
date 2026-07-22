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
import DeckQuickSwitch from "./DeckQuickSwitch";
import { useLocale } from "@/lib/useLocale";
import { getAppDict } from "@/lib/i18nApp";
import { getDict } from "@/lib/i18n";

type Phase = "checking" | "limited" | "intro" | "shuffle" | "select" | "reveal";

interface Selection {
  position: string;
  card: DeckCard;
  orientation: Orientation;
}

const THEME_VALUES: Theme[] = ["general", "love", "career", "wellness"];

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
  const locale = useLocale();
  const t = getAppDict(locale).reading;
  const themeT = getAppDict(locale).theme;
  const tw = locale === "zh-TW";
  // Locale-aware href: on /tc, keep internal links inside the 繁體 subtree.
  const L = (p: string) => (tw ? (p === "/" ? "/tc" : `/tc${p}`) : p);
  const pos = (p: string) => getAppDict(locale).positions[p] ?? p;
  const sp = getDict(locale).spreads[spread.slug];
  const spreadTitle = sp?.title ?? spread.title;
  const spreadSubtitle = sp?.subtitle ?? spread.subtitle;
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
  // "members_only" is a real state, not an error: saving a FREE draw is a member feature, and the
  // button used to just flick back to "idle" on the 403 — a click that visibly did nothing and
  // explained nothing. Readings the querent PAID for never reach it; the server files those itself.
  const [journalState, setJournalState] = useState<"idle" | "saving" | "saved" | "members_only">("idle");
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
    if (res.ok) {
      setJournalState("saved");
      return;
    }
    const data = await res.json().catch(() => null);
    setJournalState(data?.upgrade ? "members_only" : "idle");
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
      if (spread.slug === "daily" || spread.slug === "pick-a-card") setStreak(recordGuestDailyStreak(todayLocal()));
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
      setBonusMessage(t.bonusUnlocked);
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
      title: t.shareTitle,
      text: t.shareText,
      url: tw ? "https://wyndralore.com/tc" : "https://wyndralore.com",
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setBonusMessage(t.linkCopied);
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
    // A signed-OUT visitor who hits this wall is the whole ballgame: they drew once, they want
    // more, and this is the moment to convert them to a free account. The old copy pointed them at
    // "Sign in" (they have no account to sign into — an ad click is a brand-new person) and led
    // with "Premium members read without limits" (pushing a paid subscription at someone who won't
    // even register). Ad-funnel data (2026-07-20): guests who exhausted their one free draw
    // registered at 0%. So for guests, make REGISTERING the offer — a free account unlocks the
    // share/ad bonus draws that guests don't get — and save Premium for people who already signed up.
    const isGuest = !user;
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">
          {isGuest ? t.limitedGuestEyebrow : t.limitedMemberEyebrow}
        </p>
        <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">
          {isGuest ? t.limitedGuestTitle : t.limitedMemberTitle}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-moon-dim">
          {isGuest ? t.limitedGuestBody : t.limitedMemberBody}
        </p>

        {user ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            {quota?.shareBonusAvailable && (
              <button
                type="button"
                onClick={handleTextShare}
                className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
              >
                {t.shareForOne}
              </button>
            )}
            {quota?.adBonusAvailable && (
              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
              >
                {t.watchAdForOne}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href={L("/account?mode=register")}
              className="cta-gold rounded-full px-9 py-4 text-sm font-medium uppercase tracking-[0.2em]"
            >
              {t.createFreeAccount}
            </Link>
            <Link
              href={L("/account")}
              className="text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
            >
              {t.alreadyHaveSignIn}
            </Link>
          </div>
        )}

        <Link
          href={L("/pricing")}
          className="cta-gold mt-6 rounded-full px-7 py-3 text-sm font-medium uppercase tracking-[0.2em]"
        >
          {t.goPremiumUnlimited}
        </Link>
        <Link href={L("/")} className="mt-6 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon">
          {t.backToWyndralore}
        </Link>

        {showAdModal && <AdBonusModal onComplete={handleAdBonusComplete} onClose={() => setShowAdModal(false)} />}
      </section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.cardsUnit(spread.count)}</p>
        <h1 className="font-display mt-4 text-4xl text-moon sm:text-5xl">{spreadTitle}</h1>
        <p className="mt-4 text-sm leading-relaxed text-moon-dim sm:text-base">{spreadSubtitle}</p>

        {/* The daily ritual has two modes — one card, or three piles to choose from. One homepage
            tile, two spreads; the toggle just navigates between them (both count the streak). */}
        {(spread.slug === "daily" || spread.slug === "pick-a-card") && (
          <div className="mt-6 inline-flex overflow-hidden rounded-full border border-ink-line">
            <Link
              href={L("/reading/daily")}
              className={`px-5 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
                spread.slug === "daily" ? "bg-gold/15 text-gold-bright" : "text-moon-dim hover:text-moon"
              }`}
            >
              {t.oneCard}
            </Link>
            <Link
              href={L("/reading/pick-a-card")}
              className={`px-5 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
                spread.slug === "pick-a-card" ? "bg-gold/15 text-gold-bright" : "text-moon-dim hover:text-moon"
              }`}
            >
              {t.threePiles}
            </Link>
          </div>
        )}
        {spread.free && user && quota && !quota.isPremium && (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold-dim">
            {t.readingsLeft(quota.remaining ?? 0, quota.limit ?? 0)}
          </p>
        )}
        {creditUnlock && (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold-bright">
            {t.creditUnlock(creditUnlock.creditsRemaining)}
          </p>
        )}

        <label className="mt-10 w-full text-left">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.questionLabel}</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.questionPlaceholder}
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-ink-raised/60 p-4 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold-dim focus:outline-none"
          />
        </label>

        <div className="mt-8 w-full text-left">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.lensLabel}</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {THEME_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  theme === value
                    ? "border-gold bg-gold/10 text-gold-bright"
                    : "border-ink-line text-moon-dim hover:border-gold-dim"
                }`}
              >
                {themeT[value]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleBegin}
          className="cta-gold mt-10 w-full max-w-xs rounded-full px-9 py-4 text-sm font-medium uppercase tracking-[0.2em] sm:w-auto"
        >
          {t.beginShuffling}
        </button>
      </section>
    );
  }

  if (phase === "shuffle") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spreadTitle}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">{t.shuffleTitle}</h1>
        <p className="mt-3 max-w-sm text-sm text-moon-dim">{t.shuffleBody}</p>

        <div className="mt-12">
          <DeckStack isShuffling={isShuffling} />
        </div>

        <p className="mt-8 h-4 text-xs uppercase tracking-[0.3em] text-gold-dim transition-opacity duration-500">
          {isShuffling ? t.shuffling : t.deckReady}
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handleShuffleAgain}
            className="rounded-full border border-gold-dim px-7 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
          >
            {t.shuffleBtn}
          </button>
          <button
            type="button"
            onClick={() => setPhase("select")}
            className={`cta-gold rounded-full px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] ${
              isShuffling ? "" : "btn-breathe"
            }`}
          >
            {t.continueToSelect}
          </button>
        </div>
        <DeckQuickSwitch kind="back" className="mt-8" />
      </section>
    );
  }

  if (phase === "select") {
    return (
      <section className="mx-auto flex min-h-[75vh] w-full min-w-0 max-w-4xl flex-col px-6 py-14 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spreadTitle}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">{t.chooseCards}</h1>
        <p className="mt-3 text-sm text-moon-dim">
          {selected.length < spread.count ? t.selectMore(spread.count - selected.length) : t.revealing}
        </p>

        <div className="mx-auto mt-8 flex flex-wrap justify-center gap-4">
          {spread.positions.map((pos_, i) => {
            const s = selected[i];
            return (
              <div key={pos_} className="w-16 sm:w-20">
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
                <p className="mt-1 text-[10px] uppercase tracking-widest text-moon-dim">{pos(pos_)}</p>
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
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{spreadTitle}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">{t.yourReading}</h1>
        {question.trim() && <p className="mt-3 text-sm italic text-moon-dim">&ldquo;{question.trim()}&rdquo;</p>}
        {(spread.slug === "daily" || spread.slug === "pick-a-card") && streak !== null && streak > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold-dim/60 px-4 py-1.5 text-xs tracking-wide text-gold-bright">
            <span aria-hidden>🔥</span>
            {streak === 1 ? t.streakDay1 : t.streakN(streak)}
          </p>
        )}
        <div className="mt-5">
          <DeckQuickSwitch kind="face" />
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {selected.map((s, i) => (
          <DrawnCardBlock key={s.card.id} position={pos(s.position)} deckCard={s.card} orientation={s.orientation} theme={theme} index={i} />
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
        // A reading they bought outright is filed by the server the moment it finishes, on any
        // plan — so show it as saved rather than inviting a Save that would duplicate it.
        onAutoSavedToJournal={() => setJournalState("saved")}
      />

      <FortuneShareCard
        spreadTitle={spreadTitle}
        cards={fortuneCards}
        firstCardId={selected[0].card.id}
        referralCode={user?.referralCode ?? null}
        whopUsername={user?.whopUsername ?? null}
      />

      <TipBlock spreadSlug={spread.slug} />

      {user?.isPremium && (
        <div className="mt-12 border-t border-ink-line/60 pt-8">
          <label className="block text-left">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.addNoteLabel}</span>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (journalState === "saved") setJournalState("idle");
              }}
              placeholder={t.notePlaceholder}
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
          {t.share}
        </button>
        {/* "Saved" wins over the plan check: a reading bought outright is filed by the server on
            any plan, so a free buyer must not be shown a locked padlock over something that is
            already sitting in their Journal. Link it, so they can go and see that it really is. */}
        {journalState === "saved" ? (
          <Link
            href={L("/journal")}
            className="rounded-full border border-gold-dim px-6 py-3 text-sm uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold"
          >
            {t.savedViewJournal}
          </Link>
        ) : user?.isPremium ? (
          <button
            type="button"
            onClick={handleSaveToJournal}
            disabled={journalState === "saving"}
            className="rounded-full border border-gold-dim px-6 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            {journalState === "saving" ? t.saving : journalState === "members_only" ? t.membersOnlySeePlans : t.saveToJournal}
          </button>
        ) : (
          <Link
            href={L("/pricing")}
            title={t.saveLockedTitle}
            className="rounded-full border border-ink-line px-6 py-3 text-sm uppercase tracking-[0.2em] text-moon-dim/60 transition-colors hover:border-gold-dim hover:text-moon"
          >
            {t.saveToJournalLocked}
          </Link>
        )}
        <button
          type="button"
          onClick={handleDrawAgain}
          className="cta-gold rounded-full px-7 py-3 text-sm font-medium uppercase tracking-[0.2em]"
        >
          {t.drawAgain}
        </button>
      </div>
      {bonusMessage && <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-gold">{bonusMessage}</p>}
      <div className="mt-6 text-center">
        <Link href={L("/")} className="text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon">
          {t.backToSpreads}
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
