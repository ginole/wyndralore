"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  netAvailableUsd: number;
  requestedUsd: number;
  minPayoutUsd: number;
  payoutMethod: string | null;
  payoutHandle: string | null;
  paused: boolean;
}

export default function PartnerPayout({ netAvailableUsd, requestedUsd, minPayoutUsd, payoutMethod, payoutHandle, paused }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState(payoutMethod ?? "paypal");
  const [handle, setHandle] = useState(payoutHandle ?? "");
  const [editing, setEditing] = useState(!payoutMethod);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function saveMethod(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/affiliate/payout-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, handle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "error", text: data.error ?? "Could not save." });
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setMsg({ type: "error", text: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function requestWithdraw() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/affiliate/withdraw", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "error", text: data.error ?? "Could not request payout." });
        return;
      }
      setMsg({ type: "ok", text: "Payout requested — we'll send it to your account shortly." });
    } catch {
      setMsg({ type: "error", text: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (paused) return null;

  const canWithdraw = netAvailableUsd >= minPayoutUsd && !!payoutMethod && !editing;

  return (
    <div className="mt-6 rounded-2xl border border-gold-dim bg-ink-raised/60 p-5">
      {editing ? (
        <form onSubmit={saveMethod} className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">Where should we send your payouts?</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
            >
              <option value="paypal">PayPal</option>
              <option value="wise">Wise</option>
            </select>
            <input
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="PayPal / Wise email"
              className="flex-1 rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-gold px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">Payout method</p>
            <p className="mt-1 text-sm text-moon">
              {payoutMethod === "wise" ? "Wise" : "PayPal"} · {payoutHandle}{" "}
              <button type="button" onClick={() => setEditing(true)} className="ml-2 text-xs text-gold underline underline-offset-2">
                change
              </button>
            </p>
          </div>
          <button
            type="button"
            onClick={requestWithdraw}
            disabled={!canWithdraw || busy}
            className="rounded-full bg-gold px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {busy ? "Requesting…" : `Request payout ($${netAvailableUsd.toFixed(2)})`}
          </button>
        </div>
      )}
      {!editing && requestedUsd > 0 && (
        <p className="mt-3 text-xs text-gold">
          ${requestedUsd.toFixed(2)} payout requested — we&apos;re processing it. You&apos;ll get it in your account soon.
        </p>
      )}
      {!editing && requestedUsd === 0 && netAvailableUsd < minPayoutUsd && (
        <p className="mt-3 text-xs text-moon-dim/70">Minimum payout is ${minPayoutUsd}. Keep sharing your link!</p>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.type === "error" ? "text-red-400" : "text-gold"}`}>{msg.text}</p>}
    </div>
  );
}
