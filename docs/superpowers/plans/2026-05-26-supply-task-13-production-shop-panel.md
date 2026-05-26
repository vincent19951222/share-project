# Supply Task 13 Production Shop Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production Shop panel that renders real shop products, prices, owned quantities, purchase limits, disabled reasons, and stable purchase callbacks.

**Architecture:** Keep purchase mutations in the existing shop API and future shell wiring. This task creates a pure client component that receives `SupplyStationProductionSnapshot`, selection/action state, and callbacks, then renders shop products from the production view-model without importing UI Lab mock data.

**Tech Stack:** React 19, Next.js client component conventions, TypeScript strict mode, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-26-supply-task-13-production-shop-panel-design.md`

This task does not modify production route wiring, API routes, Prisma schema, the supply view-model builder, global CSS, or UI Lab mock-data files.

## File Structure

- Create: `components/gamification/production/SupplyShopPanel.tsx`
  - Client component.
  - Accepts `SupplyStationProductionSnapshot`, `selectedItemId`, `activeAction`, and shop callbacks.
  - Renders coins, category filters, product cards, selected product detail, and purchase button.
- Create: `__tests__/supply-production-shop-panel.test.tsx`
  - Renders fixture snapshot.
  - Verifies product rendering, prices, owned quantities, limits, disabled reasons, selection callback, and purchase callback.
- Add: `docs/superpowers/specs/2026-05-26-supply-task-13-production-shop-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-13-production-shop-panel.md`

## Task 1: Failing Production Shop Panel Test

**Files:**
- Create: `__tests__/supply-production-shop-panel.test.tsx`

- [ ] **Step 1: Create the failing component test**

Create `__tests__/supply-production-shop-panel.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyShopPanel } from "@/components/gamification/production/SupplyShopPanel";
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
    groups: [],
    todayEffects: [],
    emptyMessage: "暂无补给",
    capacity: { usedSlots: 2, totalSlots: 60 },
  },
  shop: {
    products: [
      {
        itemId: "small_boost_coupon",
        name: "小额增益券",
        description: "今日健身收益提高 50%。",
        category: "boost",
        priceCoins: 180,
        ownedQuantity: 1,
        dailyLimit: 2,
        weeklyLimit: 5,
        purchaseEnabled: true,
        purchaseDisabledReason: null,
        requiresAdminConfirmation: false,
      },
      {
        itemId: "disabled_reward_coupon",
        name: "下架福利券",
        description: "这个商品暂时不能购买。",
        category: "real_world",
        priceCoins: 800,
        ownedQuantity: 0,
        dailyLimit: 1,
        purchaseEnabled: false,
        purchaseDisabledReason: "商品配置不可用",
        requiresAdminConfirmation: true,
      },
    ],
  },
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

describe("SupplyShopPanel", () => {
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

  it("renders products, prices, owned quantities, limits, and admin confirmation labels", async () => {
    await act(async () => {
      root.render(
        <SupplyShopPanel
          activeAction={null}
          selectedItemId={null}
          onPurchase={vi.fn()}
          onSelectItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("2,450");
    expect(container.textContent).toContain("小额增益券");
    expect(container.textContent).toContain("银子 180");
    expect(container.textContent).toContain("持有 1");
    expect(container.textContent).toContain("每日限购 2");
    expect(container.textContent).toContain("每周限购 5");
    expect(container.textContent).toContain("下架福利券");
    expect(container.textContent).toContain("管理员确认");
    expect(container.querySelectorAll("[data-testid='supply-shop-product']")).toHaveLength(2);
  });

  it("selects products and purchases enabled products", async () => {
    const onSelectItem = vi.fn();
    const onPurchase = vi.fn();

    await act(async () => {
      root.render(
        <SupplyShopPanel
          activeAction={null}
          selectedItemId="small_boost_coupon"
          onPurchase={onPurchase}
          onSelectItem={onSelectItem}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-testid='supply-shop-product'][data-item-id='disabled_reward_coupon']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelectItem).toHaveBeenCalledWith("disabled_reward_coupon");

    container
      .querySelector<HTMLButtonElement>("[data-action='purchase-shop-item']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onPurchase).toHaveBeenCalledWith("small_boost_coupon");
  });

  it("disables unavailable products and exposes the disabled reason", async () => {
    const onPurchase = vi.fn();

    await act(async () => {
      root.render(
        <SupplyShopPanel
          activeAction={null}
          selectedItemId="disabled_reward_coupon"
          onPurchase={onPurchase}
          onSelectItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("[data-action='purchase-shop-item']");

    expect(container.textContent).toContain("商品配置不可用");
    expect(button?.disabled).toBe(true);

    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onPurchase).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-shop-panel.test.tsx
```

Expected: FAIL because `components/gamification/production/SupplyShopPanel.tsx` does not exist.

## Task 2: Production Shop Panel Component

**Files:**
- Create: `components/gamification/production/SupplyShopPanel.tsx`
- Test: `__tests__/supply-production-shop-panel.test.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gamification/production/SupplyShopPanel.tsx`:

```typescript
"use client";

import { useMemo, useState } from "react";

import type {
  GamificationBackpackCategory,
  SupplyShopProductSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyShopAction = "purchase-shop-item";

export interface SupplyShopPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyShopAction | string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onPurchase: (itemId: string) => void;
}

type CategoryFilter = "all" | GamificationBackpackCategory;

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatCategoryLabel(category: GamificationBackpackCategory) {
  const labels: Partial<Record<GamificationBackpackCategory, string>> = {
    boost: "增益",
    protection: "保护",
    task: "任务",
    social: "社交",
    real_world: "真实福利",
    unknown: "未知",
  };

  return labels[category] ?? category;
}

function formatLimit(product: SupplyShopProductSnapshot) {
  const limits = [];

  if (product.dailyLimit !== undefined) {
    limits.push(`每日限购 ${formatNumber(product.dailyLimit)}`);
  }

  if (product.weeklyLimit !== undefined) {
    limits.push(`每周限购 ${formatNumber(product.weeklyLimit)}`);
  }

  return limits;
}

function getFilteredProducts(
  products: SupplyShopProductSnapshot[],
  category: CategoryFilter,
) {
  if (category === "all") {
    return products;
  }

  return products.filter((product) => product.category === category);
}

function getSelectedProduct(
  products: SupplyShopProductSnapshot[],
  selectedItemId: string | null,
) {
  return products.find((product) => product.itemId === selectedItemId) ?? products[0] ?? null;
}

export function SupplyShopPanel({
  activeAction,
  onPurchase,
  onSelectItem,
  selectedItemId,
  snapshot,
}: SupplyShopPanelProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const products = snapshot.shop.products;
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );
  const filteredProducts = getFilteredProducts(products, category);
  const selectedProduct = getSelectedProduct(filteredProducts, selectedItemId);
  const isBusy = activeAction !== null;

  return (
    <section className="supply-production-shop" aria-label="补给商店">
      <header className="supply-production-shop__header">
        <div>
          <p>牛马补给站</p>
          <h2>补给商店</h2>
        </div>
        <article className="supply-production-shop__wallet" aria-label="银子余额">
          <span>{snapshot.resources.coins.label}</span>
          <strong>{formatNumber(snapshot.resources.coins.value)}</strong>
        </article>
      </header>

      <nav className="supply-production-shop__filters" aria-label="商品分类">
        <button
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
          type="button"
        >
          全部
        </button>
        {categories.map((categoryKey) => (
          <button
            aria-pressed={category === categoryKey}
            key={categoryKey}
            onClick={() => setCategory(categoryKey)}
            type="button"
          >
            {formatCategoryLabel(categoryKey)}
          </button>
        ))}
      </nav>

      <div className="supply-production-shop__layout">
        <section className="supply-production-shop__catalog" aria-label="商品列表">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const limits = formatLimit(product);

              return (
                <button
                  aria-selected={selectedProduct?.itemId === product.itemId}
                  className="supply-production-shop__product"
                  data-item-id={product.itemId}
                  data-testid="supply-shop-product"
                  key={product.itemId}
                  onClick={() => onSelectItem(product.itemId)}
                  type="button"
                >
                  <strong>{product.name}</strong>
                  <span>{formatCategoryLabel(product.category)}</span>
                  <p>{product.description}</p>
                  <small>银子 {formatNumber(product.priceCoins)}</small>
                  <small>持有 {formatNumber(product.ownedQuantity)}</small>
                  {limits.map((limit) => (
                    <small key={limit}>{limit}</small>
                  ))}
                  {product.requiresAdminConfirmation ? <small>管理员确认</small> : null}
                  {!product.purchaseEnabled && product.purchaseDisabledReason ? (
                    <small>{product.purchaseDisabledReason}</small>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p>补给商店暂时没有可购买商品</p>
          )}
        </section>

        <section className="supply-production-shop__detail" aria-label="商品详情">
          {selectedProduct ? (
            <article>
              <header>
                <span>{formatCategoryLabel(selectedProduct.category)}</span>
                <h3>{selectedProduct.name}</h3>
                <p>银子 {formatNumber(selectedProduct.priceCoins)}</p>
              </header>
              <p>{selectedProduct.description}</p>
              <dl>
                <div>
                  <dt>当前持有</dt>
                  <dd>{formatNumber(selectedProduct.ownedQuantity)}</dd>
                </div>
                {formatLimit(selectedProduct).map((limit) => (
                  <div key={limit}>
                    <dt>购买限制</dt>
                    <dd>{limit}</dd>
                  </div>
                ))}
                {selectedProduct.requiresAdminConfirmation ? (
                  <div>
                    <dt>兑换方式</dt>
                    <dd>管理员确认</dd>
                  </div>
                ) : null}
              </dl>
              {!selectedProduct.purchaseEnabled && selectedProduct.purchaseDisabledReason ? (
                <p>{selectedProduct.purchaseDisabledReason}</p>
              ) : null}
              <button
                data-action="purchase-shop-item"
                disabled={isBusy || !selectedProduct.purchaseEnabled}
                onClick={() => onPurchase(selectedProduct.itemId)}
                type="button"
              >
                {activeAction === "purchase-shop-item"
                  ? "购买中"
                  : selectedProduct.purchaseEnabled
                    ? "购买"
                    : "暂不可买"}
              </button>
            </article>
          ) : (
            <p>补给商店暂时没有可购买商品</p>
          )}
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-production-shop-panel.test.tsx
```

Expected: PASS.

## Task 3: Regression Checks

**Files:**
- Check: `components/gamification/production/SupplyShopPanel.tsx`
- Check: `__tests__/supply-production-shop-panel.test.tsx`

- [ ] **Step 1: Verify production panel tests together**

Run:

```bash
npm test -- __tests__/supply-production-shop-panel.test.tsx __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Verify lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Check for UI Lab mock imports**

Run:

```bash
rg -n "mock-data|supplyShopMock" components/gamification/production/SupplyShopPanel.tsx __tests__/supply-production-shop-panel.test.tsx
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add components/gamification/production/SupplyShopPanel.tsx __tests__/supply-production-shop-panel.test.tsx docs/superpowers/specs/2026-05-26-supply-task-13-production-shop-panel-design.md docs/superpowers/plans/2026-05-26-supply-task-13-production-shop-panel.md
git commit -m "feat: add production supply shop panel"
```

## Self-Review

- Spec coverage: The plan covers product rendering, prices, owned quantities, limits, disabled reasons, selection, purchase callback, empty state, and UI Lab mock isolation.
- Placeholder scan: No placeholders remain.
- Type consistency: Component props and test fixture use `SupplyStationProductionSnapshot` and `SupplyShopProductSnapshot` fields already present in `lib/types.ts`.
