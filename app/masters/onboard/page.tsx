import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MasterSelfOnboardingForm from "@/components/MasterSelfOnboardingForm";
import { MASTERS_MARKETPLACE_ENABLED } from "@/lib/masters";

export const metadata: Metadata = {
  title: "Set Up Your Storefront — Wyndralore Masters",
  robots: { index: false, follow: false },
};

export default function MasterOnboardPage() {
  if (!MASTERS_MARKETPLACE_ENABLED) notFound();
  return <MasterSelfOnboardingForm />;
}
