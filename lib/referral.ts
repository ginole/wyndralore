import crypto from "node:crypto";
import { User } from "@prisma/client";
import { prisma } from "./db";

// Each successful referral grants the inviter this many "unlock any PREMIUM spread" credits.
export const REFERRAL_REWARD = 3;

// Query-param and client-storage keys for carrying a referral code from the landing click
// through to registration (see components/ReferralCapture.tsx).
export const REF_PARAM = "ref";
export const REF_STORAGE_KEY = "wl_ref";

/** Human-unfriendly-but-shareable 8-char code (no ambiguous 0/O/1/I/L). */
function newCode(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

/** Lazily assigns a referral code to a user that doesn't have one yet. Idempotent. */
export async function ensureReferralCode(user: User): Promise<User> {
  if (user.referralCode) return user;
  // Retry on the (astronomically unlikely) unique collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      return await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
    } catch {
      // unique violation — try another code
    }
  }
  throw new Error("Could not assign a referral code");
}

/**
 * Records who referred a freshly-registered account. Called once, at registration, with the
 * code the new user arrived with. Silently no-ops on a bad/self/own code so a bogus ?ref= can
 * never block signup. The inviter's reward is NOT paid here — only once the new account actually
 * completes a reading (see creditReferrerForReading), to make farming with dead signups useless.
 */
export async function attributeReferral(newUser: User, rawCode: string | undefined | null): Promise<void> {
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  if (!code) return;
  if (code === newUser.referralCode) return; // can't refer yourself
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === newUser.id) return;
  await prisma.user.update({ where: { id: newUser.id }, data: { referredByCode: code } });
}

/**
 * Pays out the inviter's reward the first time a referred account completes a reading. Guarded
 * so it fires at most once per referred account: the conditional updateMany flips
 * `referralRewarded` false→true and only the winner (count === 1) proceeds to credit the inviter,
 * so concurrent reads can't double-pay. Safe to call after every draw — it's a cheap no-op once
 * rewarded or for non-referred users.
 */
export async function creditReferrerForReading(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.referredByCode || user.referralRewarded) return;

  const claimed = await prisma.user.updateMany({
    where: { id: userId, referralRewarded: false },
    data: { referralRewarded: true },
  });
  if (claimed.count !== 1) return; // someone/another request already claimed it

  const referrer = await prisma.user.findUnique({ where: { referralCode: user.referredByCode } });
  if (!referrer || referrer.id === userId) return;

  await prisma.user.update({
    where: { id: referrer.id },
    data: { premiumSpreadCredits: { increment: REFERRAL_REWARD } },
  });
}
