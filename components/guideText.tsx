import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { TW_PREFIX, type Locale } from "@/lib/i18n";

// Renders a guide paragraph, turning inline [[…]] tokens into locale-aware internal links.
//
//   [[the-fool|The Fool]]              → /cards/the-fool
//   [[guide:tarot-suits-explained|x]] → /guides/tarot-suits-explained
//   [[path:/reading/daily|draw]]      → /reading/daily
//
// On the 繁體 tree every href is prefixed with /tc (all link targets have a /tc twin).

const TOKEN = /\[\[(.+?)\]\]/g;

function hrefFor(raw: string, prefix: string): string {
  if (raw.startsWith("guide:")) return `${prefix}/guides/${raw.slice("guide:".length)}`;
  if (raw.startsWith("path:")) return `${prefix}${raw.slice("path:".length)}`;
  return `${prefix}/cards/${raw}`;
}

export function renderGuideText(text: string, locale: Locale): ReactNode[] {
  const prefix = locale === "zh-TW" ? TW_PREFIX : "";
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>);
    }
    const [target, label] = match[1].split("|");
    nodes.push(
      <Link
        key={key++}
        href={hrefFor(target, prefix)}
        className="text-gold underline underline-offset-4 hover:text-gold-bright"
      >
        {label ?? target}
      </Link>,
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}
