import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "隱私權政策 — Wyndralore",
  description: "Wyndralore 如何處理你的資料。",
  alternates: { canonical: "/tc/privacy", ...hreflangAlternates("/privacy") },
};

export default function TwPrivacyPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">隱私權政策</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">最後更新：2026 年 7 月</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          我們讓 Wyndralore 的資料做法保持簡單且尊重。本政策說明我們蒐集什麼、為什麼蒐集、與誰分享，以及你擁有的選擇。
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">我們蒐集什麼</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-moon">帳號資料：</strong>你的電子郵件地址，以及經安全雜湊處理的密碼。
            </li>
            <li>
              <strong className="text-moon">占卜資料：</strong>若你是進階會員並選擇儲存一次占卜，我們會保存牌卡、你的問題，以及你的筆記。
            </li>
            <li>
              <strong className="text-moon">AI 解讀內容：</strong>當你要求一段 AI 生成的解讀時，你所抽的牌與你輸入的任何問題，會被傳送給我們的 AI 供應商（Anthropic）以產生該解讀。此內容僅用於產生你的解讀，不會用於訓練 AI 模型。
            </li>
            <li>
              <strong className="text-moon">付款紀錄：</strong>訂單明細，以及我們從支付服務商（Whop，銀行轉帳則為 Wise）收到的付款確認，保留供會計與客服之用。我們絕不會看到或儲存你完整的卡號。
            </li>
            <li>
              <strong className="text-moon">使用與廣告資料：</strong>我們記錄基本事件（頁面造訪、完成的占卜、漏斗步驟）以供分析，並使用會設置 cookie 的廣告與成效衡量工具，以了解流量與廣告成效。詳見下方「Cookie 與追蹤」。
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">Cookie 與追蹤</h2>
          <p className="mt-2">
            <strong className="text-moon">我們自己設置的第一方 cookie：</strong>一個用來讓你保持登入，一個匿名 id 用於我們自家、對隱私友善的分析。
          </p>
          <p className="mt-2">
            <strong className="text-moon">由我們使用的分析與廣告工具設置的第三方 cookie：</strong>Google Analytics、Google AdSense，以及 Meta（Facebook）像素。這些供應商可能設置 cookie，用以衡量流量、投放與衡量廣告，並在它們營運自家廣告聯播網時建立廣告輪廓。我們無法直接控制那些 cookie。
          </p>
          <p className="mt-2">
            你可以加以限制：在瀏覽器設定中管理或封鎖 cookie，於{" "}
            <a className="text-gold underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
              adssettings.google.com
            </a>{" "}
            選擇退出個人化 Google 廣告，並在你的 Facebook 帳號設定中調整 Meta 廣告偏好。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">我們與誰分享資料</h2>
          <p className="mt-2">我們仰賴一小群值得信任的供應商，每一個只處理它所需要的：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong className="text-moon">Whop</strong>——信用卡付款處理（登記商戶）；<strong className="text-moon">Wise</strong>——銀行轉帳。</li>
            <li><strong className="text-moon">Anthropic</strong>——依你的牌與問題產生 AI 解讀。</li>
            <li><strong className="text-moon">Resend</strong>——寄送交易性電子郵件（確認信、密碼重設）。</li>
            <li><strong className="text-moon">Google</strong>——分析（Google Analytics）與廣告（AdSense）。</li>
            <li><strong className="text-moon">Meta</strong>——廣告成效與轉化衡量（像素與轉化 API）。</li>
          </ul>
          <p className="mt-2">
            其中部分供應商位於你所在國家之外（例如美國），因此你的資料可能在當地被處理。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">我們不做的事</h2>
          <p className="mt-2">
            我們不會為了金錢出售你的個人資料。我們不寄行銷垃圾信——我們唯一寄出的是交易性郵件：帳號驗證、付款確認，以及方案到期提醒。請注意，上述廣告 cookie 在某些隱私法規下可能被視為為了目標式廣告而「分享」資料；你可使用上方的控制項選擇退出。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">你的選擇</h2>
          <p className="mt-2">
            你可隨時來信 hello@wyndralore.com，要求取得你資料的副本，或要求我們刪除你的帳號與相關資料。你也可以使用「Cookie 與追蹤」所述的瀏覽器與供應商控制項，來管理廣告與分析 cookie。
          </p>
        </div>

        <p>對你的隱私有疑問嗎？請來信 hello@wyndralore.com。</p>
      </div>
    </section>
  );
}
