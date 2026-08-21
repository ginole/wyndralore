import type { Metadata } from "next";
import GuidesIndex from "@/components/GuidesIndex";
import { getDict, hreflangAlternates, OG_LOCALE, SITE_URL, TW_PREFIX } from "@/lib/i18n";

const t = getDict("zh-TW").guides;

export const metadata: Metadata = {
  title: t.indexMetaTitle,
  description: t.indexMetaDescription,
  alternates: { canonical: `${TW_PREFIX}/guides`, ...hreflangAlternates("/guides") },
  openGraph: {
    title: t.indexMetaTitle,
    description: t.indexMetaDescription,
    url: `${SITE_URL}${TW_PREFIX}/guides`,
    siteName: "Wyndralore",
    locale: OG_LOCALE["zh-TW"],
    type: "website",
  },
};

export default function TwGuidesPage() {
  return <GuidesIndex locale="zh-TW" />;
}
