# Supply Task 12 Production Backpack Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production Backpack panel that renders real inventory groups, fixed capacity, selected item details, today effects, and stable item-use/redemption callbacks.

**Architecture:** Keep item mutations in existing APIs and future shell wiring. This task creates a pure client component that receives `SupplyStationProductionSnapshot`, selection/action state, and callbacks, then renders inventory and detail UI from the production view-model without importing UI Lab mock data.

**Tech Stack:** React 19, Next.js client component conventions, TypeScript strict mode, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-26-supply-task-12-production-backpack-panel-design.md`

This task does not modify production route wiring, API routes, Prisma schema, the supply view-model builder, global CSS, or UI Lab mock-data files.

## File Structure

- Create: `components/gamification/production/SupplyBackpackPanel.tsx`
  - Client component.
  - Accepts `SupplyStationProductionSnapshot`, `selectedItemId`, `activeAction`, and item callbacks.
  - Renders capacity, inventory groups, item cards, selected item detail, operation buttons, and today effects.
- Create: `__tests__/supply-production-backpack-panel.test.tsx`
  - Renders fixture snapshot.
  - Verifies capacity, grouped inventory, selection callback, details, item use callback, and redemption callback.
- Add: `docs/superpowers/specs/2026-05-26-supply-task-12-production-backpack-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-12-production-backpack-panel.md`

## Task 1: Failing Production Backpack Panel Test

**Files:**
- Create: `__tests__/supply-production-backpack-panel.test.tsx`

- [ ] **Step 1: Create the failing component test**

Create `__tests__/supply-production-backpack-panel.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyBackpackPanel } from "@/components/gamification/production/SupplyBackpackPanel";
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
  dashboard: { todayEffects: [], dailyQuests: [] },
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
    ownedItemCount: 2,
    previewItems: [],
    groups: [
      {
        category: "boost",
        label: "增益",
        totalQuantity: 1,
        items: [
          {
            itemId: "small_boost_coupon",
            category: "boost",
            categoryLabel: "增益",
            name: "小额增益券",
            description: "今日健身收益提高 50%。",
            quantity: 1,
            reservedQuantity: 0,
            availableQuantity: 1,
            useEnabled: true,
            useDisabledReason: null,
            useTiming: "today",
            useTimingLabel: "今日内生效",
            effectSummary: "健身银子 x1.5",
            usageLimitSummary: "每天最多使用 1 张",
            stackable: false,
            requiresAdminConfirmation: false,
            enabled: true,
            knownDefinition: true,
          },
        ],
      },
      {
        category: "real_world",
        label: "真实福利",
        totalQuantity: 1,
        items: [
          {
            itemId: "luckin_coffee_coupon",
            category: "real_world",
            categoryLabel: "真实福利",
            name: "瑞幸咖啡券",
            description: "向管理员申请线下咖啡补给。",
            quantity: 1,
            reservedQuantity: 0,
            availableQuantity: 1,
            useEnabled: true,
            useDisabledReason: null,
            useTiming: "manual_redemption",
            useTimingLabel: "管理员确认后兑换",
            effectSummary: "兑换 1 杯咖啡",
            usageLimitSummary: "库存足够时可申请",
            stackable: true,
            requiresAdminConfirmation: true,
            enabled: true,
            knownDefinition: true,
          },
        ],
      },
    ],
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

describe("SupplyBackpackPanel", () => {
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

  it("renders fixed capacity, grouped inventory, and empty today effects", async () => {
    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId={null}
          onRequestRedemption={vi.fn()}
          onSelectItem={vi.fn()}
          onUseItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("2/60");
    expect(container.textContent).toContain("增益");
    expect(container.textContent).toContain("真实福利");
    expect(container.textContent).toContain("小额增益券");
    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("今天还没有生效中的补给效果");
    expect(container.querySelectorAll("[data-testid='supply-backpack-item']")).toHaveLength(2);
  });

  it("selects inventory items and renders selected item details", async () => {
    const onSelectItem = vi.fn();

    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId="small_boost_coupon"
          onRequestRedemption={vi.fn()}
          onSelectItem={onSelectItem}
          onUseItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("今日健身收益提高 50%。");
    expect(container.textContent).toContain("今日内生效");
    expect(container.textContent).toContain("健身银子 x1.5");
    expect(container.textContent).toContain("每天最多使用 1 张");

    container
      .querySelector<HTMLButtonElement>("[data-testid='supply-backpack-item'][data-item-id='luckin_coffee_coupon']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelectItem).toHaveBeenCalledWith("luckin_coffee_coupon");
  });

  it("fires item use and real-world redemption callbacks", async () => {
    const onUseItem = vi.fn();
    const onRequestRedemption = vi.fn();

    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId="small_boost_coupon"
          onRequestRedemption={onRequestRedemption}
          onSelectItem={vi.fn()}
          onUseItem={onUseItem}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-action='use-item']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onUseItem).toHaveBeenCalledWith("small_boost_coupon", undefined);

    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId="luckin_coffee_coupon"
          onRequestRedemption={onRequestRedemption}
          onSelectItem={vi.fn()}
          onUseItem={onUseItem}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-action='request-redemption']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onRequestRedemption).toHaveBeenCalledWith("luckin_coffee_coupon");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-backpack-panel.test.tsx
```

Expected: FAIL because `components/gamification/production/SupplyBackpackPanel.tsx` does not exist.

## Task 2: Production Backpack Panel Component

**Files:**
- Create: `components/gamification/production/SupplyBackpackPanel.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gamification/production/SupplyBackpackPanel.tsx`:

```tsx
"use client";

import type {
  GamificationBackpackItemSnapshot,
  GamificationTodayEffectSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyBackpackAction = "use-item" | "request-redemption";

export interface SupplyBackpackUseTarget {
  dimensionKey?: string;
  recipientUserId?: string;
  message?: string;
}

export interface SupplyBackpackPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyBackpackAction | string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUseItem: (itemId: string, target?: SupplyBackpackUseTarget) => void;
  onRequestRedemption: (itemId: string) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function flattenBackpackItems(snapshot: SupplyStationProductionSnapshot) {
  return snapshot.backpack.groups.flatMap((group) => group.items);
}

function isRedemptionItem(item: GamificationBackpackItemSnapshot) {
  return item.category === "real_world" || item.requiresAdminConfirmation;
}

function getSelectedItem(
  snapshot: SupplyStationProductionSnapshot,
  selectedItemId: string | null,
) {
  const items = flattenBackpackItems(snapshot);
  return items.find((item) => item.itemId === selectedItemId) ?? items[0] ?? null;
}

function TodayEffectList({ effects }: { effects: GamificationTodayEffectSnapshot[] }) {
  return (
    <section className="supply-production-backpack__effects" aria-label="今日效果">
      <h3>今日效果</h3>
      {effects.length > 0 ? (
        <div>
          {effects.map((effect) => (
            <article key={effect.id}>
              <strong>{effect.name}</strong>
              <span>{effect.statusLabel}</span>
              <p>{effect.effectSummary}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>今天还没有生效中的补给效果</p>
      )}
    </section>
  );
}

export function SupplyBackpackPanel({
  activeAction,
  onRequestRedemption,
  onSelectItem,
  onUseItem,
  selectedItemId,
  snapshot,
}: SupplyBackpackPanelProps) {
  const selectedItem = getSelectedItem(snapshot, selectedItemId);
  const isBusy = activeAction !== null;

  return (
    <section className="supply-production-backpack" aria-label="背包">
      <header className="supply-production-backpack__header">
        <div>
          <p>牛马补给站</p>
          <h2>背包</h2>
        </div>
        <article className="supply-production-backpack__capacity" aria-label="背包容量">
          <span>容量</span>
          <strong>
            {formatNumber(snapshot.backpack.capacity.usedSlots)}/
            {formatNumber(snapshot.backpack.capacity.totalSlots)}
          </strong>
        </article>
      </header>

      <div className="supply-production-backpack__layout">
        <section className="supply-production-backpack__inventory" aria-label="库存">
          {snapshot.backpack.groups.length > 0 ? (
            snapshot.backpack.groups.map((group) => (
              <article className="supply-production-backpack__group" key={group.category}>
                <header>
                  <h3>{group.label}</h3>
                  <span>{formatNumber(group.totalQuantity)}</span>
                </header>
                <div>
                  {group.items.map((item) => (
                    <button
                      aria-selected={selectedItem?.itemId === item.itemId}
                      className="supply-production-backpack__item"
                      data-item-id={item.itemId}
                      data-testid="supply-backpack-item"
                      key={item.itemId}
                      onClick={() => onSelectItem(item.itemId)}
                      type="button"
                    >
                      <strong>{item.name}</strong>
                      <span>{item.categoryLabel}</span>
                      <small>
                        持有 {formatNumber(item.quantity)} · 可用{" "}
                        {formatNumber(item.availableQuantity)}
                      </small>
                    </button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p>{snapshot.backpack.emptyMessage}</p>
          )}
        </section>

        <section className="supply-production-backpack__detail" aria-label="道具详情">
          {selectedItem ? (
            <article>
              <header>
                <span>{selectedItem.categoryLabel}</span>
                <h3>{selectedItem.name}</h3>
                <p>可用 {formatNumber(selectedItem.availableQuantity)}</p>
              </header>
              <p>{selectedItem.description}</p>
              <dl>
                <div>
                  <dt>使用时机</dt>
                  <dd>{selectedItem.useTimingLabel}</dd>
                </div>
                <div>
                  <dt>效果</dt>
                  <dd>{selectedItem.effectSummary}</dd>
                </div>
                <div>
                  <dt>使用限制</dt>
                  <dd>{selectedItem.usageLimitSummary}</dd>
                </div>
              </dl>
              {!selectedItem.useEnabled && selectedItem.useDisabledReason ? (
                <p>{selectedItem.useDisabledReason}</p>
              ) : null}
              {isRedemptionItem(selectedItem) ? (
                <button
                  data-action="request-redemption"
                  disabled={isBusy || selectedItem.availableQuantity <= 0}
                  onClick={() => onRequestRedemption(selectedItem.itemId)}
                  type="button"
                >
                  {activeAction === "request-redemption" ? "申请中" : "申请兑换"}
                </button>
              ) : (
                <button
                  data-action="use-item"
                  disabled={isBusy || !selectedItem.useEnabled}
                  onClick={() => onUseItem(selectedItem.itemId, undefined)}
                  type="button"
                >
                  {activeAction === "use-item" ? "使用中" : "今日使用"}
                </button>
              )}
            </article>
          ) : (
            <p>{snapshot.backpack.emptyMessage}</p>
          )}
        </section>
      </div>

      <TodayEffectList effects={snapshot.backpack.todayEffects} />
    </section>
  );
}
```

- [ ] **Step 2: Run the component test**

Run:

```bash
npm test -- __tests__/supply-production-backpack-panel.test.tsx
```

Expected: PASS.

## Task 3: Production Supply Regression Checks

**Files:**
- Verify: `components/gamification/production/SupplyBackpackPanel.tsx`
- Verify: `__tests__/supply-production-backpack-panel.test.tsx`

- [ ] **Step 1: Run related production supply tests**

Run:

```bash
npm test -- __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-dashboard-panel.test.tsx __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Verify UI Lab mock data isolation**

Run:

```bash
rg -n "mock-data|supplyBackpackMock" components/gamification/production/SupplyBackpackPanel.tsx __tests__/supply-production-backpack-panel.test.tsx
```

Expected: no matches.

- [ ] **Step 4: Inspect git status without staging**

Run:

```bash
git status --short
```

Expected: task 12 files appear as untracked or modified. Existing task 10/11 untracked files may still appear because earlier staging was blocked by git index permissions.

## Self-Review Checklist

- Spec coverage: capacity, grouped inventory, selected detail, regular item use, real-world redemption, today effects, no shell/API wiring.
- Placeholder scan: no TBD/TODO/fill-in-later language.
- Type consistency: prop names match the spec and component implementation.
- Isolation: no UI Lab mock data imports.
