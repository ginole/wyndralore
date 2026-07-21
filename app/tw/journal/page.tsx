import type { Metadata } from "next";
import JournalView from "@/components/JournalView";

export const metadata: Metadata = {
  title: "占卜筆記 — Wyndralore",
  description: "回顧你儲存的占卜。",
};

export default function TwJournalPage() {
  return <JournalView />;
}
