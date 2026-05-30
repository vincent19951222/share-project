"use client";

import type {
  GamificationDimensionSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyDashboardAction = "complete-task" | "reroll-task" | "claim-ticket";
type SupplyDashboardNavigationTarget = "draw-pool" | "backpack" | "shop" | "task-record";

export interface SupplyDashboardPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyDashboardAction | null;
  onCompleteTask: (dimensionKey: GamificationDimensionSnapshot["key"]) => void;
  onRerollTask: (dimensionKey: GamificationDimensionSnapshot["key"]) => void;
  onClaimTicket: () => void;
  onNavigate: (target: SupplyDashboardNavigationTarget) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatResource(value: number, maxValue?: number) {
  if (maxValue === undefined) {
    return formatNumber(value);
  }

  return `${formatNumber(value)}/${formatNumber(maxValue)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function SupplyDashboardPanel({
  activeAction,
  onClaimTicket,
  onCompleteTask,
  onNavigate,
  onRerollTask,
  snapshot,
}: SupplyDashboardPanelProps) {
  const remainingExp = Math.max(
    0,
    snapshot.profile.nextLevelExp - snapshot.profile.currentLevelExp,
  );
  const completedQuestCount = snapshot.dashboard.dailyQuests.filter(
    (dimension) => dimension.assignment?.status === "completed",
  ).length;

  return (
    <section className="supply-production-dashboard" aria-label="我的状态">
      <header className="supply-production-dashboard__topbar">
        {Object.entries(snapshot.resources).map(([key, resource]) => (
          <article className="supply-production-dashboard__resource" key={key}>
            <span>{resource.label}</span>
            <strong>{formatResource(resource.value, resource.maxValue)}</strong>
          </article>
        ))}
      </header>

      <div className="supply-production-dashboard__grid">
        <section className="supply-production-dashboard__profile" aria-label="角色状态">
          <p>{snapshot.profile.username}</p>
          <h2>
            {snapshot.profile.title}
            <span>Lv.{snapshot.profile.level}</span>
          </h2>
          <div aria-label="等级经验">
            <strong>
              {snapshot.profile.currentLevelExp}/{snapshot.profile.nextLevelExp}
            </strong>
            <progress
              max={snapshot.profile.nextLevelExp}
              value={snapshot.profile.currentLevelExp}
            />
          </div>
          <p>距离升级还差 {remainingExp} EXP</p>
        </section>

        <section className="supply-production-dashboard__effects" aria-label="今日效果">
          <h3>今日效果</h3>
          {snapshot.dashboard.todayEffects.length > 0 ? (
            <div>
              {snapshot.dashboard.todayEffects.map((effect) => (
                <article key={effect.id}>
                  <strong>{effect.name}</strong>
                  <p>{effect.effectSummary}</p>
                  <time>{effect.statusLabel} · {formatDateTime(effect.createdAt)}</time>
                </article>
              ))}
            </div>
          ) : (
            <p>今天还没有生效中的补给效果</p>
          )}
        </section>

        <section className="supply-production-dashboard__quests" aria-label="今日主线">
          <div>
            <h3>今日主线</h3>
            <p>
              进度：{completedQuestCount}/{snapshot.dashboard.dailyQuests.length}
            </p>
          </div>
          <div>
            {snapshot.dashboard.dailyQuests.map((dimension) => {
              const assignment = dimension.assignment;
              const isCompleted = assignment?.status === "completed";
              const canComplete = Boolean(assignment?.canComplete) && !isCompleted;
              const canReroll = Boolean(assignment?.canReroll);

              return (
                <article
                  className="supply-production-dashboard__quest"
                  data-status={assignment?.status ?? "missing"}
                  key={dimension.key}
                >
                  <span>{dimension.title}</span>
                  <h4>{assignment?.title ?? "今日任务还没生成"}</h4>
                  <p>{assignment?.description ?? dimension.description}</p>
                  <small>
                    {dimension.subtitle}
                    {assignment
                      ? ` · 可换 ${assignment.rerollCount}/${assignment.rerollLimit}`
                      : ""}
                  </small>
                  <div>
                    <button
                      data-action="complete-task"
                      disabled={!canComplete || activeAction === "complete-task"}
                      onClick={() => onCompleteTask(dimension.key)}
                      type="button"
                    >
                      {activeAction === "complete-task"
                        ? "打卡中"
                        : isCompleted
                          ? "已完成"
                          : "打卡"}
                    </button>
                    <button
                      data-action="reroll-task"
                      disabled={!canReroll || activeAction === "reroll-task"}
                      onClick={() => onRerollTask(dimension.key)}
                      type="button"
                    >
                      {activeAction === "reroll-task" ? "更换中" : "换一个"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <button
            data-action="claim-ticket"
            disabled={activeAction === "claim-ticket"}
            onClick={onClaimTicket}
            type="button"
          >
            {activeAction === "claim-ticket" ? "领取中" : "领取抽奖券"}
          </button>
        </section>
      </div>

      <nav className="supply-production-dashboard__shortcuts" aria-label="补给站快捷入口">
        <button onClick={() => onNavigate("draw-pool")} type="button">
          去抽奖池
        </button>
        <button onClick={() => onNavigate("backpack")} type="button">
          看背包
        </button>
        <button onClick={() => onNavigate("shop")} type="button">
          逛商店
        </button>
        <button onClick={() => onNavigate("task-record")} type="button">
          任务记录
        </button>
      </nav>
    </section>
  );
}
