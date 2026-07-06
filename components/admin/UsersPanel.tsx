"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelHeader, inputClass, selectClass, fmtDate, EmptyRow } from "./shared";

interface AdminUser {
  id: string;
  email: string;
  plan: string;
  planExpiresAt: string | null;
  createdAt: string;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" });
    if (res.ok) setUsers((await res.json()).users);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("");
  }, [load]);

  async function changePlan(userId: string, plan: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    load(query);
  }

  return (
    <div>
      <PanelHeader title="全部用户" subtitle="Search accounts and override plan/expiry when needed." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(query);
        }}
        className="mb-5 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email…"
          className={`${inputClass} flex-1 sm:max-w-xs`}
        />
        <button type="submit" className={selectClass}>
          Search
        </button>
      </form>

      <div className="overflow-x-auto">
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
            {loading && <EmptyRow colSpan={4} label="Loading…" />}
            {!loading && users.length === 0 && <EmptyRow colSpan={4} label="No users found." />}
            {!loading &&
              users.map((u) => (
                <tr key={u.id} className="border-t border-ink-line/60">
                  <td className="py-2 text-moon">{u.email}</td>
                  <td>
                    <select value={u.plan} onChange={(e) => changePlan(u.id, e.target.value)} className={selectClass}>
                      <option value="free">free</option>
                      <option value="monthly">monthly</option>
                      <option value="yearly">yearly</option>
                      <option value="lifetime">lifetime</option>
                    </select>
                  </td>
                  <td className="text-moon-dim">{fmtDate(u.planExpiresAt)}</td>
                  <td className="text-moon-dim">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
