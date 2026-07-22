import Link from "next/link";
import type { Metadata } from "next";
import { getSpread } from "@/lib/spreads";
import { getDeckManifest } from "@/lib/cards";
import { getCurrentUser } from "@/lib/auth";
import { premiumSpreadAccess, PremiumSpreadAccess } from "@/lib/premiumSpread";
import { SpreadConfig } from "@/lib/types";
import ReadingExperience from "@/components/ReadingExperience";
import { getDict } from "@/lib/i18n";

// 繁體 mirror of app/reading/[spread]/page.tsx. Same access/quota logic; ReadingExperience localizes
// itself from the /tc path, and we hand it the 繁體 deck manifest so card names in the fan are 繁體.
// The route segment is [slug] (not [spread]) to avoid a param-name clash with the English tree.
export const dynamic = "force-dynamic";

const t = getDict("zh-TW");

export async function generateStaticParams() {
  return ["daily", "yes-no", "pick-a-card", "three-card"].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sp = t.spreads[slug];
  if (!sp) return { title: "占卜 — Wyndralore" };
  return { title: `${sp.title} — Wyndralore 塔羅占卜`, description: sp.subtitle };
}

function PremiumUpsell({ spread }: { spread: SpreadConfig }) {
  const sp = t.spreads[spread.slug];
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">進階牌陣</p>
      <h1 className="font-display mt-4 text-3xl text-moon sm:text-4xl">{sp?.title ?? spread.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-moon-dim">{sp?.subtitle ?? spread.subtitle}</p>
      <p className="mt-4 text-sm leading-relaxed text-moon-dim">
        這個 {spread.count} 張牌的牌陣，需以 Wyndralore 進階會員解鎖——無限次占卜、每一個進階牌陣，以及你自己的占卜筆記。
      </p>
      <Link
        href="/tc/pricing"
        className="mt-8 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.03] hover:bg-gold-bright"
      >
        升級進階會員
      </Link>
      <Link href="/tc/account" className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-dim underline underline-offset-4 hover:text-gold">
        或邀請朋友，賺取免費解鎖
      </Link>
      <Link href="/tc/reading/daily" className="mt-4 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon">
        或抽一張你的免費每日牌
      </Link>
    </section>
  );
}

export default async function TwReadingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spread = getSpread(slug);

  if (!spread) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">找不到這個牌陣</h1>
        <Link href="/tc" className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
          返回 Wyndralore
        </Link>
      </section>
    );
  }

  let access: PremiumSpreadAccess = { allowed: false, creditsRemaining: 0 };
  if (!spread.free) {
    try {
      const user = await getCurrentUser();
      access = user ? premiumSpreadAccess(user) : { allowed: false, creditsRemaining: 0 };
    } catch (err) {
      console.error("[tw/reading] premium check failed, degrading to upsell", err);
    }
    if (!access.allowed) return <PremiumUpsell spread={spread} />;
  }

  const deck = getDeckManifest("zh-TW");
  const creditUnlock = access.allowed && access.via === "credit" ? { creditsRemaining: access.creditsRemaining } : undefined;

  return (
    <>
      <ReadingExperience spread={spread} deck={deck} creditUnlock={creditUnlock} />
      {spread.slug === "yes-no" && (
        <p className="mx-auto max-w-lg px-6 pb-16 text-center text-sm text-moon-dim">
          只想要一個乾脆的答案，不用洗牌？{" "}
          <Link href="/tc/yes-or-no-tarot" className="text-gold-dim underline underline-offset-4 hover:text-gold">
            試試即時的是非塔羅
          </Link>
          。
        </p>
      )}
    </>
  );
}
