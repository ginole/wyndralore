export type PlanId = "monthly" | "yearly" | "lifetime";

export interface PlanDefinition {
  id: PlanId;
  label: string;
  amountUsd: number;
  priceLabel: string;
  cadence: string;
  highlight?: boolean;
  perks: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    amountUsd: 9.9,
    priceLabel: "$9.90",
    cadence: "/ month",
    perks: ["Unlimited readings", "All premium spreads", "Reading journal", "Full card library"],
  },
  yearly: {
    id: "yearly",
    label: "Yearly",
    amountUsd: 49,
    priceLabel: "$49",
    cadence: "/ year",
    highlight: true,
    perks: ["Everything in Monthly", "Just $4.08 / month", "Best value"],
  },
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    amountUsd: 79,
    priceLabel: "$79",
    cadence: "one-time",
    perks: ["Pay once, own it forever", "Everything in Yearly", "No renewals, ever"],
  },
};

// Incoming international wire transfers can have Wise's receiving fee (a few USD) deducted
// before the balance is credited, so a customer who paid correctly can still land a hair under
// the sticker price. Treat anything within this tolerance as "paid in full" rather than
// "underpaid" — set PAYMENT_TOLERANCE_USD to override (e.g. if wire fees change).
export const PAYMENT_TOLERANCE_USD = Number(process.env.PAYMENT_TOLERANCE_USD ?? 8);

export function isPlanId(value: string): value is PlanId {
  return value === "monthly" || value === "yearly" || value === "lifetime";
}

export function planExpiryFrom(plan: PlanId, from: Date): Date | null {
  if (plan === "lifetime") return null;
  const d = new Date(from);
  if (plan === "monthly") d.setDate(d.getDate() + 30);
  if (plan === "yearly") d.setDate(d.getDate() + 365);
  return d;
}
