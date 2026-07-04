"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  signupsToday: number;
  signupsWeek: number;
  drawsToday: number;
  drawsWeek: number;
  ordersWeek: number;
  ordersPaidWeek: number;
  conversionRate: number;
  planCounts: { plan: string; count: number }[];
  unmatchedCount: number;
  funnel: {
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
  };
  paidPlanMix: { plan: string; count: number }[];
}

interface WebhookEvent {
  id: string;
  receivedAt: string;
  status: string;
  amountUsd: number | null;
  referenceText: string | null;
  note: string | null;
  order: { code: string; plan: string; amountUsd: number; userId: string } | null;
}

interface AdminUser {
  id: string;
  email: string;
  plan: string;
  planExpiresAt: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [matchInputs, setMatchInputs] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    const [statsRes, eventsRes, usersRes] = await Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }),
      fetch("/api/admin/webhook-events", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (eventsRes.ok) setEvents((await eventsRes.json()).events);
    if (usersRes.ok) setUsers((await usersRes.json()).users);
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount: loadAll's setState calls all happen after an await, not
    // synchronously in the effect body — the linter's static analysis just can't see that
    // through the useCallback indirection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  async function handleMatch(eventId: string) {
    const orderCode = matchInputs[eventId]?.trim();
    if (!orderCode) return;
    const res = await fetch(`/api/admin/webhook-events/${eventId}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode }),
    });
    if (res.ok) loadAll();
  }

  async function handleUserPlanChange(userId: string, plan: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    loadAll();
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-moon">Admin</h1>
        <button type="button" onClick={handleLogout} className="text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4">
          Sign Out
        </button>
      </div>

      {stats && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Signups Today" value={stats.signupsToday} />
          <StatCard label="Signups (7d)" value={stats.signupsWeek} />
          <StatCard label="Draws Today" value={stats.drawsToday} />
          <StatCard label="Draws (7d)" value={stats.drawsWeek} />
          <StatCard label="Orders (7d)" value={stats.ordersWeek} />
          <StatCard label="Paid (7d)" value={stats.ordersPaidWeek} />
          <StatCard label="Conversion" value={`${(stats.conversionRate * 100).toFixed(0)}%`} />
          <StatCard label="Unmatched" value={stats.unmatchedCount} />
        </div>
      )}

      {stats && (
        <>
          <h2 className="font-display mt-14 text-2xl text-moon">Funnel (7 days)</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
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

      <h2 className="font-display mt-14 text-2xl text-moon">Unmatched Payments</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Received</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Note</th>
              <th>Link to order code</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-moon-dim">
                  No unmatched payments.
                </td>
              </tr>
            )}
            {events.map((event) => (
              <tr key={event.id} className="border-t border-ink-line/60">
                <td className="py-2 text-moon-dim">{new Date(event.receivedAt).toLocaleString()}</td>
                <td className="text-gold">{event.status}</td>
                <td>{event.amountUsd !== null ? `$${event.amountUsd.toFixed(2)}` : "—"}</td>
                <td className="max-w-[160px] truncate text-moon-dim" title={event.referenceText ?? ""}>
                  {event.referenceText ?? "—"}
                </td>
                <td className="max-w-[180px] truncate text-moon-dim" title={event.note ?? ""}>
                  {event.note ?? "—"}
                </td>
                <td>
                  <div className="flex gap-2">
                    <input
                      value={matchInputs[event.id] ?? ""}
                      onChange={(e) => setMatchInputs((prev) => ({ ...prev, [event.id]: e.target.value }))}
                      placeholder="WL-XXXX"
                      className="w-24 rounded border border-ink-line bg-ink-raised/60 px-2 py-1 text-xs text-moon focus:border-gold-dim focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleMatch(event.id)}
                      className="rounded border border-gold-dim px-2 py-1 text-xs uppercase tracking-widest text-gold hover:border-gold"
                    >
                      Match
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-14 text-2xl text-moon">Users</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Email</th>
              <th>Plan</th>
              <th>Expires</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-ink-line/60">
                <td className="py-2 text-moon">{u.email}</td>
                <td>
                  <select
                    value={u.plan}
                    onChange={(e) => handleUserPlanChange(u.id, e.target.value)}
                    className="rounded border border-ink-line bg-ink-raised/60 px-2 py-1 text-xs text-moon focus:border-gold-dim focus:outline-none"
                  >
                    <option value="free">free</option>
                    <option value="monthly">monthly</option>
                    <option value="yearly">yearly</option>
                    <option value="lifetime">lifetime</option>
                  </select>
                </td>
                <td className="text-moon-dim">{u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString() : "—"}</td>
                <td className="text-moon-dim">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised/60 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">{label}</p>
      <p className="font-display mt-1 text-2xl text-gold-bright">{value}</p>
    </div>
  );
}
