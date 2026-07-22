import type { Metadata } from "next";
import Link from "next/link";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "是非塔羅 — 免費即時單張牌答案 | Wyndralore",
  description:
    "問一個是非題，抽一張牌，得到清楚而誠實的答案。免費即時的是非塔羅占卜，有真正的洗牌抽牌儀式——無需註冊。",
  alternates: { canonical: "https://wyndralore.com/tc/yes-or-no-tarot", ...hreflangAlternates("/yes-or-no-tarot") },
};

const FAQ = [
  {
    q: "是非塔羅占卜是怎麼運作的？",
    a: "你心中握著一個清楚的問題，洗牌，然後抽一張牌。正位的能量通常偏向「是」，逆位偏向「否」——而牌本身會告訴你為什麼，這正是擲硬幣給不了你的部分。",
  },
  {
    q: "哪種問題最適合？",
    a: "你自己有份參與的問題：「我該不該把那則訊息傳出去？」會比「明天會不會下雨？」更適合。塔羅讀的是一個選擇周圍的能量——它不預測注定的事件。",
  },
  {
    q: "同一個問題可以問兩次嗎？",
    a: "一個問題、一次抽牌，才是誠實的做法。一直重抽到你滿意的答案為止，其實也在告訴你一些事——你早就知道自己想要什麼。換個角度問吧。",
  },
  {
    q: "這真的免費嗎？",
    a: "是的——是非抽牌是你每日免費占卜的一部分。當天第一次抽牌，無需註冊。",
  },
];

export default function TwYesOrNoPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">是 / 否 塔羅</p>
        <h1 className="font-display mt-3 text-3xl text-moon sm:text-4xl">提問。抽一張牌。了然。</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-moon-dim">
          有些問題不需要十張牌的牌陣——它們只需要一個乾脆的答案。握著你的問題，親手洗牌，抽一張牌，得到清楚的是非傾向，以及背後的原因。
        </p>
        <Link
          href="/tc/reading/yes-no"
          className="mt-8 inline-block rounded-full bg-gold px-9 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform hover:scale-[1.02] hover:bg-gold-bright"
        >
          現在就問你的問題
        </Link>
        <p className="mt-3 text-xs text-moon-dim/70">免費 · 即時 · 你親手洗牌抽牌</p>
      </div>

      <div className="mx-auto mt-16 max-w-xl space-y-8">
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2 className="font-display text-lg text-gold-bright">{item.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-moon-dim">{item.a}</p>
          </div>
        ))}
        <p className="text-sm leading-relaxed text-moon-dim">
          想要的不只是一個是或否？一個{" "}
          <Link href="/tc/reading/three-card" className="text-gold underline underline-offset-4 hover:text-gold-bright">
            過去–現在–未來牌陣
          </Link>{" "}
          會展開你問題周圍的故事，而每一次占卜，都能用一段為你確切的牌卡量身撰寫的 AI 解讀更深入。
        </p>
        <p className="text-xs text-moon-dim/70">僅供娛樂與自我省思之用。</p>
      </div>
    </section>
  );
}
