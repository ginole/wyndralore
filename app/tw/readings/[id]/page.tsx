import type { Metadata } from "next";
import SavedReadingPage from "@/app/readings/[id]/page";

// The permanent page for a purchased special reading — shared client component, localizes from
// the /tw path.
export const metadata: Metadata = {
  title: "你的解讀 — Wyndralore",
};

export default function TwSavedReadingPage() {
  return <SavedReadingPage />;
}
