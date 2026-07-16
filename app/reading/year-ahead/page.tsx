import type { Metadata } from "next";
import { getDeckManifest } from "@/lib/cards";
import SpecialReadingExperience from "@/components/SpecialReadingExperience";

export const metadata: Metadata = {
  title: "Year Ahead Tarot Reading — 12 Months, 13 Cards | Wyndralore",
  description:
    "A theme card plus one card for each of the next twelve months, drawn by your own hand and read as a single unfolding story — written for you and saved forever.",
  alternates: { canonical: "https://wyndralore.com/reading/year-ahead" },
};

export default function YearAheadPage() {
  return <SpecialReadingExperience kind="year_reading" deck={getDeckManifest()} />;
}
