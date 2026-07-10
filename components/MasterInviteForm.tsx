"use client";

import { useState } from "react";
import { inputClass, primaryButtonClass } from "./admin/shared";

// Replaces the old admin-fills-every-field form. Now the admin only sends an invite (email +
// her LS affiliate link for membership referrals) — the creator fills her own storefront
// profile at /masters/onboard, and it lands in the review queue below for approval. One email,
// one action for her, instead of two separate creator programs. The affiliate link is required
// here too (matching 达人邀请/CreatorInviteForm) — every master should also be earning referral
// commission on top of her storefront sales.
export default function MasterInviteForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [email, setEmail] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/masters/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, affiliateLink }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Something went wrong." });
        return;
      }
      setMessage({ type: "ok", text: data.emailSent ? `Invited ${email}.` : `Granted, but the invite email failed to send — check logs.` });
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
      <h3 className="font-display text-lg text-gold-bright">Invite a Master</h3>
      <p className="mt-1 text-xs text-moon-dim">
        Grants free Premium + her Lemon Squeezy affiliate link, and emails her a link to set up her own storefront. She fills it herself —
        you approve it below once it&apos;s submitted.
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
            className={inputClass}
          />
        </label>
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Lemon Squeezy affiliate link</span>
          <input
            type="url"
            required
            value={affiliateLink}
            onChange={(e) => setAffiliateLink(e.target.value)}
            placeholder="https://wyndralore.lemonsqueezy.com/affiliates/..."
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? "Sending…" : "Send Invite"}
        </button>
      </form>
      {message && <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-400" : "text-gold"}`}>{message.text}</p>}
    </div>
  );
}
