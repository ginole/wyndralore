import type { Metadata } from "next";
import { getDeckManifest } from "@/lib/cards";
import SpecialReadingExperience from "@/components/SpecialReadingExperience";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "未來一年塔羅占卜 — 12 個月，13 張牌 | Wyndralore",
  description:
    "一張主題牌，加上未來十二個月各一張，由你親手抽出，讀成一則徐徐展開的故事——為你而寫，永久保存。",
  alternates: { canonical: "/tw/reading/year-ahead", ...hreflangAlternates("/reading/year-ahead") },
};

export default function TwYearAheadPage() {
  return <SpecialReadingExperience kind="year_reading" deck={getDeckManifest("zh-TW")} />;
}
