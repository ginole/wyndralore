"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

const STYLE_TONES = [
  { value: "gentle", label: "Gentle / healing" },
  { value: "direct", label: "Direct / sharp" },
  { value: "playful", label: "Playful / witty" },
  { value: "poetic", label: "Mystic / poetic" },
];

const inputClass =
  "rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon placeholder:text-moon-dim/50 focus:border-gold-dim focus:outline-none";
const selectClass = "rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none";

const initialForm = {
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
  password: "",
};

interface InfoState {
  email: string;
  needsPassword: boolean;
  existingStatus: string | null;
  existingProfile: Record<string, unknown> | null;
}

// The self-service intake: a creator reaches this either via a one-time claim-token link from
// masterInviteEmail (new/placeholder account — she also sets a password here) or, already
// logged in, from a plain /masters/onboard visit. Submitting never goes live immediately — it
// lands as `pending_review` for an admin to approve (see MastersPanel's review queue).
export default function MasterSelfOnboardingForm() {
  const { refresh } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoState | "loading" | "invalid">("loading");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
    /* eslint-disable react-hooks/set-state-in-effect */
    setToken(t);
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      const url = t ? `/api/masters/onboard?token=${encodeURIComponent(t)}` : "/api/masters/onboard";
      const res = await fetch(url);
      if (!res.ok) {
        setInfo("invalid");
        return;
      }
      const data: InfoState = await res.json();
      setInfo(data);
      const existing = data.existingProfile as (typeof initialForm & { focusAreas: string; voiceSamples: string }) | null;
      if (existing && data.existingStatus === "pending_review") {
        setForm((prev) => ({
          ...prev,
          handle: (existing.handle as unknown as string) ?? "",
          displayName: (existing.displayName as unknown as string) ?? "",
          tagline: (existing.tagline as unknown as string) ?? "",
          photoUrl: (existing.photoUrl as unknown as string) ?? "",
          channelUrl: (existing.channelUrl as unknown as string) ?? "",
          styleTone: (existing.styleTone as unknown as string) ?? "gentle",
          focusAreas: JSON.parse((existing.focusAreas as unknown as string) || "[]").join(", "),
          voiceSamples: JSON.parse((existing.voiceSamples as unknown as string) || "[]").join("\n"),
          avoidTopics: (existing.avoidTopics as unknown as string) ?? "",
          dailyCapacity: String(existing.dailyCapacity ?? 5),
          slaHours: String(existing.slaHours ?? 48),
          deepLinkUrl: (existing.deepLinkUrl as unknown as string) ?? "",
          payoutMethod: (existing.payoutMethod as unknown as string) ?? "",
          payoutHandle: (existing.payoutHandle as unknown as string) ?? "",
        }));
      }
    })();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (info === "loading" || info === "invalid") return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/masters/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (info.needsPassword) await refresh();
      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (info === "loading") return <div className="min-h-[60vh]" />;

  if (info === "invalid") {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">Link expired</h1>
        <p className="mt-3 text-sm text-moon-dim">This invite link is invalid or has expired, or you need to sign in first.</p>
      </section>
    );
  }

  if (info.existingStatus === "active" || info.existingStatus === "paused") {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">You&apos;re already set up</h1>
        <p className="mt-3 text-sm text-moon-dim">You already have a Wyndralore Masters storefront. Email us if you&apos;d like to change something.</p>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Submitted</p>
        <h1 className="font-display mt-3 text-3xl text-moon">Thank you</h1>
        <p className="mt-3 text-sm text-moon-dim">We&apos;ll review your storefront and it&apos;ll go live shortly after.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{info.email}</p>
      <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Set up your storefront</h1>
      <p className="mt-3 text-sm text-moon-dim">Takes about five minutes. We&apos;ll review it before it goes live.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {info.needsPassword && (
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Choose a password *</span>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} className={inputClass} />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Handle * (wyndralore.com/masters/…)</span>
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
          <input required value={form.displayName} onChange={(e) => set("displayName", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Tagline</span>
          <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="A one-line credo" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Photo URL</span>
          <input value={form.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="A link to your photo" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your channel URL</span>
          <input value={form.channelUrl} onChange={(e) => set("channelUrl", e.target.value)} placeholder="https://youtube.com/@…" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your reading tone</span>
          <select value={form.styleTone} onChange={(e) => set("styleTone", e.target.value)} className={selectClass}>
            {STYLE_TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your focus areas (comma-separated)</span>
          <input value={form.focusAreas} onChange={(e) => set("focusAreas", e.target.value)} placeholder="love, career, shadow work" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">A few of your own phrases (one per line — feeds your AI-style reading)</span>
          <textarea value={form.voiceSamples} onChange={(e) => set("voiceSamples", e.target.value)} rows={3} className={`${inputClass} resize-none`} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Topics you&apos;d rather not read on</span>
          <input value={form.avoidTopics} onChange={(e) => set("avoidTopics", e.target.value)} placeholder="death, medical, legal" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Personal readings per day (max)</span>
          <input type="number" min={1} value={form.dailyCapacity} onChange={(e) => set("dailyCapacity", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Hours you need to deliver one</span>
          <input type="number" min={1} value={form.slaHours} onChange={(e) => set("slaHours", e.target.value)} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your $151 private session link (leave blank if you don&apos;t have one)</span>
          <input value={form.deepLinkUrl} onChange={(e) => set("deepLinkUrl", e.target.value)} placeholder="https://calendly.com/…" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">How you&apos;d like to be paid</span>
          <select value={form.payoutMethod} onChange={(e) => set("payoutMethod", e.target.value)} className={selectClass}>
            <option value="">Choose later</option>
            <option value="paypal">PayPal</option>
            <option value="wise">Wise (personal)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your PayPal/Wise email or phone</span>
          <input value={form.payoutHandle} onChange={(e) => set("payoutHandle", e.target.value)} className={inputClass} />
        </label>

        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      </form>
    </section>
  );
}
