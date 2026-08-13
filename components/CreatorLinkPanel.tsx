"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppT, useLocale } from "@/lib/useLocale";

const SITE_URL = "https://wyndralore.com";

type CreatorStats = {
  hasCode: boolean;
  clicks?: number;
  drew?: number;
  conversions?: number;
  estimatedCommissionUsd?: number;
  lastSaleAt?: string | null;
};

/**
 * A creator's own block on /account: record the Whop username her commission is paid to, see the
 * exact link to share, and see what that link has actually done.
 *
 * The username half exists because her most natural promo move is to draw a reading and share the
 * card, and until she has recorded a username that card's QR carries her ?ref= friend-invite link —
 * which pays spread credits, not money. She'd promote for weeks and never understand why nothing
 * arrived.
 *
 * The stats half exists because the first creator to seriously consider the deal asked for it
 * before agreeing to anything, and we had nothing: Whop shows conversions and pays them, but the
 * click lands on OUR site (that's the whole point of the link format), so Whop never sees it. A
 * creator with traffic and no sales could not tell "nobody clicked" from "they clicked and didn't
 * buy" — and a creator who can't see anything happening stops posting.
 */
export default function CreatorLinkPanel({
  initialUsername,
  onSaved,
}: {
  initialUsername: string | null;
  onSaved: (username: string | null) => void;
}) {
  const t = useAppT().creator;
  const locale = useLocale();
  const [value, setValue] = useState(initialUsername ?? "");
  const [saved, setSaved] = useState(initialUsername);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  // A 華語 creator must hand out the 繁體 entrance. Sending her audience to the English root was a
  // real leak: MY/TW/HK visitors geo-redirect to /tc anyway, but a 華人 viewer anywhere else (the
  // diaspora these channels actually reach) landed on an English page and left.
  const link = saved ? (locale === "zh-TW" ? `${SITE_URL}/tc?a=${saved}` : `${SITE_URL}/?a=${saved}`) : null;

  const loadStats = useCallback(async () => {
    setStatsError(false);
    try {
      const res = await fetch("/api/creator/stats");
      if (!res.ok) {
        setStatsError(true);
        return;
      }
      setStats((await res.json()) as CreatorStats);
    } catch {
      setStatsError(true);
    }
  }, []);

  useEffect(() => {
    if (saved) void loadStats();
  }, [saved, loadStats]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/whop-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whopUsername: value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t.saveFailed);
        return;
      }
      setSaved(data.whopUsername);
      setValue(data.whopUsername ?? "");
      onSaved(data.whopUsername);
    } catch {
      setError(t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 w-full rounded-2xl border border-gold-dim bg-ink-raised/50 p-6 text-left">
      <h2 className="font-display text-lg text-gold-bright">{t.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-moon-dim">{t.intro}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.usernamePlaceholder}
          className="flex-1 rounded-full border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="font-accent rounded-full border border-gold-dim px-6 py-3 text-xs uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {busy ? t.checking : t.save}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {link && (
        <div className="mt-5 border-t border-ink-line/60 pt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.shareThis}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="break-all text-sm text-gold-bright">{link}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="text-[11px] uppercase tracking-[0.15em] text-moon-dim underline underline-offset-4 hover:text-moon"
            >
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-moon-dim">{t.shareCardNote}</p>
          <p className="mt-2 text-xs leading-relaxed text-moon-dim/70">{t.notWhopLink}</p>
        </div>
      )}

      {saved && (
        <div className="mt-5 border-t border-ink-line/60 pt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.statsTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-moon-dim/70">{t.statsIntro}</p>

          {statsError && <p className="mt-3 text-xs text-moon-dim">{t.statsFailed}</p>}
          {!statsError && !stats && <p className="mt-3 text-xs text-moon-dim">{t.statsLoading}</p>}

          {stats?.hasCode && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label={t.clicks} hint={t.clicksHint} value={String(stats.clicks ?? 0)} />
                <Stat label={t.drew} hint={t.drewHint} value={String(stats.drew ?? 0)} />
                <Stat label={t.conversions} hint={t.conversionsHint} value={String(stats.conversions ?? 0)} />
                <Stat
                  label={t.commission}
                  hint={t.commissionHint}
                  value={`$${(stats.estimatedCommissionUsd ?? 0).toFixed(2)}`}
                />
              </div>
              {stats.lastSaleAt ? (
                <p className="mt-3 text-xs text-moon-dim">
                  {t.lastSale(new Date(stats.lastSaleAt).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US"))}
                </p>
              ) : (
                !stats.clicks && <p className="mt-3 text-xs text-moon-dim">{t.noneYet}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-line/60 bg-ink/40 px-4 py-3">
      <div className="font-display text-xl text-gold-bright">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-moon-dim">{label}</div>
      <div className="mt-0.5 text-[10px] leading-snug text-moon-dim/60">{hint}</div>
    </div>
  );
}
