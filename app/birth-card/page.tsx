import type { Metadata } from "next";
import Link from "next/link";
import BirthCardCalculator from "@/components/BirthCardCalculator";

export const metadata: Metadata = {
  title: "Tarot Birth Card Calculator — Find Your Birth Card | Wyndralore",
  description:
    "Enter your date of birth and discover your tarot birth card — the Major Arcana energy you were born under, calculated the traditional way. Free, instant, no sign-up.",
  alternates: { canonical: "https://wyndralore.com/birth-card" },
};

export default function BirthCardPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Birth Card</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">What&apos;s your tarot birth card?</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">
          Your birth card is the Major Arcana archetype hidden in your date of birth — the lesson you keep
          living, the strength you keep returning to. Unlike a daily draw it never changes: it&apos;s yours for life.
        </p>
      </div>

      <BirthCardCalculator />

      <div className="mx-auto mt-16 max-w-xl space-y-6 text-sm leading-relaxed text-moon-dim">
        <div>
          <h2 className="font-display text-lg text-gold-bright">How it&apos;s calculated</h2>
          <p className="mt-2">
            The traditional method adds your birth month, day and full year together, then reduces the sum a
            digit at a time until it lands on one of the 22 Major Arcana. Many dates reduce through a pair of
            cards — both belong to you: one is the outer pattern of your life, the other the essence beneath it.
            A rare few dates (reducing through 19) carry three.
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-gold-bright">What do I do with it?</h2>
          <p className="mt-2">
            Read your card&apos;s full meaning in our{" "}
            <Link href="/cards" className="text-gold underline underline-offset-4 hover:text-gold-bright">
              card library
            </Link>
            , then notice when its themes surface in your daily draws — the conversation between your lifetime
            card and the card of the day is where tarot gets personal.
          </p>
        </div>
        <p className="text-xs text-moon-dim/70">
          For entertainment and self-reflection purposes only.
        </p>
      </div>
    </section>
  );
}
