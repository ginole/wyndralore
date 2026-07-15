"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelHeader, fmtDateTime, EmptyRow, Pill } from "./shared";

interface ActivityEvent {
  id: string;
  name: string;
  createdAt: string;
  masterName: string;
  props: Record<string, unknown>;
}

const EVENT_META: Record<string, { label: string; tone: "default" | "good" | "warn" | "bad" }> = {
  master_dashboard_viewed: { label: "Checked her dashboard", tone: "default" },
  order_created: { label: "Order placed", tone: "warn" },
  payment_completed: { label: "Payment confirmed", tone: "good" },
  admin_manual_grant: { label: "Paid out", tone: "good" },
};

function detail(e: ActivityEvent): string {
  if (e.name === "order_created") return `${e.props.kind ?? ""}`;
  if (e.name === "payment_completed") return `${e.props.kind ?? ""} — $${Number(e.props.amountUsd ?? 0).toFixed(2)}`;
  if (e.name === "admin_manual_grant") return `${e.props.entriesFlipped ?? 0} reading(s) settled`;
  return "";
}

export default function MasterActivityPanel() {
  const [log, setLog] = useState<ActivityEvent[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/masters/activity?page=${p}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setLog(data.log ?? []);
      setHasMore(data.hasMore ?? false);
      setPage(data.page ?? p);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(0);
  }, [load]);

  return (
    <div>
      <PanelHeader
        title="达人动态"
        subtitle="Every master-related event — orders placed, payments confirmed, payouts sent, and when a master checks her own dashboard."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">When</th>
              <th>Event</th>
              <th>Master</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={4} label="Loading…" />}
            {!loading && log.length === 0 && <EmptyRow colSpan={4} label="No master activity yet." />}
            {!loading &&
              log.map((e) => {
                const meta = EVENT_META[e.name] ?? { label: e.name, tone: "default" as const };
                return (
                  <tr key={e.id} className="border-t border-ink-line/60">
                    <td className="py-2 text-moon-dim">{fmtDateTime(e.createdAt)}</td>
                    <td>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </td>
                    <td className="text-moon">{e.masterName}</td>
                    <td className="text-moon-dim">{detail(e)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && (log.length > 0 || page > 0) && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => load(page - 1)}
            className="rounded-full border border-ink-line px-4 py-2 text-xs uppercase tracking-[0.2em] text-moon-dim hover:text-moon disabled:opacity-40"
          >
            ← Newer
          </button>
          <span className="text-xs text-moon-dim">Page {page + 1}</span>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => load(page + 1)}
            className="rounded-full border border-ink-line px-4 py-2 text-xs uppercase tracking-[0.2em] text-moon-dim hover:text-moon disabled:opacity-40"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  );
}
