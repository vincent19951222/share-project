"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchGamificationState } from "@/lib/api";
import type {
  GamificationDimensionSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";

function getSupplyErrorMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.status === 401) {
    return "登录状态过期，请重新登录。";
  }

  return caught instanceof Error ? caught.message : "牛马补给站加载失败，稍后再试。";
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`rounded-[1.25rem] border-[3px] border-slate-900 px-4 py-3 shadow-[0_4px_0_0_#1f2937] ${tone}`}>
      <div className="text-xs font-black text-slate-700">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function DimensionCard({ dimension }: { dimension: GamificationDimensionSnapshot }) {
  const assignment = dimension.assignment;

  return (
    <article className="supply-dimension-card rounded-[1.35rem] border-[4px] border-slate-900 bg-white p-4 shadow-[0_5px_0_0_#1f2937]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">{dimension.title}</h3>
          <p className="mt-1 text-sm font-black text-amber-700">{dimension.subtitle}</p>
        </div>
        <span className="rounded-full border-2 border-slate-900 bg-yellow-200 px-3 py-1 text-xs font-black text-slate-900">
          {assignment?.status === "completed" ? "已完成" : "待开工"}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
        {assignment ? assignment.description : dimension.description}
      </p>
      <div className="mt-4 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
        {assignment ? assignment.title : "今日任务抽取将在 GM-04 开放。"}
      </div>
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-full border-[3px] border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400"
      >
        任务打卡 GM-04 开放
      </button>
    </article>
  );
}

function PlaceholderButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      disabled
      className="cursor-not-allowed rounded-full border-[3px] border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400"
    >
      {children}
    </button>
  );
}

export function SupplyStation() {
  const [snapshot, setSnapshot] = useState<GamificationStateSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadState() {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await fetchGamificationState());
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  if (!snapshot) {
    return (
      <section className="supply-station-viewport absolute inset-0 overflow-y-auto p-4 sm:p-6">
        <div className="grid min-h-full place-items-center rounded-[1.5rem] border-[6px] border-amber-200 bg-amber-50 p-6 text-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-black text-slate-950">牛马补给站</h2>
            <p className="mt-3 text-sm font-black text-amber-800">
              {error ?? "正在搬运补给箱..."}
            </p>
            {error ? (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {error.includes("登录状态过期") ? (
                  <a
                    href="/login"
                    className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-5 py-3 text-sm font-black shadow-[0_4px_0_0_#1f2937]"
                  >
                    重新登录
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void loadState()}
                  className="rounded-full border-[3px] border-slate-900 bg-white px-5 py-3 text-sm font-black shadow-[0_4px_0_0_#1f2937]"
                >
                  刷新重试
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="supply-station-viewport absolute inset-0 overflow-y-auto p-4 sm:p-6">
      <div className="supply-station-shell mx-auto flex min-h-full max-w-7xl flex-col gap-4">
        <header className="rounded-[1.75rem] border-[5px] border-slate-900 bg-yellow-200 p-5 shadow-[0_7px_0_0_#1f2937]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-800">Supply Station</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">牛马补给站</h1>
              <p className="mt-2 max-w-2xl text-sm font-black text-slate-700">
                今日补给单已生成，先把身体照顾好，再来薅一点运气。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="抽奖券" value={snapshot.ticketBalance} tone="bg-white" />
              <StatCard label="今日进账" value={`+${snapshot.ticketSummary.todayEarned}`} tone="bg-lime-100" />
              <StatCard label="背包库存" value={snapshot.backpack.totalQuantity} tone="bg-sky-100" />
              <StatCard label="待响应" value={snapshot.social.pendingReceivedCount} tone="bg-orange-100" />
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-[1rem] border-[3px] border-rose-300 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
            {error}
          </div>
        ) : null}

        <main className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">今日四维</h2>
                <p className="text-sm font-bold text-slate-500">
                  四项都完成后，GM-04 会解锁四维任务券。
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                {snapshot.dayKey}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.dimensions.map((dimension) => (
                <DimensionCard key={dimension.key} dimension={dimension} />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">今日券路</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1rem] border-2 border-slate-200 bg-lime-50 p-3 text-sm font-black text-slate-700">
                  健身打卡券：{snapshot.ticketSummary.fitnessTicketEarned ? "已到账" : "GM-05 开放"}
                </div>
                <div className="rounded-[1rem] border-2 border-slate-200 bg-yellow-50 p-3 text-sm font-black text-slate-700">
                  四维任务券：{snapshot.ticketSummary.lifeTicketEarned ? "已到账" : "GM-04 开放"}
                </div>
                <div className="rounded-[1rem] border-2 border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-700">
                  今日最多免费 {snapshot.ticketSummary.maxFreeTicketsToday} 张，已花 {snapshot.ticketSummary.todaySpent} 张。
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">抽奖机</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{snapshot.lottery.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PlaceholderButton>单抽 GM-06</PlaceholderButton>
                <PlaceholderButton>十连 GM-06</PlaceholderButton>
              </div>
              <div className="mt-4 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
                {snapshot.lottery.recentDraws.length > 0
                  ? `最近 ${snapshot.lottery.recentDraws.length} 次抽奖记录已归档。`
                  : "暂时没有抽奖记录。"}
              </div>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">背包</h2>
              {snapshot.backpack.previewItems.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {snapshot.backpack.previewItems.map((item) => (
                    <div key={item.itemId} className="flex items-center justify-between rounded-[1rem] border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black">
                      <span>{item.name}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
                  {snapshot.backpack.emptyMessage}
                </p>
              )}
              <div className="mt-4">
                <PlaceholderButton>背包详情 GM-07</PlaceholderButton>
              </div>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">弱社交雷达</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{snapshot.social.message}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-black">
                <div className="rounded-[1rem] bg-orange-100 p-3">我发出的 {snapshot.social.pendingSentCount}</div>
                <div className="rounded-[1rem] bg-sky-100 p-3">我收到的 {snapshot.social.pendingReceivedCount}</div>
              </div>
              <div className="mt-4">
                <PlaceholderButton>响应 GM-12</PlaceholderButton>
              </div>
            </section>
          </aside>
        </main>
      </div>
      {busy ? <span className="sr-only">牛马补给站刷新中</span> : null}
    </section>
  );
}
