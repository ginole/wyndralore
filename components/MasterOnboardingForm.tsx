"use client";

import { useState } from "react";
import { inputClass, primaryButtonClass, selectClass } from "./admin/shared";

const STYLE_TONES = [
  { value: "gentle", label: "Gentle / healing" },
  { value: "direct", label: "Direct / sharp" },
  { value: "playful", label: "Playful / witty" },
  { value: "poetic", label: "Mystic / poetic" },
];

const initialForm = {
  email: "",
  handle: "",
  displayName: "",
  tagline: "",
  photoUrl: "",
  channelUrl: "",
  styleTone: "gentle",
  focusAreas: "",
  voiceSamples: "",
  avoidTopics: "",
  dailyCapacity: "5",
  slaHours: "48",
  deepLinkUrl: "",
  payoutMethod: "",
  payoutHandle: "",
};

export default function MasterOnboardingForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Something went wrong." });
        return;
      }
      setMessage({ type: "ok", text: `${form.displayName}'s altar is live at /masters/${form.handle}.` });
      setForm(initialForm);
      onSuccess?.();
    } catch {
      setMessage({ type: "error", text: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gold-dim bg-ink-raised/60 p-6">
      <h3 className="font-display text-lg text-gold-bright">Onboard a Master</h3>
      <p className="mt-1 text-xs text-moon-dim">Creates her storefront profile — finds or creates her account by email.</p>

      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Email *</span>
          <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Handle * (/masters/…)</span>
          <input
            required
            value={form.handle}
            onChange={(e) => set("handle", e.target.value.toLowerCase())}
            placeholder="luna"
            pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Display name *</span>
          <input required value={form.displayName} onChange={(e) => set("displayName", e.target.value)} placeholder="Luna" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Tagline</span>
          <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Moon Tarot" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Photo URL</span>
          <input value={form.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Channel URL</span>
          <input value={form.channelUrl} onChange={(e) => set("channelUrl", e.target.value)} placeholder="https://youtube.com/@…" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">AI reading tone</span>
          <select value={form.styleTone} onChange={(e) => set("styleTone", e.target.value)} className={selectClass}>
            {STYLE_TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Focus areas (comma-separated)</span>
          <input value={form.focusAreas} onChange={(e) => set("focusAreas", e.target.value)} placeholder="love, career, shadow work" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Her phrases (one per line — feeds the AI-style reading)</span>
          <textarea value={form.voiceSamples} onChange={(e) => set("voiceSamples", e.target.value)} rows={3} className={`${inputClass} resize-none`} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Topics to avoid</span>
          <input value={form.avoidTopics} onChange={(e) => set("avoidTopics", e.target.value)} placeholder="death, medical, legal" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Daily capacity ($39 tier)</span>
          <input type="number" min={1} value={form.dailyCapacity} onChange={(e) => set("dailyCapacity", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">SLA hours</span>
          <input type="number" min={1} value={form.slaHours} onChange={(e) => set("slaHours", e.target.value)} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Her $151 booking link (leave blank to hide — never fake this)</span>
          <input value={form.deepLinkUrl} onChange={(e) => set("deepLinkUrl", e.target.value)} placeholder="https://calendly.com/…" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Payout method</span>
          <select value={form.payoutMethod} onChange={(e) => set("payoutMethod", e.target.value)} className={selectClass}>
            <option value="">Not set yet</option>
            <option value="paypal">PayPal</option>
            <option value="wise">Wise (personal)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Payout handle (email/phone)</span>
          <input value={form.payoutHandle} onChange={(e) => set("payoutHandle", e.target.value)} className={inputClass} />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Creating…" : "Create Storefront"}
          </button>
        </div>
      </form>
      {message && <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-400" : "text-gold"}`}>{message.text}</p>}
    </div>
  );
}
