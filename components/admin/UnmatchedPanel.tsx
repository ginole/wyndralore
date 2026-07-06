"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelHeader, inputClass, ghostButtonClass, fmtDateTime, EmptyRow } from "./shared";

interface WebhookEvent {
  id: string;
  receivedAt: string;
  status: string;
  amountUsd: number | null;
  referenceText: string | null;
  note: string | null;
  order: { code: string; plan: string; amountUsd: number; userId: string } | null;
}

export default function UnmatchedPanel() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [matchInputs, setMatchInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/webhook-events", { cache: "no-store" });
    if (res.ok) setEvents((await res.json()).events);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function match(eventId: string) {
    const orderCode = matchInputs[eventId]?.trim();
    if (!orderCode) return;
    const res = await fetch(`/api/admin/webhook-events/${eventId}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <PanelHeader title="未匹配收款" subtitle="Wise transfers that couldn't be auto-matched. Link them to an order code by hand." />
      <div className="overflow-x-auto">
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
            {loading && <EmptyRow colSpan={6} label="Loading…" />}
            {!loading && events.length === 0 && <EmptyRow colSpan={6} label="No unmatched payments." />}
            {!loading &&
              events.map((event) => (
                <tr key={event.id} className="border-t border-ink-line/60">
                  <td className="py-2 text-moon-dim">{fmtDateTime(event.receivedAt)}</td>
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
                        className={`${inputClass} w-28`}
                      />
                      <button type="button" onClick={() => match(event.id)} className={ghostButtonClass}>
                        Match
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
