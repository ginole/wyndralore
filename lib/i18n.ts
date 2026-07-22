// Internationalization layer for the Traditional-Chinese (Taiwan) edition.
//
// Design (see the 07-20 build notes): the English site stays 100% at the root, untouched. The
// 繁體 edition lives under /tc as a purely additive subtree, and geo detection (proxy.ts) sends
// Taiwan visitors there automatically. There is NO language switcher anywhere — a Western visitor
// never sees a Chinese entry point (a trust concern in this category), and a Taiwan visitor never
// sees an English one. The two worlds only ever meet through hreflang, which is for crawlers.
//
// Card SLUGS stay English-derived on both trees (/cards/the-fool ↔ /tc/cards/the-fool) so the two
// language versions pair cleanly for hreflang; only the displayed text differs.

export type Locale = "en" | "zh-TW";

export const LOCALES: Locale[] = ["en", "zh-TW"];
export const DEFAULT_LOCALE: Locale = "en";

/** The /tc path prefix that marks the 繁體 subtree. */
export const TW_PREFIX = "/tc";

export function localeFromPathname(pathname: string): Locale {
  return pathname === TW_PREFIX || pathname.startsWith(`${TW_PREFIX}/`) ? "zh-TW" : "en";
}

/** Strip the /tc prefix to get the matching English path (used for hreflang pairing). */
export function toEnglishPath(pathname: string): string {
  if (pathname === TW_PREFIX) return "/";
  if (pathname.startsWith(`${TW_PREFIX}/`)) return pathname.slice(TW_PREFIX.length) || "/";
  return pathname;
}

/** Add the /tc prefix to an English path. */
export function toTwPath(pathname: string): string {
  if (pathname === "/") return TW_PREFIX;
  return `${TW_PREFIX}${pathname}`;
}

/** The `<html lang>` / hreflang code for each locale. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  "zh-TW": "zh-Hant-TW",
};

/** Open Graph locale codes. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  "zh-TW": "zh_TW",
};

export const SITE_URL = "https://wyndralore.com";

/**
 * Build the `alternates` metadata block for a page that exists in both languages, given the
 * English path (e.g. "/cards/the-fool"). Google discovers the /tc pages through these plus the
 * sitemap; x-default points at the English version.
 */
export function hreflangAlternates(englishPath: string) {
  const en = `${SITE_URL}${englishPath === "/" ? "" : englishPath}`;
  const tw = `${SITE_URL}${toTwPath(englishPath) === TW_PREFIX ? TW_PREFIX : toTwPath(englishPath)}`;
  return {
    languages: {
      en: en,
      "zh-Hant-TW": tw,
      "x-default": en,
    },
  };
}

// ── Suit / arcana vocabulary (Taiwan convention) ───────────────────────────────
export const SUIT_LABEL: Record<Locale, Record<string, string>> = {
  en: { wands: "Wands", cups: "Cups", swords: "Swords", pentacles: "Pentacles" },
  "zh-TW": { wands: "權杖", cups: "聖杯", swords: "寶劍", pentacles: "錢幣" },
};

// ── UI dictionary ──────────────────────────────────────────────────────────────
// Traditional Chinese uses Taiwan word choices throughout (方案/免費/註冊/登入/影片/牌陣…).
export interface Dict {
  nav: {
    cards: string;
    pricing: string;
    journal: string;
    account: string;
    signIn: string;
  };
  footer: {
    cardMeanings: string;
    pricing: string;
    terms: string;
    privacy: string;
    refunds: string;
    contact: string;
    disclaimer: string;
  };
  home: {
    eyebrow: string;
    h1Before: string;
    h1Highlight: string;
    h1After: string;
    subtitle: string;
    drawCta: string;
    seeSpreads: string;
    steps: { title: string; body: string }[];
    aiEyebrow: string;
    aiTitle: string;
    aiBody: string;
    spreadsTitle: string;
    spreadsSubtitle: string;
    cardsUnit: (n: number) => string;
    premiumBadge: string;
    freeTitle: string;
    freeSubtitle: string;
    freeBadge: string;
    specialTitle: string;
    specialSubtitle: string;
    oneTimeBadge: string;
  };
  cardsIndex: {
    title: string;
    description: string;
    majorArcana: string;
    minorArcana: string;
  };
  card: {
    allCards: string;
    majorArcana: string;
    minorArcana: string;
    upright: string;
    reversed: string;
    themesTitle: string;
    themesSubtitle: (name: string) => string;
    love: string;
    career: string;
    wellness: string;
    drawPrompt: string;
    drawCta: string;
    metaTitle: (name: string) => string;
    metaDescription: (name: string, keywords: string) => string;
  };
  premium: {
    label: string;
    blurb: string;
    cta: string;
  };
  // Spread titles/subtitles, keyed by spread slug, for the 繁體 homepage grid.
  spreads: Record<string, { title: string; subtitle: string }>;
}

const en: Dict = {
  nav: { cards: "Cards", pricing: "Pricing", journal: "Journal", account: "Account", signIn: "Sign In" },
  footer: {
    cardMeanings: "Card Meanings",
    pricing: "Pricing",
    terms: "Terms",
    privacy: "Privacy",
    refunds: "Refunds",
    contact: "Contact Us",
    disclaimer: "For entertainment and self-reflection purposes only. Not a substitute for professional advice.",
  },
  home: {
    eyebrow: "Free · No account needed",
    h1Before: "A tarot reading with a ",
    h1Highlight: "ritual",
    h1After: ", not a gimmick.",
    subtitle:
      "Shuffle by hand. Choose your own cards. Watch them turn. Wyndralore brings the quiet ceremony of an in-person tarot reading to your screen.",
    drawCta: "Draw Your Card",
    seeSpreads: "See all spreads",
    steps: [
      { title: "Shuffle", body: "Cut the deck yourself. Shuffle as many times as it takes to feel ready." },
      { title: "Select", body: "Draw your cards by hand from the fan — no card is chosen for you." },
      { title: "Reveal", body: "Watch each card turn, and read what it has to say about where you are." },
    ],
    aiEyebrow: "AI-Powered Personal Insight Engine",
    aiTitle: "The ritual, then a mirror",
    aiBody:
      "You still shuffle, choose, and reveal by hand — nothing about that changes. Once your cards are turned, an AI reading traces the energy between them and ties it back to your question, free of judgment or personal bias. Every reading includes one free distilled insight; go deeper any time.",
    spreadsTitle: "Choose your spread",
    spreadsSubtitle: "Start free with a single card, or explore a deeper spread.",
    cardsUnit: (n) => `${n} card${n > 1 ? "s" : ""}`,
    premiumBadge: "Premium",
    freeTitle: "Free to try",
    freeSubtitle: "No sign-up, no cards to shuffle — just an answer.",
    freeBadge: "Free",
    specialTitle: "Special readings",
    specialSubtitle: "Big questions, one-time rituals — yours forever, no subscription.",
    oneTimeBadge: "One-time",
  },
  cardsIndex: {
    title: "Tarot Card Meanings",
    description: "Every card in the deck — upright and reversed meanings for love, career, and wellness.",
    majorArcana: "Major Arcana",
    minorArcana: "Minor Arcana",
  },
  card: {
    allCards: "← All Cards",
    majorArcana: "Major Arcana",
    minorArcana: "Minor Arcana",
    upright: "Upright",
    reversed: "Reversed",
    themesTitle: "Themes in depth",
    themesSubtitle: (name) => `How ${name} speaks to different areas of life.`,
    love: "Love",
    career: "Career",
    wellness: "Wellness",
    drawPrompt: "Want to see this card in a reading?",
    drawCta: "Draw Your Card",
    metaTitle: (name) => `${name} Tarot Card Meaning (Upright & Reversed) | Wyndralore`,
    metaDescription: (name, keywords) =>
      `${name} tarot card meaning: ${keywords}. Upright and reversed meanings for love, career, and wellness.`,
  },
  premium: {
    label: "Premium",
    blurb: "Unlock the full love, career, and wellness readings for every card.",
    cta: "Go Premium",
  },
  spreads: {
    daily: { title: "Card of the Day", subtitle: "One card to carry with you today — or three piles to choose from." },
    "yes-no": { title: "Yes / No", subtitle: "A quick, honest answer to sit with." },
    "three-card": { title: "Past · Present · Future", subtitle: "See the shape of where you've been, where you are, and where you're headed." },
    love: { title: "Love Spread", subtitle: "A closer look at the heart of a relationship." },
    career: { title: "Career Path", subtitle: "Clarity on the work that's calling you." },
    "celtic-cross": { title: "Celtic Cross", subtitle: "The full ten-card ritual for a deep, layered question." },
  },
};

const zhTW: Dict = {
  nav: { cards: "牌義", pricing: "方案", journal: "占卜筆記", account: "帳號", signIn: "登入" },
  footer: {
    cardMeanings: "塔羅牌義",
    pricing: "訂閱方案",
    terms: "服務條款",
    privacy: "隱私權",
    refunds: "退款說明",
    contact: "聯絡我們",
    disclaimer: "僅供娛樂與自我省思之用，不能取代專業建議。",
  },
  home: {
    eyebrow: "免費 · 無需註冊",
    h1Before: "一場有",
    h1Highlight: "儀式感",
    h1After: "的塔羅占卜，而不是把戲。",
    subtitle:
      "親手洗牌，自己選牌，看著牌一張張翻開。Wyndralore 把面對面塔羅占卜那份靜謐的儀式感，帶到你的螢幕上。",
    drawCta: "抽一張牌",
    seeSpreads: "看所有牌陣",
    steps: [
      { title: "洗牌", body: "由你親手切牌，洗到覺得準備好了為止。" },
      { title: "選牌", body: "從展開的扇形牌陣中親手抽牌——沒有人替你決定。" },
      { title: "翻牌", body: "看著每張牌翻開，讀出它對你此刻處境想說的話。" },
    ],
    aiEyebrow: "AI 個人洞察引擎",
    aiTitle: "先是儀式，然後是一面鏡子",
    aiBody:
      "洗牌、選牌、翻牌，全都由你親手完成——這一點不會改變。牌翻開之後，AI 解讀會梳理牌與牌之間的能量，並扣回你的問題，不帶批判，也不帶個人偏見。每次占卜都附一則免費的精華洞察；想深入，隨時都可以。",
    spreadsTitle: "選擇你的牌陣",
    spreadsSubtitle: "從單張牌免費開始，或探索更深入的牌陣。",
    cardsUnit: (n) => `${n} 張牌`,
    premiumBadge: "進階",
    freeTitle: "免費體驗",
    freeSubtitle: "無需註冊，也不用洗牌——直接給你答案。",
    freeBadge: "免費",
    specialTitle: "特別占卜",
    specialSubtitle: "重要的提問，一次性的儀式——買斷永久擁有，無需訂閱。",
    oneTimeBadge: "單次買斷",
  },
  cardsIndex: {
    title: "塔羅牌義大全",
    description: "整副牌的每一張——正位與逆位牌義，涵蓋愛情、事業與健康。",
    majorArcana: "大阿爾克那",
    minorArcana: "小阿爾克那",
  },
  card: {
    allCards: "← 所有牌卡",
    majorArcana: "大阿爾克那",
    minorArcana: "小阿爾克那",
    upright: "正位",
    reversed: "逆位",
    themesTitle: "主題深入解讀",
    themesSubtitle: (name) => `${name}在人生各個面向想對你說的話。`,
    love: "愛情",
    career: "事業",
    wellness: "健康",
    drawPrompt: "想在占卜中遇見這張牌嗎？",
    drawCta: "抽一張牌",
    metaTitle: (name) => `${name}塔羅牌義（正位與逆位）| Wyndralore`,
    metaDescription: (name, keywords) =>
      `${name}塔羅牌義：${keywords}。正位與逆位在愛情、事業與健康上的含義。`,
  },
  premium: {
    label: "進階",
    blurb: "解鎖每張牌完整的愛情、事業與健康解讀。",
    cta: "升級進階會員",
  },
  spreads: {
    daily: { title: "每日一牌", subtitle: "抽一張牌陪你走過今天——也可以從三疊牌中挑選。" },
    "yes-no": { title: "是 / 否", subtitle: "一個乾脆而誠實的答案，讓你細細體會。" },
    "three-card": { title: "過去 · 現在 · 未來", subtitle: "看清你來時的路、此刻的位置，以及前方的走向。" },
    love: { title: "愛情牌陣", subtitle: "更靠近一段關係的核心。" },
    career: { title: "事業之路", subtitle: "看清那份正在召喚你的工作。" },
    "celtic-cross": { title: "凱爾特十字", subtitle: "完整的十張牌儀式，面對層次深厚的提問。" },
  },
};

const DICTS: Record<Locale, Dict> = { en, "zh-TW": zhTW };

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}
