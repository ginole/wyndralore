"use client";

import { useCallback, useEffect, useState } from "react";

interface Partner {
  id: string;
  email: string;
  affiliateCode: string | null;
  status: string;
  strikes: number;
  payoutMethod: string | null;
  payoutHandle: string | null;
  heldUsd: number;
  availableUsd: number;
  requestedUsd: number;
  netAvailableUsd: number;
  clawbackUsd: number;
  paidUsd: number;
  referredUsers: number;
  payingUsers: number;
}

export default function AffiliatePanel() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [blEmail, setBlEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/affiliate/partners");
      const data = await res.json().catch(() => ({}));
      setPartners(data.partners ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/affiliate/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data.error ?? "Action failed.");
      else if (body.action === "pay") setMsg(`Marked $${(data.amount ?? 0).toFixed(2)} paid.`);
      else if (body.action === "blacklist") setMsg("Customer blacklisted.");
      else if (body.action === "unblacklist") setMsg("Customer un-blacklisted.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-moon">达人佣金 · 打款与风控</h2>
      <div className="mt-2 rounded-xl border border-gold-dim/50 bg-ink/40 p-3 text-xs text-moon-dim">
        <strong className="text-gold-bright">已停用 —— 佣金现在由 Whop 处理。</strong>
        <br />
        达人分享 <span className="text-moon">wyndralore.com/?a=她的Whop用户名</span>，Whop 自动归因、按每一笔付款付她
        30%（只要人还在订阅就一直付），并直接打款给她。**你不需要手动打任何一笔款。**
        <br />
        下面这套是我们自建的引擎，只是休眠、没有删除（`CREATOR_AFFILIATE_ENABLED`）。切换时存量达人为 0，所以没有历史数据要迁移；
        面板会一直是空的。若 Whop 那条路走不通（比如达人不愿注册 Whop 账号），把 flag 翻回 true 即可恢复。
      </div>
      <p className="mt-3 text-sm text-moon-dim/60">
        <span className="line-through">
          Partners earn 50% of a referred customer&apos;s first purchase, then 20% for 6 months. Commissions hold 30
          days, then become withdrawable ($30 min). Pay them manually via PayPal/Wise, then click Mark Paid.
        </span>
      </p>

      {/* Blacklist a serial-refunding customer */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-ink-line bg-ink-raised/50 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold-dim">Blacklist customer (email)</span>
          <input
            type="email"
            value={blEmail}
            onChange={(e) => setBlEmail(e.target.value)}
            placeholder="refunder@example.com"
            className="rounded-xl border border-ink-line bg-ink/60 p-2.5 text-sm text-moon focus:border-gold-dim focus:outline-none"
          />
        </label>
        <button
          type="button"
          disabled={!blEmail || busy === "bl"}
          onClick={() => act("bl", { action: "blacklist", email: blEmail })}
          className="rounded-full border border-red-500/40 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          Blacklist
        </button>
        <button
          type="button"
          disabled={!blEmail || busy === "ubl"}
          onClick={() => act("ubl", { action: "unblacklist", email: blEmail })}
          className="rounded-full border border-ink-line px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-moon-dim hover:text-moon disabled:opacity-50"
        >
          Un-blacklist
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-gold">{msg}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-moon-dim">Loading…</p>
      ) : partners.length === 0 ? (
        <p className="mt-6 text-sm text-moon-dim">No partners yet — invite creators from 达人邀请.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-moon-dim">
              <tr>
                <th className="py-2">Partner</th>
                <th>Referred / paying</th>
                <th>Held</th>
                <th>Ready</th>
                <th>Paid</th>
                <th>Strikes</th>
                <th>Payout to</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-ink-line/60 align-top">
                  <td className="py-2 text-moon">
                    {p.email}
                    {p.status === "paused" && <span className="ml-2 text-[10px] uppercase text-red-300">paused</span>}
                    <div className="text-[10px] text-moon-dim">{p.affiliateCode}</div>
                  </td>
                  <td className="text-moon-dim">
                    {p.referredUsers} / {p.payingUsers}
                  </td>
                  <td className="text-moon-dim">${p.heldUsd.toFixed(2)}</td>
                  <td className="text-gold-bright">
                    ${(p.netAvailableUsd + p.requestedUsd).toFixed(2)}
                    {p.requestedUsd > 0 && <div className="text-[10px] text-gold-dim">${p.requestedUsd.toFixed(2)} requested</div>}
                    {p.clawbackUsd > 0 && <div className="text-[10px] text-red-300">-${p.clawbackUsd.toFixed(2)} owed</div>}
                  </td>
                  <td className="text-moon-dim">${p.paidUsd.toFixed(2)}</td>
                  <td className="text-moon-dim">{p.strikes}</td>
                  <td className="text-moon-dim">
                    {p.payoutMethod ? `${p.payoutMethod}: ${p.payoutHandle}` : "—"}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      type="button"
                      disabled={p.netAvailableUsd + p.requestedUsd <= 0 || busy === `pay-${p.id}`}
                      onClick={() => act(`pay-${p.id}`, { action: "pay", creatorId: p.id })}
                      className="rounded-full bg-gold px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-ink disabled:opacity-40"
                    >
                      Mark Paid
                    </button>
                    <button
                      type="button"
                      disabled={busy === `st-${p.id}`}
                      onClick={() => act(`st-${p.id}`, { action: p.status === "paused" ? "reactivate" : "pause", creatorId: p.id })}
                      className="ml-2 rounded-full border border-ink-line px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-moon-dim hover:text-moon disabled:opacity-40"
                    >
                      {p.status === "paused" ? "Reactivate" : "Pause"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
