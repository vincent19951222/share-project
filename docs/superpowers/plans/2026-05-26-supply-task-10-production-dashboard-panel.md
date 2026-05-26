# Supply Task 10 Production Dashboard Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first production supply panel for Dashboard state, rendering real `SupplyStationProductionSnapshot` data and exposing action callbacks for the future production shell.

**Architecture:** Keep production data mapping in `lib/gamification/supply-view-model.ts` and keep API fetching in Task 9. This task creates a pure client component that receives a snapshot and callback props, renders resources/profile/effects/tasks, and leaves mutation execution to Task 16.

**Tech Stack:** React 19, Next.js client component conventions, TypeScript strict mode, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-26-supply-task-10-production-dashboard-panel-design.md`

This task does not modify production route wiring, API routes, Prisma schema, or the supply view-model builder.

## File Structure

- Create: `components/gamification/production/SupplyDashboardPanel.tsx`
  - Client component.
  - Accepts `SupplyStationProductionSnapshot`.
  - Renders resources, profile level/EXP, today effects, and daily quests.
  - Exposes callback buttons for complete, reroll, claim ticket, and navigation shortcuts.
- Create: `__tests__/supply-production-dashboard-panel.test.tsx`
  - Renders fixture snapshot.
  - Verifies production text and callback payloads.
- Add: `docs/superpowers/specs/2026-05-26-supply-task-10-production-dashboard-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-10-production-dashboard-panel.md`

## Task 1: Failing Production Dashboard Panel Test

**Files:**
- Create: `__tests__/supply-production-dashboard-panel.test.tsx`

- [ ] **Step 1: Create the failing component test**

Create `__tests__/supply-production-dashboard-panel.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyDashboardPanel } from "@/components/gamification/production/SupplyDashboardPanel";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 2450 },
    ticket: { label: "抽奖券", value: 18 },
    backpack: { label: "背包", value: 2, maxValue: 60 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 2720,
    level: 3,
    currentLevelExp: 720,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "动一动",
        description: "movement",
        assignment: {
          id: "a1",
          taskCardId: "movement_001",
          title: "工位重启",
          description: "站起来活动 3 分钟",
          status: "pending",
          completedAt: null,
          completionText: null,
          rerollCount: 0,
          rerollLimit: 1,
          canComplete: true,
          canReroll: true,
        },
      },
    ],
  },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
      taskCompletedCount: 0,
      lifeTicketClaimable: false,
      ticketBalance: 18,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 0,
      tenDrawTopUpCoinCost: 0,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "ready",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 2,
    ownedItemCount: 1,
    previewItems: [],
    groups: [],
    todayEffects: [],
    emptyMessage: "暂无补给",
    capacity: { usedSlots: 2, totalSlots: 60 },
  },
  shop: { products: [] },
  taskRecord: { dates: [], timeline: [] },
  social: {
    status: "active",
    pendingSentCount: 0,
    pendingReceivedCount: 0,
    teamWidePendingCount: 0,
    sent: [],
    received: [],
    teamWide: [],
    recentResponses: [],
    availableRecipients: [],
    message: "ready",
  },
  redemptions: { mine: [], adminQueue: [] },
} satisfies SupplyStationProductionSnapshot;

describe("SupplyDashboardPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders production resources, profile exp, and empty today effects", async () => {
    await act(async () => {
      root.render(
        <SupplyDashboardPanel
          snapshot={snapshot}
          activeAction={null}
          onClaimTicket={vi.fn()}
          onCompleteTask={vi.fn()}
          onNavigate={vi.fn()}
          onRerollTask={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("2,450");
    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("18");
    expect(container.textContent).toContain("背包");
    expect(container.textContent).toContain("2/60");
    expect(container.textContent).toContain("Lv.3");
    expect(container.textContent).toContain("720/1000");
    expect(container.textContent).toContain("距离升级还差 280 EXP");
    expect(container.textContent).toContain("今天还没有生效中的补给效果");
  });

  it("renders quest actions with dimension keys", async () => {
    const onCompleteTask = vi.fn();
    const onRerollTask = vi.fn();
    const onClaimTicket = vi.fn();

    await act(async () => {
      root.render(
        <SupplyDashboardPanel
          snapshot={snapshot}
          activeAction={null}
          onClaimTicket={onClaimTicket}
          onCompleteTask={onCompleteTask}
          onNavigate={vi.fn()}
          onRerollTask={onRerollTask}
        />,
      );
    });

    expect(container.textContent).toContain("工位重启");
    expect(container.textContent).toContain("站起来活动 3 分钟");

    container
      .querySelector<HTMLButtonElement>("[data-action='complete-task']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container
      .querySelector<HTMLButtonElement>("[data-action='reroll-task']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container
      .querySelector<HTMLButtonElement>("[data-action='claim-ticket']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onCompleteTask).toHaveBeenCalledWith("movement");
    expect(onRerollTask).toHaveBeenCalledWith("movement");
    expect(onClaimTicket).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: FAIL because `components/gamification/production/SupplyDashboardPanel.tsx` does not exist.

## Task 2: Production Dashboard Panel Component

**Files:**
- Create: `components/gamification/production/SupplyDashboardPanel.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gamification/production/SupplyDashboardPanel.tsx`:

```tsx
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
                    {assignment ? ` · 换班 ${assignment.rerollCount}/${assignment.rerollLimit}` : ""}
                  </small>
                  <div>
                    <button
                      data-action="complete-task"
                      disabled={!canComplete || activeAction === "complete-task"}
                      onClick={() => onCompleteTask(dimension.key)}
                      type="button"
                    >
                      {activeAction === "complete-task" ? "打卡中" : isCompleted ? "已完成" : "完成打卡"}
                    </button>
                    <button
                      data-action="reroll-task"
                      disabled={!canReroll || activeAction === "reroll-task"}
                      onClick={() => onRerollTask(dimension.key)}
                      type="button"
                    >
                      {activeAction === "reroll-task" ? "换班中" : "换班"}
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
        <button onClick={() => onNavigate("draw-pool")} type="button">去抽卡池</button>
        <button onClick={() => onNavigate("backpack")} type="button">看背包</button>
        <button onClick={() => onNavigate("shop")} type="button">逛商店</button>
        <button onClick={() => onNavigate("task-record")} type="button">任务记录</button>
      </nav>
    </section>
  );
}
```

- [ ] **Step 2: Run focused component test**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: PASS.

## Task 3: Verification And Commit

**Files:**
- Create: `components/gamification/production/SupplyDashboardPanel.tsx`
- Create: `__tests__/supply-production-dashboard-panel.test.tsx`
- Add: `docs/superpowers/specs/2026-05-26-supply-task-10-production-dashboard-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-10-production-dashboard-panel.md`

- [ ] **Step 1: Run focused Task 10 test**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related production supply tests**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Confirm no mock data import**

Run:

```bash
rg -n "mock-data" components/gamification/production/SupplyDashboardPanel.tsx __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: no matches.

- [ ] **Step 5: Commit**

Run:

```bash
git add components/gamification/production/SupplyDashboardPanel.tsx __tests__/supply-production-dashboard-panel.test.tsx docs/superpowers/specs/2026-05-26-supply-task-10-production-dashboard-panel-design.md docs/superpowers/plans/2026-05-26-supply-task-10-production-dashboard-panel.md
git commit -m "feat: add production supply dashboard panel"
```
