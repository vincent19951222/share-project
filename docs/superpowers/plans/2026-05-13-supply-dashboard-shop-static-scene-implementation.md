# Supply Dashboard Shop Static Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `/ui-lab/supply-dashboard/shop` static Shop scene that visually prototypes the 补给商店 page from `design/ui-assets/补给商店.png` without touching the stable production `SupplyStation` flow.

**Architecture:** Create a route-local UI lab page backed by local mock data and semantic static components. Reuse the existing UI lab top tabs, add shop-specific static types and mock data under `components/gamification/ui-lab/supply-shop/`, keep new item media under `public/assets/home-scenes/supply/shop/`, and put scene-level CSS in `app/globals.css` behind `supply-shop-*` class names. Add focused Vitest contracts for route isolation, top-tab wiring, mock data shape, required assets, scene structure, CSS layering, and responsive safeguards.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, built-in `imagegen` for missing raster assets, ImageMagick `magick` and/or `cwebp` for local image processing.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- UI lab plan: `docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard static scene spec: `docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- Team Goal static scene spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- Image workflow: `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Target prototype: `design/ui-assets/补给商店.png`

## Scope Guardrails

- Do not modify `components/gamification/SupplyStation.tsx`.
- Do not modify `app/(board)/page.tsx`, `app/(board)/layout.tsx`, `components/navbar/Navbar.tsx`, `lib/store.tsx`, or `lib/types.ts`.
- Do not add to the production nav and do not change `AppTab`.
- Do not call `/api/gamification/*`, `/api/admin/*`, or any other API from the UI lab route.
- Do not read cookies, sessions, Prisma, or real auth state.
- Do not implement real item redemption, real coin/ticket spending, admin confirmation, backpack grant, inventory mutation, or purchase failure states.
- Do not add external UI dependencies.

## File Structure

- Create: `app/ui-lab/supply-dashboard/shop/page.tsx`
  - Route entry for the isolated static prototype.
- Create: `components/gamification/ui-lab/supply-shop/types.ts`
  - Static Shop data types.
- Create: `components/gamification/ui-lab/supply-shop/mock-data.ts`
  - Centralized static mock data and asset path references.
- Create: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
  - Scene shell and semantic subcomponents.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
  - Link the 补给商店 tab to `/ui-lab/supply-dashboard/shop`.
- Create: `__tests__/supply-shop-ui-lab-route.test.ts`
  - Route isolation and top-tab wiring contract.
- Create: `__tests__/supply-shop-mock-data.test.ts`
  - Mock data coverage contract.
- Create: `__tests__/supply-shop-assets.test.ts`
  - Required final media and reused reward asset existence and size budgets.
- Create: `__tests__/supply-shop-scene.test.tsx`
  - Static scene DOM structure and image path contract.
- Create: `__tests__/supply-shop-scene-css.test.ts`
  - CSS layer, responsive, and reduced-motion contract.
- Create: `public/assets/home-scenes/supply/shop/`
  - Final compressed Shop media assets.
- Modify: `app/globals.css`
  - Add `supply-shop-*` scene styles only.

## Task 1: Lock Route Isolation, Tab Wiring, And Mock Data Contracts

**Files:**
- Create: `__tests__/supply-shop-ui-lab-route.test.ts`
- Create: `__tests__/supply-shop-mock-data.test.ts`
- Create: `components/gamification/ui-lab/supply-shop/types.ts`
- Create: `components/gamification/ui-lab/supply-shop/mock-data.ts`

- [ ] **Step 1: Write the failing route and top-tab wiring test**

Create `__tests__/supply-shop-ui-lab-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply shop ui lab route isolation", () => {
  it("uses a standalone shop route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/shop/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const topTabs = readFileSync("components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyShopScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyShopScene");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
    expect(topTabs).toContain('label: "补给商店"');
    expect(topTabs).toContain('href: "/ui-lab/supply-dashboard/shop"');
  });
});
```

- [ ] **Step 2: Run the isolation test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-shop-ui-lab-route.test.ts
```

Expected: FAIL because `app/ui-lab/supply-dashboard/shop/page.tsx` does not exist yet and the top tab still points to `#`.

- [ ] **Step 3: Add Shop data types**

Create `components/gamification/ui-lab/supply-shop/types.ts`:

```ts
export type SupplyShopCurrency = "coins" | "ticket";
export type SupplyShopRarity = "common" | "rare" | "sr" | "ssr";
export type SupplyShopCategoryId = "featured" | "boost" | "task" | "social" | "real" | "cosmetic";

export type SupplyShopResource = {
  id: "coins" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type SupplyShopCategory = {
  id: SupplyShopCategoryId;
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyShopFilter = {
  id: "all" | "redeemable" | "owned";
  label: string;
  active: boolean;
};

export type SupplyShopProduct = {
  id: string;
  name: string;
  subtitle: string;
  categoryId: SupplyShopCategoryId;
  image: string;
  rarity: SupplyShopRarity;
  tags: string[];
  price: {
    currency: SupplyShopCurrency;
    amount: number;
  };
  ownedQuantity: number;
  stock?: {
    label: string;
    remaining: number;
    total: number;
  };
  dailyLimit?: {
    label: string;
    used: number;
    total: number;
  };
  requiresAdminConfirmation: boolean;
  selected: boolean;
};

export type SupplyShopProductDetail = {
  productId: string;
  description: string;
  effect: string;
  useTiming: string;
  purchaseLimit: string;
  costLabel: string;
  footnote: string;
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
  selectedProductDetail: SupplyShopProductDetail;
  notice: string;
};
```

- [ ] **Step 4: Add centralized mock data**

Create `components/gamification/ui-lab/supply-shop/mock-data.ts`:

```ts
import type { SupplyShopPreview } from "./types";

export const supplyShopAssetPaths = {
  profileAvatar: "/avatars/male1.png",
  rewardIcons: {
    coins: "/gamification/rewards/icons/coins_020.png",
    taskReroll: "/gamification/rewards/icons/task_reroll_coupon.png",
    boost: "/gamification/rewards/icons/small_boost_coupon.png",
    social: "/gamification/rewards/icons/team_broadcast_coupon.png",
    coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
  },
  shopItems: {
    learningPass: "/assets/home-scenes/supply/shop/shop-learning-pass.webp",
    energyBottle: "/assets/home-scenes/supply/shop/shop-energy-bottle.webp",
    trainingLog: "/assets/home-scenes/supply/shop/shop-training-log.webp",
    lightMeal: "/assets/home-scenes/supply/shop/shop-light-meal.webp",
    avatarFrame: "/assets/home-scenes/supply/shop/shop-avatar-frame.webp",
    titleBadge: "/assets/home-scenes/supply/shop/shop-title-badge.webp",
    fitnessOutfit: "/assets/home-scenes/supply/shop/shop-fitness-outfit.webp",
  },
} as const;

export const supplyShopMock: SupplyShopPreview = {
  topBar: {
    resources: [
      { id: "coins", label: "银子", value: "3,850", icon: "◎" },
      { id: "ticket", label: "补给券", value: "18", icon: "券" },
      { id: "backpack", label: "背包", value: "68/120", icon: "包" },
    ],
    profile: {
      username: "Vincent",
      avatar: supplyShopAssetPaths.profileAvatar,
    },
  },
  sidebar: {
    categories: [
      { id: "featured", label: "今日推荐", icon: "👍", active: true },
      { id: "boost", label: "增益道具", icon: "🧴", active: false },
      { id: "task", label: "任务道具", icon: "📝", active: false },
      { id: "social", label: "社交道具", icon: "💬", active: false },
      { id: "real", label: "真实福利", icon: "🎁", active: false },
      { id: "cosmetic", label: "装饰称号", icon: "🏅", active: false },
    ],
    resources: [
      { id: "coins", label: "银子", value: "3,850", icon: "◎" },
      { id: "ticket", label: "补给券", value: "18", icon: "券" },
    ],
  },
  filters: [
    { id: "all", label: "全部", active: true },
    { id: "redeemable", label: "可兑换", active: false },
    { id: "owned", label: "已拥有", active: false },
  ],
  sortOptions: ["默认排序", "价格从低到高", "价格从高到低"],
  selectedSort: "默认排序",
  products: [
    {
      id: "task-reroll",
      name: "任务重置券",
      subtitle: "重置1个未完成主线任务",
      categoryId: "task",
      image: supplyShopAssetPaths.rewardIcons.taskReroll,
      rarity: "common",
      tags: ["推荐"],
      price: { currency: "coins", amount: 150 },
      ownedQuantity: 0,
      dailyLimit: { label: "每日限购 1/1", used: 1, total: 1 },
      requiresAdminConfirmation: false,
      selected: true,
    },
    {
      id: "small-boost",
      name: "小幅加成券",
      subtitle: "本日步数加成 +10%",
      categoryId: "boost",
      image: supplyShopAssetPaths.rewardIcons.boost,
      rarity: "common",
      tags: ["推荐"],
      price: { currency: "coins", amount: 80 },
      ownedQuantity: 0,
      dailyLimit: { label: "每日限购 2/2", used: 2, total: 2 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "social-coupon",
      name: "社交互动券",
      subtitle: "用来发起1次队友互动",
      categoryId: "social",
      image: supplyShopAssetPaths.rewardIcons.social,
      rarity: "common",
      tags: ["推荐"],
      price: { currency: "coins", amount: 100 },
      ownedQuantity: 0,
      dailyLimit: { label: "每日限购 1/1", used: 1, total: 1 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "coffee-medium",
      name: "咖啡兑换券（中杯）",
      subtitle: "兑换指定咖啡饮品（价值约￥20）",
      categoryId: "real",
      image: supplyShopAssetPaths.rewardIcons.coffee,
      rarity: "rare",
      tags: ["限量"],
      price: { currency: "coins", amount: 500 },
      ownedQuantity: 0,
      dailyLimit: { label: "每日限购 1/1", used: 1, total: 1 },
      requiresAdminConfirmation: true,
      selected: false,
    },
    {
      id: "learning-pass",
      name: "学习时长券",
      subtitle: "增加学习时长15分钟",
      categoryId: "boost",
      image: supplyShopAssetPaths.shopItems.learningPass,
      rarity: "common",
      tags: ["剩余 5"],
      price: { currency: "coins", amount: 60 },
      ownedQuantity: 0,
      stock: { label: "剩余 5", remaining: 5, total: 5 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "energy-bottle",
      name: "体力恢复剂",
      subtitle: "恢复30点体力",
      categoryId: "boost",
      image: supplyShopAssetPaths.shopItems.energyBottle,
      rarity: "common",
      tags: ["剩余 3"],
      price: { currency: "coins", amount: 60 },
      ownedQuantity: 0,
      stock: { label: "剩余 3", remaining: 3, total: 3 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "training-log",
      name: "训练记录本",
      subtitle: "增加1次训练记录次数",
      categoryId: "task",
      image: supplyShopAssetPaths.shopItems.trainingLog,
      rarity: "common",
      tags: ["剩余 3"],
      price: { currency: "coins", amount: 40 },
      ownedQuantity: 0,
      stock: { label: "剩余 3", remaining: 3, total: 3 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "light-meal",
      name: "轻食便当兑换券",
      subtitle: "兑换轻食/沙拉套餐（需管理员确认）",
      categoryId: "real",
      image: supplyShopAssetPaths.shopItems.lightMeal,
      rarity: "rare",
      tags: ["需要管理员确认", "剩余 2"],
      price: { currency: "coins", amount: 800 },
      ownedQuantity: 0,
      stock: { label: "剩余 2", remaining: 2, total: 2 },
      requiresAdminConfirmation: true,
      selected: false,
    },
    {
      id: "avatar-frame",
      name: "头像框·奋斗牛",
      subtitle: "限时头像框（30天）",
      categoryId: "cosmetic",
      image: supplyShopAssetPaths.shopItems.avatarFrame,
      rarity: "sr",
      tags: ["SR", "限量", "剩余 1"],
      price: { currency: "coins", amount: 300 },
      ownedQuantity: 0,
      stock: { label: "剩余 1", remaining: 1, total: 1 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "title-self-discipline",
      name: "称号·自律牛马",
      subtitle: "专属称号（30天）",
      categoryId: "cosmetic",
      image: supplyShopAssetPaths.shopItems.titleBadge,
      rarity: "ssr",
      tags: ["SSR", "限量", "剩余 1"],
      price: { currency: "coins", amount: 500 },
      ownedQuantity: 0,
      stock: { label: "剩余 1", remaining: 1, total: 1 },
      requiresAdminConfirmation: false,
      selected: false,
    },
    {
      id: "fitness-outfit",
      name: "健身牛马装扮",
      subtitle: "大厅角色包装扮（30天）",
      categoryId: "cosmetic",
      image: supplyShopAssetPaths.shopItems.fitnessOutfit,
      rarity: "sr",
      tags: ["SR", "限量", "剩余 1"],
      price: { currency: "coins", amount: 600 },
      ownedQuantity: 0,
      stock: { label: "剩余 1", remaining: 1, total: 1 },
      requiresAdminConfirmation: false,
      selected: false,
    },
  ],
  selectedProductDetail: {
    productId: "task-reroll",
    description: "可以重置1个未完成的主线任务的进度，重置后该任务可重新完成以获取奖励。",
    effect: "重置1个未完成的主线任务",
    useTiming: "可在任务进行中使用",
    purchaseLimit: "每日限购 1 次",
    costLabel: "银子 150",
    footnote: "该商品为虚拟道具，兑换后将直接发放至背包",
  },
  notice: "“真实福利”类商品需管理员确认后发放，请耐心等待通知 ~",
};
```

- [ ] **Step 5: Write the mock data contract test**

Create `__tests__/supply-shop-mock-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { supplyShopAssetPaths, supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

describe("supply shop mock data", () => {
  it("covers the static shop state required by the spec", () => {
    expect(supplyShopMock.topBar.resources.map((resource) => resource.value)).toEqual(["3,850", "18", "68/120"]);
    expect(supplyShopMock.sidebar.resources.map((resource) => resource.value)).toEqual(["3,850", "18"]);
    expect(supplyShopMock.sidebar.categories).toHaveLength(6);
    expect(supplyShopMock.sidebar.categories.find((category) => category.active)?.label).toBe("今日推荐");
    expect(supplyShopMock.filters.map((filter) => filter.label)).toEqual(["全部", "可兑换", "已拥有"]);
    expect(supplyShopMock.filters.find((filter) => filter.active)?.id).toBe("all");
    expect(supplyShopMock.selectedSort).toBe("默认排序");
    expect(supplyShopMock.products).toHaveLength(11);
    expect(supplyShopMock.products.filter((product) => product.selected)).toHaveLength(1);
  });

  it("models the selected task reroll product and key shop labels", () => {
    const selected = supplyShopMock.products.find((product) => product.selected);

    expect(selected?.name).toBe("任务重置券");
    expect(selected?.price).toEqual({ currency: "coins", amount: 150 });
    expect(selected?.dailyLimit).toEqual({ label: "每日限购 1/1", used: 1, total: 1 });
    expect(supplyShopMock.selectedProductDetail.productId).toBe("task-reroll");
    expect(supplyShopMock.selectedProductDetail.costLabel).toBe("银子 150");

    const allTags = supplyShopMock.products.flatMap((product) => product.tags);
    expect(allTags).toEqual(expect.arrayContaining(["推荐", "限量", "剩余 5", "剩余 3", "剩余 2", "需要管理员确认", "SR", "SSR"]));
    expect(supplyShopMock.products.some((product) => product.requiresAdminConfirmation)).toBe(true);
    expect(supplyShopMock.products.filter((product) => product.categoryId === "cosmetic")).toHaveLength(3);
  });

  it("reuses existing reward icons and isolates new shop item media", () => {
    expect(supplyShopAssetPaths.rewardIcons.taskReroll).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(supplyShopAssetPaths.rewardIcons.boost).toBe("/gamification/rewards/icons/small_boost_coupon.png");
    expect(supplyShopAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
    expect(Object.values(supplyShopAssetPaths.shopItems).every((path) => path.startsWith("/assets/home-scenes/supply/shop/"))).toBe(true);
  });
});
```

- [ ] **Step 6: Run tests and verify current status**

Run:

```bash
npm test -- __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts
```

Expected: route test still FAILS until the route and top-tab href are created; mock data test PASSES.

- [ ] **Step 7: Commit Task 1**

```bash
git add __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts components/gamification/ui-lab/supply-shop/types.ts components/gamification/ui-lab/supply-shop/mock-data.ts
git commit -m "test: lock supply shop static data contract"
```

## Task 2: Produce And Verify Shop Media Assets

**Files:**
- Create: `public/assets/home-scenes/supply/shop/shop-learning-pass.webp`
- Create: `public/assets/home-scenes/supply/shop/shop-energy-bottle.webp`
- Create: `public/assets/home-scenes/supply/shop/shop-training-log.webp`
- Create: `public/assets/home-scenes/supply/shop/shop-light-meal.webp`
- Create: `public/assets/home-scenes/supply/shop/shop-avatar-frame.webp`
- Create: `public/assets/home-scenes/supply/shop/shop-title-badge.webp`
- Create: `public/assets/home-scenes/supply/shop/shop-fitness-outfit.webp`
- Create: `__tests__/supply-shop-assets.test.ts`

- [ ] **Step 1: Write the failing asset contract test**

Create `__tests__/supply-shop-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyShopAssetPaths } from "@/components/gamification/ui-lab/supply-shop/mock-data";

const requiredShopAssets = [
  ["shop-learning-pass.webp", 90 * 1024],
  ["shop-energy-bottle.webp", 90 * 1024],
  ["shop-training-log.webp", 90 * 1024],
  ["shop-light-meal.webp", 100 * 1024],
  ["shop-avatar-frame.webp", 100 * 1024],
  ["shop-title-badge.webp", 100 * 1024],
  ["shop-fitness-outfit.webp", 100 * 1024],
] as const;

function publicPath(src: string) {
  return `public${src}`;
}

describe("supply shop static assets", () => {
  it("ships required final shop item assets within size budgets", () => {
    for (const [fileName, maxBytes] of requiredShopAssets) {
      const path = `public/assets/home-scenes/supply/shop/${fileName}`;
      expect(existsSync(path), `${path} should exist`).toBe(true);
      expect(statSync(path).size, `${path} should fit budget`).toBeLessThanOrEqual(maxBytes);
    }
  });

  it("references existing reusable reward icons", () => {
    for (const src of Object.values(supplyShopAssetPaths.rewardIcons)) {
      expect(existsSync(publicPath(src)), `${src} should exist`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-shop-assets.test.ts
```

Expected: FAIL because the new shop item assets do not exist yet.

- [ ] **Step 3: Generate or create the seven missing item icons**

Use the `imagegen` skill for each missing item. Keep prompts focused on one transparent-background object at a time:

```text
16-bit pixel game item icon, transparent background, thick black outline, bright brutalist fitness app palette, readable at small size, no text. Object: a yellow learning time ticket with a notebook and clock symbol.
```

Repeat the object clause for:

- blue energy recovery bottle with +30 label shape, no real text required
- small training record notebook with yellow cover and checkmark badge
- light meal bento box with salad and protein pieces
- square avatar frame with cow-horn badge and blue/yellow decoration
- gold title badge plaque inspired by a cow mascot, no real text
- cute fitness outfit costume for a cow mascot, dumbbells, no character face duplication

Save raw outputs outside `public/`, process the final transparent assets into the exact files listed above, and keep each file within its budget.

- [ ] **Step 4: Run the asset test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-shop-assets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add public/assets/home-scenes/supply/shop __tests__/supply-shop-assets.test.ts
git commit -m "feat: add supply shop static item assets"
```

## Task 3: Build The Route And Static Scene Components

**Files:**
- Create: `app/ui-lab/supply-dashboard/shop/page.tsx`
- Create: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
- Create: `__tests__/supply-shop-scene.test.tsx`

- [ ] **Step 1: Write the failing scene DOM test**

Create `__tests__/supply-shop-scene.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

describe("SupplyShopScene", () => {
  it("renders the core shop surfaces from the prototype", () => {
    render(<SupplyShopScene data={supplyShopMock} />);

    expect(screen.getByRole("heading", { name: "补给商店" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /补给商店/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /返回大厅/ })).toHaveAttribute("href", "/ui-lab/supply-dashboard");

    const navigation = screen.getByLabelText("补给商店分类");
    expect(within(navigation).getAllByRole("button")).toHaveLength(6);
    expect(within(navigation).getByRole("button", { name: /今日推荐/ })).toHaveAttribute("aria-pressed", "true");

    expect(screen.getByRole("tab", { name: "全部" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "可兑换" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "已拥有" })).toBeInTheDocument();
    expect(screen.getByLabelText("商品排序")).toHaveDisplayValue("默认排序");

    expect(screen.getAllByTestId("supply-shop-product-card")).toHaveLength(11);
    expect(screen.getAllByRole("heading", { name: "任务重置券" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("银子 150")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "兑换" })).toBeDisabled();
    expect(screen.getByText(/真实福利/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-shop-scene.test.tsx
```

Expected: FAIL because `SupplyShopScene` does not exist yet.

- [ ] **Step 3: Wire the top tab href**

Modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx` so the shop tab is:

```ts
{ label: "补给商店", icon: "▤", href: "/ui-lab/supply-dashboard/shop" },
```

- [ ] **Step 4: Add the route entry**

Create `app/ui-lab/supply-dashboard/shop/page.tsx`:

```tsx
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

export default function SupplyDashboardShopPage() {
  return <SupplyShopScene data={supplyShopMock} />;
}
```

- [ ] **Step 5: Implement `SupplyShopScene` with semantic static components**

Create `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx` using these boundaries:

```tsx
import Image from "next/image";
import Link from "next/link";
import { SupplyDashboardTopTabs } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs";
import type { SupplyShopPreview, SupplyShopProduct } from "./types";

function ShopProductCard({ product }: { product: SupplyShopProduct }) {
  return (
    <article
      className={`supply-shop-product-card supply-shop-product-card--${product.rarity}`}
      data-selected={product.selected}
      data-testid="supply-shop-product-card"
    >
      <div className="supply-shop-product-badges">
        {product.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {product.dailyLimit ? <span className="supply-shop-limit-tag">{product.dailyLimit.label}</span> : null}
      <div className="supply-shop-product-image">
        <Image alt="" height={120} src={product.image} width={120} />
      </div>
      <h3>{product.name}</h3>
      <p>{product.subtitle}</p>
      <div className="supply-shop-price">
        <span aria-hidden="true">◎</span>
        <strong>{product.price.amount}</strong>
      </div>
    </article>
  );
}

export function SupplyShopScene({ data }: { data: SupplyShopPreview }) {
  const selectedProduct = data.products.find((product) => product.selected) ?? data.products[0];

  return (
    <main className="supply-shop-scene">
      <div className="supply-shop-background" aria-hidden="true" />
      <div className="supply-shop-content">
        <header className="supply-shop-topbar">
          <div className="supply-shop-brand">牛马补给站</div>
          <SupplyDashboardTopTabs activeLabel="补给商店" />
          <div className="supply-shop-top-resources" aria-label="我的资源">
            {data.topBar.resources.map((resource) => (
              <div className="supply-shop-resource-pill" key={resource.id}>
                <span>{resource.icon}</span>
                <span>{resource.label}</span>
                <strong>{resource.value}</strong>
              </div>
            ))}
            <Image alt={data.topBar.profile.username} height={42} src={data.topBar.profile.avatar} width={42} />
          </div>
        </header>

        <section className="supply-shop-shell" aria-label="补给商店静态复刻">
          <aside className="supply-shop-sidebar">
            <h1>补给商店</h1>
            <nav aria-label="补给商店分类">
              {data.sidebar.categories.map((category) => (
                <button aria-pressed={category.active} key={category.id} type="button">
                  <span>{category.icon}</span>
                  {category.label}
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </nav>
            <div className="supply-shop-sidebar-resources">
              <h2>我的资源</h2>
              {data.sidebar.resources.map((resource) => (
                <div key={resource.id}>
                  <span>{resource.icon}</span>
                  <span>{resource.label}</span>
                  <strong>{resource.value}</strong>
                </div>
              ))}
            </div>
            <Link className="supply-shop-back-link" href="/ui-lab/supply-dashboard">返回大厅</Link>
          </aside>

          <section className="supply-shop-catalog" aria-label="商品列表">
            <div className="supply-shop-filterbar">
              <div role="tablist" aria-label="商品筛选">
                {data.filters.map((filter) => (
                  <button aria-selected={filter.active} key={filter.id} role="tab" type="button">
                    {filter.label}
                  </button>
                ))}
              </div>
              <label>
                <span>商品排序</span>
                <select aria-label="商品排序" value={data.selectedSort} onChange={() => undefined}>
                  {data.sortOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="supply-shop-product-grid">
              {data.products.map((product) => (
                <ShopProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="supply-shop-notice">{data.notice}</div>
          </section>

          <aside className="supply-shop-detail" aria-label="商品详情">
            <span className="supply-shop-detail-limit">{selectedProduct?.dailyLimit?.label}</span>
            <div className="supply-shop-detail-hero">
              {selectedProduct ? <Image alt="" height={148} src={selectedProduct.image} width={148} /> : null}
            </div>
            <h2>{selectedProduct?.name}</h2>
            <p>持有：{selectedProduct?.ownedQuantity ?? 0}</p>
            <p>{data.selectedProductDetail.description}</p>
            <dl>
              <dt>效果</dt>
              <dd>{data.selectedProductDetail.effect}</dd>
              <dt>使用时机</dt>
              <dd>{data.selectedProductDetail.useTiming}</dd>
              <dt>购买限制</dt>
              <dd>{data.selectedProductDetail.purchaseLimit}</dd>
            </dl>
            <div className="supply-shop-detail-cost">
              <span>花费</span>
              <strong>{data.selectedProductDetail.costLabel}</strong>
            </div>
            <button className="quest-btn" disabled type="button">兑换</button>
            <div className="supply-shop-detail-footnote">{data.selectedProductDetail.footnote}</div>
          </aside>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run scene and route tests**

Run:

```bash
npm test -- __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add app/ui-lab/supply-dashboard/shop/page.tsx components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx __tests__/supply-shop-scene.test.tsx
git commit -m "feat: add supply shop static scene"
```

## Task 4: Add Scene CSS And Responsive Safeguards

**Files:**
- Modify: `app/globals.css`
- Create: `__tests__/supply-shop-scene-css.test.ts`

- [ ] **Step 1: Write the failing CSS contract test**

Create `__tests__/supply-shop-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply shop scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines isolated shop scene layers and product grid styles", () => {
    expect(css).toContain(".supply-shop-scene");
    expect(css).toContain(".supply-shop-content");
    expect(css).toContain(".supply-shop-shell");
    expect(css).toContain(".supply-shop-sidebar");
    expect(css).toContain(".supply-shop-catalog");
    expect(css).toContain(".supply-shop-product-grid");
    expect(css).toContain(".supply-shop-detail");
    expect(css).toContain("border: 4px solid");
  });

  it("includes responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1200px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
```

- [ ] **Step 2: Run the CSS test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-shop-scene-css.test.ts
```

Expected: FAIL because shop CSS does not exist yet.

- [ ] **Step 3: Add `supply-shop-*` CSS only**

Append a clearly scoped section to `app/globals.css`:

```css
/* Supply shop static UI lab scene */
.supply-shop-scene {
  min-height: 100vh;
  background: #f2eadb;
  color: #111827;
  overflow-x: hidden;
}

.supply-shop-content {
  position: relative;
  min-height: 100vh;
  padding: 10px;
}

.supply-shop-shell {
  display: grid;
  grid-template-columns: minmax(250px, 0.9fr) minmax(620px, 3fr) minmax(330px, 1.45fr);
  gap: 14px;
  max-width: 1536px;
  margin: 12px auto 0;
}

.supply-shop-sidebar,
.supply-shop-catalog,
.supply-shop-detail {
  border: 4px solid #111827;
  box-shadow: 0 6px 0 #111827;
}

.supply-shop-product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.supply-shop-product-card {
  position: relative;
  min-height: 292px;
  border: 3px solid #b8b1a5;
  background: #fffaf0;
}

@media (max-width: 1200px) {
  .supply-shop-shell {
    grid-template-columns: minmax(220px, 0.8fr) minmax(0, 2fr);
  }

  .supply-shop-detail {
    grid-column: 2;
  }

  .supply-shop-product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .supply-shop-shell {
    grid-template-columns: 1fr;
  }

  .supply-shop-detail {
    grid-column: auto;
  }

  .supply-shop-product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .supply-shop-scene *,
  .supply-shop-scene *::before,
  .supply-shop-scene *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In the same scoped section, add explicit rules for the remaining prototype details:

```css
.supply-shop-sidebar {
  display: flex;
  min-height: calc(100vh - 120px);
  flex-direction: column;
  gap: 14px;
  border-radius: 12px;
  background: #101418;
  padding: 18px;
}

.supply-shop-sidebar h1 {
  color: #ffffff;
  font-size: 24px;
  font-weight: 900;
}

.supply-shop-sidebar nav {
  display: grid;
  gap: 10px;
}

.supply-shop-sidebar nav button {
  display: grid;
  grid-template-columns: 32px 1fr 20px;
  align-items: center;
  min-height: 58px;
  border: 3px solid #05070a;
  border-radius: 8px;
  background: #1e2329;
  color: #f8fafc;
  font-weight: 900;
  text-align: left;
}

.supply-shop-sidebar nav button[aria-pressed="true"] {
  background: #facc15;
  color: #111827;
}

.supply-shop-sidebar-resources {
  margin-top: auto;
  border: 2px solid #3f4652;
  border-radius: 8px;
  background: #252a31;
  padding: 14px;
  color: #f8fafc;
}

.supply-shop-back-link {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: center;
  border: 3px solid #111827;
  border-radius: 8px;
  background: #facc15;
  color: #111827;
  font-size: 22px;
  font-weight: 900;
  box-shadow: 0 5px 0 #111827;
}

.supply-shop-catalog {
  border-radius: 12px;
  background: #fffaf0;
  padding: 18px;
}

.supply-shop-filterbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.supply-shop-filterbar [role="tablist"] {
  display: flex;
  gap: 8px;
}

.supply-shop-filterbar [role="tab"] {
  min-width: 116px;
  min-height: 42px;
  border: 3px solid #b8b1a5;
  border-radius: 8px;
  background: #ffffff;
  font-weight: 900;
}

.supply-shop-filterbar [role="tab"][aria-selected="true"] {
  border-color: #111827;
  background: #facc15;
}

.supply-shop-product-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.supply-shop-product-badges span,
.supply-shop-limit-tag {
  border: 2px solid #111827;
  border-radius: 4px;
  background: #facc15;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 900;
}

.supply-shop-limit-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  border-color: #22c55e;
  background: #f0fdf4;
  color: #15803d;
}

.supply-shop-product-card[data-selected="true"] {
  border-color: #eab308;
  box-shadow: inset 0 0 0 2px #fef08a;
}

.supply-shop-product-card--sr {
  border-color: #a855f7;
  background: #faf5ff;
}

.supply-shop-product-card--ssr {
  border-color: #f97316;
  background: #fff7ed;
}

.supply-shop-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 12px;
  background: #fffaf0;
  padding: 28px;
}

.supply-shop-detail dl {
  display: grid;
  gap: 8px;
  border-top: 2px solid #d6c8b4;
  border-bottom: 2px solid #d6c8b4;
  padding: 18px 0;
}

.supply-shop-detail dt {
  font-size: 18px;
  font-weight: 900;
}

.supply-shop-detail dd {
  margin: 0 0 12px;
  font-weight: 700;
}
```

- [ ] **Step 4: Run CSS, scene, and mock data tests**

Run:

```bash
npm test -- __tests__/supply-shop-scene-css.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-mock-data.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add app/globals.css __tests__/supply-shop-scene-css.test.ts
git commit -m "style: add supply shop static scene css"
```

## Task 5: Run Focused Verification And Visual QA

**Files:**
- No new files unless CSS or component fixes are needed.

- [ ] **Step 1: Run all supply shop contract tests**

Run:

```bash
npm test -- __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing unrelated warnings. Fix any lint errors introduced by this work.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Expected: dev server starts and serves `http://127.0.0.1:3000`.

- [ ] **Step 4: Visual QA desktop**

Open:

```text
http://127.0.0.1:3000/ui-lab/supply-dashboard/shop
```

Use `1536 x 1024` viewport. Verify:

- Top bar active tab is 补给商店.
- Left sidebar, middle catalog, and right detail match the prototype proportions.
- Product grid renders 4 + 4 + 3 cards.
- `任务重置券` is visually selected and right detail shows the same product.
- Silver, ticket, backpack, price, daily limit, and notice text match the spec.
- No product image has visible white edge, black edge, transparent artifact, stretching, or blur.

- [ ] **Step 5: Visual QA mobile**

Use `390 x 844` viewport. Verify:

- Page scrolls vertically without horizontal overflow.
- Top tabs are usable.
- Categories, filters, product grid, detail panel, price, and CTA remain readable.
- No text overlaps product icons or price bars.

- [ ] **Step 6: Commit QA fixes**

If visual QA required CSS or component tweaks:

```bash
git add app/globals.css components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx
git commit -m "fix: polish supply shop static scene layout"
```

If no changes were needed, skip this commit.

## Task 6: Final Regression Check

**Files:**
- No new files unless final fixes are needed.

- [ ] **Step 1: Run focused UI lab tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Confirm production isolation with grep**

Run:

```bash
rg "SupplyShopScene|supply-shop|/ui-lab/supply-dashboard/shop" app components lib --glob '!app/ui-lab/supply-dashboard/shop/page.tsx' --glob '!components/gamification/ui-lab/supply-shop/**' --glob '!components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx'
```

Expected: no production files reference `SupplyShopScene`, `supply-shop`, or `/ui-lab/supply-dashboard/shop`.

- [ ] **Step 3: Final status**

Record:

- Tests run and results.
- Desktop and mobile visual QA status.
- Any asset compromises or follow-up replacements.
- Confirmation that production `SupplyStation` is untouched.
