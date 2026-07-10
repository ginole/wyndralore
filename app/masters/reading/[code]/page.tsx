import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureMasterAiReading, DrawnCard } from "@/lib/masters";
import { getCardById, getDeckManifest } from "@/lib/cards";
import CardFace from "@/components/CardFace";
import MasterDrawRitual from "@/components/MasterDrawRitual";

export const metadata: Metadata = {
  title: "Your Reading — Wyndralore Masters",
  robots: { index: false, follow: false },
};

export default async function MasterReadingPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const { code } = await params;
  const order = await prisma.masterOrder.findUnique({ where: { code }, include: { master: true } });
  if (!order || order.buyerId !== user.id || order.kind !== "ai_style") notFound();

  if (order.status === "pending") {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">Confirming your payment…</h1>
        <p className="mt-3 text-sm text-moon-dim">Refresh in a few seconds — your reading will appear here the moment it clears.</p>
      </section>
    );
  }

  if (!order.cardsDrawn) {
    return <MasterDrawRitual code={order.code} deck={getDeckManifest()} masterName={order.master.displayName} />;
  }

  const cards: DrawnCard[] = JSON.parse(order.cardsDrawn);
  const readingText = await ensureMasterAiReading(order, order.master);

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">In {order.master.displayName}&apos;s Style</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">Your Reading</h1>
        {order.question && <p className="mt-3 text-sm italic text-moon-dim">&ldquo;{order.question}&rdquo;</p>}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-6">
        {cards.map((c) => {
          const card = getCardById(c.cardId);
          if (!card) return null;
          return (
            <div key={c.position} className="w-28 text-center">
              <div className="aspect-[5/8] w-full">
                <CardFace src={card.image} alt={card.name} orientation={c.orientation} />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-moon-dim">{c.position}</p>
              <p className="text-xs text-moon">{card.name}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-gold-dim bg-ink-raised/50 p-6 sm:p-8">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-moon-dim">{readingText}</p>
      </div>

      <div className="mt-10 text-center">
        <Link
          href={`/masters/${order.master.handle}`}
          className="text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
        >
          Back to {order.master.displayName}&apos;s Altar
        </Link>
      </div>
    </section>
  );
}
