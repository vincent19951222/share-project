"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  cancelRealWorldRedemption,
  claimGamificationLifeTicket,
  completeGamificationTask,
  confirmRealWorldRedemption,
  drawGamificationLottery,
  ensureTodayGamificationTasks,
  fetchGamificationState,
  rerollGamificationTask,
  requestRealWorldRedemption,
  useGamificationItem,
} from "@/lib/api";
import type {
  GamificationBackpackItemSnapshot,
  GamificationDimensionSnapshot,
  GamificationLotteryDrawSnapshot,
  GamificationRedemptionSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";

function getSupplyErrorMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.status === 401) {
    return "登录状态已过期，请重新登录。";
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

function DimensionCard({
  dimension,
  busy,
  onComplete,
  onReroll,
}: {
  dimension: GamificationDimensionSnapshot;
  busy: boolean;
  onComplete: () => void;
  onReroll: () => void;
}) {
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
        {assignment
          ? assignment.status === "completed"
            ? assignment.completionText ?? "已自报完成"
            : assignment.title
          : "正在生成今日任务..."}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy || !assignment?.canComplete}
          onClick={onComplete}
          className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {assignment?.status === "completed" ? "已完成" : "我完成了"}
        </button>
        <button
          type="button"
          disabled={busy || !assignment?.canReroll}
          onClick={onReroll}
          className="rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        >
          换一个
        </button>
      </div>
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

function BackpackItemDetail({
  item,
  activeAction,
  selectedRerollDimension,
  onRerollDimensionChange,
  onUse,
  onRequestRedemption,
}: {
  item: GamificationBackpackItemSnapshot | null;
  activeAction: string | null;
  selectedRerollDimension: string;
  onRerollDimensionChange: (dimensionKey: string) => void;
  onUse: (itemId: string) => void;
  onRequestRedemption: (item: GamificationBackpackItemSnapshot) => void;
}) {
  if (!item) {
    return (
      <div className="rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
        选择一个补给查看说明。
      </div>
    );
  }

  return (
    <div className="rounded-[1rem] border-[3px] border-slate-900 bg-yellow-50 p-4 shadow-[0_4px_0_0_#1f2937]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black text-amber-700">{item.categoryLabel}</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{item.name}</h3>
        </div>
        <span className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-sm font-black text-slate-900">
          x{item.quantity}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">{item.description}</p>
      <div className="mt-3 grid gap-2 text-xs font-black text-slate-700">
        <div className="rounded-lg bg-white px-3 py-2">使用时机：{item.useTimingLabel}</div>
        <div className="rounded-lg bg-white px-3 py-2">效果：{item.effectSummary}</div>
        <div className="rounded-lg bg-white px-3 py-2">限制：{item.usageLimitSummary}</div>
        <div className="rounded-lg bg-white px-3 py-2">
          管理员确认：{item.requiresAdminConfirmation ? "需要" : "不需要"}
        </div>
      </div>
      {!item.knownDefinition ? (
        <div className="mt-3 rounded-lg border-2 border-rose-300 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
          这个补给配置已经不存在，请联系管理员确认。
        </div>
      ) : null}
      {item.knownDefinition && !item.enabled ? (
        <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
          这个补给已下架，当前只展示库存。
        </div>
      ) : null}
      {item.itemId === "task_reroll_coupon" ? (
        <label className="mt-3 block text-xs font-black text-slate-600">
          选择要换班的维度
          <select
            value={selectedRerollDimension}
            onChange={(event) => onRerollDimensionChange(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black text-slate-900"
          >
            <option value="movement">把电充绿</option>
            <option value="hydration">喝白白</option>
            <option value="social">把事办黄</option>
            <option value="learning">把股看红</option>
          </select>
        </label>
      ) : null}
      {item.category === "real_world" && item.useTiming === "manual_redemption" ? (
        <button
          type="button"
          disabled={activeAction !== null || item.availableQuantity <= 0}
          onClick={() => onRequestRedemption(item)}
          className="mt-3 w-full rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {activeAction === `redemption:request:${item.itemId}` ? "申请中..." : "申请兑换"}
        </button>
      ) : (
        <button
          type="button"
          disabled={activeAction !== null || !item.useEnabled}
          onClick={() => onUse(item.itemId)}
          className="mt-3 w-full rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {item.itemId === "fitness_leave_coupon" ? "今天请假，不断联" : "今日使用"}
        </button>
      )}
      {item.useDisabledReason ? (
        <div className="mt-2 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
          {item.useDisabledReason}
        </div>
      ) : null}
      {item.reservedQuantity > 0 ? (
        <div className="mt-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
          今日已预占 {item.reservedQuantity} 张，可用 {item.availableQuantity} 张。
        </div>
      ) : null}
    </div>
  );
}

function TodayEffectsPanel({
  effects,
}: {
  effects: {
    id: string;
    name: string;
    statusLabel: string;
    effectSummary: string;
  }[];
}) {
  if (effects.length === 0) {
    return (
      <div className="rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-black text-slate-500">
        今天还没有待生效道具。GM-08 后可以先用道具，再去健身触发结算。
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {effects.map((effect) => (
        <div
          key={effect.id}
          className="rounded-[1rem] border-2 border-lime-300 bg-lime-50 px-3 py-2 text-xs font-black text-slate-700"
        >
          <div className="flex items-center justify-between gap-2">
            <span>{effect.name}</span>
            <span className="rounded-full bg-lime-200 px-2 py-0.5 text-lime-900">
              {effect.statusLabel}
            </span>
          </div>
          <div className="mt-1 text-slate-500">{effect.effectSummary}</div>
        </div>
      ))}
    </div>
  );
}

function formatRedemptionTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RedemptionList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: GamificationRedemptionSnapshot[];
  emptyText: string;
}) {
  return (
    <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        <span className="rounded-full border-2 border-slate-900 bg-sky-100 px-3 py-1 text-sm font-black text-slate-900">
          {items.length} 条
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[1rem] border-2 border-slate-900 bg-yellow-50 p-3 text-sm font-black text-slate-700 shadow-[0_3px_0_0_#1f2937]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {item.username ? `${item.username} · ` : ""}
                  {item.itemName}
                </span>
                <span className="rounded-full border-2 border-slate-900 bg-white px-2 py-1 text-xs text-slate-900">
                  {item.statusLabel}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                申请时间：{formatRedemptionTime(item.requestedAt)}
              </div>
              {item.note ? <div className="mt-1 text-xs text-slate-500">备注：{item.note}</div> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminRedemptionQueue({
  items,
  activeAction,
  onConfirm,
  onCancel,
}: {
  items: GamificationRedemptionSnapshot[];
  activeAction: string | null;
  onConfirm: (item: GamificationRedemptionSnapshot) => void;
  onCancel: (item: GamificationRedemptionSnapshot) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-yellow-50 p-4 shadow-[0_6px_0_0_#1f2937]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-950">待处理兑换</h2>
        <span className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-sm font-black text-slate-900">
          {items.length} 条
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm font-black text-slate-500">暂时没有线下兑换排队。</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item) => {
            const isBusy = activeAction === `redemption:confirm:${item.id}` || activeAction === `redemption:cancel:${item.id}`;

            return (
              <div
                key={item.id}
                className="rounded-[1rem] border-2 border-slate-900 bg-white p-3 shadow-[0_3px_0_0_#1f2937]"
              >
                <p className="text-sm font-black text-slate-950">
                  {item.username ?? "未知成员"} 申请兑换 {item.itemName}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  申请时间：{formatRedemptionTime(item.requestedAt)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={activeAction !== null}
                    onClick={() => onConfirm(item)}
                    className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-3 py-2 text-xs font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {isBusy ? "处理中..." : "确认已兑换"}
                  </button>
                  <button
                    type="button"
                    disabled={activeAction !== null}
                    onClick={() => onCancel(item)}
                    className="rounded-full border-[3px] border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    取消并返还
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function SupplyStation() {
  const [snapshot, setSnapshot] = useState<GamificationStateSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [latestDraw, setLatestDraw] = useState<GamificationLotteryDrawSnapshot | null>(null);
  const [selectedBackpackItemId, setSelectedBackpackItemId] = useState<string | null>(null);
  const [selectedRerollDimension, setSelectedRerollDimension] = useState("movement");
  const [itemUseMessage, setItemUseMessage] = useState<string | null>(null);
  const [redemptionMessage, setRedemptionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadState() {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await ensureTodayGamificationTasks());
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  async function runTaskAction(
    actionKey: string,
    action: () => Promise<GamificationStateSnapshot>,
  ) {
    setActiveAction(actionKey);
    setError(null);
    setItemUseMessage(null);
    setRedemptionMessage(null);

    try {
      setSnapshot(await action());
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function runLotteryDraw(drawType: "SINGLE" | "TEN", useCoinTopUp = false) {
    setActiveAction(`lottery:${drawType}`);
    setError(null);
    setItemUseMessage(null);
    setRedemptionMessage(null);

    try {
      const result = await drawGamificationLottery({ drawType, useCoinTopUp });
      setSnapshot(result.snapshot);
      setLatestDraw(result.draw);
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function runItemUse(itemId: string) {
    setActiveAction(`item:${itemId}`);
    setError(null);
    setItemUseMessage(null);
    setRedemptionMessage(null);

    try {
      const result = await useGamificationItem({
        itemId,
        target:
          itemId === "task_reroll_coupon"
            ? {
                dimensionKey: selectedRerollDimension as
                  | "movement"
                  | "hydration"
                  | "social"
                  | "learning",
              }
            : undefined,
      });

      setSnapshot(result.snapshot);
      setItemUseMessage(result.itemUse.message);
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function reloadSupplyStationState() {
    setSnapshot(await fetchGamificationState());
  }

  async function runRequestRedemption(item: GamificationBackpackItemSnapshot) {
    setActiveAction(`redemption:request:${item.itemId}`);
    setError(null);
    setItemUseMessage(null);
    setRedemptionMessage(null);

    try {
      await requestRealWorldRedemption(item.itemId);
      setRedemptionMessage("兑换申请已提交，瑞幸券已从背包扣除。管理员确认前不会自动生成咖啡记录。");
      await reloadSupplyStationState();
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function runConfirmRedemption(redemption: GamificationRedemptionSnapshot) {
    setActiveAction(`redemption:confirm:${redemption.id}`);
    setError(null);
    setRedemptionMessage(null);

    try {
      await confirmRealWorldRedemption(redemption.id);
      setRedemptionMessage("已确认兑换，请在线下把咖啡债还上。");
      await reloadSupplyStationState();
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function runCancelRedemption(redemption: GamificationRedemptionSnapshot) {
    setActiveAction(`redemption:cancel:${redemption.id}`);
    setError(null);
    setRedemptionMessage(null);

    try {
      await cancelRealWorldRedemption(redemption.id);
      setRedemptionMessage("已取消兑换，瑞幸券已返还到对方背包。");
      await reloadSupplyStationState();
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

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
                {error.includes("登录状态已过期") ? (
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

  const hasTopUp = snapshot.lottery.tenDrawTopUpRequired > 0;
  const backpackItems = snapshot.backpack.groups.flatMap((group) => group.items);
  const selectedBackpackItem =
    backpackItems.find((item) => item.itemId === selectedBackpackItemId) ??
    backpackItems[0] ??
    null;

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
                  四项都完成后，可以领取今日生活券。
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                {snapshot.dayKey}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.dimensions.map((dimension) => (
                <DimensionCard
                  key={dimension.key}
                  dimension={dimension}
                  busy={activeAction !== null}
                  onComplete={() => {
                    void runTaskAction(`complete:${dimension.key}`, () =>
                      completeGamificationTask({
                        dimensionKey: dimension.key,
                      }),
                    );
                  }}
                  onReroll={() => {
                    void runTaskAction(`reroll:${dimension.key}`, () =>
                      rerollGamificationTask({
                        dimensionKey: dimension.key,
                      }),
                    );
                  }}
                />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">今日券路</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1rem] border-2 border-slate-200 bg-lime-50 p-3 text-sm font-black text-slate-700">
                  健身打卡券：{snapshot.ticketSummary.fitnessTicketEarned ? "已到账" : "今日未到账"}
                </div>
                <div className="rounded-[1rem] border-2 border-slate-200 bg-yellow-50 p-3 text-sm font-black text-slate-700">
                  四维任务券：{snapshot.ticketSummary.lifeTicketEarned ? "已到账" : `${snapshot.ticketSummary.taskCompletedCount}/4`}
                </div>
                <div className="rounded-[1rem] border-2 border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-700">
                  今日最多免费 {snapshot.ticketSummary.maxFreeTicketsToday} 张，已花 {snapshot.ticketSummary.todaySpent} 张。
                </div>
              </div>
              <button
                type="button"
                disabled={activeAction !== null || !snapshot.ticketSummary.lifeTicketClaimable}
                onClick={() => {
                  void runTaskAction("claim-ticket", claimGamificationLifeTicket);
                }}
                className="mt-3 w-full rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-3 text-sm font-black text-slate-900 shadow-[0_4px_0_0_#1f2937] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
              >
                {snapshot.ticketSummary.lifeTicketEarned
                  ? "今日生活券已到账"
                  : snapshot.ticketSummary.lifeTicketClaimable
                    ? "领取生活券"
                    : `四维进度 ${snapshot.ticketSummary.taskCompletedCount}/4`}
              </button>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">抽奖机</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{snapshot.lottery.message}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={activeAction !== null || !snapshot.lottery.singleDrawEnabled}
                  onClick={() => {
                    void runLotteryDraw("SINGLE");
                  }}
                  className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  单抽 x1
                </button>
                <button
                  type="button"
                  disabled={activeAction !== null || !snapshot.lottery.tenDrawEnabled}
                  onClick={() => {
                    void runLotteryDraw("TEN", hasTopUp);
                  }}
                  className="rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {hasTopUp ? "补券十连" : "十连 x10"}
                </button>
              </div>
              {hasTopUp ? (
                <div className="mt-3 rounded-[1rem] border-2 border-amber-300 bg-amber-50 p-3 text-xs font-black text-amber-800">
                  十连还差 {snapshot.lottery.tenDrawTopUpRequired} 张券，需要 {snapshot.lottery.tenDrawTopUpCoinCost} 银子补齐。
                </div>
              ) : null}
              {latestDraw ? (
                <div className="mt-4 rounded-[1rem] border-2 border-slate-900 bg-lime-50 p-3">
                  <div className="text-sm font-black text-slate-950">
                    本次抽到 {latestDraw.rewards.length} 个奖励
                    {latestDraw.guaranteeApplied ? "，触发十连保底" : ""}
                  </div>
                  <div className="mt-2 grid gap-2">
                    {latestDraw.rewards.map((reward, index) => (
                      <div key={`${latestDraw.id}-${index}`} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700">
                        {index + 1}. {reward.name} / {reward.effectSummary}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
                  {snapshot.lottery.recentDraws.length > 0
                    ? `最近 ${snapshot.lottery.recentDraws.length} 次抽奖记录已归档。`
                    : "暂时没有抽奖记录。"}
                </div>
              )}
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">背包</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {snapshot.backpack.emptyMessage}
                  </p>
                </div>
                <span className="rounded-full border-2 border-slate-900 bg-sky-100 px-3 py-1 text-sm font-black text-slate-900">
                  {snapshot.backpack.ownedItemCount} 种
                </span>
              </div>
              {itemUseMessage ? (
                <div className="mt-3 rounded-[1rem] border-2 border-lime-300 bg-lime-50 px-3 py-2 text-sm font-black text-lime-800">
                  {itemUseMessage}
                </div>
              ) : null}

              {snapshot.backpack.groups.length > 0 ? (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-3">
                    {snapshot.backpack.groups.map((group) => (
                      <div
                        key={group.category}
                        className="rounded-[1rem] border-2 border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                          <span>{group.label}</span>
                          <span>合计 x{group.totalQuantity}</span>
                        </div>
                        <div className="grid gap-2">
                          {group.items.map((item) => {
                            const isSelected = selectedBackpackItem?.itemId === item.itemId;

                            return (
                              <button
                                key={item.itemId}
                                type="button"
                                onClick={() => setSelectedBackpackItemId(item.itemId)}
                                className={`flex items-center justify-between rounded-[0.85rem] border-2 px-3 py-2 text-left text-sm font-black transition ${
                                  isSelected
                                    ? "border-slate-900 bg-yellow-200 shadow-[0_3px_0_0_#1f2937]"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                <span>{item.name}</span>
                                <span>x{item.quantity}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <BackpackItemDetail
                    item={selectedBackpackItem}
                    activeAction={activeAction}
                    selectedRerollDimension={selectedRerollDimension}
                    onRerollDimensionChange={setSelectedRerollDimension}
                    onUse={(itemId) => {
                      void runItemUse(itemId);
                    }}
                    onRequestRedemption={(item) => {
                      void runRequestRedemption(item);
                    }}
                  />

                  <div>
                    <h3 className="mb-2 text-sm font-black text-slate-950">今日效果</h3>
                    <TodayEffectsPanel effects={snapshot.backpack.todayEffects} />
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
                  {snapshot.backpack.emptyMessage}
                </p>
              )}
            </section>

            {redemptionMessage ? (
              <div className="rounded-[1rem] border-[3px] border-lime-300 bg-lime-50 px-4 py-3 text-sm font-black text-lime-800">
                {redemptionMessage}
              </div>
            ) : null}

            <RedemptionList
              title="我的兑换"
              items={snapshot.redemptions.mine}
              emptyText="还没有真实福利兑换记录。抽到瑞幸券后，可以在背包里申请。"
            />

            {snapshot.currentUserRole === "ADMIN" || snapshot.redemptions.adminQueue.length > 0 ? (
              <AdminRedemptionQueue
                items={snapshot.redemptions.adminQueue}
                activeAction={activeAction}
                onConfirm={(item) => {
                  void runConfirmRedemption(item);
                }}
                onCancel={(item) => {
                  void runCancelRedemption(item);
                }}
              />
            ) : null}

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
