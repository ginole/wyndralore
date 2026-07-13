"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Master-facing self-service withdrawal request (app/masters/dashboard). Only ever submits a
// REQUEST — there's no payment API wired up, so the admin still sends the money by hand and marks
// it paid in the admin dashboard. Disabled below MIN_WITHDRAWAL_USD; the server enforces the same
// floor (see app/api/masters/withdraw/route.ts), this is just UX.
export default function WithdrawButton({ availableUsd, minWithdrawalUsd, payoutMethod }: { availableUsd: number; minWithdrawalUsd: number; payoutMethod: string | null }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligible = availableUsd >= minWithdrawalUsd;

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/masters/withdraw", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong — please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={!eligible || submitting}
        className="rounded-full border border-gold-dim bg-ink-raised/60 px-6 py-2 text-xs uppercase tracking-[0.2em] text-gold-bright transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Requesting…" : "Request Withdrawal"}
      </button>
      <p className="mt-2 text-xs text-moon-dim">
        {eligible
          ? `We process requests by hand within a few business days, to your ${payoutMethod ?? "payout method (not set — email us)"}.`
          : `Minimum $${minWithdrawalUsd.toFixed(2)} to withdraw — you have $${availableUsd.toFixed(2)} available so far.`}
      </p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
