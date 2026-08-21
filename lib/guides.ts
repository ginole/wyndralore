// The /guides article section — the site's first real editorial content.
//
// Why this exists (2026-08-21): every card page and landing page already existed, but the domain
// had almost no *inbound internal links* into the 78 card pages, and no long-form content at all —
// which is both why Search Console kept the card pages "Discovered – currently not indexed" and why
// AdSense declined the site as "low-value content". These guides are written to do three jobs at
// once: (1) rank for high-intent beginner queries ("what is tarot", "upright and reversed",
// "tarot suits"), (2) push contextual internal links DOWN into the card pages and reading flows,
// and (3) read as genuine, human-written help — not keyword filler.
//
// Content is authored in both English and 繁體 (Taiwan wording), mirroring every other page.
//
// Inline links use a small token grammar parsed by components/guideText.tsx:
//   [[the-fool|The Fool]]              → /cards/the-fool           (card page)
//   [[guide:tarot-suits-explained|x]] → /guides/tarot-suits-explained
//   [[path:/reading/daily|draw]]      → /reading/daily            (any internal path)
// On the 繁體 tree every href is automatically prefixed with /tc.

import type { Locale } from "@/lib/i18n";

export interface GuideSection {
  heading: string;
  body: string[];
}

export interface GuideContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  intro: string;
  sections: GuideSection[];
}

export interface Guide {
  slug: string;
  order: number;
  readMinutes: number;
  /** Slugs of sibling guides to cross-link at the foot of the article. */
  related: string[];
  en: GuideContent;
  "zh-TW": GuideContent;
}

export const GUIDES: Guide[] = [
  // ── 1. What is tarot ──────────────────────────────────────────────────────────
  {
    slug: "what-is-tarot",
    order: 1,
    readMinutes: 5,
    related: ["how-to-read-tarot", "major-and-minor-arcana", "how-to-ask-tarot-a-question"],
    en: {
      title: "What Is Tarot? A Beginner's Guide",
      metaTitle: "What Is Tarot? A Beginner's Guide to the 78 Cards | Wyndralore",
      metaDescription:
        "A plain-English introduction to tarot: what the 78 cards are, where the deck comes from, and what a reading can (and can't) actually tell you.",
      excerpt: "What the 78 cards are, where the deck comes from, and what a reading is really for.",
      intro:
        "Tarot is a deck of 78 cards, each carrying an image and a set of meanings, used as a tool for reflection. A reading is less a prediction of the future and more a mirror held up to the present — a way to look at a situation from a fresh angle. Here is what the deck is and how to think about it.",
      sections: [
        {
          heading: "The deck, in one paragraph",
          body: [
            "A tarot deck has 78 cards split into two groups. The 22 [[guide:major-and-minor-arcana|Major Arcana]] are the big, archetypal cards — [[the-fool|The Fool]], [[the-lovers|The Lovers]], [[the-tower|The Tower]] — and they tend to speak to the larger themes and turning points of a life. The 56 Minor Arcana are closer to daily life, sorted into four suits that each cover a different arena: [[guide:tarot-suits-explained|Wands, Cups, Swords, and Pentacles]].",
            "Most modern decks descend from the 1909 Waite–Smith deck, whose fully illustrated scenes made the cards readable at a glance and set the imagery nearly every beginner learns from today.",
          ],
        },
        {
          heading: "What a reading actually does",
          body: [
            "The honest version: tarot doesn't tell you a fixed future. What it does well is externalise a question. When you draw a card and read its meaning against your own situation, you're forced to name what you're actually feeling and weighing — and that naming is where the insight comes from. The card is a prompt; you supply the truth.",
            "This is why the most useful questions are the ones you have a hand in. \"What am I not seeing about this decision?\" gives you something to work with. \"Will I be rich?\" does not. There's a whole short guide on [[guide:how-to-ask-tarot-a-question|asking a good question]].",
          ],
        },
        {
          heading: "Upright, reversed, and the shape of a spread",
          body: [
            "A card can land upright or reversed, and the reversed position usually softens, blocks, or turns inward the upright meaning — covered in [[guide:upright-and-reversed|upright and reversed cards]]. Cards are also read in patterns called spreads, from a single daily card to a ten-card layout; [[guide:tarot-spreads-for-beginners|beginner spreads]] walks through the ones worth starting with.",
          ],
        },
        {
          heading: "Try it once",
          body: [
            "The fastest way to understand tarot is to draw a card and sit with it. You can [[path:/reading/daily|draw your first card]] here for free — shuffle it yourself, turn it over, and read what it has to say about today.",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "什麼是塔羅？新手入門指南",
      metaTitle: "什麼是塔羅？78 張牌的新手入門指南 | Wyndralore",
      metaDescription:
        "用最直白的方式認識塔羅：78 張牌是什麼、這副牌從何而來，以及一次占卜到底能（和不能）告訴你什麼。",
      excerpt: "78 張牌是什麼、這副牌從何而來，以及占卜真正的用途。",
      intro:
        "塔羅是一副 78 張的牌，每張牌都帶著一幅圖像與一組含義，是一種用來自我省思的工具。與其說占卜是在預測未來，不如說它是一面照見當下的鏡子——一種從新角度看待處境的方式。以下說明這副牌是什麼，以及該怎麼理解它。",
      sections: [
        {
          heading: "一段話看懂這副牌",
          body: [
            "一副塔羅有 78 張牌，分成兩組。22 張[[guide:major-and-minor-arcana|大阿爾克那]]是宏大而原型性的牌——[[the-fool|愚者]]、[[the-lovers|戀人]]、[[the-tower|高塔]]——通常對應人生較大的主題與轉折。56 張小阿爾克那則貼近日常，分成四個牌組，各自對應不同的生活面向：[[guide:tarot-suits-explained|權杖、聖杯、寶劍與錢幣]]。",
            "現代大多數的牌都源自 1909 年的偉特—史密斯牌，它把每張牌都畫成完整的場景，讓人一眼就能讀懂，也奠定了今天幾乎每個新手最初學習的圖像。",
          ],
        },
        {
          heading: "一次占卜到底在做什麼",
          body: [
            "誠實地說：塔羅不會告訴你一個注定的未來。它真正擅長的，是把問題「攤到你面前」。當你抽出一張牌、把它的含義對照自己的處境時，你會被迫說清楚自己到底在感受什麼、在權衡什麼——而洞察正是從這個「說清楚」的過程裡長出來的。牌只是一個引子，真相由你補上。",
            "這也是為什麼最有用的問題，都是你自己有份參與的問題。「這個決定裡，有什麼是我沒看見的？」能給你可以著力的東西；「我會不會發財？」則不能。關於這點，另有一篇[[guide:how-to-ask-tarot-a-question|如何問一個好問題]]。",
          ],
        },
        {
          heading: "正位、逆位，以及牌陣的形狀",
          body: [
            "一張牌可能正著出現，也可能逆著出現，逆位通常會削弱、阻塞，或把正位的含義轉向內在——這在[[guide:upright-and-reversed|正位與逆位]]一篇裡有說明。牌也會依固定的排列來讀，這種排列叫做牌陣，從單張每日一牌到十張牌的大牌陣都有；[[guide:tarot-spreads-for-beginners|新手牌陣]]會帶你認識最值得從此開始的幾個。",
          ],
        },
        {
          heading: "先試一次",
          body: [
            "理解塔羅最快的方式，就是抽一張牌，然後靜靜與它相處。你可以在這裡免費[[path:/reading/daily|抽出你的第一張牌]]——親手洗牌，翻開它，讀出它想對今天的你說的話。",
          ],
        },
      ],
    },
  },

  // ── 2. How to read tarot ──────────────────────────────────────────────────────
  {
    slug: "how-to-read-tarot",
    order: 2,
    readMinutes: 6,
    related: ["what-is-tarot", "how-to-ask-tarot-a-question", "tarot-spreads-for-beginners"],
    en: {
      title: "How to Read Tarot Cards: A Step-by-Step Guide for Beginners",
      metaTitle: "How to Read Tarot Cards: A Step-by-Step Beginner's Guide | Wyndralore",
      metaDescription:
        "Learn to read tarot in five steps: frame a question, shuffle, draw, read the card in context, and tie it back to your life. No memorising 78 cards required.",
      excerpt: "Five steps from question to insight — no need to memorise all 78 cards first.",
      intro:
        "You do not need to memorise 78 cards to start reading tarot. Reading is a skill of paying attention: to your question, to the image in front of you, and to how the two rub against each other. Here is a simple sequence that works from your very first draw.",
      sections: [
        {
          heading: "Step 1 — Frame one clear question",
          body: [
            "A reading is only as good as the question underneath it. Keep it open and about you: \"What do I need to understand about this job offer?\" beats \"Should I take it, yes or no?\" — the first invites the card to say something, the second just wants a coin flip. The dedicated guide on [[guide:how-to-ask-tarot-a-question|asking a good question]] goes deeper.",
          ],
        },
        {
          heading: "Step 2 — Shuffle while you hold the question",
          body: [
            "Shuffle the deck with your question in mind, however feels right, until something tells you to stop. This part isn't superstition for its own sake — it's a way of slowing down and settling your attention on the one thing you're asking about, which is what makes the card that follows land.",
          ],
        },
        {
          heading: "Step 3 — Draw, and really look before you interpret",
          body: [
            "Turn the card over and look at the image before you reach for the \"meaning\". What's the figure doing? Is the mood calm or tense, moving or stuck? Your first honest reaction to the picture is data. Only then bring in the keywords — and notice whether the card is [[guide:upright-and-reversed|upright or reversed]], which shifts the reading.",
          ],
        },
        {
          heading: "Step 4 — Read the card against your situation, not in a vacuum",
          body: [
            "The same card means different things to different questions. [[three-of-swords|The Three of Swords]] over a breakup reads as grief that needs air; over a work conflict it reads as a hard truth already spoken. Ask: what is this image pointing at in my specific situation? That translation step is the whole craft.",
            "If you drew several cards in a [[guide:tarot-spreads-for-beginners|spread]], read them as a sentence rather than separate words — past leaning into present, present leaning into likely outcome.",
          ],
        },
        {
          heading: "Step 5 — End with one thing you'll do differently",
          body: [
            "A reading that changes nothing was just entertainment. Before you close, name one small thing the card nudged you toward — a conversation to have, a question to sit with, a thing to stop avoiding. That's the payoff.",
            "Ready to practise? [[path:/reading/three-card|Pull a three-card spread]] and walk it through these five steps.",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "如何解讀塔羅牌：新手的分步指南",
      metaTitle: "如何解讀塔羅牌：新手分步入門指南 | Wyndralore",
      metaDescription:
        "用五個步驟學會讀塔羅：框定一個問題、洗牌、抽牌、把牌放進脈絡裡讀，再扣回你的生活。不必先背下 78 張牌。",
      excerpt: "從問題到洞察的五個步驟——不必先把 78 張牌全背下來。",
      intro:
        "你不需要背下 78 張牌才能開始讀塔羅。解讀是一種「留心」的能力：留心你的問題，留心眼前的圖像，也留心兩者彼此摩擦出的火花。以下這套簡單的流程，從你第一次抽牌就用得上。",
      sections: [
        {
          heading: "第一步——框定一個清楚的問題",
          body: [
            "一次占卜的好壞，取決於底下那個問題。讓它保持開放、且與你有關：「關於這個工作機會，我需要理解什麼？」勝過「我該不該接，是或否？」——前者邀請牌說點什麼，後者只想擲硬幣。另一篇[[guide:how-to-ask-tarot-a-question|如何問一個好問題]]談得更深。",
          ],
        },
        {
          heading: "第二步——心中握著問題洗牌",
          body: [
            "帶著你的問題洗牌，用你覺得對的方式洗，直到有什麼告訴你可以停了。這一步並不是為了迷信而迷信——它是一種放慢速度、把注意力沉澱在你所問的那一件事上的方式，而這正是讓接下來那張牌能「打中」的原因。",
          ],
        },
        {
          heading: "第三步——抽牌，先好好看，再解讀",
          body: [
            "翻開牌，先看圖像，再去找「含義」。畫面裡的人在做什麼？氣氛是平靜還是緊繃，是流動還是卡住？你對這幅畫的第一個誠實反應，本身就是線索。接著才引入關鍵字——並留意這張牌是[[guide:upright-and-reversed|正位還是逆位]]，那會改變整個解讀。",
          ],
        },
        {
          heading: "第四步——把牌放進你的處境裡讀，而不是憑空讀",
          body: [
            "同一張牌，對不同的問題有不同的意思。[[three-of-swords|寶劍三]]出現在一段分手裡，讀作需要透氣的悲傷；出現在一場工作衝突裡，則讀作一個已經被說出口的殘酷事實。問自己：在我這個具體的處境裡，這幅圖像指向什麼？這個「翻譯」的步驟，就是整門手藝的核心。",
            "如果你在一個[[guide:tarot-spreads-for-beginners|牌陣]]裡抽了好幾張，把它們當成一句話來讀，而不是一個個分開的字——過去傾向現在，現在傾向可能的結果。",
          ],
        },
        {
          heading: "第五步——用「一件會改變的事」收尾",
          body: [
            "一次什麼都沒改變的占卜，只是娛樂而已。在你結束之前，說出這張牌推著你去做的一件小事——一場該談的對話、一個值得細想的問題、一件你一直在逃避的事。這才是收穫。",
            "準備好練習了嗎？[[path:/reading/three-card|抽一個三張牌牌陣]]，照著這五個步驟走一遍。",
          ],
        },
      ],
    },
  },

  // ── 3. Major and Minor Arcana ─────────────────────────────────────────────────
  {
    slug: "major-and-minor-arcana",
    order: 3,
    readMinutes: 5,
    related: ["what-is-tarot", "tarot-suits-explained", "how-to-read-tarot"],
    en: {
      title: "Major Arcana vs Minor Arcana: What's the Difference?",
      metaTitle: "Major Arcana vs Minor Arcana: The Difference Explained | Wyndralore",
      metaDescription:
        "The tarot's 78 cards split into 22 Major Arcana and 56 Minor Arcana. Here's what each group covers, and what it means when one dominates a reading.",
      excerpt: "22 big-theme cards, 56 everyday cards — and why the mix in a reading matters.",
      intro:
        "The 78 cards of the tarot fall into two families: 22 Major Arcana and 56 Minor Arcana. Knowing which is which changes how you read a card the moment it lands — one speaks to the weather of your whole life, the other to today's forecast.",
      sections: [
        {
          heading: "The Major Arcana — the big themes",
          body: [
            "The 22 Major Arcana are the named, numbered cards from [[the-fool|The Fool]] (0) to [[the-world|The World]] (21). They're the archetypes: fate, transformation, love, power, endings, renewal. When a Major card appears, it's usually pointing at something structural — a chapter of your life rather than a passing mood.",
            "Read in order, they even tell a story sometimes called the Fool's Journey: an innocent setting out, meeting teachers and trials — [[the-magician|The Magician]], [[the-high-priestess|The High Priestess]], [[the-tower|The Tower]], [[the-star|The Star]] — and arriving, changed, at completion.",
          ],
        },
        {
          heading: "The Minor Arcana — everyday life",
          body: [
            "The 56 Minor Arcana handle the texture of ordinary days: conversations, money, work, feelings, small choices. They're divided into four [[guide:tarot-suits-explained|suits]] — Wands, Cups, Swords, Pentacles — each numbered Ace through Ten, plus four court cards (Page, Knight, Queen, King) who often represent people or ways of behaving.",
            "If the Majors are the plot, the Minors are the scenes — the specific, movable details of how a theme is playing out right now.",
          ],
        },
        {
          heading: "What the balance tells you",
          body: [
            "The mix in a spread is itself information. A reading heavy with Major Arcana suggests forces larger than your daily control — a genuine turning point. A reading that's mostly Minor Arcana suggests the situation is still in your hands, made of choices you can adjust. Neither is better; they answer different sizes of question.",
            "You can browse every card by family in the full [[path:/cards|card library]], or start with a single [[path:/reading/daily|daily draw]] and notice which family shows up.",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "大阿爾克那與小阿爾克那：差在哪裡？",
      metaTitle: "大阿爾克那 vs 小阿爾克那：差別完整說明 | Wyndralore",
      metaDescription:
        "塔羅的 78 張牌分成 22 張大阿爾克那與 56 張小阿爾克那。這篇說明兩組各自涵蓋什麼，以及當其中一組主導一次占卜時代表什麼。",
      excerpt: "22 張大主題的牌、56 張日常的牌——以及一次占卜裡兩者的比例為何重要。",
      intro:
        "塔羅的 78 張牌分成兩個家族：22 張大阿爾克那與 56 張小阿爾克那。知道一張牌屬於哪一組，會在它出現的當下就改變你解讀它的方式——一組談的是你整個人生的天氣，另一組談的是今天的天氣預報。",
      sections: [
        {
          heading: "大阿爾克那——宏大的主題",
          body: [
            "22 張大阿爾克那，是從[[the-fool|愚者]]（0）到[[the-world|世界]]（21）這些有名字、有編號的牌。它們是原型：命運、蛻變、愛、權力、結束、重生。當一張大牌出現，通常指向某種結構性的東西——你人生的一個章節，而不是一時的情緒。",
            "依序來讀，它們甚至會串成一個故事，有時被稱為「愚者之旅」：一個天真的人踏上旅途，遇見一個個老師與試煉——[[the-magician|魔術師]]、[[the-high-priestess|女祭司]]、[[the-tower|高塔]]、[[the-star|星星]]——最後帶著改變，抵達圓滿。",
          ],
        },
        {
          heading: "小阿爾克那——日常生活",
          body: [
            "56 張小阿爾克那，處理的是尋常日子的紋理：對話、金錢、工作、感受、小小的選擇。它們分成四個[[guide:tarot-suits-explained|牌組]]——權杖、聖杯、寶劍、錢幣——每組從一（Ace）到十編號，再加上四張宮廷牌（侍者、騎士、皇后、國王），常常代表某個人，或某種行事的方式。",
            "如果大牌是劇情，小牌就是一場場的戲——一個主題此刻正如何上演的那些具體、可調動的細節。",
          ],
        },
        {
          heading: "比例會告訴你什麼",
          body: [
            "一個牌陣裡的比例本身就是訊息。一次占卜若大阿爾克那很多，暗示著超出你日常掌控的力量——一個真正的轉捩點。一次占卜若大多是小阿爾克那，則暗示情況仍在你手中，由你能調整的選擇構成。兩者沒有好壞，它們回答的是不同「尺寸」的問題。",
            "你可以在完整的[[path:/cards|牌卡典藏]]裡依家族瀏覽每一張牌，或先來一次[[path:/reading/daily|每日一牌]]，看看出現的是哪個家族。",
          ],
        },
      ],
    },
  },

  // ── 4. Upright and reversed ───────────────────────────────────────────────────
  {
    slug: "upright-and-reversed",
    order: 4,
    readMinutes: 5,
    related: ["how-to-read-tarot", "what-is-tarot", "tarot-suits-explained"],
    en: {
      title: "Upright and Reversed Tarot Cards: What Reversals Really Mean",
      metaTitle: "Upright vs Reversed Tarot Cards: What Reversals Mean | Wyndralore",
      metaDescription:
        "A reversed tarot card isn't simply 'the opposite'. Learn the four honest ways to read a reversal — blocked, internal, excess, or resolving — plus whether to use them at all.",
      excerpt: "Reversals aren't just 'the opposite' — four cleaner ways to read them.",
      intro:
        "When a card lands upside down, it's called reversed, and beginners are often told it just means the opposite. That's the fast answer, and it's usually wrong. A reversal more often bends the card's energy than flips it. Here are cleaner ways to read one.",
      sections: [
        {
          heading: "Four honest readings of a reversal",
          body: [
            "Blocked or delayed: the upright energy is trying to happen but something's in the way. A reversed [[the-sun|Sun]] isn't misery — it's joy behind a cloud.",
            "Internal rather than external: the card's meaning is turning inward, felt privately rather than shown to the world. Useful for cards about relationships and confidence.",
            "Too much or too little: the upright quality is out of balance — overdone or running dry — rather than absent.",
            "Resolving or releasing: with difficult cards this is the kind one. A reversed [[three-of-swords|Three of Swords]] can read as grief finally starting to lift.",
          ],
        },
        {
          heading: "Read the picture, then choose",
          body: [
            "Which of the four fits? The image and your question decide. This is exactly the interpretation muscle from the [[guide:how-to-read-tarot|step-by-step reading guide]] — look at what the card is doing, hold it against your situation, and pick the reading that actually speaks to it. There's rarely one 'correct' reversal meaning; there's the one that's true for you today.",
          ],
        },
        {
          heading: "Do you even have to use reversals?",
          body: [
            "No — and plenty of experienced readers don't. Reading every card upright is a completely valid style; you simply read the same meaning as either its bright or its shadow side depending on context. If reversals feel like noise while you're learning, leave them out and add them later. Beginners often find the deck less overwhelming that way.",
            "Every card's page here lists both its [[path:/cards|upright and reversed meanings]] side by side, so you can compare them whenever you draw.",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "正位與逆位塔羅牌：逆位到底代表什麼",
      metaTitle: "正位 vs 逆位塔羅牌：逆位的真正含義 | Wyndralore",
      metaDescription:
        "逆位的塔羅牌不只是「相反」而已。學會四種更誠實的讀逆位方式——受阻、向內、過度或正在化解——以及你到底要不要用逆位。",
      excerpt: "逆位不只是「相反」——四種更清晰的讀法。",
      intro:
        "當一張牌倒著出現，就叫做逆位，而新手常被告知它「就是相反的意思」。那是最快的答案，通常也是錯的。逆位更多時候是彎折一張牌的能量，而不是把它翻面。以下是幾種更清晰的讀法。",
      sections: [
        {
          heading: "逆位的四種誠實讀法",
          body: [
            "受阻或延遲：正位的能量正想發生，但有什麼擋著。逆位的[[the-sun|太陽]]不是悲慘——而是躲在雲後的喜悅。",
            "向內而非向外：牌的含義正轉向內在，是私下地感受，而非展現給世界看。用在關於關係與自信的牌上特別合適。",
            "過多或過少：正位的特質失衡了——用過了頭，或快要枯竭——而不是缺席。",
            "正在化解或釋放：對困難的牌來說，這是溫柔的一種。逆位的[[three-of-swords|寶劍三]]可以讀作悲傷終於開始退去。",
          ],
        },
        {
          heading: "先讀畫面，再做選擇",
          body: [
            "四種裡哪一種合適？由圖像和你的問題決定。這正是[[guide:how-to-read-tarot|分步解讀指南]]裡那塊解讀肌肉——看牌在做什麼，把它對照你的處境，選出真正能對它說話的那個讀法。逆位很少有唯一「正確」的含義；有的，是今天對你而言為真的那一個。",
          ],
        },
        {
          heading: "你一定要用逆位嗎？",
          body: [
            "不必——很多資深占卜者也不用。把每張牌都當正位來讀，是完全成立的一種風格；你只是依脈絡，把同一個含義讀成它光明的一面或陰影的一面。如果在學習階段逆位讓你覺得只是雜訊，就先把它拿掉，之後再加回來。新手常覺得這樣整副牌沒那麼壓迫。",
            "這裡每一張牌的頁面，都把[[path:/cards|正位與逆位的含義]]並排列出，讓你每次抽牌都能對照。",
          ],
        },
      ],
    },
  },

  // ── 5. The four suits ─────────────────────────────────────────────────────────
  {
    slug: "tarot-suits-explained",
    order: 5,
    readMinutes: 6,
    related: ["major-and-minor-arcana", "what-is-tarot", "upright-and-reversed"],
    en: {
      title: "The Four Tarot Suits Explained: Wands, Cups, Swords & Pentacles",
      metaTitle: "The Four Tarot Suits Explained: Wands, Cups, Swords, Pentacles | Wyndralore",
      metaDescription:
        "Each of tarot's four suits governs a different part of life — energy, emotion, mind, and the material world. A quick, memorable guide to what Wands, Cups, Swords and Pentacles mean.",
      excerpt: "Fire, water, air, earth — what each of the four suits is really about.",
      intro:
        "The 56 Minor Arcana are split into four suits, and each one owns a different arena of life. Learn these four and you can read most Minor cards on instinct, before you know a single keyword — the suit tells you the topic, the number tells you the stage.",
      sections: [
        {
          heading: "Wands — energy, drive, and doing",
          body: [
            "Element fire. Wands are about action, ambition, creativity, and momentum — the spark that gets things moving. Career projects, passion, the urge to start. A run of Wands says the question is about drive and direction, not feelings. See the [[ace-of-wands|Ace of Wands]] for the pure form of that spark.",
          ],
        },
        {
          heading: "Cups — emotion, love, and connection",
          body: [
            "Element water. Cups govern feelings, relationships, intuition, and everything to do with the heart. When love questions come up, this is the suit that answers most directly — the [[ace-of-cups|Ace of Cups]] is a heart opening, the [[two-of-cups|Two of Cups]] a genuine bond. More on this in [[guide:tarot-for-love|tarot for love]].",
          ],
        },
        {
          heading: "Swords — mind, truth, and conflict",
          body: [
            "Element air. Swords are the suit of thought, communication, decisions, and the hard truths that come with them. They can look harsh because they deal with the mind's sharp edges — anxiety, clarity, conflict, cutting through. The [[three-of-swords|Three of Swords]] is the suit's famous heartbreak; the [[ace-of-swords|Ace of Swords]] is a breakthrough of clear thinking.",
          ],
        },
        {
          heading: "Pentacles — money, work, and the body",
          body: [
            "Element earth. Pentacles cover the material world: money, work, home, health, and everything tangible and slow-building. Where Wands start a project, Pentacles are about making it last — the [[ace-of-pentacles|Ace of Pentacles]] is a solid new opportunity you can actually hold.",
          ],
        },
        {
          heading: "Suit plus number",
          body: [
            "Once the suits are second nature, add the numbers: Aces are beginnings, the middle numbers are the messy work, Tens are completion, and the court cards (Page, Knight, Queen, King) are people or postures. Suit gives the topic, number gives the stage — that's most of a Minor card, right there. Browse a full suit at a time in the [[path:/cards|card library]].",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "塔羅四大牌組完整解說：權杖、聖杯、寶劍與錢幣",
      metaTitle: "塔羅四大牌組解說：權杖、聖杯、寶劍、錢幣 | Wyndralore",
      metaDescription:
        "塔羅的四個牌組各自掌管人生的不同面向——能量、情感、思緒與物質世界。一份好記的速查：權杖、聖杯、寶劍、錢幣分別代表什麼。",
      excerpt: "火、水、風、土——四個牌組各自真正在講的事。",
      intro:
        "56 張小阿爾克那分成四個牌組，每一組各自掌管人生的一塊領域。學會這四組，你就能在還不會任何關鍵字之前，憑直覺讀懂大多數的小牌——牌組告訴你主題，數字告訴你階段。",
      sections: [
        {
          heading: "權杖——能量、衝勁與行動",
          body: [
            "元素屬火。權杖關乎行動、企圖心、創造力與動能——那股讓事情開始動起來的火花。事業計畫、熱情、想開始的衝動。一連串權杖，說明這個問題是關於幹勁與方向，而不是感受。想看這股火花最純粹的樣子，見[[ace-of-wands|權杖一]]。",
          ],
        },
        {
          heading: "聖杯——情感、愛與連結",
          body: [
            "元素屬水。聖杯掌管感受、關係、直覺，以及一切與心有關的事。當愛情的問題出現時，這是回答得最直接的牌組——[[ace-of-cups|聖杯一]]是一顆心的敞開，[[two-of-cups|聖杯二]]是一段真實的連結。更多內容見[[guide:tarot-for-love|愛情塔羅]]。",
          ],
        },
        {
          heading: "寶劍——思緒、真相與衝突",
          body: [
            "元素屬風。寶劍是思考、溝通、抉擇，以及隨之而來的殘酷真相的牌組。它們看起來會有點嚴厲，因為處理的是心智鋒利的那一面——焦慮、清明、衝突、斬斷。[[three-of-swords|寶劍三]]是這個牌組著名的心碎；[[ace-of-swords|寶劍一]]則是清明思緒的突破。",
          ],
        },
        {
          heading: "錢幣——金錢、工作與身體",
          body: [
            "元素屬土。錢幣涵蓋物質世界：金錢、工作、家、健康，以及一切具體而緩慢累積的事物。權杖負責開啟一個計畫，錢幣則關乎讓它持久——[[ace-of-pentacles|錢幣一]]是一個你真的握得住的、扎實的新機會。",
          ],
        },
        {
          heading: "牌組加數字",
          body: [
            "當四個牌組變成直覺後，再加上數字：一（Ace）是開端，中間的數字是那些混亂的過程，十是完成，而宮廷牌（侍者、騎士、皇后、國王）是人或姿態。牌組給你主題，數字給你階段——一張小牌的大半，就在這裡了。想一次瀏覽完整一個牌組，到[[path:/cards|牌卡典藏]]。",
          ],
        },
      ],
    },
  },

  // ── 6. Asking a good question ─────────────────────────────────────────────────
  {
    slug: "how-to-ask-tarot-a-question",
    order: 6,
    readMinutes: 4,
    related: ["how-to-read-tarot", "what-is-tarot", "tarot-for-love"],
    en: {
      title: "How to Ask Tarot the Right Question",
      metaTitle: "How to Ask Tarot the Right Question (With Examples) | Wyndralore",
      metaDescription:
        "The question you ask decides how useful a tarot reading is. Learn to turn closed, fear-based questions into open ones the cards can actually answer — with before-and-after examples.",
      excerpt: "The question shapes the answer — how to ask one the cards can actually work with.",
      intro:
        "The single biggest thing that separates a reading that helps from one that frustrates isn't the cards — it's the question. A good tarot question is open, present-tense, and about something you can influence. Here's how to build one.",
      sections: [
        {
          heading: "Trade yes/no for 'what' and 'how'",
          body: [
            "\"Will he text me back?\" hands the cards a locked door. \"What's really going on between us?\" or \"How can I approach this so I don't lose myself?\" opens one. Closed questions get a shrug; open questions get a story you can use. (If you genuinely want a quick binary, a dedicated [[path:/reading/yes-no|yes-or-no draw]] is fine for that — just know its limits.)",
          ],
        },
        {
          heading: "Ask about your part, not other people's minds",
          body: [
            "Tarot reads the energy around you and your choices, not the private thoughts of someone who isn't there. \"Does she secretly love me?\" is unanswerable and a little unfair; \"What am I not seeing about this relationship?\" puts the reading where you actually have power. Pointing the question back at yourself is almost always the upgrade.",
          ],
        },
        {
          heading: "Stay in the present",
          body: [
            "The cards are strongest on now — the current shape of a situation and where its momentum points. Instead of \"When will I get married?\", try \"What's blocking me from the relationship I want?\" You'll get something you can act on this week rather than a date you'll only wait for.",
          ],
        },
        {
          heading: "A quick before-and-after",
          body: [
            "\"Should I quit my job?\" → \"What do I need to understand before I decide about this job?\" \"Will we get back together?\" → \"What's the honest state of this connection right now?\" Same situation, far better reading. Once your question is clean, walk it through the [[guide:how-to-read-tarot|five reading steps]] — or just [[path:/reading/daily|draw a card]] and try one out.",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "如何向塔羅問一個對的問題",
      metaTitle: "如何向塔羅問一個對的問題（附範例） | Wyndralore",
      metaDescription:
        "你問的問題，決定了一次塔羅占卜有多有用。學會把封閉、出於恐懼的問題，改成牌真正回答得了的開放式問題——附前後對照範例。",
      excerpt: "問題塑造答案——如何問一個牌真正著力得上的問題。",
      intro:
        "讓一次占卜「有幫助」還是「令人挫折」，最關鍵的差別不在牌，而在問題。一個好的塔羅問題，是開放的、現在式的，而且關於你能影響的事。以下教你怎麼建構它。",
      sections: [
        {
          heading: "把「是/否」換成「是什麼」和「怎麼做」",
          body: [
            "「他會不會回我訊息？」遞給牌的是一扇鎖上的門。「我們之間到底在發生什麼？」或「我可以怎麼面對這件事，才不會弄丟自己？」則打開一扇門。封閉的問題只換來一個聳肩；開放的問題換來一個你用得上的故事。（如果你真的只想要一個乾脆的二選一，專門的[[path:/reading/yes-no|是非抽牌]]拿來用也可以——只是要知道它的侷限。）",
          ],
        },
        {
          heading: "問你自己的那一份，而不是別人的心思",
          body: [
            "塔羅讀的是你與你的選擇周圍的能量，而不是一個不在場的人私底下的念頭。「她是不是偷偷愛著我？」既無法回答，也有點不公平；「這段關係裡，有什麼是我沒看見的？」則把占卜放在你真正有力量的地方。把問題轉回自己身上，幾乎永遠是一次升級。",
          ],
        },
        {
          heading: "停留在當下",
          body: [
            "牌在「現在」最強——一個處境當前的形狀，以及它的動能指向何方。與其問「我什麼時候會結婚？」，不如試試「是什麼擋著我，得不到我想要的那段關係？」你會得到這禮拜就能著手的東西，而不是一個只能空等的日期。",
          ],
        },
        {
          heading: "一組快速前後對照",
          body: [
            "「我該不該辭職？」→「在我決定之前，關於這份工作我需要理解什麼？」「我們會不會復合？」→「這段連結此刻誠實的狀態是什麼？」同樣的處境，好上太多的占卜。當你的問題乾淨了，就帶著它走一遍[[guide:how-to-read-tarot|解讀的五個步驟]]——或直接[[path:/reading/daily|抽一張牌]]試試看。",
          ],
        },
      ],
    },
  },

  // ── 7. Tarot for love ─────────────────────────────────────────────────────────
  {
    slug: "tarot-for-love",
    order: 7,
    readMinutes: 5,
    related: ["tarot-suits-explained", "how-to-ask-tarot-a-question", "tarot-spreads-for-beginners"],
    en: {
      title: "Tarot for Love: What the Cards Say About Relationships",
      metaTitle: "Tarot for Love: Reading the Cards for Relationships | Wyndralore",
      metaDescription:
        "Love is the most common reason people reach for tarot. Learn which cards speak to relationships, how to ask about love without trapping yourself, and the cards to actually watch for.",
      excerpt: "The cards that speak to relationships — and how to ask about love honestly.",
      intro:
        "Love is, by a wide margin, the most common reason people pull a card. Tarot won't tell you whether a specific person will text back, but it's genuinely good at showing you the shape of a connection and your own part in it. Here's how to read for love without tying yourself in knots.",
      sections: [
        {
          heading: "The suit that carries the heart",
          body: [
            "Emotionally, love lives in the [[guide:tarot-suits-explained|suit of Cups]] — the water suit of feeling and connection. The [[two-of-cups|Two of Cups]] is the classic card of mutual attraction and a real bond; the [[ace-of-cups|Ace of Cups]] is a heart opening or a fresh beginning of feeling; the [[ten-of-cups|Ten of Cups]] is emotional fulfilment, the settled happy-ending card. A love reading rich in Cups is usually about the real emotional current, not the logistics.",
          ],
        },
        {
          heading: "Cards to actually watch for",
          body: [
            "[[the-lovers|The Lovers]] is the obvious one, but it's about values and choice as much as romance — a meaningful union, or a decision of the heart. Beyond Cups, [[the-empress|The Empress]] speaks to nurturing, sensual love; the [[three-of-swords|Three of Swords]] to heartbreak and hard truths spoken. Reversed cards here often point inward — see [[guide:upright-and-reversed|upright and reversed]] for that.",
          ],
        },
        {
          heading: "Ask about love the useful way",
          body: [
            "This is where beginners trip. \"Does he love me?\" and \"Will she come back?\" put all the power outside you and usually just feed anxiety. Turn them: \"What's the real state of this connection?\", \"What do I need to see clearly here?\", \"What am I bringing to this that I could change?\" The [[guide:how-to-ask-tarot-a-question|question guide]] covers this in full — it matters more for love than for any other topic.",
          ],
        },
        {
          heading: "A simple love reading to try",
          body: [
            "A clean starter: three cards for you, them, and the connection between you. Read them as one story rather than three verdicts. When you're ready, [[path:/reading/three-card|pull a three-card spread]] with a relationship question in mind, or explore the fuller [[path:/reading/love-compatibility|love spread]].",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "愛情塔羅：牌卡怎麼看一段關係",
      metaTitle: "愛情塔羅：用牌卡解讀感情關係 | Wyndralore",
      metaDescription:
        "愛情是人們求助塔羅最常見的原因。學會哪些牌在談關係、如何問感情才不會把自己困住，以及真正值得留意的那些牌。",
      excerpt: "哪些牌在談關係——以及如何誠實地問愛情。",
      intro:
        "愛情，遠遠地，是人們抽牌最常見的原因。塔羅不會告訴你某個特定的人會不會回訊息，但它真的很擅長讓你看見一段連結的形狀，以及你自己在其中的那一份。以下教你怎麼為愛情讀牌，又不把自己纏成一團。",
      sections: [
        {
          heading: "承載這顆心的牌組",
          body: [
            "在情感上，愛情住在[[guide:tarot-suits-explained|聖杯牌組]]裡——那個屬水、關於感受與連結的牌組。[[two-of-cups|聖杯二]]是相互吸引與真實連結的經典牌；[[ace-of-cups|聖杯一]]是一顆心的敞開，或一段感受的全新開始；[[ten-of-cups|聖杯十]]是情感上的圓滿，那張安定的幸福結局牌。一次充滿聖杯的愛情占卜，通常談的是真實的情感暗流，而不是那些現實的安排。",
          ],
        },
        {
          heading: "真正值得留意的牌",
          body: [
            "[[the-lovers|戀人]]是最明顯的一張，但它談的既是浪漫，也同樣是價值與選擇——一段有意義的結合，或一個出自內心的決定。除了聖杯，[[the-empress|皇后]]談的是滋養而感官的愛；[[three-of-swords|寶劍三]]則是心碎，以及被說出口的殘酷真相。這裡的逆位常常指向內在——那部分見[[guide:upright-and-reversed|正位與逆位]]。",
          ],
        },
        {
          heading: "用有用的方式問愛情",
          body: [
            "這正是新手常摔跤的地方。「他愛我嗎？」「她會不會回來？」把所有力量都放到你之外，通常只會餵養焦慮。把它們翻過來：「這段連結真實的狀態是什麼？」「這裡有什麼是我需要看清楚的？」「我帶進這段關係裡、而我其實可以改變的，是什麼？」[[guide:how-to-ask-tarot-a-question|問問題的指南]]把這點講得很完整——在愛情上，這比任何主題都更重要。",
          ],
        },
        {
          heading: "一個可以試試的簡單愛情占卜",
          body: [
            "一個乾淨的起手式：三張牌，分別代表你、對方，以及你們之間的連結。把它們當成一個故事來讀，而不是三個裁決。準備好時，帶著一個關係的問題[[path:/reading/three-card|抽一個三張牌牌陣]]，或探索更完整的[[path:/reading/love-compatibility|愛情牌陣]]。",
          ],
        },
      ],
    },
  },

  // ── 8. Beginner spreads ───────────────────────────────────────────────────────
  {
    slug: "tarot-spreads-for-beginners",
    order: 8,
    readMinutes: 6,
    related: ["how-to-read-tarot", "tarot-for-love", "how-to-ask-tarot-a-question"],
    en: {
      title: "Tarot Spreads for Beginners: One Card, Three Cards & the Celtic Cross",
      metaTitle: "Tarot Spreads for Beginners: 1-Card, 3-Card & Celtic Cross | Wyndralore",
      metaDescription:
        "A spread is just the pattern you lay cards in, each position asking its own question. Start with the one-card and three-card spreads, then meet the ten-card Celtic Cross.",
      excerpt: "Start with one card, graduate to three, and meet the classic ten-card layout.",
      intro:
        "A spread is simply the pattern you lay your cards in, where each position asks its own question. You don't need a complicated one to get a real reading — the best first spreads are the smallest. Here's the sensible order to grow into them.",
      sections: [
        {
          heading: "The one-card draw — start here",
          body: [
            "One card, one question. It's the fastest way to build the core skill of reading a card in context, and it's plenty for a daily check-in: \"What do I need to keep in mind today?\" Draw, look, translate it to your day, done. Almost everything in the [[guide:how-to-read-tarot|reading guide]] is easiest to practise here first. You can [[path:/reading/daily|pull a single card]] free every day.",
          ],
        },
        {
          heading: "The three-card spread — the workhorse",
          body: [
            "Three cards is where readings get genuinely useful, because now the cards talk to each other. The classic layout is Past · Present · Future, but the three positions can be anything you name: Situation · Action · Outcome, or Mind · Body · Spirit, or You · Them · The Connection for a [[guide:tarot-for-love|love]] question. The skill here is reading them as one sentence. Try a [[path:/reading/three-card|three-card spread]] once the single card feels natural.",
          ],
        },
        {
          heading: "The Celtic Cross — the deep dive",
          body: [
            "The ten-card Celtic Cross is the famous 'big' spread, with positions for the heart of the matter, what crosses it, the recent past, the near future, hopes and fears, and the likely outcome. It's a lot to hold at once, so it's not a starting point — but once three-card readings feel easy, it's the natural next step for a weighty question you want to look at from every side.",
          ],
        },
        {
          heading: "Pick the spread to fit the question",
          body: [
            "Match the size of the spread to the size of the question. A quick gut-check wants one card; a situation with a past and a direction wants three; a genuine crossroads can carry ten. Start small — a reading you can actually hold beats an impressive layout you can't. And a clean [[guide:how-to-ask-tarot-a-question|question]] matters more than any spread you choose.",
          ],
        },
      ],
    },
    "zh-TW": {
      title: "新手塔羅牌陣：單張、三張與凱爾特十字",
      metaTitle: "新手塔羅牌陣：單張、三張與凱爾特十字 | Wyndralore",
      metaDescription:
        "牌陣不過是你擺放牌卡的固定排列，每個位置各自問一個問題。從單張與三張牌陣開始，再認識十張牌的凱爾特十字。",
      excerpt: "從單張開始，進階到三張，再認識經典的十張牌牌陣。",
      intro:
        "牌陣，不過是你擺放牌卡的固定排列，其中每個位置各自問一個問題。你不需要一個複雜的牌陣，也能得到一次真正的占卜——最好的入門牌陣，往往是最小的那些。以下是循序長進的合理順序。",
      sections: [
        {
          heading: "單張抽牌——從這裡開始",
          body: [
            "一張牌，一個問題。這是建立「在脈絡裡讀一張牌」這項核心能力最快的方式，而且拿來每日簽到也綽綽有餘：「今天我需要記在心上的是什麼？」抽牌、看牌、翻譯成你的一天，完成。[[guide:how-to-read-tarot|解讀指南]]裡幾乎所有東西，都最適合先在這裡練習。你每天都能免費[[path:/reading/daily|抽一張牌]]。",
          ],
        },
        {
          heading: "三張牌陣——最實用的主力",
          body: [
            "三張牌，是占卜開始真正有用的地方，因為牌與牌之間現在會彼此對話了。經典的排法是「過去 · 現在 · 未來」，但這三個位置可以是任何你為它命名的東西：處境 · 行動 · 結果，或身 · 心 · 靈，或者為一個[[guide:tarot-for-love|愛情]]問題排成「你 · 對方 · 連結」。這裡的功夫，在於把它們讀成一句話。等單張牌用起來自然了，就試試[[path:/reading/three-card|三張牌牌陣]]。",
          ],
        },
        {
          heading: "凱爾特十字——深潛",
          body: [
            "十張牌的凱爾特十字，是那個著名的「大」牌陣，位置涵蓋事情的核心、橫在其上的阻礙、近期的過去、不遠的未來、希望與恐懼，以及可能的結果。要一次掌握它很多，所以它不是起點——但當三張牌的占卜變得輕鬆之後，面對一個你想從每個面向細看的重大問題，它就是自然的下一步。",
          ],
        },
        {
          heading: "讓牌陣的大小配合問題的大小",
          body: [
            "讓牌陣的尺寸，配合問題的尺寸。一個快速的直覺確認，一張牌就夠；一個有過去也有方向的處境，需要三張；一個真正的十字路口，能撐得起十張。從小開始——一次你真正握得住的占卜，勝過一個你駕馭不了的華麗排法。而一個乾淨的[[guide:how-to-ask-tarot-a-question|問題]]，比你選的任何牌陣都更重要。",
          ],
        },
      ],
    },
  },
];

export function getAllGuides(): Guide[] {
  return [...GUIDES].sort((a, b) => a.order - b.order);
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getGuideContent(guide: Guide, locale: Locale): GuideContent {
  return locale === "zh-TW" ? guide["zh-TW"] : guide.en;
}

/** Curated sibling guides for the "continue reading" block — the internal-link web. */
export function getRelatedGuides(guide: Guide): Guide[] {
  return guide.related
    .map((slug) => getGuideBySlug(slug))
    .filter((g): g is Guide => Boolean(g));
}
