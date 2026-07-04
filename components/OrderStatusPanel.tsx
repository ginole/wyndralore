"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WireDetailRow } from "@/lib/wiseAccount";

type OrderStatus = "pending" | "awaiting_confirmation" | "paid" | "underpaid" | "expired";

interface OrderStatusPanelProps {
  code: string;
  initialStatus: OrderStatus;
  amountUsd: number;
  planLabel: string;
  wireDetails: WireDetailRow[];
}

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "awaiting_confirmation"];

export default function OrderStatusPanel({ code, initialStatus, amountUsd, planLabel, wireDetails }: OrderStatusPanelProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ACTIVE_STATUSES.includes(status)) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/orders/${code}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.order.status);
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, code]);

  async function handleMarkPaid() {
    setMarking(true);
    try {
      const res = await fetch(`/api/orders/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid_attempt" }),
      });
      const data = await res.json();
      if (res.ok) setStatus(data.order.status);
    } finally {
      setMarking(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op, the code is still visible to copy manually
    }
  }

  if (status === "paid") {
    return (
      <div className="mt-10 rounded-2xl border border-gold/40 bg-ink-raised/60 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Payment confirmed</p>
        <h2 className="font-display mt-3 text-2xl text-gold-bright">You&apos;re Premium 🎉</h2>
        <p className="mt-3 text-sm text-moon-dim">A confirmation email is on its way. Enjoy unlimited readings.</p>
        <Link
          href="/account"
          className="mt-6 inline-block rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright"
        >
          Go to Account
        </Link>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="mt-10 rounded-2xl border border-ink-line bg-ink-raised/60 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Order expired</p>
        <h2 className="font-display mt-3 text-2xl text-moon">This order has expired</h2>
        <p className="mt-3 text-sm text-moon-dim">
          Orders are held for 48 hours. If you already sent payment, it will be matched manually — otherwise, start a new order.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright"
        >
          Start a New Order
        </Link>
      </div>
    );
  }

  if (status === "underpaid") {
    return (
      <div className="mt-10 rounded-2xl border border-ink-line bg-ink-raised/60 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Payment received — amount short</p>
        <h2 className="font-display mt-3 text-2xl text-moon">We received less than expected</h2>
        <p className="mt-3 text-sm text-moon-dim">
          We received a payment referencing this order, but the amount was below ${amountUsd.toFixed(2)}. We&apos;ve emailed you
          about topping up the difference — reply to that email or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-ink-line bg-ink-raised/60 p-8 text-left">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-gold-dim">{planLabel} · Order</p>

      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="font-display text-3xl tracking-widest text-gold-bright">{code}</span>
        <button type="button" onClick={handleCopy} className="text-xs uppercase tracking-widest text-moon-dim underline underline-offset-4 hover:text-moon">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-4 text-center text-sm text-gold-bright">
        Important: put <strong>{code}</strong> in the transfer <strong>Reference</strong> field, exactly as shown. Payments
        without this reference can&apos;t be matched automatically.
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between border-b border-ink-line/60 pb-3">
          <dt className="text-moon-dim">Amount due</dt>
          <dd className="text-moon">${amountUsd.toFixed(2)} USD</dd>
        </div>
        {wireDetails.map((row, i) => (
          <div
            key={row.label}
            className={`flex justify-between gap-4 ${i < wireDetails.length - 1 ? "border-b border-ink-line/60 pb-3" : ""}`}
          >
            <dt className="shrink-0 text-moon-dim">{row.label}</dt>
            <dd className="text-right text-moon">{row.value}</dd>
          </div>
        ))}
      </dl>

      {status === "pending" && (
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={marking}
          className="mt-8 w-full rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.01] hover:bg-gold-bright disabled:opacity-60"
        >
          {marking ? "Please wait…" : "I've Completed the Transfer"}
        </button>
      )}

      {status === "awaiting_confirmation" && (
        <p className="mt-8 text-center text-sm text-moon-dim">
          Thanks — we&apos;re watching for your payment. It&apos;s usually confirmed within 5 minutes; keep an eye on your email.
        </p>
      )}
    </div>
  );
}
