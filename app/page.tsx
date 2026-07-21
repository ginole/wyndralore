import type { Metadata } from "next";
import Link from "next/link";
import BackgroundFloatingCards from "@/components/BackgroundFloatingCards";
import { SPREADS, SPREAD_ORDER } from "@/lib/spreads";
import { hreflangAlternates } from "@/lib/i18n";

// Title/description/OG come from the root layout; here we only add the hreflang pairing to the
// 繁體 homepage (reciprocal to /tw's alternates).
export const metadata: Metadata = {
  alternates: { canonical: "/", ...hreflangAlternates("/") },
};

const STEPS = [
  {
    n: "01",
    title: "Shuffle",
    body: "Cut the deck yourself. Shuffle as many times as it takes to feel ready.",
  },
  {
    n: "02",
    title: "Select",
    body: "Draw your cards by hand from the fan — no card is chosen for you.",
  },
  {
    n: "03",
    title: "Reveal",
    body: "Watch each card turn, and read what it has to say about where you are.",
  },
];

export default function Home() {
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
          Free · No account needed
        </p>
        <h1 className="font-display relative z-10 max-w-3xl text-balance text-5xl font-medium leading-[1.1] text-moon sm:text-6xl md:text-7xl">
          A tarot reading with a <span className="glow-text text-gold-bright">ritual</span>, not a gimmick.
        </h1>
        <p className="relative z-10 mt-6 max-w-xl text-balance text-base leading-relaxed text-moon-dim sm:text-lg">
          Shuffle by hand. Choose your own cards. Watch them turn. Wyndralore brings the quiet ceremony
          of an in-person tarot reading to your screen.
        </p>
        <div className="relative z-10 mt-10 flex w-full flex-col items-center gap-5 sm:w-auto sm:flex-row">
          <Link
            href="/reading/daily"
            className="cta-gold w-full max-w-xs rounded-full px-9 py-4 text-center text-sm font-medium uppercase tracking-[0.2em] sm:w-auto"
          >
            Draw Your Card
          </Link>
          <a
            href="#spreads"
            className="font-accent py-2 text-sm uppercase tracking-[0.2em] text-moon-dim underline decoration-gold-dim underline-offset-8 transition-colors hover:text-moon"
          >
            See all spreads
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-20 sm:px-10 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="border-t border-gold-dim/40 pt-6 text-center md:text-left">
            <span className="font-accent text-2xl text-gold-dim">{step.n}</span>
            <h3 className="font-display mt-3 text-2xl text-moon">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-moon-dim">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10">
        <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-dim">AI-Powered Personal Insight Engine</p>
        <h2 className="font-display mt-4 text-3xl text-moon sm:text-4xl">The ritual, then a mirror</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">
          You still shuffle, choose, and reveal by hand — nothing about that changes. Once your cards are turned,
          an AI reading traces the energy between them and ties it back to your question, free of judgment or
          personal bias. Every reading includes one free distilled insight; go deeper any time.
        </p>
      </section>

      <section id="spreads" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 sm:px-10">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl text-moon sm:text-4xl">Choose your spread</h2>
          <p className="mt-3 text-sm text-moon-dim">
            Start free with a single card, or explore a deeper spread.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SPREAD_ORDER.map((slug) => {
            const spread = SPREADS[slug];
            const premium = !spread.free;
            return (
              <Link
                key={slug}
                href={`/reading/${slug}`}
                className="group relative flex h-full flex-col justify-between rounded-2xl border border-ink-line bg-ink-raised/60 p-6 shadow-[inset_0_1px_0_rgba(228,200,148,0.06)] transition-[border-color,transform,box-shadow] duration-200 hover:border-gold-dim hover:shadow-[inset_0_1px_0_rgba(228,200,148,0.12),0_18px_40px_-24px_rgba(201,169,110,0.35)] active:scale-[0.985]"
              >
                {premium && (
                  <span className="font-accent absolute right-4 top-4 rounded-full border border-gold-dim bg-gold/5 px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
                    Premium
                  </span>
                )}
                <div>
                  <h3 className="font-display text-xl text-moon">{spread.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-moon-dim">{spread.subtitle}</p>
                </div>
                <p className="font-accent mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim">
                  {spread.count} card{spread.count > 1 ? "s" : ""}
                  <span className="ml-2 inline-block text-gold opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-1 group-hover:opacity-100">→</span>
                </p>
              </Link>
            );
          })}
        </div>

        {/* Free tools. These two exist to be FOUND — they target real search demand ("tarot birth
            card", "yes or no tarot") — but until now nothing on the site linked to them, so they
            lived only in sitemap.xml. Google treats a page with no internal links as a page the
            site itself doesn't consider important, and both sat in "Discovered – currently not
            indexed". A link from the homepage is the cheapest possible signal otherwise. */}
        <div className="mt-16 text-center">
          <h3 className="font-display text-2xl text-moon">Free to try</h3>
          <p className="mt-2 text-sm text-moon-dim">No sign-up, no cards to shuffle — just an answer.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          {[
            {
              href: "/yes-or-no-tarot",
              title: "Yes or No Tarot",
              subtitle: "One card, one straight answer. Ask, draw, know — nothing to sign up for.",
            },
            {
              href: "/birth-card",
              title: "Your Birth Card",
              subtitle: "The card your birthday points to, and what it says about the pattern you keep returning to.",
            },
          ].map((item) => (
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
                Free
                <span className="ml-2 inline-block text-gold opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-1 group-hover:opacity-100">→</span>
              </p>
            </Link>
          ))}
        </div>

        {/* One-time special readings — bought once, not part of the membership. */}
        <div className="mt-16 text-center">
          <h3 className="font-display text-2xl text-moon">Special readings</h3>
          <p className="mt-2 text-sm text-moon-dim">Big questions, one-time rituals — yours forever, no subscription.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          {[
            {
              href: "/reading/year-ahead",
              title: "Your Year Ahead",
              subtitle: "A theme card and one card for each of the next twelve months, read as a single unfolding story.",
              meta: "13 cards",
            },
            {
              href: "/reading/love-compatibility",
              title: "Love Compatibility",
              subtitle: "Two people, five cards: your energy, theirs, and an honest reading of the bond between you.",
              meta: "5 cards",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-gold-dim/50 bg-ink-raised/60 p-6 shadow-[inset_0_1px_0_rgba(228,200,148,0.1)] transition-[border-color,transform,box-shadow] duration-200 hover:border-gold hover:shadow-[inset_0_1px_0_rgba(228,200,148,0.16),0_18px_40px_-24px_rgba(201,169,110,0.45)] active:scale-[0.985]"
            >
              <span className="font-accent absolute right-4 top-4 rounded-full border border-gold-dim bg-gold/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
                One-time
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
