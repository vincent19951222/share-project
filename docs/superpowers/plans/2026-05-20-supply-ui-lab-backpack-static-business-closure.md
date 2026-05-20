# Supply UI Lab Backpack Static Business Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Supply UI Lab `背包` page into a static but business-consistent inventory screen with shared catalog data, fixed `18/60` capacity, local item detail switching, local pagination, and local action feedback.

**Architecture:** Keep the page isolated under `components/gamification/ui-lab/supply-backpack/`, but source all business fixture data from the shared Supply UI Lab data layer produced by earlier tasks. The mock owns only Backpack presentation shape, the scene owns only local UI state, and no API route, Prisma model, or production `SupplyStation` behavior is changed.

**Tech Stack:** Next.js 15 App Router, React 19 client component state, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab CSS and primitives.

---

## Scope

This plan implements the approved task-level spec:

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-05-backpack-design.md`

It is the focused execution plan for Task 5 from:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

## Assumptions

Tasks 1-4 are already complete or in progress. The following shared files already exist and should be reused:

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/catalog.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `components/gamification/ui-lab/supply-data/effects.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`

The worktree may contain dirty Dashboard task changes. During this task, stage and commit only the Backpack files, Backpack tests, and the Backpack CSS slice in `app/globals.css`.

Do not try to make the global static business closure guardrail pass in this task. It may still fail because Shop, Draw Pool, Task Record, and Team Goal cleanup tasks are later work.

## File Structure

- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`
  - Use shared resource and active effect types.
  - Replace locked slots with empty slots.
  - Add `itemDetails` so local item selection can switch the detail panel without mutating inventory.
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
  - Import `supplyUiLabCatalog`, `supplyUiLabResources.backpack`, and `supplyUiLabActiveEffects`.
  - Build 60 total slots: 12 catalog item slots and 48 empty slots.
  - Keep only 20 visible slots per page through scene slicing.
  - Remove old backpack-specific asset fixture lists and old vocabulary.
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
  - Add `"use client";`.
  - Add local state for `page`, `selectedItemId`, and action feedback.
  - Slice 20 visible grid cells per page.
  - Remove expansion/help controls and locked slot rendering.
  - Wire item click, pagination click, use click, and redemption click to local UI state.
- Modify: `app/globals.css`
  - Replace locked slot styling with empty slot styling.
  - Add action feedback styling.
  - Add image row support for shared active effect icons.
- Modify: `__tests__/supply-backpack-mock-data.test.ts`
  - Assert shared resources/effects, catalog-derived slots, 60 capacity, 3 pages, and banned vocabulary removal.
- Modify: `__tests__/supply-backpack-scene.test.tsx`
  - Assert 20 visible cells, 8 empty cells on page 1, no locked cells, local selection, pagination, action feedback, and shop route.
- Modify: `__tests__/supply-backpack-assets.test.ts`
  - Assert rendered inventory/detail assets exist through catalog-backed mock data.
- Modify: `__tests__/supply-backpack-scene-css.test.ts`
  - Assert empty slot and feedback styles exist, and old locked-slot CSS is gone.

## Task 1: Update Backpack Contract Tests First

**Files:**
- Modify: `__tests__/supply-backpack-mock-data.test.ts`
- Modify: `__tests__/supply-backpack-scene.test.tsx`
- Modify: `__tests__/supply-backpack-assets.test.ts`
- Modify: `__tests__/supply-backpack-scene-css.test.ts`

- [ ] **Step 1: Replace the Backpack mock data test**

Replace the full contents of `__tests__/supply-backpack-mock-data.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";
import { supplyUiLabCatalog } from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";

describe("supply backpack mock data", () => {
  it("uses shared Phase 2 resources, effects, and fixed 60-slot capacity", () => {
    const serializedMock = JSON.stringify(supplyBackpackMock);

    expect(supplyBackpackMock.topBar.resources).toBe(supplyUiLabResources.backpack);
    expect(supplyBackpackMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyBackpackMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyBackpackMock.sidebar.capacity).toBe("18/60");
    expect(supplyBackpackMock.sidebar.todayEffects).toBe(supplyUiLabActiveEffects);
    expect(supplyBackpackMock.inventory.page).toBe(1);
    expect(supplyBackpackMock.inventory.pageSize).toBe(20);
    expect(supplyBackpackMock.inventory.totalSlots).toBe(60);
    expect(supplyBackpackMock.inventory.totalPages).toBe(3);
    expect(supplyBackpackMock.inventory.slots).toHaveLength(60);
    expect(supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "item")).toHaveLength(12);
    expect(supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "empty")).toHaveLength(48);
    expect(serializedMock).not.toContain("locked");
    expect(serializedMock).not.toContain("扩容");
    expect(serializedMock).not.toContain("帮助中心");
    expect(serializedMock).not.toContain("体力");
    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("生命票");
  });

  it("derives inventory items and details from the shared catalog", () => {
    const itemSlots = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item] : [],
    );
    const catalogItems = supplyUiLabCatalog.filter((item) => item.inventory.quantity > 0);

    expect(itemSlots.map((item) => item.id)).toEqual(catalogItems.map((item) => item.sourceItemId));
    expect(itemSlots.map((item) => item.quantity)).toEqual(
      catalogItems.map((item) => item.inventory.quantity),
    );
    expect(supplyBackpackMock.itemDetails.map((detail) => detail.itemId)).toEqual(
      catalogItems.map((item) => item.sourceItemId),
    );
    expect(supplyBackpackMock.selectedItemDetail).toMatchObject({
      itemId: "task_reroll_coupon",
      name: "任务换班券",
      ownedQuantity: 2,
      tag: "任务",
      requiresAdminConfirmation: false,
    });
  });

  it("keeps catalog rarity and real-world redemption semantics available", () => {
    const items = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item] : [],
    );
    const coffeeDetail = supplyBackpackMock.itemDetails.find(
      (detail) => detail.itemId === "luckin_coffee_coupon",
    );

    expect(new Set(items.map((item) => item.rarity))).toEqual(new Set(["N", "R", "SR", "SSR"]));
    expect(items.find((item) => item.id === "luckin_coffee_coupon")).toMatchObject({
      name: "瑞幸咖啡券",
      quantity: 1,
      rarity: "SR",
      categoryId: "real",
    });
    expect(coffeeDetail).toMatchObject({
      itemId: "luckin_coffee_coupon",
      secondaryAction: "申请兑换",
      requiresAdminConfirmation: true,
      redemptionStateLabel: "等待管理员确认",
    });
  });
});
```

- [ ] **Step 2: Replace the Backpack scene test**

Replace the full contents of `__tests__/supply-backpack-scene.test.tsx` with:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("SupplyBackpackScene", () => {
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

  it("renders the shared compact topbar and Phase 2 backpack surfaces", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    expect(container.querySelector(".supply-backpack-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar--breadcrumb")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-brand")?.textContent).toContain("牛马补给站");
    expect(container.querySelector(".supply-ui-lab-breadcrumb-current")?.textContent).toBe("背包");
    expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector(".supply-ui-lab-close")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelector("nav[aria-label='背包分类']")).not.toBeNull();
    expect(container.querySelector("[role='grid'][aria-label='背包库存']")).not.toBeNull();
    expect(container.querySelector(".supply-backpack-detail[aria-label='道具详情']")).not.toBeNull();
    expect(container.textContent).toContain("小提示：");
    expect(container.textContent).not.toContain("扩容");
    expect(container.textContent).not.toContain("帮助中心");
    expect(container.textContent).not.toContain("体力");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("生命票");
  });

  it("renders 20 visible slots per page with empty cells instead of locked cells", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const grid = container.querySelector("[role='grid'][aria-label='背包库存']");

    expect(grid?.querySelectorAll("[role='gridcell']")).toHaveLength(20);
    expect(grid?.querySelectorAll("[role='gridcell'][aria-label*='持有']")).toHaveLength(12);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-empty")).toHaveLength(8);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-locked")).toHaveLength(0);
    expect(
      grid?.querySelector("[role='gridcell'][aria-label*='任务换班券']")?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(container.querySelector(".supply-backpack-pagination")?.textContent).toContain("1 / 3");
  });

  it("switches pages locally without changing the fixed 20-cell grid", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const nextPage = container.querySelector<HTMLButtonElement>("button[aria-label='下一页']");
    const previousPage = container.querySelector<HTMLButtonElement>("button[aria-label='上一页']");

    expect(previousPage?.disabled).toBe(true);
    expect(nextPage?.disabled).toBe(false);

    await act(async () => {
      nextPage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const grid = container.querySelector("[role='grid'][aria-label='背包库存']");
    expect(container.querySelector(".supply-backpack-pagination")?.textContent).toContain("2 / 3");
    expect(grid?.querySelectorAll("[role='gridcell']")).toHaveLength(20);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-empty")).toHaveLength(20);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-locked")).toHaveLength(0);
  });

  it("switches selected item detail locally when an inventory item is clicked", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const coffeeSlot = container.querySelector<HTMLButtonElement>(
      "[role='gridcell'][aria-label*='瑞幸咖啡券']",
    );

    await act(async () => {
      coffeeSlot?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const detail = container.querySelector(".supply-backpack-detail");

    expect(coffeeSlot?.getAttribute("aria-selected")).toBe("true");
    expect(detail?.querySelector("h2")?.textContent).toBe("瑞幸咖啡券");
    expect(detail?.querySelector("img")?.getAttribute("src")).toBe(
      "/gamification/rewards/icons/luckin_coffee_coupon.png",
    );
    expect(detail?.textContent).toContain("持有 1");
    expect(detail?.textContent).toContain("真实福利");
    expect(detail?.textContent).toContain("管理员确认后兑换 1 杯瑞幸咖啡");
  });

  it("shows local feedback for use and redemption actions and keeps shop CTA in UI Lab", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const actions = Array.from(container.querySelectorAll<HTMLButtonElement>(".supply-backpack-actions button"));
    expect(actions.map((button) => button.getAttribute("type"))).toEqual(["button", "button"]);
    expect(actions.map((button) => button.textContent)).toEqual(["今日使用", "申请兑换"]);

    await act(async () => {
      actions[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='status']")?.textContent).toContain("今日使用已模拟");

    await act(async () => {
      actions[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='status']")?.textContent).toContain("申请兑换已模拟");
    expect(container.querySelector(".supply-backpack-shop-cta a")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard/shop",
    );
  });
});
```

- [ ] **Step 3: Replace the Backpack asset test**

Replace the full contents of `__tests__/supply-backpack-assets.test.ts` with:

```typescript
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

const projectPath = (publicPath: string) => `public${decodeURIComponent(publicPath)}`;

describe("supply backpack static assets", () => {
  it("does not expose old cropped prototype or legacy backpack item assets", () => {
    const serializedMock = JSON.stringify(supplyBackpackMock);

    expect(serializedMock).not.toContain("backpack-sidebar-panel");
    expect(serializedMock).not.toContain("backpack-inventory-panel");
    expect(serializedMock).not.toContain("backpack-detail-panel");
    expect(serializedMock).not.toContain("/assets/home-scenes/supply/backpack/");
    expect(serializedMock).not.toContain("/assets/home-scenes/supply/shop/");
  });

  it("has all catalog-backed inventory and detail assets available", () => {
    const inventoryImages = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item.image] : [],
    );
    const detailImages = supplyBackpackMock.itemDetails.map((detail) => detail.image);
    const assets = [...new Set([...inventoryImages, ...detailImages])];

    expect(assets).toHaveLength(12);

    for (const asset of assets) {
      const filePath = projectPath(asset);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
      expect(statSync(filePath).size, `${filePath} should stay under 100 KB`).toBeLessThanOrEqual(
        100 * 1024,
      );
    }
  });
});
```

- [ ] **Step 4: Update the Backpack CSS contract test**

Replace the first CSS test in `__tests__/supply-backpack-scene-css.test.ts` with:

```typescript
it("defines backpack scene layers and empty inventory states", () => {
  expect(css).toContain(".supply-backpack-scene");
  expect(css).toContain(".supply-backpack-shell");
  expect(css).toContain(".supply-ui-lab-topbar--breadcrumb");
  expect(css).toContain(".supply-backpack-sidebar-card");
  expect(css).toContain(".supply-backpack-grid");
  expect(css).toContain(".supply-backpack-detail");
  expect(css).toContain(".supply-backpack-hint");
  expect(css).toContain(".supply-backpack-slot.is-selected");
  expect(css).toContain(".supply-backpack-slot.is-empty");
  expect(css).toContain(".supply-backpack-action-feedback");
  expect(css).not.toContain(".supply-backpack-slot.is-locked");
});
```

In the second CSS test, add these expectations after `const backpackBlock = ...`:

```typescript
expect(backpackBlock).not.toContain("supply-backpack-expand-control");
expect(backpackBlock).not.toContain("supply-backpack-info-control");
expect(backpackBlock).not.toContain("is-locked");
```

- [ ] **Step 5: Run the focused Backpack tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: FAIL. Failures should mention old `18/40`, old `补给券`, locked slots, old backpack assets, missing `itemDetails`, missing local pagination, or missing action feedback.

## Task 2: Update Backpack Types And Mock Data

**Files:**
- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`

- [ ] **Step 1: Replace the Backpack type file**

Replace the full contents of `components/gamification/ui-lab/supply-backpack/types.ts` with:

```typescript
import type {
  SupplyUiLabActiveEffect,
  SupplyUiLabCatalogCategory,
  SupplyUiLabCatalogRarity,
  SupplyUiLabResource,
} from "../supply-data/types";

export type SupplyBackpackRarity = SupplyUiLabCatalogRarity;
export type SupplyBackpackCategoryId = "all" | "boost" | "task" | "social" | "real";

export type SupplyBackpackResource = SupplyUiLabResource;

export type SupplyBackpackCategory = {
  id: SupplyBackpackCategoryId;
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyBackpackTodayEffect = SupplyUiLabActiveEffect;

export type SupplyBackpackInventoryItem = {
  id: string;
  name: string;
  image: string;
  rarity: SupplyBackpackRarity;
  categoryId: Exclude<SupplyBackpackCategoryId, "all">;
  quantity: number;
  selected: boolean;
};

export type SupplyBackpackSlot =
  | {
      type: "item";
      item: SupplyBackpackInventoryItem;
    }
  | {
      type: "empty";
      id: string;
    };

export type SupplyBackpackSelectedDetail = {
  itemId: string;
  name: string;
  rarity: SupplyBackpackRarity;
  tag: string;
  ownedQuantity: number;
  image: string;
  description: string;
  effect: string;
  useTiming: string;
  restrictions: string[];
  primaryAction: string;
  secondaryAction: string;
  shopCta: {
    label: string;
    href: string;
    description: string;
  };
  requiresAdminConfirmation: boolean;
  redemptionStateLabel?: string;
};

export type SupplyBackpackPreview = {
  topBar: {
    breadcrumb: string[];
    resources: SupplyBackpackResource[];
  };
  sidebar: {
    capacity: string;
    categories: SupplyBackpackCategory[];
    todayEffects: SupplyBackpackTodayEffect[];
  };
  sortOptions: string[];
  selectedSort: string;
  inventory: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalSlots: number;
    slots: SupplyBackpackSlot[];
  };
  itemDetails: SupplyBackpackSelectedDetail[];
  selectedItemDetail: SupplyBackpackSelectedDetail;
  hint: string;
};

export type SupplyBackpackCategoryMap = Record<
  SupplyUiLabCatalogCategory,
  Exclude<SupplyBackpackCategoryId, "all">
>;
```

- [ ] **Step 2: Replace the Backpack mock data file**

Replace the full contents of `components/gamification/ui-lab/supply-backpack/mock-data.ts` with:

```typescript
import { supplyUiLabCatalog } from "../supply-data/catalog";
import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
import type {
  SupplyBackpackCategoryMap,
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackSelectedDetail,
  SupplyBackpackSlot,
} from "./types";
import type { SupplyUiLabCatalogItem, SupplyUiLabUseTiming } from "../supply-data/types";

const BACKPACK_TOTAL_SLOTS = 60;
const BACKPACK_PAGE_SIZE = 20;

const categoryMap: SupplyBackpackCategoryMap = {
  boost: "boost",
  protection: "boost",
  social: "social",
  task: "task",
  real_world: "real",
};

const categoryTag = {
  boost: "增益",
  protection: "保护",
  social: "社交",
  task: "任务",
  real_world: "真实福利",
} satisfies Record<SupplyUiLabCatalogItem["category"], string>;

const useTimingLabel = {
  today: "今日使用，效果截止今日 23:59",
  instant: "点击后立即展示本地预览反馈",
  manual_redemption: "申请兑换后等待管理员确认",
} satisfies Record<SupplyUiLabUseTiming, string>;

const buildRestrictions = (item: SupplyUiLabCatalogItem) => {
  const restrictions: string[] = [];

  if (item.shop.dailyLimit) {
    restrictions.push(`每日最多使用或兑换 ${item.shop.dailyLimit} 次`);
  }

  if (item.shop.weeklyLimit) {
    restrictions.push(`每周最多使用或兑换 ${item.shop.weeklyLimit} 次`);
  }

  if (item.useTiming === "today") {
    restrictions.push("仅影响今日本地预览效果");
  }

  if (item.useTiming === "instant") {
    restrictions.push("当前静态页只展示模拟反馈，不写入库存");
  }

  if (item.shop.requiresAdminConfirmation) {
    restrictions.push("真实福利需管理员确认后发放");
  }

  return restrictions.length > 0 ? restrictions : ["当前静态页只展示模拟反馈，不写入库存"];
};

const toInventoryItem = (item: SupplyUiLabCatalogItem): SupplyBackpackInventoryItem => ({
  id: item.sourceItemId,
  name: item.name,
  image: item.media.image,
  rarity: item.rarity,
  categoryId: categoryMap[item.category],
  quantity: item.inventory.quantity,
  selected: item.inventory.selected,
});

const toDetail = (item: SupplyUiLabCatalogItem): SupplyBackpackSelectedDetail => ({
  itemId: item.sourceItemId,
  name: item.name,
  rarity: item.rarity,
  tag: categoryTag[item.category],
  ownedQuantity: item.inventory.quantity,
  image: item.media.image,
  description: item.description,
  effect: item.effectSummary,
  useTiming: useTimingLabel[item.useTiming],
  restrictions: buildRestrictions(item),
  primaryAction: "今日使用",
  secondaryAction: "申请兑换",
  shopCta: {
    label: "去商店",
    href: "/ui-lab/supply-dashboard/shop",
    description: "前往补给商店查看同源道具与兑换入口",
  },
  requiresAdminConfirmation: item.shop.requiresAdminConfirmation,
  redemptionStateLabel: item.shop.requiresAdminConfirmation ? "等待管理员确认" : undefined,
});

const catalogInventoryItems = supplyUiLabCatalog.filter((item) => item.inventory.quantity > 0);

const itemSlots: SupplyBackpackSlot[] = catalogInventoryItems.map((item) => ({
  type: "item",
  item: toInventoryItem(item),
}));

const emptySlots: SupplyBackpackSlot[] = Array.from(
  { length: BACKPACK_TOTAL_SLOTS - itemSlots.length },
  (_, index) => ({
    type: "empty",
    id: `empty-${index + 1}`,
  }),
);

const itemDetails = catalogInventoryItems.map(toDetail);
const selectedItemDetail =
  itemDetails.find((detail) =>
    catalogInventoryItems.some(
      (item) => item.sourceItemId === detail.itemId && item.inventory.selected,
    ),
  ) ?? itemDetails[0];

export const supplyBackpackMock: SupplyBackpackPreview = {
  topBar: {
    breadcrumb: ["牛马补给站", "背包"],
    resources: supplyUiLabResources.backpack,
  },
  sidebar: {
    capacity: "18/60",
    categories: [
      { id: "all", label: "全部", icon: "▦", active: true },
      { id: "boost", label: "增益", icon: "✧", active: false },
      { id: "task", label: "任务", icon: "▣", active: false },
      { id: "social", label: "社交", icon: "♟", active: false },
      { id: "real", label: "真实福利", icon: "▤", active: false },
    ],
    todayEffects: supplyUiLabActiveEffects,
  },
  sortOptions: ["按稀有度", "按数量", "按获得时间"],
  selectedSort: "按稀有度",
  inventory: {
    page: 1,
    pageSize: BACKPACK_PAGE_SIZE,
    totalPages: BACKPACK_TOTAL_SLOTS / BACKPACK_PAGE_SIZE,
    totalSlots: BACKPACK_TOTAL_SLOTS,
    slots: [...itemSlots, ...emptySlots],
  },
  itemDetails,
  selectedItemDetail,
  hint: "静态预览只模拟本地交互，不会消耗库存；真实福利后续接入管理员确认流程。",
};
```

- [ ] **Step 3: Run mock and asset tests**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts
```

Expected: PASS for mock data and assets. Scene and CSS tests may still fail until Tasks 3-4.

## Task 3: Convert Backpack Scene To Local State

**Files:**
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`

- [ ] **Step 1: Add client component state**

At the top of `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`, add `"use client";`, replace the imports with:

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackRarity,
  SupplyBackpackSelectedDetail,
  SupplyBackpackSlot,
} from "./types";
```

- [ ] **Step 2: Replace `SupplyBackpackScene` with local state wiring**

Replace the current `SupplyBackpackScene` function with:

```tsx
export function SupplyBackpackScene({ data }: { data: SupplyBackpackPreview }) {
  const [brandLabel = "牛马补给站", activeLabel = "背包"] = data.topBar.breadcrumb;
  const [page, setPage] = useState(data.inventory.page);
  const [selectedItemId, setSelectedItemId] = useState(data.selectedItemDetail.itemId);
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const selectedDetail =
    useMemo(
      () => data.itemDetails.find((detail) => detail.itemId === selectedItemId),
      [data.itemDetails, selectedItemId],
    ) ?? data.selectedItemDetail;

  return (
    <main className="supply-backpack-scene" aria-label="牛马补给站背包静态原型">
      <div className="supply-backpack-background" aria-hidden="true" />
      <div className="supply-backpack-content">
        <SupplyUiLabTopBar
          activeLabel={activeLabel}
          brandLabel={brandLabel}
          closeHref="/ui-lab/supply-dashboard"
          resources={data.topBar.resources}
          variant="breadcrumb"
        />
        <section className="supply-backpack-shell" aria-label="背包静态复刻">
          <BackpackSidebar data={data} />
          <BackpackInventoryPanel
            data={data}
            page={page}
            selectedItemId={selectedItemId}
            onPageChange={setPage}
            onSelectItem={(itemId) => {
              setSelectedItemId(itemId);
              setActionLabel(null);
            }}
          />
          <BackpackDetailPanel
            actionLabel={actionLabel}
            detail={selectedDetail}
            onAction={setActionLabel}
          />
        </section>
        <BackpackHintBar hint={data.hint} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Remove expansion and info controls from the sidebar**

Inside `BackpackSidebar`, replace the `supply-backpack-sidebar-controls` block with:

```tsx
<div className="supply-backpack-sidebar-controls" aria-label="背包操作">
  <Link href="/ui-lab/supply-dashboard" className="supply-backpack-back-link">
    返回大厅
  </Link>
</div>
```

Also replace each today effect row with:

```tsx
<div className="supply-backpack-effect-row" key={effect.id}>
  <Image alt="" height={32} src={effect.icon} unoptimized width={32} />
  <b>{effect.label}</b>
  <strong>{effect.statusLabel}</strong>
  <time>{effect.endsAtLabel}</time>
  <small>{effect.effectSummary}</small>
</div>
```

- [ ] **Step 4: Replace `BackpackInventoryPanel` with visible-page slicing**

Replace the current `BackpackInventoryPanel` function with:

```tsx
function BackpackInventoryPanel({
  data,
  page,
  selectedItemId,
  onPageChange,
  onSelectItem,
}: {
  data: SupplyBackpackPreview;
  page: number;
  selectedItemId: string;
  onPageChange: (page: number) => void;
  onSelectItem: (itemId: string) => void;
}) {
  const startIndex = (page - 1) * data.inventory.pageSize;
  const visibleSlots = data.inventory.slots.slice(startIndex, startIndex + data.inventory.pageSize);

  return (
    <section className="supply-backpack-inventory-panel" aria-label="库存面板">
      <div className="supply-backpack-inventory-toolbar">
        <h2>库存</h2>
        <label className="supply-backpack-sort-control">
          <span>排序</span>
          <select aria-label="库存排序" defaultValue={data.selectedSort}>
            {data.sortOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="supply-backpack-grid" role="grid" aria-label="背包库存">
        {visibleSlots.map((slot) => (
          <InventorySlot
            key={slot.type === "item" ? slot.item.id : slot.id}
            selectedItemId={selectedItemId}
            slot={slot}
            onSelectItem={onSelectItem}
          />
        ))}
      </div>
      <div className="supply-backpack-pagination" aria-label="背包分页">
        <button
          type="button"
          disabled={page === 1}
          aria-label="上一页"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          ‹
        </button>
        <span>
          {page} / {data.inventory.totalPages}
        </span>
        <button
          type="button"
          disabled={page === data.inventory.totalPages}
          aria-label="下一页"
          onClick={() => onPageChange(Math.min(data.inventory.totalPages, page + 1))}
        >
          ›
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Replace slot rendering with item and empty states**

Replace `InventorySlot` and `InventoryItemCard` with:

```tsx
function InventorySlot({
  slot,
  selectedItemId,
  onSelectItem,
}: {
  slot: SupplyBackpackSlot;
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
}) {
  if (slot.type === "empty") {
    return <div className="supply-backpack-slot is-empty" role="gridcell" aria-label="空背包格" />;
  }

  return (
    <InventoryItemCard
      item={slot.item}
      selected={slot.item.id === selectedItemId}
      onSelectItem={onSelectItem}
    />
  );
}

function InventoryItemCard({
  item,
  selected,
  onSelectItem,
}: {
  item: SupplyBackpackInventoryItem;
  selected: boolean;
  onSelectItem: (itemId: string) => void;
}) {
  return (
    <button
      aria-label={`${item.name}，${item.rarity}，持有 ${item.quantity}`}
      aria-selected={selected}
      className={`supply-backpack-slot is-item ${rarityClass[item.rarity]} ${
        selected ? "is-selected" : ""
      }`}
      role="gridcell"
      type="button"
      onClick={() => onSelectItem(item.id)}
    >
      <span className="supply-backpack-rarity">{item.rarity}</span>
      <Image alt="" height={72} src={item.image} unoptimized width={72} />
      <span className="supply-backpack-item-name">{item.name}</span>
      <span className="supply-backpack-quantity">x{item.quantity}</span>
    </button>
  );
}
```

- [ ] **Step 6: Replace detail panel with controlled detail and local feedback**

Replace `BackpackDetailPanel` with:

```tsx
function BackpackDetailPanel({
  detail,
  actionLabel,
  onAction,
}: {
  detail: SupplyBackpackSelectedDetail;
  actionLabel: string | null;
  onAction: (label: string) => void;
}) {
  return (
    <section className="supply-backpack-detail" aria-label="道具详情">
      <div className="supply-backpack-detail-hero">
        <div className="supply-backpack-detail-image">
          <span>{detail.rarity}</span>
          <Image alt="" height={112} src={detail.image} unoptimized width={112} />
        </div>
        <div>
          <div className="supply-backpack-detail-title-row">
            <h2>{detail.name}</h2>
            <span>{detail.tag}</span>
          </div>
          <p>持有 {detail.ownedQuantity}</p>
        </div>
      </div>
      <p className="supply-backpack-description">{detail.description}</p>
      <div className="supply-backpack-detail-rule">
        <h3>效果</h3>
        <p>{detail.effect}</p>
      </div>
      <div className="supply-backpack-detail-rule">
        <h3>使用时机</h3>
        <p>{detail.useTiming}</p>
      </div>
      <div className="supply-backpack-detail-rule">
        <h3>使用限制</h3>
        <ul>
          {detail.restrictions.map((restriction) => (
            <li key={restriction}>{restriction}</li>
          ))}
        </ul>
      </div>
      <div className="supply-backpack-actions">
        <button type="button" onClick={() => onAction(`${detail.primaryAction}已模拟`)}>
          {detail.primaryAction}
        </button>
        <button
          type="button"
          onClick={() =>
            onAction(
              detail.requiresAdminConfirmation
                ? `${detail.secondaryAction}已模拟，${detail.redemptionStateLabel ?? "等待管理员确认"}`
                : `${detail.secondaryAction}已模拟`,
            )
          }
        >
          {detail.secondaryAction}
        </button>
      </div>
      {actionLabel ? (
        <p className="supply-backpack-action-feedback" role="status">
          {detail.name}：{actionLabel}
        </p>
      ) : null}
      <div className="supply-backpack-shop-cta">
        <span>{detail.shopCta.description}</span>
        <Link href={detail.shopCta.href}>{detail.shopCta.label}</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Remove help center link from hint bar**

Replace `BackpackHintBar` with:

```tsx
function BackpackHintBar({ hint }: { hint: string }) {
  return (
    <footer className="supply-backpack-hint">
      <span aria-hidden="true">i</span>
      <b>小提示：</b>
      <p>{hint}</p>
    </footer>
  );
}
```

- [ ] **Step 8: Run scene tests**

Run:

```bash
npm test -- __tests__/supply-backpack-scene.test.tsx
```

Expected: PASS for scene behavior. CSS test may still fail until Task 4.

## Task 4: Update Backpack CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace locked slot styles with empty slot styles**

In `app/globals.css`, remove these selectors and their blocks:

```css
.supply-backpack-slot.is-locked {
  grid-template-rows: 1fr auto;
  border-color: #1f2937;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  color: #e5e7eb;
}

.supply-backpack-slot.is-locked span {
  font-size: 1.9rem;
}
```

Then add this block near `.supply-backpack-slot.is-selected`:

```css
.supply-backpack-slot.is-empty {
  min-height: 10.25rem;
  border: 2px dashed rgba(31, 41, 55, 0.32);
  background: rgba(255, 255, 255, 0.42);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.32);
}
```

- [ ] **Step 2: Update item cursor and effect icon styles**

Replace:

```css
.supply-backpack-slot.is-item {
  cursor: default;
}
```

with:

```css
.supply-backpack-slot.is-item {
  cursor: pointer;
}

.supply-backpack-effect-row img {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  image-rendering: pixelated;
}

.supply-backpack-effect-row small {
  grid-column: 2 / -1;
  font-size: 0.75rem;
  font-weight: 800;
  color: #475569;
}
```

- [ ] **Step 3: Remove sidebar control selectors for deleted controls**

Remove any CSS selectors that only target deleted controls:

```css
.supply-backpack-expand-control
.supply-backpack-info-control
```

Keep `.supply-backpack-sidebar-controls` and `.supply-backpack-back-link`, because the return link remains.

- [ ] **Step 4: Add action feedback styling**

Add this block near `.supply-backpack-actions`:

```css
.supply-backpack-action-feedback {
  margin: 0.85rem 0 0;
  border: 2px solid #16a34a;
  border-radius: 0.35rem;
  background: #dcfce7;
  padding: 0.65rem 0.8rem;
  color: #14532d;
  font-weight: 1000;
}
```

- [ ] **Step 5: Run CSS test**

Run:

```bash
npm test -- __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

## Task 5: Verify Task 5 End To End

**Files:**
- No file edits unless tests reveal a Backpack-specific issue.

- [ ] **Step 1: Run all focused Backpack tests**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run shared catalog guardrail tests**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS. If this fails because a shared fixture from tasks 1-3 is broken, stop and fix the shared data in the already-owned task file before continuing.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Check git diff for scope**

Run:

```bash
git diff -- components/gamification/ui-lab/supply-backpack app/globals.css __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: Diff only contains Backpack task changes described above. Do not stage Dashboard files or other task files in this task commit.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add components/gamification/ui-lab/supply-backpack app/globals.css __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
git commit -m "feat: close supply backpack mock interactions"
```

Expected: Commit succeeds with only Backpack task files staged.

## Self-Review Checklist

- [ ] Spec coverage: resources show `银子 / 抽奖券 / 背包 18/60`.
- [ ] Spec coverage: capacity is fixed at 60 and scene renders 20 visible cells per page.
- [ ] Spec coverage: expansion controls and locked slots are gone.
- [ ] Spec coverage: bottom hint no longer links to help center.
- [ ] Spec coverage: item click changes detail panel locally.
- [ ] Spec coverage: pagination changes pages locally.
- [ ] Spec coverage: `今日使用` and `申请兑换` produce local feedback.
- [ ] Spec coverage: today effects use `supplyUiLabActiveEffects`, matching Dashboard.
- [ ] Vocabulary check: rendered Backpack and mock data do not contain `扩容`, `帮助中心`, `体力`, `补给券`, or `生命票`.
- [ ] Scope check: no production `SupplyStation`, Prisma, API route, or non-Backpack UI Lab page changes.
