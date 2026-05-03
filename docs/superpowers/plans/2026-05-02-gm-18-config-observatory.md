# GM-18 Config Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only admin configuration observatory that explains the currently shipped gamification task cards, reward pool, item definitions, and validation guardrails.

**Architecture:** Build one pure content snapshot service in `lib/gamification/config-observatory.ts`, expose it through `GET /api/admin/gamification/config-observatory`, and render it in `/admin` with a client component that refreshes through the API. The feature reads only `content/gamification/*` and existing content helpers; it does not call Prisma except for API auth through the current session helper.

**Tech Stack:** Next.js App Router, TypeScript, React client component, Vitest + jsdom.

---

## File Structure

- `lib/types.ts`
  - Add shared GM-18 response types after the GM-17 ops dashboard types.
- `lib/gamification/config-observatory.ts`
  - New pure service that reads content definitions and returns one `GamificationConfigObservatorySnapshot`.
- `app/api/admin/gamification/config-observatory/route.ts`
  - New admin-only read API.
- `components/admin/GamificationConfigObservatory.tsx`
  - New client component for the `/admin` panel.
- `app/(board)/admin/page.tsx`
  - Build the GM-18 snapshot server-side and render the panel near GM-17.
- `__tests__/gamification-config-observatory.test.ts`
  - Service tests for content calculations and validation summary.
- `__tests__/gamification-config-observatory-api.test.ts`
  - API auth and success tests.
- `__tests__/gamification-config-observatory-panel.test.tsx`
  - Client rendering and refresh tests.
- `docs/gamification-dev-roadmap.md`
  - Add GM-18 to the summary table, new section, related docs, and update log.
- `docs/gamification-acceptance-checklist.md`
  - Add GM-18 admin acceptance checks.

## Shared Constants

The implementation must keep these values local to `lib/gamification/config-observatory.ts`; do not export them from `lib/gamification/content.ts`.

```ts
const EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT = 100;

const EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
} satisfies Record<RewardTier, number>;

const SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES = new Set<ItemDefinition["effect"]["type"]>([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);
```

---

### Task 1: Snapshot Types And Service

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/gamification/config-observatory.ts`
- Test: `__tests__/gamification-config-observatory.test.ts`

- [ ] **Step 1: Write the failing service tests**

Create `__tests__/gamification-config-observatory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";

describe("gamification config observatory", () => {
  it("summarizes task dimensions, reward pool weights, and item catalog availability", () => {
    const snapshot = buildGamificationConfigObservatorySnapshot({
      now: new Date("2026-05-02T12:00:00+08:00"),
    });

    expect(snapshot.generatedAt).toBe("2026-05-02T04:00:00.000Z");
    expect(snapshot.dimensionPools.map((pool) => pool.key)).toEqual([
      "movement",
      "hydration",
      "social",
      "learning",
    ]);
    expect(snapshot.dimensionPools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "movement",
          enabledCardCount: 5,
          disabledCardCount: 0,
          totalEnabledWeight: 5,
        }),
        expect.objectContaining({
          key: "hydration",
          enabledCardCount: 5,
          disabledCardCount: 0,
          totalEnabledWeight: 5,
        }),
      ]),
    );
    expect(snapshot.rewardPool.activeTotalWeight).toBe(100);
    expect(snapshot.rewardPool.directCoinExpectedValue).toBeCloseTo(8.75, 5);
    expect(snapshot.rewardPool.tierWeights).toEqual([
      { tier: "coin", weight: 45, expectedWeight: 45, status: "pass" },
      { tier: "utility", weight: 27, expectedWeight: 27, status: "pass" },
      { tier: "social", weight: 24, expectedWeight: 24, status: "pass" },
      { tier: "cosmetic", weight: 0, expectedWeight: 0, status: "pass" },
      { tier: "rare", weight: 4, expectedWeight: 4, status: "pass" },
    ]);
    expect(snapshot.rewardPool.activeRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coins_005",
          probabilityLabel: "15%",
          effectSummary: "获得 5 银子",
        }),
        expect.objectContaining({
          id: "reward_luckin_coffee",
          probabilityLabel: "1%",
          effectSummary: "获得 1 个瑞幸咖啡券兑换资格",
        }),
      ]),
    );
    expect(snapshot.rewardPool.disabledRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "reward_today_title",
          enabled: false,
          effectSummary: "获得称号 legal_slacker",
        }),
      ]),
    );
    expect(snapshot.itemCatalog.availabilityCounts).toMatchObject({
      active_reward_pool: 12,
      eligible_but_not_in_pool: 1,
      unsupported_effect: 4,
      disabled_item: 0,
    });
    expect(snapshot.itemCatalog.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "lottery",
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "single_draw_guarantee_coupon",
              rewardPoolAvailability: "unsupported_effect",
              rewardPoolAvailabilityLabel: "不可进入奖池",
            }),
          ]),
        }),
        expect.objectContaining({
          category: "boost",
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "coin_rich_coupon",
              rewardPoolAvailability: "eligible_but_not_in_pool",
              rewardPoolAvailabilityLabel: "可进奖池但当前未投放",
            }),
          ]),
        }),
      ]),
    );
  });

  it("returns a passing validation snapshot for the shipped content", () => {
    const snapshot = buildGamificationConfigObservatorySnapshot({
      now: new Date("2026-05-02T12:00:00+08:00"),
    });

    expect(snapshot.validation.ok).toBe(true);
    expect(snapshot.validation.summary).toBe("当前游戏化配置校验通过。");
    expect(snapshot.validation.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "active_reward_total_weight",
          label: "Active 奖池总权重",
          status: "pass",
          detail: "当前 100，期望 100。",
        }),
        expect.objectContaining({
          key: "active_reward_tier_weights",
          label: "Active 奖池分层权重",
          status: "pass",
          detail: "coin 45 / utility 27 / social 24 / cosmetic 0 / rare 4。",
        }),
        expect.objectContaining({
          key: "content_validation",
          label: "内容结构校验",
          status: "pass",
          detail: "validateGamificationContent() 通过。",
        }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run service tests to verify RED**

Run:

```bash
npm test -- __tests__/gamification-config-observatory.test.ts
```

Expected: FAIL because `@/lib/gamification/config-observatory` does not exist.

- [ ] **Step 3: Add shared GM-18 types**

Append these types to `lib/types.ts` immediately after `GamificationOpsDashboardSnapshot`:

```ts
export type GamificationConfigCheckStatus = "pass" | "fail" | "info";

export type GamificationRewardPoolAvailability =
  | "active_reward_pool"
  | "eligible_but_not_in_pool"
  | "unsupported_effect"
  | "disabled_item";

export interface GamificationConfigValidationCheck {
  key: string;
  label: string;
  status: GamificationConfigCheckStatus;
  detail: string;
}

export interface GamificationConfigValidationSnapshot {
  ok: boolean;
  summary: string;
  checks: GamificationConfigValidationCheck[];
}

export interface GamificationDimensionCount {
  key: string;
  label: string;
  count: number;
}

export interface GamificationTaskCardConfigRow {
  id: string;
  title: string;
  description: string;
  weight: number;
  effort: string;
  scene: string;
  tags: string[];
  enabled: boolean;
}

export interface GamificationDimensionPoolSnapshot {
  key: string;
  title: string;
  subtitle: string;
  enabledCardCount: number;
  disabledCardCount: number;
  totalEnabledWeight: number;
  scenes: GamificationDimensionCount[];
  efforts: GamificationDimensionCount[];
  topTags: GamificationDimensionCount[];
  sampleCards: GamificationTaskCardConfigRow[];
}

export interface GamificationRewardTierWeightSnapshot {
  tier: string;
  weight: number;
  expectedWeight: number;
  status: GamificationConfigCheckStatus;
}

export interface GamificationRewardConfigRow {
  id: string;
  tier: string;
  kind: string;
  rarity: string;
  name: string;
  description: string;
  weight: number;
  probability: number;
  probabilityLabel: string;
  effectSummary: string;
  enabled: boolean;
}

export interface GamificationRewardPoolSnapshot {
  activeTotalWeight: number;
  expectedActiveTotalWeight: number;
  directCoinExpectedValue: number;
  tierWeights: GamificationRewardTierWeightSnapshot[];
  activeRewards: GamificationRewardConfigRow[];
  disabledRewards: GamificationRewardConfigRow[];
}

export interface GamificationItemConfigRow {
  id: string;
  category: string;
  name: string;
  description: string;
  useTiming: string;
  effectSummary: string;
  stackable: boolean;
  limitSummary: string;
  requiresAdminConfirmation: boolean;
  enabled: boolean;
  rewardPoolAvailability: GamificationRewardPoolAvailability;
  rewardPoolAvailabilityLabel: string;
}

export interface GamificationItemCategorySnapshot {
  category: string;
  enabledCount: number;
  disabledCount: number;
  items: GamificationItemConfigRow[];
}

export interface GamificationItemCatalogSnapshot {
  categories: GamificationItemCategorySnapshot[];
  availabilityCounts: Record<GamificationRewardPoolAvailability, number>;
}

export interface GamificationConfigObservatorySnapshot {
  generatedAt: string;
  validation: GamificationConfigValidationSnapshot;
  dimensionPools: GamificationDimensionPoolSnapshot[];
  rewardPool: GamificationRewardPoolSnapshot;
  itemCatalog: GamificationItemCatalogSnapshot;
}
```

- [ ] **Step 4: Implement the config observatory service**

Create `lib/gamification/config-observatory.ts` with this implementation:

```ts
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardEffect,
  RewardTier,
  TaskCardDefinition,
} from "@/content/gamification/types";
import {
  getGamificationDimensions,
  getItemDefinitions,
  getRewardDefinitions,
  getTaskCards,
  validateGamificationContent,
} from "@/lib/gamification/content";
import type {
  GamificationConfigObservatorySnapshot,
  GamificationConfigValidationCheck,
  GamificationDimensionCount,
  GamificationDimensionPoolSnapshot,
  GamificationItemCatalogSnapshot,
  GamificationItemCategorySnapshot,
  GamificationItemConfigRow,
  GamificationRewardConfigRow,
  GamificationRewardPoolAvailability,
  GamificationRewardPoolSnapshot,
  GamificationRewardTierWeightSnapshot,
} from "@/lib/types";

const EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT = 100;

const EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
} satisfies Record<RewardTier, number>;

const SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES = new Set<ItemDefinition["effect"]["type"]>([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);

interface BuildConfigObservatoryInput {
  now?: Date;
  bundle?: GamificationContentBundle;
}

function getDefaultBundle(): GamificationContentBundle {
  return {
    dimensions: getGamificationDimensions(),
    taskCards: getTaskCards(),
    rewards: getRewardDefinitions(),
    items: getItemDefinitions(),
  };
}

function countBy<T>(values: T[], getKey: (value: T) => string): GamificationDimensionCount[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function getTopTags(cards: TaskCardDefinition[]) {
  const tags = cards.flatMap((card) => card.tags);
  return countBy(tags, (tag) => tag).slice(0, 6);
}

function formatProbability(probability: number) {
  if (probability === 0) {
    return "0%";
  }

  const percent = probability * 100;
  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(2))}%`;
}

function rewardEffectSummary(effect: RewardEffect, itemNameById: Map<string, string>) {
  switch (effect.type) {
    case "grant_coins":
      return `获得 ${effect.amount} 银子`;
    case "grant_item":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}`;
    case "grant_real_world_redemption":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}兑换资格`;
    case "grant_title":
      return `获得称号 ${effect.titleId}`;
  }
}

function itemEffectSummary(item: ItemDefinition) {
  const effect = item.effect;

  switch (effect.type) {
    case "fitness_coin_multiplier":
      return `当日健身个人资产 ${effect.multiplier}x`;
    case "fitness_season_multiplier":
      return `当日健身赛季贡献 ${effect.multiplier}x`;
    case "fitness_coin_and_season_multiplier":
      return `当日健身个人资产和赛季贡献 ${effect.multiplier}x`;
    case "task_reroll":
      return "同维度重抽一个四维任务";
    case "lottery_guarantee":
      return `下一次${effect.appliesTo === "single" ? "单抽" : "十连"}至少 ${effect.minTier}`;
    case "ticket_discount":
      return `补券价格 ${Math.round(effect.discountRate * 100)} 折`;
    case "social_invitation":
      return `发起 ${effect.invitationType} 弱社交邀请`;
    case "leave_protection":
      return "保护连续记录并冻结下一次真实健身奖励档位";
    case "real_world_redemption":
      return `线下兑换 ${effect.redemptionType}`;
    case "dimension_coin_bonus":
      return `完成 ${effect.dimensionKey} 额外获得 ${effect.amount} 银子`;
    case "cosmetic":
      return `外观效果 ${effect.cosmeticType}`;
  }
}

function limitSummary(item: ItemDefinition) {
  const limits: string[] = [];

  if (item.maxUsePerUserPerDay) {
    limits.push(`每人每天 ${item.maxUsePerUserPerDay}`);
  }

  if (item.maxUsePerUserPerWeek) {
    limits.push(`每人每周 ${item.maxUsePerUserPerWeek}`);
  }

  if (item.maxUsePerTeamPerDay) {
    limits.push(`每队每天 ${item.maxUsePerTeamPerDay}`);
  }

  return limits.length > 0 ? limits.join(" / ") : "无额外限制";
}

function availabilityLabel(availability: GamificationRewardPoolAvailability) {
  switch (availability) {
    case "active_reward_pool":
      return "已进入奖池";
    case "eligible_but_not_in_pool":
      return "可进奖池但当前未投放";
    case "unsupported_effect":
      return "不可进入奖池";
    case "disabled_item":
      return "道具未启用";
  }
}

function buildDimensionPools(bundle: GamificationContentBundle): GamificationDimensionPoolSnapshot[] {
  return bundle.dimensions.map((dimension) => {
    const cards = bundle.taskCards.filter((card) => card.dimensionKey === dimension.key);
    const enabledCards = cards.filter((card) => card.enabled);

    return {
      key: dimension.key,
      title: dimension.title,
      subtitle: dimension.subtitle,
      enabledCardCount: enabledCards.length,
      disabledCardCount: cards.length - enabledCards.length,
      totalEnabledWeight: enabledCards.reduce((total, card) => total + card.weight, 0),
      scenes: countBy(enabledCards, (card) => card.scene),
      efforts: countBy(enabledCards, (card) => card.effort),
      topTags: getTopTags(enabledCards),
      sampleCards: enabledCards.slice(0, 5).map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        weight: card.weight,
        effort: card.effort,
        scene: card.scene,
        tags: card.tags,
        enabled: card.enabled,
      })),
    };
  });
}

function buildRewardPool(bundle: GamificationContentBundle): GamificationRewardPoolSnapshot {
  const activeRewards = bundle.rewards.filter((reward) => reward.enabled);
  const activeTotalWeight = activeRewards.reduce((total, reward) => total + reward.weight, 0);
  const itemNameById = new Map(bundle.items.map((item) => [item.id, item.name]));
  const row = (reward: (typeof bundle.rewards)[number]): GamificationRewardConfigRow => {
    const probability = reward.enabled && activeTotalWeight > 0 ? reward.weight / activeTotalWeight : 0;

    return {
      id: reward.id,
      tier: reward.tier,
      kind: reward.kind,
      rarity: reward.rarity,
      name: reward.name,
      description: reward.description,
      weight: reward.weight,
      probability,
      probabilityLabel: formatProbability(probability),
      effectSummary: rewardEffectSummary(reward.effect, itemNameById),
      enabled: reward.enabled,
    };
  };
  const tierWeights: GamificationRewardTierWeightSnapshot[] = (
    Object.keys(EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS) as RewardTier[]
  ).map((tier) => {
    const weight = activeRewards
      .filter((reward) => reward.tier === tier)
      .reduce((total, reward) => total + reward.weight, 0);
    const expectedWeight = EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS[tier];

    return {
      tier,
      weight,
      expectedWeight,
      status: weight === expectedWeight ? "pass" : "fail",
    };
  });
  const directCoinExpectedValue = activeRewards.reduce((total, reward) => {
    if (reward.effect.type !== "grant_coins" || activeTotalWeight === 0) {
      return total;
    }

    return total + (reward.weight / activeTotalWeight) * reward.effect.amount;
  }, 0);

  return {
    activeTotalWeight,
    expectedActiveTotalWeight: EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT,
    directCoinExpectedValue,
    tierWeights,
    activeRewards: activeRewards.map(row),
    disabledRewards: bundle.rewards.filter((reward) => !reward.enabled).map(row),
  };
}

function buildItemCatalog(bundle: GamificationContentBundle): GamificationItemCatalogSnapshot {
  const activeRewardItemIds = new Set(
    bundle.rewards
      .filter((reward) => reward.enabled)
      .flatMap((reward) =>
        reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption"
          ? [reward.effect.itemId]
          : [],
      ),
  );
  const availabilityCounts: Record<GamificationRewardPoolAvailability, number> = {
    active_reward_pool: 0,
    eligible_but_not_in_pool: 0,
    unsupported_effect: 0,
    disabled_item: 0,
  };
  const itemRows = bundle.items.map((item): GamificationItemConfigRow => {
    const supportedActiveEffect = SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES.has(item.effect.type);
    const rewardPoolAvailability: GamificationRewardPoolAvailability = !item.enabled
      ? "disabled_item"
      : !supportedActiveEffect
        ? "unsupported_effect"
        : activeRewardItemIds.has(item.id)
          ? "active_reward_pool"
          : "eligible_but_not_in_pool";

    availabilityCounts[rewardPoolAvailability] += 1;

    return {
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description,
      useTiming: item.useTiming,
      effectSummary: itemEffectSummary(item),
      stackable: item.stackable,
      limitSummary: limitSummary(item),
      requiresAdminConfirmation: item.requiresAdminConfirmation,
      enabled: item.enabled,
      rewardPoolAvailability,
      rewardPoolAvailabilityLabel: availabilityLabel(rewardPoolAvailability),
    };
  });
  const categories = [...new Set(itemRows.map((item) => item.category))].sort();

  return {
    availabilityCounts,
    categories: categories.map((category): GamificationItemCategorySnapshot => {
      const items = itemRows.filter((item) => item.category === category);

      return {
        category,
        enabledCount: items.filter((item) => item.enabled).length,
        disabledCount: items.filter((item) => !item.enabled).length,
        items,
      };
    }),
  };
}

function buildValidation(bundle: GamificationContentBundle): GamificationConfigObservatorySnapshot["validation"] {
  const rewardPool = buildRewardPool(bundle);
  const tierDetail = rewardPool.tierWeights.map((tier) => `${tier.tier} ${tier.weight}`).join(" / ");
  const checks: GamificationConfigValidationCheck[] = [
    {
      key: "active_reward_total_weight",
      label: "Active 奖池总权重",
      status: rewardPool.activeTotalWeight === EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT ? "pass" : "fail",
      detail: `当前 ${rewardPool.activeTotalWeight}，期望 ${EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT}。`,
    },
    {
      key: "active_reward_tier_weights",
      label: "Active 奖池分层权重",
      status: rewardPool.tierWeights.every((tier) => tier.status === "pass") ? "pass" : "fail",
      detail: `${tierDetail}。`,
    },
    {
      key: "direct_coin_expected_value",
      label: "直接银子期望",
      status: Math.abs(rewardPool.directCoinExpectedValue - 8.75) < 0.00001 ? "pass" : "fail",
      detail: `当前 ${rewardPool.directCoinExpectedValue.toFixed(2)}，期望 8.75。`,
    },
  ];

  try {
    validateGamificationContent(bundle);
    checks.push({
      key: "content_validation",
      label: "内容结构校验",
      status: "pass",
      detail: "validateGamificationContent() 通过。",
    });
  } catch (error) {
    checks.push({
      key: "content_validation",
      label: "内容结构校验",
      status: "fail",
      detail: error instanceof Error ? error.message : "validateGamificationContent() 失败。",
    });
  }

  const ok = checks.every((check) => check.status !== "fail");

  return {
    ok,
    summary: ok ? "当前游戏化配置校验通过。" : "当前游戏化配置存在风险，请先处理失败项。",
    checks,
  };
}

export function buildGamificationConfigObservatorySnapshot(
  input: BuildConfigObservatoryInput = {},
): GamificationConfigObservatorySnapshot {
  const bundle = input.bundle ?? getDefaultBundle();
  const now = input.now ?? new Date();

  return {
    generatedAt: now.toISOString(),
    validation: buildValidation(bundle),
    dimensionPools: buildDimensionPools(bundle),
    rewardPool: buildRewardPool(bundle),
    itemCatalog: buildItemCatalog(bundle),
  };
}
```

- [ ] **Step 5: Run service tests to verify GREEN**

Run:

```bash
npm test -- __tests__/gamification-config-observatory.test.ts
```

Expected: PASS with 1 test file and 2 tests.

- [ ] **Step 6: Commit the service slice**

Run:

```bash
git add lib/types.ts lib/gamification/config-observatory.ts __tests__/gamification-config-observatory.test.ts
git commit -m "feat: add gamification config observatory service"
```

---

### Task 2: Admin API

**Files:**
- Create: `app/api/admin/gamification/config-observatory/route.ts`
- Test: `__tests__/gamification-config-observatory-api.test.ts`

- [ ] **Step 1: Write the failing API tests**

Create `__tests__/gamification-config-observatory-api.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/gamification/config-observatory/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/admin/gamification/config-observatory", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/admin/gamification/config-observatory", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.user.update({ where: { id: memberId }, data: { role: "MEMBER" } });
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const response = await GET(request(memberId));

    expect(response.status).toBe(403);
  });

  it("returns the config observatory snapshot for admins", async () => {
    const response = await GET(request(adminId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      validation: expect.objectContaining({ ok: true }),
      dimensionPools: expect.any(Array),
      rewardPool: expect.objectContaining({ activeTotalWeight: 100 }),
      itemCatalog: expect.objectContaining({ categories: expect.any(Array) }),
    });
  });
});
```

- [ ] **Step 2: Run API tests to verify RED**

Run:

```bash
npm test -- __tests__/gamification-config-observatory-api.test.ts
```

Expected: FAIL because `@/app/api/admin/gamification/config-observatory/route` does not exist.

- [ ] **Step 3: Implement the admin API route**

Create `app/api/admin/gamification/config-observatory/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = buildGamificationConfigObservatorySnapshot();

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run API tests to verify GREEN**

Run:

```bash
npm test -- __tests__/gamification-config-observatory-api.test.ts
```

Expected: PASS with 1 test file and 3 tests.

- [ ] **Step 5: Commit the API slice**

Run:

```bash
git add app/api/admin/gamification/config-observatory/route.ts __tests__/gamification-config-observatory-api.test.ts
git commit -m "feat: add config observatory admin api"
```

---

### Task 3: Admin Panel

**Files:**
- Create: `components/admin/GamificationConfigObservatory.tsx`
- Modify: `app/(board)/admin/page.tsx`
- Test: `__tests__/gamification-config-observatory-panel.test.tsx`

- [ ] **Step 1: Write the failing panel tests**

Create `__tests__/gamification-config-observatory-panel.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamificationConfigObservatory } from "@/components/admin/GamificationConfigObservatory";
import type { GamificationConfigObservatorySnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSnapshot(
  overrides: Partial<GamificationConfigObservatorySnapshot> = {},
): GamificationConfigObservatorySnapshot {
  return {
    generatedAt: "2026-05-02T04:00:00.000Z",
    validation: {
      ok: true,
      summary: "当前游戏化配置校验通过。",
      checks: [
        {
          key: "active_reward_total_weight",
          label: "Active 奖池总权重",
          status: "pass",
          detail: "当前 100，期望 100。",
        },
      ],
    },
    dimensionPools: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "动一动",
        enabledCardCount: 5,
        disabledCardCount: 0,
        totalEnabledWeight: 5,
        scenes: [{ key: "general", label: "general", count: 4 }],
        efforts: [{ key: "light", label: "light", count: 5 }],
        topTags: [{ key: "stand", label: "stand", count: 1 }],
        sampleCards: [
          {
            id: "movement_001",
            title: "工位重启",
            description: "离开椅子站起来 2 分钟。",
            weight: 1,
            effort: "light",
            scene: "general",
            tags: ["stand"],
            enabled: true,
          },
        ],
      },
    ],
    rewardPool: {
      activeTotalWeight: 100,
      expectedActiveTotalWeight: 100,
      directCoinExpectedValue: 8.75,
      tierWeights: [{ tier: "coin", weight: 45, expectedWeight: 45, status: "pass" }],
      activeRewards: [
        {
          id: "coins_005",
          tier: "coin",
          kind: "coins",
          rarity: "common",
          name: "摸鱼津贴",
          description: "获得 5 银子。",
          weight: 15,
          probability: 0.15,
          probabilityLabel: "15%",
          effectSummary: "获得 5 银子",
          enabled: true,
        },
      ],
      disabledRewards: [
        {
          id: "reward_today_title",
          tier: "cosmetic",
          kind: "title",
          rarity: "common",
          name: "今日称号",
          description: "获得一个当天展示称号。",
          weight: 6,
          probability: 0,
          probabilityLabel: "0%",
          effectSummary: "获得称号 legal_slacker",
          enabled: false,
        },
      ],
    },
    itemCatalog: {
      availabilityCounts: {
        active_reward_pool: 1,
        eligible_but_not_in_pool: 1,
        unsupported_effect: 1,
        disabled_item: 0,
      },
      categories: [
        {
          category: "task",
          enabledCount: 1,
          disabledCount: 0,
          items: [
            {
              id: "task_reroll_coupon",
              category: "task",
              name: "任务换班券",
              description: "把当天一个四维任务换成同维度另一张卡。",
              useTiming: "instant",
              effectSummary: "同维度重抽一个四维任务",
              stackable: true,
              limitSummary: "每人每天 1",
              requiresAdminConfirmation: false,
              enabled: true,
              rewardPoolAvailability: "active_reward_pool",
              rewardPoolAvailabilityLabel: "已进入奖池",
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe("GamificationConfigObservatory", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders validation, dimensions, rewards, and items", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await act(async () => {
      root.render(<GamificationConfigObservatory initialSnapshot={buildSnapshot()} />);
    });

    expect(container.textContent).toContain("配置总览");
    expect(container.textContent).toContain("当前游戏化配置校验通过。");
    expect(container.textContent).toContain("四维任务卡池");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("工位重启");
    expect(container.textContent).toContain("抽奖奖池");
    expect(container.textContent).toContain("摸鱼津贴");
    expect(container.textContent).toContain("今日称号");
    expect(container.textContent).toContain("道具配置");
    expect(container.textContent).toContain("任务换班券");
  });

  it("refreshes the snapshot from the admin API", async () => {
    const nextSnapshot = buildSnapshot({
      validation: {
        ok: false,
        summary: "当前游戏化配置存在风险，请先处理失败项。",
        checks: [
          {
            key: "active_reward_total_weight",
            label: "Active 奖池总权重",
            status: "fail",
            detail: "当前 90，期望 100。",
          },
        ],
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ snapshot: nextSnapshot })),
    );

    await act(async () => {
      root.render(<GamificationConfigObservatory initialSnapshot={buildSnapshot()} />);
    });

    const refreshButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("刷新配置"),
    );
    expect(refreshButton).toBeDefined();

    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/gamification/config-observatory",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("当前游戏化配置存在风险，请先处理失败项。");
    expect(container.textContent).toContain("当前 90，期望 100。");
  });
});
```

- [ ] **Step 2: Run panel tests to verify RED**

Run:

```bash
npm test -- __tests__/gamification-config-observatory-panel.test.tsx
```

Expected: FAIL because `@/components/admin/GamificationConfigObservatory` does not exist.

- [ ] **Step 3: Implement the client component**

Create `components/admin/GamificationConfigObservatory.tsx`:

```tsx
"use client";

import { useState } from "react";
import type {
  GamificationConfigCheckStatus,
  GamificationConfigObservatorySnapshot,
  GamificationRewardPoolAvailability,
} from "@/lib/types";

interface GamificationConfigObservatoryProps {
  initialSnapshot: GamificationConfigObservatorySnapshot;
}

function statusLabel(status: GamificationConfigCheckStatus) {
  if (status === "pass") return "通过";
  if (status === "fail") return "需要处理";
  return "说明";
}

function statusClass(status: GamificationConfigCheckStatus) {
  if (status === "pass") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "fail") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

function availabilityClass(availability: GamificationRewardPoolAvailability) {
  if (availability === "active_reward_pool") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (availability === "eligible_but_not_in_pool") return "border-amber-300 bg-amber-50 text-amber-800";
  if (availability === "unsupported_effect") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-rose-300 bg-rose-50 text-rose-800";
}

async function readConfigObservatoryResponse(response: Response) {
  let payload: { snapshot?: GamificationConfigObservatorySnapshot; error?: string };

  try {
    payload = (await response.json()) as {
      snapshot?: GamificationConfigObservatorySnapshot;
      error?: string;
    };
  } catch {
    throw new Error("配置总览响应解析失败");
  }

  if (!response.ok || !payload.snapshot) {
    throw new Error(payload.error ?? "配置总览刷新失败");
  }

  return payload.snapshot;
}

export function GamificationConfigObservatory({ initialSnapshot }: GamificationConfigObservatoryProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/gamification/config-observatory", {
        cache: "no-store",
        credentials: "same-origin",
      });
      setSnapshot(await readConfigObservatoryResponse(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "配置总览刷新失败");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">GM-18</p>
          <h1 className="text-2xl font-black text-slate-900">配置总览</h1>
          <p className="mt-1 text-sm font-bold text-sub">
            只读查看当前四维任务、抽奖奖池、道具定义和内容校验。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="rounded-full border-2 border-slate-800 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? "刷新中..." : "刷新配置"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-slate-900">配置校验</h2>
          <span className={`w-fit rounded-full border-2 px-3 py-1 text-xs font-black ${statusClass(snapshot.validation.ok ? "pass" : "fail")}`}>
            {snapshot.validation.ok ? "通过" : "需要处理"}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold text-sub">{snapshot.validation.summary}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {snapshot.validation.checks.map((check) => (
            <article key={check.key} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-900">{check.label}</h3>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${statusClass(check.status)}`}>
                  {statusLabel(check.status)}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-600">{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">四维任务卡池</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {snapshot.dimensionPools.map((pool) => (
            <article key={pool.key} className="rounded-2xl border-[3px] border-slate-900 bg-yellow-50 p-4 shadow-[0_4px_0_0_#1f2937]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">{pool.title}</h3>
                  <p className="text-xs font-bold text-slate-600">{pool.key} · {pool.subtitle}</p>
                </div>
                <span className="rounded-full border-2 border-slate-800 bg-white px-2 py-1 text-xs font-black">
                  {pool.enabledCardCount} 启用
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-700">
                权重 {pool.totalEnabledWeight} · 禁用 {pool.disabledCardCount}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pool.topTags.map((tag) => (
                  <span key={tag.key} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700">
                    #{tag.label} {tag.count}
                  </span>
                ))}
              </div>
              <ul className="mt-3 grid gap-2">
                {pool.sampleCards.map((card) => (
                  <li key={card.id} className="rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-sm">
                    <span className="font-black text-slate-900">{card.title}</span>
                    <span className="ml-2 font-bold text-slate-500">{card.scene} · {card.effort} · 权重 {card.weight}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">抽奖奖池</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-slate-900 bg-yellow-100 p-3">
            <p className="text-xs font-black text-slate-600">Active 总权重</p>
            <p className="text-2xl font-black text-slate-950">{snapshot.rewardPool.activeTotalWeight}</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-600">直接银子期望</p>
            <p className="text-2xl font-black text-slate-950">{snapshot.rewardPool.directCoinExpectedValue.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-600">禁用奖励</p>
            <p className="text-2xl font-black text-slate-950">{snapshot.rewardPool.disabledRewards.length}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {snapshot.rewardPool.tierWeights.map((tier) => (
            <span key={tier.tier} className={`rounded-full border-2 px-3 py-1 text-xs font-black ${statusClass(tier.status)}`}>
              {tier.tier} {tier.weight}/{tier.expectedWeight}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div>
            <h3 className="font-black text-slate-900">Active rewards</h3>
            <ul className="mt-2 grid gap-2">
              {snapshot.rewardPool.activeRewards.map((reward) => (
                <li key={reward.id} className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-900">{reward.name}</span>
                    <span className="font-black text-slate-700">{reward.probabilityLabel}</span>
                  </div>
                  <p className="mt-1 font-bold text-sub">{reward.tier} · {reward.kind} · {reward.effectSummary}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-black text-slate-900">Disabled rewards</h3>
            <ul className="mt-2 grid gap-2">
              {snapshot.rewardPool.disabledRewards.map((reward) => (
                <li key={reward.id} className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="font-black text-slate-900">{reward.name}</span>
                  <p className="mt-1 font-bold text-sub">{reward.effectSummary}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">道具配置</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {snapshot.itemCatalog.categories.map((category) => (
            <article key={category.category} className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">{category.category}</h3>
              <p className="mt-1 text-xs font-bold text-sub">
                启用 {category.enabledCount} · 禁用 {category.disabledCount}
              </p>
              <ul className="mt-3 grid gap-2">
                {category.items.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900">{item.name}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${availabilityClass(item.rewardPoolAvailability)}`}>
                        {item.rewardPoolAvailabilityLabel}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-slate-600">{item.effectSummary}</p>
                    <p className="mt-1 text-xs font-bold text-sub">
                      {item.useTiming} · {item.stackable ? "可堆叠" : "不可堆叠"} · {item.limitSummary}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Wire the panel into `/admin`**

Modify `app/(board)/admin/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GamificationConfigObservatory } from "@/components/admin/GamificationConfigObservatory";
import { GamificationOpsDashboard } from "@/components/admin/GamificationOpsDashboard";
import { SeasonAdminPanel } from "@/components/admin/SeasonAdminPanel";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";
import { buildGamificationOpsDashboard } from "@/lib/gamification/ops-dashboard";
import { listSeasonsForTeam } from "@/lib/season-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const user = await loadCurrentUser(cookieStore);

  if (!user || !isAdminUser(user)) {
    redirect("/");
  }

  const [seasons, opsSnapshot, configSnapshot] = await Promise.all([
    listSeasonsForTeam(user.teamId),
    buildGamificationOpsDashboard({ teamId: user.teamId }),
    Promise.resolve(buildGamificationConfigObservatorySnapshot()),
  ]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <GamificationOpsDashboard initialSnapshot={opsSnapshot} />
      <GamificationConfigObservatory initialSnapshot={configSnapshot} />
      <SeasonAdminPanel initialSeasons={seasons} />
    </div>
  );
}
```

- [ ] **Step 5: Run panel tests to verify GREEN**

Run:

```bash
npm test -- __tests__/gamification-config-observatory-panel.test.tsx
```

Expected: PASS with 1 test file and 2 tests.

- [ ] **Step 6: Run focused GM-18 tests**

Run:

```bash
npm test -- __tests__/gamification-config-observatory.test.ts __tests__/gamification-config-observatory-api.test.ts __tests__/gamification-config-observatory-panel.test.tsx
```

Expected: PASS with 3 test files and 7 tests.

- [ ] **Step 7: Commit the UI slice**

Run:

```bash
git add components/admin/GamificationConfigObservatory.tsx 'app/(board)/admin/page.tsx' __tests__/gamification-config-observatory-panel.test.tsx
git commit -m "feat: add gamification config observatory panel"
```

---

### Task 4: Roadmap And Acceptance Docs

**Files:**
- Modify: `docs/gamification-dev-roadmap.md`
- Modify: `docs/gamification-acceptance-checklist.md`

- [ ] **Step 1: Update roadmap summary table**

In `docs/gamification-dev-roadmap.md`, add this row after GM-17:

```md
| GM-18 | Config Observatory | 已完成 | 管理员可见 |
```

Also update the GM-01 foundation sentence from:

```md
后面 GM-02 到 GM-17 都来查这套配置
```

to:

```md
后面 GM-02 到 GM-18 都来查这套配置
```

- [ ] **Step 2: Add the GM-18 roadmap section**

Insert this section after the GM-17 section and before `## 相关文档`:

```md
## GM-18: Config Observatory

GM-18 做的是“把当前上线的游戏化配置讲清楚”：它不新增玩法、不提供在线编辑、不迁移配置到数据库，而是在管理员页展示四维任务卡池、抽奖奖池、道具定义和内容校验结果。

### 已完成内容

1. 新增只读配置快照服务

新增 `lib/gamification/config-observatory.ts`，核心入口是：

- `buildGamificationConfigObservatorySnapshot()`

它读取 `content/gamification/*` 和 `lib/gamification/content.ts` 的现有内容 helper，不读取或写入 Prisma。

2. 展示四维任务卡池

管理员可以看到每个维度的启用任务数、禁用任务数、启用总权重、场景分布、难度分布、常见标签和代表任务卡。

3. 展示抽奖奖池

管理员可以看到 active 奖池总权重、分层权重、直接银子期望、active rewards、disabled rewards、每个奖励的概率和效果摘要。

4. 展示道具配置

管理员可以按分类查看道具的使用时机、效果摘要、堆叠规则、使用限制、管理员确认要求和当前奖池可用性。

5. 展示配置校验结果

面板把 GM-16 的内容 guardrail 变成可读结果，包括 active 总权重、分层权重、直接银子期望和 `validateGamificationContent()` 结构校验。

### GM-18 总结

GM-18 把游戏化配置从“只能读代码理解”推进到“管理员可观察”：运营时可以先看 GM-18 确认当前规则是什么，再看 GM-17 判断真实数据是否健康。它仍然保持只读边界，为后续 GM-19 的配置发布、概率公开或变更审计预留空间。
```

- [ ] **Step 3: Update related docs and update log**

In `## 相关文档`, add:

```md
- `docs/superpowers/specs/2026-05-02-gm-18-config-observatory-design.md`
- `docs/superpowers/plans/2026-05-02-gm-18-config-observatory.md`
```

At the top of `## 更新记录`, add:

```md
- 2026-05-02: GM-18 完成，新增只读管理员配置总览、游戏化内容快照服务、管理员读取 API、四维任务卡池 / 抽奖奖池 / 道具配置 / 内容校验面板和对应测试覆盖；未新增数据库模型，未提供配置编辑、保存、发布或回滚能力。
```

- [ ] **Step 4: Update acceptance checklist**

In `docs/gamification-acceptance-checklist.md`, change the opening goal from GM-17 to GM-18:

```md
> 目标：用一份固定测试数据，把 GM-01 到 GM-18 的主链路验收到“能闭环、能解释、能运营观察”的状态。
```

Under `## 3. 管理员流程验收`, add these checks after the GM-17 ops checks:

```md
- [ ] `/admin` 能看到“配置总览”。
- [ ] “配置总览”显示配置校验通过。
- [ ] 四维任务卡池能看到四个维度、启用任务数、启用权重和代表任务卡。
- [ ] 抽奖奖池能看到 active 总权重 100、分层权重、直接银子期望、active rewards 和 disabled rewards。
- [ ] 道具配置能看到分类、使用时机、效果摘要、使用限制和奖池可用性。
- [ ] 点击“刷新配置”后面板重新加载，不创建抽奖、兑换、动态或企业微信记录，也不修改任何用户资产。
```

In the interface-level test command, include the GM-18 API test:

```bash
npm test -- __tests__/gamification-config-observatory-api.test.ts __tests__/gamification-ops-dashboard-api.test.ts __tests__/gamification-redemption-api.test.ts __tests__/gamification-weekly-report-api.test.ts
```

Under `## 4. 文档总表更新`, add GM-18 checks:

```md
- [ ] `docs/gamification-dev-roadmap.md` 当前状态表包含 GM-18。
- [ ] 文档中有 `## GM-18: Config Observatory` 章节。
- [ ] 相关文档列表包含 GM-18 spec 和 plan。
- [ ] 更新记录包含 `2026-05-02: GM-18 完成`。
```

Under `## 5. 奖池 / 道具 / 兑换运营风险清单`, add:

```md
| 配置总览误当编辑后台 | 管理员以为能在页面直接改奖池或任务卡 | GM-18 只读；配置变更仍通过代码评审和发布流程 |
| 禁用奖励被误解为废弃 | disabled rewards 仍在配置总览出现 | 面板明确区分 active / disabled，历史抽奖快照仍可解释 |
```

Under `必过`, add:

```md
- GM-18 配置总览、API 权限和只读刷新通过。
```

Under `不建议上线`, add:

```md
- 配置总览刷新会修改用户资产、抽奖记录、兑换状态、团队动态或企业微信发送日志。
```

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/gamification-dev-roadmap.md docs/gamification-acceptance-checklist.md
git commit -m "docs: update gamification roadmap for gm18"
```

---

### Task 5: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused GM-18 tests**

Run:

```bash
npm test -- __tests__/gamification-config-observatory.test.ts __tests__/gamification-config-observatory-api.test.ts __tests__/gamification-config-observatory-panel.test.tsx
```

Expected: PASS with 3 test files and 7 tests.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS. The current baseline before GM-18 is 84 test files and 436 tests; the GM-18 implementation should add 3 test files and 7 tests, so the expected total is 87 test files and 443 tests unless another branch has added tests.

- [ ] **Step 3: Run type check**

Run:

```bash
npm run lint
```

Expected: PASS. This project uses `tsc --noEmit` for lint.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and the route list includes:

```text
/admin
/api/admin/gamification/config-observatory
```

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short --branch
git diff --stat HEAD~4..HEAD
```

Expected:

- Branch is `epic/gamification-p4`.
- There are no unstaged files.
- GM-18 changes are limited to service, API, panel, tests, roadmap, and acceptance docs.
- There are no Prisma schema changes.

- [ ] **Step 6: Report completion**

Final response should include:

- GM-18 commit hashes created during execution.
- Verification commands and pass/fail status.
- Reminder that GM-18 is read-only and does not edit configuration.
