"use client";

import { useState } from "react";

const SITE_URL = "https://wyndralore.com";

/**
 * A creator's own block on /account: record the Whop username her commission is paid to, and see
 * the exact link to share. Only rendered for `isCreator` accounts.
 *
 * Existing for one reason: her most natural promo move is to draw a reading and share the card, and
 * until she has recorded a username that card's QR carries her ?ref= friend-invite link — which pays
 * spread credits, not money. She'd promote for weeks and never understand why nothing arrived.
 */
export default function CreatorLinkPanel({
  initialUsername,
  onSaved,
}: {
  initialUsername: string | null;
  onSaved: (username: string | null) => void;
}) {
  const [value, setValue] = useState(initialUsername ?? "");
  const [saved, setSaved] = useState(initialUsername);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = saved ? `${SITE_URL}/?a=${saved}` : null;

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
        setError(data?.error ?? "Couldn't save that — try again.");
        return;
      }
      setSaved(data.whopUsername);
      setValue(data.whopUsername ?? "");
      onSaved(data.whopUsername);
    } catch {
      setError("Couldn't save that — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 w-full rounded-2xl border border-gold-dim bg-ink-raised/50 p-6 text-left">
      <h2 className="font-display text-lg text-gold-bright">Your creator link</h2>
      <p className="mt-1 text-xs leading-relaxed text-moon-dim">
        Tell us the Whop account your commission should go to. We check it against Whop when you save, so a typo
        can&apos;t quietly cost you months of earnings.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="your Whop username"
          className="flex-1 rounded-full border border-ink-line bg-ink px-5 py-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="font-accent rounded-full border border-gold-dim px-6 py-3 text-xs uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {busy ? "Checking…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {link && (
        <div className="mt-5 border-t border-ink-line/60 pt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">Share this</p>
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
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-moon-dim">
            Your share cards now carry this link too — draw a reading, tap share, and the QR on the image is already
            yours.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-moon-dim/70">
            Share this rather than a Whop link. A Whop link drops your audience on a product card and asks for money
            before they&apos;ve drawn a single card — that traffic bounces and you earn nothing. This one lets them
            read first. Same 30%, tracked the same.
          </p>
        </div>
      )}
    </div>
  );
}
