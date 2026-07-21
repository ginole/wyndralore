import type { Locale } from "./i18n";

// Funnel / app dictionary (draw · AI panel · tip · account · pricing). Kept separate from the
// marketing i18n.ts so neither file becomes unwieldy. Taiwan wording throughout.

export interface AppDict {
  theme: { general: string; love: string; career: string; wellness: string };
  // spread position words (English label from lib/spreads → localized). Falls back to the English
  // word if a position isn't listed.
  positions: Record<string, string>;
  reading: {
    limitedGuestEyebrow: string;
    limitedMemberEyebrow: string;
    limitedGuestTitle: string;
    limitedMemberTitle: string;
    limitedGuestBody: string;
    limitedMemberBody: string;
    shareForOne: string;
    watchAdForOne: string;
    createFreeAccount: string;
    alreadyHaveSignIn: string;
    goPremiumUnlimited: string;
    backToWyndralore: string;
    cardsUnit: (n: number) => string;
    questionLabel: string;
    questionPlaceholder: string;
    lensLabel: string;
    beginShuffling: string;
    oneCard: string;
    threePiles: string;
    readingsLeft: (remaining: number, limit: number) => string;
    creditUnlock: (remaining: number) => string;
    shuffleTitle: string;
    shuffleBody: string;
    shuffling: string;
    deckReady: string;
    shuffleBtn: string;
    continueToSelect: string;
    chooseCards: string;
    selectMore: (n: number) => string;
    revealing: string;
    yourReading: string;
    streakDay1: string;
    streakN: (n: number) => string;
    upright: string;
    reversed: string;
    share: string;
    savedViewJournal: string;
    saving: string;
    membersOnlySeePlans: string;
    saveToJournal: string;
    saveToJournalLocked: string;
    saveLockedTitle: string;
    drawAgain: string;
    backToSpreads: string;
    addNoteLabel: string;
    notePlaceholder: string;
    bonusUnlocked: string;
    linkCopied: string;
    shareTitle: string;
    shareText: string;
  };
  ai: {
    brand: string;
    tagline: string;
    reveal: string;
    generating: string;
    notSavedHint: string;
    quotaLine: (remaining: number, limit: number) => string;
    priceHintMember: string;
    priceHintGuest: string;
    buySingle: string;
    buyOverage: string;
    signInHint: string;
    signIn: string;
    notConfigured: string;
    error: string;
    followYours: string;
    followLoading: string;
    followError: string;
    followAskTitle: string;
    followPlaceholder: string;
    askTheCards: string;
    followHaveCredit: string;
    followOffer: string;
    followBuy: string;
    oneMoment: string;
    redirecting: string;
  };
  tip: {
    line: string;
    button: (price: number) => string;
    loading: string;
    thanks: string;
    error: string;
  };
  account: {
    signIn: string;
    register: string;
    welcomeBack: string;
    createAccount: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    passwordsNoMatch: string;
    passwordsNoMatchRetype: string;
    pleaseWait: string;
    createAccountBtn: string;
    somethingWrong: string;
    resetTitle: string;
    resetSent: (email: string) => string;
    resetIntro: string;
    sending: string;
    sendResetLink: string;
    backToSignIn: string;
    yourAccount: string;
    plan: string;
    free: string;
    renewsExpires: string;
    readingsLeftToday: string;
    dailyStreak: string;
    dayUnit: (n: number) => string;
    bestStreak: (n: number) => string;
    morningEmail: string;
    inviteFriends: string;
    freeUnlocks: (n: number) => string;
    inviteBody: string;
    copyLink: string;
    copied: string;
    preparingLink: string;
    autoRenewOn: string;
    autoRenewBody: (plan: string, date: string) => string;
    cancelAutoRenew: string;
    canceling: string;
    cancelConfirm: string;
    openJournal: string;
    goPremium: string;
    signOut: string;
    partnerDashboard: string;
    masterDashboard: string;
  };
  journal: {
    title: string;
    signInToSee: string;
    signIn: string;
    premiumFeature: string;
    upsellBody: string;
    goPremium: string;
    keptHeading: string;
    boughtKeptPre: string;
    premiumWord: string;
    boughtKeptPost: string;
    noneYet: string;
    startReading: string;
    aiDeepReading: string;
    save: string;
    cancel: string;
    noNote: string;
    edit: string;
    addNote: string;
    delete: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    intro: string;
    subscribeSave: string;
    oneTime: string;
    mostPopular: string;
    renewsAt: (price: string, cadence: string) => string;
    oneTimeNote: string;
    getPremium: string;
    pleaseWait: string;
    couldNotStart: string;
    couldNotOpen: string;
    finePrint: string;
    terms: string;
    perMonth: string;
    once: string;
    // localize the raw cadence string from lib/pricing ("/ month" | "/ year" | "one-time")
    cadence: (raw: string) => string;
    // plan labels + perks keyed by plan id
    planLabels: Record<string, string>;
    planPerks: Record<string, string[]>;
  };
}

const en: AppDict = {
  theme: { general: "General", love: "Love", career: "Career", wellness: "Wellness" },
  positions: {},
  reading: {
    limitedGuestEyebrow: "Want another card?",
    limitedMemberEyebrow: "Today’s reading is complete",
    limitedGuestTitle: "Create a free account to keep going",
    limitedMemberTitle: "You’ve used today’s free reading",
    limitedGuestBody:
      "It’s free — no card needed. Members get more readings every day, save every one to their journal, and can unlock extra draws by sharing or watching a short clip.",
    limitedMemberBody: "Your free draw resets tomorrow. Premium members read without limits.",
    shareForOne: "Share for +1 Reading",
    watchAdForOne: "Watch an Ad for +1 Reading",
    createFreeAccount: "Create My Free Account",
    alreadyHaveSignIn: "Already have one? Sign in",
    goPremiumUnlimited: "Go Premium for Unlimited",
    backToWyndralore: "Back to Wyndralore",
    cardsUnit: (n) => `${n} card${n > 1 ? "s" : ""}`,
    questionLabel: "Your question (optional)",
    questionPlaceholder: "What's on your mind right now?",
    lensLabel: "Read this through the lens of",
    beginShuffling: "Begin Shuffling",
    oneCard: "One card",
    threePiles: "Three piles",
    readingsLeft: (r, l) => `${r} of ${l} readings left today`,
    creditUnlock: (r) => `✦ Unlocking with 1 of your ${r} free premium ${r === 1 ? "unlock" : "unlocks"}`,
    shuffleTitle: "Shuffle the deck",
    shuffleBody: "Shuffle as many times as feels right, then continue when you're ready to draw.",
    shuffling: "Shuffling…",
    deckReady: "The deck is ready when you are.",
    shuffleBtn: "Shuffle",
    continueToSelect: "Continue to Select",
    chooseCards: "Choose your cards",
    selectMore: (n) => `Select ${n} more card${n > 1 ? "s" : ""}.`,
    revealing: "Revealing...",
    yourReading: "Your Reading",
    streakDay1: "Day 1 of your streak — come back tomorrow",
    streakN: (n) => `${n}-day streak — see you tomorrow`,
    upright: "Upright",
    reversed: "Reversed",
    share: "Share",
    savedViewJournal: "Saved ✓ View Journal",
    saving: "Saving…",
    membersOnlySeePlans: "Members only — see plans",
    saveToJournal: "Save to Journal",
    saveToJournalLocked: "Save to Journal 🔒",
    saveLockedTitle: "Saving a free draw unlocks with Premium — readings you buy are always saved",
    drawAgain: "Draw Again",
    backToSpreads: "Back to Spreads",
    addNoteLabel: "Add a note (saved to your journal)",
    notePlaceholder: "What does this reading bring up for you?",
    bonusUnlocked: "+1 reading unlocked!",
    linkCopied: "Link copied to clipboard!",
    shareTitle: "Wyndralore Tarot",
    shareText:
      "I just drew a reading on Wyndralore — a tarot experience built for quiet reflection. Try a free reading of your own.",
  },
  ai: {
    brand: "A Tarot-Attuned Reading Engine",
    tagline:
      "Not a generic chatbot guessing at your spread. This engine is tuned to tarot alone — steeped in the centuries-old meaning of the very cards you drew, and reading them in the exact positions before you, against your own question. No stranger's bias, no judgment: just the quiet pattern your cards are tracing, finally put into words.",
    reveal: "Reveal My Deep Reading",
    generating: "Reading the energy between your cards…",
    notSavedHint:
      "Members can save every reading to their Journal — this one won't be saved anywhere. Copy or screenshot it now to keep it.",
    quotaLine: (r, l) => `${r} of ${l} free deep readings left this cycle`,
    priceHintMember: "$1.99 once your free readings run out this cycle",
    priceHintGuest: "$2.99 to reveal this reading",
    buySingle: "Unlock this reading — $2.99",
    buyOverage: "One more reading — $1.99 (member rate)",
    signInHint: "Sign in free, then $2.99 to reveal — or free with membership",
    signIn: "Sign in to continue",
    notConfigured: "AI deep readings are coming soon.",
    error: "Something went wrong generating your reading. Try again.",
    followYours: "Your follow-up",
    followLoading: "Listening to the cards again…",
    followError: "Something went wrong with your follow-up. Try again.",
    followAskTitle: "Ask your follow-up question",
    followPlaceholder: "What would you like the cards to clarify?",
    askTheCards: "Ask the cards",
    followHaveCredit: "Ask a follow-up — you have a credit",
    followOffer: "Something in this reading you want to go deeper on?",
    followBuy: "Ask one follow-up question — $1.99",
    oneMoment: "One moment…",
    redirecting: "Redirecting…",
  },
  tip: {
    line: "Did this reading land? Wyndralore is built and kept alive by one person.",
    button: (p) => `Leave a $${p} tip 💛`,
    loading: "One moment…",
    thanks: "Thank you — truly. 💛",
    error: "Couldn’t start checkout — try again.",
  },
  account: {
    signIn: "Sign In",
    register: "Register",
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot password?",
    passwordsNoMatch: "Passwords don’t match yet.",
    passwordsNoMatchRetype: "Passwords don't match. Please retype them.",
    pleaseWait: "Please wait…",
    createAccountBtn: "Create Account",
    somethingWrong: "Something went wrong.",
    resetTitle: "Reset your password",
    resetSent: (email) =>
      `If an account exists for ${email}, we've sent a link to reset your password. It expires in 1 hour.`,
    resetIntro: "Enter your email and we'll send you a link to choose a new password.",
    sending: "Sending…",
    sendResetLink: "Send Reset Link",
    backToSignIn: "Back to Sign In",
    yourAccount: "Your Account",
    plan: "Plan",
    free: "Free",
    renewsExpires: "Renews / Expires",
    readingsLeftToday: "Readings left today",
    dailyStreak: "Daily streak",
    dayUnit: (n) => `${n} day${n === 1 ? "" : "s"}`,
    bestStreak: (n) => ` · best ${n}`,
    morningEmail: "Morning email if I haven’t drawn my Card of the Day",
    inviteFriends: "Invite friends",
    freeUnlocks: (n) => `${n} free ${n === 1 ? "unlock" : "unlocks"}`,
    inviteBody:
      "When a friend signs up with your link and does a reading, you get 3 free unlocks for any premium spread — Love, Career, or Celtic Cross.",
    copyLink: "Copy Link",
    copied: "Copied ✓",
    preparingLink: "Preparing your invite link…",
    autoRenewOn: "Auto-renewal on",
    autoRenewBody: (plan, date) =>
      `Your ${plan} plan renews automatically${date ? ` on ${date}` : ""}. You're in control — cancel anytime and keep full access until then.`,
    cancelAutoRenew: "Cancel auto-renewal",
    canceling: "Canceling…",
    cancelConfirm: "Cancel auto-renewal? You'll keep full access until the end of your current period.",
    openJournal: "Open Your Journal",
    goPremium: "Go Premium",
    signOut: "Sign Out",
    partnerDashboard: "Your Partner Dashboard",
    masterDashboard: "Your Master Dashboard",
  },
  journal: {
    title: "Your Journal",
    signInToSee: "Sign in to see your saved readings.",
    signIn: "Sign In",
    premiumFeature: "Premium Feature",
    upsellBody:
      "The journal keeps your readings — cards, meanings, your question, and your own notes — so you can look back any time. Any reading you buy is kept here automatically, on any plan. Premium adds every free daily draw too.",
    goPremium: "Go Premium",
    keptHeading: "Readings you’ve kept",
    boughtKeptPre: "Readings you buy are always kept here. Free daily draws are saved with ",
    premiumWord: "Premium",
    boughtKeptPost: ".",
    noneYet: "No saved readings yet. Save one from any reading’s result page.",
    startReading: "Start a Reading",
    aiDeepReading: "AI Deep Reading",
    save: "Save",
    cancel: "Cancel",
    noNote: "No note yet.",
    edit: "Edit",
    addNote: "Add note",
    delete: "Delete",
  },
  pricing: {
    eyebrow: "Wyndralore Premium",
    title: "Read without limits",
    intro:
      "You choose how to pay. Subscribe and save — cancel anytime, no lock-in — or pay once with no auto-renewal at all. Whatever you pick is spelled out plainly, never a hidden charge.",
    subscribeSave: "Subscribe & save",
    oneTime: "One-time",
    mostPopular: "Most Popular",
    renewsAt: (price, cadence) => `Renews at ${price}${cadence} · cancel anytime`,
    oneTimeNote: "One-time payment · never auto-charged",
    getPremium: "Get Premium",
    pleaseWait: "Please wait…",
    couldNotStart: "Could not start your order.",
    couldNotOpen: "Could not open checkout — please try again.",
    finePrint:
      "Digital goods, delivered instantly — all sales final. Subscriptions renew automatically until you cancel, which you can do anytime from your account. By purchasing you agree to immediate delivery and waive any right of withdrawal.",
    terms: "Terms",
    perMonth: "/mo",
    once: "one-time",
    cadence: (raw) => raw,
    planLabels: { monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime" },
    planPerks: {
      monthly: ["Unlimited readings", "All premium spreads", "Reading journal", "Full card library", "2 free AI deep readings / month"],
      yearly: ["Everything in Monthly", "Best value", "3 free AI deep readings / month"],
      lifetime: ["Pay once, own it forever", "Everything in Yearly", "No renewals, ever", "4 free AI deep readings / month"],
    },
  },
};

const zhTW: AppDict = {
  theme: { general: "綜合", love: "愛情", career: "事業", wellness: "健康" },
  positions: {
    Today: "今天",
    Answer: "答案",
    "Pile One": "第一疊",
    "Pile Two": "第二疊",
    "Pile Three": "第三疊",
    Past: "過去",
    Present: "現在",
    Future: "未來",
    You: "你",
    Them: "對方",
    "The Connection": "你們的連結",
    Challenge: "挑戰",
    Potential: "潛在發展",
    "Current Path": "目前的路",
    Obstacle: "阻礙",
    Strength: "優勢",
    Advice: "建議",
    Outcome: "結果",
    Foundation: "根基",
    "Recent Past": "近期過往",
    Above: "意識層面",
    "Near Future": "不久的將來",
    Yourself: "你自己",
    Environment: "周遭環境",
    "Hopes & Fears": "希望與恐懼",
  },
  reading: {
    limitedGuestEyebrow: "還想再抽一張嗎？",
    limitedMemberEyebrow: "今天的占卜已完成",
    limitedGuestTitle: "註冊免費帳號，繼續抽牌",
    limitedMemberTitle: "今天的免費占卜已用完",
    limitedGuestBody:
      "完全免費，無需信用卡。會員每天有更多次占卜、能把每一次都存進占卜筆記，還能透過分享或看一小段影片解鎖額外抽牌。",
    limitedMemberBody: "免費抽牌明天重置。進階會員可無限次占卜。",
    shareForOne: "分享換 +1 次占卜",
    watchAdForOne: "看廣告換 +1 次占卜",
    createFreeAccount: "註冊我的免費帳號",
    alreadyHaveSignIn: "已經有帳號了？登入",
    goPremiumUnlimited: "升級進階，無限暢抽",
    backToWyndralore: "返回 Wyndralore",
    cardsUnit: (n) => `${n} 張牌`,
    questionLabel: "你的問題（可選填）",
    questionPlaceholder: "此刻，你心裡在想什麼？",
    lensLabel: "以哪個面向來解讀",
    beginShuffling: "開始洗牌",
    oneCard: "單張牌",
    threePiles: "三疊牌",
    readingsLeft: (r, l) => `今天還剩 ${r} / ${l} 次占卜`,
    creditUnlock: (r) => `✦ 使用你 ${r} 次免費進階解鎖中的 1 次`,
    shuffleTitle: "洗牌",
    shuffleBody: "想洗幾次就洗幾次，準備好抽牌了再繼續。",
    shuffling: "洗牌中…",
    deckReady: "牌準備好了，就等你。",
    shuffleBtn: "洗牌",
    continueToSelect: "繼續選牌",
    chooseCards: "抽出你的牌",
    selectMore: (n) => `再選 ${n} 張牌。`,
    revealing: "翻牌中…",
    yourReading: "你的占卜",
    streakDay1: "連續第 1 天——明天再來",
    streakN: (n) => `連續 ${n} 天——明天見`,
    upright: "正位",
    reversed: "逆位",
    share: "分享",
    savedViewJournal: "已儲存 ✓ 查看筆記",
    saving: "儲存中…",
    membersOnlySeePlans: "會員限定——查看方案",
    saveToJournal: "存進占卜筆記",
    saveToJournalLocked: "存進占卜筆記 🔒",
    saveLockedTitle: "免費抽牌需進階會員才能儲存——你購買的解讀則永久保存",
    drawAgain: "再抽一次",
    backToSpreads: "返回牌陣",
    addNoteLabel: "加上一段筆記（會存進你的占卜筆記）",
    notePlaceholder: "這次占卜讓你想到了什麼？",
    bonusUnlocked: "已解鎖 +1 次占卜！",
    linkCopied: "連結已複製！",
    shareTitle: "Wyndralore 塔羅",
    shareText: "我剛在 Wyndralore 抽了一次塔羅——一個為靜心省思而生的塔羅體驗。也來免費抽一張吧。",
  },
  ai: {
    brand: "專為塔羅調校的解讀引擎",
    tagline:
      "這不是一個對著你的牌陣瞎猜的通用聊天機器人。這個引擎只為塔羅而調校——浸潤在你所抽那幾張牌數百年來的象徵意義裡，在你眼前這個確切的牌位上解讀它們，並扣回你自己的問題。沒有陌生人的偏見，也沒有評判：只是你的牌正在描繪的那道安靜的脈絡，終於被化為文字。",
    reveal: "揭曉我的深度解讀",
    generating: "正在讀取牌與牌之間的能量…",
    notSavedHint: "會員能把每次占卜存進筆記——這一次不會被保存到任何地方。現在就複製或截圖留存吧。",
    quotaLine: (r, l) => `本週期還剩 ${r} / ${l} 次免費深度解讀`,
    priceHintMember: "本週期免費次數用完後，每次 $1.99",
    priceHintGuest: "$2.99 揭曉這次解讀",
    buySingle: "解鎖這次解讀 — $2.99",
    buyOverage: "再一次解讀 — $1.99（會員價）",
    signInHint: "免費登入後 $2.99 揭曉——或加入會員免費看",
    signIn: "登入以繼續",
    notConfigured: "AI 深度解讀即將推出。",
    error: "產生你的解讀時出了點問題，請再試一次。",
    followYours: "你的追問",
    followLoading: "再次聆聽牌的聲音…",
    followError: "你的追問出了點問題，請再試一次。",
    followAskTitle: "提出你的追問",
    followPlaceholder: "你希望牌為你釐清什麼？",
    askTheCards: "向牌提問",
    followHaveCredit: "追問一次——你有一張額度",
    followOffer: "這次解讀裡，有什麼想更深入的嗎？",
    followBuy: "追問一個問題 — $1.99",
    oneMoment: "稍候…",
    redirecting: "前往結帳…",
  },
  tip: {
    line: "這次占卜有觸動到你嗎？Wyndralore 由一個人親手打造、維繫至今。",
    button: (p) => `留一份 $${p} 小費 💛`,
    loading: "稍候…",
    thanks: "真心感謝你。💛",
    error: "無法開始結帳，請再試一次。",
  },
  account: {
    signIn: "登入",
    register: "註冊",
    welcomeBack: "歡迎回來",
    createAccount: "建立你的帳號",
    email: "電子郵件",
    password: "密碼",
    confirmPassword: "確認密碼",
    forgotPassword: "忘記密碼？",
    passwordsNoMatch: "兩次密碼還不一致。",
    passwordsNoMatchRetype: "兩次密碼不一致，請重新輸入。",
    pleaseWait: "請稍候…",
    createAccountBtn: "建立帳號",
    somethingWrong: "出了點問題。",
    resetTitle: "重設你的密碼",
    resetSent: (email) => `若 ${email} 有對應的帳號，我們已寄出重設密碼的連結，1 小時內有效。`,
    resetIntro: "輸入你的電子郵件，我們會寄一個連結給你設定新密碼。",
    sending: "寄送中…",
    sendResetLink: "寄出重設連結",
    backToSignIn: "返回登入",
    yourAccount: "你的帳號",
    plan: "方案",
    free: "免費",
    renewsExpires: "續訂 / 到期",
    readingsLeftToday: "今日剩餘占卜",
    dailyStreak: "每日連續",
    dayUnit: (n) => `${n} 天`,
    bestStreak: (n) => ` · 最佳 ${n}`,
    morningEmail: "若我還沒抽今天的每日一牌，早上寄信提醒我",
    inviteFriends: "邀請朋友",
    freeUnlocks: (n) => `${n} 次免費解鎖`,
    inviteBody:
      "當朋友用你的連結註冊並完成一次占卜，你就能獲得 3 次免費解鎖，可用於任何進階牌陣——愛情、事業或凱爾特十字。",
    copyLink: "複製連結",
    copied: "已複製 ✓",
    preparingLink: "正在準備你的邀請連結…",
    autoRenewOn: "自動續訂已開啟",
    autoRenewBody: (plan, date) =>
      `你的 ${plan} 方案會自動續訂${date ? `，於 ${date}` : ""}。主動權在你手上——隨時可取消，並保有完整權限直到當期結束。`,
    cancelAutoRenew: "取消自動續訂",
    canceling: "取消中…",
    cancelConfirm: "要取消自動續訂嗎？你會保有完整權限直到當期結束。",
    openJournal: "開啟你的占卜筆記",
    goPremium: "升級進階會員",
    signOut: "登出",
    partnerDashboard: "你的夥伴後台",
    masterDashboard: "你的大師後台",
  },
  journal: {
    title: "你的占卜筆記",
    signInToSee: "登入以查看你儲存的占卜。",
    signIn: "登入",
    premiumFeature: "進階功能",
    upsellBody:
      "占卜筆記會保存你的占卜——牌卡、含義、你的問題，以及你自己的筆記——讓你隨時回顧。你購買的任何解讀都會自動存在這裡，任何方案皆然。進階會員還會把每一次免費的每日抽牌也存下來。",
    goPremium: "升級進階會員",
    keptHeading: "你保存的占卜",
    boughtKeptPre: "你購買的解讀永遠保存在這裡。免費的每日抽牌則需",
    premiumWord: "進階會員",
    boughtKeptPost: "才會保存。",
    noneYet: "還沒有儲存的占卜。從任一次占卜的結果頁儲存一則吧。",
    startReading: "開始一次占卜",
    aiDeepReading: "AI 深度解讀",
    save: "儲存",
    cancel: "取消",
    noNote: "還沒有筆記。",
    edit: "編輯",
    addNote: "新增筆記",
    delete: "刪除",
  },
  pricing: {
    eyebrow: "Wyndralore 進階會員",
    title: "無限暢讀",
    intro:
      "付費方式由你決定。訂閱更划算——隨時可取消、絕不綁約——或一次買斷，完全不自動續費。你選的每一種都寫得清清楚楚，絕無隱藏收費。",
    subscribeSave: "訂閱省更多",
    oneTime: "一次買斷",
    mostPopular: "最受歡迎",
    renewsAt: (price, cadence) => `續訂價 ${price}${cadence} · 隨時可取消`,
    oneTimeNote: "一次付清 · 絕不自動扣款",
    getPremium: "升級進階",
    pleaseWait: "請稍候…",
    couldNotStart: "無法建立訂單。",
    couldNotOpen: "無法開啟結帳，請再試一次。",
    finePrint:
      "數位商品，即時交付——所有交易一經完成恕不退款。訂閱會自動續訂，直到你取消為止，你可隨時於帳號中操作。購買即表示你同意即時交付並放棄猶豫期退款權利。",
    terms: "服務條款",
    perMonth: "/月",
    once: "一次買斷",
    cadence: (raw) => {
      const r = raw.trim();
      if (r === "/ month") return " / 月";
      if (r === "/ year") return " / 年";
      if (r === "one-time") return "一次買斷";
      return raw;
    },
    planLabels: { monthly: "月方案", yearly: "年方案", lifetime: "終身方案" },
    planPerks: {
      monthly: ["無限次占卜", "所有進階牌陣", "占卜筆記", "完整牌義典藏", "每月 2 次免費 AI 深度解讀"],
      yearly: ["月方案的一切", "最超值", "每月 3 次免費 AI 深度解讀"],
      lifetime: ["一次買斷，永久擁有", "年方案的一切", "永不續訂", "每月 4 次免費 AI 深度解讀"],
    },
  },
};

const DICTS: Record<Locale, AppDict> = { en, "zh-TW": zhTW };

export function getAppDict(locale: Locale): AppDict {
  return DICTS[locale];
}
