import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Yes or No Tarot — Free Instant One-Card Answer | Wyndralore",
  description:
    "Ask a yes-or-no question and draw one card for a clear, honest answer. A free instant yes/no tarot reading with a real shuffle-and-draw ritual — no sign-up needed.",
  alternates: { canonical: "https://wyndralore.com/yes-or-no-tarot" },
};

const FAQ = [
  {
    q: "How does a yes or no tarot reading work?",
    a: "You hold one clear question in mind, shuffle, and draw a single card. Upright energy generally leans yes; reversed energy leans no — and the card itself tells you why, which is the part a coin flip can't give you.",
  },
  {
    q: "What questions work best?",
    a: "Questions you actually have a hand in: “Should I send the message?” works better than “Will it rain tomorrow?” Tarot reads the energy around a choice — it doesn't predict fixed events.",
  },
  {
    q: "Can I ask the same question twice?",
    a: "One question, one draw is the honest practice. Re-drawing until you like the answer tells you something too — you already know what you want. Ask a different angle instead.",
  },
  {
    q: "Is this really free?",
    a: "Yes — the yes/no draw is part of your free daily reading. No account needed for your first draw of the day.",
  },
];

export default function YesOrNoPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Yes / No Tarot</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Ask. Draw one card. Know.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">
          Some questions don&apos;t need a ten-card spread — they need a straight answer. Hold your question,
          shuffle the deck yourself, and draw a single card for a clear yes-or-no lean and the reason behind it.
        </p>
        <Link
          href="/reading/yes-no"
          className="mt-8 inline-block rounded-full bg-gold px-9 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
        >
          Ask your question now
        </Link>
        <p className="mt-3 text-xs text-moon-dim/70">Free · instant · you shuffle and draw yourself</p>
      </div>

      <div className="mx-auto mt-16 max-w-xl space-y-8">
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2 className="font-display text-lg text-gold-bright">{item.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-moon-dim">{item.a}</p>
          </div>
        ))}
        <p className="text-sm leading-relaxed text-moon-dim">
          Want more than a yes or no? A{" "}
          <Link href="/reading/three-card" className="text-gold underline underline-offset-4 hover:text-gold-bright">
            past–present–future spread
          </Link>{" "}
          shows the story around your question, and every reading can be deepened with a written AI reading
          composed for your exact cards.
        </p>
        <p className="text-xs text-moon-dim/70">For entertainment and self-reflection purposes only.</p>
      </div>
    </section>
  );
}
