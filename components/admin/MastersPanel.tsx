"use client";

import { useCallback, useEffect, useState } from "react";
import MasterOnboardingForm from "../MasterOnboardingForm";
import { PanelHeader, fmtDateTime, EmptyRow, Pill, ghostButtonClass } from "./shared";

interface Master {
  id: string;
  handle: string;
  displayName: string;
  status: string;
  strikeCount: number;
  dailyCapacity: number;
  slaHours: number;
  payoutMethod: string | null;
  payoutHandle: string | null;
  createdAt: string;
}

export default function MastersPanel() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/masters", { cache: "no-store" });
    if (res.ok) setMasters((await res.json()).masters);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleStatus(id: string, current: string) {
    await fetch(`/api/admin/masters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "active" ? "paused" : "active" }),
    });
    load();
  }

  return (
    <div>
      <PanelHeader title="大师入驻" subtitle="Onboard a creator's 'Meet Our Masters' storefront, or pause/reactivate an existing one." />

      <MasterOnboardingForm onSuccess={load} />

      <h3 className="font-display mt-10 mb-3 text-lg text-moon">All masters</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Onboarded</th>
              <th>Name</th>
              <th>Handle</th>
              <th>Status</th>
              <th>Strikes</th>
              <th>Capacity / SLA</th>
              <th>Payout</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={8} label="Loading…" />}
            {!loading && masters.length === 0 && <EmptyRow colSpan={8} label="No masters onboarded yet." />}
            {!loading &&
              masters.map((m) => (
                <tr key={m.id} className="border-t border-ink-line/60">
                  <td className="py-2 text-moon-dim">{fmtDateTime(m.createdAt)}</td>
                  <td className="text-moon">{m.displayName}</td>
                  <td className="text-moon-dim">/masters/{m.handle}</td>
                  <td>{m.status === "active" ? <Pill tone="good">active</Pill> : <Pill tone="warn">paused</Pill>}</td>
                  <td>{m.strikeCount > 0 ? <Pill tone={m.strikeCount >= 3 ? "bad" : "warn"}>{m.strikeCount}</Pill> : <span className="text-moon-dim">0</span>}</td>
                  <td className="text-moon-dim">
                    {m.dailyCapacity}/day · {m.slaHours}h
                  </td>
                  <td className="max-w-[160px] truncate text-moon-dim" title={m.payoutHandle ?? ""}>
                    {m.payoutMethod ? `${m.payoutMethod} · ${m.payoutHandle}` : "not set"}
                  </td>
                  <td>
                    <button type="button" onClick={() => toggleStatus(m.id, m.status)} className={ghostButtonClass}>
                      {m.status === "active" ? "Pause" : "Reactivate"}
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
