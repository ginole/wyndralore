import type { Metadata } from "next";
import Link from "next/link";
import BackgroundFloatingCards from "@/components/BackgroundFloatingCards";
import { SPREAD_ORDER } from "@/lib/spreads";
import { getDict, hreflangAlternates, OG_LOCALE, SITE_URL, TW_PREFIX } from "@/lib/i18n";

const t = getDict("zh-TW");

export const metadata: Metadata = {
  title: "Wyndralore — 免費線上塔羅占卜，帶著儀式感",
  description:
    "親手洗牌、選牌、翻牌——一場為靜心省思而生的塔羅體驗，而不是算命。每日免費占卜，無需註冊。",
  alternates: hreflangAlternates("/"),
  openGraph: {
    title: "Wyndralore — 免費線上塔羅占卜，帶著儀式感",
    description: "親手洗牌、選牌、翻牌——一場為靜心省思而生的塔羅體驗，而不是算命。",
    url: `${SITE_URL}${TW_PREFIX}`,
    siteName: "Wyndralore",
    locale: OG_LOCALE["zh-TW"],
    type: "website",
  },
};

const FREE_TOOLS = [
  { href: "/tw/yes-or-no-tarot", title: "是非塔羅", subtitle: "一張牌，一個乾脆的答案。提問、抽牌、了然——不必註冊。" },
  { href: "/tw/cards", title: "塔羅牌義大全", subtitle: "整副牌每一張的正逆位含義，慢慢讀，慢慢懂。" },
];

const SPECIALS = [
  { href: "/tw/reading/year-ahead", title: "你的未來一年", subtitle: "一張主題牌，加上未來十二個月各一張，讀成一則徐徐展開的故事。", meta: "13 張牌" },
  { href: "/tw/reading/love-compatibility", title: "愛情契合度", subtitle: "兩個人，五張牌：你的能量、對方的能量，以及你們之間那份坦誠的連結。", meta: "5 張牌" },
];

export default function TwHome() {
  return (
    <>
      <section className="relative isolate flex min-h-[86vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center sm:px-10">
        <BackgroundFloatingCards />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[40%] h-[48vh] w-[85vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(201,169,110,0.13), transparent 72%)" }}
        />
        <p className="font-accent relative z-10 mb-5 text-xs uppercase tracking-[0.4em] text-gold">
          {t.home.eyebrow}
        </p>
        <h1 className="font-display relative z-10 max-w-3xl text-balance text-4xl font-medium leading-[1.2] text-moon sm:text-6xl md:text-7xl">
          {t.home.h1Before}
          <span className="glow-text text-gold-bright">{t.home.h1Highlight}</span>
          {t.home.h1After}
        </h1>
        <p className="relative z-10 mt-6 max-w-xl text-balance text-base leading-relaxed text-moon-dim sm:text-lg">
          {t.home.subtitle}
        </p>
        <div className="relative z-10 mt-10 flex w-full flex-col items-center gap-5 sm:w-auto sm:flex-row">
          <Link
            href="/tw/reading/daily"
            className="cta-gold w-full max-w-xs rounded-full px-9 py-4 text-center text-sm font-medium uppercase tracking-[0.2em] sm:w-auto"
          >
            {t.home.drawCta}
          </Link>
          <a
            href="#spreads"
            className="font-accent py-2 text-sm uppercase tracking-[0.2em] text-moon-dim underline decoration-gold-dim underline-offset-8 transition-colors hover:text-moon"
          >
            {t.home.seeSpreads}
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-20 sm:px-10 md:grid-cols-3">
        {t.home.steps.map((step, i) => (
          <div key={i} className="border-t border-gold-dim/40 pt-6 text-center md:text-left">
            <span className="font-accent text-2xl text-gold-dim">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="font-display mt-3 text-2xl text-moon">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-moon-dim">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10">
        <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-dim">{t.home.aiEyebrow}</p>
        <h2 className="font-display mt-4 text-3xl text-moon sm:text-4xl">{t.home.aiTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">{t.home.aiBody}</p>
      </section>

      <section id="spreads" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 sm:px-10">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl text-moon sm:text-4xl">{t.home.spreadsTitle}</h2>
          <p className="mt-3 text-sm text-moon-dim">{t.home.spreadsSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SPREAD_ORDER.map((slug) => {
            const spread = t.spreads[slug];
            const isFree = slug === "daily" || slug === "yes-no" || slug === "three-card";
            const cardCount = slug === "daily" || slug === "yes-no" ? 1 : slug === "three-card" ? 3 : slug === "celtic-cross" ? 10 : 5;
            return (
              <Link
                key={slug}
                href={`/tw/reading/${slug}`}
                className="group relative flex h-full flex-col justify-between rounded-2xl border border-ink-line bg-ink-raised/60 p-6 shadow-[inset_0_1px_0_rgba(228,200,148,0.06)] transition-[border-color,transform,box-shadow] duration-200 hover:border-gold-dim hover:shadow-[inset_0_1px_0_rgba(228,200,148,0.12),0_18px_40px_-24px_rgba(201,169,110,0.35)] active:scale-[0.985]"
              >
                {!isFree && (
                  <span className="font-accent absolute right-4 top-4 rounded-full border border-gold-dim bg-gold/5 px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
                    {t.home.premiumBadge}
                  </span>
                )}
                <div>
                  <h3 className="font-display text-xl text-moon">{spread.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-moon-dim">{spread.subtitle}</p>
                </div>
                <p className="font-accent mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim">
                  {t.home.cardsUnit(cardCount)}
                  <span className="ml-2 inline-block text-gold opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-1 group-hover:opacity-100">→</span>
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h3 className="font-display text-2xl text-moon">{t.home.freeTitle}</h3>
          <p className="mt-2 text-sm text-moon-dim">{t.home.freeSubtitle}</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          {FREE_TOOLS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex h-full flex-col justify-between rounded-2xl border border-ink-line bg-ink-raised/40 p-6 transition-[border-color,transform] duration-200 hover:border-gold-dim active:scale-[0.985]"
            >
              <div>
                <h4 className="font-display text-lg text-moon">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-moon-dim">{item.subtitle}</p>
              </div>
              <p className="font-accent mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim">
                {t.home.freeBadge}
                <span className="ml-2 inline-block text-gold opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-1 group-hover:opacity-100">→</span>
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="font-display text-2xl text-moon">{t.home.specialTitle}</h3>
          <p className="mt-2 text-sm text-moon-dim">{t.home.specialSubtitle}</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          {SPECIALS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-gold-dim/50 bg-ink-raised/60 p-6 shadow-[inset_0_1px_0_rgba(228,200,148,0.1)] transition-[border-color,transform,box-shadow] duration-200 hover:border-gold hover:shadow-[inset_0_1px_0_rgba(228,200,148,0.16),0_18px_40px_-24px_rgba(201,169,110,0.45)] active:scale-[0.985]"
            >
              <span className="font-accent absolute right-4 top-4 rounded-full border border-gold-dim bg-gold/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
                {t.home.oneTimeBadge}
              </span>
              <div>
                <h3 className="font-display text-xl text-moon">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-moon-dim">{item.subtitle}</p>
              </div>
              <p className="font-accent mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim">
                {item.meta}
                <span className="ml-2 inline-block text-gold opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-1 group-hover:opacity-100">→</span>
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
