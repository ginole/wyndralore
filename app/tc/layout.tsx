import HtmlLang from "@/components/HtmlLang";
import { HTML_LANG } from "@/lib/i18n";

// The 繁體 (Taiwan) subtree. Nests inside the root layout (which owns <html>, <body>, providers and
// the tracking scripts), so the geo-detected Taiwan visitor still gets the Pixel, UTM capture, etc.
// Chrome (header/footer) is locale-aware via usePathname, so it renders in 繁體 here without a
// separate layout. Per-page metadata sets 繁體 title/description/hreflang.
export default function TwLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HtmlLang lang={HTML_LANG["zh-TW"]} />
      {children}
    </>
  );
}
