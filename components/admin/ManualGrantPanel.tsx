"use client";

import { useState } from "react";

// 手动补单：当支付 webhook 掉单（用户已付款但额度没到账）时，管理员在此输入买家邮箱，直接为其
// 补发 1 次 AI 深度解读额度。每次提交 +1，结果会回显当前剩余额度供核对。
//
// 这不是假想场景：2026-07-15 迁移到 Whop 时，webhook 因签名校验问题连续 401，四笔真实付款全部
// 停在 pending 未开通（见 lib/whop.ts 里关于 Whop 密钥格式的说明）。诊断方法：订单卡在 pending
// 就说明是 webhook 出了问题，而不是别的环节。
export default function ManualGrantPanel() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/grant-ai-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "出错了，请重试。" });
        return;
      }
      setMessage({
        type: "ok",
        text: `已为 ${data.email} 补发 1 次 AI 深度解读额度（当前可用 ${data.extraReadsAvailable} 次）。`,
      });
      setEmail("");
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试。" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-moon">手动补单</h2>
      <p className="mt-1 text-sm text-moon-dim">
        用于支付 webhook 掉单时的人工兜底：输入买家邮箱，为其补发 1 次 AI 深度解读额度。
      </p>

      <div className="mt-6 rounded-2xl border border-gold-dim bg-ink-raised/60 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">用户邮箱</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@example.com"
              className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
          >
            {submitting ? "处理中…" : "手动激活购买"}
          </button>
        </form>
        {message && (
          <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-400" : "text-gold"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
