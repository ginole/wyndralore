"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PLANS, PURCHASABLE_PLANS, PlanId, BillingMode, planOption } from "@/lib/pricing";
import { pixelTrack } from "@/lib/pixel";
import WhopCheckoutModal, { WhopCheckoutTarget } from "@/components/WhopCheckoutModal";
import { storedWhopAffiliate } from "@/components/WhopAffiliateCapture";

export default function PricingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<BillingMode>("sub");
  const [pending, setPending] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<WhopCheckoutTarget | null>(null);

  // A plan without a subscription price is one-time only; every other plan follows the toggle.
  function modeFor(plan: PlanId): BillingMode {
    return PLANS[plan].sub ? mode : "onetime";
  }

  async function handleSelectPlan(plan: PlanId) {
    setError(null);
    if (loading) return;
    if (!user) {
      router.push("/account");
      return;
    }
    const billingMode = modeFor(plan);
    setPending(plan);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingMode, whopAffiliate: storedWhopAffiliate() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start your order.");
        return;
      }
      // FB ad conversion signal — user committed to a plan and reached checkout.
      pixelTrack("InitiateCheckout", { value: planOption(plan, billingMode).amountUsd, currency: "USD", content_name: plan });
      setCheckout({ planId: data.planId, sessionId: data.sessionId });
    } catch {
      setError("Could not open checkout — please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10">
      <WhopCheckoutModal
        target={checkout}
        email={user?.email}
        onClose={() => setCheckout(null)}
        // The webhook is what actually grants the plan; this just moves the buyer along once Whop
        // says the payment went through.
        onComplete={() => router.push("/account")}
      />
      <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-dim">Wyndralore Premium</p>
      <h1 className="font-display mt-4 text-4xl text-moon sm:text-5xl">Read without limits</h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-moon-dim">
        You choose how to pay. Subscribe and save — cancel anytime, no lock-in — or pay once with no auto-renewal
        at all. Whatever you pick is spelled out plainly, never a hidden charge.
      </p>

      {/* Billing toggle — affects any plan that has a subscription price. */}
      <div className="mx-auto mt-10 inline-flex rounded-full border border-gold-dim bg-ink-raised/50 p-1 text-xs uppercase tracking-[0.15em]">
        <button
          type="button"
          onClick={() => setMode("sub")}
          className={`rounded-full px-5 py-2 transition-colors ${mode === "sub" ? "bg-gold text-ink" : "text-moon-dim hover:text-moon"}`}
        >
          Subscribe &amp; save
        </button>
        <button
          type="button"
          onClick={() => setMode("onetime")}
          className={`rounded-full px-5 py-2 transition-colors ${mode === "onetime" ? "bg-gold text-ink" : "text-moon-dim hover:text-moon"}`}
        >
          One-time
        </button>
      </div>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
        {PURCHASABLE_PLANS.map((id) => {
          const plan = PLANS[id];
          const shownMode = modeFor(id);
          const option = planOption(id, shownMode);
          const footnote =
            shownMode === "sub"
              ? `Renews at ${option.priceLabel}${option.cadence} · cancel anytime`
              : "One-time payment · never auto-charged";
          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-2xl border p-8 text-left ${
                plan.highlight
                  ? "border-gold bg-ink-raised shadow-[0_0_50px_-16px_rgba(228,200,148,0.5),inset_0_1px_0_rgba(228,200,148,0.15)] max-md:order-first md:-translate-y-3 md:scale-105"
                  : "border-ink-line bg-ink-raised/50 shadow-[inset_0_1px_0_rgba(228,200,148,0.05)]"
              }`}
            >
              {plan.highlight && (
                <span className="font-accent absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-ink shadow-[0_4px_14px_-4px_rgba(201,169,110,0.8)]">
                  Most Popular
                </span>
              )}
              <h2 className="font-display text-2xl text-moon">{plan.label}</h2>
              <p className="mt-4">
                <span className="font-display text-4xl text-gold-bright">{option.priceLabel}</span>
                <span className="ml-2 text-sm text-moon-dim">{option.cadence}</span>
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
                className={`mt-8 rounded-full px-6 py-3.5 text-sm font-medium uppercase tracking-[0.2em] disabled:opacity-60 ${
                  plan.highlight
                    ? "cta-gold"
                    : "font-accent border border-gold-dim text-moon transition-[border-color,color,transform] duration-200 hover:border-gold hover:text-gold active:scale-[0.97]"
                }`}
              >
                {pending === id ? "Please wait…" : "Get Premium"}
              </button>
              <p className="mt-3 text-center text-[11px] text-moon-dim/70">{footnote}</p>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-lg text-[11px] leading-relaxed text-moon-dim/60">
        Digital goods, delivered instantly — all sales final. Subscriptions renew automatically until you cancel,
        which you can do anytime from your account. By purchasing you agree to immediate delivery and waive
        any right of withdrawal. See our{" "}
        <a href="/terms" className="underline decoration-gold-dim underline-offset-2 hover:text-moon-dim">
          Terms
        </a>
        .
      </p>
    </section>
  );
}
