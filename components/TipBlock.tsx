"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import WhopCheckoutModal, { WhopCheckoutTarget } from "./WhopCheckoutModal";
import { TIP_PRICE_USD } from "@/lib/pricing";

/**
 * A small "leave a tip" block on the reading result page, right where the reader has just
 * received the value. Deliberately quiet — one line and a button, no guilt. Signed-in only
 * (checkout needs an account to attach the order to).
 */
export default function TipBlock({ spreadSlug }: { spreadSlug: string }) {
  const { user } = useAuth();
  const [target, setTarget] = useState<WhopCheckoutTarget | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "thanked" | "error">("idle");

  if (!user) return null;

  if (state === "thanked") {
    return (
      <div className="mt-10 rounded-2xl border border-gold-dim/50 bg-ink-raised/30 p-5 text-center">
        <p className="text-sm text-gold-bright">Thank you — truly. 💛</p>
      </div>
    );
  }

  async function handleTip() {
    setState("loading");
    try {
      // Deliberately NO affiliate code here: a tip is gratitude to the maker, not a conversion —
      // the Support product's affiliate percentage is 0 on Whop too.
      const res = await fetch("/api/orders/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "tip", redirectPath: `/reading/${spreadSlug}` }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTarget({ planId: data.planId, sessionId: data.sessionId });
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-ink-line bg-ink-raised/30 p-5 text-center">
      <p className="text-sm text-moon-dim">
        Did this reading land? Wyndralore is built and kept alive by one person.
      </p>
      <button
        type="button"
        onClick={handleTip}
        disabled={state === "loading"}
        className="mt-3 rounded-full border border-gold-dim px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
      >
        {state === "loading" ? "One moment…" : `Leave a $${TIP_PRICE_USD} tip 💛`}
      </button>
      {state === "error" && <p className="mt-2 text-xs text-red-400">Couldn&apos;t start checkout — try again.</p>}
      <WhopCheckoutModal
        target={target}
        email={user.email}
        onClose={() => setTarget(null)}
        onComplete={() => {
          setTarget(null);
          setState("thanked");
        }}
      />
    </div>
  );
}
