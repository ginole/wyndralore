import { User } from "@prisma/client";
import { isPremiumActive } from "./quota";

export function serializeUser(user: User, isMaster: boolean = false) {
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
    // "Meet Our Masters" — whether this account also has a storefront, so /account can surface a
    // link to /masters/dashboard. Callers that don't pass it (login/register) default to false;
    // harmless since AuthProvider re-fetches /api/auth/me (which does pass it) right after.
    isMaster,
  };
}
