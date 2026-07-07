"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OverviewPanel from "./admin/OverviewPanel";
import UsersPanel from "./admin/UsersPanel";
import CreatorsPanel from "./admin/CreatorsPanel";
import OrdersPanel from "./admin/OrdersPanel";
import UnmatchedPanel from "./admin/UnmatchedPanel";
import ManualGrantPanel from "./admin/ManualGrantPanel";
import FunnelPanel from "./admin/FunnelPanel";

type ViewKey = "overview" | "users" | "creators" | "orders" | "unmatched" | "manual" | "funnel";

interface NavItem {
  key: ViewKey;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  { title: "", items: [{ key: "overview", label: "数据总览" }] },
  {
    title: "用户管理",
    items: [
      { key: "users", label: "全部用户" },
      { key: "creators", label: "达人邀请" },
    ],
  },
  {
    title: "订单管理",
    items: [
      { key: "orders", label: "全部订单" },
      { key: "unmatched", label: "未匹配收款" },
      { key: "manual", label: "手动补单" },
    ],
  },
  {
    title: "数据分析",
    items: [{ key: "funnel", label: "转化漏斗" }],
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<ViewKey>("overview");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:gap-10 md:px-6">
      {/* Sidebar */}
      <aside className="shrink-0 md:w-52">
        <div className="mb-6 flex items-center justify-between md:mb-8">
          <h1 className="font-display text-2xl text-moon">Admin</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-[10px] uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon md:hidden"
          >
            Sign Out
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:gap-0 md:overflow-visible md:pb-0">
          {NAV.map((section, i) => (
            <div key={i} className="md:mb-5">
              {section.title && (
                <p className="mb-1 hidden px-3 text-[10px] uppercase tracking-[0.22em] text-gold-dim md:block">
                  {section.title}
                </p>
              )}
              <div className="flex gap-2 md:flex-col md:gap-0.5">
                {section.items.map((item) => {
                  const active = view === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setView(item.key)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-gold/15 text-gold-bright"
                          : "text-moon-dim hover:bg-ink-raised/60 hover:text-moon"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 hidden text-[10px] uppercase tracking-[0.2em] text-moon-dim underline underline-offset-4 hover:text-moon md:block"
        >
          Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 border-t border-ink-line/60 pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0">
        {view === "overview" && <OverviewPanel />}
        {view === "users" && <UsersPanel />}
        {view === "creators" && <CreatorsPanel />}
        {view === "orders" && <OrdersPanel />}
        {view === "unmatched" && <UnmatchedPanel />}
        {view === "manual" && <ManualGrantPanel />}
        {view === "funnel" && <FunnelPanel />}
      </main>
    </section>
  );
}
