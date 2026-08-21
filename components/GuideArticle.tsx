import Link from "next/link";
import { renderGuideText } from "@/components/guideText";
import { getGuideContent, getRelatedGuides, type Guide } from "@/lib/guides";
import { getDict, SITE_URL, TW_PREFIX, type Locale } from "@/lib/i18n";

// A single guide article. Server component, locale-driven, shared by /guides/[slug] and
// /tc/guides/[slug]. Inline [[…]] tokens in the copy become locale-aware internal links — the
// whole point of the section is to push contextual links down into the card and reading pages.
export default function GuideArticle({ guide, locale }: { guide: Guide; locale: Locale }) {
  const t = getDict(locale).guides;
  const prefix = locale === "zh-TW" ? TW_PREFIX : "";
  const c = getGuideContent(guide, locale);
  const related = getRelatedGuides(guide);
  const url = `${SITE_URL}${prefix}/guides/${guide.slug}`;
  const inLanguage = locale === "zh-TW" ? "zh-Hant-TW" : "en";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        headline: c.title,
        description: c.metaDescription,
        articleBody: [c.intro, ...c.sections.flatMap((s) => s.body)]
          .map((p) => p.replace(/\[\[.+?\|(.+?)\]\]/g, "$1"))
          .join(" "),
        inLanguage,
        publisher: { "@type": "Organization", name: "Wyndralore", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.indexTitle, item: `${SITE_URL}${prefix}/guides` },
          { "@type": "ListItem", position: 2, name: c.title, item: url },
        ],
      },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-8 text-xs uppercase tracking-[0.2em] text-moon-dim">
        <Link href={`${prefix}/guides`} className="hover:text-gold">
          {t.backToGuides}
        </Link>
      </nav>

      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.eyebrow}</p>
        <h1 className="font-display mt-3 text-3xl leading-tight text-moon sm:text-4xl">{c.title}</h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold-dim">{t.minRead(guide.readMinutes)}</p>
        <p className="mt-6 text-base leading-relaxed text-moon-dim">{renderGuideText(c.intro, locale)}</p>
      </header>

      <div className="mt-12 space-y-12">
        {c.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl text-gold-bright">{section.heading}</h2>
            <div className="mt-4 space-y-4">
              {section.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-moon-dim">
                  {renderGuideText(p, locale)}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-ink-line/60 pt-10">
          <h2 className="font-display text-2xl text-moon">{t.continueReading}</h2>
          <ul className="mt-5 space-y-3">
            {related.map((r) => {
              const rc = getGuideContent(r, locale);
              return (
                <li key={r.slug}>
                  <Link
                    href={`${prefix}/guides/${r.slug}`}
                    className="block rounded-xl border border-ink-line px-5 py-4 text-sm text-moon-dim transition-colors hover:border-gold-dim hover:text-gold"
                  >
                    {rc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-14 border-t border-ink-line/60 pt-10 text-center">
        <p className="text-sm text-moon-dim">{t.ctaPrompt}</p>
        <Link
          href={`${prefix}/reading/daily`}
          className="mt-4 inline-block rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
        >
          {t.ctaButton}
        </Link>
      </div>

      <p className="mt-10 text-center text-xs text-moon-dim/70">
        {locale === "zh-TW" ? "僅供娛樂與自我省思之用。" : "For entertainment and self-reflection purposes only."}
      </p>
    </article>
  );
}
