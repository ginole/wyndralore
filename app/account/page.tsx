"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CreatorLinkPanel from "@/components/CreatorLinkPanel";
import SocialSignIn from "@/components/SocialSignIn";
import DeckStylePanel from "@/components/DeckStylePanel";
import SpecialReadingsPanel from "@/components/SpecialReadingsPanel";
import { pixelTrack } from "@/lib/pixel";
import { REF_STORAGE_KEY } from "@/lib/referral";
import { VIA_STORAGE_KEY } from "@/lib/affiliate";
import { useLocale } from "@/lib/useLocale";
import { getAppDict } from "@/lib/i18nApp";

export default function AccountPage() {
  const router = useRouter();
  const { user, quota, loading, refresh, logout } = useAuth();
  const locale = useLocale();
  const t = getAppDict(locale).account;
  const planLabels = getAppDict(locale).pricing.planLabels;
  const tw = locale === "zh-TW";
  const L = (p: string) => (tw ? `/tc${p}` : p);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

  // Open straight on the register tab when linked with ?mode=register — the "limited" wall sends
  // signed-out visitors here to make an account, and landing them on the login form first is the
  // exact extra step that conversion is trying to remove. Read from the URL rather than
  // useSearchParams, which would force a Suspense boundary this page isn't wrapped in.
  const [nextPath, setNextPath] = useState("/account");
  const [authError, setAuthError] = useState<string | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const m = sp.get("mode");
    if (m === "register" || m === "forgot") setMode(m);
    const n = sp.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNextPath(n);
    // A social sign-in that bounced comes back with ?authError= — surface it instead of dropping
    // them on a silent login screen wondering what happened.
    const e = sp.get("authError");
    if (e) {
      setAuthError(
        e === "canceled" ? t.authErrorCanceled : e === "noEmail" ? t.authErrorNoEmail : t.authErrorGeneric,
      );
    }
    // Deliberately once-on-mount: these come from the entry URL. `t` is a stable dictionary object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    if (typeof window !== "undefined" && !window.confirm(t.cancelConfirm)) return;
    setCanceling(true);
    setCancelMsg(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCancelMsg(data.error ?? (tw ? "無法取消，請再試一次。" : "Could not cancel — please try again."));
        return;
      }
      await refresh();
      setCancelMsg(tw ? "已取消自動續訂——你會保有權限直到當期結束。" : "Auto-renewal canceled — you keep access until your current period ends.");
    } catch {
      setCancelMsg(tw ? "無法取消，請再試一次。" : "Could not cancel — please try again.");
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
      setError(t.passwordsNoMatchRetype);
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
        setError(data.error ?? t.somethingWrong);
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
      // The register wall links here with ?next=<the reading they were on>. Send them straight
      // back to it — they authenticated in order to KEEP DRAWING, and parking them on the account
      // dashboard instead loses them (the first TW registrant, 2026-07-23, drifted from the
      // dashboard to pricing and left without using the draw she signed up for). Internal paths
      // only: "/" prefix but not "//" (protocol-relative), so the param can't redirect off-site.
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        router.push(next);
      }
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
        <h1 className="font-display mb-3 text-center text-3xl text-moon">{t.resetTitle}</h1>
        {forgotSent ? (
          <p className="text-center text-sm text-moon-dim">{t.resetSent(email)}</p>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-moon-dim">{t.resetIntro}</p>
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.email}</span>
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
                {submitting ? t.sending : t.sendResetLink}
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
          {t.backToSignIn}
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
            {t.signIn}
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={mode === "register" ? "text-gold" : "text-moon-dim"}
          >
            {t.register}
          </button>
        </div>
        <h1 className="font-display mb-6 text-center text-3xl text-moon">
          {mode === "login" ? t.welcomeBack : t.createAccount}
        </h1>
        {authError && (
          <p className="mb-5 rounded-xl border border-gold-dim/40 bg-ink-raised/60 p-3 text-center text-xs leading-relaxed text-moon-dim">
            {authError}
          </p>
        )}
        <SocialSignIn next={nextPath} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.password}</span>
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
              {t.forgotPassword}
            </button>
          )}
          {mode === "register" && (
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.confirmPassword}</span>
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
                <span className="text-xs text-red-400">{t.passwordsNoMatch}</span>
              )}
            </label>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            {submitting ? t.pleaseWait : mode === "login" ? t.signIn : t.createAccountBtn}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{t.yourAccount}</p>
      <h1 className="font-display mt-3 text-3xl text-moon">{user.email}</h1>

      <div className="mt-8 rounded-2xl border border-ink-line bg-ink-raised/60 p-6 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">{t.plan}</span>
          <span className="text-sm text-gold-bright">{user.isPremium ? (planLabels[user.plan] ?? user.plan.toUpperCase()) : t.free}</span>
        </div>
        {user.isPremium && user.planExpiresAt && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">{t.renewsExpires}</span>
            <span className="text-sm text-moon">{new Date(user.planExpiresAt).toLocaleDateString()}</span>
          </div>
        )}
        {!user.isPremium && quota && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">{t.readingsLeftToday}</span>
            <span className="text-sm text-moon">
              {quota.remaining} / {quota.limit}
            </span>
          </div>
        )}
        {user.dailyStreak > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-moon-dim">{t.dailyStreak}</span>
            <span className="text-sm text-gold-bright">
              🔥 {t.dayUnit(user.dailyStreak)}
              {user.bestStreak > user.dailyStreak ? t.bestStreak(user.bestStreak) : ""}
            </span>
          </div>
        )}
        {user.isPremium && (
          <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-ink-line/60 pt-4">
            <span className="pr-4 text-xs leading-relaxed text-moon-dim">{t.morningEmail}</span>
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
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.inviteFriends}</span>
          <span className="text-sm text-gold-bright">{t.freeUnlocks(user.premiumSpreadCredits)}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-moon-dim">{t.inviteBody}</p>
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
              {copied ? t.copied : t.copyLink}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-moon-dim/70">{t.preparingLink}</p>
        )}
      </div>

      {user.autoRenew && (
        <div className="mt-6 rounded-2xl border border-ink-line bg-ink-raised/40 p-5 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dim">{t.autoRenewOn}</p>
          <p className="mt-2 text-sm leading-relaxed text-moon-dim">
            {t.autoRenewBody(
              planLabels[user.plan] ?? user.plan,
              user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString() : "",
            )}
          </p>
          <button
            type="button"
            onClick={handleCancelSubscription}
            disabled={canceling}
            className="mt-3 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon disabled:opacity-60"
          >
            {canceling ? t.canceling : t.cancelAutoRenew}
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
          {t.partnerDashboard}
        </Link>
      )}

      {user.isMaster && (
        <Link
          href="/masters/dashboard"
          className="mt-6 rounded-full border border-gold-dim px-7 py-3 text-center text-sm uppercase tracking-[0.2em] text-moon transition-colors hover:border-gold hover:text-gold"
        >
          {t.masterDashboard}
        </Link>
      )}

      {user.isPremium ? (
        <Link
          href={L("/journal")}
          className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright"
        >
          {t.openJournal}
        </Link>
      ) : (
        <Link
          href={L("/pricing")}
          className="mt-6 rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright"
        >
          {t.goPremium}
        </Link>
      )}

      <button
        type="button"
        onClick={logout}
        className="mt-6 text-xs uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon"
      >
        {t.signOut}
      </button>
    </section>
  );
}
