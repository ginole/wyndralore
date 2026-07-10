import type { Metadata } from "next";
import MasterSelfOnboardingForm from "@/components/MasterSelfOnboardingForm";

export const metadata: Metadata = {
  title: "Set Up Your Storefront — Wyndralore Masters",
  robots: { index: false, follow: false },
};

export default function MasterOnboardPage() {
  return <MasterSelfOnboardingForm />;
}
