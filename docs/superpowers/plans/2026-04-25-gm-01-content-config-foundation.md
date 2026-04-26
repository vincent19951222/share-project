# GM-01 Content Config Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local content configuration foundation for `牛马补给站`: dimensions, task cards, reward pool, item definitions, and validation helpers.

**Architecture:** Keep all game content definitions in local TypeScript modules under `content/gamification/`, and expose read/validation helpers through `lib/gamification/content.ts`. This story does not create database tables, HTTP APIs, pages, or runtime business logic; it only creates stable definitions and guardrails for later stories.

**Tech Stack:** TypeScript strict mode, Vitest, local config modules, no Prisma migration.

---

## File Structure

- Create: `content/gamification/types.ts`
  - Shared enums and definition types for dimensions, task cards, rewards, items, and effects.
- Create: `content/gamification/dimensions.ts`
  - Four fixed dimension definitions.
- Create: `content/gamification/task-cards.ts`
  - Initial enabled task card definitions, at least five per dimension.
- Create: `content/gamification/item-definitions.ts`
  - Initial item definitions required by the GM-01 spec.
- Create: `content/gamification/reward-pool.ts`
  - Initial reward definitions for coins, utility items, weak social items, cosmetic rewards, and rare rewards.
- Create: `lib/gamification/content.ts`
  - Public getter helpers and `validateGamificationContent`.
- Create: `__tests__/gamification-content.test.ts`
  - Unit tests for content shape, minimum task-card coverage, validation pass, and validation failures.

## Implementation Rules

- Do not modify `prisma/schema.prisma`.
- Do not create HTTP routes.
- Do not create or modify UI components.
- Do not wire this into existing punch, coffee, board, or report flows.
- Use stable English IDs for logic and Chinese copy only for display.
- Validation should throw `Error` with readable messages, not silently filter invalid content.

---

### Task 1: Add Failing Content Tests

**Files:**
- Create: `__tests__/gamification-content.test.ts`

- [ ] **Step 1: Write failing tests for content getters and validation**

Create `__tests__/gamification-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getGamificationDimensions,
  getItemDefinition,
  getItemDefinitions,
  getRewardDefinitions,
  getTaskCards,
  validateGamificationContent,
} from "@/lib/gamification/content";
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  TaskCardDefinition,
} from "@/content/gamification/types";

function cloneBundle(): GamificationContentBundle {
  return {
    dimensions: getGamificationDimensions().map((dimension) => ({ ...dimension })),
    taskCards: getTaskCards().map((card) => ({
      ...card,
      completionTextOptions: [...card.completionTextOptions],
      tags: [...card.tags],
    })),
    rewards: getRewardDefinitions().map((reward) => ({ ...reward })),
    items: getItemDefinitions().map((item) => ({ ...item })),
  };
}

describe("gamification content", () => {
  it("defines the four fixed dimensions", () => {
    expect(getGamificationDimensions().map((dimension) => dimension.key)).toEqual([
      "movement",
      "hydration",
      "social",
      "learning",
    ]);
  });

  it("has at least five enabled task cards per dimension", () => {
    const enabledCards = getTaskCards().filter((card) => card.enabled);

    for (const dimension of getGamificationDimensions()) {
      expect(enabledCards.filter((card) => card.dimensionKey === dimension.key).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("validates the shipped content bundle", () => {
    expect(() => validateGamificationContent()).not.toThrow();
  });

  it("finds an item definition by id", () => {
    expect(getItemDefinition("task_reroll_coupon")).toMatchObject({
      name: "任务换班券",
      category: "task",
    });
  });

  it("rejects duplicate task card ids", () => {
    const bundle = cloneBundle();
    const duplicate: TaskCardDefinition = { ...bundle.taskCards[0] };
    bundle.taskCards.push(duplicate);

    expect(() => validateGamificationContent(bundle)).toThrow(/Duplicate task card id/);
  });

  it("rejects task cards with invalid dimensions", () => {
    const bundle = cloneBundle();
    bundle.taskCards[0] = { ...bundle.taskCards[0], dimensionKey: "invalid" as TaskCardDefinition["dimensionKey"] };

    expect(() => validateGamificationContent(bundle)).toThrow(/Unknown task card dimension/);
  });

  it("rejects rewards that grant missing items", () => {
    const bundle = cloneBundle();
    const reward: RewardDefinition = {
      id: "bad_reward",
      tier: "utility",
      kind: "inventory_item",
      rarity: "common",
      name: "坏奖励",
      description: "引用不存在道具。",
      weight: 1,
      effect: { type: "grant_item", itemId: "missing_item", quantity: 1 },
      enabled: true,
    };
    bundle.rewards.push(reward);

    expect(() => validateGamificationContent(bundle)).toThrow(/Unknown reward item/);
  });

  it("rejects invalid item use limits", () => {
    const bundle = cloneBundle();
    const invalidItem: ItemDefinition = {
      ...bundle.items[0],
      id: "invalid_limit_item",
      maxUsePerUserPerDay: 0,
    };
    bundle.items.push(invalidItem);

    expect(() => validateGamificationContent(bundle)).toThrow(/Invalid item limit/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: FAIL because `@/lib/gamification/content` and content types do not exist.

---

### Task 2: Add Shared Content Types

**Files:**
- Create: `content/gamification/types.ts`

- [ ] **Step 1: Create shared type definitions**

Create `content/gamification/types.ts`:

```ts
export type TaskDimensionKey = "movement" | "hydration" | "social" | "learning";
export type TaskEffort = "light" | "medium";
export type TaskScene = "office" | "home" | "general";

export type RewardTier = "coin" | "utility" | "social" | "cosmetic" | "rare";
export type RewardKind = "coins" | "inventory_item" | "title" | "real_world_redemption";
export type RewardRarity = "common" | "uncommon" | "rare" | "epic";

export type ItemCategory =
  | "boost"
  | "protection"
  | "social"
  | "lottery"
  | "task"
  | "cosmetic"
  | "real_world";
export type ItemUseTiming = "today" | "instant" | "manual_redemption";

export interface DimensionDefinition {
  key: TaskDimensionKey;
  title: string;
  subtitle: string;
  description: string;
}

export interface TaskCardDefinition {
  id: string;
  dimensionKey: TaskDimensionKey;
  title: string;
  description: string;
  completionTextOptions: string[];
  effort: TaskEffort;
  scene: TaskScene;
  repeatCooldownDays: number;
  isWeekendOnly: boolean;
  tags: string[];
  weight: number;
  enabled: boolean;
}

export type RewardEffect =
  | { type: "grant_coins"; amount: number }
  | { type: "grant_item"; itemId: string; quantity: number }
  | { type: "grant_title"; titleId: string }
  | { type: "grant_real_world_redemption"; itemId: string; quantity: number };

export interface RewardDefinition {
  id: string;
  tier: RewardTier;
  kind: RewardKind;
  rarity: RewardRarity;
  name: string;
  description: string;
  weight: number;
  effect: RewardEffect;
  enabled: boolean;
}

export type ItemEffect =
  | { type: "fitness_coin_multiplier"; multiplier: 1.5 | 2 }
  | { type: "fitness_season_multiplier"; multiplier: 2 }
  | { type: "fitness_coin_and_season_multiplier"; multiplier: 2 }
  | { type: "task_reroll"; scope: "same_dimension" }
  | { type: "lottery_guarantee"; minTier: RewardTier; appliesTo: "single" | "ten_draw" }
  | { type: "ticket_discount"; discountRate: number }
  | { type: "social_invitation"; invitationType: string }
  | { type: "leave_protection"; protectsStreak: true; freezesNextFitnessRewardTier: true }
  | { type: "real_world_redemption"; redemptionType: "luckin_coffee" }
  | { type: "dimension_coin_bonus"; dimensionKey: TaskDimensionKey; amount: number }
  | { type: "cosmetic"; cosmeticType: "calendar_sticker" | "team_broadcast_draft" };

export interface ItemDefinition {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  useTiming: ItemUseTiming;
  effect: ItemEffect;
  stackable: boolean;
  maxUsePerUserPerDay?: number;
  maxUsePerUserPerWeek?: number;
  maxUsePerTeamPerDay?: number;
  requiresAdminConfirmation: boolean;
  enabled: boolean;
}

export interface GamificationContentBundle {
  dimensions: DimensionDefinition[];
  taskCards: TaskCardDefinition[];
  rewards: RewardDefinition[];
  items: ItemDefinition[];
}
```

- [ ] **Step 2: Run TypeScript check to confirm missing modules remain the only issue**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: FAIL because the content modules and helper module are still missing.

---

### Task 3: Add Dimension And Task Card Config

**Files:**
- Create: `content/gamification/dimensions.ts`
- Create: `content/gamification/task-cards.ts`

- [ ] **Step 1: Create dimension definitions**

Create `content/gamification/dimensions.ts`:

```ts
import type { DimensionDefinition } from "./types";

export const GAMIFICATION_DIMENSIONS: DimensionDefinition[] = [
  {
    key: "movement",
    title: "把电充绿",
    subtitle: "站一站，不然屁股长根",
    description: "起身、走动、拉伸、短暂恢复。",
  },
  {
    key: "hydration",
    title: "把尿喝白",
    subtitle: "喝白白，别把自己腌入味",
    description: "补水、接水、无糖饮品。",
  },
  {
    key: "social",
    title: "把事办黄",
    subtitle: "聊两句，让班味散一散",
    description: "闲聊、吐槽、夸夸、情绪释放。",
  },
  {
    key: "learning",
    title: "把股看红",
    subtitle: "看一点，给脑子补仓",
    description: "信息输入、学习、看新闻、文章或工具。",
  },
];
```

- [ ] **Step 2: Create initial task card definitions**

Create `content/gamification/task-cards.ts`:

```ts
import type { TaskCardDefinition } from "./types";

export const TASK_CARDS: TaskCardDefinition[] = [
  {
    id: "movement_001",
    dimensionKey: "movement",
    title: "工位重启",
    description: "离开椅子站起来 2 分钟，让身体退出省电模式。",
    completionTextOptions: ["电量+1", "已复活", "屁股离线"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["stand", "break"],
    weight: 1,
    enabled: true,
  },
  {
    id: "movement_002",
    dimensionKey: "movement",
    title: "屁股离线",
    description: "找一个理由离开座位走一小圈，哪怕只是去看看饮水机还在不在。",
    completionTextOptions: ["屁股离线", "带薪巡逻", "身体上线"],
    effort: "light",
    scene: "office",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["walk", "office"],
    weight: 1,
    enabled: true,
  },
  {
    id: "movement_003",
    dimensionKey: "movement",
    title: "肩颈开机",
    description: "做 3 轮肩颈环绕，拯救一下被屏幕封印的脖子。",
    completionTextOptions: ["肩颈开机", "脖子解封", "电量回升"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["stretch", "neck"],
    weight: 1,
    enabled: true,
  },
  {
    id: "movement_004",
    dimensionKey: "movement",
    title: "窗边回血",
    description: "走到窗边或户外看远处 30 秒，顺便深呼吸几口。",
    completionTextOptions: ["眼睛回血", "已远眺", "精神补电"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["eyes", "breath"],
    weight: 1,
    enabled: true,
  },
  {
    id: "movement_005",
    dimensionKey: "movement",
    title: "腰背解冻",
    description: "双手向上伸展，再左右侧弯各 10 秒，把腰背从压缩包里解出来。",
    completionTextOptions: ["腰背解冻", "已拉伸", "身体解压"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["stretch", "back"],
    weight: 1,
    enabled: true,
  },
  {
    id: "hydration_001",
    dimensionKey: "hydration",
    title: "首杯投币",
    description: "喝一杯水，给今天的身体系统投个启动币。",
    completionTextOptions: ["已续杯", "水位正常", "身体开机"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 2,
    isWeekendOnly: false,
    tags: ["water"],
    weight: 1,
    enabled: true,
  },
  {
    id: "hydration_002",
    dimensionKey: "hydration",
    title: "茶水间续命",
    description: "去接一杯水，顺便完成一次合法离岗。",
    completionTextOptions: ["合法离岗", "水杯上线", "已补水"],
    effort: "light",
    scene: "office",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["water", "office"],
    weight: 1,
    enabled: true,
  },
  {
    id: "hydration_003",
    dimensionKey: "hydration",
    title: "杯子见底",
    description: "把当前杯子里的水喝到见底，给水杯一个交代。",
    completionTextOptions: ["杯子见底", "水债已还", "不再干巴"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 2,
    isWeekendOnly: false,
    tags: ["water"],
    weight: 1,
    enabled: true,
  },
  {
    id: "hydration_004",
    dimensionKey: "hydration",
    title: "无糖信仰",
    description: "完成一次无糖补水，白水、气泡水、淡茶都算。",
    completionTextOptions: ["无糖补给", "水位正常", "清澈一点"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["water", "sugar_free"],
    weight: 1,
    enabled: true,
  },
  {
    id: "hydration_005",
    dimensionKey: "hydration",
    title: "咖啡债还款",
    description: "今天喝了咖啡、茶或奶茶的话，额外补一杯水。",
    completionTextOptions: ["咖啡债已还", "水分回补", "续命平衡"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["water", "coffee"],
    weight: 1,
    enabled: true,
  },
  {
    id: "social_001",
    dimensionKey: "social",
    title: "废话 KPI",
    description: "和同事聊两句无关工作的废话，完成今日人类连接。",
    completionTextOptions: ["废话达标", "人类连接", "班味已散"],
    effort: "light",
    scene: "office",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["chat"],
    weight: 1,
    enabled: true,
  },
  {
    id: "social_002",
    dimensionKey: "social",
    title: "班味通风",
    description: "找人吐槽一句今天的班味来源，不点名攻击，不泄露隐私。",
    completionTextOptions: ["班味通风", "情绪排水", "吐槽完成"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["chat", "mood"],
    weight: 1,
    enabled: true,
  },
  {
    id: "social_003",
    dimensionKey: "social",
    title: "夸夸回血",
    description: "真诚夸一个同事一句，可以是工作、穿搭、表情包或精神状态。",
    completionTextOptions: ["夸夸回血", "善意发射", "气氛回暖"],
    effort: "light",
    scene: "office",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["praise", "chat"],
    weight: 1,
    enabled: true,
  },
  {
    id: "social_004",
    dimensionKey: "social",
    title: "状态词上报",
    description: "在群里或私聊里发一个今天的状态词，比如“半熟”“加载中”“已掉线”。",
    completionTextOptions: ["状态已上报", "加载中", "今日冒泡"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["status", "chat"],
    weight: 1,
    enabled: true,
  },
  {
    id: "social_005",
    dimensionKey: "social",
    title: "辛苦了发射",
    description: "对一个人说“辛苦了”，包括同事、朋友、家人或自己。",
    completionTextOptions: ["辛苦了发射", "善意到账", "精神回血"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["care", "chat"],
    weight: 1,
    enabled: true,
  },
  {
    id: "learning_001",
    dimensionKey: "learning",
    title: "三分钟扫盲",
    description: "看一篇短文章、帖子或资讯，三分钟也算学习。",
    completionTextOptions: ["脑子进账", "信息补仓", "今日看红"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 3,
    isWeekendOnly: false,
    tags: ["article", "news"],
    weight: 1,
    enabled: true,
  },
  {
    id: "learning_002",
    dimensionKey: "learning",
    title: "新词解锁",
    description: "查一个今天看到但不太懂的词，别让它继续装熟。",
    completionTextOptions: ["新词解锁", "知识入账", "脑子补仓"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["learn", "term"],
    weight: 1,
    enabled: true,
  },
  {
    id: "learning_003",
    dimensionKey: "learning",
    title: "收藏回血包",
    description: "收藏一个有用链接、工具、文章或资料，未来的你会感谢现在的你。",
    completionTextOptions: ["链接入库", "回血包已存", "资料补仓"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["bookmark", "tool"],
    weight: 1,
    enabled: true,
  },
  {
    id: "learning_004",
    dimensionKey: "learning",
    title: "AI 小抄",
    description: "看一个 AI、效率工具或自动化技巧，学到一个点即可。",
    completionTextOptions: ["AI 小抄+1", "效率入账", "工具补仓"],
    effort: "light",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["ai", "tool"],
    weight: 1,
    enabled: true,
  },
  {
    id: "learning_005",
    dimensionKey: "learning",
    title: "一句话笔记",
    description: "把今天学到的一个东西写成一句话，短到能发群里最好。",
    completionTextOptions: ["一句话入账", "脑子看红", "知识落袋"],
    effort: "medium",
    scene: "general",
    repeatCooldownDays: 4,
    isWeekendOnly: false,
    tags: ["note", "learn"],
    weight: 1,
    enabled: true,
  },
];
```

- [ ] **Step 3: Run test to verify helper module still fails**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: FAIL because reward, item, and helper modules are still missing.

---

### Task 4: Add Item And Reward Config

**Files:**
- Create: `content/gamification/item-definitions.ts`
- Create: `content/gamification/reward-pool.ts`

- [ ] **Step 1: Create item definitions**

Create `content/gamification/item-definitions.ts`:

```ts
import type { ItemDefinition } from "./types";

export const ITEM_DEFINITIONS: ItemDefinition[] = [
  {
    id: "task_reroll_coupon",
    category: "task",
    name: "任务换班券",
    description: "把当天一个四维任务换成同维度另一张卡。",
    useTiming: "instant",
    effect: { type: "task_reroll", scope: "same_dimension" },
    stackable: true,
    maxUsePerUserPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "small_boost_coupon",
    category: "boost",
    name: "小暴击券",
    description: "当日真实健身打卡个人资产 1.5x，不影响赛季贡献。",
    useTiming: "today",
    effect: { type: "fitness_coin_multiplier", multiplier: 1.5 },
    stackable: false,
    maxUsePerUserPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "single_draw_guarantee_coupon",
    category: "lottery",
    name: "保底升级券",
    description: "下一次单抽至少不低于实用道具。",
    useTiming: "instant",
    effect: { type: "lottery_guarantee", minTier: "utility", appliesTo: "single" },
    stackable: true,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "ticket_discount_90",
    category: "lottery",
    name: "九折购券卡",
    description: "今天十连补券享受一次 9 折。",
    useTiming: "instant",
    effect: { type: "ticket_discount", discountRate: 0.9 },
    stackable: false,
    maxUsePerUserPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "hydration_bonus",
    category: "boost",
    name: "补水加班费",
    description: "今天完成“喝白白”后额外获得少量银子。",
    useTiming: "today",
    effect: { type: "dimension_coin_bonus", dimensionKey: "hydration", amount: 5 },
    stackable: false,
    maxUsePerUserPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "movement_bonus",
    category: "boost",
    name: "站立补贴",
    description: "今天完成“把电充绿”后额外获得少量银子。",
    useTiming: "today",
    effect: { type: "dimension_coin_bonus", dimensionKey: "movement", amount: 5 },
    stackable: false,
    maxUsePerUserPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "double_niuma_coupon",
    category: "boost",
    name: "双倍牛马券",
    description: "当日真实健身打卡个人资产 2x，赛季贡献 2x。",
    useTiming: "today",
    effect: { type: "fitness_coin_and_season_multiplier", multiplier: 2 },
    stackable: false,
    maxUsePerUserPerWeek: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "season_sprint_coupon",
    category: "boost",
    name: "赛季冲刺券",
    description: "当日真实健身打卡赛季贡献 2x。",
    useTiming: "today",
    effect: { type: "fitness_season_multiplier", multiplier: 2 },
    stackable: false,
    maxUsePerUserPerWeek: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "coin_rich_coupon",
    category: "boost",
    name: "银子暴富券",
    description: "当日真实健身打卡个人资产 2x。",
    useTiming: "today",
    effect: { type: "fitness_coin_multiplier", multiplier: 2 },
    stackable: false,
    maxUsePerUserPerWeek: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "fitness_leave_coupon",
    category: "protection",
    name: "健身请假券",
    description: "当天无法健身时保护连续记录不断联，并冻结下一次真实健身奖励档位。",
    useTiming: "today",
    effect: { type: "leave_protection", protectsStreak: true, freezesNextFitnessRewardTier: true },
    stackable: false,
    maxUsePerUserPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "luckin_coffee_coupon",
    category: "real_world",
    name: "瑞幸咖啡券",
    description: "可找管理员线下兑换一杯瑞幸咖啡。",
    useTiming: "manual_redemption",
    effect: { type: "real_world_redemption", redemptionType: "luckin_coffee" },
    stackable: true,
    requiresAdminConfirmation: true,
    enabled: true,
  },
  {
    id: "drink_water_ping",
    category: "social",
    name: "点名喝水令",
    description: "点名一位成员喝水，对方确认后生成响应记录。",
    useTiming: "instant",
    effect: { type: "social_invitation", invitationType: "DRINK_WATER" },
    stackable: true,
    maxUsePerUserPerDay: 2,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "walk_ping",
    category: "social",
    name: "出门溜达令",
    description: "邀请一位成员起身走一圈，对方确认后生成轻动态。",
    useTiming: "instant",
    effect: { type: "social_invitation", invitationType: "WALK_AROUND" },
    stackable: true,
    maxUsePerUserPerDay: 2,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "team_standup_ping",
    category: "social",
    name: "全员起立令",
    description: "发起一次全队起身提醒，记录当天响应人数。",
    useTiming: "instant",
    effect: { type: "social_invitation", invitationType: "TEAM_STANDUP" },
    stackable: true,
    maxUsePerTeamPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "chat_ping",
    category: "social",
    name: "今日闲聊令",
    description: "邀请一位成员完成“把事办黄”，双方完成后生成响应记录。",
    useTiming: "instant",
    effect: { type: "social_invitation", invitationType: "CHAT" },
    stackable: true,
    maxUsePerUserPerDay: 2,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "share_info_ping",
    category: "social",
    name: "红盘情报令",
    description: "点名一位成员分享今天看到的新东西，完成后进入今日小摘要。",
    useTiming: "instant",
    effect: { type: "social_invitation", invitationType: "SHARE_INFO" },
    stackable: true,
    maxUsePerUserPerDay: 2,
    requiresAdminConfirmation: false,
    enabled: true,
  },
  {
    id: "team_broadcast_coupon",
    category: "social",
    name: "团队小喇叭",
    description: "把一句轻量播报发到团队动态或后续摘要。",
    useTiming: "instant",
    effect: { type: "social_invitation", invitationType: "TEAM_BROADCAST" },
    stackable: true,
    maxUsePerTeamPerDay: 1,
    requiresAdminConfirmation: false,
    enabled: true,
  },
];
```

- [ ] **Step 2: Create reward definitions**

Create `content/gamification/reward-pool.ts`:

```ts
import type { RewardDefinition } from "./types";

export const REWARD_DEFINITIONS: RewardDefinition[] = [
  {
    id: "coins_005",
    tier: "coin",
    kind: "coins",
    rarity: "common",
    name: "摸鱼津贴",
    description: "获得 5 银子。",
    weight: 15,
    effect: { type: "grant_coins", amount: 5 },
    enabled: true,
  },
  {
    id: "coins_010",
    tier: "coin",
    kind: "coins",
    rarity: "common",
    name: "工位补贴",
    description: "获得 10 银子。",
    weight: 12,
    effect: { type: "grant_coins", amount: 10 },
    enabled: true,
  },
  {
    id: "coins_020",
    tier: "coin",
    kind: "coins",
    rarity: "common",
    name: "今日没白来",
    description: "获得 20 银子。",
    weight: 10,
    effect: { type: "grant_coins", amount: 20 },
    enabled: true,
  },
  {
    id: "reward_task_reroll",
    tier: "utility",
    kind: "inventory_item",
    rarity: "common",
    name: "任务换班券",
    description: "获得 1 张任务换班券。",
    weight: 10,
    effect: { type: "grant_item", itemId: "task_reroll_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_small_boost",
    tier: "utility",
    kind: "inventory_item",
    rarity: "uncommon",
    name: "小暴击券",
    description: "获得 1 张小暴击券。",
    weight: 6,
    effect: { type: "grant_item", itemId: "small_boost_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_drink_water_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "common",
    name: "点名喝水令",
    description: "获得 1 张点名喝水令。",
    weight: 8,
    effect: { type: "grant_item", itemId: "drink_water_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_walk_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "common",
    name: "出门溜达令",
    description: "获得 1 张出门溜达令。",
    weight: 6,
    effect: { type: "grant_item", itemId: "walk_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_today_title",
    tier: "cosmetic",
    kind: "title",
    rarity: "common",
    name: "今日称号",
    description: "获得一个当天展示称号。",
    weight: 6,
    effect: { type: "grant_title", titleId: "legal_slacker" },
    enabled: true,
  },
  {
    id: "reward_double_niuma",
    tier: "rare",
    kind: "inventory_item",
    rarity: "epic",
    name: "双倍牛马券",
    description: "获得 1 张双倍牛马券。",
    weight: 2,
    effect: { type: "grant_item", itemId: "double_niuma_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_luckin_coffee",
    tier: "rare",
    kind: "real_world_redemption",
    rarity: "epic",
    name: "瑞幸咖啡券",
    description: "获得 1 张瑞幸咖啡券。",
    weight: 1,
    effect: { type: "grant_real_world_redemption", itemId: "luckin_coffee_coupon", quantity: 1 },
    enabled: true,
  },
];
```

- [ ] **Step 3: Run test to verify helper module still fails**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: FAIL because `lib/gamification/content.ts` is still missing.

---

### Task 5: Add Content Getter And Validation Helpers

**Files:**
- Create: `lib/gamification/content.ts`

- [ ] **Step 1: Implement getters and validation**

Create `lib/gamification/content.ts`:

```ts
import { GAMIFICATION_DIMENSIONS } from "@/content/gamification/dimensions";
import { ITEM_DEFINITIONS } from "@/content/gamification/item-definitions";
import { REWARD_DEFINITIONS } from "@/content/gamification/reward-pool";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  TaskCardDefinition,
} from "@/content/gamification/types";

const DEFAULT_CONTENT_BUNDLE: GamificationContentBundle = {
  dimensions: GAMIFICATION_DIMENSIONS,
  taskCards: TASK_CARDS,
  rewards: REWARD_DEFINITIONS,
  items: ITEM_DEFINITIONS,
};

export function getGamificationDimensions() {
  return DEFAULT_CONTENT_BUNDLE.dimensions;
}

export function getTaskCards() {
  return DEFAULT_CONTENT_BUNDLE.taskCards;
}

export function getRewardDefinitions() {
  return DEFAULT_CONTENT_BUNDLE.rewards;
}

export function getItemDefinitions() {
  return DEFAULT_CONTENT_BUNDLE.items;
}

export function getItemDefinition(itemId: string) {
  return getItemDefinitions().find((item) => item.id === itemId);
}

export function validateGamificationContent(bundle = DEFAULT_CONTENT_BUNDLE) {
  const dimensionKeys = new Set<string>();
  const itemIds = new Set<string>();

  for (const dimension of bundle.dimensions) {
    if (dimensionKeys.has(dimension.key)) {
      throw new Error(`Duplicate dimension key: ${dimension.key}`);
    }
    dimensionKeys.add(dimension.key);
  }

  validateTaskCards(bundle.taskCards, dimensionKeys);
  validateItems(bundle.items, itemIds);
  validateRewards(bundle.rewards, itemIds);
}

function validateTaskCards(taskCards: TaskCardDefinition[], dimensionKeys: Set<string>) {
  const taskCardIds = new Set<string>();

  for (const card of taskCards) {
    if (taskCardIds.has(card.id)) {
      throw new Error(`Duplicate task card id: ${card.id}`);
    }
    taskCardIds.add(card.id);

    if (!dimensionKeys.has(card.dimensionKey)) {
      throw new Error(`Unknown task card dimension: ${card.dimensionKey}`);
    }

    if (card.weight <= 0) {
      throw new Error(`Invalid task card weight: ${card.id}`);
    }

    if (card.repeatCooldownDays < 0) {
      throw new Error(`Invalid task card cooldown: ${card.id}`);
    }

    if (card.completionTextOptions.length === 0) {
      throw new Error(`Missing task card completion text: ${card.id}`);
    }
  }
}

function validateItems(items: ItemDefinition[], itemIds: Set<string>) {
  for (const item of items) {
    if (itemIds.has(item.id)) {
      throw new Error(`Duplicate item id: ${item.id}`);
    }
    itemIds.add(item.id);

    for (const limit of [
      item.maxUsePerUserPerDay,
      item.maxUsePerUserPerWeek,
      item.maxUsePerTeamPerDay,
    ]) {
      if (limit !== undefined && limit <= 0) {
        throw new Error(`Invalid item limit: ${item.id}`);
      }
    }
  }
}

function validateRewards(rewards: RewardDefinition[], itemIds: Set<string>) {
  const rewardIds = new Set<string>();

  for (const reward of rewards) {
    if (rewardIds.has(reward.id)) {
      throw new Error(`Duplicate reward id: ${reward.id}`);
    }
    rewardIds.add(reward.id);

    if (reward.weight <= 0) {
      throw new Error(`Invalid reward weight: ${reward.id}`);
    }

    if (
      (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") &&
      !itemIds.has(reward.effect.itemId)
    ) {
      throw new Error(`Unknown reward item: ${reward.effect.itemId}`);
    }
  }
}
```

- [ ] **Step 2: Run content test to verify it passes**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: PASS.

---

### Task 6: Verify Story Scope

**Files:**
- No new files beyond previous tasks.

- [ ] **Step 1: Run targeted content test**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Confirm no database or route files changed**

Run:

```bash
git diff --stat
```

Expected: changes are limited to:

```text
content/gamification/*
lib/gamification/content.ts
__tests__/gamification-content.test.ts
```

- [ ] **Step 5: Commit GM-01**

```bash
git add content/gamification lib/gamification/content.ts __tests__/gamification-content.test.ts
git commit -m "feat: add gamification content config"
```

## Self-Review Checklist

- GM-01 does not add Prisma models.
- GM-01 does not add HTTP APIs.
- GM-01 does not add UI.
- Every enabled task card references one of the four fixed dimensions.
- Reward definitions that grant items reference existing item IDs.
- Validation failures are covered by tests.
- GM-02 can depend on the stable IDs introduced here.
