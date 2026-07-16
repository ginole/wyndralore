"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import CreatorLinkPanel from "@/components/CreatorLinkPanel";
import DeckStylePanel from "@/components/DeckStylePanel";
import SpecialReadingsPanel from "@/components/SpecialReadingsPanel";
import { pixelTrack } from "@/lib/pixel";
import { REF_STORAGE_KEY } from "@/lib/referral";
import { VIA_STORAGE_KEY } from "@/lib/affiliate";

export default function AccountPage() {
  const { user, quota, loading, refresh, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const inviteLink =
    user?.referralCode && typeof window !== "undefined" ? `${window.location.origin}/?ref=${user.referralCode}` : "";

  async function handleCopyInvite() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can select the link text manually */
    }
  }

  async function handleCancelSubscription() {
    if (typeof window !== "undefined" && !window.confirm("Cancel auto-renewal? You'll keep full access until the end of your current period.")) return;
    setCanceling(true);
    setCancelMsg(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCancelMsg(data.error ?? "Could not cancel — please try again.");
        return;
      }
      await refresh();
      setCancelMsg("Auto-renewal canceled — you keep access until your current period ends.");
    } catch {
      setCancelMsg("Could not cancel — please try again.");
    } finally {
      setCanceling(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setForgotSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords don't match. Please retype them.");
      return;
    }
    setSubmitting(true);
    try {
      // On registration, forward any referral code this visitor arrived with (stashed by
      // ReferralCapture) so their inviter can be credited once they complete a reading.
      const referralCode =
        mode === "register" && typeof window !== "undefined"
          ? window.localStorage.getItem(REF_STORAGE_KEY) || undefined
          : undefined;
      const viaCode =
        mode === "register" && typeof window !== "undefined"
          ? window.localStorage.getItem(VIA_STORAGE_KEY) || undefined
          : undefined;
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, referralCode, viaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      // FB ad conversion signal — only new registrations, not logins.
      if (mode === "register") {
        pixelTrack("CompleteRegistration");
        try {
          window.localStorage.removeItem(REF_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-[60vh]" />;
  }

  if (!user && mode === "forgot") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
        <h1 className="font-display mb-3 text-center text-3xl text-moon">Reset your password</h1>
        {forgotSent ? (
          <p className="text-center text-sm text-moon-dim">
            If an account exists for <span className="text-moon">{email}</span>, we&apos;ve sent a link to reset your
            password. It expires in 1 hour.
          </p>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-moon-dim">
              Enter your email and we&apos;ll send you a link to choose a new password.
            </p>
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setForgotSent(false);
          }}
          className="mt-6 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
        >
          Back to Sign In
        </button>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
        <div className="mb-8 flex justify-center gap-6 text-sm uppercase tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "text-gold" : "text-moon-dim"}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={mode === "register" ? "text-gold" : "text-moon-dim"}
          >
            Register
          </button>
        </div>
        <h1 className="font-display mb-6 text-center text-3xl text-moon">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
            />
          </label>
          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="-mt-2 self-end text-xs text-moon-dim underline underline-offset-4 hover:text-moon"
            >
              Forgot password?
            </button>
          )}
          {mode === "register" && (
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Confirm Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`rounded-xl border bg-ink-raised/60 p-3 text-sm text-moon focus:outline-none ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-400/70 focus:border-red-400"
                    : "border-ink-line focus:border-gold-dim"
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <span className="text-xs text-red-400">Passwords don&apos;t match yet.</span>
              )}
            </label>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">Your Account</p>
      <h1 className="font-display mt-3 text-3xl text-moon">{user.email}</h1>

      <div className="mt-8 rounded-2xl border border-ink-line bg-ink-raised/60 p-6 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">Plan</span>
          <span className="text-sm text-gold-bright">{user.isPremium ? user.plan.toUpperCase() : "Free"}</span>
        </div>
        {user.isPremium && user.planExpiresAt && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">Renews / Expires</span>
            <span className="text-sm text-moon">{new Date(user.planExpiresAt).toLocaleDateString()}</span>
          </div>
        )}
        {!user.isPremium && quota && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">Readings left today</span>
            <span className="text-sm text-moon">
              {quota.remaining} / {quota.limit}
            </span>
          </div>
        )}
        {user.dailyStreak > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">Daily streak</span>
            <span className="text-sm text-gold-bright">
              🔥 {user.dailyStreak} day{user.dailyStreak === 1 ? "" : "s"}
              {user.bestStreak > user.dailyStreak ? ` · best ${user.bestStreak}` : ""}
            </span>
          </div>
        )}
        {user.isPremium && (
          <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-ink-line/60 pt-4">
            <span className="pr-4 text-xs leading-relaxed text-moon-dim">
              Morning email if I haven&apos;t drawn my Card of the Day
            </span>
            <input
              type="checkbox"
              checked={user.dailyReminderOptIn}
              onChange={async (e) => {
                await fetch("/api/account/prefs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ dailyReminderOptIn: e.target.checked }),
                });
                void refresh();
              }}
              className="h-4 w-4 accent-[#c9a96e]"
            />
          </label>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gold-dim bg-ink-raised/60 p-6 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Invite friends</span>
          <span className="text-sm text-gold-bright">
            {user.premiumSpreadCredits} free {user.premiumSpreadCredits === 1 ? "unlock" : "unlocks"}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-moon-dim">
          When a friend signs up with your link and does a reading, you get{" "}
          <span className="text-moon">3 free unlocks</span> for any premium spread — Love, Career, or Celtic Cross.
        </p>
        {user.referralCode ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate rounded-xl border border-ink-line bg-ink/60 p-3 text-xs text-moon focus:border-gold-dim focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyInvite}
              className="rounded-full bg-gold px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright"
            >
              {copied ? "Copied ✓" : "Copy Link"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-moon-dim/70">Preparing your invite link…</p>
        )}
      </div>

      {user.autoRenew && (
        <div className="mt-6 rounded-2xl border border-ink-line bg-ink-raised/40 p-5 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">Auto-renewal on</p>
          <p className="mt-2 text-sm leading-relaxed text-moon-dim">
            Your {user.plan} plan renews automatically
            {user.currentPeriodEnd ? ` on ${new Date(user.currentPeriodEnd).toLocaleDateString()}` : ""}. You&apos;re
            in control — cancel anytime and keep full access until then.
          </p>
          <button
            type="button"
            onClick={handleCancelSubscription}
            disabled={canceling}
            className="mt-3 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon disabled:opacity-60"
          >
            {canceling ? "Canceling…" : "Cancel auto-renewal"}
          </button>
          {cancelMsg && <p className="mt-2 text-xs text-gold-bright">{cancelMsg}</p>}
        </div>
      )}

      {user.isCreator && (
        <CreatorLinkPanel initialUsername={user.whopUsername} onSaved={() => void refresh()} />
      )}

      <SpecialReadingsPanel />

      <DeckStylePanel />

      {user.isPartner && (
        <Link
          href="/partner"
          className="mt-6 rounded-full border border-gold-dim px-7 py-3 text-center text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
        >
          Your Partner Dashboard
        </Link>
      )}

      {user.isMaster && (
        <Link
          href="/masters/dashboard"
          className="mt-6 rounded-full border border-gold-dim px-7 py-3 text-center text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
        >
          Your Master Dashboard
        </Link>
      )}

      {user.isPremium ? (
        <Link
          href="/journal"
          className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright"
        >
          Open Your Journal
        </Link>
      ) : (
        <Link
          href="/pricing"
          className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright"
        >
          Go Premium
        </Link>
      )}

      <button
        type="button"
        onClick={logout}
        className="mt-6 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
      >
        Sign Out
      </button>
    </section>
  );
}
