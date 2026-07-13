"use client";

import { useCallback, useEffect, useState } from "react";
import MasterInviteForm from "../MasterInviteForm";
import { PanelHeader, fmtDateTime, EmptyRow, Pill, ghostButtonClass } from "./shared";
import MasterEditModal, { EditableMaster } from "./MasterEditModal";

interface Master extends EditableMaster {
  status: string;
  strikeCount: number;
  createdAt: string;
  balances: { heldUsd: number; availableUsd: number; requestedUsd: number; paidOutUsd: number; totalEarnedUsd: number };
}

export default function MastersPanel() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Master | null>(null);

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

  async function approve(id: string) {
    setBusy(id);
    await fetch(`/api/admin/masters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    setBusy(null);
    load();
  }

  async function reject(id: string) {
    if (!confirm("Reject this submission? It'll be deleted.")) return;
    setBusy(id);
    await fetch(`/api/admin/masters/${id}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  const pending = masters.filter((m) => m.status === "pending_review");
  const settled = masters.filter((m) => m.status !== "pending_review");

  return (
    <div>
      <PanelHeader title="大师入驻" subtitle="Invite a creator — she fills her own storefront, you review and approve it below." />

      <MasterInviteForm onSuccess={load} />

      {pending.length > 0 && (
        <>
          <h3 className="font-display mt-10 mb-3 text-lg text-moon">待审核 ({pending.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-moon-dim">
                <tr>
                  <th className="py-2">Submitted</th>
                  <th>Name</th>
                  <th>Handle</th>
                  <th>Payout</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.id} className="border-t border-ink-line/60">
                    <td className="py-2 text-moon-dim">{fmtDateTime(m.createdAt)}</td>
                    <td className="text-moon">{m.displayName}</td>
                    <td className="text-moon-dim">/masters/{m.handle}</td>
                    <td className="text-moon-dim">{m.payoutMethod ? `${m.payoutMethod} · ${m.payoutHandle}` : "not set"}</td>
                    <td>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => approve(m.id)} disabled={busy === m.id} className={ghostButtonClass}>
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(m.id)}
                          disabled={busy === m.id}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs uppercase tracking-widest text-red-300 hover:border-red-400"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3 className="font-display mt-10 mb-3 text-lg text-moon">All masters</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Onboarded</th>
              <th>Name</th>
              <th>Handle</th>
              <th>Status</th>
              <th>Strikes</th>
              <th>Capacity / SLA</th>
              <th>Payout</th>
              <th>Earned</th>
              <th>Available</th>
              <th>Requested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={11} label="Loading…" />}
            {!loading && settled.length === 0 && <EmptyRow colSpan={11} label="No approved masters yet." />}
            {!loading &&
              settled.map((m) => (
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
                  <td className="text-moon-dim">${m.balances.totalEarnedUsd.toFixed(2)}</td>
                  <td className="text-moon-dim">${m.balances.availableUsd.toFixed(2)}</td>
                  <td className="text-gold-bright">${m.balances.requestedUsd.toFixed(2)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditing(m)} className={ghostButtonClass}>
                        Edit
                      </button>
                      <button type="button" onClick={() => toggleStatus(m.id, m.status)} className={ghostButtonClass}>
                        {m.status === "active" ? "Pause" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && <MasterEditModal master={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
