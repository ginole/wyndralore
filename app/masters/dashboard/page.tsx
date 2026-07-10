import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Your Dashboard — Wyndralore Masters",
  robots: { index: false, follow: false },
};

const KIND_LABEL: Record<string, string> = { ai_style: "AI-style reading", live_voice: "Personal reading" };
const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Awaiting your delivery",
  delivered: "Delivered — in dispute window",
  released: "Complete",
  refunded: "Refunded",
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function MasterDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">Sign in required</h1>
        <Link href="/account" className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
          Sign In
        </Link>
      </section>
    );
  }

  const master = await prisma.masterProfile.findUnique({ where: { userId: user.id } });
  if (!master) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-moon">No storefront found</h1>
        <p className="mt-3 text-sm text-moon-dim">This account doesn&apos;t have a Meet Our Masters storefront.</p>
        <Link href="/account" className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
          Back to Account
        </Link>
      </section>
    );
  }

  // Lets the admin see "which master checked her dashboard, and when" (admin's own log panel).
  await trackEvent("master_dashboard_viewed", { userId: user.id, props: { masterId: master.id, masterHandle: master.handle } });

  const [orders, ledger] = await Promise.all([
    prisma.masterOrder.findMany({ where: { masterId: master.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.ledgerEntry.findMany({ where: { masterId: master.id } }),
  ]);

  const sum = (status: string) => Math.round(ledger.filter((l) => l.status === status).reduce((s, l) => s + l.amountUsd, 0) * 100) / 100;
  const heldUsd = sum("held");
  const availableUsd = sum("available");
  const paidOutUsd = sum("paid_out");
  const totalEarnedUsd = Math.round((heldUsd + availableUsd + paidOutUsd) * 100) / 100;

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Your Dashboard</p>
      <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">{master.displayName}</h1>
      <p className="mt-2 text-sm text-moon-dim">/masters/{master.handle}</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gold-dim bg-ink-raised/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">Total earned</p>
          <p className="font-display mt-1 text-2xl text-gold-bright">${totalEarnedUsd.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-ink-line bg-ink-raised/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">Paid to you</p>
          <p className="font-display mt-1 text-2xl text-moon">${paidOutUsd.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-ink-line bg-ink-raised/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">Ready to pay out</p>
          <p className="font-display mt-1 text-2xl text-moon">${availableUsd.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-ink-line bg-ink-raised/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">Pending delivery</p>
          <p className="font-display mt-1 text-2xl text-moon">${heldUsd.toFixed(2)}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-moon-dim">
        Paid out on the 3rd and 18th of each month, to your {master.payoutMethod ?? "payout method (not set — email us)"}.
      </p>

      <h2 className="font-display mt-12 text-xl text-moon">Your readings</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Your cut</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-moon-dim">
                  No readings yet.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-ink-line/60">
                <td className="py-2 text-moon-dim">{fmtDate(o.createdAt)}</td>
                <td className="text-moon">{KIND_LABEL[o.kind] ?? o.kind}</td>
                <td className="text-gold-bright">${(Math.round(o.amountUsd * o.commissionPct * 100) / 100).toFixed(2)}</td>
                <td className="text-moon-dim">{STATUS_LABEL[o.status] ?? o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
