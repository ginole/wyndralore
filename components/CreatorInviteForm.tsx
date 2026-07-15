"use client";

import { useState } from "react";

export default function CreatorInviteForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [viaLink, setViaLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setViaLink(null);
    try {
      const res = await fetch("/api/admin/creator-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Something went wrong." });
        return;
      }
      setMessage({
        type: "ok",
        text: data.emailSent
          ? `Upgraded and invited ${email}.`
          : `Upgraded ${email}, but the invite email failed to send — check logs.`,
      });
      if (data.viaLink) setViaLink(data.viaLink);
      setEmail("");
      onSuccess?.();
    } catch {
      setMessage({ type: "error", text: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gold-dim bg-ink-raised/60 p-6">
      <h3 className="font-display text-lg text-gold-bright">Creator Outreach</h3>
      <p className="mt-1 text-xs text-moon-dim">
        Grants a free 1-month Premium membership and emails the partnership invite. Commission is Whop&apos;s job:
        she makes a free Whop account, then shares <span className="text-moon">wyndralore.com/?a=her-whop-username</span>
        and Whop pays her 30% of every payment, automatically, for as long as her referral keeps paying. You collect no
        username and settle nothing by hand — the invite email tells her the format.
      </p>
      <p className="mt-2 text-xs text-moon-dim/70">
        The email also tells her <span className="text-moon-dim">not</span> to share a whop.com link. Those land her
        audience on a bare product card and ask for money before anyone has drawn a card — that traffic bounces and she
        earns nothing, which is how a creator decides we&apos;re not worth promoting.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Creator email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="creator@example.com"
            className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Upgrade & Invite"}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-400" : "text-gold"}`}>{message.text}</p>
      )}
      {viaLink && (
        <div className="mt-3">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Their referral link</span>
          <input
            readOnly
            value={viaLink}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full truncate rounded-xl border border-ink-line bg-ink/60 p-3 text-xs text-moon focus:border-gold-dim focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
