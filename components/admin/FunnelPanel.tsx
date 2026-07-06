"use client";

import { useEffect, useState } from "react";
import { PanelHeader, StatCard } from "./shared";

interface Funnel {
  visits: number;
  signups: number;
  readings: number;
  quotaExhausted: number;
  shareClicks: number;
  adsCompleted: number;
  pricingViews: number;
  ordersCreated: number;
  paymentsCompleted: number;
  visitToSignup: number;
  pricingToOrder: number;
  orderToPayment: number;
}

interface Stats {
  funnel: Funnel;
  paidPlanMix: { plan: string; count: number }[];
}

export default function FunnelPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d));
  }, []);

  return (
    <div>
      <PanelHeader title="转化漏斗" subtitle="7-day conversion funnel from first visit to paid." />
      {!stats ? (
        <p className="text-sm text-moon-dim">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Visits" value={stats.funnel.visits} />
            <StatCard label="Signups" value={stats.funnel.signups} />
            <StatCard label="Visit → Signup" value={`${(stats.funnel.visitToSignup * 100).toFixed(1)}%`} />
            <StatCard label="Readings" value={stats.funnel.readings} />
            <StatCard label="Quota Exhausted" value={stats.funnel.quotaExhausted} />
            <StatCard label="Share Clicks" value={stats.funnel.shareClicks} />
            <StatCard label="Ads Completed" value={stats.funnel.adsCompleted} />
            <StatCard label="Pricing Views" value={stats.funnel.pricingViews} />
            <StatCard label="Pricing → Order" value={`${(stats.funnel.pricingToOrder * 100).toFixed(1)}%`} />
            <StatCard label="Orders Created" value={stats.funnel.ordersCreated} />
            <StatCard label="Payments" value={stats.funnel.paymentsCompleted} />
            <StatCard label="Order → Payment" value={`${(stats.funnel.orderToPayment * 100).toFixed(1)}%`} />
          </div>

          {stats.paidPlanMix.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-moon-dim">
              <span className="uppercase tracking-widest text-gold-dim">Paid plan mix:</span>
              {stats.paidPlanMix.map((p) => (
                <span key={p.plan}>
                  {p.plan}: <span className="text-moon">{p.count}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
