"use client";

import { useState } from "react";
import { inputClass, selectClass, primaryButtonClass, ghostButtonClass } from "./shared";

export interface EditableMaster {
  id: string;
  handle: string;
  displayName: string;
  tagline: string | null;
  photoUrl: string | null;
  channelUrl: string | null;
  styleTone: string;
  focusAreas: string; // JSON string[]
  voiceSamples: string; // JSON string[]
  avoidTopics: string | null;
  dailyCapacity: number;
  slaHours: number;
  vacationMode: boolean;
  deepLinkUrl: string | null;
  payoutMethod: string | null;
  payoutHandle: string | null;
}

function parseJsonList(raw: string): string {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(", ") : "";
  } catch {
    return "";
  }
}

// Lets an admin fix a live master's storefront fields directly — she can no longer self-edit
// once approved (app/api/masters/onboard blocks that), so this is the only way to correct a typo
// or update her bio/pricing config without issuing a fresh invite link.
export default function MasterEditModal({
  master,
  onClose,
  onSaved,
}: {
  master: EditableMaster;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [handle, setHandle] = useState(master.handle);
  const [displayName, setDisplayName] = useState(master.displayName);
  const [tagline, setTagline] = useState(master.tagline ?? "");
  const [photoUrl, setPhotoUrl] = useState(master.photoUrl ?? "");
  const [channelUrl, setChannelUrl] = useState(master.channelUrl ?? "");
  const [styleTone, setStyleTone] = useState(master.styleTone);
  const [focusAreas, setFocusAreas] = useState(parseJsonList(master.focusAreas));
  const [voiceSamples, setVoiceSamples] = useState(
    (() => {
      try {
        const arr = JSON.parse(master.voiceSamples);
        return Array.isArray(arr) ? arr.join("\n") : "";
      } catch {
        return "";
      }
    })(),
  );
  const [avoidTopics, setAvoidTopics] = useState(master.avoidTopics ?? "");
  const [dailyCapacity, setDailyCapacity] = useState(String(master.dailyCapacity));
  const [slaHours, setSlaHours] = useState(String(master.slaHours));
  const [vacationMode, setVacationMode] = useState(master.vacationMode);
  const [deepLinkUrl, setDeepLinkUrl] = useState(master.deepLinkUrl ?? "");
  const [payoutMethod, setPayoutMethod] = useState(master.payoutMethod ?? "");
  const [payoutHandle, setPayoutHandle] = useState(master.payoutHandle ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/masters/${master.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            handle,
            displayName,
            tagline,
            photoUrl,
            channelUrl,
            styleTone,
            focusAreas,
            voiceSamples,
            avoidTopics,
            dailyCapacity,
            slaHours,
            vacationMode,
            deepLinkUrl,
            payoutMethod: payoutMethod || null,
            payoutHandle,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-gold-dim bg-ink-raised p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg text-gold-bright">Edit {master.displayName}&apos;s storefront</h3>
          <button type="button" onClick={onClose} className="text-moon-dim hover:text-moon">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Handle</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Display name</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Tagline</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Photo URL</span>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Channel URL</span>
            <input value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Style tone</span>
            <select value={styleTone} onChange={(e) => setStyleTone(e.target.value)} className={selectClass}>
              <option value="gentle">gentle</option>
              <option value="direct">direct</option>
              <option value="playful">playful</option>
              <option value="poetic">poetic</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Vacation mode</span>
            <select
              value={vacationMode ? "on" : "off"}
              onChange={(e) => setVacationMode(e.target.value === "on")}
              className={selectClass}
            >
              <option value="off">off</option>
              <option value="on">on (pauses live_voice intake)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Focus areas (comma-separated)</span>
            <input value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Voice samples (one per line)</span>
            <textarea
              value={voiceSamples}
              onChange={(e) => setVoiceSamples(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Avoid topics</span>
            <input value={avoidTopics} onChange={(e) => setAvoidTopics(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Daily capacity</span>
            <input type="number" min={1} value={dailyCapacity} onChange={(e) => setDailyCapacity(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">SLA hours</span>
            <input type="number" min={1} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Deep-link URL ($151 booking)</span>
            <input value={deepLinkUrl} onChange={(e) => setDeepLinkUrl(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Payout method</span>
            <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className={selectClass}>
              <option value="">not set</option>
              <option value="paypal">paypal</option>
              <option value="wise">wise</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Payout handle</span>
            <input value={payoutHandle} onChange={(e) => setPayoutHandle(e.target.value)} className={inputClass} />
          </label>

          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={onClose} className={ghostButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
