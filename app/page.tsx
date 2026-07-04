import Link from "next/link";
import BackgroundFloatingCards from "@/components/BackgroundFloatingCards";
import { SPREADS, SPREAD_ORDER } from "@/lib/spreads";

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
        <p className="relative z-10 mb-5 text-xs uppercase tracking-[0.4em] text-gold">
          Free · No account needed
        </p>
        <h1 className="font-display relative z-10 max-w-3xl text-balance text-5xl font-medium leading-[1.1] text-moon sm:text-6xl md:text-7xl">
          A tarot reading with a <span className="glow-text text-gold-bright">ritual</span>, not a gimmick.
        </h1>
        <p className="relative z-10 mt-6 max-w-xl text-balance text-base leading-relaxed text-moon-dim sm:text-lg">
          Shuffle by hand. Choose your own cards. Watch them turn. Wyndralore brings the quiet ceremony
          of an in-person tarot reading to your screen.
        </p>
        <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/reading/daily"
            className="rounded-full bg-gold px-9 py-4 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
          >
            Draw Your Card
          </Link>
          <a
            href="#spreads"
            className="text-sm uppercase tracking-[0.2em] text-moon-dim underline decoration-gold-dim underline-offset-8 transition-colors hover:text-moon"
          >
            See all spreads
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-20 sm:px-10 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="text-center md:text-left">
            <span className="font-display text-3xl text-gold-dim">{step.n}</span>
            <h3 className="font-display mt-3 text-2xl text-moon">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-moon-dim">{step.body}</p>
          </div>
        ))}
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
                className="group relative flex h-full flex-col justify-between rounded-2xl border border-ink-line bg-ink-raised/60 p-6 transition-colors hover:border-gold-dim"
              >
                {premium && (
                  <span className="absolute right-4 top-4 rounded-full border border-gold-dim px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
                    Premium
                  </span>
                )}
                <div>
                  <h3 className="font-display text-xl text-moon">{spread.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-moon-dim">{spread.subtitle}</p>
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim">
                  {spread.count} card{spread.count > 1 ? "s" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
