"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface SessionUser {
  id: string;
  email: string;
  plan: string;
  planExpiresAt: string | null;
  isPremium: boolean;
  createdAt: string;
  referralCode: string | null;
  premiumSpreadCredits: number;
  isMaster: boolean;
  autoRenew: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  isPartner: boolean;
  affiliateCode: string | null;
  /** Creator partner — permanent, set by the admin invite, and independent of the complimentary
   * month it grants. `whopUsername` is the account her commission is paid to; once set, her share
   * card's QR carries ?a=<username> instead of ?ref=<code>. */
  isCreator: boolean;
  whopUsername: string | null;
  /** Deck appearance preferences ("minimal" | "classic", "lunar" | "damask"). */
  deckStyle: string;
  cardBackStyle: string;
  /** Daily-card streak + premium morning-reminder opt-in. */
  dailyStreak: number;
  bestStreak: number;
  dailyReminderOptIn: boolean;
  /** One-time purchased reading credits. */
  aiFollowupCredits: number;
  yearReadingCredits: number;
  loveReadingCredits: number;
}

export interface QuotaStatus {
  isPremium: boolean;
  remaining: number | null; // null means unlimited (premium)
  limit: number | null;
  shareBonusAvailable: boolean;
  adBonusAvailable: boolean;
}

interface AuthState {
  user: SessionUser | null;
  quota: QuotaStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/auth/me?date=${todayLocal()}`, { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
      setQuota(data.quota ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setQuota(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ user, quota, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
