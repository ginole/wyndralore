"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Theme } from "@/lib/types";
import WhopCheckoutModal, { WhopCheckoutTarget } from "@/components/WhopCheckoutModal";

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

async function readSse(res: Response, onChunk: (text: string) => void): Promise<void> {
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
      if (evt.startsWith("event: done")) continue;
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
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
}: AiReadingPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [deepState, setDeepState] = useState<DeepState>("idle");
  const [deepText, setDeepText] = useState("");
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [checkout, setCheckout] = useState<WhopCheckoutTarget | null>(null);
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
        body: JSON.stringify({ cards, theme, question }),
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
      await readSse(res, (chunk) => {
        received += chunk;
        setDeepText((prev) => prev + chunk);
      });
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
          if (data.quota.extraReadsAvailable > before) return;
        }
      } catch {
        /* keep polling */
      }
    }
  }

  async function handlePurchase(kind: "ai_single" | "ai_overage") {
    setPurchasing(true);
    onBeforePurchase?.();
    try {
      const res = await fetch("/api/ai-reading/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, spreadSlug }),
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

  return (
    <div className="mt-12 border-t border-ink-line/60 pt-8">
      <WhopCheckoutModal
        target={checkout}
        onClose={() => setCheckout(null)}
        onComplete={() => {
          setCheckout(null);
          void refreshQuotaAfterPurchase();
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
