import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "設定新密碼 — Wyndralore",
};

/**
 * The 繁體 twin of /reset-password.
 *
 * It exists because the claim link in a creator's invitation is the FIRST thing she clicks, and
 * without a twin here the geo-redirect has nothing to redirect to — so a Malaysian or Taiwanese
 * creator who was just told the site lands in 繁體 sets her password on an English form instead.
 * Two fields, but it is the worst possible place for the seam to show: the same screen where she is
 * deciding whether an unfamiliar site is safe to hand her audience to.
 */
export default function TcResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
