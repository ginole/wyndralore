import type { Metadata } from "next";
import GuidesIndex from "@/components/GuidesIndex";
import { getDict, hreflangAlternates } from "@/lib/i18n";

const t = getDict("en").guides;

export const metadata: Metadata = {
  title: t.indexMetaTitle,
  description: t.indexMetaDescription,
  alternates: { canonical: "/guides", ...hreflangAlternates("/guides") },
};

export default function GuidesPage() {
  return <GuidesIndex locale="en" />;
}
