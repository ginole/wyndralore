import type { Metadata } from "next";
import Link from "next/link";
import { getAllCards, getCardSlug } from "@/lib/cards";
import CardFace from "@/components/CardFace";
import { getDict, hreflangAlternates, OG_LOCALE, SITE_URL, TW_PREFIX } from "@/lib/i18n";

const t = getDict("zh-TW");

export const metadata: Metadata = {
  title: "塔羅牌義大全 — 完整 78 張牌卡典藏 | Wyndralore",
  description:
    "探索全部 78 張塔羅牌的含義——大阿爾克那與小阿爾克那。正位與逆位關鍵字，以及愛情、事業、健康的解讀，為賦予力量而寫，而非預測。",
  alternates: hreflangAlternates("/cards"),
  openGraph: {
    title: "塔羅牌義大全 — 完整 78 張牌卡典藏 | Wyndralore",
    description: "探索全部 78 張塔羅牌的含義——大阿爾克那與小阿爾克那，正位與逆位。",
    url: `${SITE_URL}${TW_PREFIX}/cards`,
    siteName: "Wyndralore",
    locale: OG_LOCALE["zh-TW"],
    type: "website",
  },
};

const SUIT_SECTIONS: { key: string; title: string; filter: (arcana: string, suit: string | null) => boolean }[] = [
  { key: "major", title: "大阿爾克那", filter: (arcana) => arcana === "major" },
  { key: "wands", title: "權杖牌組", filter: (_a, suit) => suit === "wands" },
  { key: "cups", title: "聖杯牌組", filter: (_a, suit) => suit === "cups" },
  { key: "swords", title: "寶劍牌組", filter: (_a, suit) => suit === "swords" },
  { key: "pentacles", title: "錢幣牌組", filter: (_a, suit) => suit === "pentacles" },
];

export default function TwCardsIndexPage() {
  const cards = getAllCards("zh-TW");

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">典藏</p>
        <h1 className="font-display mt-3 text-4xl text-moon sm:text-5xl">{t.cardsIndex.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">
          塔羅全部 78 張牌，每一張都是為了幫你看清當下——而非預言一個注定的未來。點任一張牌，讀它完整的含義。
        </p>
      </div>

      {SUIT_SECTIONS.map((section) => {
        const sectionCards = cards.filter((c) => section.filter(c.arcana, c.suit));
        return (
          <div key={section.key} className="mt-14">
            <h2 className="font-display text-2xl text-gold-bright">{section.title}</h2>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {sectionCards.map((card) => (
                <Link key={card.id} href={`${TW_PREFIX}/cards/${getCardSlug(card)}`} className="group text-center">
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
