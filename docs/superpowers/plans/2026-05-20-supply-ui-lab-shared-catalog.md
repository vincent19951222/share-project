# Supply UI Lab Shared Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Supply UI Lab 新增一层共享 catalog、资源栏 fixture 和今日效果 fixture，让后续 Dashboard、补给商店、背包、补给抽卡机和任务记录统一引用同一套业务 mock 数据。

**Architecture:** 只在 `components/gamification/ui-lab/supply-data/` 下新增 UI Lab 专用共享数据，不改 Prisma、API Routes、session 或生产游戏化配置。契约测试对照 `content/gamification/reward-pool.ts` 和 `content/gamification/item-definitions.ts`，确保所有 active 非银子抽奖奖励都进入共享 catalog，银子奖励只保留为抽奖奖励行。

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Vitest, existing gamification content config.

---

## Scope

本计划对应 spec：

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-01-shared-catalog-design.md`

本任务只新增共享 fixture 和契约测试。页面 mock 切换到共享数据、视觉调整和交互改造留给后续任务执行。

## File Structure

- Create: `components/gamification/ui-lab/supply-data/types.ts`
  - 定义共享资源、catalog item、银子抽奖奖励行、今日效果类型。
- Create: `components/gamification/ui-lab/supply-data/catalog.ts`
  - 定义 active 非银子抽奖奖励 item id 列表、银子抽奖奖励行、共享 catalog 和 `supplyUiLabCatalogBySourceItemId`。
- Create: `components/gamification/ui-lab/supply-data/resources.ts`
  - 定义页面共享资源栏 fixture，只包含 `银子 / 抽奖券 / 背包`。
- Create: `components/gamification/ui-lab/supply-data/effects.ts`
  - 定义 Dashboard 和背包共享的今日效果 fixture，只保留有明确道具来源的效果。
- Create: `__tests__/supply-ui-lab-catalog.test.ts`
  - 验证共享 catalog、资源和今日效果契约。

## Task 1: Shared Data Contract Test

**Files:**
- Create: `__tests__/supply-ui-lab-catalog.test.ts`

- [ ] **Step 1: Write the failing catalog contract test**

Create `__tests__/supply-ui-lab-catalog.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "@/content/gamification/item-definitions";
import { REWARD_DEFINITIONS } from "@/content/gamification/reward-pool";
import {
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS,
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";

const activeNonCoinRewardItemIds = REWARD_DEFINITIONS.flatMap((reward) => {
  if (!reward.enabled || reward.kind === "coins") {
    return [];
  }

  if (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") {
    return [reward.effect.itemId];
  }

  return [];
});

const activeCoinRewardIds = REWARD_DEFINITIONS.filter(
  (reward) => reward.enabled && reward.kind === "coins",
).map((reward) => reward.id);

describe("Supply UI Lab shared catalog data", () => {
  it("matches every active non-coin draw reward from the production content config", () => {
    expect(SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS).toEqual(activeNonCoinRewardItemIds);

    for (const sourceItemId of SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS) {
      const item = supplyUiLabCatalogBySourceItemId[sourceItemId];
      const sourceItem = ITEM_DEFINITIONS.find((definition) => definition.id === sourceItemId);

      expect(item, sourceItemId).toBeDefined();
      expect(sourceItem, sourceItemId).toBeDefined();
      expect(item.name, sourceItemId).toBe(sourceItem?.name);
      expect(item.description, sourceItemId).toBe(sourceItem?.description);
      expect(item.drawPool.drawable, sourceItemId).toBe(true);
      expect(item.shop.buyable, sourceItemId).toBe(true);
      expect(item.obtainSources, sourceItemId).toEqual(["draw_pool", "shop"]);
      expect(item.inventory.quantity, sourceItemId).toBeGreaterThanOrEqual(0);
      expect(item.media.image, sourceItemId).toMatch(/^\/gamification\/rewards\/icons\/.+\.png$/);
    }
  });

  it("keeps coin rewards available for draws but outside shop and backpack catalog slots", () => {
    expect(SUPPLY_UI_LAB_COIN_REWARD_ROWS.map((row) => row.rewardId)).toEqual(activeCoinRewardIds);
    expect(supplyUiLabCatalog.map((item) => item.sourceItemId)).not.toEqual(
      expect.arrayContaining(activeCoinRewardIds),
    );
    expect(SUPPLY_UI_LAB_COIN_REWARD_ROWS.every((row) => row.amount > 0)).toBe(true);
  });

  it("uses only the shared top bar resource vocabulary", () => {
    for (const resources of Object.values(supplyUiLabResources)) {
      expect(resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
      expect(resources.map((resource) => resource.id)).toEqual(["coins", "ticket", "backpack"]);
    }

    expect(JSON.stringify(supplyUiLabResources)).not.toContain("补给券");
    expect(JSON.stringify(supplyUiLabResources)).not.toContain("体力");
  });

  it("shares only business-sourced today effects", () => {
    expect(supplyUiLabActiveEffects).toEqual([
      expect.objectContaining({ sourceItemId: "small_boost_coupon", statusLabel: "今日待生效" }),
      expect.objectContaining({ sourceItemId: "season_sprint_coupon", statusLabel: "今日已生效" }),
    ]);

    for (const effect of supplyUiLabActiveEffects) {
      expect(supplyUiLabCatalogBySourceItemId[effect.sourceItemId], effect.sourceItemId).toBeDefined();
      expect(effect.businessSource.length).toBeGreaterThan(0);
      expect(effect.endsAtLabel).toBe("今日 23:59");
    }

    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("体力");
    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("步数加成");
    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("经验获取");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL with an import error because `components/gamification/ui-lab/supply-data/catalog`, `effects`, and `resources` do not exist yet.

## Task 2: Shared Type Definitions

**Files:**
- Create: `components/gamification/ui-lab/supply-data/types.ts`

- [ ] **Step 1: Add shared UI Lab supply data types**

Create `components/gamification/ui-lab/supply-data/types.ts`:

```typescript
export type SupplyUiLabResourceId = "coins" | "ticket" | "backpack";
export type SupplyUiLabResourceGroupId = "dashboard" | "backpack" | "shop" | "drawPool" | "taskRecord";
export type SupplyUiLabCatalogCategory = "boost" | "protection" | "social" | "task" | "real_world";
export type SupplyUiLabCatalogRarity = "N" | "R" | "SR" | "SSR";
export type SupplyUiLabUseTiming = "today" | "instant" | "manual_redemption";
export type SupplyUiLabObtainSource = "draw_pool" | "shop";
export type SupplyUiLabDrawTier = "utility" | "social" | "rare";
export type SupplyUiLabEffectStatus = "pending" | "active" | "expired";

export type SupplyUiLabResource = {
  id: SupplyUiLabResourceId;
  label: "银子" | "抽奖券" | "背包";
  value: string;
  icon: string;
};

export type SupplyUiLabCatalogItem = {
  id: string;
  sourceItemId: string;
  sourceRewardId: string;
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
    tier: SupplyUiLabDrawTier;
    weightLabel: string;
  };
  inventory: {
    quantity: number;
    selected: boolean;
  };
  media: {
    image: string;
  };
};

export type SupplyUiLabCoinRewardRow = {
  rewardId: string;
  name: string;
  amount: number;
  weightLabel: string;
  image: string;
};

export type SupplyUiLabActiveEffect = {
  id: string;
  sourceItemId: string;
  label: string;
  effectSummary: string;
  businessSource: string;
  status: SupplyUiLabEffectStatus;
  statusLabel: "今日待生效" | "今日已生效" | "已过期";
  endsAtLabel: string;
  icon: string;
};
```

- [ ] **Step 2: Run test to verify missing modules remain**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL because `catalog.ts`, `effects.ts`, and `resources.ts` still do not exist.

## Task 3: Shared Catalog Fixture

**Files:**
- Create: `components/gamification/ui-lab/supply-data/catalog.ts`

- [ ] **Step 1: Add the shared catalog implementation**

Create `components/gamification/ui-lab/supply-data/catalog.ts`:

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

export type SupplyUiLabActiveNonCoinRewardItemId =
  (typeof SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS)[number];

const rewardIcon = (sourceItemId: string) => `/gamification/rewards/icons/${sourceItemId}.png`;

export const SUPPLY_UI_LAB_COIN_REWARD_ROWS: SupplyUiLabCoinRewardRow[] = [
  {
    rewardId: "coins_005",
    name: "摸鱼津贴",
    amount: 5,
    weightLabel: "权重 15",
    image: "/gamification/rewards/icons/coins_005.png",
  },
  {
    rewardId: "coins_010",
    name: "工位补贴",
    amount: 10,
    weightLabel: "权重 12",
    image: "/gamification/rewards/icons/coins_010.png",
  },
  {
    rewardId: "coins_020",
    name: "今日没白来",
    amount: 20,
    weightLabel: "权重 10",
    image: "/gamification/rewards/icons/coins_020.png",
  },
  {
    rewardId: "coins_040",
    name: "老板没发现",
    amount: 40,
    weightLabel: "权重 5",
    image: "/gamification/rewards/icons/coins_040.png",
  },
  {
    rewardId: "coins_080",
    name: "小发一笔",
    amount: 80,
    weightLabel: "权重 2",
    image: "/gamification/rewards/icons/coins_080.png",
  },
  {
    rewardId: "coins_120",
    name: "牛马暴富",
    amount: 120,
    weightLabel: "权重 1",
    image: "/gamification/rewards/icons/coins_120.png",
  },
];

const catalogData = {
  task_reroll_coupon: {
    id: "catalog-task-reroll",
    sourceRewardId: "reward_task_reroll",
    name: "任务换班券",
    category: "task",
    rarity: "R",
    description: "把当天一个四维任务换成同维度另一张卡。",
    effectSummary: "同维度更换 1 个今日主线任务",
    useTiming: "instant",
    priceCoins: 150,
    dailyLimit: 1,
    tier: "utility",
    weightLabel: "权重 10",
    quantity: 2,
    selected: true,
  },
  small_boost_coupon: {
    id: "catalog-small-boost",
    sourceRewardId: "reward_small_boost",
    name: "小暴击券",
    category: "boost",
    rarity: "R",
    description: "当日真实健身打卡个人资产 1.5x，不影响赛季贡献。",
    effectSummary: "今日个人银子收益 1.5x",
    useTiming: "today",
    priceCoins: 220,
    dailyLimit: 1,
    tier: "utility",
    weightLabel: "权重 9",
    quantity: 3,
    selected: false,
  },
  fitness_leave_coupon: {
    id: "catalog-fitness-leave",
    sourceRewardId: "reward_fitness_leave",
    name: "健身请假券",
    category: "protection",
    rarity: "R",
    description: "当天无法健身时保护连续记录不掉线，并冻结下一次真实健身奖励档位。",
    effectSummary: "保护连续记录，不发银子，不推进赛季",
    useTiming: "today",
    priceCoins: 260,
    dailyLimit: 1,
    tier: "utility",
    weightLabel: "权重 8",
    quantity: 1,
    selected: false,
  },
  drink_water_ping: {
    id: "catalog-drink-water",
    sourceRewardId: "reward_drink_water_ping",
    name: "点名喝水令",
    category: "social",
    rarity: "N",
    description: "点名一位成员喝水，对方确认后生成响应记录。",
    effectSummary: "发起 1 次喝水提醒",
    useTiming: "instant",
    priceCoins: 80,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 5",
    quantity: 6,
    selected: false,
  },
  walk_ping: {
    id: "catalog-walk",
    sourceRewardId: "reward_walk_ping",
    name: "出门溜达令",
    category: "social",
    rarity: "N",
    description: "邀请一位成员起身走一圈，对方确认后生成轻动态。",
    effectSummary: "发起 1 次起身活动邀请",
    useTiming: "instant",
    priceCoins: 80,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 5",
    quantity: 5,
    selected: false,
  },
  team_standup_ping: {
    id: "catalog-team-standup",
    sourceRewardId: "reward_team_standup_ping",
    name: "全员起立令",
    category: "social",
    rarity: "R",
    description: "发起一次全队起身提醒，记录当天响应人数。",
    effectSummary: "发起 1 次全队起身提醒",
    useTiming: "instant",
    priceCoins: 180,
    dailyLimit: 1,
    tier: "social",
    weightLabel: "权重 4",
    quantity: 2,
    selected: false,
  },
  chat_ping: {
    id: "catalog-chat",
    sourceRewardId: "reward_chat_ping",
    name: "今日闲聊令",
    category: "social",
    rarity: "N",
    description: "邀请一位成员完成“把事办黄”，双方完成后生成响应记录。",
    effectSummary: "发起 1 次闲聊互动",
    useTiming: "instant",
    priceCoins: 90,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 4",
    quantity: 4,
    selected: false,
  },
  share_info_ping: {
    id: "catalog-share-info",
    sourceRewardId: "reward_share_info_ping",
    name: "红盘情报令",
    category: "social",
    rarity: "N",
    description: "点名一位成员分享今天看到的新东西，完成后进入今日小摘要。",
    effectSummary: "发起 1 次信息分享邀请",
    useTiming: "instant",
    priceCoins: 90,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 4",
    quantity: 4,
    selected: false,
  },
  team_broadcast_coupon: {
    id: "catalog-team-broadcast",
    sourceRewardId: "reward_team_broadcast",
    name: "团队小喇叭",
    category: "social",
    rarity: "R",
    description: "把一句轻量播报发到团队动态或后续摘要。",
    effectSummary: "发布 1 条团队轻量播报",
    useTiming: "instant",
    priceCoins: 200,
    dailyLimit: 1,
    tier: "social",
    weightLabel: "权重 2",
    quantity: 1,
    selected: false,
  },
  double_niuma_coupon: {
    id: "catalog-double-niuma",
    sourceRewardId: "reward_double_niuma",
    name: "双倍牛马券",
    category: "boost",
    rarity: "SSR",
    description: "当日真实健身打卡个人资产 2x，赛季贡献 2x。",
    effectSummary: "今日银子和赛季贡献双倍",
    useTiming: "today",
    priceCoins: 600,
    weeklyLimit: 1,
    tier: "rare",
    weightLabel: "权重 2",
    quantity: 1,
    selected: false,
  },
  season_sprint_coupon: {
    id: "catalog-season-sprint",
    sourceRewardId: "reward_season_sprint",
    name: "赛季冲刺券",
    category: "boost",
    rarity: "SSR",
    description: "当日真实健身打卡赛季贡献 2x。",
    effectSummary: "今日赛季贡献双倍",
    useTiming: "today",
    priceCoins: 520,
    weeklyLimit: 1,
    tier: "rare",
    weightLabel: "权重 1",
    quantity: 1,
    selected: false,
  },
  luckin_coffee_coupon: {
    id: "catalog-luckin-coffee",
    sourceRewardId: "reward_luckin_coffee",
    name: "瑞幸咖啡券",
    category: "real_world",
    rarity: "SR",
    description: "可找管理员线下兑换一杯瑞幸咖啡。",
    effectSummary: "管理员确认后兑换 1 杯瑞幸咖啡",
    useTiming: "manual_redemption",
    priceCoins: 500,
    dailyLimit: 1,
    tier: "rare",
    weightLabel: "权重 1",
    quantity: 1,
    selected: false,
  },
} satisfies Record<
  SupplyUiLabActiveNonCoinRewardItemId,
  Omit<
    SupplyUiLabCatalogItem,
    "sourceItemId" | "obtainSources" | "shop" | "drawPool" | "inventory" | "media"
  > & {
    priceCoins: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    tier: SupplyUiLabCatalogItem["drawPool"]["tier"];
    weightLabel: string;
    quantity: number;
    selected: boolean;
  }
>;

export const supplyUiLabCatalog: SupplyUiLabCatalogItem[] =
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS.map((sourceItemId) => {
    const item = catalogData[sourceItemId];

    return {
      id: item.id,
      sourceItemId,
      sourceRewardId: item.sourceRewardId,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      description: item.description,
      effectSummary: item.effectSummary,
      useTiming: item.useTiming,
      obtainSources: ["draw_pool", "shop"],
      shop: {
        buyable: true,
        priceCoins: item.priceCoins,
        dailyLimit: item.dailyLimit,
        weeklyLimit: item.weeklyLimit,
        requiresAdminConfirmation: sourceItemId === "luckin_coffee_coupon",
      },
      drawPool: {
        drawable: true,
        tier: item.tier,
        weightLabel: item.weightLabel,
      },
      inventory: {
        quantity: item.quantity,
        selected: item.selected,
      },
      media: {
        image: rewardIcon(sourceItemId),
      },
    };
  });

export const supplyUiLabCatalogBySourceItemId = Object.fromEntries(
  supplyUiLabCatalog.map((item) => [item.sourceItemId, item]),
) as Record<SupplyUiLabActiveNonCoinRewardItemId, SupplyUiLabCatalogItem>;
```

- [ ] **Step 2: Run test to verify remaining missing modules**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL because `effects.ts` and `resources.ts` still do not exist.

## Task 4: Shared Resources And Today Effects

**Files:**
- Create: `components/gamification/ui-lab/supply-data/resources.ts`
- Create: `components/gamification/ui-lab/supply-data/effects.ts`

- [ ] **Step 1: Add the shared resource fixture**

Create `components/gamification/ui-lab/supply-data/resources.ts`:

```typescript
import type { SupplyUiLabResource, SupplyUiLabResourceGroupId } from "./types";

const sharedResources: SupplyUiLabResource[] = [
  { id: "coins", label: "银子", value: "2,450", icon: "◎" },
  { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
  { id: "backpack", label: "背包", value: "18/60", icon: "包" },
];

export const supplyUiLabResources = {
  dashboard: sharedResources,
  backpack: sharedResources,
  shop: sharedResources,
  drawPool: sharedResources,
  taskRecord: sharedResources,
} satisfies Record<SupplyUiLabResourceGroupId, SupplyUiLabResource[]>;
```

- [ ] **Step 2: Add the shared today effects fixture**

Create `components/gamification/ui-lab/supply-data/effects.ts`:

```typescript
import { supplyUiLabCatalogBySourceItemId } from "./catalog";
import type { SupplyUiLabActiveEffect } from "./types";

const smallBoost = supplyUiLabCatalogBySourceItemId.small_boost_coupon;
const seasonSprint = supplyUiLabCatalogBySourceItemId.season_sprint_coupon;

export const supplyUiLabActiveEffects: SupplyUiLabActiveEffect[] = [
  {
    id: "today-effect-small-boost",
    sourceItemId: "small_boost_coupon",
    label: smallBoost.name,
    effectSummary: smallBoost.effectSummary,
    businessSource: "来自背包道具 small_boost_coupon，等待今日健身打卡时结算",
    status: "pending",
    statusLabel: "今日待生效",
    endsAtLabel: "今日 23:59",
    icon: smallBoost.media.image,
  },
  {
    id: "today-effect-season-sprint",
    sourceItemId: "season_sprint_coupon",
    label: seasonSprint.name,
    effectSummary: seasonSprint.effectSummary,
    businessSource: "来自背包道具 season_sprint_coupon，今日赛季贡献结算已启用",
    status: "active",
    statusLabel: "今日已生效",
    endsAtLabel: "今日 23:59",
    icon: seasonSprint.media.image,
  },
];
```

- [ ] **Step 3: Run focused test to verify it passes**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

## Task 5: Verification And Commit

**Files:**
- Verify: `__tests__/supply-ui-lab-catalog.test.ts`
- Verify: `components/gamification/ui-lab/supply-data/types.ts`
- Verify: `components/gamification/ui-lab/supply-data/catalog.ts`
- Verify: `components/gamification/ui-lab/supply-data/resources.ts`
- Verify: `components/gamification/ui-lab/supply-data/effects.ts`

- [ ] **Step 1: Run focused catalog tests**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run related UI Lab mock-data tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-task-record-mock-data.test.ts
```

Expected: PASS or unchanged failures unrelated to these new files. If failures mention stale resource words such as `补给券` or `体力`, do not fix them in this task; record them for the follow-up page-integration tasks.

- [ ] **Step 3: Typecheck through build**

Run:

```bash
npm run build
```

Expected: PASS. If the working tree already contains unrelated dirty UI Lab changes that make build fail, capture the failing file paths and keep this task's files unchanged unless the error is in `components/gamification/ui-lab/supply-data/` or `__tests__/supply-ui-lab-catalog.test.ts`.

- [ ] **Step 4: Commit only this task's files**

Run:

```bash
git add components/gamification/ui-lab/supply-data/types.ts components/gamification/ui-lab/supply-data/catalog.ts components/gamification/ui-lab/supply-data/resources.ts components/gamification/ui-lab/supply-data/effects.ts __tests__/supply-ui-lab-catalog.test.ts
git commit -m "feat: add supply ui lab shared catalog"
```

Expected: Commit succeeds and does not stage existing unrelated dirty files.

## Self-Review

- Spec coverage: 新增文件路径与 spec 完全一致；测试覆盖 active 非银子抽奖奖励、银子奖励排除商店/背包、共享资源词汇、共享今日效果来源。
- Placeholder scan: 计划中没有遗留占位说明或跳步描述。
- Type consistency: `sourceItemId`、`sourceRewardId`、`SupplyUiLabActiveNonCoinRewardItemId`、`SupplyUiLabResourceGroupId` 在测试和实现中命名一致。
