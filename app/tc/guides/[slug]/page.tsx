import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideArticle from "@/components/GuideArticle";
import { getAllGuides, getGuideBySlug, getGuideContent } from "@/lib/guides";
import { hreflangAlternates, OG_LOCALE, SITE_URL, TW_PREFIX } from "@/lib/i18n";

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "找不到這篇指南 — Wyndralore" };
  const c = getGuideContent(guide, "zh-TW");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: `${TW_PREFIX}/guides/${slug}`, ...hreflangAlternates(`/guides/${slug}`) },
    openGraph: {
      title: c.title,
      description: c.metaDescription,
      url: `${SITE_URL}${TW_PREFIX}/guides/${slug}`,
      siteName: "Wyndralore",
      locale: OG_LOCALE["zh-TW"],
      type: "article",
    },
  };
}

export default async function TwGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();
  return <GuideArticle guide={guide} locale="zh-TW" />;
}
