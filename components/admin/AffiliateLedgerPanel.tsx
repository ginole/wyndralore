"use client";

import { useCallback, useEffect, useState } from "react";

interface Row {
  id: string;
  createdAt: string;
  partner: string;
  customer: string;
  tier: string;
  commissionUsd: number;
  status: string;
  paidAt: string | null;
  orderCode: string;
}

const STATUS_LABEL: Record<string, string> = {
  held: "In hold",
  available: "Ready",
  requested: "Requested",
  paid: "Paid ✓",
  reversed: "Refunded",
  reversed_settled: "Refunded (settled)",
};

export default function AffiliateLedgerPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate/ledger?page=${p}`);
      const data = await res.json().catch(() => ({}));
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setPage(data.page ?? p);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-moon">佣金流水</h2>
          <p className="mt-1 text-sm text-moon-dim">
            Every commission & payout, newest first ({total} total). The last month is on the first pages — page back
            for older. Nothing is deleted; export the full log for your 6-month archive, then it can be pruned.
          </p>
        </div>
        <a
          href="/api/admin/affiliate/ledger?export=csv"
          className="shrink-0 rounded-full border border-gold-dim px-5 py-2.5 text-center text-xs uppercase tracking-[0.2em] text-moon hover:border-gold hover:text-gold"
        >
          Export CSV
        </a>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-moon-dim">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-moon-dim">No commissions yet.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-moon-dim">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Partner</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-ink-line/60">
                    <td className="py-2 text-moon-dim">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="text-moon">{r.partner}</td>
                    <td className="text-moon-dim">{r.customer}</td>
                    <td className="text-moon-dim">{r.tier === "first" ? "First 50%" : "Repeat 20%"}</td>
                    <td className="text-gold-bright">${r.commissionUsd.toFixed(2)}</td>
                    <td className="text-moon-dim">{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td className="text-moon-dim">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
