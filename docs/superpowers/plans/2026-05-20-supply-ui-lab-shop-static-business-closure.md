# Supply UI Lab Shop Static Business Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Supply UI Lab `补给商店` 改成 catalog 驱动的静态店面，让每个 active 的非银子抽奖奖励都能被购买、查看、筛选和 mock 兑换。

**Architecture:** 商店 mock 只负责把共享 `supplyUiLabCatalog.filter((item) => item.shop.buyable)` 映射成页面展示形态，不再维护独立商品池。场景组件改为 client component，局部管理分类、筛选、选中商品、规则展开和兑换反馈；所有反馈只存在本地 state，不调用 API、不修改库存、不碰生产 `SupplyStation`。

**Tech Stack:** Next.js 15 App Router, React 19 client component state, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab CSS and primitives.

---

## Scope

本计划对应任务级 spec：

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-06-shop-design.md`

它是总计划中任务 6 的聚焦执行计划：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

## Assumptions

任务 1-5 已完成或正在同一工作树中推进。以下共享文件应已存在并通过各自 focused tests：

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/catalog.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`

工作树可能已有 Dashboard 或 Backpack 任务的未提交变更。执行本任务时只 stage 和 commit 商店文件及商店测试文件，不要回滚其他任务的改动。

不要尝试在本任务中让全局 static business closure guardrail 全部通过。它可能仍会因为 Draw Pool、Task Record、Team Goal 的后续任务失败。本任务只负责移除商店自身的旧词汇、死锚点和独立商品池。

## File Structure

- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
  - 使用共享 resource、catalog category、rarity、use timing 类型。
  - 让 `SupplyShopProduct.id` 对齐共享 catalog 的 `sourceItemId`。
  - 新增 `productDetails`，支持本地商品点击切换右侧详情。
  - 新增规则展开内容与本地兑换反馈文案所需字段。
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
  - 导入 `supplyUiLabCatalog` 和 `supplyUiLabResources.shop`。
  - 用 `supplyUiLabCatalog.filter((item) => item.shop.buyable)` 生成所有商品和详情。
  - 移除装饰类、学习券、体力恢复剂、轻食便当等非抽奖池商品。
  - 移除 `补给券`，资源统一为 `银子 / 抽奖券 / 背包`。
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
  - 添加 `"use client";`。
  - 添加本地 state：`selectedCategoryId`、`selectedFilterId`、`selectedProductId`、`rulesExpanded`、`feedbackMessage`。
  - 点击分类、筛选、商品和兑换按钮时只更新本地 UI。
  - 移除 `href="#rules"` 死锚点，改为同页规则展开按钮。
- Optional Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
  - 如果当前 primitive 还没有 `onClick` prop，给 `SupplyUiLabActionButton` 补上按钮点击透传。
- Modify: `__tests__/supply-shop-mock-data.test.ts`
  - 验证商品完全来自 active buyable catalog。
  - 验证商品详情包含来源、效果、使用时机、价格、限制和持有数量。
  - 验证真实福利商品保留管理员确认语义。
  - 验证旧词汇和旧商品从 mock 中消失。
- Modify: `__tests__/supply-shop-scene.test.tsx`
  - 验证 12 个 catalog 商品可见。
  - 验证点击商品切换详情。
  - 验证分类和筛选按钮切换本地选中状态。
  - 验证兑换按钮展示 `已加入背包` 或 `兑换中` 本地反馈。
  - 验证不存在 `href="#rules"`。
- Optional Modify: `app/globals.css`
  - 只有当规则展开区或兑换反馈需要新样式时，新增 `.supply-shop-rules-toggle`、`.supply-shop-rules-panel`、`.supply-shop-action-feedback` 等商店局部样式。

## Task 1: Update Shop Contract Tests First

**Files:**
- Modify: `__tests__/supply-shop-mock-data.test.ts`
- Modify: `__tests__/supply-shop-scene.test.tsx`

- [ ] **Step 1: Replace the Shop mock data test**

Replace the full contents of `__tests__/supply-shop-mock-data.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import { supplyUiLabCatalog } from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";
import { supplyShopAssetPaths, supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

describe("supply shop mock data", () => {
  it("derives every shop product from the shared buyable catalog", () => {
    const buyableCatalogItems = supplyUiLabCatalog.filter((item) => item.shop.buyable);

    expect(supplyShopMock.topBar.resources).toBe(supplyUiLabResources.shop);
    expect(supplyShopMock.sidebar.resources).toBe(supplyUiLabResources.shop);
    expect(supplyShopMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyShopMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyShopMock.products.map((product) => product.id)).toEqual(
      buyableCatalogItems.map((item) => item.sourceItemId),
    );
    expect(supplyShopMock.products).toHaveLength(12);
    expect(supplyShopMock.products.filter((product) => product.selected)).toHaveLength(1);
    expect(supplyShopMock.products.find((product) => product.selected)?.id).toBe("task_reroll_coupon");
  });

  it("keeps every product detail aligned with catalog price, effect, limits, and inventory", () => {
    for (const catalogItem of supplyUiLabCatalog.filter((item) => item.shop.buyable)) {
      const product = supplyShopMock.products.find((candidate) => candidate.id === catalogItem.sourceItemId);
      const detail = supplyShopMock.productDetails.find(
        (candidate) => candidate.productId === catalogItem.sourceItemId,
      );

      expect(product, catalogItem.sourceItemId).toMatchObject({
        id: catalogItem.sourceItemId,
        name: catalogItem.name,
        subtitle: catalogItem.effectSummary,
        image: catalogItem.media.image,
        ownedQuantity: catalogItem.inventory.quantity,
        requiresAdminConfirmation: catalogItem.shop.requiresAdminConfirmation,
        price: { currency: "coins", amount: catalogItem.shop.priceCoins },
      });
      expect(detail, catalogItem.sourceItemId).toMatchObject({
        productId: catalogItem.sourceItemId,
        description: catalogItem.description,
        effect: catalogItem.effectSummary,
        costLabel: `银子 ${catalogItem.shop.priceCoins}`,
        sourceLabel: "来源：抽卡池 / 商店",
        ownedLabel: `持有 ${catalogItem.inventory.quantity}`,
      });
      expect(detail?.useTiming.length, catalogItem.sourceItemId).toBeGreaterThan(0);
      expect(detail?.purchaseLimit.length, catalogItem.sourceItemId).toBeGreaterThan(0);
      expect(detail?.footnote.length, catalogItem.sourceItemId).toBeGreaterThan(0);
    }
  });

  it("models real-world redemption and removes old independent shop inventory", () => {
    const serializedMock = JSON.stringify(supplyShopMock);
    const coffeeProduct = supplyShopMock.products.find((product) => product.id === "luckin_coffee_coupon");
    const coffeeDetail = supplyShopMock.productDetails.find(
      (detail) => detail.productId === "luckin_coffee_coupon",
    );

    expect(coffeeProduct).toMatchObject({
      name: "瑞幸咖啡券",
      categoryId: "real_world",
      requiresAdminConfirmation: true,
    });
    expect(coffeeDetail).toMatchObject({
      adminConfirmationLabel: "真实福利：兑换后进入管理员确认流程",
      redeemLabel: "申请兑换",
      redeemFeedback: "兑换中：已提交管理员确认",
    });
    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("体力");
    expect(serializedMock).not.toContain("生命票");
    expect(serializedMock).not.toContain("学习时长券");
    expect(serializedMock).not.toContain("体力恢复剂");
    expect(serializedMock).not.toContain("轻食便当");
    expect(serializedMock).not.toContain("头像框");
    expect(serializedMock).not.toContain("称号");
    expect(serializedMock).not.toContain("健身牛马装扮");
    expect(serializedMock).not.toMatch(/shop-(sidebar|catalog|detail|topbar)-panel/);
  });

  it("keeps only catalog media paths in the rendered product set", () => {
    expect(supplyShopAssetPaths.profileAvatar).toBe("/avatars/male1.png");
    expect(supplyShopMock.products.map((product) => product.image)).toEqual(
      supplyUiLabCatalog.filter((item) => item.shop.buyable).map((item) => item.media.image),
    );
    expect(JSON.stringify(supplyShopAssetPaths)).not.toMatch(/\/assets\/home-scenes\/supply\/shop\//);
  });
});
```

- [ ] **Step 2: Replace the Shop scene test**

Replace the full contents of `__tests__/supply-shop-scene.test.tsx` with:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyShopScene", () => {
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

  it("renders a catalog-backed shop with Phase 2 resources and no dead rules anchor", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    expect(container.querySelector(".supply-shop-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector("a.supply-shop-back-link")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelectorAll(".supply-shop-category-list button")).toHaveLength(6);
    expect(container.querySelector(".supply-shop-category-list button[aria-current='page']")?.textContent).toContain(
      "全部商品",
    );
    expect(container.querySelector(".supply-ui-lab-filterbar [role='tab'][aria-selected='true']")?.textContent).toBe(
      "全部",
    );
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(12);
    expect(container.querySelector("[data-testid='supply-shop-product-card'][aria-selected='true']")?.textContent).toContain(
      "任务换班券",
    );
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card'] img").length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
    expect(container.textContent).toContain("本页规则");
    expect(container.textContent).toContain("来源：抽卡池 / 商店");
    expect(container.textContent).toContain("持有 2");
    expect(container.textContent).toContain("银子 150");
    expect(container.textContent).toContain("本地预览：兑换不会写入后端");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("体力");
    expect(container.textContent).not.toContain("生命票");
  });

  it("switches selected product details locally", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const coffeeCard = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-shop-product-card']"),
    ).find((card) => card.textContent?.includes("瑞幸咖啡券"));

    expect(coffeeCard).toBeDefined();

    await act(async () => {
      coffeeCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(coffeeCard?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".supply-shop-detail")?.getAttribute("aria-label")).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("管理员确认后兑换 1 杯瑞幸咖啡");
    expect(container.textContent).toContain("真实福利：兑换后进入管理员确认流程");
    expect(container.querySelector(".supply-shop-redeem-button")?.textContent).toBe("申请兑换");
  });

  it("switches category and filter buttons through local state", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const realWorldCategory = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".supply-shop-category-list button"),
    ).find((button) => button.textContent?.includes("真实福利"));

    expect(realWorldCategory).toBeDefined();

    await act(async () => {
      realWorldCategory?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(realWorldCategory?.getAttribute("aria-current")).toBe("page");
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(1);
    expect(container.querySelector("[data-testid='supply-shop-product-card']")?.textContent).toContain("瑞幸咖啡券");

    const adminFilter = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".supply-ui-lab-filterbar [role='tab']"),
    ).find((button) => button.textContent === "需确认");

    expect(adminFilter).toBeDefined();

    await act(async () => {
      adminFilter?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(adminFilter?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(1);
    expect(container.querySelector("[data-testid='supply-shop-product-card']")?.textContent).toContain("瑞幸咖啡券");
  });

  it("shows local redemption feedback for virtual items and real-world rewards", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const redeemButton = container.querySelector<HTMLButtonElement>(".supply-shop-redeem-button");

    await act(async () => {
      redeemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-shop-feedback]")?.textContent).toContain("已加入背包：任务换班券");

    const coffeeCard = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-shop-product-card']"),
    ).find((card) => card.textContent?.includes("瑞幸咖啡券"));

    await act(async () => {
      coffeeCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const coffeeRedeemButton = container.querySelector<HTMLButtonElement>(".supply-shop-redeem-button");

    await act(async () => {
      coffeeRedeemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-shop-feedback]")?.textContent).toContain("兑换中：已提交管理员确认");
  });

  it("expands rules on the page without navigating to a hash target", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const rulesButton = container.querySelector<HTMLButtonElement>(".supply-shop-rules-toggle");

    expect(rulesButton?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".supply-shop-rules-panel")).toBeNull();

    await act(async () => {
      rulesButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(rulesButton?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".supply-shop-rules-panel")?.textContent).toContain("真实福利类商品会进入管理员确认");
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the focused Shop tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: FAIL. The failures should mention old `补给券` resources, 11 old products instead of 12 catalog products, missing `productDetails`, missing local click handlers, or the old `href="#rules"` anchor.

## Task 2: Update Shop Types And Catalog-Backed Mock Data

**Files:**
- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`

- [ ] **Step 1: Replace the Shop type file**

Replace the full contents of `components/gamification/ui-lab/supply-shop/types.ts` with:

```typescript
import type {
  SupplyUiLabCatalogCategory,
  SupplyUiLabCatalogRarity,
  SupplyUiLabResource,
  SupplyUiLabUseTiming,
} from "../supply-data/types";

export type SupplyShopCurrency = "coins";
export type SupplyShopRarity = SupplyUiLabCatalogRarity;
export type SupplyShopCategoryId = "all" | SupplyUiLabCatalogCategory;
export type SupplyShopFilterId = "all" | "redeemable" | "owned" | "admin";

export type SupplyShopResource = SupplyUiLabResource;

export type SupplyShopCategory = {
  id: SupplyShopCategoryId;
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyShopFilter = {
  id: SupplyShopFilterId;
  label: string;
  active: boolean;
};

export type SupplyShopProduct = {
  id: string;
  name: string;
  subtitle: string;
  categoryId: Exclude<SupplyShopCategoryId, "all">;
  categoryLabel: string;
  image: string;
  rarity: SupplyShopRarity;
  tags: string[];
  price: {
    currency: SupplyShopCurrency;
    amount: number;
  };
  ownedQuantity: number;
  sourceLabel: string;
  limitLabel: string;
  requiresAdminConfirmation: boolean;
  selected: boolean;
};

export type SupplyShopProductDetail = {
  productId: string;
  description: string;
  effect: string;
  useTiming: string;
  useTimingId: SupplyUiLabUseTiming;
  purchaseLimit: string;
  costLabel: string;
  sourceLabel: string;
  ownedLabel: string;
  adminConfirmationLabel: string | null;
  footnote: string;
  redeemLabel: string;
  redeemFeedback: string;
};

export type SupplyShopPreview = {
  topBar: {
    resources: SupplyShopResource[];
    profile: {
      username: string;
      avatar: string;
    };
  };
  sidebar: {
    categories: SupplyShopCategory[];
    resources: SupplyShopResource[];
  };
  filters: SupplyShopFilter[];
  sortOptions: string[];
  selectedSort: string;
  products: SupplyShopProduct[];
  productDetails: SupplyShopProductDetail[];
  selectedProductDetail: SupplyShopProductDetail;
  notice: string;
  rules: string[];
  initialFeedback: string;
};
```

- [ ] **Step 2: Replace the Shop mock data file**

Replace the full contents of `components/gamification/ui-lab/supply-shop/mock-data.ts` with:

```typescript
import { supplyUiLabCatalog } from "../supply-data/catalog";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyUiLabCatalogCategory, SupplyUiLabUseTiming } from "../supply-data/types";
import type {
  SupplyShopCategory,
  SupplyShopCategoryId,
  SupplyShopFilter,
  SupplyShopPreview,
  SupplyShopProduct,
  SupplyShopProductDetail,
  SupplyShopRarity,
} from "./types";

export const supplyShopAssetPaths = {
  profileAvatar: "/avatars/male1.png",
} as const;

const categoryMeta: Record<SupplyShopCategoryId, { label: string; icon: string }> = {
  all: { label: "全部商品", icon: "▦" },
  boost: { label: "增益道具", icon: "▲" },
  protection: { label: "防护道具", icon: "◆" },
  social: { label: "社交道具", icon: "✦" },
  task: { label: "任务道具", icon: "▣" },
  real_world: { label: "真实福利", icon: "★" },
};

const categoryOrder: SupplyShopCategoryId[] = ["all", "boost", "protection", "task", "social", "real_world"];

const categoryTagLabel: Record<SupplyUiLabCatalogCategory, string> = {
  boost: "增益",
  protection: "防护",
  social: "社交",
  task: "任务",
  real_world: "真实福利",
};

const rarityTagLabel: Record<SupplyShopRarity, string> = {
  N: "N",
  R: "R",
  SR: "SR",
  SSR: "SSR",
};

const useTimingLabel: Record<SupplyUiLabUseTiming, string> = {
  today: "今日生效，可在当天结算前使用",
  instant: "立即生效，兑换后进入背包预览",
  manual_redemption: "提交申请后等待管理员确认",
};

function formatLimit(item: (typeof supplyUiLabCatalog)[number]) {
  if (item.shop.dailyLimit !== undefined) {
    return `每日限购 ${item.shop.dailyLimit} 次`;
  }

  if (item.shop.weeklyLimit !== undefined) {
    return `每周限购 ${item.shop.weeklyLimit} 次`;
  }

  return "不限购";
}

function buildProduct(item: (typeof supplyUiLabCatalog)[number], index: number): SupplyShopProduct {
  const categoryLabel = categoryTagLabel[item.category];
  const limitLabel = formatLimit(item);

  return {
    id: item.sourceItemId,
    name: item.name,
    subtitle: item.effectSummary,
    categoryId: item.category,
    categoryLabel,
    image: item.media.image,
    rarity: item.rarity,
    tags: [
      rarityTagLabel[item.rarity],
      categoryLabel,
      limitLabel,
      ...(item.shop.requiresAdminConfirmation ? ["需要管理员确认"] : []),
    ],
    price: {
      currency: "coins",
      amount: item.shop.priceCoins,
    },
    ownedQuantity: item.inventory.quantity,
    sourceLabel: "来源：抽卡池 / 商店",
    limitLabel,
    requiresAdminConfirmation: item.shop.requiresAdminConfirmation,
    selected: index === 0,
  };
}

function buildProductDetail(item: (typeof supplyUiLabCatalog)[number]): SupplyShopProductDetail {
  const adminConfirmationLabel = item.shop.requiresAdminConfirmation
    ? "真实福利：兑换后进入管理员确认流程"
    : null;

  return {
    productId: item.sourceItemId,
    description: item.description,
    effect: item.effectSummary,
    useTiming: useTimingLabel[item.useTiming],
    useTimingId: item.useTiming,
    purchaseLimit: formatLimit(item),
    costLabel: `银子 ${item.shop.priceCoins}`,
    sourceLabel: "来源：抽卡池 / 商店",
    ownedLabel: `持有 ${item.inventory.quantity}`,
    adminConfirmationLabel,
    footnote: item.shop.requiresAdminConfirmation
      ? "真实福利不会直接发放到背包，本页只展示提交后的本地状态。"
      : "虚拟道具兑换后会展示本地加入背包反馈，刷新后不会保留。",
    redeemLabel: item.shop.requiresAdminConfirmation ? "申请兑换" : `兑换 ${item.name}`,
    redeemFeedback: item.shop.requiresAdminConfirmation
      ? "兑换中：已提交管理员确认"
      : `已加入背包：${item.name}`,
  };
}

const buyableCatalogItems = supplyUiLabCatalog.filter((item) => item.shop.buyable);
const products = buyableCatalogItems.map(buildProduct);
const productDetails = buyableCatalogItems.map(buildProductDetail);

const categories: SupplyShopCategory[] = categoryOrder.map((categoryId, index) => ({
  id: categoryId,
  label: categoryMeta[categoryId].label,
  icon: categoryMeta[categoryId].icon,
  active: index === 0,
}));

const filters: SupplyShopFilter[] = [
  { id: "all", label: "全部", active: true },
  { id: "redeemable", label: "可兑换", active: false },
  { id: "owned", label: "已拥有", active: false },
  { id: "admin", label: "需确认", active: false },
];

export const supplyShopMock: SupplyShopPreview = {
  topBar: {
    resources: supplyUiLabResources.shop,
    profile: {
      username: "Vincent",
      avatar: supplyShopAssetPaths.profileAvatar,
    },
  },
  sidebar: {
    categories,
    resources: supplyUiLabResources.shop,
  },
  filters,
  sortOptions: ["默认排序", "价格从低到高", "价格从高到低"],
  selectedSort: "默认排序",
  products,
  productDetails,
  selectedProductDetail: productDetails[0],
  notice: "商店商品与抽卡池 active 道具保持一致，当前页面仅做本地兑换预览。",
  rules: [
    "商品来源统一为共享 catalog，银子奖励不会作为商品出售。",
    "虚拟道具点击兑换后只展示已加入背包的本地反馈。",
    "真实福利类商品会进入管理员确认，本页只展示兑换中的本地状态。",
  ],
  initialFeedback: "本地预览：兑换不会写入后端。",
};
```

- [ ] **Step 3: Run mock data test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts
```

Expected: PASS.

## Task 3: Add Local Shop Interactions To The Scene

**Files:**
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`

- [ ] **Step 1: Replace the Shop scene component**

Replace the full contents of `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx` with:

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyShopCategoryId,
  SupplyShopFilterId,
  SupplyShopPreview,
  SupplyShopProduct,
  SupplyShopProductDetail,
} from "./types";

const rarityTone: Record<SupplyShopProduct["rarity"], "muted" | "warning" | "success"> = {
  N: "muted",
  R: "success",
  SR: "warning",
  SSR: "warning",
};

const rarityClassName: Record<SupplyShopProduct["rarity"], string> = {
  N: "common",
  R: "rare",
  SR: "sr",
  SSR: "ssr",
};

function formatPrice(product: SupplyShopProduct) {
  return `银子 ${product.price.amount}`;
}

function findDetail(data: SupplyShopPreview, productId: string): SupplyShopProductDetail {
  return (
    data.productDetails.find((detail) => detail.productId === productId) ??
    data.selectedProductDetail ??
    data.productDetails[0]
  );
}

function applyFilter(product: SupplyShopProduct, filterId: SupplyShopFilterId) {
  if (filterId === "redeemable") {
    return product.price.currency === "coins";
  }

  if (filterId === "owned") {
    return product.ownedQuantity > 0;
  }

  if (filterId === "admin") {
    return product.requiresAdminConfirmation;
  }

  return true;
}

function ShopSidebar({
  data,
  selectedCategoryId,
  onSelectCategory,
}: {
  data: SupplyShopPreview;
  selectedCategoryId: SupplyShopCategoryId;
  onSelectCategory: (categoryId: SupplyShopCategoryId) => void;
}) {
  return (
    <aside className="supply-shop-sidebar" aria-label="补给商店侧栏">
      <SupplyUiLabPixelPanel
        ariaLabel="补给商店分类"
        className="supply-shop-sidebar-card"
        title={
          <span className="supply-shop-sidebar-title">
            <span aria-hidden="true">▤</span>
            补给商店
          </span>
        }
      >
        <nav aria-label="补给商店分类" className="supply-shop-category-list">
          {data.sidebar.categories.map((category) => {
            const isActive = category.id === selectedCategoryId;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "is-active" : undefined}
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                type="button"
              >
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
        </nav>
        <div className="supply-shop-resource-card" aria-label="我的资源">
          <h3>我的资源</h3>
          {data.sidebar.resources.map((resource) => (
            <div className="supply-shop-resource-row" key={resource.id}>
              <span aria-hidden="true">{resource.icon}</span>
              <b>{resource.label}</b>
              <strong>{resource.value}</strong>
            </div>
          ))}
        </div>
        <Link className="supply-shop-back-link" href="/ui-lab/supply-dashboard">
          返回大厅
        </Link>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function ShopProductCard({
  product,
  selected,
  onSelect,
}: {
  product: SupplyShopProduct;
  selected: boolean;
  onSelect: (productId: string) => void;
}) {
  return (
    <button
      aria-label={product.name}
      aria-selected={selected}
      className={`supply-shop-product-card supply-shop-product-card--${rarityClassName[product.rarity]} ${
        selected ? "is-selected" : ""
      }`}
      data-testid="supply-shop-product-card"
      onClick={() => onSelect(product.id)}
      type="button"
    >
      <span className="supply-shop-product-image">
        <Image alt="" height={78} src={product.image} unoptimized width={78} />
      </span>
      <span className="supply-shop-product-body">
        <strong>{product.name}</strong>
        <em>{product.subtitle}</em>
        <span className="supply-shop-product-tags">
          {product.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
        <small>
          {product.sourceLabel} · {product.limitLabel}
        </small>
      </span>
      <span className="supply-shop-product-price">{formatPrice(product)}</span>
    </button>
  );
}

function ShopCatalog({
  data,
  products,
  rulesExpanded,
  selectedFilterId,
  selectedProductId,
  onRedeem,
  onSelectFilter,
  onSelectProduct,
  onToggleRules,
}: {
  data: SupplyShopPreview;
  products: SupplyShopProduct[];
  rulesExpanded: boolean;
  selectedFilterId: SupplyShopFilterId;
  selectedProductId: string;
  onRedeem: () => void;
  onSelectFilter: (filterId: string) => void;
  onSelectProduct: (productId: string) => void;
  onToggleRules: () => void;
}) {
  const filters = data.filters.map((filter) => ({
    ...filter,
    active: filter.id === selectedFilterId,
  }));

  return (
    <section className="supply-shop-catalog" aria-label="商品列表">
      <SupplyUiLabPixelPanel ariaLabel="商品列表" className="supply-shop-catalog-card">
        <div className="supply-shop-catalog-toolbar">
          <SupplyUiLabFilterBar ariaLabel="商品筛选" filters={filters} onSelect={onSelectFilter} />
          <label className="supply-shop-sort-control">
            <span>排序</span>
            <select aria-label="商品排序" defaultValue={data.selectedSort}>
              {data.sortOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="supply-shop-product-grid">
          {products.map((product) => (
            <ShopProductCard
              key={product.id}
              onSelect={onSelectProduct}
              product={product}
              selected={product.id === selectedProductId}
            />
          ))}
        </div>
        <footer className="supply-shop-notice">
          <p>{data.notice}</p>
          <div className="supply-shop-catalog-actions">
            <button
              aria-expanded={rulesExpanded}
              className="supply-shop-rules-toggle"
              onClick={onToggleRules}
              type="button"
            >
              本页规则
            </button>
            <button className="supply-shop-inline-redeem" onClick={onRedeem} type="button">
              兑换当前选中
            </button>
          </div>
          {rulesExpanded ? (
            <ol className="supply-shop-rules-panel">
              {data.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          ) : null}
        </footer>
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function ShopDetail({
  detail,
  feedbackMessage,
  onRedeem,
  product,
}: {
  detail: SupplyShopProductDetail;
  feedbackMessage: string;
  onRedeem: () => void;
  product: SupplyShopProduct;
}) {
  return (
    <aside className="supply-shop-detail" aria-label={`商品详情：${product.name}`}>
      <SupplyUiLabPixelPanel ariaLabel={`商品详情：${product.name}`} className="supply-shop-detail-card">
        <div className="supply-shop-detail-hero">
          <div className="supply-shop-detail-image">
            <SupplyUiLabStatusBadge tone={rarityTone[product.rarity]}>
              {product.rarity}
            </SupplyUiLabStatusBadge>
            <Image alt="" height={120} src={product.image} unoptimized width={120} />
          </div>
          <div>
            <h2>{product.name}</h2>
            <p>{product.subtitle}</p>
            <strong>{detail.ownedLabel}</strong>
          </div>
        </div>
        <p className="supply-shop-detail-description">{detail.description}</p>
        <dl className="supply-shop-detail-rules">
          <div>
            <dt>来源</dt>
            <dd>{detail.sourceLabel}</dd>
          </div>
          <div>
            <dt>效果</dt>
            <dd>{detail.effect}</dd>
          </div>
          <div>
            <dt>使用时机</dt>
            <dd>{detail.useTiming}</dd>
          </div>
          <div>
            <dt>购买限制</dt>
            <dd>{detail.purchaseLimit}</dd>
          </div>
        </dl>
        <div className="supply-shop-detail-cost">
          <span>花费</span>
          <strong>{detail.costLabel}</strong>
        </div>
        {detail.adminConfirmationLabel ? (
          <p className="supply-shop-admin-note">{detail.adminConfirmationLabel}</p>
        ) : null}
        <p className="supply-shop-detail-footnote">{detail.footnote}</p>
        <SupplyUiLabActionButton className="supply-shop-redeem-button" onClick={onRedeem} tone="primary">
          {detail.redeemLabel}
        </SupplyUiLabActionButton>
        <p aria-live="polite" className="supply-shop-action-feedback" data-shop-feedback>
          {feedbackMessage}
        </p>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

export function SupplyShopScene({ data }: { data: SupplyShopPreview }) {
  const initialProductId = data.selectedProductDetail.productId;
  const [selectedCategoryId, setSelectedCategoryId] = useState<SupplyShopCategoryId>("all");
  const [selectedFilterId, setSelectedFilterId] = useState<SupplyShopFilterId>("all");
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(data.initialFeedback);

  const visibleProducts = useMemo(() => {
    return data.products.filter((product) => {
      const matchesCategory = selectedCategoryId === "all" || product.categoryId === selectedCategoryId;
      return matchesCategory && applyFilter(product, selectedFilterId);
    });
  }, [data.products, selectedCategoryId, selectedFilterId]);

  const selectedProduct =
    data.products.find((product) => product.id === selectedProductId) ?? visibleProducts[0] ?? data.products[0];
  const selectedDetail = findDetail(data, selectedProduct.id);

  function handleSelectCategory(categoryId: SupplyShopCategoryId) {
    setSelectedCategoryId(categoryId);
    const nextProduct = data.products.find((product) => categoryId === "all" || product.categoryId === categoryId);
    if (nextProduct) {
      setSelectedProductId(nextProduct.id);
    }
  }

  function handleSelectFilter(filterId: string) {
    const nextFilterId = filterId as SupplyShopFilterId;
    setSelectedFilterId(nextFilterId);
    const nextProduct = data.products.find((product) => {
      const matchesCategory = selectedCategoryId === "all" || product.categoryId === selectedCategoryId;
      return matchesCategory && applyFilter(product, nextFilterId);
    });

    if (nextProduct) {
      setSelectedProductId(nextProduct.id);
    }
  }

  function handleRedeem() {
    setFeedbackMessage(selectedDetail.redeemFeedback);
  }

  return (
    <main className="supply-shop-scene" aria-label="补给商店 UI Lab">
      <div className="supply-shop-background" aria-hidden="true" />
      <div className="supply-shop-content">
        <SupplyUiLabTopBar activeLabel="补给商店" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-shop-shell" aria-label="补给商店静态复刻">
          <ShopSidebar data={data} onSelectCategory={handleSelectCategory} selectedCategoryId={selectedCategoryId} />
          <ShopCatalog
            data={data}
            onRedeem={handleRedeem}
            onSelectFilter={handleSelectFilter}
            onSelectProduct={setSelectedProductId}
            onToggleRules={() => setRulesExpanded((expanded) => !expanded)}
            products={visibleProducts}
            rulesExpanded={rulesExpanded}
            selectedFilterId={selectedFilterId}
            selectedProductId={selectedProduct.id}
          />
          <ShopDetail
            detail={selectedDetail}
            feedbackMessage={feedbackMessage}
            onRedeem={handleRedeem}
            product={selectedProduct}
          />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Fix the action button prop if needed**

If TypeScript reports that `SupplyUiLabActionButton` does not accept `onClick`, update `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx` instead of casting in the scene. Add `onClick?: () => void;` to the prop type and pass it to `<button>`:

```typescript
export function SupplyUiLabActionButton({
  ariaLabel,
  children,
  className = "",
  disabled = false,
  onClick,
  tone = "primary",
  type = "button",
}: PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit" | "reset";
}>) {
  return (
    <button
      aria-label={ariaLabel}
      className={`supply-ui-lab-action supply-ui-lab-action--${tone} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Run scene test and verify the remaining failures**

Run:

```bash
npm test -- __tests__/supply-shop-scene.test.tsx
```

Expected: PASS if existing CSS classes are sufficient for DOM tests. If it fails because role/text output differs, adjust the scene to match the test contract above rather than loosening the test.

## Task 4: Add Shop-Only Styling For Feedback And Rules

**Files:**
- Optional Modify: `app/globals.css`

- [ ] **Step 1: Inspect whether new classes already look acceptable**

Run:

```bash
rg -n "supply-shop-rules-toggle|supply-shop-rules-panel|supply-shop-action-feedback|supply-shop-admin-note|supply-shop-catalog-actions|supply-shop-inline-redeem" app/globals.css
```

Expected: no matches before this task unless another worker has already added equivalent shop styles.

- [ ] **Step 2: Add scoped Shop CSS only if the UI needs it**

If the new rules and feedback elements are unstyled, append this near the existing `.supply-shop-*` CSS block in `app/globals.css`:

```css
.supply-shop-catalog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.7rem;
}

.supply-shop-rules-toggle,
.supply-shop-inline-redeem {
  border: 2px solid #1f2937;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 2px 2px 0 #1f2937;
  color: #1f2937;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 900;
  padding: 0.45rem 0.7rem;
}

.supply-shop-inline-redeem {
  background: #fde047;
}

.supply-shop-rules-panel {
  display: grid;
  gap: 0.45rem;
  margin: 0.8rem 0 0;
  padding-left: 1.1rem;
  color: rgba(31, 41, 55, 0.82);
  font-size: 0.82rem;
  font-weight: 800;
}

.supply-shop-admin-note,
.supply-shop-action-feedback {
  border: 2px solid rgba(31, 41, 55, 0.9);
  border-radius: 0.6rem;
  background: #fef3c7;
  box-shadow: 2px 2px 0 rgba(31, 41, 55, 0.9);
  color: #1f2937;
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1.45;
  margin: 0;
  padding: 0.65rem 0.75rem;
}

.supply-shop-action-feedback {
  background: #dcfce7;
}
```

- [ ] **Step 3: Run the focused Shop tests again**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: PASS.

## Task 5: Verify Task 6 Scope And Commit

**Files:**
- Verify: `components/gamification/ui-lab/supply-shop/types.ts`
- Verify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
- Verify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Verify: `__tests__/supply-shop-mock-data.test.ts`
- Verify: `__tests__/supply-shop-scene.test.tsx`
- Optional Verify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- Optional Verify: `app/globals.css`

- [ ] **Step 1: Run focused verification**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related shared catalog verification**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: PASS for these files. If the shared catalog test fails because a previous task is unfinished, stop and finish or rebase that prerequisite before changing shop expectations.

- [ ] **Step 3: Check for banned Shop vocabulary and dead anchors**

Run:

```bash
rg -n "补给券|生命票|体力|href=\"#rules\"|学习时长券|体力恢复剂|轻食便当|头像框|称号|健身牛马装扮" components/gamification/ui-lab/supply-shop __tests__/supply-shop-*.test.*
```

Expected: no matches, except the negative assertions in tests that intentionally check these strings are absent.

- [ ] **Step 4: Review changed files**

Run:

```bash
git diff -- components/gamification/ui-lab/supply-shop/types.ts components/gamification/ui-lab/supply-shop/mock-data.ts components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx app/globals.css
```

Expected: diff only contains task 6 Shop changes plus optional primitive/CSS support. Do not stage unrelated Dashboard or Backpack work from other tasks.

- [ ] **Step 5: Commit only Task 6 files**

If `SupplyUiLabPrimitives.tsx` or `app/globals.css` were not changed, omit them from `git add`.

Run:

```bash
git add components/gamification/ui-lab/supply-shop/types.ts components/gamification/ui-lab/supply-shop/mock-data.ts components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
git commit -m "feat: align supply ui lab shop with catalog"
```

Expected: commit succeeds with only task 6 files staged.

## Self-Review Checklist

- [ ] Spec coverage: products come from `supplyUiLabCatalog.filter((item) => item.shop.buyable)`.
- [ ] Spec coverage: all active non-coin draw reward item ids appear in the shop product list.
- [ ] Spec coverage: product image, name, effect, price, limit, source, use timing, and owned quantity come from shared catalog data.
- [ ] Spec coverage: clicking a product changes the selected right-side detail panel.
- [ ] Spec coverage: category and filter controls update local state.
- [ ] Spec coverage: virtual item redemption shows `已加入背包` local feedback.
- [ ] Spec coverage: real-world reward redemption shows administrator confirmation copy and `兑换中` local feedback.
- [ ] Spec coverage: `补给券` is replaced with `抽奖券`.
- [ ] Spec coverage: `href="#rules"` is removed and replaced by an in-page rules expansion button.
- [ ] Non-goal guardrail: no API call, Prisma call, persistent inventory mutation, or real purchase flow was added.
