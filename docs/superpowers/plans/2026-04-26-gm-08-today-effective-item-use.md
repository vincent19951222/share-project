# GM-08 Today-Effective Item Use Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /api/gamification/items/use` and first-class item-use lifecycle for fitness boosts, task reroll coupons, and leave protection coupons.

**Architecture:** Centralize item-use validation and transactions in `lib/gamification/item-use.ts`. Extend the backpack snapshot with reserved and available quantities, attach pending boosts to real fitness punches, and expose use actions inside `SupplyStation`. GM-08 records boost usage for GM-09 but does not apply coin or season multipliers.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, React 19.

---

## File Structure

- Modify: `lib/types.ts`
  - Add item use request/result types and backpack availability fields.
- Modify: `lib/economy.ts`
  - Export date helpers needed for leave protection and weekly limits.
- Create: `lib/gamification/item-use.ts`
  - Item use service, inventory reservation, supported-effect routing, lazy expiration, leave protection helpers.
- Modify: `lib/gamification/state.ts`
  - Include reserved quantities, use availability, and richer today effects.
- Modify: `app/api/board/punch/route.ts`
  - Bind pending fitness boost records to the new real `PunchRecord`; use leave protection for streak continuity.
- Create: `app/api/gamification/items/use/route.ts`
  - Authenticated item-use API.
- Modify: `lib/api.ts`
  - Add `useGamificationItem`.
- Modify: `components/gamification/SupplyStation.tsx`
  - Add use controls, dimension selector for task reroll, action messages, and disabled reasons.
- Create: `__tests__/gamification-item-use.test.ts`
  - Service tests for boost, reroll, leave protection, limits, and expiration.
- Create: `__tests__/gamification-item-use-api.test.ts`
  - API tests for `POST /api/gamification/items/use`.
- Modify: `__tests__/board-punch-api.test.ts`
  - Regression tests for pending boost binding and leave-protected streak continuity.
- Modify: `__tests__/gamification-backpack-state.test.ts`
  - Snapshot tests for reserved and available quantities.
- Modify: `__tests__/supply-station-shell.test.tsx`
  - UI tests for item-use buttons and messages.

## Implementation Rules

- Do not apply boost multipliers to `User.coins`, `PunchRecord.assetAwarded`, or `SeasonMemberStat.seasonIncome`.
- Do not mark fitness boost records `SETTLED` in GM-08.
- Do not decrement inventory for fitness boosts in GM-08.
- Do decrement inventory for `task_reroll` and `leave_protection` only after their GM-08 action succeeds.
- Do not create `PunchRecord` for leave protection.
- Do not grant lottery tickets from leave protection.
- Do not support `social_invitation`, `real_world_redemption`, `lottery_guarantee`, `ticket_discount`, `dimension_coin_bonus`, or `cosmetic` effects in this story.
- Do not introduce new dependencies for component tests.

---

### Task 1: Add Failing Item Use Service Tests

**Files:**
- Create: `__tests__/gamification-item-use.test.ts`

- [ ] **Step 1: Write service tests**

Create `__tests__/gamification-item-use.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  expirePastPendingItemUses,
  getNextPunchStreakWithLeaveProtection,
  ItemUseError,
  useInventoryItem,
} from "@/lib/gamification/item-use";
import { prisma } from "@/lib/prisma";

describe("gamification item use", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    dayKey = getShanghaiDayKey(fixedNow);

    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.dailyTaskAssignment.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
    await prisma.lotteryTicketLedger.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("uses a fitness boost as pending without consuming inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });

    const result = await useInventoryItem({ userId, itemId: "small_boost_coupon", now: fixedNow });

    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });
    const record = await prisma.itemUseRecord.findUniqueOrThrow({ where: { id: result.itemUse.id } });

    expect(result.itemUse).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
      targetType: null,
      targetId: null,
      inventoryConsumed: false,
    });
    expect(item.quantity).toBe(1);
    expect(record.effectSnapshotJson).toContain("fitness_coin_multiplier");
  });

  it("binds a boost to today's real punch when the user already punched", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });

    const result = await useInventoryItem({ userId, itemId: "small_boost_coupon", now: fixedNow });

    expect(result.itemUse).toMatchObject({
      status: "PENDING",
      targetType: "FITNESS_PUNCH",
      targetId: punch.id,
      inventoryConsumed: false,
    });
  });

  it("rejects a second fitness boost for the same day", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
        { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
      ],
    });

    await useInventoryItem({ userId, itemId: "small_boost_coupon", now: fixedNow });

    await expect(
      useInventoryItem({ userId, itemId: "coin_rich_coupon", now: fixedNow }),
    ).rejects.toThrow(ItemUseError);
  });

  it("enforces one strong boost per Shanghai week", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
        { userId, teamId, itemId: "season_sprint_coupon", quantity: 1 },
      ],
    });

    await useInventoryItem({ userId, itemId: "coin_rich_coupon", now: fixedNow });

    const nextDay = new Date("2026-04-27T09:00:00+08:00");

    await expect(
      useInventoryItem({ userId, itemId: "season_sprint_coupon", now: nextDay }),
    ).rejects.toThrow(ItemUseError);
  });

  it("expires old pending boosts without consuming inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        dayKey: "2026-04-25",
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });

    await expirePastPendingItemUses({ userId, todayDayKey: dayKey });

    const record = await prisma.itemUseRecord.findFirstOrThrow({
      where: { userId, itemId: "small_boost_coupon" },
    });
    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });

    expect(record.status).toBe("EXPIRED");
    expect(item.quantity).toBe(1);
  });

  it("uses task reroll coupon to replace an unfinished assignment and consumes inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 1 },
    });
    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey,
        dimensionKey: "movement",
        taskCardId: "movement_001",
      },
    });

    const result = await useInventoryItem({
      userId,
      itemId: "task_reroll_coupon",
      now: fixedNow,
      target: { dimensionKey: "movement" },
      rng: () => 0.99,
    });

    const assignment = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: { userId_dayKey_dimensionKey: { userId, dayKey, dimensionKey: "movement" } },
    });
    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "task_reroll_coupon" } },
    });

    expect(result.itemUse).toMatchObject({
      status: "SETTLED",
      targetType: "DAILY_TASK_ASSIGNMENT",
      targetId: assignment.id,
      inventoryConsumed: true,
    });
    expect(assignment.taskCardId).not.toBe("movement_001");
    expect(assignment.rerollCount).toBe(1);
    expect(item.quantity).toBe(0);
  });

  it("uses leave protection without creating punch, tickets, coins, or season progress", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "fitness_leave_coupon", quantity: 1 },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 25,
        dayKey: "2026-04-25",
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { currentStreak: 3, lastPunchDayKey: "2026-04-25", coins: 100, ticketBalance: 0 },
    });

    const result = await useInventoryItem({ userId, itemId: "fitness_leave_coupon", now: fixedNow });

    const todayPunch = await prisma.punchRecord.findUnique({
      where: { userId_dayKey: { userId, dayKey } },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ticketLedgerCount = await prisma.lotteryTicketLedger.count({ where: { userId } });

    expect(result.itemUse).toMatchObject({
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
      targetId: null,
      inventoryConsumed: true,
    });
    expect(todayPunch).toBeNull();
    expect(user.coins).toBe(100);
    expect(user.ticketBalance).toBe(0);
    expect(ticketLedgerCount).toBe(0);
  });

  it("rejects a second leave protection on the same day", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "fitness_leave_coupon", quantity: 2 },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 25,
        dayKey: "2026-04-25",
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });

    await useInventoryItem({ userId, itemId: "fitness_leave_coupon", now: fixedNow });

    await expect(
      useInventoryItem({ userId, itemId: "fitness_leave_coupon", now: fixedNow }),
    ).rejects.toThrow(ItemUseError);
  });

  it("computes next streak through one leave-protected day without increasing the skipped day", async () => {
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "fitness_leave_coupon",
        dayKey: "2026-04-26",
        status: "SETTLED",
        targetType: "LEAVE_PROTECTION",
        effectSnapshotJson: JSON.stringify({
          type: "leave_protection",
          protectsStreak: true,
          freezesNextFitnessRewardTier: true,
        }),
        settledAt: fixedNow,
      },
    });

    const nextStreak = await getNextPunchStreakWithLeaveProtection({
      userId,
      currentStreak: 3,
      lastPunchDayKey: "2026-04-25",
      todayDayKey: "2026-04-27",
    });

    expect(nextStreak).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-item-use.test.ts
```

Expected: FAIL because `lib/gamification/item-use.ts` does not exist.

---

### Task 2: Add Economy Date Helpers

**Files:**
- Modify: `lib/economy.ts`

- [ ] **Step 1: Export previous-day and week helpers**

Add these exports to `lib/economy.ts`:

```ts
export function getPreviousShanghaiDayKey(dayKey: string): string {
  return shiftShanghaiDayKey(dayKey, -1);
}

export function getNextShanghaiDayKey(dayKey: string): string {
  return shiftShanghaiDayKey(dayKey, 1);
}

export function getShanghaiWeekKey(dayKey: string): string {
  const date = parseShanghaiDayKey(dayKey);
  const localMidday = new Date(date.getTime() + 8 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
  const weekday = localMidday.getUTCDay() === 0 ? 7 : localMidday.getUTCDay();
  const monday = new Date(localMidday.getTime() - (weekday - 1) * 24 * 60 * 60 * 1000);

  return getShanghaiDayKey(new Date(monday.getTime() - 12 * 60 * 60 * 1000));
}
```

- [ ] **Step 2: Add a focused helper test to existing economy tests**

If `__tests__/economy.test.ts` exists, add:

```ts
it("builds Shanghai week keys from Monday", () => {
  expect(getShanghaiWeekKey("2026-04-27")).toBe("2026-04-27");
  expect(getShanghaiWeekKey("2026-05-03")).toBe("2026-04-27");
  expect(getPreviousShanghaiDayKey("2026-04-26")).toBe("2026-04-25");
});
```

If there is no economy test file, create `__tests__/economy.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { getPreviousShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";

describe("economy date helpers", () => {
  it("builds Shanghai week keys from Monday", () => {
    expect(getShanghaiWeekKey("2026-04-27")).toBe("2026-04-27");
    expect(getShanghaiWeekKey("2026-05-03")).toBe("2026-04-27");
    expect(getPreviousShanghaiDayKey("2026-04-26")).toBe("2026-04-25");
  });
});
```

- [ ] **Step 3: Run economy tests**

Run:

```bash
npm test -- __tests__/economy.test.ts
```

Expected: PASS.

---

### Task 3: Implement Item Use Service

**Files:**
- Create: `lib/gamification/item-use.ts`
- Test: `__tests__/gamification-item-use.test.ts`

- [ ] **Step 1: Add service types and helpers**

Create `lib/gamification/item-use.ts`:

```ts
import type { Prisma } from "@/lib/generated/prisma/client";
import { getItemDefinition, getTaskCards } from "@/content/gamification";
import type { ItemDefinition, ItemEffect, TaskDimensionKey } from "@/content/gamification/types";
import {
  getNextPunchStreak,
  getPreviousShanghaiDayKey,
  getShanghaiDayKey,
  getShanghaiWeekKey,
} from "@/lib/economy";
import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;

export class ItemUseError extends Error {
  constructor(
    message: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = "ItemUseError";
  }
}

export interface UseInventoryItemInput {
  userId: string;
  itemId: string;
  now?: Date;
  target?: {
    dimensionKey?: TaskDimensionKey;
  };
  rng?: () => number;
}

export interface UseInventoryItemResult {
  itemUse: {
    id: string;
    itemId: string;
    status: "PENDING" | "SETTLED";
    targetType: string | null;
    targetId: string | null;
    inventoryConsumed: boolean;
    message: string;
  };
}

function isFitnessBoostEffect(effect: ItemEffect) {
  return (
    effect.type === "fitness_coin_multiplier" ||
    effect.type === "fitness_season_multiplier" ||
    effect.type === "fitness_coin_and_season_multiplier"
  );
}

function isStrongBoostEffect(effect: ItemEffect) {
  return (
    effect.type === "fitness_season_multiplier" ||
    effect.type === "fitness_coin_and_season_multiplier" ||
    (effect.type === "fitness_coin_multiplier" && effect.multiplier === 2)
  );
}

function assertSupportedItem(definition: ItemDefinition | undefined): ItemDefinition {
  if (!definition || !definition.enabled) {
    throw new ItemUseError("道具不存在或已下架", 404);
  }

  const effectType = definition.effect.type;

  if (
    isFitnessBoostEffect(definition.effect) ||
    effectType === "task_reroll" ||
    effectType === "leave_protection"
  ) {
    return definition;
  }

  throw new ItemUseError("这个道具的使用入口还没开放");
}
```

- [ ] **Step 2: Add expiration and inventory helpers**

Append:

```ts
export async function expirePastPendingItemUses(input: {
  userId: string;
  todayDayKey: string;
  tx?: TransactionClient;
}) {
  const client = input.tx ?? prisma;

  await client.itemUseRecord.updateMany({
    where: {
      userId: input.userId,
      status: "PENDING",
      dayKey: { lt: input.todayDayKey },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

async function getAvailableInventory(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
  todayDayKey: string;
}) {
  const inventory = await input.tx.inventoryItem.findUnique({
    where: {
      userId_itemId: {
        userId: input.userId,
        itemId: input.itemId,
      },
    },
    select: {
      quantity: true,
    },
  });
  const pendingReservations = await input.tx.itemUseRecord.count({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      status: "PENDING",
      dayKey: { gte: input.todayDayKey },
    },
  });

  return {
    quantity: inventory?.quantity ?? 0,
    reservedQuantity: pendingReservations,
    availableQuantity: Math.max(0, (inventory?.quantity ?? 0) - pendingReservations),
  };
}

async function consumeInventory(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
}) {
  const update = await input.tx.inventoryItem.updateMany({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      quantity: { gt: 0 },
    },
    data: {
      quantity: {
        decrement: 1,
      },
    },
  });

  if (update.count !== 1) {
    throw new ItemUseError("库存不足");
  }
}
```

- [ ] **Step 3: Add boost limit validators**

Append:

```ts
async function assertConfiguredUseLimits(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  definition: ItemDefinition;
}) {
  if (input.definition.maxUsePerUserPerDay) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        userId: input.userId,
        itemId: input.definition.id,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerUserPerDay) {
      throw new ItemUseError(`这个道具每天最多使用 ${input.definition.maxUsePerUserPerDay} 次`);
    }
  }

  if (input.definition.maxUsePerUserPerWeek) {
    const weekKey = getShanghaiWeekKey(input.dayKey);
    const count = await input.tx.itemUseRecord.count({
      where: {
        userId: input.userId,
        itemId: input.definition.id,
        dayKey: { gte: weekKey },
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerUserPerWeek) {
      throw new ItemUseError(`这个道具每周最多使用 ${input.definition.maxUsePerUserPerWeek} 次`);
    }
  }

  if (input.definition.maxUsePerTeamPerDay) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        teamId: input.teamId,
        itemId: input.definition.id,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerTeamPerDay) {
      throw new ItemUseError(`这个道具每队每天最多使用 ${input.definition.maxUsePerTeamPerDay} 次`);
    }
  }
}

async function assertFitnessBoostLimits(input: {
  tx: TransactionClient;
  userId: string;
  dayKey: string;
  definition: ItemDefinition;
}) {
  const existingTodayBoosts = await input.tx.itemUseRecord.findMany({
    where: {
      userId: input.userId,
      dayKey: input.dayKey,
      status: { in: ["PENDING", "SETTLED"] },
    },
    select: {
      effectSnapshotJson: true,
    },
  });

  const hasTodayBoost = existingTodayBoosts.some((record) => {
    const effect = JSON.parse(record.effectSnapshotJson) as ItemEffect;
    return isFitnessBoostEffect(effect);
  });

  if (hasTodayBoost) {
    throw new ItemUseError("今天已经有一个暴击道具在生效或待结算");
  }

  if (!isStrongBoostEffect(input.definition.effect)) {
    return;
  }

  const weekKey = getShanghaiWeekKey(input.dayKey);
  const strongBoostsThisWeek = await input.tx.itemUseRecord.findMany({
    where: {
      userId: input.userId,
      status: { in: ["PENDING", "SETTLED"] },
      dayKey: { gte: weekKey },
    },
    select: {
      effectSnapshotJson: true,
    },
  });

  const hasStrongBoost = strongBoostsThisWeek.some((record) => {
    const effect = JSON.parse(record.effectSnapshotJson) as ItemEffect;
    return isStrongBoostEffect(effect);
  });

  if (hasStrongBoost) {
    throw new ItemUseError("强暴击每周最多使用一次");
  }
}
```

- [ ] **Step 4: Add task reroll action**

Append:

```ts
async function useTaskReroll(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  definition: ItemDefinition;
  dayKey: string;
  dimensionKey: TaskDimensionKey | undefined;
  rng: () => number;
}) {
  if (!input.dimensionKey) {
    throw new ItemUseError("任务换班券需要指定维度", 400);
  }

  const assignment = await input.tx.dailyTaskAssignment.findUnique({
    where: {
      userId_dayKey_dimensionKey: {
        userId: input.userId,
        dayKey: input.dayKey,
        dimensionKey: input.dimensionKey,
      },
    },
  });

  if (!assignment) {
    throw new ItemUseError("今天这个维度还没有任务");
  }
  if (assignment.completedAt) {
    throw new ItemUseError("已完成的任务不能换班");
  }

  const candidates = getTaskCards().filter(
    (card) =>
      card.enabled &&
      card.dimensionKey === input.dimensionKey &&
      card.id !== assignment.taskCardId,
  );

  if (candidates.length === 0) {
    throw new ItemUseError("这个维度暂时没有可替换任务");
  }

  const selected = candidates[Math.floor(input.rng() * candidates.length)] ?? candidates[0];

  await consumeInventory({ tx: input.tx, userId: input.userId, itemId: input.definition.id });

  const updated = await input.tx.dailyTaskAssignment.update({
    where: { id: assignment.id },
    data: {
      taskCardId: selected.id,
      rerollCount: { increment: 1 },
      rerolledFromTaskCardId: assignment.taskCardId,
    },
  });

  const itemUse = await input.tx.itemUseRecord.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.definition.id,
      dayKey: input.dayKey,
      status: "SETTLED",
      targetType: "DAILY_TASK_ASSIGNMENT",
      targetId: updated.id,
      effectSnapshotJson: JSON.stringify(input.definition.effect),
      settledAt: new Date(),
    },
  });

  return {
    id: itemUse.id,
    itemId: itemUse.itemId,
    status: "SETTLED" as const,
    targetType: itemUse.targetType,
    targetId: itemUse.targetId,
    inventoryConsumed: true,
    message: "任务已换班，今天换个姿势摸鱼。",
  };
}
```

- [ ] **Step 5: Add leave protection and boost actions**

Append:

```ts
async function useLeaveProtection(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  definition: ItemDefinition;
  dayKey: string;
}) {
  const todayPunch = await input.tx.punchRecord.findUnique({
    where: {
      userId_dayKey: {
        userId: input.userId,
        dayKey: input.dayKey,
      },
    },
  });

  if (todayPunch) {
    throw new ItemUseError("今天已经真实健身，不能再用请假券");
  }

  const yesterday = getPreviousShanghaiDayKey(input.dayKey);
  const yesterdayPunch = await input.tx.punchRecord.findUnique({
    where: {
      userId_dayKey: {
        userId: input.userId,
        dayKey: yesterday,
      },
    },
  });

  if (!yesterdayPunch) {
    throw new ItemUseError("请假券只能保护当前连续状态");
  }

  await consumeInventory({ tx: input.tx, userId: input.userId, itemId: input.definition.id });

  const itemUse = await input.tx.itemUseRecord.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.definition.id,
      dayKey: input.dayKey,
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
      effectSnapshotJson: JSON.stringify(input.definition.effect),
      settledAt: new Date(),
    },
  });

  return {
    id: itemUse.id,
    itemId: itemUse.itemId,
    status: "SETTLED" as const,
    targetType: itemUse.targetType,
    targetId: itemUse.targetId,
    inventoryConsumed: true,
    message: "今天请假成功，不算健身，不发收益，连续状态保住。",
  };
}

async function useFitnessBoost(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  definition: ItemDefinition;
  dayKey: string;
}) {
  await assertFitnessBoostLimits({
    tx: input.tx,
    userId: input.userId,
    dayKey: input.dayKey,
    definition: input.definition,
  });

  const availability = await getAvailableInventory({
    tx: input.tx,
    userId: input.userId,
    itemId: input.definition.id,
    todayDayKey: input.dayKey,
  });

  if (availability.availableQuantity < 1) {
    throw new ItemUseError("库存不足或已被今日效果预占");
  }

  const todayPunch = await input.tx.punchRecord.findUnique({
    where: {
      userId_dayKey: {
        userId: input.userId,
        dayKey: input.dayKey,
      },
    },
    select: { id: true, punchType: true },
  });

  const itemUse = await input.tx.itemUseRecord.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.definition.id,
      dayKey: input.dayKey,
      status: "PENDING",
      targetType: todayPunch?.punchType === "default" ? "FITNESS_PUNCH" : null,
      targetId: todayPunch?.punchType === "default" ? todayPunch.id : null,
      effectSnapshotJson: JSON.stringify(input.definition.effect),
    },
  });

  return {
    id: itemUse.id,
    itemId: itemUse.itemId,
    status: "PENDING" as const,
    targetType: itemUse.targetType,
    targetId: itemUse.targetId,
    inventoryConsumed: false,
    message: itemUse.targetId
      ? "暴击已绑定今日打卡，等待结算。"
      : "暴击已进入今日待生效，真实健身后结算。",
  };
}
```

- [ ] **Step 6: Add public service functions**

Append:

```ts
export async function useInventoryItem(input: UseInventoryItemInput): Promise<UseInventoryItemResult> {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const definition = assertSupportedItem(getItemDefinition(input.itemId));

  return prisma.$transaction(async (tx) => {
    await expirePastPendingItemUses({ userId: input.userId, todayDayKey: dayKey, tx });

    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      throw new ItemUseError("用户不存在", 401);
    }

    await assertConfiguredUseLimits({
      tx,
      userId: user.id,
      teamId: user.teamId,
      dayKey,
      definition,
    });

    if (definition.effect.type === "task_reroll") {
      return {
        itemUse: await useTaskReroll({
          tx,
          userId: user.id,
          teamId: user.teamId,
          definition,
          dayKey,
          dimensionKey: input.target?.dimensionKey,
          rng: input.rng ?? Math.random,
        }),
      };
    }

    if (definition.effect.type === "leave_protection") {
      return {
        itemUse: await useLeaveProtection({
          tx,
          userId: user.id,
          teamId: user.teamId,
          definition,
          dayKey,
        }),
      };
    }

    return {
      itemUse: await useFitnessBoost({
        tx,
        userId: user.id,
        teamId: user.teamId,
        definition,
        dayKey,
      }),
    };
  });
}

export async function attachPendingFitnessBoostsToPunch(input: {
  tx: TransactionClient;
  userId: string;
  dayKey: string;
  punchRecordId: string;
}) {
  await input.tx.itemUseRecord.updateMany({
    where: {
      userId: input.userId,
      dayKey: input.dayKey,
      status: "PENDING",
      targetType: null,
    },
    data: {
      targetType: "FITNESS_PUNCH",
      targetId: input.punchRecordId,
    },
  });
}

export async function getNextPunchStreakWithLeaveProtection(input: {
  userId: string;
  currentStreak: number;
  lastPunchDayKey: string | null;
  todayDayKey: string;
}) {
  const regularNextStreak = getNextPunchStreak(
    input.currentStreak,
    input.lastPunchDayKey,
    input.todayDayKey,
  );

  if (regularNextStreak > 1 || !input.lastPunchDayKey) {
    return regularNextStreak;
  }

  const yesterday = getPreviousShanghaiDayKey(input.todayDayKey);
  const dayBeforeYesterday = getPreviousShanghaiDayKey(yesterday);

  if (input.lastPunchDayKey !== dayBeforeYesterday) {
    return regularNextStreak;
  }

  const leaveProtection = await prisma.itemUseRecord.findFirst({
    where: {
      userId: input.userId,
      dayKey: yesterday,
      itemId: "fitness_leave_coupon",
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
    },
  });

  return leaveProtection ? input.currentStreak + 1 : regularNextStreak;
}
```

- [ ] **Step 7: Run item use tests**

Run:

```bash
npm test -- __tests__/gamification-item-use.test.ts
```

Expected: PASS.

---

### Task 4: Integrate Pending Boosts And Leave Protection With Punch

**Files:**
- Modify: `app/api/board/punch/route.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Update punch route imports**

In `app/api/board/punch/route.ts`, add:

```ts
import {
  attachPendingFitnessBoostsToPunch,
  getNextPunchStreakWithLeaveProtection,
} from "@/lib/gamification/item-use";
```

- [ ] **Step 2: Use leave-aware streak calculation**

Replace:

```ts
const nextStreak = getNextPunchStreak(
  user.currentStreak,
  user.lastPunchDayKey,
  todayDayKey,
);
```

with:

```ts
const nextStreak = await getNextPunchStreakWithLeaveProtection({
  userId: user.id,
  currentStreak: user.currentStreak,
  lastPunchDayKey: user.lastPunchDayKey,
  todayDayKey,
});
```

Replace reward preview calculation with:

```ts
const reward = getPunchRewardForStreak(nextStreak);
```

Add `getPunchRewardForStreak` to the existing economy imports.

- [ ] **Step 3: Capture created punch id**

Inside the transaction, replace the `tx.punchRecord.create` call with:

```ts
const punchRecord = await tx.punchRecord.create({
  data: {
    userId: user.id,
    seasonId: activeSeason?.id ?? null,
    dayIndex: today,
    dayKey: todayDayKey,
    punched: true,
    punchType: "default",
    streakAfterPunch: nextStreak,
    assetAwarded: reward,
    countedForSeasonSlot: countsForSeasonSlot,
  },
});

await attachPendingFitnessBoostsToPunch({
  tx,
  userId: user.id,
  dayKey: todayDayKey,
  punchRecordId: punchRecord.id,
});
```

- [ ] **Step 4: Add board punch regression tests**

In `__tests__/board-punch-api.test.ts`, add:

```ts
it("binds pending boost item use records to today's real punch", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
  const todayDayKey = getShanghaiDayKey(new Date());

  await prisma.itemUseRecord.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      itemId: "small_boost_coupon",
      dayKey: todayDayKey,
      status: "PENDING",
      effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
    },
  });

  const response = await POST(request("POST", user.id));
  expect(response.status).toBe(200);

  const punch = await prisma.punchRecord.findUniqueOrThrow({
    where: { userId_dayKey: { userId: user.id, dayKey: todayDayKey } },
  });
  const itemUse = await prisma.itemUseRecord.findFirstOrThrow({
    where: { userId: user.id, itemId: "small_boost_coupon" },
  });

  expect(itemUse).toMatchObject({
    status: "PENDING",
    targetType: "FITNESS_PUNCH",
    targetId: punch.id,
  });
});

it("uses leave protection as a one-day streak bridge without granting leave-day rewards", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
  const todayDayKey = getShanghaiDayKey(new Date());
  const yesterdayDayKey = getPreviousShanghaiDayKey(todayDayKey);
  const dayBeforeYesterdayKey = getPreviousShanghaiDayKey(yesterdayDayKey);

  await prisma.punchRecord.create({
    data: {
      userId: user.id,
      seasonId: null,
      dayIndex: 24,
      dayKey: dayBeforeYesterdayKey,
      punched: true,
      punchType: "default",
      streakAfterPunch: 3,
      assetAwarded: 30,
      countedForSeasonSlot: false,
    },
  });
  await prisma.itemUseRecord.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      itemId: "fitness_leave_coupon",
      dayKey: yesterdayDayKey,
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
      effectSnapshotJson: JSON.stringify({
        type: "leave_protection",
        protectsStreak: true,
        freezesNextFitnessRewardTier: true,
      }),
      settledAt: new Date(),
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      currentStreak: 3,
      lastPunchDayKey: dayBeforeYesterdayKey,
      coins: 100,
    },
  });

  const response = await POST(request("POST", user.id));
  expect(response.status).toBe(200);

  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const punch = await prisma.punchRecord.findUniqueOrThrow({
    where: { userId_dayKey: { userId: user.id, dayKey: todayDayKey } },
  });

  expect(punch.streakAfterPunch).toBe(4);
  expect(punch.assetAwarded).toBe(40);
  expect(after.coins).toBe(140);
});
```

Add imports if missing:

```ts
import { getPreviousShanghaiDayKey, getShanghaiDayKey } from "@/lib/economy";
```

- [ ] **Step 5: Run board punch tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

---

### Task 5: Extend Backpack Snapshot For Availability

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/gamification/state.ts`
- Modify: `__tests__/gamification-backpack-state.test.ts`

- [ ] **Step 1: Extend backpack item type**

In `lib/types.ts`, extend `GamificationBackpackItemSnapshot`:

```ts
reservedQuantity: number;
availableQuantity: number;
useEnabled: boolean;
useDisabledReason: string | null;
```

- [ ] **Step 2: Compute availability in state builder**

In `lib/gamification/state.ts`, add a helper:

```ts
function getItemUseAvailability(input: {
  itemId: string;
  quantity: number;
  reservedQuantity: number;
  knownDefinition: boolean;
  enabled: boolean;
  effectType: string | null;
}) {
  const availableQuantity = Math.max(0, input.quantity - input.reservedQuantity);

  if (!input.knownDefinition || !input.enabled) {
    return {
      availableQuantity,
      useEnabled: false,
      useDisabledReason: "道具配置不可用",
    };
  }

  if (
    input.effectType !== "fitness_coin_multiplier" &&
    input.effectType !== "fitness_season_multiplier" &&
    input.effectType !== "fitness_coin_and_season_multiplier" &&
    input.effectType !== "task_reroll" &&
    input.effectType !== "leave_protection"
  ) {
    return {
      availableQuantity,
      useEnabled: false,
      useDisabledReason: "这个道具的使用入口还没开放",
    };
  }

  if (availableQuantity < 1) {
    return {
      availableQuantity,
      useEnabled: false,
      useDisabledReason: "库存已被今日效果预占",
    };
  }

  return {
    availableQuantity,
    useEnabled: true,
    useDisabledReason: null,
  };
}
```

When building each item, count same-item `PENDING` records for today and add:

```ts
const reservedQuantity = todayPendingUses.filter((record) => record.itemId === input.itemId).length;
const availability = getItemUseAvailability({
  itemId: input.itemId,
  quantity: input.quantity,
  reservedQuantity,
  knownDefinition: Boolean(definition),
  enabled: definition?.enabled ?? false,
  effectType: definition?.effect.type ?? null,
});
```

Return:

```ts
reservedQuantity,
availableQuantity: availability.availableQuantity,
useEnabled: availability.useEnabled,
useDisabledReason: availability.useDisabledReason,
```

- [ ] **Step 3: Update backpack state tests**

In `__tests__/gamification-backpack-state.test.ts`, add:

```ts
it("shows reserved and available quantities for pending boost usage", async () => {
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
  });
  await prisma.itemUseRecord.create({
    data: {
      userId,
      teamId,
      itemId: "small_boost_coupon",
      dayKey,
      status: "PENDING",
      effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
    },
  });

  const snapshot = await buildGamificationStateForUser(userId);
  const boost = snapshot.backpack.groups
    .flatMap((group) => group.items)
    .find((item) => item.itemId === "small_boost_coupon");

  expect(boost).toMatchObject({
    quantity: 1,
    reservedQuantity: 1,
    availableQuantity: 0,
    useEnabled: false,
    useDisabledReason: "库存已被今日效果预占",
  });
});
```

- [ ] **Step 4: Run backpack state tests**

Run:

```bash
npm test -- __tests__/gamification-backpack-state.test.ts
```

Expected: PASS.

---

### Task 6: Add Item Use API Route

**Files:**
- Create: `app/api/gamification/items/use/route.ts`
- Create: `__tests__/gamification-item-use-api.test.ts`

- [ ] **Step 1: Create route**

Create `app/api/gamification/items/use/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { ItemUseError, useInventoryItem } from "@/lib/gamification/item-use";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as {
      itemId?: unknown;
      target?: { dimensionKey?: unknown };
    } | null;

    if (!payload || typeof payload.itemId !== "string" || payload.itemId.length === 0) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const dimensionKey =
      payload.target?.dimensionKey === "movement" ||
      payload.target?.dimensionKey === "hydration" ||
      payload.target?.dimensionKey === "social" ||
      payload.target?.dimensionKey === "learning"
        ? payload.target.dimensionKey
        : undefined;

    const result = await useInventoryItem({
      userId,
      itemId: payload.itemId,
      target: dimensionKey ? { dimensionKey } : undefined,
    });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "状态刷新失败" }, { status: 500 });
    }

    return NextResponse.json({
      snapshot,
      itemUse: result.itemUse,
    });
  } catch (error) {
    if (error instanceof ItemUseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add API tests**

Create `__tests__/gamification-item-use-api.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/items/use/route";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/items/use", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${userId}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/items/use", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { itemId: "small_boost_coupon" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(request(userId, { itemId: "" }));

    expect(response.status).toBe(400);
  });

  it("uses a boost and returns a refreshed snapshot", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });

    const response = await POST(request(userId, { itemId: "small_boost_coupon" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
      inventoryConsumed: false,
    });
    expect(body.snapshot.backpack.todayEffects[0]).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
    });
  });

  it("uses a task reroll coupon with a target dimension", async () => {
    const dayKey = getShanghaiDayKey(new Date());
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 1 },
    });
    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey,
        dimensionKey: "movement",
        taskCardId: "movement_001",
      },
    });

    const response = await POST(
      request(userId, {
        itemId: "task_reroll_coupon",
        target: { dimensionKey: "movement" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "task_reroll_coupon",
      status: "SETTLED",
      targetType: "DAILY_TASK_ASSIGNMENT",
      inventoryConsumed: true,
    });
  });

  it("rejects unsupported item effects", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });

    const response = await POST(request(userId, { itemId: "luckin_coffee_coupon" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("还没开放");
  });
});
```

- [ ] **Step 3: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-item-use-api.test.ts
```

Expected: PASS.

---

### Task 7: Add Client API Helper And Supply Station Controls

**Files:**
- Modify: `lib/api.ts`
- Modify: `components/gamification/SupplyStation.tsx`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Add client API helper**

In `lib/api.ts`, add:

```ts
export interface UseGamificationItemRequest {
  itemId: string;
  target?: {
    dimensionKey?: "movement" | "hydration" | "social" | "learning";
  };
}

export async function useGamificationItem(payload: UseGamificationItemRequest) {
  return apiRequest<{
    snapshot: GamificationStateSnapshot;
    itemUse: {
      id: string;
      itemId: string;
      status: "PENDING" | "SETTLED";
      targetType: string | null;
      targetId: string | null;
      inventoryConsumed: boolean;
      message: string;
    };
  }>("/api/gamification/items/use", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
```

Import `GamificationStateSnapshot` from `@/lib/types` if needed.

- [ ] **Step 2: Add SupplyStation local state**

In `components/gamification/SupplyStation.tsx`, import:

```ts
import { useGamificationItem } from "@/lib/api";
```

Add state:

```tsx
const [selectedRerollDimension, setSelectedRerollDimension] = useState("movement");
const [itemUseMessage, setItemUseMessage] = useState<string | null>(null);
```

Add action:

```tsx
async function runItemUse(itemId: string) {
  setActiveAction(`item:${itemId}`);
  setError(null);
  setItemUseMessage(null);

  try {
    const result = await useGamificationItem({
      itemId,
      target:
        itemId === "task_reroll_coupon"
          ? { dimensionKey: selectedRerollDimension as "movement" | "hydration" | "social" | "learning" }
          : undefined,
    });

    setSnapshot(result.snapshot);
    setItemUseMessage(result.itemUse.message);
  } catch (caught) {
    setError(getSupplyErrorMessage(caught));
  } finally {
    setActiveAction(null);
  }
}
```

- [ ] **Step 3: Add item-use controls to detail panel**

Extend `BackpackItemDetail` props:

```tsx
function BackpackItemDetail({
  item,
  activeAction,
  selectedRerollDimension,
  onRerollDimensionChange,
  onUse,
}: {
  item: GamificationBackpackItemSnapshot | null;
  activeAction: string | null;
  selectedRerollDimension: string;
  onRerollDimensionChange: (dimensionKey: string) => void;
  onUse: (itemId: string) => void;
}) {
```

Replace the GM-08 message-only block with:

```tsx
{item.itemId === "task_reroll_coupon" ? (
  <label className="mt-3 block text-xs font-black text-slate-600">
    选择要换班的维度
    <select
      value={selectedRerollDimension}
      onChange={(event) => onRerollDimensionChange(event.target.value)}
      className="mt-1 w-full rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black text-slate-900"
    >
      <option value="movement">把电充绿</option>
      <option value="hydration">喝白白</option>
      <option value="social">把事办黄</option>
      <option value="learning">把股看红</option>
    </select>
  </label>
) : null}
<button
  type="button"
  disabled={activeAction !== null || !item.useEnabled}
  onClick={() => onUse(item.itemId)}
  className="mt-3 w-full rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
>
  {item.itemId === "fitness_leave_coupon" ? "今天请假，不断联" : "今日使用"}
</button>
{item.useDisabledReason ? (
  <div className="mt-2 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
    {item.useDisabledReason}
  </div>
) : null}
{item.reservedQuantity > 0 ? (
  <div className="mt-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
    今日已预占 {item.reservedQuantity} 张，可用 {item.availableQuantity} 张。
  </div>
) : null}
```

When rendering detail, pass:

```tsx
<BackpackItemDetail
  item={selectedBackpackItem}
  activeAction={activeAction}
  selectedRerollDimension={selectedRerollDimension}
  onRerollDimensionChange={setSelectedRerollDimension}
  onUse={(itemId) => {
    void runItemUse(itemId);
  }}
/>
```

Render `itemUseMessage` near the backpack header:

```tsx
{itemUseMessage ? (
  <div className="mt-3 rounded-[1rem] border-2 border-lime-300 bg-lime-50 px-3 py-2 text-sm font-black text-lime-800">
    {itemUseMessage}
  </div>
) : null}
```

- [ ] **Step 4: Update component tests**

In `__tests__/supply-station-shell.test.tsx`, update backpack item fixtures with:

```ts
reservedQuantity: 0,
availableQuantity: 1,
useEnabled: true,
useDisabledReason: null,
```

For `luckin_coffee_coupon`, use:

```ts
reservedQuantity: 0,
availableQuantity: 2,
useEnabled: false,
useDisabledReason: "这个道具的使用入口还没开放",
```

Add a test:

```ts
it("uses an enabled backpack item and refreshes the snapshot", async () => {
  const updatedSnapshot = buildSnapshot();
  updatedSnapshot.backpack.todayEffects = [
    {
      id: "use_2",
      itemId: "small_boost_coupon",
      name: "小暴击券",
      status: "PENDING",
      statusLabel: "今日待生效",
      effectSummary: "当日真实健身打卡个人资产 1.5x。",
      createdAt: "2026-04-26T01:00:00.000Z",
      settledAt: null,
    },
  ];

  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ snapshot: buildSnapshot() }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          snapshot: updatedSnapshot,
          itemUse: {
            id: "use_2",
            itemId: "small_boost_coupon",
            status: "PENDING",
            targetType: null,
            targetId: null,
            inventoryConsumed: false,
            message: "暴击已进入今日待生效，真实健身后结算。",
          },
        }),
      }),
  );

  const { SupplyStation } = await import("@/components/gamification/SupplyStation");

  await act(async () => {
    root.render(<SupplyStation />);
  });
  await flush();

  const useButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("今日使用"),
  );

  expect(useButton).not.toBeUndefined();

  await act(async () => {
    useButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();

  expect(fetch).toHaveBeenCalledWith(
    "/api/gamification/items/use",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ itemId: "small_boost_coupon" }),
    }),
  );
  expect(container.textContent).toContain("暴击已进入今日待生效");
});
```

- [ ] **Step 5: Run component tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

---

### Task 8: Verification

**Files:**
- Modified files from Tasks 1-7.

- [ ] **Step 1: Run item use service tests**

Run:

```bash
npm test -- __tests__/gamification-item-use.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run item use API tests**

Run:

```bash
npm test -- __tests__/gamification-item-use-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run punch regression tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run backpack state tests**

Run:

```bash
npm test -- __tests__/gamification-backpack-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run supply station component tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit GM-08**

```bash
git add lib/types.ts lib/economy.ts lib/gamification/item-use.ts lib/gamification/state.ts app/api/board/punch/route.ts app/api/gamification/items/use/route.ts lib/api.ts components/gamification/SupplyStation.tsx __tests__/gamification-item-use.test.ts __tests__/gamification-item-use-api.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-backpack-state.test.ts __tests__/supply-station-shell.test.tsx __tests__/economy.test.ts
git commit -m "feat: add gamification item use"
```

## Self-Review Checklist

- `POST /api/gamification/items/use` exists and returns snapshot plus item use result.
- Fitness boosts create `PENDING` records and do not consume inventory.
- Fitness boosts bind to same-day real punch when available.
- Punch route attaches pre-used pending boosts to the new real punch.
- One user cannot stack small and strong boosts on the same day.
- Strong boost is limited to once per Shanghai week.
- Old pending boosts expire without consuming inventory.
- Task reroll coupon updates a same-dimension task and consumes inventory.
- Leave protection consumes inventory, creates no punch, grants no ticket, grants no coins, and adds no season progress.
- Backpack UI shows available quantity, reserved quantity, use button, disabled reason, success message, and today's effects.
- GM-08 does not implement real-world redemption, weak social invitation, Enterprise WeChat, or boost economy settlement.
