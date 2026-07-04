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
  };
}
