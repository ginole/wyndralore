import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password — Wyndralore",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
