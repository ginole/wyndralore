"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Theme } from "@/lib/types";
import WhopCheckoutModal, { WhopCheckoutTarget } from "@/components/WhopCheckoutModal";
import { storedWhopAffiliate } from "@/components/WhopAffiliateCapture";

interface ReadingCard {
  position: string;
  name: string;
  orientation: "upright" | "reversed";
}

interface AiQuotaStatus {
  isPremium: boolean;
  deepReadsRemaining: number;
  deepReadsLimit: number;
  extraReadsAvailable: number;
  cycleResetsAt: string | null;
  /** Purchased follow-up-question credits (kind "ai_followup"). */
  followupCredits?: number;
}

interface AiReadingPanelProps {
  cards: ReadingCard[];
  theme: Theme;
  question?: string;
  isAuthenticated: boolean;
  isPremium: boolean;
  spreadSlug: string;
  onDeepReadingComplete?: (text: string) => void;
  /** Called right before checkout so the caller can stash the current reading for restoration on
   * return (see the `?resume=1` handling in ReadingExperience) — otherwise the buyer would land back
   * on a blank page and have to redraw from scratch after paying.
   *
   * Now a safety net rather than the main path: checkout runs in a modal with skipRedirect, so the
   * page normally never unloads. It still earns its place — a 3-D Secure challenge or the raw
   * hosted-checkout URL can navigate the top frame, and the session's redirect_url points back here
   * with ?resume=1 for exactly that case. Cheap to keep, and losing a paid reading is expensive. */
  onBeforePurchase?: () => void;
  /** Fired when the server has already filed this reading in the Journal because the querent
   *  bought it outright — see the paid-reading branch in app/api/ai-reading/deep/route.ts. */
  onAutoSavedToJournal?: () => void;
}

type DeepState = "idle" | "loading" | "streaming" | "done" | "paywall" | "error" | "not_configured";

const COPY = {
  en: {
    brand: "A Tarot-Attuned Reading Engine",
    tagline:
      "Not a generic chatbot guessing at your spread. This engine is tuned to tarot alone — steeped in the centuries-old meaning of the very cards you drew, and reading them in the exact positions before you, against your own question. No stranger's bias, no judgment: just the quiet pattern your cards are tracing, finally put into words.",
    reveal: "Reveal My Deep Reading",
    generating: "Reading the energy between your cards…",
    notSavedHint:
      "Members can save every reading to their Journal — this one won't be saved anywhere. Copy or screenshot it now to keep it.",
    quotaLine: (remaining: number, limit: number) => `${remaining} of ${limit} free deep readings left this cycle`,
    priceHintMember: "$1.99 once your free readings run out this cycle",
    priceHintGuest: "$2.99 to reveal this reading",
    buySingle: "Unlock this reading — $2.99",
    buyOverage: "One more reading — $1.99 (member rate)",
    signInHint: "Sign in free, then $2.99 to reveal — or free with membership",
    signIn: "Sign in to continue",
  },
  zh: {
    brand: "Wyndralore 智能觉察引擎",
    tagline:
      "我们的深度解读基于 78 张卡牌数百年来流传的神秘学象征逻辑。它没有人类占卜师的个人偏见，更不会对你的私密问题进行道德审判。它是一面绝对客观、隐秘的“心理魔镜”，利用先进的 AI 语言逻辑，为你梳理潜意识中被忽略的盲区。",
  },
};

/** `onDone` carries the terminal event's payload — currently `{journalEntryId}` when the server
 *  already filed a bought-and-paid-for reading in the Journal on the querent's behalf. */
async function readSse(
  res: Response,
  onChunk: (text: string) => void,
  onDone?: (payload: { journalEntryId?: string | null }) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      if (evt.startsWith("event: error")) throw new Error("Generation failed mid-stream.");
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      if (evt.startsWith("event: done")) {
        try {
          onDone?.(JSON.parse(dataLine.slice(5).trim()));
        } catch {
          // a done event we can't parse still means done — nothing to recover
        }
        continue;
      }
      try {
        onChunk(JSON.parse(dataLine.slice(5).trim()));
      } catch {
        // ignore malformed keep-alive chunks
      }
    }
  }
}

export default function AiReadingPanel({
  cards,
  theme,
  question,
  isAuthenticated,
  isPremium,
  spreadSlug,
  onDeepReadingComplete,
  onBeforePurchase,
  onAutoSavedToJournal,
}: AiReadingPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [deepState, setDeepState] = useState<DeepState>("idle");
  const [deepText, setDeepText] = useState("");
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [checkout, setCheckout] = useState<WhopCheckoutTarget | null>(null);
  // Follow-up question on a finished deep reading ($1.99 / a purchased credit).
  const [followState, setFollowState] = useState<"offer" | "asking" | "loading" | "streaming" | "done" | "error">("offer");
  const [followQuestion, setFollowQuestion] = useState("");
  const [followText, setFollowText] = useState("");
  // Which product the open checkout modal is buying, so onComplete polls the right balance.
  const purchaseKindRef = useRef<"read" | "followup">("read");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch("/api/ai-reading/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards, theme, question }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.text) setSummary(data.text);
      })
      .catch(() => {});

    if (isAuthenticated) {
      fetch("/api/ai-reading/quota", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data?.configured === false) return;
          if (data?.quota) setQuota(data.quota);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReveal() {
    if (!isAuthenticated) {
      setDeepState("paywall");
      return;
    }
    setDeepState("loading");
    setDeepText("");
    try {
      const res = await fetch("/api/ai-reading/deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // spreadSlug rides along so the server can file a PAID reading in the Journal itself —
        // a JournalEntry needs to know which spread it belongs to.
        body: JSON.stringify({ cards, theme, question, spreadSlug }),
      });
      if (res.status === 402) {
        const data = await res.json().catch(() => null);
        if (data?.quota) setQuota(data.quota);
        setDeepState("paywall");
        return;
      }
      if (res.status === 503) {
        setDeepState("not_configured");
        return;
      }
      if (!res.ok) {
        setDeepState("error");
        return;
      }
      setDeepState("streaming");
      let received = "";
      await readSse(
        res,
        (chunk) => {
          received += chunk;
          setDeepText((prev) => prev + chunk);
        },
        // The server files paid readings in the Journal itself; tell the page so it shows this as
        // already saved rather than offering a Save button that would only file a duplicate.
        (payload) => {
          if (payload?.journalEntryId) onAutoSavedToJournal?.();
        }
      );
      // A killed serverless function (e.g. hitting Vercel's execution time limit) can close
      // the connection cleanly with zero bytes sent — no thrown error, just an empty result.
      if (received) {
        setDeepState("done");
        onDeepReadingComplete?.(received);
      } else {
        setDeepState("error");
      }
    } catch {
      setDeepState("error");
    }
  }

  /**
   * Whop's onComplete only means "the card went through" — the READ is granted by our webhook, which
   * can land a beat later. Poll briefly instead of immediately re-rendering a stale "0 reads left"
   * at someone who just paid. Gives up quietly after ~8s; the credit still lands, it just needs a
   * refresh to show.
   *
   * Then REVEAL IT. deepState is still "paywall" at this point — that is what put the buyer in
   * checkout — and refreshing the quota alone does not move it, so without this the buyer lands back
   * on the very button they just paid at, with an unspent credit and nothing to show for their money.
   * That is a refund in this category, and refunds are what got two processors to drop us. The
   * follow-up sibling below always did the equivalent (setFollowState("asking")); this path simply
   * never got it. Reveal even when the poll times out: handleReveal 402s harmlessly back to the
   * paywall if the credit really has not landed, whereas leaving a paid-for read ungenerated does not.
   */
  async function refreshQuotaAfterPurchase() {
    const before = quota?.extraReadsAvailable ?? 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const res = await fetch("/api/ai-reading/quota", { cache: "no-store" });
        const data = await res.json();
        if (data?.quota) {
          setQuota(data.quota);
          if (data.quota.extraReadsAvailable > before) {
            void handleReveal();
            return;
          }
        }
      } catch {
        /* keep polling */
      }
    }
    void handleReveal();
  }

  async function handlePurchase(kind: "ai_single" | "ai_overage") {
    setPurchasing(true);
    purchaseKindRef.current = "read";
    onBeforePurchase?.();
    try {
      const res = await fetch("/api/ai-reading/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, spreadSlug, whopAffiliate: storedWhopAffiliate() }),
      });
      const data = await res.json().catch(() => null);
      if (data?.planId && data?.sessionId) {
        setCheckout({ planId: data.planId, sessionId: data.sessionId });
      }
      setPurchasing(false);
    } catch {
      setPurchasing(false);
    }
  }

  async function handleFollowupPurchase() {
    setPurchasing(true);
    purchaseKindRef.current = "followup";
    onBeforePurchase?.();
    try {
      const res = await fetch("/api/orders/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "ai_followup",
          redirectPath: `/reading/${spreadSlug}?resume=1`,
          whopAffiliate: storedWhopAffiliate(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.planId && data?.sessionId) {
        setCheckout({ planId: data.planId, sessionId: data.sessionId });
      }
      setPurchasing(false);
    } catch {
      setPurchasing(false);
    }
  }

  /** Same webhook-lag polling as refreshQuotaAfterPurchase, but watching the follow-up balance. */
  async function refreshFollowupAfterPurchase() {
    const before = quota?.followupCredits ?? 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const res = await fetch("/api/ai-reading/quota", { cache: "no-store" });
        const data = await res.json();
        if (data?.quota) {
          setQuota(data.quota);
          if ((data.quota.followupCredits ?? 0) > before) {
            setFollowState("asking");
            return;
          }
        }
      } catch {
        /* keep polling */
      }
    }
  }

  async function handleAskFollowup() {
    const q = followQuestion.trim();
    if (!q) return;
    setFollowState("loading");
    setFollowText("");
    try {
      const res = await fetch("/api/ai-reading/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, theme, question, previousReading: deepText, followupQuestion: q }),
      });
      if (res.status === 402) {
        // Credit vanished (spent in another tab) — fall back to the offer.
        setFollowState("offer");
        return;
      }
      if (!res.ok) {
        setFollowState("error");
        return;
      }
      setFollowState("streaming");
      let received = "";
      await readSse(res, (chunk) => {
        received += chunk;
        setFollowText((prev) => prev + chunk);
      });
      if (received) {
        setFollowState("done");
        // Reflect the spent credit without waiting on a refetch.
        setQuota((prev) => (prev ? { ...prev, followupCredits: Math.max(0, (prev.followupCredits ?? 1) - 1) } : prev));
      } else {
        setFollowState("error");
      }
    } catch {
      setFollowState("error");
    }
  }

  return (
    <div className="mt-12 border-t border-ink-line/60 pt-8">
      <WhopCheckoutModal
        target={checkout}
        onClose={() => setCheckout(null)}
        onComplete={() => {
          setCheckout(null);
          if (purchaseKindRef.current === "followup") void refreshFollowupAfterPurchase();
          else void refreshQuotaAfterPurchase();
        }}
      />
      {summary && (
        <p className="text-center text-sm italic text-gold-dim" aria-live="polite">
          {summary}
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-gold-dim/40 bg-ink-raised/40 p-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{COPY.en.brand}</p>

        {deepState === "idle" && (
          <>
            <p className="mx-auto mt-3 max-w-xl text-sm text-moon-dim">{COPY.en.tagline}</p>
            <p className="mt-3 text-xs text-moon-dim/70">
              {!isAuthenticated
                ? COPY.en.signInHint
                : quota?.isPremium
                  ? quota.deepReadsRemaining + quota.extraReadsAvailable > 0
                    ? COPY.en.quotaLine(quota.deepReadsRemaining + quota.extraReadsAvailable, quota.deepReadsLimit)
                    : COPY.en.priceHintMember
                  : COPY.en.priceHintGuest}
            </p>
            <button
              type="button"
              onClick={handleReveal}
              className="mt-5 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
            >
              {COPY.en.reveal}
            </button>
          </>
        )}

        {deepState === "loading" && <p className="mt-4 text-sm text-moon-dim">{COPY.en.generating}</p>}

        {(deepState === "streaming" || deepState === "done") && (
          <>
            <p className="mx-auto mt-4 max-w-xl whitespace-pre-wrap text-left text-sm leading-relaxed text-moon">{deepText}</p>
            {deepState === "done" && !isPremium && (
              <p className="mt-4 text-xs text-gold-dim">{COPY.en.notSavedHint}</p>
            )}

            {/* One follow-up question against the reading just given ($1.99 / a purchased credit). */}
            {deepState === "done" && (
              <div className="mt-6 border-t border-ink-line/60 pt-5">
                {(followState === "streaming" || followState === "done") && (
                  <>
                    <p className="text-left text-xs uppercase tracking-[0.2em] text-gold-dim">Your follow-up</p>
                    <p className="mx-auto mt-2 max-w-xl whitespace-pre-wrap text-left text-sm leading-relaxed text-moon">{followText}</p>
                  </>
                )}
                {followState === "loading" && <p className="text-sm text-moon-dim">Listening to the cards again…</p>}
                {followState === "error" && (
                  <p className="text-sm text-moon-dim">Something went wrong with your follow-up. Try again.</p>
                )}
                {followState === "asking" && (
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">Ask your follow-up question</p>
                    <textarea
                      value={followQuestion}
                      onChange={(e) => setFollowQuestion(e.target.value.slice(0, 300))}
                      placeholder="What would you like the cards to clarify?"
                      rows={2}
                      className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-ink px-4 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold-dim focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAskFollowup}
                      disabled={!followQuestion.trim()}
                      className="mt-3 rounded-full bg-gold px-6 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-50"
                    >
                      Ask the cards
                    </button>
                  </div>
                )}
                {followState === "offer" &&
                  ((quota?.followupCredits ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setFollowState("asking")}
                      className="rounded-full border border-gold-dim px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
                    >
                      Ask a follow-up — you have a credit
                    </button>
                  ) : (
                    <>
                      <p className="text-sm text-moon-dim">Something in this reading you want to go deeper on?</p>
                      <button
                        type="button"
                        onClick={handleFollowupPurchase}
                        disabled={purchasing}
                        className="mt-3 rounded-full border border-gold-dim px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
                      >
                        {purchasing ? "One moment…" : "Ask one follow-up question — $1.99"}
                      </button>
                    </>
                  ))}
              </div>
            )}
          </>
        )}

        {deepState === "not_configured" && <p className="mt-4 text-sm text-moon-dim">AI deep readings are coming soon.</p>}

        {deepState === "error" && <p className="mt-4 text-sm text-moon-dim">Something went wrong generating your reading. Try again.</p>}

        {deepState === "paywall" && (
          <div className="mt-4">
            {!isAuthenticated ? (
              <Link href="/account" className="text-sm text-gold underline underline-offset-4">
                {COPY.en.signIn}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handlePurchase(quota?.isPremium ? "ai_overage" : "ai_single")}
                disabled={purchasing}
                className="rounded-full border border-gold-dim px-6 py-3 text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
              >
                {purchasing ? "Redirecting…" : quota?.isPremium ? COPY.en.buyOverage : COPY.en.buySingle}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
