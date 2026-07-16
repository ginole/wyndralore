import type { Metadata } from "next";
import { getDeckManifest } from "@/lib/cards";
import SpecialReadingExperience from "@/components/SpecialReadingExperience";

export const metadata: Metadata = {
  title: "Love Compatibility Tarot Reading — Two People, Five Cards | Wyndralore",
  description:
    "Your energy, theirs, the connection between you, its challenge, and where it's heading — an honest written reading of the bond itself, saved to your account forever.",
  alternates: { canonical: "https://wyndralore.com/reading/love-compatibility" },
};

export default function LoveCompatibilityPage() {
  return <SpecialReadingExperience kind="love_reading" deck={getDeckManifest()} />;
}
