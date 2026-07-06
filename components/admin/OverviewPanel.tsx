"use client";

import { useEffect, useState } from "react";
import { PanelHeader, StatCard } from "./shared";

interface Stats {
  signupsToday: number;
  signupsWeek: number;
  drawsToday: number;
  drawsWeek: number;
  ordersWeek: number;
  ordersPaidWeek: number;
  conversionRate: number;
  unmatchedCount: number;
  planCounts: { plan: string; count: number }[];
}

export default function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d));
  }, []);

  return (
    <div>
      <PanelHeader title="数据总览" subtitle="Key numbers at a glance — today and the last 7 days." />
      {!stats ? (
        <p className="text-sm text-moon-dim">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Signups Today" value={stats.signupsToday} />
            <StatCard label="Signups (7d)" value={stats.signupsWeek} />
            <StatCard label="Draws Today" value={stats.drawsToday} />
            <StatCard label="Draws (7d)" value={stats.drawsWeek} />
            <StatCard label="Orders (7d)" value={stats.ordersWeek} />
            <StatCard label="Paid (7d)" value={stats.ordersPaidWeek} />
            <StatCard label="Conversion" value={`${(stats.conversionRate * 100).toFixed(0)}%`} />
            <StatCard label="Unmatched" value={stats.unmatchedCount} />
          </div>

          <h3 className="font-display mt-10 text-lg text-moon">Members by plan</h3>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-moon-dim">
            {stats.planCounts.map((p) => (
              <span key={p.plan} className="rounded-lg border border-ink-line bg-ink-raised/60 px-3 py-2">
                {p.plan}: <span className="text-gold-bright">{p.count}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
