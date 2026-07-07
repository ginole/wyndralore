import Link from "next/link";
import type { Metadata } from "next";
import { getSpread } from "@/lib/spreads";
import { getDeckManifest } from "@/lib/cards";
import { getCurrentUser } from "@/lib/auth";
import { premiumSpreadAccess, PremiumSpreadAccess } from "@/lib/premiumSpread";
import { SpreadConfig } from "@/lib/types";
import ReadingExperience from "@/components/ReadingExperience";

// Premium spreads check the signed-in user's plan via cookies() (a dynamic API), which
// conflicts with static generation for this route — force per-request rendering so that
// doesn't throw DYNAMIC_SERVER_USAGE for love/career/celtic-cross.
export const dynamic = "force-dynamic";

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

function PremiumUpsell({ spread }: { spread: SpreadConfig }) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Premium Spread</p>
      <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">{spread.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-moon-dim">{spread.subtitle}</p>
      <p className="mt-4 text-sm leading-relaxed text-moon-dim">
        This {spread.count}-card spread unlocks with Wyndralore Premium — unlimited readings, every premium spread, and your
        own reading journal.
      </p>
      <Link
        href="/pricing"
        className="mt-8 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
      >
        Go Premium
      </Link>
      <Link
        href="/account"
        className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim underline underline-offset-4 hover:text-gold"
      >
        Or invite friends to earn free unlocks
      </Link>
      <Link
        href="/reading/daily"
        className="mt-4 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
      >
        Or draw your free daily card
      </Link>
    </section>
  );
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

  let access: PremiumSpreadAccess = { allowed: false, creditsRemaining: 0 };
  if (!spread.free) {
    // Fail closed, not crash: any error while checking access routes to the upsell/pricing page
    // instead of a raw 500 — a broken auth check should never block the whole page from rendering.
    try {
      const user = await getCurrentUser();
      access = user ? premiumSpreadAccess(user) : { allowed: false, creditsRemaining: 0 };
    } catch (err) {
      console.error("[reading] premium check failed, degrading to upsell", err);
    }
    if (!access.allowed) return <PremiumUpsell spread={spread} />;
  }

  const deck = getDeckManifest();

  // Tell the client when this premium spread is being unlocked by a referral credit (vs. a paid
  // plan) so it can show the "using 1 free unlock" note; the credit is actually spent server-side
  // at first card pick (draw-consume), never on merely opening the page.
  const creditUnlock = access.allowed && access.via === "credit" ? { creditsRemaining: access.creditsRemaining } : undefined;

  return <ReadingExperience spread={spread} deck={deck} creditUnlock={creditUnlock} />;
}
