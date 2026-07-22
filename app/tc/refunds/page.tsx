import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "退款與取消政策 — Wyndralore",
  description: "Wyndralore 會員與單次購買的退款與取消如何運作。",
  alternates: { canonical: "/tc/refunds", ...hreflangAlternates("/refunds") },
};

export default function TwRefundsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">退款與取消政策</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">最後更新：2026 年 7 月</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          本政策說明我們所有販售項目的退款與取消如何運作：進階會員，以及單次購買（例如一次 AI 深度解讀）。它與我們的{" "}
          <a href="/tc/terms" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
            服務條款
          </a>
          並行適用。
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">1. 數位內容，即時交付</h2>
          <p className="mt-2">
            進階權限與 AI 解讀屬於數位內容，在你付款完成的那一刻即為你解鎖或生成。由於交付是即時的，且內容是為你的占卜量身而成，所有交易一經完成恕不退款、款項原則上不予退還。完成購買即表示你明確要求立即開始交付，並承認一旦交付已經開始，你即因此喪失任何法定的猶豫期或撤回權——包括（在適用情況下）歐盟／英國消費者法下的 14 天猶豫期。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">2. 若出了問題，請告訴我們</h2>
          <p className="mt-2">
            上述政策並不是把「沒能正常運作」的錢留下的手段。若你被錯誤收費、被重複收費、始終沒收到你所付費的東西，或你的訂單確實出了問題，請附上你的訂單明細，來信{" "}
            <a href="mailto:hello@wyndralore.com" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
              hello@wyndralore.com
            </a>
            ，我們會查明並為你處理妥當。我們力求在 2 個工作天內回覆。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">3. 取消自動續訂的會員</h2>
          <p className="mt-2">
            若你選擇了自動續訂的訂閱，你可隨時於你的{" "}
            <a href="/tc/account" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
              帳號頁面
            </a>
            取消——不必寄信、不必打電話、沒有挽留關卡。取消會立即停止所有未來的扣款。你已付費的當期，仍保有完整的進階權限直到期末，之後就不再續訂。對於一個已經進行中的週期，我們不退還剩餘的部分。
          </p>
          <p className="mt-2">
            若你選擇的是一次付清，則沒有東西需要取消：它絕不續訂，你也不會再被收費。它會在期限屆滿時自然結束。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">4. 由誰處理你的付款</h2>
          <p className="mt-2">
            信用卡付款由我們的支付服務商 Whop 處理，Whop 就這些交易擔任登記商戶。Whop 自身的退款、退單與爭議政策也同時適用於你的購買，且 Whop 可能就帳務事宜與你聯絡。你的信用卡或銀行帳單上會顯示{" "}
            <strong className="text-moon">WHOP*WYNDRALORE</strong>——那就是我們；在你回報一筆不認得的款項之前，請先確認是否為此。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">5. 聯絡</h2>
          <p className="mt-2">
            對一筆款項、一次取消，或本政策有疑問嗎？請來信{" "}
            <a href="mailto:hello@wyndralore.com" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
              hello@wyndralore.com
            </a>
            。
          </p>
        </div>
      </div>
    </section>
  );
}
