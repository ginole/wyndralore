import { User } from "@prisma/client";
import { isPremiumActive } from "./quota";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    isPremium: isPremiumActive(user),
    createdAt: user.createdAt,
    // Referral loop — safe to expose: the code is meant to be shared, and the credit count is
    // the user's own balance. `referredByCode`/`referralRewarded` stay server-only.
    referralCode: user.referralCode,
    premiumSpreadCredits: user.premiumSpreadCredits,
  };
}
