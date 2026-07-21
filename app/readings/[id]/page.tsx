"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CardFace from "@/components/CardFace";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import { getAppDict } from "@/lib/i18nApp";

interface SavedCard {
  position: string;
  name: string;
  orientation: "upright" | "reversed";
  image: string;
}

interface SavedReading {
  id: string;
  kind: string;
  title: string;
  cards: SavedCard[];
  aiText: string;
  createdAt: string;
}

/** The permanent page for a purchased special reading — part of what the buyer paid for. */
export default function SavedReadingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const locale = useLocale();
  const t = getAppDict(locale).special;
  const tw = locale === "zh-TW";
  const [reading, setReading] = useState<SavedReading | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState("missing");
      return;
    }
    fetch(`/api/special-reading/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) {
          setReading(data);
          setState("ready");
        } else setState("missing");
      })
      .catch(() => setState("missing"));
  }, [id, user, loading]);

  if (state === "loading" || loading) {
    return <section className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6 text-moon-dim">…</section>;
  }

  if (state === "missing" || !reading) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl text-moon">{t.notFound}</h1>
        <p className="mt-3 text-sm text-moon-dim">{t.notFoundBody}</p>
        <Link href={tw ? "/tw/account" : "/account"} className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
          {t.yourAccount}
        </Link>
      </section>
    );
  }

  const isYear = reading.kind === "year_reading";
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{isYear ? t.labels.year_reading : t.labels.love_reading}</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">{reading.title}</h1>
        <p className="mt-2 text-xs text-moon-dim/70">{new Date(reading.createdAt).toLocaleDateString()}</p>
      </div>

      <div className={`grid gap-3 ${isYear ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-7" : "grid-cols-3 sm:grid-cols-5"}`}>
        {reading.cards.map((c) => (
          <div key={`${c.position}-${c.name}`} className="flex flex-col items-center gap-1.5">
            <div className="aspect-[5/8] w-full">
              <CardFace src={c.image} alt={c.name} orientation={c.orientation} shine="hover" />
            </div>
            <span className="text-center text-[9px] uppercase leading-tight tracking-wide text-moon-dim/70">{c.position}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-gold-dim/40 bg-ink-raised/40 p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-moon">{reading.aiText}</p>
      </div>
    </section>
  );
}
