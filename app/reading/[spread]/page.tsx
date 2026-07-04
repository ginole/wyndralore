import Link from "next/link";
import type { Metadata } from "next";
import { getSpread } from "@/lib/spreads";
import { getDeckManifest } from "@/lib/cards";
import { getCurrentUser } from "@/lib/auth";
import { isPremiumActive } from "@/lib/quota";
import ReadingExperience from "@/components/ReadingExperience";

export async function generateStaticParams() {
  return ["daily", "yes-no", "three-card"].map((spread) => ({ spread }));
}

export async function generateMetadata({ params }: { params: Promise<{ spread: string }> }): Promise<Metadata> {
  const { spread: slug } = await params;
  const spread = getSpread(slug);
  if (!spread) return { title: "Reading — Wyndralore" };
  return {
    title: `${spread.title} — Wyndralore Tarot Reading`,
    description: spread.subtitle,
  };
}

export default async function ReadingPage({ params }: { params: Promise<{ spread: string }> }) {
  const { spread: slug } = await params;
  const spread = getSpread(slug);

  if (!spread) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">Spread not found</h1>
        <Link href="/" className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
          Back to Wyndralore
        </Link>
      </section>
    );
  }

  if (!spread.free) {
    const user = await getCurrentUser();
    const premium = user ? isPremiumActive(user) : false;
    if (!premium) {
      return (
        <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Premium Spread</p>
          <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">{spread.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-moon-dim">{spread.subtitle}</p>
          <p className="mt-4 text-sm leading-relaxed text-moon-dim">
            This {spread.count}-card spread unlocks with Wyndralore Premium — unlimited readings, every premium spread, and
            your own reading journal.
          </p>
          <Link
            href="/pricing"
            className="mt-8 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
          >
            Go Premium
          </Link>
          <Link
            href="/reading/daily"
            className="mt-6 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
          >
            Or draw your free daily card
          </Link>
        </section>
      );
    }
  }

  const deck = getDeckManifest();

  return <ReadingExperience spread={spread} deck={deck} />;
}
