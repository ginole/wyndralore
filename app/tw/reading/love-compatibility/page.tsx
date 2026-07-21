import type { Metadata } from "next";
import { getDeckManifest } from "@/lib/cards";
import SpecialReadingExperience from "@/components/SpecialReadingExperience";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "愛情契合度塔羅占卜 — 兩個人，五張牌 | Wyndralore",
  description:
    "你的能量、對方的能量、你們之間的連結、它的挑戰，以及它的走向——一段對這份羈絆本身的誠實文字解讀，永久存進你的帳號。",
  alternates: { canonical: "/tw/reading/love-compatibility", ...hreflangAlternates("/reading/love-compatibility") },
};

export default function TwLoveCompatibilityPage() {
  return <SpecialReadingExperience kind="love_reading" deck={getDeckManifest("zh-TW")} />;
}
