import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "聯絡我們 — Wyndralore",
  description: "如何聯絡 Wyndralore：一個客服信箱、寫信時附上哪些資訊能一次講清楚，以及我們多久回覆。",
  alternates: { canonical: "/tc/contact", ...hreflangAlternates("/contact") },
};

export default function TwContactPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-moon">聯絡我們</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-moon-dim">每一封信我們都會看</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-moon-dim">
        <p>所有事情都寄同一個信箱——帳務、帳號、解讀出了問題，或任何跟這個網站有關的事：</p>

        <p className="text-lg text-moon">
          <a
            href="mailto:hello@wyndralore.com"
            className="underline decoration-gold-dim underline-offset-4 hover:text-gold"
          >
            hello@wyndralore.com
          </a>
        </p>

        <div>
          <h2 className="font-display text-xl text-moon">我們多久回覆</h2>
          <p className="mt-2">
            我們力求在 2 個工作天內回覆。與扣款有關的一律優先處理——不認得的款項、重複扣款、以為已經取消卻仍被收費，這幾類會先看。
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">寫信時可以附上</h2>
          <p className="mt-2">第一封信就帶上這些，通常一來一往就能解決。都不是必填。</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>你 Wyndralore 帳號使用的電子信箱。</li>
            <li>跟錢有關的事：訂單編號，或扣款的日期與金額。</li>
            <li>某個功能壞了：你當時在做什麼、實際看到什麼。一張截圖勝過一段描述。</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">這幾件事你不用寫信也能處理</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>
              <strong className="text-moon">取消訂閱</strong>——在{" "}
              <a href="/tc/account" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
                帳號頁面
              </a>
              自己就能取消，不用寫信、沒有挽留關卡。
            </li>
            <li>
              <strong className="text-moon">退款與取消規則</strong>——完整寫在{" "}
              <a href="/tc/refunds" className="underline decoration-gold-dim underline-offset-2 hover:text-moon">
                退款說明
              </a>
              裡。
            </li>
            <li>
              <strong className="text-moon">看到不認得的扣款</strong>——信用卡帳單上會顯示{" "}
              <span className="text-moon">WHOP*WYNDRALORE</span>，那就是我們。
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-moon">創作者與合作</h2>
          <p className="mt-2">
            同一個信箱。告訴我們你的觀眾在哪、你做的是什麼內容，我們會直接回你實際的數字，而不是一份簡報。
          </p>
        </div>

        <p className="text-xs text-moon-dim/80">
          Wyndralore 是一個獨立、自籌資金的網站。信用卡付款由 Whop 以登記商戶（Merchant of Record）身分處理。
        </p>
      </div>
    </section>
  );
}
