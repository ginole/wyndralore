"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelHeader, inputClass, selectClass, fmtDateTime, EmptyRow, Pill } from "./shared";

interface AdminOrder {
  id: string;
  code: string;
  email: string;
  plan: string;
  kind: string;
  amountUsd: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  paidAmountUsd: number | null;
}

const STATUS_TONE: Record<string, "default" | "good" | "warn" | "bad"> = {
  paid: "good",
  pending: "warn",
  awaiting_confirmation: "warn",
  underpaid: "bad",
  expired: "bad",
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (statusFilter: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
    if (res.ok) setOrders((await res.json()).orders);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("all", "");
  }, [load]);

  return (
    <div>
      <PanelHeader title="全部订单" subtitle="Every order, newest first. Filter by status or search code/email." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            load(e.target.value, query);
          }}
          className={selectClass}
        >
          <option value="all">all statuses</option>
          <option value="paid">paid</option>
          <option value="pending">pending</option>
          <option value="awaiting_confirmation">awaiting_confirmation</option>
          <option value="underpaid">underpaid</option>
          <option value="expired">expired</option>
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(status, query);
          }}
          className="flex flex-1 gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or email…"
            className={`${inputClass} flex-1 sm:max-w-xs`}
          />
          <button type="submit" className={selectClass}>
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Code</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th>Paid</th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={7} label="Loading…" />}
            {!loading && orders.length === 0 && <EmptyRow colSpan={7} label="No orders found." />}
            {!loading &&
              orders.map((o) => (
                <tr key={o.id} className="border-t border-ink-line/60">
                  <td className="py-2 font-mono text-xs text-gold">{o.code}</td>
                  <td className="max-w-[180px] truncate text-moon" title={o.email}>
                    {o.email}
                  </td>
                  <td className="text-moon-dim">
                    {o.plan}
                    {o.kind !== "plan" && <span className="ml-1 text-[10px] text-moon-dim/70">({o.kind})</span>}
                  </td>
                  <td className="text-moon-dim">${o.amountUsd.toFixed(2)}</td>
                  <td>
                    <Pill tone={STATUS_TONE[o.status] ?? "default"}>{o.status}</Pill>
                  </td>
                  <td className="text-moon-dim">{fmtDateTime(o.createdAt)}</td>
                  <td className="text-moon-dim">{fmtDateTime(o.paidAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
