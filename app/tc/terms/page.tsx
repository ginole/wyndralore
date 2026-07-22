import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "服務條款 — Wyndralore",
  description: "規範你使用 Wyndralore 的條款。",
  alternates: { canonical: "/tc/terms", ...hreflangAlternates("/terms") },
};

export default function TwTermsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">服務條款</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">最後更新：2026 年 7 月</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>
          歡迎使用 Wyndralore。使用本網站，即表示你同意這些條款。請仔細閱讀。如果你不同意，請勿使用本服務。
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">1. 僅供娛樂與自我省思</h2>
          <p className="mt-2">
            Wyndralore 提供塔羅占卜與牌義，僅供娛樂與個人省思之用。我們的內容不能取代任何專業建議——醫療、法律、財務、心理或其他方面。切勿因為在此讀到的內容而忽視專業指引。你對自己所做的決定負責。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">2. 帳號</h2>
          <p className="mt-2">
            你有責任妥善保管你的帳號憑證，並對你帳號下的一切活動負責。你必須提供一個有效的電子郵件地址。你必須年滿 18 歲才能建立帳號。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">3. 進階方案、加購與付款</h2>
          <p className="mt-2">
            進階會員有兩種取得方式：自動續訂的訂閱，或一次付清、絕不續訂的買斷。單次加購（例如一次 AI 深度解讀）一律為一次付清。若你選擇訂閱，我們會在每個計費週期開始時自動向你收費，直到你取消為止。你可隨時於帳號頁面取消——取消會停止所有未來的扣款，而你已付費的當期權限會保留到期末。買斷方案則在期限屆滿時自然結束，你的帳號回到免費層級；我們會在到期前以電子郵件通知你。
          </p>
          <p className="mt-2">
            信用卡付款由我們的支付服務商 Whop 處理，Whop 就這些交易擔任登記商戶（Merchant of Record）。我們也接受透過 Wise 的手動銀行轉帳：以此方式付款時，請完全依照顯示的訂單編號填寫。溢付款項將被接受，差額不予退還；低於方案金額的付款，在餘額補足前不會啟用進階會員。若付款無法自動對應到你的訂單，我們會以人工方式對帳——這可能需要較久的時間。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">4. 退款與即時交付</h2>
          <p className="mt-2">
            進階權限與 AI 解讀屬於數位內容，會立即為你解鎖或交付。正因如此，所有交易一經完成恕不退款、款項不予退還。完成購買即表示你明確要求立即開始交付與存取，並承認一旦交付已經開始，你即因此喪失任何法定的猶豫期或撤回權——包括（在適用情況下）歐盟／英國消費者法下的 14 天猶豫期。
          </p>
          <p className="mt-2">
            當信用卡付款由 Whop 以登記商戶身分處理時，Whop 自身的退款與爭議政策也同時適用。若你的訂單確實出了問題，請來信 hello@wyndralore.com，我們會為你處理妥當。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">5. 你的內容</h2>
          <p className="mt-2">
            你存進占卜筆記的筆記屬於你。我們保存它們，讓你日後能回顧；即使你的進階方案失效，我們也會保留，好讓你回來時它們仍在等你。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">6. 變更</h2>
          <p className="mt-2">
            我們可能不時更新這些條款。變更後你若繼續使用 Wyndralore，即表示你接受更新後的條款。
          </p>
        </div>

        <p>有疑問嗎？請透過 hello@wyndralore.com 與我們聯絡。</p>
      </div>
    </section>
  );
}
