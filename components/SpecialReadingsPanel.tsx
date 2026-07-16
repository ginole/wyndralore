"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

interface SavedItem {
  id: string;
  kind: string;
  title: string;
  createdAt: string;
}

/** The /account home of purchased special readings: unspent credits (with a "begin" link) and
 * the permanent list of completed ones. Renders nothing until there's something to show. */
export default function SpecialReadingsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/special-reading/mine")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setItems(data?.readings ?? []))
      .catch(() => {});
  }, [user]);

  if (!user) return null;
  const credits: { label: string; href: string; count: number }[] = [
    { label: "Year Ahead reading", href: "/reading/year-ahead", count: user.yearReadingCredits },
    { label: "Love Compatibility reading", href: "/reading/love-compatibility", count: user.loveReadingCredits },
  ].filter((c) => c.count > 0);

  if (credits.length === 0 && items.length === 0) return null;

  return (
    <div className="mt-6 w-full rounded-2xl border border-ink-line bg-ink-raised/50 p-6 text-left">
      <h2 className="font-display text-lg text-gold-bright">Special readings</h2>

      {credits.map((c) => (
        <div key={c.href} className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm text-moon">
            {c.label}
            {c.count > 1 ? ` ×${c.count}` : ""} — <span className="text-gold-dim">unused</span>
          </span>
          <Link
            href={c.href}
            className="shrink-0 rounded-full border border-gold-dim px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] text-moon transition-colors hover:border-gold hover:text-gold"
          >
            Begin
          </Link>
        </div>
      ))}

      {items.length > 0 && (
        <div className={credits.length > 0 ? "mt-4 border-t border-ink-line/60 pt-4" : "mt-3"}>
          {items.map((r) => (
            <Link key={r.id} href={`/readings/${r.id}`} className="group flex items-center justify-between gap-3 py-1.5">
              <span className="truncate text-sm text-moon transition-colors group-hover:text-gold">{r.title}</span>
              <span className="shrink-0 text-xs text-moon-dim/70">{new Date(r.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
