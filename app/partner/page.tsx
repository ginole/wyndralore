import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAffiliateBalances, AFFILIATE_MIN_PAYOUT_USD, RECURRING_WINDOW_MONTHS } from "@/lib/affiliate";
import PartnerPayout from "@/components/PartnerPayout";

export const metadata: Metadata = {
  title: "Partner Dashboard — Wyndralore",
  robots: { index: false, follow: false },
};

const SITE_URL = "https://www.wyndralore.com";

const STATUS_LABEL: Record<string, string> = {
  held: "In 30-day hold",
  available: "Ready to pay out",
  paid: "Paid",
  reversed: "Refunded — reversed",
};
const TIER_LABEL: Record<string, string> = { first: "First purchase (50%)", recurring: "Repeat (20%)" };

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function Centered({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl text-moon">{title}</h1>
      {children}
      <Link href="/account" className="mt-6 text-sm uppercase tracking-[0.2em] text-gold underline underline-offset-4">
        Back to Account
      </Link>
    </section>
  );
}

export default async function PartnerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <Centered title="Sign in required" />;
  if (!user.affiliateCode) {
    return (
      <Centered title="Not a partner yet">
        <p className="mt-3 text-sm text-moon-dim">This account isn&apos;t part of the creator partner program.</p>
      </Centered>
    );
  }

  const [balances, commissions] = await Promise.all([
    getAffiliateBalances(user.id),
    prisma.creatorCommission.findMany({ where: { creatorId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const viaLink = `${SITE_URL}/?via=${user.affiliateCode}`;
  const paused = user.affiliateStatus === "paused";

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Partner Dashboard</p>
      <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">{user.email}</h1>

      {paused && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Your partner account is paused. Contact us at hello@wyndralore.com if you think this is a mistake.
        </p>
      )}

      {/* Referral link */}
      <div className="mt-8 rounded-2xl border border-gold-dim bg-ink-raised/60 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">Your referral link</p>
        <p className="mt-1 text-xs leading-relaxed text-moon-dim">
          Share this everywhere. Anyone who signs up through it earns you <span className="text-moon">50%</span> of
          their first purchase, then <span className="text-moon">20%</span> of everything they buy for{" "}
          {RECURRING_WINDOW_MONTHS} months.
        </p>
        <input
          readOnly
          value={viaLink}
          className="mt-3 w-full truncate rounded-xl border border-ink-line bg-ink/60 p-3 text-xs text-moon focus:border-gold-dim focus:outline-none"
        />
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Ready to pay out", `$${balances.netAvailableUsd.toFixed(2)}`, "text-gold-bright"],
          ["In 30-day hold", `$${balances.heldUsd.toFixed(2)}`, "text-moon"],
          ["Paid to you", `$${balances.paidUsd.toFixed(2)}`, "text-moon"],
          ["Lifetime earned", `$${balances.lifetimeUsd.toFixed(2)}`, "text-moon"],
        ].map(([label, val, color]) => (
          <div key={label} className="rounded-2xl border border-ink-line bg-ink-raised/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">{label}</p>
            <p className={`font-display mt-1 text-2xl ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-ink-line bg-ink-raised/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">People referred</p>
          <p className="font-display mt-1 text-2xl text-moon">{balances.referredUsers}</p>
        </div>
        <div className="rounded-2xl border border-ink-line bg-ink-raised/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-moon-dim">Paying customers</p>
          <p className="font-display mt-1 text-2xl text-moon">{balances.payingUsers}</p>
        </div>
      </div>

      {balances.clawbackUsd > 0 && (
        <p className="mt-3 text-xs text-red-300">
          ${balances.clawbackUsd.toFixed(2)} was refunded after being paid out and will be deducted from your next
          payout.
        </p>
      )}

      <PartnerPayout
        netAvailableUsd={balances.netAvailableUsd}
        requestedUsd={balances.requestedUsd}
        minPayoutUsd={AFFILIATE_MIN_PAYOUT_USD}
        payoutMethod={user.affiliatePayoutMethod}
        payoutHandle={user.affiliatePayoutHandle}
        paused={paused}
      />

      {/* History */}
      <h2 className="font-display mt-12 text-xl text-moon">Commission history</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Commission</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-moon-dim">
                  No commissions yet — share your link to get started.
                </td>
              </tr>
            )}
            {commissions.map((c) => (
              <tr key={c.id} className="border-t border-ink-line/60">
                <td className="py-2 text-moon-dim">{fmtDate(c.createdAt)}</td>
                <td className="text-moon">{TIER_LABEL[c.tier] ?? c.tier}</td>
                <td className="text-gold-bright">${c.commissionUsd.toFixed(2)}</td>
                <td className="text-moon-dim">{STATUS_LABEL[c.status] ?? c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
