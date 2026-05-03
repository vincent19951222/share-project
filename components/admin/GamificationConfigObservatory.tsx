"use client";

import { useState } from "react";
import type {
  GamificationConfigCheckStatus,
  GamificationConfigObservatorySnapshot,
  GamificationRewardPoolAvailability,
} from "@/lib/types";

interface GamificationConfigObservatoryProps {
  initialSnapshot: GamificationConfigObservatorySnapshot;
}

function statusLabel(status: GamificationConfigCheckStatus) {
  if (status === "pass") return "通过";
  if (status === "fail") return "需要处理";
  return "说明";
}

function statusClass(status: GamificationConfigCheckStatus) {
  if (status === "pass") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "fail") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

function availabilityClass(availability: GamificationRewardPoolAvailability) {
  if (availability === "active_reward_pool") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  if (availability === "eligible_but_not_in_pool") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (availability === "unsupported_effect") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-rose-300 bg-rose-50 text-rose-800";
}

async function readConfigObservatoryResponse(response: Response) {
  let payload: { snapshot?: GamificationConfigObservatorySnapshot; error?: string };

  try {
    payload = (await response.json()) as {
      snapshot?: GamificationConfigObservatorySnapshot;
      error?: string;
    };
  } catch {
    throw new Error("配置总览响应解析失败");
  }

  if (!response.ok || !payload.snapshot) {
    throw new Error(payload.error ?? "配置总览刷新失败");
  }

  return payload.snapshot;
}

export function GamificationConfigObservatory({
  initialSnapshot,
}: GamificationConfigObservatoryProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/gamification/config-observatory", {
        cache: "no-store",
        credentials: "same-origin",
      });
      setSnapshot(await readConfigObservatoryResponse(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "配置总览刷新失败");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">GM-18</p>
          <h1 className="text-2xl font-black text-slate-900">配置总览</h1>
          <p className="mt-1 text-sm font-bold text-sub">
            只读查看当前四维任务、抽奖奖池、道具定义和内容校验。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="rounded-full border-2 border-slate-800 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? "刷新中..." : "刷新配置"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-slate-900">配置校验</h2>
          <span
            className={`w-fit rounded-full border-2 px-3 py-1 text-xs font-black ${statusClass(snapshot.validation.ok ? "pass" : "fail")}`}
          >
            {snapshot.validation.ok ? "通过" : "需要处理"}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold text-sub">{snapshot.validation.summary}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {snapshot.validation.checks.map((check) => (
            <article key={check.key} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-900">{check.label}</h3>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${statusClass(check.status)}`}
                >
                  {statusLabel(check.status)}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-600">{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">四维任务卡池</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {snapshot.dimensionPools.map((pool) => (
            <article
              key={pool.key}
              className="rounded-2xl border-[3px] border-slate-900 bg-yellow-50 p-4 shadow-[0_4px_0_0_#1f2937]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">{pool.title}</h3>
                  <p className="text-xs font-bold text-slate-600">
                    {pool.key} · {pool.subtitle}
                  </p>
                </div>
                <span className="rounded-full border-2 border-slate-800 bg-white px-2 py-1 text-xs font-black">
                  {pool.enabledCardCount} 启用
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-700">
                权重 {pool.totalEnabledWeight} · 禁用 {pool.disabledCardCount}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pool.topTags.map((tag) => (
                  <span
                    key={tag.key}
                    className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                  >
                    #{tag.label} {tag.count}
                  </span>
                ))}
              </div>
              <ul className="mt-3 grid gap-2">
                {pool.sampleCards.map((card) => (
                  <li key={card.id} className="rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-sm">
                    <span className="font-black text-slate-900">{card.title}</span>
                    <span className="ml-2 font-bold text-slate-500">
                      {card.scene} · {card.effort} · 权重 {card.weight}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">抽奖奖池</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-slate-900 bg-yellow-100 p-3">
            <p className="text-xs font-black text-slate-600">Active 总权重</p>
            <p className="text-2xl font-black text-slate-950">{snapshot.rewardPool.activeTotalWeight}</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-600">直接银子期望</p>
            <p className="text-2xl font-black text-slate-950">
              {snapshot.rewardPool.directCoinExpectedValue.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-600">禁用奖励</p>
            <p className="text-2xl font-black text-slate-950">{snapshot.rewardPool.disabledRewards.length}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {snapshot.rewardPool.tierWeights.map((tier) => (
            <span
              key={tier.tier}
              className={`rounded-full border-2 px-3 py-1 text-xs font-black ${statusClass(tier.status)}`}
            >
              {tier.tier} {tier.weight}/{tier.expectedWeight}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div>
            <h3 className="font-black text-slate-900">Active rewards</h3>
            <ul className="mt-2 grid gap-2">
              {snapshot.rewardPool.activeRewards.map((reward) => (
                <li key={reward.id} className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-900">{reward.name}</span>
                    <span className="font-black text-slate-700">{reward.probabilityLabel}</span>
                  </div>
                  <p className="mt-1 font-bold text-sub">
                    {reward.tier} · {reward.kind} · {reward.effectSummary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-black text-slate-900">Disabled rewards</h3>
            <ul className="mt-2 grid gap-2">
              {snapshot.rewardPool.disabledRewards.map((reward) => (
                <li
                  key={reward.id}
                  className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-black text-slate-900">{reward.name}</span>
                  <p className="mt-1 font-bold text-sub">{reward.effectSummary}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">道具配置</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {snapshot.itemCatalog.categories.map((category) => (
            <article key={category.category} className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">{category.category}</h3>
              <p className="mt-1 text-xs font-bold text-sub">
                启用 {category.enabledCount} · 禁用 {category.disabledCount}
              </p>
              <ul className="mt-3 grid gap-2">
                {category.items.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900">{item.name}</span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${availabilityClass(item.rewardPoolAvailability)}`}
                      >
                        {item.rewardPoolAvailabilityLabel}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-slate-600">{item.effectSummary}</p>
                    <p className="mt-1 text-xs font-bold text-sub">
                      {item.useTiming} · {item.stackable ? "可堆叠" : "不可堆叠"} · {item.limitSummary}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
