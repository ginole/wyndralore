"use client";

import { useState } from "react";

export default function CreatorInviteForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [viaLink, setViaLink] = useState<string | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);
  // Off by default — a creator who replied gets a hand-written answer in her own language, and
  // the canned email is English-only. Tick this only for the generic invite.
  const [sendInvite, setSendInvite] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setViaLink(null);
    setActionLink(null);
    try {
      const res = await fetch("/api/admin/creator-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sendInvite }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Something went wrong." });
        return;
      }
      setMessage({
        type: "ok",
        text: !data.sendInvite
          ? `已开通 ${email}（未发信）— 手写回信时把下面的链接贴进去。`
          : data.emailSent
            ? `Upgraded and invited ${email}.`
            : `Upgraded ${email}, but the invite email failed to send — check logs.`,
      });
      if (data.viaLink) setViaLink(data.viaLink);
      if (data.actionLink) setActionLink(data.actionLink);
      setEmail("");
      onSuccess?.();
    } catch {
      setMessage({ type: "error", text: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gold-dim bg-ink-raised/60 p-6">
      <h3 className="font-display text-lg text-gold-bright">Creator Outreach</h3>
      <p className="mt-1 text-xs text-moon-dim">
        开通一个月免费 Premium，并把账号标记为达人（永久）。佣金是 Whop 的事：她注册一个免费 Whop 账号，然后分享{" "}
        <span className="text-moon">wyndralore.com/?a=她的whop用户名</span>（华语达人用{" "}
        <span className="text-moon">wyndralore.com/tc?a=…</span>），Whop 自动按每一笔付款给她 30%，只要人还在续费就一直算。
        我们不收集用户名、也不手动结算。
      </p>
      <p className="mt-2 text-xs text-moon-dim/70">
        务必告诉她<span className="text-moon-dim">不要</span>分享 whop.com 的链接：那会把她的观众直接丢到一张付款卡片上，
        还没抽过一张牌就先被要钱，流量跳走、她一分也赚不到——达人就是这样判定我们不值得推的。
      </p>
      <p className="mt-2 text-xs text-moon-dim/70">
        ⚠️ 默认<span className="text-moon-dim">不发信</span>。罐头邀请信是纯英文、而且举的例子是英文站链接，对一个刚用繁体
        回信给你的华语达人来说，发它比不发更糟。已经回信的达人一律手写、按人特调；勾选发信只用于你不想手写的那种。
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Creator email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="creator@example.com"
            className="rounded-xl border border-ink-line bg-ink-raised/60 p-3 text-sm text-moon focus:border-gold-dim focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gold px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-transform duration-200 hover:scale-[1.02] hover:bg-gold-bright disabled:opacity-60"
        >
          {submitting ? "处理中…" : sendInvite ? "开通并发信" : "只开通"}
        </button>
      </form>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-moon-dim">
        <input
          type="checkbox"
          checked={sendInvite}
          onChange={(e) => setSendInvite(e.target.checked)}
          className="mt-0.5 accent-gold"
        />
        <span>发那封罐头邀请信（英文）— 手写回信时别勾</span>
      </label>
      {message && (
        <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-400" : "text-gold"}`}>{message.text}</p>
      )}
      {actionLink && (
        <div className="mt-3">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">她的登录 / 认领链接</span>
          <input
            readOnly
            value={actionLink}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full truncate rounded-xl border border-ink-line bg-ink/60 p-3 text-xs text-moon focus:border-gold-dim focus:outline-none"
          />
          <p className="mt-1 text-xs text-moon-dim/70">
            指向 /reset-password 的是认领链接（我们刚给她建了账号，7 天内有效，她用它设密码）；指向 /account
            的是她本来就有账号，直接登录即可。
          </p>
        </div>
      )}
      {viaLink && (
        <div className="mt-3">
          <span className="text-xs uppercase tracking-[0.2em] text-gold-dim">Their referral link</span>
          <input
            readOnly
            value={viaLink}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full truncate rounded-xl border border-ink-line bg-ink/60 p-3 text-xs text-moon focus:border-gold-dim focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
