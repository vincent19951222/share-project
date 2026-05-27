# Supply UI Lab Static Business Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the six Supply UI Lab static mock pages business-consistent, locally interactive, and ready for a later real business integration phase.

**Architecture:** Add a UI Lab-only shared data layer for resources, active effects, catalog items, draw results, and task records. Keep route isolation under `/ui-lab/supply-dashboard/*`, convert page scenes that need click state to client components, and keep page-specific layout inside each existing `components/gamification/ui-lab/supply-<page>/` directory.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict mode, Vitest + jsdom, existing `app/globals.css` Supply UI Lab CSS.

---

## Scope

This plan implements the approved overall spec:

`docs/superpowers/specs/2026-05-18-supply-ui-lab-static-business-closure-design.md`

It does not connect Prisma, API Routes, real sessions, real lottery draws, real inventory, real redemption state, Enterprise WeChat, or the production `SupplyStation`.

The worktree already contains unrelated dirty UI Lab changes. During execution, stage and commit only the files touched by each task.

## File Structure

Create shared UI Lab data:

- Create: `components/gamification/ui-lab/supply-data/types.ts`
  - Shared resource, catalog, effect, draw result, and task record types.
- Create: `components/gamification/ui-lab/supply-data/catalog.ts`
  - Canonical item catalog aligned to active non-coin reward definitions.
- Create: `components/gamification/ui-lab/supply-data/effects.ts`
  - Dashboard/backpack shared today effect fixture.
- Create: `components/gamification/ui-lab/supply-data/resources.ts`
  - Shared top bar resource fixtures using `银子 / 抽奖券 / 背包`.
- Create: `components/gamification/ui-lab/supply-data/records.ts`
  - Task record dates, timeline, draw history, radar, redemption, and rules fixtures.

Update shared UI:

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
  - Add controlled filter behavior and reusable local feedback affordances.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
  - Ensure resource type and labels support `抽奖券` consistently.

Update pages:

- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/types.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/types.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/types.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`

Update tests:

- Create: `__tests__/supply-ui-lab-catalog.test.ts`
- Create: `__tests__/supply-ui-lab-static-business-closure.test.tsx`
- Modify page-specific `__tests__/supply-*-mock-data.test.ts`
- Modify page-specific `__tests__/supply-*-scene.test.tsx`
- Modify page-specific `__tests__/supply-*-assets.test.ts`
- Modify page-specific `__tests__/supply-*-scene-css.test.ts` only when CSS selectors change.

Potential assets:

- Create generated item icons under `public/assets/home-scenes/supply/items/` only when existing atomic media cannot represent the item clearly.

## Task 1: Shared Catalog, Resources, And Active Effects

**Files:**
- Create: `components/gamification/ui-lab/supply-data/types.ts`
- Create: `components/gamification/ui-lab/supply-data/catalog.ts`
- Create: `components/gamification/ui-lab/supply-data/effects.ts`
- Create: `components/gamification/ui-lab/supply-data/resources.ts`
- Create: `__tests__/supply-ui-lab-catalog.test.ts`

- [ ] **Step 1: Write the failing catalog contract test**

Create `__tests__/supply-ui-lab-catalog.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS,
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";

describe("Supply UI Lab shared business data", () => {
  it("keeps every active non-coin draw reward visible, buyable, and inventory-backed", () => {
    expect(SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS).toEqual([
      "task_reroll_coupon",
      "small_boost_coupon",
      "fitness_leave_coupon",
      "drink_water_ping",
      "walk_ping",
      "team_standup_ping",
      "chat_ping",
      "share_info_ping",
      "team_broadcast_coupon",
      "double_niuma_coupon",
      "season_sprint_coupon",
      "luckin_coffee_coupon",
    ]);

    for (const itemId of SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS) {
      const item = supplyUiLabCatalogBySourceItemId[itemId];

      expect(item, itemId).toBeDefined();
      expect(item.drawPool.drawable, itemId).toBe(true);
      expect(item.shop.buyable, itemId).toBe(true);
      expect(item.obtainSources, itemId).toContain("draw_pool");
      expect(item.obtainSources, itemId).toContain("shop");
      expect(item.inventory.quantity, itemId).toBeGreaterThanOrEqual(0);
      expect(item.media.image, itemId).toMatch(/^\/(assets|gamification)\//);
    }
  });

  it("keeps coin rewards out of shop products and backpack slots", () => {
    expect(SUPPLY_UI_LAB_COIN_REWARD_ROWS.map((row) => row.rewardId)).toEqual([
      "coins_005",
      "coins_010",
      "coins_020",
      "coins_040",
      "coins_080",
      "coins_120",
    ]);
    expect(supplyUiLabCatalog.map((item) => item.sourceItemId)).not.toContain("coins_020");
  });

  it("uses the Phase 2 resource vocabulary", () => {
    expect(supplyUiLabResources.dashboard.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
    expect(supplyUiLabResources.dashboard.map((resource) => resource.value)).toEqual(["2,450", "18", "18/60"]);
    expect(JSON.stringify(supplyUiLabResources)).not.toContain("补给券");
    expect(JSON.stringify(supplyUiLabResources)).not.toContain("体力");
  });

  it("shares today effects across Dashboard and Backpack", () => {
    expect(supplyUiLabActiveEffects).toEqual([
      expect.objectContaining({ sourceItemId: "small_boost_coupon", statusLabel: "今日待生效" }),
      expect.objectContaining({ sourceItemId: "season_sprint_coupon", statusLabel: "今日已生效" }),
    ]);
    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("体力");
    expect(supplyUiLabActiveEffects.every((effect) => effect.endsAtLabel === "今日 23:59")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL because `components/gamification/ui-lab/supply-data/*` does not exist.

- [ ] **Step 3: Add shared types**

Create `components/gamification/ui-lab/supply-data/types.ts`:

```typescript
export type SupplyUiLabResourceId = "coins" | "ticket" | "backpack";
export type SupplyUiLabCatalogCategory = "boost" | "protection" | "social" | "task" | "real_world" | "lottery";
export type SupplyUiLabCatalogRarity = "N" | "R" | "SR" | "SSR";
export type SupplyUiLabUseTiming = "today" | "instant" | "manual_redemption";
export type SupplyUiLabObtainSource = "draw_pool" | "shop" | "task_reward" | "season_reward";
export type SupplyUiLabDrawTier = "utility" | "social" | "rare";
export type SupplyUiLabAssetStatus = "existing" | "needs_generated";
export type SupplyUiLabEffectStatus = "pending" | "active" | "expired";

export type SupplyUiLabResource = {
  id: SupplyUiLabResourceId;
  label: string;
  value: string;
  icon: string;
};

export type SupplyUiLabCatalogItem = {
  id: string;
  sourceItemId: string;
  name: string;
  category: SupplyUiLabCatalogCategory;
  rarity: SupplyUiLabCatalogRarity;
  description: string;
  effectSummary: string;
  useTiming: SupplyUiLabUseTiming;
  obtainSources: SupplyUiLabObtainSource[];
  shop: {
    buyable: boolean;
    priceCoins: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    requiresAdminConfirmation: boolean;
  };
  drawPool: {
    drawable: boolean;
    rewardId?: string;
    tier?: SupplyUiLabDrawTier;
    probabilityLabel?: string;
  };
  inventory: {
    quantity: number;
    selected?: boolean;
  };
  media: {
    image: string;
    assetStatus: SupplyUiLabAssetStatus;
  };
};

export type SupplyUiLabCoinRewardRow = {
  rewardId: string;
  name: string;
  amount: number;
  probabilityLabel: string;
  image: string;
};

export type SupplyUiLabActiveEffect = {
  id: string;
  sourceItemId: string;
  label: string;
  effectSummary: string;
  status: SupplyUiLabEffectStatus;
  statusLabel: "今日待生效" | "今日已生效" | "已过期";
  endsAtLabel: string;
  icon: string;
};
```

- [ ] **Step 4: Add shared catalog**

Create `components/gamification/ui-lab/supply-data/catalog.ts` with this structure and exact active item ids:

```typescript
import type { SupplyUiLabCatalogItem, SupplyUiLabCoinRewardRow } from "./types";

export const SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS = [
  "task_reroll_coupon",
  "small_boost_coupon",
  "fitness_leave_coupon",
  "drink_water_ping",
  "walk_ping",
  "team_standup_ping",
  "chat_ping",
  "share_info_ping",
  "team_broadcast_coupon",
  "double_niuma_coupon",
  "season_sprint_coupon",
  "luckin_coffee_coupon",
] as const;

const ITEM_ASSETS = {
  taskReroll: "/gamification/rewards/icons/task_reroll_coupon.png",
  smallBoost: "/gamification/rewards/icons/small_boost_coupon.png",
  fitnessLeave: "/assets/home-scenes/supply/items/fitness-leave-coupon.webp",
  drinkWater: "/assets/home-scenes/supply/items/drink-water-ping.webp",
  walk: "/assets/home-scenes/supply/items/walk-ping.webp",
  teamStandup: "/assets/home-scenes/supply/items/team-standup-ping.webp",
  chat: "/assets/home-scenes/supply/items/chat-ping.webp",
  shareInfo: "/assets/home-scenes/supply/items/share-info-ping.webp",
  teamBroadcast: "/gamification/rewards/icons/team_broadcast_coupon.png",
  doubleNiuma: "/assets/home-scenes/supply/items/double-niuma-coupon.webp",
  seasonSprint: "/assets/home-scenes/supply/items/season-sprint-coupon.webp",
  coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
  coins: "/gamification/rewards/icons/coins_020.png",
} as const;

export const SUPPLY_UI_LAB_COIN_REWARD_ROWS: SupplyUiLabCoinRewardRow[] = [
  { rewardId: "coins_005", name: "摸鱼津贴", amount: 5, probabilityLabel: "15%", image: ITEM_ASSETS.coins },
  { rewardId: "coins_010", name: "工位补贴", amount: 10, probabilityLabel: "12%", image: ITEM_ASSETS.coins },
  { rewardId: "coins_020", name: "今日没白来", amount: 20, probabilityLabel: "10%", image: ITEM_ASSETS.coins },
  { rewardId: "coins_040", name: "老板没发现", amount: 40, probabilityLabel: "5%", image: ITEM_ASSETS.coins },
  { rewardId: "coins_080", name: "小发一笔", amount: 80, probabilityLabel: "2%", image: ITEM_ASSETS.coins },
  { rewardId: "coins_120", name: "牛马暴富", amount: 120, probabilityLabel: "1%", image: "/gamification/rewards/icons/coins_120.png" },
];

export const supplyUiLabCatalog: SupplyUiLabCatalogItem[] = [
  {
    id: "catalog-task-reroll",
    sourceItemId: "task_reroll_coupon",
    name: "任务换班券",
    category: "task",
    rarity: "R",
    description: "把当天一个四维任务换成同维度另一张卡。",
    effectSummary: "同维度更换 1 个今日主线任务",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 150, dailyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_task_reroll", tier: "utility", probabilityLabel: "10%" },
    inventory: { quantity: 2, selected: true },
    media: { image: ITEM_ASSETS.taskReroll, assetStatus: "existing" },
  },
  {
    id: "catalog-small-boost",
    sourceItemId: "small_boost_coupon",
    name: "小暴击券",
    category: "boost",
    rarity: "R",
    description: "当日真实健身打卡个人资产 1.5x，不影响赛季贡献。",
    effectSummary: "今日个人银子收益 1.5x",
    useTiming: "today",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 220, dailyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_small_boost", tier: "utility", probabilityLabel: "9%" },
    inventory: { quantity: 3 },
    media: { image: ITEM_ASSETS.smallBoost, assetStatus: "existing" },
  },
  {
    id: "catalog-fitness-leave",
    sourceItemId: "fitness_leave_coupon",
    name: "健身请假券",
    category: "protection",
    rarity: "R",
    description: "当天无法健身时保护连续记录不断联，并冻结下一次真实健身奖励档位。",
    effectSummary: "保护连续记录，不发银子，不推进赛季",
    useTiming: "today",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 260, dailyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_fitness_leave", tier: "utility", probabilityLabel: "8%" },
    inventory: { quantity: 1 },
    media: { image: ITEM_ASSETS.fitnessLeave, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-drink-water",
    sourceItemId: "drink_water_ping",
    name: "点名喝水令",
    category: "social",
    rarity: "N",
    description: "点名一位成员喝水，对方确认后生成响应记录。",
    effectSummary: "发起 1 次喝水提醒",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 80, dailyLimit: 2, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_drink_water_ping", tier: "social", probabilityLabel: "5%" },
    inventory: { quantity: 6 },
    media: { image: ITEM_ASSETS.drinkWater, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-walk",
    sourceItemId: "walk_ping",
    name: "出门溜达令",
    category: "social",
    rarity: "N",
    description: "邀请一位成员起身走一圈，对方确认后生成轻动态。",
    effectSummary: "发起 1 次起身活动邀请",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 80, dailyLimit: 2, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_walk_ping", tier: "social", probabilityLabel: "5%" },
    inventory: { quantity: 5 },
    media: { image: ITEM_ASSETS.walk, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-team-standup",
    sourceItemId: "team_standup_ping",
    name: "全员起立令",
    category: "social",
    rarity: "R",
    description: "发起一次全队起身提醒，记录当天响应人数。",
    effectSummary: "发起 1 次全队起身提醒",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 180, dailyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_team_standup_ping", tier: "social", probabilityLabel: "4%" },
    inventory: { quantity: 2 },
    media: { image: ITEM_ASSETS.teamStandup, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-chat",
    sourceItemId: "chat_ping",
    name: "今日闲聊令",
    category: "social",
    rarity: "N",
    description: "邀请一位成员完成一次轻量闲聊，双方确认后生成响应记录。",
    effectSummary: "发起 1 次闲聊互动",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 90, dailyLimit: 2, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_chat_ping", tier: "social", probabilityLabel: "4%" },
    inventory: { quantity: 4 },
    media: { image: ITEM_ASSETS.chat, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-share-info",
    sourceItemId: "share_info_ping",
    name: "红盘情报令",
    category: "social",
    rarity: "N",
    description: "点名一位成员分享今天看到的新东西，完成后进入今日小摘要。",
    effectSummary: "发起 1 次信息分享邀请",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 90, dailyLimit: 2, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_share_info_ping", tier: "social", probabilityLabel: "4%" },
    inventory: { quantity: 4 },
    media: { image: ITEM_ASSETS.shareInfo, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-team-broadcast",
    sourceItemId: "team_broadcast_coupon",
    name: "团队小喇叭",
    category: "social",
    rarity: "R",
    description: "把一句轻量播报发到团队动态或后续摘要。",
    effectSummary: "发布 1 条团队播报草稿",
    useTiming: "instant",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 240, dailyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_team_broadcast", tier: "social", probabilityLabel: "2%" },
    inventory: { quantity: 1 },
    media: { image: ITEM_ASSETS.teamBroadcast, assetStatus: "existing" },
  },
  {
    id: "catalog-double-niuma",
    sourceItemId: "double_niuma_coupon",
    name: "双倍牛马券",
    category: "boost",
    rarity: "SSR",
    description: "当日真实健身打卡个人资产 2x，赛季贡献 2x。",
    effectSummary: "今日个人银子和赛季贡献 2x",
    useTiming: "today",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 1200, weeklyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_double_niuma", tier: "rare", probabilityLabel: "2%" },
    inventory: { quantity: 1 },
    media: { image: ITEM_ASSETS.doubleNiuma, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-season-sprint",
    sourceItemId: "season_sprint_coupon",
    name: "赛季冲刺券",
    category: "boost",
    rarity: "SR",
    description: "当日真实健身打卡赛季贡献 2x。",
    effectSummary: "今日赛季贡献 2x",
    useTiming: "today",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 900, weeklyLimit: 1, requiresAdminConfirmation: false },
    drawPool: { drawable: true, rewardId: "reward_season_sprint", tier: "rare", probabilityLabel: "1%" },
    inventory: { quantity: 1 },
    media: { image: ITEM_ASSETS.seasonSprint, assetStatus: "needs_generated" },
  },
  {
    id: "catalog-luckin-coffee",
    sourceItemId: "luckin_coffee_coupon",
    name: "瑞幸咖啡券",
    category: "real_world",
    rarity: "SSR",
    description: "可找管理员线下兑换一杯瑞幸咖啡。",
    effectSummary: "申请线下兑换瑞幸咖啡",
    useTiming: "manual_redemption",
    obtainSources: ["draw_pool", "shop"],
    shop: { buyable: true, priceCoins: 1000, dailyLimit: 1, requiresAdminConfirmation: true },
    drawPool: { drawable: true, rewardId: "reward_luckin_coffee", tier: "rare", probabilityLabel: "1%" },
    inventory: { quantity: 2 },
    media: { image: ITEM_ASSETS.coffee, assetStatus: "existing" },
  },
];

export const supplyUiLabCatalogBySourceItemId = Object.fromEntries(
  supplyUiLabCatalog.map((item) => [item.sourceItemId, item]),
) as Record<(typeof SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS)[number], SupplyUiLabCatalogItem>;
```

- [ ] **Step 5: Add shared resources and effects**

Create `components/gamification/ui-lab/supply-data/resources.ts`:

```typescript
import type { SupplyUiLabResource } from "./types";

const playerResources: SupplyUiLabResource[] = [
  { id: "coins", label: "银子", value: "2,450", icon: "◎" },
  { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
  { id: "backpack", label: "背包", value: "18/60", icon: "包" },
];

export const supplyUiLabResources = {
  dashboard: playerResources,
  teamGoal: playerResources,
  shop: [
    { id: "coins", label: "银子", value: "3,850", icon: "◎" },
    { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
    { id: "backpack", label: "背包", value: "18/60", icon: "包" },
  ] satisfies SupplyUiLabResource[],
  taskRecord: playerResources,
  backpack: playerResources,
  drawPool: [
    { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
    { id: "coins", label: "银子", value: "2,450", icon: "◎" },
  ] satisfies SupplyUiLabResource[],
};
```

Create `components/gamification/ui-lab/supply-data/effects.ts`:

```typescript
import type { SupplyUiLabActiveEffect } from "./types";

export const supplyUiLabActiveEffects: SupplyUiLabActiveEffect[] = [
  {
    id: "effect-small-boost",
    sourceItemId: "small_boost_coupon",
    label: "小暴击券",
    effectSummary: "今日个人银子收益 1.5x",
    status: "pending",
    statusLabel: "今日待生效",
    endsAtLabel: "今日 23:59",
    icon: "1.5x",
  },
  {
    id: "effect-season-sprint",
    sourceItemId: "season_sprint_coupon",
    label: "赛季冲刺券",
    effectSummary: "今日赛季贡献 2x",
    status: "active",
    statusLabel: "今日已生效",
    endsAtLabel: "今日 23:59",
    icon: "2x",
  },
];
```

- [ ] **Step 6: Run the catalog test**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add components/gamification/ui-lab/supply-data __tests__/supply-ui-lab-catalog.test.ts
git commit -m "feat: add supply ui lab shared catalog"
```

## Task 2: Atomic Item Assets For Catalog

**Files:**
- Create: `public/assets/home-scenes/supply/items/fitness-leave-coupon.webp`
- Create: `public/assets/home-scenes/supply/items/drink-water-ping.webp`
- Create: `public/assets/home-scenes/supply/items/walk-ping.webp`
- Create: `public/assets/home-scenes/supply/items/team-standup-ping.webp`
- Create: `public/assets/home-scenes/supply/items/chat-ping.webp`
- Create: `public/assets/home-scenes/supply/items/share-info-ping.webp`
- Create: `public/assets/home-scenes/supply/items/double-niuma-coupon.webp`
- Create: `public/assets/home-scenes/supply/items/season-sprint-coupon.webp`
- Modify: `__tests__/supply-ui-lab-catalog.test.ts`

- [ ] **Step 1: Extend the asset test**

Add `existsSync` and `statSync` to the top of `__tests__/supply-ui-lab-catalog.test.ts`:

```typescript
import { existsSync, statSync } from "node:fs";
```

Append this test case inside the existing `describe("Supply UI Lab shared business data", ...)` block:

```typescript

it("ships generated atomic item art for catalog items that need it", () => {
  const generatedItems = supplyUiLabCatalog.filter((item) => item.media.assetStatus === "needs_generated");

  expect(generatedItems.map((item) => item.sourceItemId)).toEqual([
    "fitness_leave_coupon",
    "drink_water_ping",
    "walk_ping",
    "team_standup_ping",
    "chat_ping",
    "share_info_ping",
    "double_niuma_coupon",
    "season_sprint_coupon",
  ]);

  for (const item of generatedItems) {
    const path = `public${item.media.image}`;

    expect(existsSync(path), item.sourceItemId).toBe(true);
    expect(statSync(path).size, item.sourceItemId).toBeLessThanOrEqual(140 * 1024);
  }
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL because the generated item assets do not exist yet.

- [ ] **Step 3: Generate the missing item icons**

Use the imagegen skill or an equivalent approved image generation workflow. Save each output as a transparent WebP file at the exact path listed above. Use these prompts:

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: folded gym leave pass with small dumbbell stamp and yellow edge. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: blue water bottle ping token with splash and tiny notification mark. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: walking shoe ping token with motion lines and green accent. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: team standup megaphone token with three tiny person silhouettes. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: chat bubble token with coffee steam and small smile mark. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: red market info note token with folded corner and sparkle. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: golden double reward ticket with dumbbell and lightning motif. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

```text
Transparent-background square pixel-art item icon for 脱脂牛马 fitness game UI. Object: season sprint ticket with running track curve and trophy sparkle. Style: crisp 16-bit web game item, thick black pixel outline, warm highlights, readable at 96px, no text, no logo, no watermark.
```

- [ ] **Step 4: Run the catalog asset test**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add public/assets/home-scenes/supply/items __tests__/supply-ui-lab-catalog.test.ts
git commit -m "feat: add supply ui lab item assets"
```

## Task 3: Shared Primitive Interactions And Global Guardrails

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- Create: `__tests__/supply-ui-lab-static-business-closure.test.tsx`
- Modify: `__tests__/supply-ui-lab-primitives.test.tsx`

- [ ] **Step 1: Add failing primitive interaction assertions**

Extend `__tests__/supply-ui-lab-primitives.test.tsx` imports:

```typescript
import { vi } from "vitest";
```

Append this test:

```typescript
it("supports controlled filter selection", async () => {
  const onSelect = vi.fn();

  await act(async () => {
    root.render(
      <SupplyUiLabFilterBar
        ariaLabel="记录筛选"
        filters={[
          { id: "all", label: "全部", active: true },
          { id: "draws", label: "抽卡", active: false },
        ]}
        onSelect={onSelect}
      />,
    );
  });

  container.querySelectorAll("button")[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(onSelect).toHaveBeenCalledWith("draws");
});
```

Expected TypeScript failure before implementation because `onSelect` is not a prop.

- [ ] **Step 2: Add global banned-term guardrail test**

Create `__tests__/supply-ui-lab-static-business-closure.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bannedRenderedTerms = ["补给券", "生命票", "体力", "扩容", "帮助中心", "意见反馈", "设置"];

describe("Supply UI Lab static business closure", () => {
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

  it("keeps all rendered UI Lab pages on the Phase 2 vocabulary", async () => {
    const scenes = [
      <SupplyDashboardScene key="dashboard" data={supplyDashboardMock} />,
      <SupplyTeamGoalScene key="team-goal" data={supplyTeamGoalMock} />,
      <SupplyShopScene key="shop" data={supplyShopMock} />,
      <SupplyTaskRecordScene key="task-record" data={supplyTaskRecordMock} />,
      <SupplyDrawPoolScene key="draw-pool" data={supplyDrawPoolMock} />,
      <SupplyBackpackScene key="backpack" data={supplyBackpackMock} />,
    ];

    await act(async () => {
      root.render(<>{scenes}</>);
    });

    const renderedText = container.textContent ?? "";

    for (const term of bannedRenderedTerms) {
      expect(renderedText).not.toContain(term);
    }

    expect(renderedText).toContain("抽奖券");
    expect(renderedText).toContain("背包");
  });

  it("does not render dead main-flow anchors", async () => {
    await act(async () => {
      root.render(
        <>
          <SupplyDashboardScene data={supplyDashboardMock} />
          <SupplyTeamGoalScene data={supplyTeamGoalMock} />
          <SupplyShopScene data={supplyShopMock} />
          <SupplyTaskRecordScene data={supplyTaskRecordMock} />
          <SupplyDrawPoolScene data={supplyDrawPoolMock} />
          <SupplyBackpackScene data={supplyBackpackMock} />
        </>,
      );
    });

    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(container.querySelector('a[href="#help"]')).toBeNull();
    expect(container.querySelector('a[href="#feedback"]')).toBeNull();
    expect(container.querySelector('a[href="#settings"]')).toBeNull();
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
  });
});
```

- [ ] **Step 3: Run focused tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: FAIL because `SupplyUiLabFilterBar` lacks `onSelect`, and rendered pages still contain banned Phase 1 terms.

- [ ] **Step 4: Add controlled primitive behavior**

Modify `SupplyUiLabFilterBar` in `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`:

```typescript
export function SupplyUiLabFilterBar({
  ariaLabel,
  filters,
  onSelect,
}: {
  ariaLabel: string;
  filters: Array<{ id: string; label: string; active: boolean }>;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="supply-ui-lab-filterbar" role="tablist" aria-label={ariaLabel}>
      {filters.map((filter) => (
        <button
          aria-selected={filter.active}
          key={filter.id}
          onClick={() => onSelect?.(filter.id)}
          role="tab"
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run primitive test**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Leave the global guardrail failing until page tasks complete**

Run:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: FAIL at this point. Keep the test in the tree; Tasks 4-9 make it pass.

- [ ] **Step 7: Commit Task 3 primitives only**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-static-business-closure.test.tsx
git commit -m "test: add supply ui lab closure guardrails"
```

## Task 4: Dashboard Static Business Closure

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `__tests__/supply-dashboard-mock-data.test.ts`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`

- [ ] **Step 1: Update Dashboard tests first**

Modify `__tests__/supply-dashboard-mock-data.test.ts` expectations:

```typescript
expect(supplyDashboardMock.resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
expect(supplyDashboardMock.inventoryPreview.totalSlots).toBe(60);
expect(JSON.stringify(supplyDashboardMock)).not.toContain("补给券");
expect(JSON.stringify(supplyDashboardMock)).not.toContain("体力");
expect(JSON.stringify(supplyDashboardMock)).not.toContain("生命票");
expect(supplyDashboardMock.profile.totalExp).toBe(27_720);
expect(supplyDashboardMock.profile.level).toBe(28);
expect(supplyDashboardMock.profile.currentLevelExp).toBe(720);
expect(supplyDashboardMock.activeEffects).toHaveLength(2);
```

Add scene assertions to `__tests__/supply-dashboard-scene.test.tsx`:

```typescript
expect(container.textContent).toContain("牛马等级");
expect(container.textContent).toContain("抽奖券");
expect(container.textContent).not.toContain("体力");
expect(container.textContent).not.toContain("帮助中心");
expect(container.textContent).not.toContain("意见反馈");
expect(container.textContent).not.toContain("设置");
```

- [ ] **Step 2: Run Dashboard tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL because Dashboard mock and rendered text still use old terms.

- [ ] **Step 3: Update Dashboard types**

Modify `components/gamification/ui-lab/supply-dashboard/types.ts` profile and effect fields to include:

```typescript
export type SupplyDashboardProfile = {
  username: string;
  avatar: string;
  title: string;
  level: number;
  totalExp: number;
  currentLevelExp: number;
  nextLevelExp: number;
  streakDays: number;
};

export type SupplyDashboardActiveEffect = {
  id: string;
  icon: string;
  label: string;
  effectSummary: string;
  statusLabel: string;
  endsAtLabel: string;
};
```

- [ ] **Step 4: Update Dashboard mock data**

In `components/gamification/ui-lab/supply-dashboard/mock-data.ts`:

- Import shared resources and effects:

```typescript
import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
```

- Replace `resources` with:

```typescript
resources: supplyUiLabResources.dashboard.map((resource) => ({
  id: resource.id,
  label: resource.label,
  value: Number(resource.value.replace(/,/g, "").split("/")[0]),
  icon: resource.icon,
  maxValue: resource.id === "backpack" ? 60 : undefined,
})),
```

- Replace profile EXP fields:

```typescript
profile: {
  username: "Vincent",
  avatar: "/avatars/male1.png",
  title: "自律牛马",
  level: 28,
  totalExp: 27720,
  currentLevelExp: 720,
  nextLevelExp: 1000,
  streakDays: 18,
},
```

- Replace `activeEffects` with:

```typescript
activeEffects: supplyUiLabActiveEffects.map((effect) => ({
  id: effect.id,
  icon: effect.icon,
  label: effect.label,
  effectSummary: effect.effectSummary,
  statusLabel: effect.statusLabel,
  endsAtLabel: effect.endsAtLabel,
})),
```

- Replace all reward labels `券` with `抽奖券`.
- Set `inventoryPreview.totalSlots` to `60`.
- Replace shortcut subtitle `随机获取道具，效果或补给券！` with `随机获取道具、银子或真实福利！`.

- [ ] **Step 5: Update Dashboard scene rendering**

In `SupplyDashboardScene.tsx`:

- In `CharacterStatusPanel`, change section heading to include `牛马等级`:

```tsx
<div className="supply-dashboard-title-card">
  <span>称号 / 牛马等级</span>
  <strong>
    {data.profile.title}
    <b>Lv.{data.profile.level}</b>
  </strong>
</div>
```

- Change effect card body:

```tsx
<strong>{effect.label}</strong>
<p>{effect.effectSummary}</p>
<time>{effect.statusLabel} · {effect.endsAtLabel}</time>
```

- In `HeroCharacterStage`, compute remaining EXP from `currentLevelExp`:

```typescript
const remainingExp = data.profile.nextLevelExp - data.profile.currentLevelExp;
```

- Pass `currentLevelExp` to progress:

```tsx
<SupplyUiLabProgress current={data.profile.currentLevelExp} label="等级经验" max={data.profile.nextLevelExp} />
```

- Remove the entire `<nav aria-label="补给站帮助入口">` block from `TeamAnnouncementBar`.

- [ ] **Step 6: Run Dashboard tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS. If the existing CSS padding assertion fails, update `__tests__/supply-dashboard-scene-css.test.ts` to match the current shared topbar layout:

```typescript
expect(content).toMatch(/padding:\s*var\(--supply-ui-lab-topbar-height\)\s*0\s*0/);
```

- [ ] **Step 7: Commit Task 4**

```bash
git add components/gamification/ui-lab/supply-dashboard __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
git commit -m "feat: close supply dashboard mock business rules"
```

## Task 5: Backpack Static Business Closure

**Files:**
- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `__tests__/supply-backpack-mock-data.test.ts`
- Modify: `__tests__/supply-backpack-scene.test.tsx`
- Modify: `__tests__/supply-backpack-assets.test.ts`

- [ ] **Step 1: Update Backpack tests first**

Change `__tests__/supply-backpack-scene.test.tsx` expectations:

```typescript
expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
expect(container.textContent).not.toContain("扩容");
expect(container.textContent).not.toContain("帮助中心");
expect(container.textContent).not.toContain("体力");
expect(container.querySelectorAll("[role='gridcell']")).toHaveLength(20);
expect(container.querySelectorAll(".supply-backpack-slot.is-empty")).toHaveLength(8);
expect(container.querySelectorAll(".supply-backpack-slot.is-locked")).toHaveLength(0);
```

Add a click-state assertion:

```typescript
const nextPage = container.querySelector("button[aria-label='下一页']");
nextPage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
expect(container.textContent).toContain("2 / 3");
```

- [ ] **Step 2: Run Backpack tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-scene.test.tsx
```

Expected: FAIL because the page still has expansion, locked slots, old effects, and no local pagination state.

- [ ] **Step 3: Update Backpack slot types**

In `components/gamification/ui-lab/supply-backpack/types.ts`, replace `SupplyBackpackSlot` with:

```typescript
export type SupplyBackpackSlot =
  | {
      type: "item";
      item: SupplyBackpackInventoryItem;
    }
  | {
      type: "empty";
      id: string;
    };
```

Add selected action state:

```typescript
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
```

- [ ] **Step 4: Update Backpack mock from shared catalog**

In `mock-data.ts`:

- Import catalog, effects, resources:

```typescript
import { supplyUiLabCatalog } from "../supply-data/catalog";
import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
```

- Set top bar resources:

```typescript
resources: supplyUiLabResources.backpack,
```

- Set capacity:

```typescript
capacity: "18/60",
```

- Build `todayEffects` from `supplyUiLabActiveEffects`.
- Build inventory slots from catalog quantities and append empty slots until page 1 has 20 slots.
- Remove all locked slots.
- Select `task_reroll_coupon` or `luckin_coffee_coupon` from the catalog and use its detail.

- [ ] **Step 5: Convert Backpack scene to local state**

Add `"use client";` at the top of `SupplyBackpackScene.tsx`.

Import `useMemo` and `useState`:

```typescript
import { useMemo, useState } from "react";
```

Add local state in `SupplyBackpackScene`:

```typescript
const [page, setPage] = useState(data.inventory.page);
const [selectedItemId, setSelectedItemId] = useState(data.selectedItemDetail.itemId);
const [actionLabel, setActionLabel] = useState<string | null>(null);
```

Pass handlers into inventory and detail panels:

```tsx
<BackpackInventoryPanel data={data} page={page} selectedItemId={selectedItemId} onPageChange={setPage} onSelectItem={setSelectedItemId} />
<BackpackDetailPanel data={data} selectedItemId={selectedItemId} actionLabel={actionLabel} onAction={setActionLabel} />
```

In `InventorySlot`, replace locked rendering with empty rendering:

```tsx
if (slot.type === "empty") {
  return <div className="supply-backpack-slot is-empty" role="gridcell" aria-label="空背包格" />;
}
```

Remove the `扩容` and `说明` buttons from `BackpackSidebar`.

Remove the help center `Link` from `BackpackHintBar`.

In `BackpackDetailPanel`, set button handlers:

```tsx
<button type="button" onClick={() => onAction(`${detail.primaryAction}已模拟`)}>
  {detail.primaryAction}
</button>
<button type="button" onClick={() => onAction(detail.requiresAdminConfirmation ? "兑换中" : `${detail.secondaryAction}已模拟`)}>
  {detail.secondaryAction}
</button>
{actionLabel ? <p className="supply-backpack-action-feedback" role="status">{actionLabel}</p> : null}
```

- [ ] **Step 6: Update CSS for empty slots**

In `app/globals.css`, add a small rule near backpack slot rules:

```css
.supply-backpack-slot.is-empty {
  border: 2px dashed rgba(31, 41, 55, 0.32);
  background: rgba(255, 255, 255, 0.42);
}
```

- [ ] **Step 7: Run Backpack tests**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add components/gamification/ui-lab/supply-backpack app/globals.css __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
git commit -m "feat: close supply backpack mock interactions"
```

## Task 6: Shop Static Business Closure

**Files:**
- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `__tests__/supply-shop-mock-data.test.ts`
- Modify: `__tests__/supply-shop-scene.test.tsx`

- [ ] **Step 1: Update Shop tests first**

Modify `__tests__/supply-shop-mock-data.test.ts`:

```typescript
import { SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS } from "@/components/gamification/ui-lab/supply-data/catalog";

expect(supplyShopMock.topBar.resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
expect(supplyShopMock.topBar.resources.map((resource) => resource.value)).toEqual(["3,850", "18", "18/60"]);
expect(supplyShopMock.products.map((product) => product.sourceItemId).sort()).toEqual(
  [...SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS].sort(),
);
expect(JSON.stringify(supplyShopMock)).not.toContain("补给券");
expect(JSON.stringify(supplyShopMock)).not.toContain("体力");
```

Modify `__tests__/supply-shop-scene.test.tsx`:

```typescript
const productCards = container.querySelectorAll("[data-testid='supply-shop-product-card']");
expect(productCards).toHaveLength(12);
expect(container.textContent).toContain("任务换班券");
expect(container.textContent).toContain("瑞幸咖啡券");
expect(container.textContent).not.toContain("了解更多规则");
```

Add a local selection assertion:

```typescript
productCards[productCards.length - 1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
expect(container.querySelector(".supply-shop-detail h2")?.textContent).toBe("瑞幸咖啡券");
```

- [ ] **Step 2: Run Shop tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: FAIL because products are still page-local and selection is static.

- [ ] **Step 3: Update Shop product type**

In `types.ts`, add:

```typescript
sourceItemId: string;
effectSummary: string;
useTiming: string;
obtainSources: string[];
```

to `SupplyShopProduct`.

- [ ] **Step 4: Build products from shared catalog**

In `mock-data.ts`:

- Import shared catalog and resources.
- Replace local product array with:

```typescript
const shopCatalogProducts: SupplyShopProduct[] = supplyUiLabCatalog
  .filter((item) => item.shop.buyable)
  .map((item, index) => ({
    id: item.id,
    sourceItemId: item.sourceItemId,
    name: item.name,
    subtitle: item.effectSummary,
    categoryId: item.category === "protection" ? "boost" : item.category,
    image: item.media.image,
    rarity: item.rarity === "N" ? "common" : item.rarity === "R" ? "rare" : item.rarity.toLowerCase() as SupplyShopProduct["rarity"],
    tags: [item.rarity, ...item.obtainSources.map((source) => (source === "draw_pool" ? "奖池可得" : "商店可买"))],
    price: { currency: "coins", amount: item.shop.priceCoins },
    ownedQuantity: item.inventory.quantity,
    dailyLimit: item.shop.dailyLimit
      ? { label: `每日限购 0/${item.shop.dailyLimit}`, used: 0, total: item.shop.dailyLimit }
      : undefined,
    requiresAdminConfirmation: item.shop.requiresAdminConfirmation,
    selected: index === 0,
    effectSummary: item.effectSummary,
    useTiming: item.useTiming,
    obtainSources: item.obtainSources,
  }));
```

Use `supplyUiLabResources.shop` for the top bar and sidebar resources.

- [ ] **Step 5: Convert Shop scene to local state**

Add `"use client";` to `SupplyShopScene.tsx`.

Add:

```typescript
import { useMemo, useState } from "react";
```

In `SupplyShopScene`:

```typescript
const [selectedProductId, setSelectedProductId] = useState(data.selectedProductDetail.productId);
const [activeCategoryId, setActiveCategoryId] = useState(data.sidebar.categories.find((category) => category.active)?.id ?? "featured");
const [activeFilterId, setActiveFilterId] = useState(data.filters.find((filter) => filter.active)?.id ?? "all");
const [redeemState, setRedeemState] = useState<string | null>(null);
```

Pass handlers into sidebar, catalog, and detail.

In `ShopProductCard`, add `onSelect`:

```tsx
onClick={() => onSelect(product.id)}
```

In `ShopCatalog`, replace `Link href="#rules"` with a button:

```tsx
<button type="button" onClick={onToggleRules}>查看抽卡与商店规则</button>
```

Render local rules text when expanded:

```tsx
{rulesOpen ? (
  <div className="supply-shop-rules-panel" role="note">
    所有奖池可抽到的非银子道具，都可以在本静态商店中购买；真实福利兑换会进入兑换中状态。
  </div>
) : null}
```

In detail redeem button:

```tsx
onClick={() => setRedeemState(selectedProduct.requiresAdminConfirmation ? "兑换中" : "已加入背包")}
```

- [ ] **Step 6: Run Shop tests**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add components/gamification/ui-lab/supply-shop __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene-css.test.ts
git commit -m "feat: close supply shop mock catalog flow"
```

## Task 7: Draw Pool Static Business Closure

**Files:**
- Modify: `components/gamification/ui-lab/supply-draw-pool/types.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `__tests__/supply-draw-pool-mock-data.test.ts`
- Modify: `__tests__/supply-draw-pool-scene.test.tsx`

- [ ] **Step 1: Update Draw Pool tests first**

In `__tests__/supply-draw-pool-mock-data.test.ts`, add:

```typescript
expect(supplyDrawPoolMock.poolRates.map((rate) => `${rate.tier}${rate.percent}`)).toEqual([
  "coin45",
  "utility27",
  "social24",
  "rare4",
]);
expect(supplyDrawPoolMock.guarantee.title).toBe("十连保底说明");
expect(supplyDrawPoolMock.guarantee.description).toContain("本次十连至少 1 个实用、社交或稀有奖励");
expect(JSON.stringify(supplyDrawPoolMock)).not.toContain("补给券");
expect(JSON.stringify(supplyDrawPoolMock)).not.toContain("保底进度");
```

In `__tests__/supply-draw-pool-scene.test.tsx`, replace old pity expectations:

```typescript
expect(container.textContent).toContain("十连保底说明");
expect(container.textContent).not.toContain("保底进度");
expect(container.textContent).not.toContain("48/70");
```

Add click result assertions:

```typescript
container.querySelector("button[aria-label*='单抽']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
expect(container.textContent).toContain("本次结果");
expect(container.textContent).toContain("剩余 17 张");
```

- [ ] **Step 2: Run Draw Pool tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx
```

Expected: FAIL because current data uses long-term pity and static buttons.

- [ ] **Step 3: Update Draw Pool types**

Replace the `pity` type with:

```typescript
export type SupplyDrawPoolGuarantee = {
  title: "十连保底说明";
  description: string;
  eligibleTiers: Array<"utility" | "social" | "rare">;
};
```

Add draw result types:

```typescript
export type SupplyDrawPoolResult = {
  id: string;
  name: string;
  rarity: SupplyDrawPoolRarity;
  quantityLabel: string;
  image: string;
};
```

Update `SupplyDrawPoolPreview`:

```typescript
guarantee: SupplyDrawPoolGuarantee;
singleDrawResult: SupplyDrawPoolResult[];
tenDrawResult: SupplyDrawPoolResult[];
```

- [ ] **Step 4: Update Draw Pool mock from shared catalog**

In `mock-data.ts`:

- Import `supplyUiLabCatalog`, `SUPPLY_UI_LAB_COIN_REWARD_ROWS`, and `supplyUiLabResources`.
- Set `topBar.resources` to `supplyUiLabResources.drawPool`.
- Replace `poolRates` with:

```typescript
poolRates: [
  { tier: "coin", rarity: "银子", percent: 45, tone: "n" },
  { tier: "utility", rarity: "实用", percent: 27, tone: "r" },
  { tier: "social", rarity: "社交", percent: 24, tone: "sr" },
  { tier: "rare", rarity: "稀有", percent: 4, tone: "ssr" },
],
```

- Replace `pity` with:

```typescript
guarantee: {
  title: "十连保底说明",
  description: "本次十连至少 1 个实用、社交或稀有奖励；单抽没有保底。",
  eligibleTiers: ["utility", "social", "rare"],
},
```

- Build `recentDrops`, `singleDrawResult`, and `tenDrawResult` from coin rows plus catalog items.
- Replace every `补给券` string with `抽奖券`.

- [ ] **Step 5: Convert Draw Pool scene to local draw state**

Add `"use client";` to `SupplyDrawPoolScene.tsx`.

Add:

```typescript
import { useState } from "react";
```

Inside `SupplyDrawPoolScene`:

```typescript
const [ticketBalance, setTicketBalance] = useState(data.wallet.ticketBalance);
const [resultLabel, setResultLabel] = useState<string | null>(null);
const [drawResults, setDrawResults] = useState(data.singleDrawResult);
```

Add handlers:

```typescript
function handleDraw(drawCount: number) {
  if (ticketBalance < drawCount) {
    setResultLabel("抽奖券不足");
    return;
  }

  setTicketBalance((current) => current - drawCount);
  setDrawResults(drawCount === 10 ? data.tenDrawResult : data.singleDrawResult);
  setResultLabel(drawCount === 10 ? "本次十连结果" : "本次结果");
}
```

Pass `ticketBalance` to wallet and controls. Disable buttons when `ticketBalance < action.costTicket`:

```tsx
disabled={ticketBalance < action.costTicket}
onClick={() => onDraw(action.drawCount)}
```

Replace `DrawInfoRail` pity panel with guarantee panel:

```tsx
<SupplyUiLabPixelPanel ariaLabel={data.guarantee.title} className="supply-draw-pool-guarantee" title={data.guarantee.title}>
  <p>{data.guarantee.description}</p>
  <ul>
    {data.guarantee.eligibleTiers.map((tier) => <li key={tier}>{tier}</li>)}
  </ul>
</SupplyUiLabPixelPanel>
```

Add result panel near recent drops:

```tsx
{resultLabel ? (
  <SupplyUiLabPixelPanel ariaLabel={resultLabel} className="supply-draw-pool-result" title={resultLabel}>
    <p>剩余 {ticketBalance} 张抽奖券</p>
    <ul>
      {drawResults.map((result) => (
        <li key={result.id}>{result.name} {result.quantityLabel}</li>
      ))}
    </ul>
  </SupplyUiLabPixelPanel>
) : null}
```

- [ ] **Step 6: Run Draw Pool tests**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 7**

```bash
git add components/gamification/ui-lab/supply-draw-pool __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene-css.test.ts
git commit -m "feat: close supply draw pool mock rules"
```

## Task 8: Task Record State Machine

**Files:**
- Create: `components/gamification/ui-lab/supply-data/records.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/types.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `__tests__/supply-task-record-mock-data.test.ts`
- Modify: `__tests__/supply-task-record-scene.test.tsx`

- [ ] **Step 1: Update Task Record tests first**

In `__tests__/supply-task-record-mock-data.test.ts`:

```typescript
expect(supplyTaskRecordMock.dates).toHaveLength(7);
expect(supplyTaskRecordMock.activeMode).toBe("today");
expect(supplyTaskRecordMock.recordsByDate[supplyTaskRecordMock.activeDateKey]).toBeDefined();
expect(JSON.stringify(supplyTaskRecordMock)).not.toContain("生命票");
expect(JSON.stringify(supplyTaskRecordMock)).not.toContain("补给券");
```

In `__tests__/supply-task-record-scene.test.tsx`, add:

```typescript
const drawModeButton = Array.from(container.querySelectorAll(".supply-task-record-menu button")).find((button) =>
  button.textContent?.includes("抽卡记录"),
);
drawModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
expect(container.querySelector("#task-record-title")?.textContent).toBe("抽卡记录");
expect(container.textContent).toContain("十连");
expect(container.textContent).toContain("批次保底");

const radarModeButton = Array.from(container.querySelectorAll(".supply-task-record-menu button")).find((button) =>
  button.textContent?.includes("队友雷达"),
);
radarModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
expect(container.querySelector("#task-record-title")?.textContent).toBe("队友雷达");
expect(container.textContent).toContain("待响应");
```

- [ ] **Step 2: Run Task Record tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-scene.test.tsx
```

Expected: FAIL because current page has no mode/date state and still uses old reward vocabulary.

- [ ] **Step 3: Create shared records fixture**

Create `components/gamification/ui-lab/supply-data/records.ts` with:

```typescript
export const supplyUiLabRecordDates = [
  { key: "2026-05-18", label: "今天", dateLabel: "05月18日", weekday: "星期一" },
  { key: "2026-05-17", label: "昨天", dateLabel: "05月17日", weekday: "星期日" },
  { key: "2026-05-16", label: "前天", dateLabel: "05月16日", weekday: "星期六" },
  { key: "2026-05-15", label: "3天前", dateLabel: "05月15日", weekday: "星期五" },
  { key: "2026-05-14", label: "4天前", dateLabel: "05月14日", weekday: "星期四" },
  { key: "2026-05-13", label: "5天前", dateLabel: "05月13日", weekday: "星期三" },
  { key: "2026-05-12", label: "6天前", dateLabel: "05月12日", weekday: "星期二" },
];

export const supplyUiLabRules = [
  "今日记录展示任务、奖励、抽卡和系统提示。",
  "抽卡记录展示单抽、十连、奖励明细和批次保底。",
  "队友雷达展示待响应、已回应和已过期邀请。",
  "真实福利兑换展示兑换中、已完成和已失效。",
];

export const supplyUiLabDrawHistory = [
  {
    id: "draw-ten-2026-05-18",
    drawType: "十连",
    time: "12:05",
    ticketSpent: 10,
    guaranteeApplied: true,
    rewards: [
      { name: "任务换班券", quantityLabel: "x1", rarity: "R" },
      { name: "摸鱼津贴", quantityLabel: "银子 x5", rarity: "N" },
      { name: "瑞幸咖啡券", quantityLabel: "x1", rarity: "SSR" },
    ],
  },
  {
    id: "draw-single-2026-05-18",
    drawType: "单抽",
    time: "09:22",
    ticketSpent: 1,
    guaranteeApplied: false,
    rewards: [{ name: "工位补贴", quantityLabel: "银子 x10", rarity: "N" }],
  },
];
```

Keep the existing timeline, radar, and redemption fixture objects in `mock-data.ts` during this task. Use `records.ts` for shared date options, rules text, and draw history so the center mode switch has a stable shared source.

- [ ] **Step 4: Update Task Record types**

Add:

```typescript
export type SupplyTaskRecordMode = "today" | "draws" | "redemptions" | "radar" | "rules";

export type SupplyTaskRecordDateOption = {
  key: string;
  label: string;
  dateLabel: string;
  weekday: string;
};

export type SupplyTaskRecordDrawHistoryItem = {
  id: string;
  drawType: "单抽" | "十连";
  time: string;
  ticketSpent: number;
  guaranteeApplied: boolean;
  rewards: Array<{ name: string; quantityLabel: string; rarity: string }>;
};
```

Update `SupplyTaskRecordPreview`:

```typescript
activeMode: SupplyTaskRecordMode;
activeDateKey: string;
dates: SupplyTaskRecordDateOption[];
recordsByDate: Record<string, SupplyTaskRecordTimelineItem[]>;
drawHistory: SupplyTaskRecordDrawHistoryItem[];
rules: string[];
```

- [ ] **Step 5: Convert Task Record scene to local state**

Add `"use client";`.

Add:

```typescript
import { useMemo, useState } from "react";
```

Inside `SupplyTaskRecordScene`:

```typescript
const [activeMode, setActiveMode] = useState(data.activeMode);
const [activeDateKey, setActiveDateKey] = useState(data.activeDateKey);
const selectedDate = data.dates.find((date) => date.key === activeDateKey) ?? data.dates[0];
```

Make sidebar buttons call `setActiveMode(item.id)`.

Add date controls to `TaskTimelinePanel`:

```tsx
<div className="supply-task-record-date-tabs" role="tablist" aria-label="记录日期">
  {data.dates.map((date) => (
    <button
      aria-selected={date.key === activeDateKey}
      key={date.key}
      onClick={() => onSelectDate(date.key)}
      role="tab"
      type="button"
    >
      {date.label}
    </button>
  ))}
</div>
```

Render the center panel by mode:

```typescript
if (activeMode === "draws") return <DrawHistoryPanel draws={data.drawHistory} />;
if (activeMode === "redemptions") return <RedemptionFullPanel items={data.redemptions.items} />;
if (activeMode === "radar") return <RadarFullPanel radar={data.radar} />;
if (activeMode === "rules") return <RulesPanel rules={data.rules} />;
return (
  <TaskTimelinePanel
    data={data}
    activeDateKey={activeDateKey}
    selectedDate={selectedDate}
    records={data.recordsByDate[activeDateKey] ?? []}
    onSelectDate={setActiveDateKey}
  />
);
```

Replace every `生命票` reward label with `抽奖券`.

- [ ] **Step 6: Run Task Record tests**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 8**

```bash
git add components/gamification/ui-lab/supply-data/records.ts components/gamification/ui-lab/supply-task-record __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene-css.test.ts
git commit -m "feat: add supply task record mock state machine"
```

## Task 9: Team Goal Rewards And Local State

**Files:**
- Modify: `components/gamification/ui-lab/supply-team-goal/types.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
- Modify: `__tests__/supply-team-goal-mock-data.test.ts`
- Modify: `__tests__/supply-team-goal-scene.test.tsx`

- [ ] **Step 1: Update Team Goal tests first**

In `__tests__/supply-team-goal-mock-data.test.ts`:

```typescript
expect(supplyTeamGoalMock.completionReward.memberRewards).toEqual(["银子 x100", "抽奖券 x3"]);
expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.percent)).toEqual([20, 40, 65, 85, 100]);
expect(supplyTeamGoalMock.tasks.map((task) => task.metricSource)).toEqual([
  "今日有效健身打卡人数",
  "今日四维任务完成份数",
  "今日弱社交已回应次数",
  "今日全队抽卡次数",
]);
expect(JSON.stringify(supplyTeamGoalMock)).not.toContain("补给券");
```

In `__tests__/supply-team-goal-scene.test.tsx`:

```typescript
expect(host.textContent).toContain("赛季达成奖励");
expect(host.textContent).toContain("抽奖券 x3");
expect(host.textContent).not.toContain("帮助中心");
expect(host.textContent).not.toContain("意见反馈");
expect(host.textContent).not.toContain("设置");
```

- [ ] **Step 2: Run Team Goal tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-scene.test.tsx
```

Expected: FAIL because completion rewards and helper link removal are not implemented.

- [ ] **Step 3: Update Team Goal types**

Add:

```typescript
export type TeamGoalCompletionReward = {
  title: string;
  memberRewards: string[];
  teamReward: string;
  reportReward: string;
};

export type TeamGoalMilestoneReward = {
  percent: 20 | 40 | 65 | 85 | 100;
  title: string;
  rewardLabel: string;
  status: TeamGoalMilestoneStatus;
};
```

Add to `TeamGoalTask`:

```typescript
metricSource: string;
```

Add to `SupplyTeamGoalPreview`:

```typescript
completionReward: TeamGoalCompletionReward;
milestoneRewards: TeamGoalMilestoneReward[];
```

- [ ] **Step 4: Update Team Goal mock data**

In `mock-data.ts`:

- Use `supplyUiLabResources.teamGoal` for top bar resources.
- Replace every `补给券` label with `抽奖券`.
- Add:

```typescript
completionReward: {
  title: "赛季达成奖励",
  memberRewards: ["银子 x100", "抽奖券 x3"],
  teamReward: "团队称号 30天",
  reportReward: "赛季达成高光",
},
milestoneRewards: [
  { percent: 20, title: "团队公告高光", rewardLabel: "公告位点亮", status: "completed" },
  { percent: 40, title: "全员小补给", rewardLabel: "每人 抽奖券 x1", status: "completed" },
  { percent: 65, title: "称号预览", rewardLabel: "解锁团队称号预览", status: "current" },
  { percent: 85, title: "银子加班费", rewardLabel: "每人 银子 x50", status: "active" },
  { percent: 100, title: "赛季达成", rewardLabel: "触发赛季达成奖励", status: "locked" },
],
```

Set task metric sources:

```typescript
metricSource: "今日有效健身打卡人数";
metricSource: "今日四维任务完成份数";
metricSource: "今日弱社交已回应次数";
metricSource: "今日全队抽卡次数";
```

- [ ] **Step 5: Update Team Goal scene**

Add `"use client";`.

Use local state for claim feedback:

```typescript
const [claimLabel, setClaimLabel] = useState("可预览");
```

Render completion reward in `RewardPreview`:

```tsx
<section className="supply-team-goal-completion-reward" aria-label={data.completionReward.title}>
  <h3>{data.completionReward.title}</h3>
  <p>{data.completionReward.memberRewards.join(" · ")}</p>
  <p>{data.completionReward.teamReward}</p>
  <p>{data.completionReward.reportReward}</p>
</section>
```

Render milestone rewards under road or reward preview:

```tsx
<div className="supply-team-goal-milestone-rewards">
  {data.milestoneRewards.map((reward) => (
    <article key={reward.percent}>
      <strong>{reward.percent}%</strong>
      <span>{reward.title}</span>
      <p>{reward.rewardLabel}</p>
    </article>
  ))}
</div>
```

In `TaskRow`, render metric source:

```tsx
<small>{task.metricSource}</small>
```

Remove the helper nav from `AnnouncementPanel`.

- [ ] **Step 6: Run Team Goal tests**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 9**

```bash
git add components/gamification/ui-lab/supply-team-goal __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene-css.test.ts
git commit -m "feat: close supply team goal reward mock"
```

## Task 10: Full Verification And Browser QA

**Files:**
- Modify only files needed to fix verification failures discovered by this task.

- [ ] **Step 1: Run all focused Supply UI Lab tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-catalog.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: TypeScript completes without errors.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: Next.js build completes without errors.

- [ ] **Step 4: Start dev server for visual QA**

Run:

```bash
npm run dev
```

Expected: server starts on `http://localhost:3001`. Keep the session running for the next step.

- [ ] **Step 5: Browser QA each route**

Open these routes in the in-app browser at `1536 x 1024` and around `390 x 844`:

```text
http://localhost:3001/ui-lab/supply-dashboard
http://localhost:3001/ui-lab/supply-dashboard/team-goal
http://localhost:3001/ui-lab/supply-dashboard/shop
http://localhost:3001/ui-lab/supply-dashboard/task-record
http://localhost:3001/ui-lab/supply-dashboard/draw-pool
http://localhost:3001/ui-lab/supply-dashboard/backpack
```

Check:

- No rendered banned terms: `补给券`, `生命票`, `体力`, `扩容`, `帮助中心`, `意见反馈`, `设置`.
- No horizontal overflow on mobile.
- Topbar resources use `银子 / 抽奖券 / 背包` where applicable.
- Shop product click changes detail.
- Backpack pagination and item selection work.
- Draw Pool single draw and ten draw show result feedback.
- Task Record sidebar modes and date tabs change content.
- Team Goal reward claim feedback appears.
- Console has no errors.

- [ ] **Step 6: Stop dev server**

Stop the server session with `Ctrl-C`.

- [ ] **Step 7: Commit verification fixes if any**

If any changes were needed during verification, inspect the changed file list:

```bash
git status --short
```

Stage only files changed by the verification fixes. For example, if the only verification fixes were in CSS and draw-pool tests, run:

```bash
git add app/globals.css __tests__/supply-draw-pool-scene-css.test.ts
git commit -m "fix: polish supply ui lab closure verification"
```

If no changes were needed, do not create an empty commit.

## Final Review Checklist

- [ ] The global guardrail test passes.
- [ ] Every active non-coin draw reward is in catalog, shop, backpack, draw preview, and records.
- [ ] Coin rewards are only draw rewards or record entries, not shop products or inventory slots.
- [ ] Dashboard and Backpack import the same `supplyUiLabActiveEffects`.
- [ ] No page-level mock data redefines conflicting resources.
- [ ] No main-flow link uses `href="#"`.
- [ ] No UI Lab component imports `components/gamification/SupplyStation.tsx`.
- [ ] The six UI Lab routes remain isolated under `app/ui-lab/supply-dashboard`.
- [ ] Existing unrelated dirty files are not reverted or folded into the wrong commit.
