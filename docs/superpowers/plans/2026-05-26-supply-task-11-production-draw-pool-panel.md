# Supply Task 11 Production Draw Pool Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production Draw Pool panel that renders real lottery wallet/status data and exposes stable draw callbacks for the future production shell.

**Architecture:** Keep draw execution in existing lottery APIs and future shell wiring. This task creates a pure client component that receives `SupplyStationProductionSnapshot`, optional `latestDraw`, and an `onDraw` callback, then renders button states and draw summaries from the production view-model.

**Tech Stack:** React 19, Next.js client component conventions, TypeScript strict mode, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-26-supply-task-11-production-draw-pool-panel-design.md`

This task does not modify production route wiring, API routes, Prisma schema, or the supply view-model builder.

## File Structure

- Create: `components/gamification/production/SupplyDrawPoolPanel.tsx`
  - Client component.
  - Accepts `SupplyStationProductionSnapshot`, `latestDraw`, `activeAction`, and `onDraw`.
  - Renders ticket wallet, draw buttons, top-up helper, guarantee copy, latest draw, and recent draw summary.
- Create: `__tests__/supply-production-draw-pool-panel.test.tsx`
  - Renders fixture snapshot.
  - Verifies text and callback payloads.
- Add: `docs/superpowers/specs/2026-05-26-supply-task-11-production-draw-pool-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-11-production-draw-pool-panel.md`

## Task 1: Failing Production Draw Pool Panel Test

**Files:**
- Create: `__tests__/supply-production-draw-pool-panel.test.tsx`

- [ ] **Step 1: Create the failing component test**

Create `__tests__/supply-production-draw-pool-panel.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyDrawPoolPanel } from "@/components/gamification/production/SupplyDrawPoolPanel";
import type {
  GamificationLotteryDrawSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 2450 },
    ticket: { label: "抽奖券", value: 8 },
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
  dashboard: { todayEffects: [], dailyQuests: [] },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 1,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: true,
      taskCompletedCount: 2,
      lifeTicketClaimable: false,
      ticketBalance: 8,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 2,
      tenDrawTopUpCoinCost: 80,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "抽奖机已就绪",
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

const latestDraw = {
  id: "draw-1",
  drawType: "TEN",
  ticketSpent: 10,
  coinSpent: 80,
  guaranteeApplied: true,
  createdAt: "2026-05-26T06:00:00.000Z",
  rewards: [
    {
      rewardId: "luckin_coffee_coupon",
      rewardTier: "rare",
      rewardKind: "ITEM",
      name: "瑞幸咖啡券",
      description: "咖啡补给",
      effectSummary: "管理员确认后兑换",
    },
  ],
} satisfies GamificationLotteryDrawSnapshot;

describe("SupplyDrawPoolPanel", () => {
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

  it("renders production wallet, draw actions, top-up, and guarantee copy", async () => {
    await act(async () => {
      root.render(
        <SupplyDrawPoolPanel
          activeAction={null}
          latestDraw={null}
          onDraw={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("8 张");
    expect(container.textContent).toContain("单抽");
    expect(container.textContent).toContain("补券十连");
    expect(container.textContent).toContain("十连保底");
    expect(container.textContent).toContain("十连还差 2 张券");
    expect(container.textContent).toContain("需要 80 银子补齐");
  });

  it("fires draw callbacks with the expected top-up flag", async () => {
    const onDraw = vi.fn();

    await act(async () => {
      root.render(
        <SupplyDrawPoolPanel
          activeAction={null}
          latestDraw={null}
          onDraw={onDraw}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-action='draw-single']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container
      .querySelector<HTMLButtonElement>("[data-action='draw-ten']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onDraw).toHaveBeenCalledWith("SINGLE", false);
    expect(onDraw).toHaveBeenCalledWith("TEN", true);
  });

  it("renders the latest draw result", async () => {
    await act(async () => {
      root.render(
        <SupplyDrawPoolPanel
          activeAction={null}
          latestDraw={latestDraw}
          onDraw={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("十连结果");
    expect(container.textContent).toContain("触发十连保底");
    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("管理员确认后兑换");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-draw-pool-panel.test.tsx
```

Expected: FAIL because `components/gamification/production/SupplyDrawPoolPanel.tsx` does not exist.

## Task 2: Production Draw Pool Panel Component

**Files:**
- Create: `components/gamification/production/SupplyDrawPoolPanel.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gamification/production/SupplyDrawPoolPanel.tsx`:

```tsx
"use client";

import type {
  GamificationLotteryDrawSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyDrawPoolAction = "draw-single" | "draw-ten";

export interface SupplyDrawPoolPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  latestDraw: GamificationLotteryDrawSnapshot | null;
  activeAction: SupplyDrawPoolAction | string | null;
  onDraw: (drawType: "SINGLE" | "TEN", useCoinTopUp: boolean) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function getDrawResultLabel(draw: GamificationLotteryDrawSnapshot) {
  return draw.drawType === "TEN" ? "十连结果" : "单抽结果";
}

export function SupplyDrawPoolPanel({
  activeAction,
  latestDraw,
  onDraw,
  snapshot,
}: SupplyDrawPoolPanelProps) {
  const wallet = snapshot.drawPool.wallet;
  const lottery = snapshot.drawPool.lottery;
  const hasTopUp = lottery.tenDrawTopUpRequired > 0;
  const isBusy = activeAction !== null;

  return (
    <section className="supply-production-draw-pool" aria-label="抽卡池">
      <header className="supply-production-draw-pool__header">
        <div>
          <p>补给抽卡机</p>
          <h2>抽卡池</h2>
        </div>
        <article className="supply-production-draw-pool__wallet" aria-label="抽奖券钱包">
          <span>抽奖券</span>
          <strong>{formatNumber(wallet.ticketBalance)} 张</strong>
          <small>
            今日获取 {wallet.todayEarned}/{wallet.maxFreeTicketsToday} · 今日花费 {wallet.todaySpent}
          </small>
        </article>
      </header>

      <section className="supply-production-draw-pool__machine" aria-label="补给抽卡机">
        <p>{lottery.message}</p>
        <div>
          <button
            data-action="draw-single"
            disabled={isBusy || !lottery.singleDrawEnabled}
            onClick={() => onDraw("SINGLE", false)}
            type="button"
          >
            {activeAction === "draw-single" ? "单抽中" : "单抽"}
          </button>
          <button
            data-action="draw-ten"
            disabled={isBusy || !lottery.tenDrawEnabled}
            onClick={() => onDraw("TEN", hasTopUp)}
            type="button"
          >
            {activeAction === "draw-ten" ? "十连中" : hasTopUp ? "补券十连" : "十连 x10"}
          </button>
        </div>
        {hasTopUp ? (
          <p className="supply-production-draw-pool__top-up">
            十连还差 {lottery.tenDrawTopUpRequired} 张券，需要 {lottery.tenDrawTopUpCoinCost} 银子补齐。
          </p>
        ) : null}
      </section>

      <section className="supply-production-draw-pool__guarantee" aria-label="十连保底">
        <h3>十连保底</h3>
        <p>十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。</p>
      </section>

      <section className="supply-production-draw-pool__result" aria-label="抽奖结果">
        {latestDraw ? (
          <article>
            <h3>{getDrawResultLabel(latestDraw)}</h3>
            <p>
              本次抽到 {latestDraw.rewards.length} 个奖励
              {latestDraw.guaranteeApplied ? "，触发十连保底" : ""}
            </p>
            <ul>
              {latestDraw.rewards.map((reward, index) => (
                <li key={`${latestDraw.id}-${reward.rewardId}-${index}`}>
                  <strong>{reward.name}</strong>
                  <span>{reward.rewardTier}</span>
                  <p>{reward.effectSummary}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : lottery.recentDraws.length > 0 ? (
          <p>最近 {lottery.recentDraws.length} 次抽奖记录已归档。</p>
        ) : (
          <p>暂时没有抽奖记录。</p>
        )}
      </section>
    </section>
  );
}
```

- [ ] **Step 2: Run focused component test**

Run:

```bash
npm test -- __tests__/supply-production-draw-pool-panel.test.tsx
```

Expected: PASS.

## Task 3: Verification And Commit

**Files:**
- Create: `components/gamification/production/SupplyDrawPoolPanel.tsx`
- Create: `__tests__/supply-production-draw-pool-panel.test.tsx`
- Add: `docs/superpowers/specs/2026-05-26-supply-task-11-production-draw-pool-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-11-production-draw-pool-panel.md`

- [ ] **Step 1: Run focused Task 11 test**

Run:

```bash
npm test -- __tests__/supply-production-draw-pool-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related production supply tests**

Run:

```bash
npm test -- __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-dashboard-panel.test.tsx __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts
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
rg -n "mock-data" components/gamification/production/SupplyDrawPoolPanel.tsx __tests__/supply-production-draw-pool-panel.test.tsx
```

Expected: no matches.

- [ ] **Step 5: Commit**

Run:

```bash
git add components/gamification/production/SupplyDrawPoolPanel.tsx __tests__/supply-production-draw-pool-panel.test.tsx docs/superpowers/specs/2026-05-26-supply-task-11-production-draw-pool-panel-design.md docs/superpowers/plans/2026-05-26-supply-task-11-production-draw-pool-panel.md
git commit -m "feat: add production supply draw pool panel"
```
