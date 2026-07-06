"use client";

import { useCallback, useEffect, useState } from "react";
import CreatorInviteForm from "../CreatorInviteForm";
import { PanelHeader, fmtDateTime, EmptyRow, Pill } from "./shared";

interface CreatorInvite {
  id: string;
  email: string;
  affiliateLink: string;
  wasNewAccount: boolean;
  planGranted: string;
  emailSent: boolean;
  claimed: boolean;
  currentPlan: string;
  planExpiresAt: string | null;
  createdAt: string;
}

export default function CreatorsPanel() {
  const [invites, setInvites] = useState<CreatorInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/creator-invites", { cache: "no-store" });
    if (res.ok) setInvites((await res.json()).invites);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div>
      <PanelHeader title="达人邀请" subtitle="Grant a creator free Premium and email them your affiliate invite in one click." />

      <CreatorInviteForm onSuccess={load} />

      <h3 className="font-display mt-10 mb-3 text-lg text-moon">Invite history</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-moon-dim">
            <tr>
              <th className="py-2">Sent</th>
              <th>Email</th>
              <th>Account</th>
              <th>Plan</th>
              <th>Email</th>
              <th>Claimed</th>
              <th>Affiliate link</th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={7} label="Loading…" />}
            {!loading && invites.length === 0 && <EmptyRow colSpan={7} label="No invites sent yet." />}
            {!loading &&
              invites.map((inv) => (
                <tr key={inv.id} className="border-t border-ink-line/60">
                  <td className="py-2 text-moon-dim">{fmtDateTime(inv.createdAt)}</td>
                  <td className="text-moon">{inv.email}</td>
                  <td>{inv.wasNewAccount ? <Pill tone="warn">new</Pill> : <Pill>existing</Pill>}</td>
                  <td className="text-moon-dim">{inv.planGranted}</td>
                  <td>{inv.emailSent ? <Pill tone="good">sent</Pill> : <Pill tone="bad">failed</Pill>}</td>
                  <td>
                    {!inv.wasNewAccount ? (
                      <span className="text-moon-dim">—</span>
                    ) : inv.claimed ? (
                      <Pill tone="good">claimed</Pill>
                    ) : (
                      <Pill tone="warn">pending</Pill>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate text-moon-dim" title={inv.affiliateLink}>
                    <a href={inv.affiliateLink} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                      {inv.affiliateLink}
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
