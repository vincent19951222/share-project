# Supply Dashboard Backpack Static Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `/ui-lab/supply-dashboard/backpack` static Backpack scene that visually prototypes the 背包 page from `design/ui-assets/背包.png` without touching the stable production `SupplyStation` flow.

**Architecture:** Create a route-local UI lab page backed by local mock data and semantic static components. Add backpack-specific types and mock data under `components/gamification/ui-lab/supply-backpack/`, keep new item media under `public/assets/home-scenes/supply/backpack/`, link the Dashboard dock backpack entry to the new UI lab route, and put scene-level CSS in `app/globals.css` behind `supply-backpack-*` class names. Add focused Vitest contracts for route isolation, mock data shape, required assets, scene structure, CSS layering, and responsive safeguards.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, built-in `imagegen` for missing raster assets, ImageMagick `magick` and/or `cwebp` for local image processing.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-backpack-static-scene-design.md`
- UI lab plan: `docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard static scene spec: `docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- Shop static scene spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- Backpack V1 business design: `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- Image workflow: `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Target prototype: `design/ui-assets/背包.png`

## Scope Guardrails

- Do not modify `components/gamification/SupplyStation.tsx`.
- Do not modify `app/(board)/page.tsx`, `app/(board)/layout.tsx`, `components/navbar/Navbar.tsx`, `lib/store.tsx`, or `lib/types.ts`.
- Do not add to the production nav and do not change `AppTab`.
- Do not call `/api/gamification/*`, `/api/admin/*`, or any other API from the UI lab route.
- Do not read cookies, sessions, Prisma, or real auth state.
- Do not implement real item use, inventory mutation, real-world redemption, backpack expansion, sorting, filtering, or pagination state.
- Do not add external UI dependencies.
- Do not use `design/ui-assets/背包.png` as a background image.

## File Structure

- Create: `app/ui-lab/supply-dashboard/backpack/page.tsx`
  - Route entry for the isolated static prototype.
- Create: `components/gamification/ui-lab/supply-backpack/types.ts`
  - Static Backpack data types.
- Create: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
  - Centralized static mock data and asset path references.
- Create: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
  - Scene shell and semantic subcomponents.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - Link the Dashboard dock backpack entry to `/ui-lab/supply-dashboard/backpack`.
- Create: `__tests__/supply-backpack-ui-lab-route.test.ts`
  - Route isolation and Dashboard dock wiring contract.
- Create: `__tests__/supply-backpack-mock-data.test.ts`
  - Mock data coverage contract.
- Create: `__tests__/supply-backpack-assets.test.ts`
  - Required final media and reused reward/shop asset existence and size budgets.
- Create: `__tests__/supply-backpack-scene.test.tsx`
  - Static scene DOM structure and selected item contract.
- Create: `__tests__/supply-backpack-scene-css.test.ts`
  - CSS layer, responsive, and reduced-motion contract.
- Create: `public/assets/home-scenes/supply/backpack/`
  - Final compressed Backpack media assets.
- Modify: `app/globals.css`
  - Add `supply-backpack-*` scene styles only.

## Task 1: Lock Route Isolation, Dock Wiring, And Mock Data Contracts

**Files:**
- Create: `__tests__/supply-backpack-ui-lab-route.test.ts`
- Create: `__tests__/supply-backpack-mock-data.test.ts`
- Create: `components/gamification/ui-lab/supply-backpack/types.ts`
- Create: `components/gamification/ui-lab/supply-backpack/mock-data.ts`

- [ ] **Step 1: Write the failing route and dock wiring test**

Create `__tests__/supply-backpack-ui-lab-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply backpack ui lab route isolation", () => {
  it("uses a standalone backpack route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/backpack/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const dashboardScene = readFileSync(
      "components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx",
      "utf8",
    );

    expect(boardPage).not.toContain("SupplyBackpackScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyBackpackScene");
    expect(types).toContain(
      'export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";',
    );
    expect(dashboardScene).toContain('href="/ui-lab/supply-dashboard/backpack"');
  });
});
```

- [ ] **Step 2: Run the isolation test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-backpack-ui-lab-route.test.ts
```

Expected: FAIL because `app/ui-lab/supply-dashboard/backpack/page.tsx` does not exist yet and the Dashboard dock still points to `#inventory`.

- [ ] **Step 3: Add Backpack data types**

Create `components/gamification/ui-lab/supply-backpack/types.ts`:

```ts
export type SupplyBackpackRarity = "N" | "R" | "SR" | "SSR";
export type SupplyBackpackCategoryId = "all" | "boost" | "task" | "social" | "real";

export type SupplyBackpackResource = {
  id: "coins" | "ticket" | "capacity";
  label: string;
  value: string;
  icon: string;
};

export type SupplyBackpackCategory = {
  id: SupplyBackpackCategoryId;
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyBackpackTodayEffect = {
  id: string;
  icon: string;
  label: string;
  value: string;
  expiresIn: string;
};

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
      type: "locked";
      id: string;
      unlockLevel: number;
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
    totalPages: number;
    slots: SupplyBackpackSlot[];
  };
  selectedItemDetail: SupplyBackpackSelectedDetail;
  hint: string;
};
```

- [ ] **Step 4: Add centralized mock data**

Create `components/gamification/ui-lab/supply-backpack/mock-data.ts`:

```ts
import type { SupplyBackpackPreview } from "./types";

export const supplyBackpackAssetPaths = {
  logo: "/logo.png",
  backpackItems: {
    sportsDrink: "/assets/home-scenes/supply/backpack/backpack-sports-drink.webp",
    riceBall: "/assets/home-scenes/supply/backpack/backpack-rice-ball.webp",
    speedShoes: "/assets/home-scenes/supply/backpack/backpack-speed-shoes.webp",
    staminaRing: "/assets/home-scenes/supply/backpack/backpack-stamina-ring.webp",
    dumbbell: "/assets/home-scenes/supply/backpack/backpack-dumbbell.webp",
    banana: "/assets/home-scenes/supply/backpack/backpack-banana.webp",
    studyGuide: "/assets/home-scenes/supply/backpack/backpack-study-guide.webp",
    heart: "/assets/home-scenes/supply/backpack/backpack-heart.webp",
    socialTicket: "/assets/home-scenes/supply/backpack/backpack-social-ticket.webp",
    seasonMedal: "/assets/home-scenes/supply/backpack/backpack-season-medal.webp",
  },
  reused: {
    coffeeCoupon: "/gamification/rewards/icons/luckin_coffee_coupon.png",
    supplyTicket: "/gamification/rewards/icons/task_reroll_coupon.png",
    coins: "/gamification/rewards/icons/coins_020.png",
    energyBottle: "/assets/home-scenes/supply/shop/shop-energy-bottle.webp",
    trainingLog: "/assets/home-scenes/supply/shop/shop-training-log.webp",
    expBadge: "/assets/home-scenes/supply/shop/shop-title-badge.webp",
  },
} as const;

export const supplyBackpackMock: SupplyBackpackPreview = {
  topBar: {
    breadcrumb: ["牛马补给站", "背包"],
    resources: [
      { id: "coins", label: "银子", value: "2,450", icon: "◎" },
      { id: "ticket", label: "补给券", value: "18", icon: "券" },
      { id: "capacity", label: "背包", value: "18/40", icon: "包" },
    ],
  },
  sidebar: {
    capacity: "18/40",
    categories: [
      { id: "all", label: "全部", icon: "▦", active: true },
      { id: "boost", label: "增益", icon: "✧", active: false },
      { id: "task", label: "任务", icon: "▣", active: false },
      { id: "social", label: "社交", icon: "♟", active: false },
      { id: "real", label: "真实福利", icon: "▤", active: false },
    ],
    todayEffects: [
      { id: "exp", icon: "EXP", label: "经验获取", value: "+20%", expiresIn: "02:35:18" },
      { id: "stamina", icon: "♥", label: "体力上限", value: "+10", expiresIn: "02:35:18" },
      { id: "steps", icon: "▰", label: "步数加成", value: "+15%", expiresIn: "02:35:18" },
      { id: "hydration", icon: "▣", label: "饮水加成", value: "+10%", expiresIn: "02:35:18" },
    ],
  },
  sortOptions: ["按稀有度", "按数量", "按获得时间"],
  selectedSort: "按稀有度",
  inventory: {
    page: 1,
    totalPages: 2,
    slots: [
      {
        type: "item",
        item: {
          id: "sports-drink",
          name: "运动饮料",
          image: supplyBackpackAssetPaths.backpackItems.sportsDrink,
          rarity: "R",
          categoryId: "boost",
          quantity: 12,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "energy-potion",
          name: "能量药剂",
          image: supplyBackpackAssetPaths.reused.energyBottle,
          rarity: "SR",
          categoryId: "boost",
          quantity: 8,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "supply-ticket",
          name: "补给券",
          image: supplyBackpackAssetPaths.reused.supplyTicket,
          rarity: "R",
          categoryId: "task",
          quantity: 15,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "rice-ball",
          name: "饭团",
          image: supplyBackpackAssetPaths.backpackItems.riceBall,
          rarity: "N",
          categoryId: "boost",
          quantity: 20,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "speed-shoes",
          name: "疾风跑鞋",
          image: supplyBackpackAssetPaths.backpackItems.speedShoes,
          rarity: "SR",
          categoryId: "boost",
          quantity: 1,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "stamina-ring",
          name: "体力护环",
          image: supplyBackpackAssetPaths.backpackItems.staminaRing,
          rarity: "SSR",
          categoryId: "boost",
          quantity: 6,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "dumbbell",
          name: "哑铃",
          image: supplyBackpackAssetPaths.backpackItems.dumbbell,
          rarity: "N",
          categoryId: "boost",
          quantity: 19,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "banana",
          name: "香蕉",
          image: supplyBackpackAssetPaths.backpackItems.banana,
          rarity: "N",
          categoryId: "boost",
          quantity: 14,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "training-log",
          name: "训练记录本",
          image: supplyBackpackAssetPaths.reused.trainingLog,
          rarity: "N",
          categoryId: "task",
          quantity: 11,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "coins",
          name: "牛马币",
          image: supplyBackpackAssetPaths.reused.coins,
          rarity: "R",
          categoryId: "boost",
          quantity: 30,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "study-guide",
          name: "学习指南",
          image: supplyBackpackAssetPaths.backpackItems.studyGuide,
          rarity: "N",
          categoryId: "task",
          quantity: 11,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "exp-badge",
          name: "经验徽章",
          image: supplyBackpackAssetPaths.reused.expBadge,
          rarity: "R",
          categoryId: "boost",
          quantity: 22,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "heart",
          name: "爱心",
          image: supplyBackpackAssetPaths.backpackItems.heart,
          rarity: "SR",
          categoryId: "social",
          quantity: 6,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "coffee-coupon",
          name: "咖啡兑换券",
          image: supplyBackpackAssetPaths.reused.coffeeCoupon,
          rarity: "R",
          categoryId: "real",
          quantity: 8,
          selected: true,
        },
      },
      {
        type: "item",
        item: {
          id: "social-ticket",
          name: "社交券",
          image: supplyBackpackAssetPaths.backpackItems.socialTicket,
          rarity: "N",
          categoryId: "social",
          quantity: 18,
          selected: false,
        },
      },
      {
        type: "item",
        item: {
          id: "season-medal",
          name: "赛季勋章",
          image: supplyBackpackAssetPaths.backpackItems.seasonMedal,
          rarity: "N",
          categoryId: "boost",
          quantity: 30,
          selected: false,
        },
      },
      { type: "locked", id: "locked-20", unlockLevel: 20 },
      { type: "locked", id: "locked-25", unlockLevel: 25 },
      { type: "locked", id: "locked-30", unlockLevel: 30 },
      { type: "locked", id: "locked-35", unlockLevel: 35 },
    ],
  },
  selectedItemDetail: {
    itemId: "coffee-coupon",
    name: "咖啡兑换券",
    rarity: "R",
    tag: "真实福利",
    ownedQuantity: 8,
    image: supplyBackpackAssetPaths.reused.coffeeCoupon,
    description: "可在补给商店兑换指定咖啡饮品。",
    effect: "兑换指定咖啡饮品（价值约￥20）",
    useTiming: "随时可用（需前往补给商店兑换）",
    restrictions: ["每日最多兑换 1 次", "仅限在补给商店可用"],
    primaryAction: "今日使用",
    secondaryAction: "申请兑换",
    shopCta: {
      label: "去商店",
      href: "/ui-lab/supply-dashboard/shop",
      description: "前往补给商店兑换真实福利",
    },
    requiresAdminConfirmation: true,
  },
  hint: "部分真实福利需管理员确认后发放，请耐心等待通知~",
};
```

- [ ] **Step 5: Write the failing mock data contract test**

Create `__tests__/supply-backpack-mock-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

describe("supply backpack mock data", () => {
  it("matches the backpack prototype resource and layout contract", () => {
    expect(supplyBackpackMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/40",
    ]);
    expect(supplyBackpackMock.sidebar.capacity).toBe("18/40");
    expect(supplyBackpackMock.sidebar.categories).toHaveLength(5);
    expect(supplyBackpackMock.sidebar.categories.find((category) => category.active)?.label).toBe(
      "全部",
    );
    expect(supplyBackpackMock.sidebar.todayEffects).toHaveLength(4);
    expect(supplyBackpackMock.inventory.slots).toHaveLength(20);
    expect(supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "item")).toHaveLength(
      16,
    );
    expect(
      supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "locked"),
    ).toHaveLength(4);
    expect(supplyBackpackMock.inventory.page).toBe(1);
    expect(supplyBackpackMock.inventory.totalPages).toBe(2);
  });

  it("covers rarity, locked slots, and selected real-world item detail", () => {
    const items = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item] : [],
    );

    expect(new Set(items.map((item) => item.rarity))).toEqual(new Set(["N", "R", "SR", "SSR"]));
    expect(items.find((item) => item.selected)).toMatchObject({
      id: "coffee-coupon",
      name: "咖啡兑换券",
      quantity: 8,
      rarity: "R",
      categoryId: "real",
    });
    expect(
      supplyBackpackMock.inventory.slots.flatMap((slot) =>
        slot.type === "locked" ? [slot.unlockLevel] : [],
      ),
    ).toEqual([20, 25, 30, 35]);
    expect(supplyBackpackMock.selectedItemDetail).toMatchObject({
      itemId: "coffee-coupon",
      tag: "真实福利",
      ownedQuantity: 8,
      requiresAdminConfirmation: true,
    });
  });
});
```

- [ ] **Step 6: Run mock data tests and verify they pass**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts
```

Expected: PASS after adding the type and mock data files.

- [ ] **Step 7: Commit the data contract**

```bash
git add __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts components/gamification/ui-lab/supply-backpack/types.ts components/gamification/ui-lab/supply-backpack/mock-data.ts
git commit -m "test: lock supply backpack scene contract"
```

## Task 2: Prepare Backpack Static Media Assets

**Files:**
- Create directory: `public/assets/home-scenes/supply/backpack/`
- Create: `__tests__/supply-backpack-assets.test.ts`
- Add final assets listed in the spec under `public/assets/home-scenes/supply/backpack/`

- [ ] **Step 1: Write the failing asset contract test**

Create `__tests__/supply-backpack-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyBackpackAssetPaths } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

const projectPath = (publicPath: string) => `public${decodeURIComponent(publicPath)}`;

describe("supply backpack static assets", () => {
  it("has required backpack item assets within size budgets", () => {
    const requiredAssets = Object.values(supplyBackpackAssetPaths.backpackItems);

    expect(requiredAssets).toHaveLength(10);

    for (const asset of requiredAssets) {
      const filePath = projectPath(asset);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
      expect(statSync(filePath).size, `${filePath} should stay under 100 KB`).toBeLessThanOrEqual(
        100 * 1024,
      );
    }
  });

  it("reuses existing reward and shop assets", () => {
    for (const asset of Object.values(supplyBackpackAssetPaths.reused)) {
      const filePath = projectPath(asset);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-backpack-assets.test.ts
```

Expected: FAIL because `public/assets/home-scenes/supply/backpack/` assets do not exist yet.

- [ ] **Step 3: Generate the 10 missing backpack item icons**

Use the `imagegen` skill one asset at a time. Use this shared prompt base and replace the object phrase for each file:

```text
Create a transparent-background square pixel-art inventory icon for 脱脂牛马 / 牛马补给站. Object: [OBJECT]. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark, isolated object centered, transparent background.
```

Object phrases:

```text
backpack-sports-drink.webp: blue sports drink bottle with white label and cap
backpack-rice-ball.webp: triangular rice ball with black seaweed wrap
backpack-speed-shoes.webp: black and yellow running shoe pair
backpack-stamina-ring.webp: green fitness wrist ring or silicone bracelet
backpack-dumbbell.webp: compact black dumbbell
backpack-banana.webp: curved yellow banana bunch
backpack-study-guide.webp: open study guide book with pale pages
backpack-heart.webp: glossy pink heart token
backpack-social-ticket.webp: blue social coupon ticket with chat mark
backpack-season-medal.webp: golden season medal with star center
```

- [ ] **Step 4: Process generated images into final WebP files**

For each generated source image, crop transparent padding if needed, resize to 320x320, and save as WebP:

```bash
mkdir -p public/assets/home-scenes/supply/backpack
magick tmp/path/to/source.png -resize 320x320 -strip -quality 86 public/assets/home-scenes/supply/backpack/backpack-sports-drink.webp
```

Expected: final files exist in `public/assets/home-scenes/supply/backpack/`; raw files stay under `tmp/` and are not added.

- [ ] **Step 5: Run the asset test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-backpack-assets.test.ts
```

Expected: PASS with all required assets present and under budget.

- [ ] **Step 6: Commit the assets**

```bash
git add __tests__/supply-backpack-assets.test.ts public/assets/home-scenes/supply/backpack
git commit -m "feat: add supply backpack static assets"
```

## Task 3: Build The Static Backpack Scene

**Files:**
- Create: `app/ui-lab/supply-dashboard/backpack/page.tsx`
- Create: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Create: `__tests__/supply-backpack-scene.test.tsx`

- [ ] **Step 1: Write the failing scene structure test**

Create `__tests__/supply-backpack-scene.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

describe("SupplyBackpackScene", () => {
  it("renders the backpack header, sidebar, inventory grid, detail panel, and hint bar", () => {
    render(<SupplyBackpackScene data={supplyBackpackMock} />);

    expect(screen.getByRole("heading", { name: "牛马补给站" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "扩容背包" })).toBeInTheDocument();
    expect(screen.getAllByText("18/40")).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "背包分类" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "背包库存" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "道具详情" })).toBeInTheDocument();
    expect(screen.getByText("小提示：")).toBeInTheDocument();
  });

  it("renders 16 item slots, 4 locked slots, and synced selected detail", () => {
    render(<SupplyBackpackScene data={supplyBackpackMock} />);

    const grid = screen.getByRole("grid", { name: "背包库存" });
    expect(within(grid).getAllByRole("gridcell", { name: /持有/ })).toHaveLength(16);
    expect(within(grid).getAllByText(/级解锁/)).toHaveLength(4);
    expect(within(grid).getByRole("gridcell", { name: /咖啡兑换券.*持有 8/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const detail = screen.getByRole("region", { name: "道具详情" });
    expect(within(detail).getByRole("heading", { name: "咖啡兑换券" })).toBeInTheDocument();
    expect(within(detail).getByText("持有 8")).toBeInTheDocument();
    expect(within(detail).getByText("真实福利")).toBeInTheDocument();
  });

  it("keeps actions static and links shop CTA only to the ui-lab shop route", () => {
    render(<SupplyBackpackScene data={supplyBackpackMock} />);

    expect(screen.getByRole("button", { name: "今日使用" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "申请兑换" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("link", { name: "去商店" })).toHaveAttribute(
      "href",
      "/ui-lab/supply-dashboard/shop",
    );
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-backpack-scene.test.tsx
```

Expected: FAIL because `SupplyBackpackScene` does not exist yet.

- [ ] **Step 3: Create the route entry**

Create `app/ui-lab/supply-dashboard/backpack/page.tsx`:

```tsx
import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

export default function SupplyDashboardBackpackPage() {
  return <SupplyBackpackScene data={supplyBackpackMock} />;
}
```

- [ ] **Step 4: Implement `SupplyBackpackScene` with semantic subcomponents**

Create `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import type {
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackRarity,
  SupplyBackpackSlot,
} from "./types";
import { supplyBackpackAssetPaths } from "./mock-data";

const rarityClass: Record<SupplyBackpackRarity, string> = {
  N: "supply-backpack-rarity-n",
  R: "supply-backpack-rarity-r",
  SR: "supply-backpack-rarity-sr",
  SSR: "supply-backpack-rarity-ssr",
};

export function SupplyBackpackScene({ data }: { data: SupplyBackpackPreview }) {
  return (
    <main className="supply-backpack-scene" aria-label="牛马补给站背包静态原型">
      <div className="supply-backpack-shell">
        <BackpackHeaderBar data={data} />
        <div className="supply-backpack-main-layout">
          <BackpackSidebar data={data} />
          <BackpackInventoryPanel data={data} />
          <BackpackDetailPanel data={data} />
        </div>
        <BackpackHintBar hint={data.hint} />
      </div>
    </main>
  );
}

function BackpackHeaderBar({ data }: { data: SupplyBackpackPreview }) {
  return (
    <header className="supply-backpack-header">
      <div className="supply-backpack-brand">
        <Image src={supplyBackpackAssetPaths.logo} alt="" width={48} height={48} aria-hidden />
        <h1>牛马补给站</h1>
        <span aria-hidden="true">/</span>
        <strong>背包</strong>
      </div>
      <div className="supply-backpack-resource-strip" aria-label="资源">
        {data.topBar.resources.map((resource) => (
          <div className="supply-backpack-resource" key={resource.id}>
            <span aria-hidden="true">{resource.icon}</span>
            <b>{resource.value}</b>
          </div>
        ))}
        <button className="supply-backpack-close" type="button" aria-label="关闭背包">
          ×
        </button>
      </div>
    </header>
  );
}

function BackpackSidebar({ data }: { data: SupplyBackpackPreview }) {
  return (
    <aside className="supply-backpack-sidebar">
      <section className="supply-backpack-sidebar-card">
        <div className="supply-backpack-sidebar-title">
          <div>
            <span aria-hidden="true">▣</span>
            <h2>背包</h2>
          </div>
          <span>{data.sidebar.capacity}</span>
          <button type="button" aria-label="扩容背包">
            +
          </button>
        </div>
        <nav aria-label="背包分类" className="supply-backpack-categories">
          {data.sidebar.categories.map((category) => (
            <button
              aria-current={category.active ? "page" : undefined}
              className={category.active ? "is-active" : undefined}
              key={category.id}
              type="button"
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </nav>
      </section>
      <section className="supply-backpack-effects-card">
        <h2>今日效果</h2>
        <button type="button" aria-label="今日效果说明">
          i
        </button>
        <div className="supply-backpack-effects-list">
          {data.sidebar.todayEffects.map((effect) => (
            <div className="supply-backpack-effect-row" key={effect.id}>
              <span aria-hidden="true">{effect.icon}</span>
              <b>{effect.label}</b>
              <strong>{effect.value}</strong>
              <time>{effect.expiresIn}</time>
            </div>
          ))}
        </div>
        <Link href="/ui-lab/supply-dashboard" className="supply-backpack-back-link">
          ← 返回大厅
        </Link>
      </section>
    </aside>
  );
}

function BackpackInventoryPanel({ data }: { data: SupplyBackpackPreview }) {
  return (
    <section className="supply-backpack-inventory-panel" aria-label="库存面板">
      <div className="supply-backpack-inventory-toolbar">
        <span aria-hidden="true" />
        <label>
          <span className="sr-only">库存排序</span>
          <select defaultValue={data.selectedSort}>
            {data.sortOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="supply-backpack-grid" role="grid" aria-label="背包库存">
        {data.inventory.slots.map((slot) => (
          <InventorySlot key={slot.type === "item" ? slot.item.id : slot.id} slot={slot} />
        ))}
      </div>
      <div className="supply-backpack-pagination" aria-label="背包分页">
        <button type="button" disabled aria-label="上一页">
          ‹
        </button>
        <span>
          {data.inventory.page} / {data.inventory.totalPages}
        </span>
        <button type="button" aria-label="下一页">
          ›
        </button>
      </div>
    </section>
  );
}

function InventorySlot({ slot }: { slot: SupplyBackpackSlot }) {
  if (slot.type === "locked") {
    return (
      <div className="supply-backpack-slot is-locked" role="gridcell">
        <span aria-hidden="true">🔒</span>
        <b>{slot.unlockLevel}级解锁</b>
      </div>
    );
  }

  return <InventoryItemCard item={slot.item} />;
}

function InventoryItemCard({ item }: { item: SupplyBackpackInventoryItem }) {
  return (
    <button
      aria-label={`${item.name}，${item.rarity}，持有 ${item.quantity}`}
      aria-selected={item.selected}
      className={`supply-backpack-slot is-item ${rarityClass[item.rarity]} ${
        item.selected ? "is-selected" : ""
      }`}
      role="gridcell"
      type="button"
    >
      <span className="supply-backpack-rarity">{item.rarity}</span>
      <Image src={item.image} alt={item.name} width={96} height={96} />
      <span className="supply-backpack-quantity">{item.quantity}</span>
      <b>{item.name}</b>
    </button>
  );
}

function BackpackDetailPanel({ data }: { data: SupplyBackpackPreview }) {
  const detail = data.selectedItemDetail;

  return (
    <aside className="supply-backpack-detail" aria-label="道具详情">
      <div className="supply-backpack-detail-hero">
        <div className={`supply-backpack-detail-image ${rarityClass[detail.rarity]}`}>
          <span>{detail.rarity}</span>
          <Image src={detail.image} alt={detail.name} width={150} height={150} />
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
        <button type="button">{detail.primaryAction}</button>
        <button type="button">{detail.secondaryAction}</button>
      </div>
      <div className="supply-backpack-shop-cta">
        <span>{detail.shopCta.description}</span>
        <Link href={detail.shopCta.href}>{detail.shopCta.label}</Link>
      </div>
    </aside>
  );
}

function BackpackHintBar({ hint }: { hint: string }) {
  return (
    <footer className="supply-backpack-hint">
      <span aria-hidden="true">💡</span>
      <b>小提示：</b>
      <p>{hint}</p>
      <Link href="/ui-lab/supply-dashboard">帮助中心</Link>
    </footer>
  );
}
```

- [ ] **Step 5: Link the Dashboard backpack dock**

Modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx` by replacing the current backpack dock href:

```tsx
<a href="/ui-lab/supply-dashboard/backpack">
```

Expected: only the backpack dock route changes; no production route changes.

- [ ] **Step 6: Run route, mock data, asset, and scene tests**

Run:

```bash
npm test -- __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx
```

Expected: PASS once assets and scene exist.

- [ ] **Step 7: Commit the static scene**

```bash
git add app/ui-lab/supply-dashboard/backpack/page.tsx components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx __tests__/supply-backpack-scene.test.tsx
git commit -m "feat: add supply backpack static scene"
```

## Task 4: Add Backpack Scene CSS And Responsive Safeguards

**Files:**
- Modify: `app/globals.css`
- Create: `__tests__/supply-backpack-scene-css.test.ts`

- [ ] **Step 1: Write the failing CSS contract test**

Create `__tests__/supply-backpack-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply backpack scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines backpack scene layers and inventory states", () => {
    expect(css).toContain(".supply-backpack-scene");
    expect(css).toContain(".supply-backpack-shell");
    expect(css).toContain(".supply-backpack-header");
    expect(css).toContain(".supply-backpack-main-layout");
    expect(css).toContain(".supply-backpack-grid");
    expect(css).toContain(".supply-backpack-detail");
    expect(css).toContain(".supply-backpack-hint");
    expect(css).toContain(".supply-backpack-slot.is-selected");
    expect(css).toContain(".supply-backpack-slot.is-locked");
  });

  it("keeps css scoped and includes responsive and reduced-motion rules", () => {
    const backpackBlock = css.slice(css.indexOf(".supply-backpack-scene"));

    expect(backpackBlock).toContain("grid-template-columns");
    expect(backpackBlock).toContain("@media (max-width: 900px)");
    expect(backpackBlock).toContain("@media (max-width: 520px)");
    expect(backpackBlock).toContain("@media (prefers-reduced-motion: reduce)");
    expect(backpackBlock).not.toContain("design/ui-assets/背包.png");
  });
});
```

- [ ] **Step 2: Run the CSS test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-backpack-scene-css.test.ts
```

Expected: FAIL because the CSS classes do not exist yet.

- [ ] **Step 3: Add scene CSS scoped to `supply-backpack-*`**

Append a backpack section to `app/globals.css`. Keep selectors prefixed with `supply-backpack-*` and include:

```css
.supply-backpack-scene {
  min-height: 100vh;
  padding: clamp(0.5rem, 1vw, 1rem);
  background: #111827;
  color: #111827;
}

.supply-backpack-shell {
  min-height: calc(100vh - 1rem);
  overflow: hidden;
  border: 6px solid #0f172a;
  border-radius: 1.25rem;
  background: #f7f4ec;
  box-shadow: 0 8px 0 #020617;
}

.supply-backpack-header {
  display: flex;
  min-height: 4.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 6px solid #0f172a;
  background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
  padding: 0.75rem 1rem;
}

.supply-backpack-brand,
.supply-backpack-resource-strip,
.supply-backpack-main-layout,
.supply-backpack-sidebar-title,
.supply-backpack-detail-hero,
.supply-backpack-actions,
.supply-backpack-shop-cta,
.supply-backpack-hint {
  display: flex;
  align-items: center;
}

.supply-backpack-brand {
  min-width: 0;
  gap: 0.75rem;
}

.supply-backpack-brand h1 {
  margin: 0;
  font-size: clamp(1.4rem, 2.4vw, 2.3rem);
  font-weight: 1000;
}

.supply-backpack-brand strong {
  font-size: clamp(1rem, 1.6vw, 1.35rem);
}

.supply-backpack-resource-strip {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.65rem;
}

.supply-backpack-resource,
.supply-backpack-close {
  min-height: 3rem;
  border: 4px solid #0f172a;
  background: #1f2937;
  color: #fff;
  box-shadow: 0 4px 0 #020617;
}

.supply-backpack-resource {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 0.45rem;
  padding: 0.35rem 0.85rem;
  font-weight: 1000;
}

.supply-backpack-close {
  width: 3.5rem;
  border-radius: 0.45rem;
  color: #facc15;
  font-size: 2.2rem;
  font-weight: 1000;
}

.supply-backpack-main-layout {
  display: grid;
  grid-template-columns: minmax(17rem, 22%) minmax(31rem, 1fr) minmax(22rem, 31%);
  gap: 0.75rem;
  padding: 1rem;
}

.supply-backpack-sidebar,
.supply-backpack-inventory-panel,
.supply-backpack-detail {
  min-width: 0;
}

.supply-backpack-sidebar {
  display: grid;
  gap: 0.9rem;
}

.supply-backpack-sidebar-card,
.supply-backpack-effects-card,
.supply-backpack-inventory-panel,
.supply-backpack-detail {
  border: 3px solid #111827;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 4px 0 rgba(15, 23, 42, 0.28);
}

.supply-backpack-sidebar-card,
.supply-backpack-effects-card {
  border-radius: 0.95rem;
  padding: 1rem;
}

.supply-backpack-sidebar-title {
  justify-content: space-between;
  gap: 0.65rem;
}

.supply-backpack-sidebar-title div {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.supply-backpack-sidebar-title h2,
.supply-backpack-effects-card h2,
.supply-backpack-detail h2,
.supply-backpack-detail h3 {
  margin: 0;
  font-weight: 1000;
}

.supply-backpack-sidebar-title button,
.supply-backpack-effects-card > button {
  border: 3px solid #0f172a;
  background: #facc15;
  font-weight: 1000;
  box-shadow: 0 3px 0 #0f172a;
}

.supply-backpack-categories {
  display: grid;
  gap: 0.6rem;
  margin-top: 1rem;
}

.supply-backpack-categories button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  min-height: 3.55rem;
  gap: 0.75rem;
  border: 2px solid #9ca3af;
  border-radius: 0.35rem;
  background: #fffdf4;
  padding: 0 1rem;
  text-align: left;
  font-size: 1.1rem;
  font-weight: 1000;
}

.supply-backpack-categories button.is-active {
  border-color: #111827;
  background: #facc15;
  box-shadow: 0 4px 0 #111827;
}

.supply-backpack-effects-card {
  position: relative;
}

.supply-backpack-effects-card > button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
}

.supply-backpack-effects-list {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.9rem;
}

.supply-backpack-effect-row {
  display: grid;
  grid-template-columns: 2.15rem 1fr auto auto;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  padding: 0.4rem 0;
  font-size: 0.9rem;
}

.supply-backpack-effect-row strong,
.supply-backpack-effect-row time {
  color: #15803d;
  font-weight: 1000;
}

.supply-backpack-back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 4rem;
  margin-top: 1rem;
  border: 3px solid #111827;
  border-radius: 0.45rem;
  background: #facc15;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 1000;
  text-decoration: none;
  box-shadow: 0 5px 0 #111827;
}

.supply-backpack-inventory-panel {
  border-color: #9ca3af;
  border-radius: 0.45rem;
  padding: 0.85rem 1rem;
}

.supply-backpack-inventory-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.supply-backpack-inventory-toolbar select {
  min-height: 2.4rem;
  border: 2px solid #111827;
  border-radius: 0.35rem;
  background: white;
  padding: 0 0.75rem;
  font-weight: 1000;
}

.supply-backpack-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}

.supply-backpack-slot {
  position: relative;
  display: grid;
  min-height: 10.45rem;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  border: 2px solid #60a5fa;
  border-radius: 0.45rem;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  padding: 0.45rem;
  font-weight: 1000;
}

.supply-backpack-slot.is-item {
  cursor: default;
}

.supply-backpack-slot.is-selected {
  outline: 4px solid #facc15;
  border-color: #d97706;
  box-shadow: inset 0 0 0 3px #fde047, 0 4px 0 #d97706;
}

.supply-backpack-slot.is-locked {
  grid-template-rows: 1fr auto;
  border-color: #1f2937;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  color: #e5e7eb;
}

.supply-backpack-rarity {
  justify-self: start;
  font-weight: 1000;
}

.supply-backpack-rarity-n {
  border-color: #60a5fa;
}

.supply-backpack-rarity-r {
  border-color: #d97706;
  background: linear-gradient(180deg, #fff7ed 0%, #fef3c7 100%);
}

.supply-backpack-rarity-sr {
  border-color: #9333ea;
  background: linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%);
}

.supply-backpack-rarity-ssr {
  border-color: #ea580c;
  background: linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%);
}

.supply-backpack-quantity {
  position: absolute;
  right: 0.65rem;
  bottom: 2rem;
  font-weight: 1000;
}

.supply-backpack-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.8rem;
}

.supply-backpack-pagination button,
.supply-backpack-pagination span {
  min-width: 3.5rem;
  min-height: 2.35rem;
  border: 2px solid #111827;
  border-radius: 0.35rem;
  background: #facc15;
  font-weight: 1000;
}

.supply-backpack-pagination span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6.5rem;
  background: #fff;
}

.supply-backpack-pagination button:disabled {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #cbd5e1;
}

.supply-backpack-detail {
  display: flex;
  flex-direction: column;
  border-color: #60a5fa;
  border-radius: 0.45rem;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  padding: 1.5rem;
}

.supply-backpack-detail-hero {
  gap: 1.25rem;
}

.supply-backpack-detail-image {
  position: relative;
  display: grid;
  width: 9.75rem;
  aspect-ratio: 1;
  place-items: center;
  border: 3px solid #d97706;
  border-radius: 0.35rem;
  background: #fff;
}

.supply-backpack-detail-image span {
  position: absolute;
  top: 0.35rem;
  left: 0.45rem;
  font-weight: 1000;
}

.supply-backpack-detail-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.supply-backpack-detail-title-row span {
  border: 2px solid #bfdbfe;
  border-radius: 0.25rem;
  background: #eff6ff;
  padding: 0.25rem 0.55rem;
  font-size: 0.85rem;
  font-weight: 1000;
}

.supply-backpack-description,
.supply-backpack-detail-rule {
  border-bottom: 2px dashed rgba(15, 23, 42, 0.25);
  padding: 1rem 0;
}

.supply-backpack-detail-rule p,
.supply-backpack-detail-rule ul {
  margin: 0.7rem 0 0;
  font-weight: 800;
}

.supply-backpack-actions {
  gap: 1rem;
  margin-top: auto;
  padding-top: 1.2rem;
}

.supply-backpack-actions button,
.supply-backpack-shop-cta a {
  min-height: 3.9rem;
  border: 3px solid #111827;
  border-radius: 0.35rem;
  padding: 0 1.4rem;
  font-size: 1.1rem;
  font-weight: 1000;
  box-shadow: 0 5px 0 #111827;
}

.supply-backpack-actions button:first-child {
  flex: 1;
  background: #facc15;
}

.supply-backpack-actions button:last-child {
  flex: 1;
  background: #fff;
}

.supply-backpack-shop-cta {
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem -1.5rem -1.5rem;
  border-top: 2px solid #93c5fd;
  background: #dbeafe;
  padding: 0.75rem 1.5rem;
  font-weight: 900;
}

.supply-backpack-shop-cta a {
  min-height: 2.8rem;
  background: #fff;
  color: #111827;
  text-decoration: none;
}

.supply-backpack-hint {
  min-height: 3.8rem;
  gap: 0.6rem;
  border-top: 6px solid #0f172a;
  background: #111827;
  color: #fff;
  padding: 0.75rem 1.5rem;
  font-weight: 900;
}

.supply-backpack-hint b,
.supply-backpack-hint a {
  color: #facc15;
}

.supply-backpack-hint p {
  margin: 0;
  flex: 1;
}

.supply-backpack-hint a {
  text-decoration: none;
}

@media (max-width: 1180px) {
  .supply-backpack-main-layout {
    grid-template-columns: minmax(15rem, 21%) minmax(26rem, 1fr) minmax(19rem, 30%);
  }

  .supply-backpack-grid {
    gap: 0.65rem;
  }

  .supply-backpack-slot {
    min-height: 9rem;
  }
}

@media (max-width: 900px) {
  .supply-backpack-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .supply-backpack-main-layout {
    grid-template-columns: 1fr;
  }

  .supply-backpack-categories {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .supply-backpack-categories button {
    min-height: 3rem;
    padding: 0 0.55rem;
    font-size: 0.9rem;
  }

  .supply-backpack-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .supply-backpack-scene {
    padding: 0;
  }

  .supply-backpack-shell {
    min-height: 100vh;
    border-radius: 0;
  }

  .supply-backpack-resource {
    flex: 1 1 calc(50% - 0.5rem);
    justify-content: center;
  }

  .supply-backpack-categories {
    grid-template-columns: 1fr;
  }

  .supply-backpack-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .supply-backpack-detail-hero,
  .supply-backpack-actions,
  .supply-backpack-shop-cta,
  .supply-backpack-hint {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .supply-backpack-scene *,
  .supply-backpack-scene *::before,
  .supply-backpack-scene *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run CSS and scene tests**

Run:

```bash
npm test -- __tests__/supply-backpack-scene-css.test.ts __tests__/supply-backpack-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit CSS**

```bash
git add app/globals.css __tests__/supply-backpack-scene-css.test.ts
git commit -m "style: add supply backpack scene layout"
```

## Task 5: Verify In Browser And Polish

**Files:**
- Modify only files already introduced by this plan if visual QA finds issues.

- [ ] **Step 1: Run all backpack tests**

Run:

```bash
npm test -- __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing warnings unrelated to backpack files.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts at `http://localhost:3000` or the next available configured port.

- [ ] **Step 4: Check desktop viewport**

Open:

```text
http://localhost:3000/ui-lab/supply-dashboard/backpack
```

Use a `1536 x 1024` browser viewport. Confirm:

- Top HUD reads `牛马补给站 / 背包`.
- Right resources show `2,450`, `18`, `18/40`.
- Main content keeps three columns.
- Inventory grid visually reads as 5 x 4.
- `咖啡兑换券` is selected and matches right detail.
- Bottom hint bar is visible.
- No text overlaps or horizontal scroll appears.

- [ ] **Step 5: Check mobile viewport**

Use a `390 x 844` browser viewport. Confirm:

- Header resources wrap without clipping.
- Categories and effects remain readable.
- Inventory grid uses 3 columns.
- Detail panel appears below inventory.
- CTAs fit their containers.
- No horizontal scroll appears.

- [ ] **Step 6: Patch any visual issues found**

If visual QA finds overflow or spacing issues, adjust only `supply-backpack-*` CSS or backpack mock text lengths. Re-run:

```bash
npm test -- __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Final commit**

```bash
git add app/ui-lab/supply-dashboard/backpack/page.tsx components/gamification/ui-lab/supply-backpack components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx app/globals.css __tests__/supply-backpack-*.test.ts public/assets/home-scenes/supply/backpack
git commit -m "feat: prototype supply backpack scene"
```

## Self-Review Checklist

- The route is isolated under `/ui-lab/supply-dashboard/backpack`.
- Production `SupplyStation`, `Navbar`, `AppTab`, API Routes, Prisma schema, and real gamification state are untouched.
- Mock data matches the `背包.png` prototype values and selected coffee coupon detail.
- Required backpack assets are final WebP files under `public/assets/home-scenes/supply/backpack/`.
- CSS selectors use the `supply-backpack-*` prefix.
- Desktop and mobile responsive rules are present.
- Tests cover route, mock data, assets, scene DOM, selected state, static CTAs, and CSS contract.
- No raw generated images or design prototype PNGs are referenced by code.
