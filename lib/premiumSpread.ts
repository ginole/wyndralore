import { User } from "@prisma/client";
import { prisma } from "./db";
import { isPremiumActive } from "./quota";

/** How a non-free spread is being unlocked for a given user. */
export type PremiumSpreadAccess =
  | { allowed: true; via: "plan" } // active paid membership — unlimited
  | { allowed: true; via: "credit"; creditsRemaining: number } // a referral-earned unlock
  | { allowed: false; creditsRemaining: 0 };

/** Read-only: can this user open a PREMIUM spread, and how? Does not spend anything. */
export function premiumSpreadAccess(user: User): PremiumSpreadAccess {
  if (isPremiumActive(user)) return { allowed: true, via: "plan" };
  if (user.premiumSpreadCredits > 0) {
    return { allowed: true, via: "credit", creditsRemaining: user.premiumSpreadCredits };
  }
  return { allowed: false, creditsRemaining: 0 };
}

/**
 * Spends one PREMIUM-spread credit. Conditional updateMany (not read-then-write) so two
 * concurrent premium readings can't both draw off the same last credit — only `count === 1`
 * actually decrements. Returns false if the user had none left.
 */
export async function spendPremiumSpreadCredit(userId: string): Promise<boolean> {
  const claimed = await prisma.user.updateMany({
    where: { id: userId, premiumSpreadCredits: { gt: 0 } },
    data: { premiumSpreadCredits: { decrement: 1 } },
  });
  return claimed.count === 1;
}
