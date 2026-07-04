"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface SessionUser {
  id: string;
  email: string;
  plan: string;
  planExpiresAt: string | null;
  isPremium: boolean;
  createdAt: string;
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
