"use client";

import { useState } from "react";
import type {
  GamificationOpsDashboardSnapshot,
  GamificationOpsMetricCard,
  GamificationOpsRiskCard,
} from "@/lib/types";

interface GamificationOpsDashboardProps {
  initialSnapshot: GamificationOpsDashboardSnapshot;
}

function riskLabel(risk: GamificationOpsRiskCard) {
  if (risk.severity === "risk") return "需要处理";
  if (risk.severity === "watch") return "持续观察";
  return "正常";
}

function riskClass(risk: GamificationOpsRiskCard) {
  if (risk.severity === "risk") {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  if (risk.severity === "watch") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

function metricClass(card: GamificationOpsMetricCard) {
  switch (card.tone) {
    case "success":
      return "bg-emerald-50";
    case "warning":
      return "bg-amber-50";
    case "danger":
      return "bg-rose-50";
    case "highlight":
      return "bg-yellow-100";
    default:
      return "bg-white";
  }
}

async function readOpsDashboardResponse(response: Response) {
  let payload: { snapshot?: GamificationOpsDashboardSnapshot; error?: string };

  try {
    payload = (await response.json()) as {
      snapshot?: GamificationOpsDashboardSnapshot;
      error?: string;
    };
  } catch {
    throw new Error("运营观察响应解析失败");
  }

  if (!response.ok || !payload.snapshot) {
    throw new Error(payload.error ?? "运营观察刷新失败");
  }

  return payload.snapshot;
}

export function GamificationOpsDashboard({ initialSnapshot }: GamificationOpsDashboardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/gamification/ops-dashboard", {
        cache: "no-store",
        credentials: "same-origin",
      });
      setSnapshot(await readOpsDashboardResponse(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "运营观察刷新失败");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">GM-17</p>
          <h1 className="text-2xl font-black text-slate-900">运营观察</h1>
          <p className="mt-1 text-sm font-bold text-sub">
            {snapshot.window.startDayKey} - {snapshot.window.endDayKey}，只读观察，不改规则、不改资产。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="rounded-full border-2 border-slate-800 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? "刷新中..." : "刷新观察"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.metricCards.map((card) => (
          <article
            key={card.key}
            className={`rounded-2xl border-[3px] border-slate-900 p-4 shadow-[0_4px_0_0_#1f2937] ${metricClass(card)}`}
          >
            <p className="text-xs font-black text-slate-600">{card.label}</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm font-bold text-slate-600">{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {snapshot.risks.map((risk) => (
          <article key={risk.key} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">{risk.title}</h2>
                <p className="mt-1 text-sm font-bold leading-relaxed text-sub">{risk.summary}</p>
              </div>
              <span className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-black ${riskClass(risk)}`}>
                {riskLabel(risk)}
              </span>
            </div>
            {risk.detailItems.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {risk.detailItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
          <h2 className="text-lg font-black text-slate-900">待处理兑换</h2>
          {snapshot.pendingRedemptions.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {snapshot.pendingRedemptions.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <span className="font-black text-slate-950">
                    {item.username} 申请 {item.itemName}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">等待 {item.ageDays} 天</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-sub">
              暂无待处理兑换。
            </p>
          )}
        </section>

        <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
          <h2 className="text-lg font-black text-slate-900">高频点名关系</h2>
          {snapshot.repeatedDirectInvitations.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {snapshot.repeatedDirectInvitations.map((item) => (
                <li
                  key={`${item.senderUserId}:${item.recipientUserId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <span>
                    {item.senderUsername} -&gt; {item.recipientUsername}
                  </span>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-800">
                    {item.count} 次
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-sub">
              暂无高频单点邀请。
            </p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-black text-slate-900">抽奖券余额排行</h2>
          <div className="mt-3 grid gap-2">
            {snapshot.topTicketBalances.map((item) => (
              <div key={item.userId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                <span className="font-black text-slate-900">{item.username}</span>
                <span className="font-bold text-slate-600">
                  {item.value} 张 · {item.helper}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-black text-slate-900">银子余额排行</h2>
          <div className="mt-3 grid gap-2">
            {snapshot.topCoinBalances.map((item) => (
              <div key={item.userId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                <span className="font-black text-slate-900">{item.username}</span>
                <span className="font-bold text-slate-600">
                  {item.value} 银子 · {item.helper}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
