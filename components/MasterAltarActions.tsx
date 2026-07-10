"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface MasterAltarActionsProps {
  handle: string;
  displayName: string;
  aiPriceLabel: string;
  voicePriceLabel: string;
  spotsLeft: number;
  dailyCapacity: number;
  vacationMode: boolean;
  deepLinkUrl: string | null;
}

// The purchase widget for a master's Altar page — deliberately NOT a 3-equal-column pricing
// table: the $39 personal reading is the visual centerpiece (real capacity, not staged urgency),
// the $9.90 AI reading sits quiet beside it as the easy "start here" option, and the $151 deep
// session (if she has one) is a slim external link, never faked when she doesn't.
export default function MasterAltarActions({
  handle,
  displayName,
  aiPriceLabel,
  voicePriceLabel,
  spotsLeft,
  dailyCapacity,
  vacationMode,
  deepLinkUrl,
}: MasterAltarActionsProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState<"ai_style" | "live_voice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justOrderedVoice, setJustOrderedVoice] = useState(false);

  useEffect(() => {
    // One-shot read of the initial URL on mount (set once after the LS redirect lands) — no
    // cascading-render risk, same pattern as JournalView's initial-state read.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ordered") === "live_voice") {
      setJustOrderedVoice(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function buy(kind: "ai_style" | "live_voice") {
    setError(null);
    if (!user) {
      router.push("/account");
      return;
    }
    setPending(kind);
    try {
      const res = await fetch("/api/masters/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterHandle: handle, kind, question: question.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(null);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error — please try again.");
      setPending(null);
    }
  }

  const voiceDisabled = vacationMode || spotsLeft <= 0 || pending !== null || loading;

  return (
    <div className="mt-10">
      {justOrderedVoice && (
        <p className="mb-6 rounded-lg border border-gold-dim bg-gold/5 px-4 py-3 text-sm text-gold-bright">
          Your reading is on its way — {displayName} will email you directly once it&apos;s ready.
        </p>
      )}

      <label className="block text-left">
        <span className="font-accent text-xs uppercase tracking-[0.2em] text-gold-dim">Your question (optional)</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What's on your mind right now?"
          rows={2}
          maxLength={500}
          className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-ink-raised/60 p-4 text-base text-moon transition-colors placeholder:text-moon-dim/50 focus:border-gold-dim focus:outline-none sm:text-sm"
        />
      </label>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:items-stretch">
        <div className="flex flex-col rounded-2xl border border-ink-line bg-ink-raised/40 p-6 text-left shadow-[inset_0_1px_0_rgba(228,200,148,0.06)]">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-moon-dim">Start here</p>
          <p className="font-display mt-2 text-3xl text-moon">{aiPriceLabel}</p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-moon-dim sm:text-xs">{displayName}&apos;s AI-trained reading style, delivered the moment you ask.</p>
          <button
            type="button"
            onClick={() => buy("ai_style")}
            disabled={pending !== null || loading}
            className="font-accent mt-5 rounded-full border border-gold-dim py-3 text-xs uppercase tracking-widest text-gold transition-[border-color,transform] duration-200 hover:border-gold active:scale-[0.97] disabled:opacity-60"
          >
            {pending === "ai_style" ? "…" : "Get Instant Reading"}
          </button>
        </div>

        <div className="relative flex flex-col rounded-2xl border border-gold bg-gradient-to-b from-gold/12 to-transparent p-6 text-left shadow-[0_0_50px_-14px_rgba(228,200,148,0.55),inset_0_1px_0_rgba(228,200,148,0.15)] max-sm:order-first">
          <span className="font-accent absolute -top-3 left-5 rounded-full bg-gold px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-ink shadow-[0_4px_14px_-4px_rgba(201,169,110,0.8)]">
            Her voice, for you
          </span>
          <p className="font-accent mt-2 text-[10px] uppercase tracking-[0.18em] text-gold">Most requested</p>
          <p className="font-display mt-2 text-4xl text-gold-bright">{voicePriceLabel}</p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-moon-dim sm:text-xs">
            {displayName} personally reads your cards and sends you her own voice — recorded just for your question.
          </p>
          <p className="font-accent mt-3 text-[11px] uppercase tracking-widest text-emerald-300">
            {vacationMode ? "Currently resting" : `${spotsLeft} of ${dailyCapacity} today's spots left`}
          </p>
          <button
            type="button"
            onClick={() => buy("live_voice")}
            disabled={voiceDisabled}
            className="cta-gold mt-5 rounded-full py-3.5 text-xs font-medium uppercase tracking-widest"
          >
            {pending === "live_voice" ? "…" : vacationMode || spotsLeft <= 0 ? "Fully Booked Today" : "Request Her Reading"}
          </button>
        </div>

        <div className="flex flex-col rounded-2xl border border-dashed border-ink-line p-6 text-left opacity-90">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-moon-dim">Go deeper</p>
          {deepLinkUrl ? (
            <>
              <p className="font-display mt-2 text-3xl text-moon">$151</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-moon-dim sm:text-xs">A full private 1:1 session with {displayName}, live.</p>
              <a
                href={deepLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="font-accent mt-5 py-2 text-center text-xs uppercase tracking-widest text-moon-dim underline underline-offset-4 transition-colors hover:text-moon"
              >
                Book on her site ↗
              </a>
            </>
          ) : (
            <p className="mt-2 flex-1 text-sm leading-relaxed text-moon-dim/70 sm:text-xs">{displayName} doesn&apos;t offer private sessions yet.</p>
          )}
        </div>
      </div>

      <p className="font-accent mt-6 text-[11px] uppercase tracking-[0.18em] text-moon-dim/70">
        Secure checkout · Instant delivery on AI readings · Refunded if never delivered
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!loading && !user && <p className="mt-4 text-xs text-moon-dim">Sign in to request a reading.</p>}
    </div>
  );
}
