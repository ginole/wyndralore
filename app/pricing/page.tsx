"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PLANS, PlanId } from "@/lib/pricing";
import { pixelTrack } from "@/lib/pixel";

const PLAN_ORDER: PlanId[] = ["monthly", "yearly", "lifetime"];

export default function PricingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectPlan(plan: PlanId) {
    setError(null);
    if (loading) return;
    if (!user) {
      router.push("/account");
      return;
    }
    setPending(plan);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start your order.");
        return;
      }
      // FB ad conversion signal — user committed to a plan and reached payment instructions.
      pixelTrack("InitiateCheckout", { value: PLANS[plan].amountUsd, currency: "USD", content_name: plan });
      router.push(`/order/${data.order.code}`);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Wyndralore Premium</p>
      <h1 className="font-display mt-4 text-4xl text-moon sm:text-5xl">Read without limits</h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-moon-dim">
        No sneaky auto-renewals. You&apos;re always in control — every plan is a one-time payment, and nothing
        renews without you coming back to pay again.
      </p>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-2xl border p-8 text-left ${
                plan.highlight ? "border-gold bg-ink-raised md:-translate-y-3 md:scale-105" : "border-ink-line bg-ink-raised/50"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-ink">
                  Most Popular
                </span>
              )}
              <h2 className="font-display text-2xl text-moon">{plan.label}</h2>
              <p className="mt-4">
                <span className="font-display text-4xl text-gold-bright">{plan.priceLabel}</span>
                <span className="ml-2 text-sm text-moon-dim">{plan.cadence}</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-moon-dim">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <span className="text-gold">✦</span> {perk}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSelectPlan(id)}
                disabled={pending !== null}
                className={`mt-8 rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 ${
                  plan.highlight ? "bg-gold text-ink hover:bg-gold-bright" : "border border-gold-dim text-moon hover:border-gold hover:text-gold"
                }`}
              >
                {pending === id ? "Please wait…" : "Get Premium"}
              </button>
              <p className="mt-3 text-center text-[11px] text-moon-dim/70">One-time payment. No auto-renewal.</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
