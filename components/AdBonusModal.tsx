"use client";

import { useEffect, useState } from "react";

const AD_SECONDS = 15;

interface AdBonusModalProps {
  onComplete: () => void;
  onClose: () => void;
}

// Fallback rewarded-ad placeholder per PRD §4.1: "若网页端激励广告不可用，降级方案：
// 观看一段15秒展示广告页面后发放". Swap in real Google AdSense rewarded ads later —
// this satisfies the same contract (a timed watch → +1 draw).
export default function AdBonusModal({ onComplete, onClose }: AdBonusModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(AD_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const done = secondsLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-6" role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-2xl border border-ink-line bg-ink-raised p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Wyndralore</p>
        <h2 className="font-display mt-3 text-2xl text-moon">
          {done ? "Thanks for watching" : "Your bonus reading unlocks shortly"}
        </h2>
        <div className="mx-auto mt-6 flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-ink-line text-sm text-moon-dim">
          Ad placeholder
        </div>
        <p className="mt-5 text-sm text-moon-dim">{done ? "You earned +1 reading." : `${secondsLeft}s remaining…`}</p>
        <div className="mt-6 flex justify-center gap-3">
          {!done && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink-line px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-moon-dim hover:border-gold-dim hover:text-moon"
            >
              Cancel
            </button>
          )}
          {done && (
            <button
              type="button"
              onClick={onComplete}
              className="rounded-full bg-gold px-7 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright"
            >
              Claim +1
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
