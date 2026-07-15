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
        Grants a free 1-month Premium membership and emails the partnership invite. Commission is handled by Whop:
        the invite points them at our Whop page to grab their own link, which earns 30% of every payment for as long
        as the person they referred keeps paying — and Whop pays them directly, so there is nothing to settle by hand.
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
