import type { Metadata } from "next";
import Link from "next/link";
import { getAllCards, getCardSlug } from "@/lib/cards";
import CardFace from "@/components/CardFace";

export const metadata: Metadata = {
  title: "Tarot Card Meanings — The Complete 78-Card Library | Wyndralore",
  description:
    "Explore the meaning of all 78 tarot cards — Major and Minor Arcana. Upright and reversed keywords, love, career, and wellness readings, written to empower not predict.",
  alternates: { canonical: "/cards" },
};

const SUIT_SECTIONS: { key: string; title: string; filter: (arcana: string, suit: string | null) => boolean }[] = [
  { key: "major", title: "Major Arcana", filter: (arcana) => arcana === "major" },
  { key: "wands", title: "Suit of Wands", filter: (_a, suit) => suit === "wands" },
  { key: "cups", title: "Suit of Cups", filter: (_a, suit) => suit === "cups" },
  { key: "swords", title: "Suit of Swords", filter: (_a, suit) => suit === "swords" },
  { key: "pentacles", title: "Suit of Pentacles", filter: (_a, suit) => suit === "pentacles" },
];

export default function CardsIndexPage() {
  const cards = getAllCards();

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">The Library</p>
        <h1 className="font-display mt-3 text-4xl text-moon sm:text-5xl">Tarot Card Meanings</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">
          All 78 cards of the tarot, each written to help you see the present clearly — not to predict a fixed future.
          Tap any card to read its full meaning.
        </p>
      </div>

      {SUIT_SECTIONS.map((section) => {
        const sectionCards = cards.filter((c) => section.filter(c.arcana, c.suit));
        return (
          <div key={section.key} className="mt-14">
            <h2 className="font-display text-2xl text-gold-bright">{section.title}</h2>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {sectionCards.map((card) => (
                <Link key={card.id} href={`/cards/${getCardSlug(card)}`} className="group text-center">
                  <div className="aspect-[5/8] w-full overflow-hidden rounded-lg ring-1 ring-ink-line transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_8px_28px_-6px_rgba(228,200,148,0.35)] group-hover:ring-gold-dim">
                    <CardFace src={card.image} alt={card.name} shine="hover" />
                  </div>
                  <p className="mt-2 text-xs text-moon transition-colors group-hover:text-gold">{card.name}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
