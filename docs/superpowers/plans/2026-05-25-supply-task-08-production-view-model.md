# Supply Task 08 Production Supply View-Model Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production supply station view-model foundation that maps real gamification state, user profile data, shop catalog, and fixed backpack capacity into one UI-ready snapshot.

**Architecture:** Keep existing mutation and state services unchanged. Add a typed `SupplyStationProductionSnapshot` in `lib/types.ts`, then implement `buildSupplyStationViewModelForUser()` as a thin mapper over `buildGamificationStateForUser()`, direct user identity/resource lookup, and production shop catalog definitions.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-08-production-view-model-design.md`

This task does not create `/api/gamification/supply/state`, does not modify `lib/api.ts`, and does not replace production UI panels.

## File Structure

- Modify: `lib/types.ts`
  - Adds `SupplyResourceSnapshot`, `SupplyShopProductSnapshot`, `SupplyTaskRecordSnapshot`, and `SupplyStationProductionSnapshot`.
- Create: `lib/gamification/supply-view-model.ts`
  - Exports `SUPPLY_BACKPACK_CAPACITY`.
  - Exports `buildSupplyStationViewModelForUser(userId, now?)`.
  - Maps real `GamificationStateSnapshot` into production supply snapshot.
- Create: `__tests__/supply-production-view-model.test.ts`
  - Covers real state mapping, shop product mapping, date placeholder generation, and unknown user handling.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-08-production-view-model-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-08-production-view-model.md`

## Task 1: Failing View-Model Tests

**Files:**
- Create: `__tests__/supply-production-view-model.test.ts`

- [ ] **Step 1: Create the failing view-model test**

Create `__tests__/supply-production-view-model.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import { ensureTodayTaskAssignments } from "@/lib/gamification/tasks";
import { prisma } from "@/lib/prisma";

describe("supply production view model", () => {
  const fixedNow = new Date("2026-05-25T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let username: string;
  let avatarKey: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    username = user.username;
    avatarKey = user.avatarKey;

    await ensureTodayTaskAssignments({ userId, now: fixedNow, rng: () => 0.01 });
    await prisma.user.update({
      where: { id: userId },
      data: { coins: 2450, ticketBalance: 18, exp: 2720 },
    });
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 2 },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("maps real state into the production supply snapshot", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId, fixedNow);

    expect(snapshot).toMatchObject({
      currentUserId: userId,
      currentUserRole: "MEMBER",
      teamId,
      dayKey: "2026-05-25",
      resources: {
        coins: { label: "银子", value: 2450 },
        ticket: { label: "抽奖券", value: 18 },
        backpack: { label: "背包", value: 2, maxValue: 60 },
      },
      profile: {
        username,
        avatarKey,
        level: 3,
        totalExp: 2720,
        currentLevelExp: 720,
        nextLevelExp: 1000,
        title: "自律牛马",
      },
    });
    expect(snapshot?.dashboard.dailyQuests).toHaveLength(4);
    expect(snapshot?.dashboard.todayEffects).toEqual([]);
    expect(snapshot?.drawPool.wallet.ticketBalance).toBe(18);
    expect(snapshot?.drawPool.lottery.status).toBe("active");
    expect(snapshot?.backpack.capacity).toEqual({ usedSlots: 2, totalSlots: 60 });
    expect(snapshot?.backpack.previewItems[0]).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 2,
    });
    expect(snapshot?.shop.products[0]).toMatchObject({
      itemId: "task_reroll_coupon",
      name: "任务换班券",
      priceCoins: 150,
      ownedQuantity: 2,
      dailyLimit: 1,
      purchaseEnabled: true,
      purchaseDisabledReason: null,
      requiresAdminConfirmation: false,
    });
    expect(snapshot?.taskRecord.dates).toHaveLength(7);
    expect(snapshot?.taskRecord.dates[0]).toMatchObject({
      key: "2026-05-25",
      label: "今天",
      dateLabel: "05/25",
      weekday: "周一",
    });
    expect(snapshot?.taskRecord.timeline).toEqual([]);
  });

  it("returns null for an unknown user", async () => {
    await expect(buildSupplyStationViewModelForUser("missing-user", fixedNow)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-view-model.test.ts
```

Expected: FAIL because `lib/gamification/supply-view-model.ts` does not exist.

## Task 2: Production Supply Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add production supply snapshot types**

In `lib/types.ts`, after `GamificationStateSnapshot`, add:

```typescript
export interface SupplyResourceSnapshot {
  label: "银子" | "抽奖券" | "背包";
  value: number;
  maxValue?: number;
}

export interface SupplyShopProductSnapshot {
  itemId: string;
  name: string;
  description: string;
  category: GamificationBackpackCategory;
  priceCoins: number;
  ownedQuantity: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  purchaseEnabled: boolean;
  purchaseDisabledReason: string | null;
  requiresAdminConfirmation: boolean;
}

export interface SupplyTaskRecordSnapshot {
  dates: Array<{
    key: string;
    label: string;
    dateLabel: string;
    weekday: string;
  }>;
  timeline: Array<{
    id: string;
    dayKey: string;
    occurredAt: string;
    title: string;
    subtitle: string;
    category: "task" | "draw" | "ticket" | "exp" | "shop" | "item" | "redemption" | "social";
    statusLabel: string;
  }>;
}

export interface SupplyStationProductionSnapshot {
  currentUserId: string;
  currentUserRole: string;
  teamId: string;
  dayKey: string;
  resources: {
    coins: SupplyResourceSnapshot;
    ticket: SupplyResourceSnapshot;
    backpack: SupplyResourceSnapshot;
  };
  profile: GamificationProfileSnapshot & {
    username: string;
    avatarKey: string;
  };
  dashboard: {
    dailyQuests: GamificationDimensionSnapshot[];
    todayEffects: GamificationTodayEffectSnapshot[];
  };
  drawPool: {
    wallet: GamificationTicketSummary & { ticketBalance: number };
    lottery: GamificationLotterySummary;
  };
  backpack: GamificationBackpackSummary & {
    capacity: { usedSlots: number; totalSlots: 60 };
  };
  shop: {
    products: SupplyShopProductSnapshot[];
  };
  taskRecord: SupplyTaskRecordSnapshot;
  social: GamificationSocialSummary;
  redemptions: GamificationRedemptionSectionSnapshot;
}
```

## Task 3: Production View-Model Mapper

**Files:**
- Create: `lib/gamification/supply-view-model.ts`

- [ ] **Step 1: Implement the mapper**

Create `lib/gamification/supply-view-model.ts`:

```typescript
import { getShopCatalogItems } from "@/content/gamification/shop-catalog";
import { getShanghaiDayKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { prisma } from "@/lib/prisma";
import type {
  GamificationBackpackCategory,
  SupplyShopProductSnapshot,
  SupplyStationProductionSnapshot,
  SupplyTaskRecordSnapshot,
} from "@/lib/types";

export const SUPPLY_BACKPACK_CAPACITY = 60;

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
const DAY_MS = 86_400_000;

function formatDateLabel(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function buildTaskRecordPlaceholder(now: Date): SupplyTaskRecordSnapshot {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - index * DAY_MS);
    const key = getShanghaiDayKey(date);

    return {
      key,
      label: index === 0 ? "今天" : index === 1 ? "昨天" : `${index} 天前`,
      dateLabel: formatDateLabel(date),
      weekday: WEEKDAY_LABELS[date.getDay()],
    };
  });

  return { dates, timeline: [] };
}

function buildShopProducts(input: {
  ownedQuantityByItemId: Map<string, number>;
}): SupplyShopProductSnapshot[] {
  return getShopCatalogItems().map((catalogItem) => {
    const definition = getItemDefinition(catalogItem.itemId);
    const purchaseEnabled = Boolean(definition?.enabled);

    return {
      itemId: catalogItem.itemId,
      name: definition?.name ?? "未知补给",
      description: definition?.description ?? "这个商品配置已经不存在，请联系管理员确认。",
      category: (definition?.category ?? "unknown") as GamificationBackpackCategory,
      priceCoins: catalogItem.priceCoins,
      ownedQuantity: input.ownedQuantityByItemId.get(catalogItem.itemId) ?? 0,
      dailyLimit: catalogItem.dailyLimit,
      weeklyLimit: catalogItem.weeklyLimit,
      purchaseEnabled,
      purchaseDisabledReason: purchaseEnabled ? null : "商品配置不可用",
      requiresAdminConfirmation: definition?.requiresAdminConfirmation ?? false,
    };
  });
}

export async function buildSupplyStationViewModelForUser(
  userId: string,
  now: Date = new Date(),
): Promise<SupplyStationProductionSnapshot | null> {
  const snapshot = await buildGamificationStateForUser(userId, now);

  if (!snapshot) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatarKey: true,
      coins: true,
      ticketBalance: true,
      inventoryItems: {
        select: {
          itemId: true,
          quantity: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const ownedQuantityByItemId = new Map(
    user.inventoryItems.map((item) => [item.itemId, item.quantity]),
  );
  const backpackUsedSlots = snapshot.backpack.totalQuantity;

  return {
    currentUserId: snapshot.currentUserId,
    currentUserRole: snapshot.currentUserRole,
    teamId: snapshot.teamId,
    dayKey: snapshot.dayKey,
    resources: {
      coins: { label: "银子", value: user.coins },
      ticket: { label: "抽奖券", value: user.ticketBalance },
      backpack: {
        label: "背包",
        value: backpackUsedSlots,
        maxValue: SUPPLY_BACKPACK_CAPACITY,
      },
    },
    profile: {
      ...snapshot.profile,
      username: user.username,
      avatarKey: user.avatarKey,
    },
    dashboard: {
      dailyQuests: snapshot.dimensions,
      todayEffects: snapshot.backpack.todayEffects,
    },
    drawPool: {
      wallet: {
        ...snapshot.ticketSummary,
        ticketBalance: snapshot.ticketBalance,
      },
      lottery: snapshot.lottery,
    },
    backpack: {
      ...snapshot.backpack,
      capacity: {
        usedSlots: backpackUsedSlots,
        totalSlots: SUPPLY_BACKPACK_CAPACITY,
      },
    },
    shop: {
      products: buildShopProducts({ ownedQuantityByItemId }),
    },
    taskRecord: buildTaskRecordPlaceholder(now),
    social: snapshot.social,
    redemptions: snapshot.redemptions,
  };
}
```

## Task 4: Verification And Commit

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/gamification/supply-view-model.ts`
- Create: `__tests__/supply-production-view-model.test.ts`
- Add: `docs/superpowers/specs/2026-05-25-supply-task-08-production-view-model-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-08-production-view-model.md`

- [ ] **Step 1: Run the focused view-model test**

Run:

```bash
npm test -- __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run related supply service tests**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts __tests__/gamification-shop.test.ts __tests__/gamification-experience.test.ts __tests__/gamification-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/gamification/supply-view-model.ts __tests__/supply-production-view-model.test.ts docs/superpowers/specs/2026-05-25-supply-task-08-production-view-model-design.md docs/superpowers/plans/2026-05-25-supply-task-08-production-view-model.md
git commit -m "feat: add supply production view model"
```
