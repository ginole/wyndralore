import Link from "next/link";
import { getAllGuides, getGuideContent } from "@/lib/guides";
import { getDict, SITE_URL, TW_PREFIX, type Locale } from "@/lib/i18n";

// The /guides index — a listing of every guide. Server component, locale-driven, so the English
// route (/guides) and the 繁體 route (/tc/guides) share one implementation.
export default function GuidesIndex({ locale }: { locale: Locale }) {
  const t = getDict(locale).guides;
  const prefix = locale === "zh-TW" ? TW_PREFIX : "";
  const guides = getAllGuides();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.indexTitle,
    description: t.indexIntro,
    url: `${SITE_URL}${prefix}/guides`,
    inLanguage: locale === "zh-TW" ? "zh-Hant-TW" : "en",
    hasPart: guides.map((g) => ({
      "@type": "Article",
      headline: getGuideContent(g, locale).title,
      url: `${SITE_URL}${prefix}/guides/${g.slug}`,
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl text-moon sm:text-5xl">{t.indexTitle}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">{t.indexIntro}</p>
      </div>

      <ul className="mt-14 space-y-4">
        {guides.map((g) => {
          const c = getGuideContent(g, locale);
          return (
            <li key={g.slug}>
              <Link
                href={`${prefix}/guides/${g.slug}`}
                className="group block rounded-2xl border border-ink-line bg-ink-raised/40 p-6 transition-colors hover:border-gold-dim"
              >
                <h2 className="font-display text-xl text-moon transition-colors group-hover:text-gold">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-moon-dim">{c.excerpt}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold-dim">{t.minRead(g.readMinutes)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
