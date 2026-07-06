"use client";

// Shared building blocks + Tailwind class recipes for the admin panels, so every panel matches
// the gold/ink theme without copy-pasting long class strings.

export const inputClass =
  "rounded-lg border border-ink-line bg-ink-raised/60 px-3 py-2 text-sm text-moon placeholder:text-moon-dim/60 focus:border-gold-dim focus:outline-none";

export const selectClass =
  "rounded-lg border border-ink-line bg-ink-raised/60 px-2 py-1 text-xs text-moon focus:border-gold-dim focus:outline-none";

export const primaryButtonClass =
  "rounded-full bg-gold px-6 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60";

export const ghostButtonClass =
  "rounded-lg border border-gold-dim px-3 py-1.5 text-xs uppercase tracking-widest text-gold hover:border-gold";

export function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h2 className="font-display text-2xl text-moon">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-moon-dim">{subtitle}</p>}
    </header>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised/60 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">{label}</p>
      <p className="font-display mt-1 text-2xl text-gold-bright">{value}</p>
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  const tones: Record<string, string> = {
    default: "border-ink-line text-moon-dim",
    good: "border-emerald-500/40 text-emerald-300",
    warn: "border-amber-500/40 text-amber-300",
    bad: "border-red-500/40 text-red-300",
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-widest ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-6 text-center text-moon-dim">
        {label}
      </td>
    </tr>
  );
}

export function fmtDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function fmtDateTime(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
