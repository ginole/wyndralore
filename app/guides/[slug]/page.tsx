import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideArticle from "@/components/GuideArticle";
import { getAllGuides, getGuideBySlug, getGuideContent } from "@/lib/guides";
import { hreflangAlternates } from "@/lib/i18n";

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guide not found — Wyndralore" };
  const c = getGuideContent(guide, "en");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: `/guides/${slug}`, ...hreflangAlternates(`/guides/${slug}`) },
    openGraph: { title: c.title, description: c.metaDescription, type: "article" },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();
  return <GuideArticle guide={guide} locale="en" />;
}
