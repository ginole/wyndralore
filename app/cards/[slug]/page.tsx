import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCards, getCardBySlug, getCardSlug } from "@/lib/cards";
import CardFace from "@/components/CardFace";
import PremiumGate from "@/components/PremiumGate";

export function generateStaticParams() {
  return getAllCards().map((card) => ({ slug: getCardSlug(card) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = getCardBySlug(slug);
  if (!card) return { title: "Card not found — Wyndralore" };
  const desc = `${card.name} tarot card meaning: ${card.keywords_upright.slice(0, 3).join(", ")}. Upright and reversed meanings for love, career, and wellness.`;
  return {
    title: `${card.name} Tarot Card Meaning (Upright & Reversed) | Wyndralore`,
    description: desc,
    alternates: { canonical: `/cards/${slug}` },
    openGraph: {
      title: `${card.name} — Tarot Card Meaning`,
      description: desc,
      images: [{ url: card.image }],
    },
  };
}

const THEMES: { key: "love" | "career" | "wellness"; label: string }[] = [
  { key: "love", label: "Love" },
  { key: "career", label: "Career" },
  { key: "wellness", label: "Wellness" },
];

export default async function CardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getCardBySlug(slug);
  if (!card) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${card.name} Tarot Card Meaning`,
    about: `${card.name} tarot card`,
    keywords: [...card.keywords_upright, ...card.keywords_reversed].join(", "),
    articleBody: `${card.meaning_upright} ${card.meaning_reversed}`,
    publisher: { "@type": "Organization", name: "Wyndralore" },
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-8 text-xs uppercase tracking-[0.2em] text-moon-dim">
        <Link href="/cards" className="hover:text-gold">
          ← All Cards
        </Link>
      </nav>

      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="w-40 shrink-0 sm:w-48">
          <div className="aspect-[5/8] w-full">
            <CardFace src={card.image} alt={`${card.name} tarot card`} priority />
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">
            {card.arcana === "major" ? "Major Arcana" : `${card.suit} · Minor Arcana`}
          </p>
          <h1 className="font-display mt-2 text-4xl text-moon sm:text-5xl">{card.name}</h1>
          <p className="font-display mt-4 text-lg italic text-gold-bright">&ldquo;{card.affirmation}&rdquo;</p>
        </div>
      </header>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl text-moon">Upright</h2>
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
          <h2 className="font-display text-2xl text-moon">Reversed</h2>
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
        <h2 className="font-display text-2xl text-moon">Themes in depth</h2>
        <p className="mt-2 text-sm text-moon-dim">How {card.name} speaks to different areas of life.</p>
        <div className="mt-6">
          <PremiumGate>
            <div className="flex flex-col gap-6">
              {THEMES.map((theme) => (
                <div key={theme.key} className="rounded-2xl border border-ink-line bg-ink-raised/50 p-6">
                  <h3 className="font-display text-xl text-gold-bright">{theme.label}</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gold-dim">Upright</p>
                      <p className="mt-1 text-sm leading-relaxed text-moon-dim">{card[`${theme.key}_upright`]}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gold-dim">Reversed</p>
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
        <p className="text-sm text-moon-dim">Want to see this card in a reading?</p>
        <Link
          href="/reading/daily"
          className="mt-4 inline-block rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
        >
          Draw Your Card
        </Link>
      </div>
    </article>
  );
}
