export type PlanId = "monthly" | "yearly" | "lifetime";

// Every membership plan now offers two ways to pay: an auto-renewing subscription (cheaper, the
// buyer stays in control and can cancel anytime) or a one-time payment (pricier, never auto-charges
// again). Lifetime is one-time only. The buyer's choice is a `billingMode`; the underlying access
// level ("plan") is unchanged — a monthly-sub and a monthly-onetime both grant "monthly" access.
export type BillingMode = "sub" | "onetime";

export interface PlanPriceOption {
  amountUsd: number;
  priceLabel: string;
  cadence: string;
}

export interface PlanDefinition {
  id: PlanId;
  label: string;
  highlight?: boolean;
  perks: string[];
  sub?: PlanPriceOption; // recurring option — present for monthly/yearly, absent for lifetime
  onetime: PlanPriceOption; // always available
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    perks: ["Unlimited readings", "All premium spreads", "Reading journal", "Full card library", "2 free AI deep readings / month"],
    sub: { amountUsd: 6.9, priceLabel: "$6.90", cadence: "/ month" },
    onetime: { amountUsd: 9.9, priceLabel: "$9.90", cadence: "one-time" },
  },
  yearly: {
    id: "yearly",
    label: "Yearly",
    highlight: true,
    perks: ["Everything in Monthly", "Best value", "3 free AI deep readings / month"],
    sub: { amountUsd: 39, priceLabel: "$39", cadence: "/ year" },
    onetime: { amountUsd: 49, priceLabel: "$49", cadence: "one-time" },
  },
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    perks: ["Pay once, own it forever", "Everything in Yearly", "No renewals, ever", "4 free AI deep readings / month"],
    onetime: { amountUsd: 129, priceLabel: "$129", cadence: "one-time" },
  },
};

/** The price option a buyer actually gets for a plan + chosen billing mode. Falls back to the
 * one-time option when a plan has no subscription option (lifetime) or "sub" isn't applicable. */
export function planOption(plan: PlanId, mode: BillingMode): PlanPriceOption {
  const def = PLANS[plan];
  if (mode === "sub" && def.sub) return def.sub;
  return def.onetime;
}

// Incoming international wire transfers can have Wise's receiving fee (a few USD) deducted
// before the balance is credited, so a customer who paid correctly can still land a hair under
// the sticker price. Treat anything within this tolerance as "paid in full" rather than
// "underpaid" — set PAYMENT_TOLERANCE_USD to override (e.g. if wire fees change).
export const PAYMENT_TOLERANCE_USD = Number(process.env.PAYMENT_TOLERANCE_USD ?? 8);

export function isPlanId(value: string): value is PlanId {
  return value === "monthly" || value === "yearly" || value === "lifetime";
}

export function isBillingMode(value: string): value is BillingMode {
  return value === "sub" || value === "onetime";
}

export function planExpiryFrom(plan: PlanId, from: Date): Date | null {
  if (plan === "lifetime") return null;
  const d = new Date(from);
  if (plan === "monthly") d.setDate(d.getDate() + 30);
  if (plan === "yearly") d.setDate(d.getDate() + 365);
  return d;
}
