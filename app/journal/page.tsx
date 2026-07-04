import type { Metadata } from "next";
import JournalView from "@/components/JournalView";

export const metadata: Metadata = {
  title: "Your Journal — Wyndralore",
  description: "Look back on the readings you've saved.",
};

export default function JournalPage() {
  return <JournalView />;
}
