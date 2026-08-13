"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import CardFace from "./CardFace";
import { useLocale } from "@/lib/useLocale";
import { getAppDict } from "@/lib/i18nApp";

interface JournalCard {
  position: string;
  orientation: "upright" | "reversed";
  cardId: number;
  name: string;
  image: string;
}

interface JournalEntry {
  id: string;
  spread: string;
  spreadTitle: string;
  theme: string;
  question: string | null;
  note: string | null;
  aiReading: string | null;
  cards: JournalCard[];
  createdAt: string;
}

interface RawPurchased {
  id: string;
  kind: string;
  title: string;
  createdAt: string;
  cards: string;
}

interface PurchasedReading {
  id: string;
  kind: string;
  title: string;
  createdAt: string;
  cards: JournalCard[];
}

/** `cards` is a JSON string column; a malformed row must never blank the whole journal. */
function safeCards(raw: string): JournalCard[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function JournalView() {
  const { user, loading: authLoading } = useAuth();
  const locale = useLocale();
  const t = getAppDict(locale).journal;
  const tw = locale === "zh-TW";
  const L = (p: string) => (tw ? `/tc${p}` : p);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [purchased, setPurchased] = useState<PurchasedReading[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const load = useCallback(async () => {
    // Two sources, because a purchased Year Ahead / Love Compatibility is stored in its own table
    // (SpecialReading) rather than as a JournalEntry. That is invisible to a buyer: they paid $9.90,
    // went to look for it where every other reading of theirs lives, and found nothing. The reading
    // was never lost — it just had no entrance from here.
    const [journalRes, specialRes] = await Promise.all([
      fetch("/api/journal", { cache: "no-store" }),
      fetch("/api/special-reading/mine", { cache: "no-store" }),
    ]);
    setEntries(journalRes.ok ? (await journalRes.json()).entries : []);
    if (specialRes.ok) {
      const data = await specialRes.json();
      const items: PurchasedReading[] = (data?.readings ?? []).map((r: RawPurchased) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        createdAt: r.createdAt,
        cards: safeCards(r.cards),
      }));
      setPurchased(items);
    } else {
      setPurchased([]);
    }
  }, []);

  useEffect(() => {
    // Fetch once auth resolves; load()'s setState runs after an await, and setEntries([]) for
    // the signed-out case is a one-shot terminal state — no cascading-render risk here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (authLoading) return;
    if (user) load();
    else setEntries([]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [authLoading, user, load]);

  async function handleSaveNote(id: string) {
    await fetch(`/api/journal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteDraft }),
    });
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
    load();
  }

  if (authLoading || entries === null) {
    return <div className="min-h-[60vh]" />;
  }

  if (!user) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">{t.title}</h1>
        <p className="mt-4 text-sm text-moon-dim">{t.signInToSee}</p>
        <Link href={L("/account")} className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright">
          {t.signIn}
        </Link>
      </section>
    );
  }

  // Never-subscribed users with nothing saved get the upsell pitch. Lapsed former members
  // (has entries, but plan expired) can still view what they already saved — only *new*
  // saves require active Premium (gated separately, on the reading page's Save button).
  // A buyer who paid for a special reading but never subscribed must NOT be shown the upsell wall —
  // that would hide the very thing they bought behind an ad for something else.
  if (!user.isPremium && entries.length === 0 && purchased.length === 0) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.premiumFeature}</p>
        <h1 className="font-display mt-4 text-3xl text-moon">{t.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-moon-dim">{t.upsellBody}</p>
        <Link href={L("/pricing")} className="mt-8 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright">
          {t.goPremium}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.title}</p>
        <h1 className="font-display mt-3 text-4xl text-moon">{t.keptHeading}</h1>
      </div>

      {!user.isPremium && (
        <p className="mx-auto mt-6 max-w-md text-center text-sm text-gold-dim">
          {t.boughtKeptPre}
          <Link href={L("/pricing")} className="underline underline-offset-4 hover:text-gold">
            {t.premiumWord}
          </Link>
          {t.boughtKeptPost}
        </p>
      )}

      {entries.length === 0 && purchased.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-moon-dim">{t.noneYet}</p>
          <Link href={L("/reading/three-card")} className="mt-6 inline-block rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold-bright">
            {t.startReading}
          </Link>
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-8">
          {/* Purchased readings sit in the same timeline as saved draws, newest first, so the
              journal reads as one history instead of two systems the buyer has to know about. */}
          {purchased.map((item) => (
            <article key={`sr-${item.id}`} className="rounded-2xl border border-gold-dim/60 bg-ink-raised/50 p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl text-moon">{item.title}</h2>
                <span className="text-xs uppercase tracking-widest text-moon-dim">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gold-dim">{t.purchasedBadge}</p>

              {item.cards.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-4">
                  {item.cards.map((card, i) => (
                    <div key={i} className="w-20 text-center">
                      <div className="aspect-[5/8] w-full">
                        <CardFace src={card.image} alt={card.name} orientation={card.orientation} />
                      </div>
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-moon-dim">{card.position}</p>
                      <p className="text-[11px] text-moon">{card.name}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-line/60 pt-4">
                <p className="text-xs text-moon-dim/70">{t.purchasedKeptNote}</p>
                <Link
                  href={L(`/readings/${item.id}`)}
                  className="text-xs uppercase tracking-[0.15em] text-gold underline underline-offset-4 hover:text-gold-bright"
                >
                  {t.openFullReading}
                </Link>
              </div>
            </article>
          ))}

          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-ink-line bg-ink-raised/50 p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl text-moon">{entry.spreadTitle}</h2>
                <span className="text-xs uppercase tracking-widest text-moon-dim">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
              {entry.question && <p className="mt-2 text-sm italic text-moon-dim">&ldquo;{entry.question}&rdquo;</p>}

              <div className="mt-5 flex flex-wrap gap-4">
                {entry.cards.map((card, i) => (
                  <div key={i} className="w-20 text-center">
                    <div className="aspect-[5/8] w-full">
                      <CardFace src={card.image} alt={card.name} orientation={card.orientation} />
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-moon-dim">{card.position}</p>
                    <p className="text-[11px] text-moon">{card.name}</p>
                  </div>
                ))}
              </div>

              {entry.aiReading && (
                <div className="mt-5 border-t border-ink-line/60 pt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.aiDeepReading}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-moon-dim">{entry.aiReading}</p>
                </div>
              )}

              <div className="mt-5 border-t border-ink-line/60 pt-4">
                {editing === entry.id ? (
                  <div>
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-ink-line bg-ink/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
                    />
                    <div className="mt-2 flex gap-3">
                      <button type="button" onClick={() => handleSaveNote(entry.id)} className="text-xs uppercase tracking-widest text-gold">
                        {t.save}
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="text-xs uppercase tracking-widest text-moon-dim">
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <p className="flex-1 text-sm leading-relaxed text-moon-dim">
                      {entry.note || <span className="italic text-moon-dim/60">{t.noNote}</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(entry.id);
                        setNoteDraft(entry.note ?? "");
                      }}
                      className="shrink-0 text-xs uppercase tracking-widest text-gold-dim hover:text-gold"
                    >
                      {entry.note ? t.edit : t.addNote}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 text-right">
                <button type="button" onClick={() => handleDelete(entry.id)} className="text-[11px] uppercase tracking-widest text-moon-dim/60 hover:text-red-400">
                  {t.delete}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
