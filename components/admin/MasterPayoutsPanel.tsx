"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelHeader, ghostButtonClass, EmptyRow, StatCard } from "./shared";

interface PayoutDue {
  masterId: string;
  displayName: string;
  handle: string;
  payoutMethod: string | null;
  payoutHandle: string | null;
  totalUsd: number;
  entryCount: number;
}

export default function MasterPayoutsPanel() {
  const [due, setDue] = useState<PayoutDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/masters/payouts", { cache: "no-store" });
    if (res.ok) setDue((await res.json()).due);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function markPaid(masterId: string) {
    setPaying(masterId);
    try {
      await fetch(`/api/admin/masters/payouts/${masterId}`, { method: "POST" });
      await load();
    } finally {
      setPaying(null);
    }
  }

  const totalUsd = Math.round(due.reduce((s, d) => s + d.totalUsd, 0) * 100) / 100;

  return (
    <div>
      <PanelHeader
        title="达人打款"
        subtitle="Masters request a payout themselves once they clear $30 and their 15-day hold passes. Send via PayPal/Wise by hand, then mark paid here."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Masters owed" value={due.length} />
        <StatCard label="Total due" value={`$${totalUsd.toFixed(2)}`} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Master</th>
              <th>Amount</th>
              <th>Send via</th>
              <th>Readings</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={5} label="Loading…" />}
            {!loading && due.length === 0 && <EmptyRow colSpan={5} label="Nothing owed right now." />}
            {!loading &&
              due.map((d) => (
                <tr key={d.masterId} className="border-t border-ink-line/60">
                  <td className="py-2 text-moon">{d.displayName}</td>
                  <td className="text-gold-bright">${d.totalUsd.toFixed(2)}</td>
                  <td className="text-moon-dim">{d.payoutMethod ? `${d.payoutMethod} · ${d.payoutHandle}` : "⚠ not set"}</td>
                  <td className="text-moon-dim">{d.entryCount}</td>
                  <td>
                    <button type="button" onClick={() => markPaid(d.masterId)} disabled={paying === d.masterId} className={ghostButtonClass}>
                      {paying === d.masterId ? "…" : "Mark Paid"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
