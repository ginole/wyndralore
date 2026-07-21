import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCards, getCardBySlug, getCardSlug } from "@/lib/cards";
import CardFace from "@/components/CardFace";
import PremiumGate from "@/components/PremiumGate";
import { getDict, hreflangAlternates, OG_LOCALE, SITE_URL, SUIT_LABEL, TW_PREFIX } from "@/lib/i18n";

const t = getDict("zh-TW");

export function generateStaticParams() {
  return getAllCards().map((card) => ({ slug: getCardSlug(card) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = getCardBySlug(slug, "zh-TW");
  if (!card) return { title: "找不到這張牌 — Wyndralore" };
  const keywords = card.keywords_upright.slice(0, 3).join("、");
  return {
    title: t.card.metaTitle(card.name),
    description: t.card.metaDescription(card.name, keywords),
    alternates: hreflangAlternates(`/cards/${slug}`),
    openGraph: {
      title: `${card.name} — 塔羅牌義`,
      description: t.card.metaDescription(card.name, keywords),
      url: `${SITE_URL}${TW_PREFIX}/cards/${slug}`,
      siteName: "Wyndralore",
      locale: OG_LOCALE["zh-TW"],
      images: [{ url: card.image }],
    },
  };
}

const THEMES: { key: "love" | "career" | "wellness"; label: string }[] = [
  { key: "love", label: t.card.love },
  { key: "career", label: t.card.career },
  { key: "wellness", label: t.card.wellness },
];

export default async function TwCardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getCardBySlug(slug, "zh-TW");
  if (!card) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    inLanguage: "zh-Hant-TW",
    headline: `${card.name} 塔羅牌義`,
    about: `${card.name} 塔羅牌`,
    keywords: [...card.keywords_upright, ...card.keywords_reversed].join("、"),
    articleBody: `${card.meaning_upright} ${card.meaning_reversed}`,
    publisher: { "@type": "Organization", name: "Wyndralore" },
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-8 text-xs uppercase tracking-[0.2em] text-moon-dim">
        <Link href={`${TW_PREFIX}/cards`} className="hover:text-gold">
          {t.card.allCards}
        </Link>
      </nav>

      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="w-40 shrink-0 sm:w-48">
          <div className="aspect-[5/8] w-full">
            <CardFace src={card.image} alt={`${card.name} 塔羅牌`} priority />
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">
            {card.arcana === "major" ? t.card.majorArcana : `${SUIT_LABEL["zh-TW"][card.suit ?? ""] ?? ""} · ${t.card.minorArcana}`}
          </p>
          <h1 className="font-display mt-2 text-4xl text-moon sm:text-5xl">{card.name}</h1>
          <p className="font-display mt-4 text-lg italic text-gold-bright">「{card.affirmation}」</p>
        </div>
      </header>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl text-moon">{t.card.upright}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {card.keywords_upright.map((k) => (
              <li key={k} className="rounded-full border border-gold-dim/50 px-3 py-1 text-xs text-gold">
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-moon-dim">{card.meaning_upright}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-moon">{t.card.reversed}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {card.keywords_reversed.map((k) => (
              <li key={k} className="rounded-full border border-ink-line px-3 py-1 text-xs text-moon-dim">
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-moon-dim">{card.meaning_reversed}</p>
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl text-moon">{t.card.themesTitle}</h2>
        <p className="mt-2 text-sm text-moon-dim">{t.card.themesSubtitle(card.name)}</p>
        <div className="mt-6">
          <PremiumGate>
            <div className="flex flex-col gap-6">
              {THEMES.map((theme) => (
                <div key={theme.key} className="rounded-2xl border border-ink-line bg-ink-raised/50 p-6">
                  <h3 className="font-display text-xl text-gold-bright">{theme.label}</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gold-dim">{t.card.upright}</p>
                      <p className="mt-1 text-sm leading-relaxed text-moon-dim">{card[`${theme.key}_upright`]}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gold-dim">{t.card.reversed}</p>
                      <p className="mt-1 text-sm leading-relaxed text-moon-dim">{card[`${theme.key}_reversed`]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumGate>
        </div>
      </div>

      <div className="mt-14 border-t border-ink-line/60 pt-10 text-center">
        <p className="text-sm text-moon-dim">{t.card.drawPrompt}</p>
        <Link
          href="/tw/reading/daily"
          className="mt-4 inline-block rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
        >
          {t.card.drawCta}
        </Link>
      </div>
    </article>
  );
}
