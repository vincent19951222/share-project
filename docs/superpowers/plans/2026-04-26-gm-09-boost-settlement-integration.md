# GM-09 Boost Settlement Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply settled boost effects to real fitness punch rewards, including personal coins, season income, inventory consumption, undo rollback, and user-facing copy.

**Architecture:** Add explicit punch settlement fields so personal coin awards and season income can diverge safely. Put boost calculation and idempotent settlement in `lib/gamification/boost-settlement.ts`, call it from both the punch route and the GM-08 item-use flow, and keep season slot progress capped to one slot per real punch.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add boost settlement fields to `PunchRecord`.
- Create: `lib/gamification/boost-settlement.ts`
  - Pure boost calculation plus idempotent settlement helpers.
- Modify: `lib/gamification/item-use.ts`
  - When a boost is used after an existing punch, immediately run boost settlement.
- Modify: `app/api/board/punch/route.ts`
  - Use boost settlement during punch creation and correct rollback fields during undo.
- Modify: `lib/activity-events.ts`
  - Add boost-aware punch and undo copy.
- Modify: `lib/types.ts`
  - Add optional boost summary fields to activity events or current user feedback if needed by UI.
- Modify: `components/punch-board/ActivityStream.tsx`
  - Ensure boost copy renders without stripping the new message.
- Modify: `__tests__/gamification-boost-settlement.test.ts`
  - New service tests.
- Modify: `__tests__/board-punch-api.test.ts`
  - Punch and undo integration tests.
- Modify: `__tests__/gamification-item-use.test.ts`
  - After-punch boost use settlement tests.
- Modify: `__tests__/gamification-item-use-api.test.ts`
  - API confirms immediate补结算 after punch.
- Modify: `__tests__/activity-events-api.test.ts`
  - Boost copy regression.

## Implementation Rules

- `PunchRecord.assetAwarded` remains the actual personal coin amount awarded.
- `PunchRecord.seasonContributionAwarded` is the actual season income amount awarded.
- `Season.filledSlots` and `SeasonMemberStat.slotContribution` still increment by at most `1` per real punch.
- `ItemUseRecord.SETTLED` boost consumes inventory and is not refunded on punch undo.
- Re-running settlement for the same punch and same item use must not add coins, season income, or inventory consumption again.
- Do not implement new item types.
- Do not send Enterprise WeChat messages.

---

### Task 1: Add Failing Boost Settlement Service Tests

**Files:**
- Create: `__tests__/gamification-boost-settlement.test.ts`

- [ ] **Step 1: Write boost settlement tests**

Create `__tests__/gamification-boost-settlement.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  calculateBoostSettlement,
  settleBoostForPunch,
} from "@/lib/gamification/boost-settlement";
import { prisma } from "@/lib/prisma";

describe("gamification boost settlement", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;

    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("keeps base rewards unchanged without a boost", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: null,
    });

    expect(settlement).toMatchObject({
      assetAwarded: 40,
      boostAssetBonus: 0,
      seasonContributionAwarded: 40,
      boostSeasonBonus: 0,
      boostLabel: null,
    });
  });

  it("settles small boost for personal coins only", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: { type: "fitness_coin_multiplier", multiplier: 1.5 },
    });

    expect(settlement.assetAwarded).toBe(60);
    expect(settlement.boostAssetBonus).toBe(20);
    expect(settlement.seasonContributionAwarded).toBe(40);
    expect(settlement.boostSeasonBonus).toBe(0);
  });

  it("settles season sprint for season income only", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: { type: "fitness_season_multiplier", multiplier: 2 },
    });

    expect(settlement.assetAwarded).toBe(40);
    expect(settlement.boostAssetBonus).toBe(0);
    expect(settlement.seasonContributionAwarded).toBe(80);
    expect(settlement.boostSeasonBonus).toBe(40);
  });

  it("settles double niuma for coins and season income", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: { type: "fitness_coin_and_season_multiplier", multiplier: 2 },
    });

    expect(settlement.assetAwarded).toBe(80);
    expect(settlement.boostAssetBonus).toBe(40);
    expect(settlement.seasonContributionAwarded).toBe(80);
    expect(settlement.boostSeasonBonus).toBe(40);
  });

  it("settles a pending boost once and consumes exactly one inventory item", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    const itemUse = await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        dayKey: "2026-04-26",
        status: "PENDING",
        targetType: "FITNESS_PUNCH",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey: "2026-04-26",
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        seasonContributionAwarded: 0,
        countedForSeasonSlot: false,
      },
    });

    const first = await prisma.$transaction((tx) =>
      settleBoostForPunch({
        tx,
        userId,
        teamId,
        dayKey: "2026-04-26",
        punchRecordId: punch.id,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        applyBonusDeltas: false,
      }),
    );
    const second = await prisma.$transaction((tx) =>
      settleBoostForPunch({
        tx,
        userId,
        teamId,
        dayKey: "2026-04-26",
        punchRecordId: punch.id,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        applyBonusDeltas: false,
      }),
    );

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });
    const updatedUse = await prisma.itemUseRecord.findUniqueOrThrow({ where: { id: itemUse.id } });

    expect(first.assetAwarded).toBe(60);
    expect(second.assetAwarded).toBe(60);
    expect(inventory.quantity).toBe(0);
    expect(updatedUse.status).toBe("SETTLED");
    expect(updatedUse.targetId).toBe(punch.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-boost-settlement.test.ts
```

Expected: FAIL because `lib/gamification/boost-settlement.ts` and new punch fields do not exist.

---

### Task 2: Extend PunchRecord Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add settlement fields to `PunchRecord`**

In `prisma/schema.prisma`, update `model PunchRecord`:

```prisma
model PunchRecord {
  id                         String   @id @default(cuid())
  userId                     String
  user                       User     @relation(fields: [userId], references: [id])
  seasonId                   String?
  season                     Season?  @relation(fields: [seasonId], references: [id])
  dayIndex                   Int
  dayKey                     String
  punched                    Boolean
  punchType                  String?
  streakAfterPunch           Int      @default(0)
  assetAwarded               Int      @default(0)
  baseAssetAwarded           Int      @default(0)
  boostAssetBonus            Int      @default(0)
  baseSeasonContribution     Int      @default(0)
  boostSeasonBonus           Int      @default(0)
  seasonContributionAwarded  Int      @default(0)
  boostItemUseRecordId       String?
  boostSummaryJson           String?
  countedForSeasonSlot       Boolean  @default(false)
  createdAt                  DateTime @default(now())

  @@unique([userId, dayKey])
  @@index([boostItemUseRecordId])
}
```

- [ ] **Step 2: Push schema and regenerate Prisma client**

Run:

```bash
npx prisma db push
```

Expected: Prisma schema pushes successfully and client regenerates.

- [ ] **Step 3: Update seed data**

In `lib/db-seed.ts` and any seed test fixtures that create `PunchRecord`, include these fields where useful:

```ts
baseAssetAwarded: 0,
boostAssetBonus: 0,
baseSeasonContribution: 0,
boostSeasonBonus: 0,
seasonContributionAwarded: 0,
```

Expected: seed remains valid even if omitted because schema defaults exist.

---

### Task 3: Implement Boost Settlement Service

**Files:**
- Create: `lib/gamification/boost-settlement.ts`
- Test: `__tests__/gamification-boost-settlement.test.ts`

- [ ] **Step 1: Create calculation helper**

Create `lib/gamification/boost-settlement.ts`:

```ts
import type { Prisma } from "@/lib/generated/prisma/client";
import { getItemDefinition } from "@/content/gamification";
import type { ItemEffect } from "@/content/gamification/types";

type TransactionClient = Prisma.TransactionClient;

type FitnessBoostEffect =
  | { type: "fitness_coin_multiplier"; multiplier: 1.5 | 2 }
  | { type: "fitness_season_multiplier"; multiplier: 2 }
  | { type: "fitness_coin_and_season_multiplier"; multiplier: 2 };

export interface BoostSettlementInput {
  baseAssetAwarded: number;
  baseSeasonContribution: number;
  effect: FitnessBoostEffect | null;
}

export interface BoostSettlementResult {
  assetAwarded: number;
  baseAssetAwarded: number;
  boostAssetBonus: number;
  seasonContributionAwarded: number;
  baseSeasonContribution: number;
  boostSeasonBonus: number;
  boostLabel: string | null;
  boostSummary: string | null;
}

function isFitnessBoostEffect(effect: ItemEffect | unknown): effect is FitnessBoostEffect {
  if (!effect || typeof effect !== "object" || !("type" in effect)) {
    return false;
  }

  return (
    effect.type === "fitness_coin_multiplier" ||
    effect.type === "fitness_season_multiplier" ||
    effect.type === "fitness_coin_and_season_multiplier"
  );
}

function parseEffect(raw: string): FitnessBoostEffect | null {
  try {
    const effect = JSON.parse(raw) as ItemEffect;
    return isFitnessBoostEffect(effect) ? effect : null;
  } catch {
    return null;
  }
}

function getBoostLabel(effect: FitnessBoostEffect | null) {
  if (!effect) {
    return null;
  }
  if (effect.type === "fitness_coin_multiplier" && effect.multiplier === 1.5) {
    return "小暴击券";
  }
  if (effect.type === "fitness_coin_multiplier" && effect.multiplier === 2) {
    return "银子暴富券";
  }
  if (effect.type === "fitness_season_multiplier") {
    return "赛季冲刺券";
  }

  return "双倍牛马券";
}

export function calculateBoostSettlement(input: BoostSettlementInput): BoostSettlementResult {
  let assetMultiplier = 1;
  let seasonMultiplier = 1;

  if (input.effect?.type === "fitness_coin_multiplier") {
    assetMultiplier = input.effect.multiplier;
  }
  if (input.effect?.type === "fitness_season_multiplier") {
    seasonMultiplier = input.effect.multiplier;
  }
  if (input.effect?.type === "fitness_coin_and_season_multiplier") {
    assetMultiplier = input.effect.multiplier;
    seasonMultiplier = input.effect.multiplier;
  }

  const assetAwarded = Math.round(input.baseAssetAwarded * assetMultiplier);
  const seasonContributionAwarded = Math.round(input.baseSeasonContribution * seasonMultiplier);
  const boostLabel = getBoostLabel(input.effect);

  return {
    assetAwarded,
    baseAssetAwarded: input.baseAssetAwarded,
    boostAssetBonus: assetAwarded - input.baseAssetAwarded,
    seasonContributionAwarded,
    baseSeasonContribution: input.baseSeasonContribution,
    boostSeasonBonus: seasonContributionAwarded - input.baseSeasonContribution,
    boostLabel,
    boostSummary: boostLabel
      ? `${boostLabel}生效：个人银子 +${assetAwarded - input.baseAssetAwarded}，赛季收入 +${seasonContributionAwarded - input.baseSeasonContribution}`
      : null,
  };
}
```

- [ ] **Step 2: Add settlement helper**

Append:

```ts
async function consumeBoostInventory(input: {
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
      quantity: { decrement: 1 },
    },
  });

  if (update.count !== 1) {
    throw new Error("Boost inventory is not available for settlement");
  }
}

export async function settleBoostForPunch(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  punchRecordId: string;
  baseAssetAwarded: number;
  baseSeasonContribution: number;
  applyBonusDeltas: boolean;
}): Promise<BoostSettlementResult & { itemUseRecordId: string | null }> {
  const punch = await input.tx.punchRecord.findUniqueOrThrow({
    where: { id: input.punchRecordId },
    select: {
      boostItemUseRecordId: true,
      boostSummaryJson: true,
      assetAwarded: true,
      baseAssetAwarded: true,
      boostAssetBonus: true,
      seasonContributionAwarded: true,
      baseSeasonContribution: true,
      boostSeasonBonus: true,
      seasonId: true,
    },
  });

  if (punch.boostItemUseRecordId && punch.boostSummaryJson) {
    const summary = JSON.parse(punch.boostSummaryJson) as BoostSettlementResult;
    return { ...summary, itemUseRecordId: punch.boostItemUseRecordId };
  }

  const itemUse = await input.tx.itemUseRecord.findFirst({
    where: {
      userId: input.userId,
      dayKey: input.dayKey,
      status: "PENDING",
      OR: [
        { targetType: null, targetId: null },
        { targetType: "FITNESS_PUNCH", targetId: input.punchRecordId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!itemUse) {
    const baseSettlement = calculateBoostSettlement({
      baseAssetAwarded: input.baseAssetAwarded,
      baseSeasonContribution: input.baseSeasonContribution,
      effect: null,
    });

    await input.tx.punchRecord.update({
      where: { id: input.punchRecordId },
      data: {
        assetAwarded: baseSettlement.assetAwarded,
        baseAssetAwarded: baseSettlement.baseAssetAwarded,
        boostAssetBonus: 0,
        baseSeasonContribution: baseSettlement.baseSeasonContribution,
        boostSeasonBonus: 0,
        seasonContributionAwarded: baseSettlement.seasonContributionAwarded,
      },
    });

    return { ...baseSettlement, itemUseRecordId: null };
  }

  const effect = parseEffect(itemUse.effectSnapshotJson);
  const settlement = calculateBoostSettlement({
    baseAssetAwarded: input.baseAssetAwarded,
    baseSeasonContribution: input.baseSeasonContribution,
    effect,
  });
  const definition = getItemDefinition(itemUse.itemId);
  const boostSummary = {
    ...settlement,
    boostLabel: definition?.name ?? settlement.boostLabel,
  };

  await consumeBoostInventory({
    tx: input.tx,
    userId: input.userId,
    itemId: itemUse.itemId,
  });

  await input.tx.itemUseRecord.update({
    where: { id: itemUse.id },
    data: {
      status: "SETTLED",
      targetType: "FITNESS_PUNCH",
      targetId: input.punchRecordId,
      settledAt: new Date(),
    },
  });

  await input.tx.punchRecord.update({
    where: { id: input.punchRecordId },
    data: {
      assetAwarded: settlement.assetAwarded,
      baseAssetAwarded: settlement.baseAssetAwarded,
      boostAssetBonus: settlement.boostAssetBonus,
      baseSeasonContribution: settlement.baseSeasonContribution,
      boostSeasonBonus: settlement.boostSeasonBonus,
      seasonContributionAwarded: settlement.seasonContributionAwarded,
      boostItemUseRecordId: itemUse.id,
      boostSummaryJson: JSON.stringify(boostSummary),
    },
  });

  if (input.applyBonusDeltas) {
    if (settlement.boostAssetBonus !== 0) {
      await input.tx.user.update({
        where: { id: input.userId },
        data: { coins: { increment: settlement.boostAssetBonus } },
      });
    }

    if (punch.seasonId && settlement.boostSeasonBonus !== 0) {
      await input.tx.seasonMemberStat.update({
        where: {
          seasonId_userId: {
            seasonId: punch.seasonId,
            userId: input.userId,
          },
        },
        data: { seasonIncome: { increment: settlement.boostSeasonBonus } },
      });
    }
  }

  return { ...boostSummary, itemUseRecordId: itemUse.id };
}
```

- [ ] **Step 3: Run boost settlement tests**

Run:

```bash
npm test -- __tests__/gamification-boost-settlement.test.ts
```

Expected: PASS.

---

### Task 4: Integrate Boost Settlement Into Punch Creation

**Files:**
- Modify: `app/api/board/punch/route.ts`
- Modify: `lib/activity-events.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Add imports**

In `app/api/board/punch/route.ts`, import:

```ts
import { settleBoostForPunch } from "@/lib/gamification/boost-settlement";
```

In economy imports, keep `getPunchRewardForStreak` from GM-08.

- [ ] **Step 2: Create punch with base fields, then settle boost**

Inside `POST`, define:

```ts
const baseReward = reward;
const baseSeasonContribution = activeSeason ? baseReward : 0;
```

Replace the punch creation and downstream reward usage with:

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
    assetAwarded: baseReward,
    baseAssetAwarded: baseReward,
    boostAssetBonus: 0,
    baseSeasonContribution,
    boostSeasonBonus: 0,
    seasonContributionAwarded: baseSeasonContribution,
    countedForSeasonSlot: countsForSeasonSlot,
  },
});

const boostSettlement = await settleBoostForPunch({
  tx,
  userId: user.id,
  teamId: user.teamId,
  dayKey: todayDayKey,
  punchRecordId: punchRecord.id,
  baseAssetAwarded: baseReward,
  baseSeasonContribution,
  applyBonusDeltas: false,
});
```

Then use:

```ts
boostSettlement.assetAwarded
boostSettlement.seasonContributionAwarded
boostSettlement.boostLabel
```

for user coins, activity event, and season income instead of `reward`.

- [ ] **Step 3: Update activity message helper**

In `lib/activity-events.ts`, change `buildPunchActivityMessage`:

```ts
export function buildPunchActivityMessage(username: string, reward: number, boostLabel?: string | null) {
  if (boostLabel) {
    return `${username} 刚刚打卡，拿下 ${reward} 银子，${boostLabel}生效`;
  }

  return `${username} 刚刚打卡，拿下 ${reward} 银子`;
}

export function buildUndoPunchActivityMessage(username: string, consumedBoostLabel?: string | null) {
  if (consumedBoostLabel) {
    return `${username} 撤销了今天的打卡，已消耗的${consumedBoostLabel}不返还`;
  }

  return `${username} 撤销了今天的打卡`;
}
```

- [ ] **Step 4: Add punch integration tests**

In `__tests__/board-punch-api.test.ts`, add:

```ts
it("settles a pre-used small boost during punch settlement", async () => {
  await resetState();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  await prisma.user.update({
    where: { id: user.id },
    data: { currentStreak: 3, lastPunchDayKey: "2026-04-23", coins: 100 },
  });
  await prisma.inventoryItem.create({
    data: { userId: user.id, teamId: user.teamId, itemId: "small_boost_coupon", quantity: 1 },
  });
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

  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const punch = await prisma.punchRecord.findUniqueOrThrow({
    where: { userId_dayKey: { userId: user.id, dayKey: todayDayKey } },
  });
  const inventory = await prisma.inventoryItem.findUniqueOrThrow({
    where: { userId_itemId: { userId: user.id, itemId: "small_boost_coupon" } },
  });
  const itemUse = await prisma.itemUseRecord.findFirstOrThrow({
    where: { userId: user.id, itemId: "small_boost_coupon" },
  });

  expect(punch).toMatchObject({
    baseAssetAwarded: 40,
    assetAwarded: 60,
    boostAssetBonus: 20,
    baseSeasonContribution: 0,
    seasonContributionAwarded: 0,
  });
  expect(after.coins).toBe(160);
  expect(inventory.quantity).toBe(0);
  expect(itemUse.status).toBe("SETTLED");
});

it("settles a season sprint boost without adding extra season slots", async () => {
  await resetState();
  const season = await createActiveSeason({ filledSlots: 0, targetSlots: 1 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  await prisma.inventoryItem.create({
    data: { userId: user.id, teamId: user.teamId, itemId: "season_sprint_coupon", quantity: 1 },
  });
  await prisma.itemUseRecord.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      itemId: "season_sprint_coupon",
      dayKey: todayDayKey,
      status: "PENDING",
      effectSnapshotJson: JSON.stringify({ type: "fitness_season_multiplier", multiplier: 2 }),
    },
  });

  const response = await POST(request("POST", user.id));
  expect(response.status).toBe(200);

  const punch = await prisma.punchRecord.findUniqueOrThrow({
    where: { userId_dayKey: { userId: user.id, dayKey: todayDayKey } },
  });
  const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
    where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
  });
  const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });

  expect(punch.assetAwarded).toBe(10);
  expect(punch.seasonContributionAwarded).toBe(20);
  expect(stat.seasonIncome).toBe(20);
  expect(stat.slotContribution).toBe(1);
  expect(afterSeason.filledSlots).toBe(1);
});
```

- [ ] **Step 5: Run board punch tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

---

### Task 5: Integrate After-Punch Boost Use

**Files:**
- Modify: `lib/gamification/item-use.ts`
- Modify: `__tests__/gamification-item-use.test.ts`
- Modify: `__tests__/gamification-item-use-api.test.ts`

- [ ] **Step 1: Import settlement helper**

In `lib/gamification/item-use.ts`, import:

```ts
import { settleBoostForPunch } from "@/lib/gamification/boost-settlement";
```

- [ ] **Step 2: Settle immediately when boost targets existing punch**

In `useFitnessBoost`, extend the existing `todayPunch` select from GM-08 so it includes the fields needed for settlement:

```ts
select: {
  id: true,
  punchType: true,
  seasonId: true,
  assetAwarded: true,
  baseAssetAwarded: true,
  baseSeasonContribution: true,
}
```

After creating the `ItemUseRecord`, add:

```ts
let immediateSettlement = false;

if (todayPunch?.punchType === "default") {
  await settleBoostForPunch({
    tx: input.tx,
    userId: input.userId,
    teamId: input.teamId,
    dayKey: input.dayKey,
    punchRecordId: todayPunch.id,
    baseAssetAwarded: todayPunch.baseAssetAwarded || todayPunch.assetAwarded,
    baseSeasonContribution: todayPunch.baseSeasonContribution || (todayPunch.seasonId ? todayPunch.assetAwarded : 0),
    applyBonusDeltas: true,
  });
  immediateSettlement = true;
}
```

Update the returned item use result:

```ts
return {
  id: itemUse.id,
  itemId: itemUse.itemId,
  status: immediateSettlement ? ("SETTLED" as const) : ("PENDING" as const),
  targetType: itemUse.targetType,
  targetId: itemUse.targetId,
  inventoryConsumed: immediateSettlement,
  message: immediateSettlement
    ? "暴击已补结算到今日打卡。"
    : "暴击已进入今日待生效，真实健身后结算。",
};
```

- [ ] **Step 3: Add after-punch service test**

In `__tests__/gamification-item-use.test.ts`, add:

```ts
it("immediately settles a boost used after today's punch", async () => {
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { coins: 140 },
  });
  const punch = await prisma.punchRecord.create({
    data: {
      userId,
      seasonId: null,
      dayIndex: 26,
      dayKey,
      punched: true,
      punchType: "default",
      streakAfterPunch: 4,
      assetAwarded: 40,
      baseAssetAwarded: 40,
      baseSeasonContribution: 0,
      seasonContributionAwarded: 0,
      countedForSeasonSlot: false,
    },
  });

  const result = await useInventoryItem({ userId, itemId: "coin_rich_coupon", now: fixedNow });

  const updatedPunch = await prisma.punchRecord.findUniqueOrThrow({ where: { id: punch.id } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const inventory = await prisma.inventoryItem.findUniqueOrThrow({
    where: { userId_itemId: { userId, itemId: "coin_rich_coupon" } },
  });

  expect(result.itemUse.message).toContain("补结算");
  expect(updatedPunch.assetAwarded).toBe(80);
  expect(updatedPunch.boostAssetBonus).toBe(40);
  expect(user.coins).toBe(180);
  expect(inventory.quantity).toBe(0);
});
```

- [ ] **Step 4: Add API after-punch test**

In `__tests__/gamification-item-use-api.test.ts`, add:

```ts
it("immediately settles boost bonus when used after today's punch", async () => {
  const dayKey = getShanghaiDayKey(new Date());
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { coins: 140 },
  });
  await prisma.punchRecord.create({
    data: {
      userId,
      seasonId: null,
      dayIndex: 26,
      dayKey,
      punched: true,
      punchType: "default",
      streakAfterPunch: 4,
      assetAwarded: 40,
      baseAssetAwarded: 40,
      baseSeasonContribution: 0,
      seasonContributionAwarded: 0,
      countedForSeasonSlot: false,
    },
  });

  const response = await POST(request(userId, { itemId: "coin_rich_coupon" }));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.itemUse.message).toContain("补结算");
  expect(body.snapshot.currentUser.assetBalance).toBe(180);
});
```

- [ ] **Step 5: Run item use tests**

Run:

```bash
npm test -- __tests__/gamification-item-use.test.ts __tests__/gamification-item-use-api.test.ts
```

Expected: PASS.

---

### Task 6: Fix Undo Rollback For Divergent Coin And Season Amounts

**Files:**
- Modify: `app/api/board/punch/route.ts`
- Modify: `lib/activity-events.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Select new rollback fields**

In the undo route `todayPunch` select, add:

```ts
seasonContributionAwarded: true,
boostItemUseRecordId: true,
boostSummaryJson: true,
```

- [ ] **Step 2: Roll back season income by season contribution**

Before updating season stats, compute:

```ts
const seasonRollbackAmount =
  todayPunch.seasonContributionAwarded > 0
    ? todayPunch.seasonContributionAwarded
    : todayPunch.assetAwarded;
const consumedBoostLabel = todayPunch.boostSummaryJson
  ? (JSON.parse(todayPunch.boostSummaryJson) as { boostLabel?: string | null }).boostLabel
  : null;
```

Replace season income decrement:

```ts
seasonIncome: {
  decrement: seasonRollbackAmount,
},
```

Update undo activity message:

```ts
message: buildUndoPunchActivityMessage(user.username, consumedBoostLabel),
```

Do not update `InventoryItem` and do not change `ItemUseRecord.status`.

- [ ] **Step 3: Add undo test for coin-only boost**

In `__tests__/board-punch-api.test.ts`, add:

```ts
it("undoes a coin-only boosted punch without rolling back extra season income", async () => {
  await resetState();
  const season = await createActiveSeason({ filledSlots: 1, targetSlots: 5 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const itemUse = await prisma.itemUseRecord.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      itemId: "coin_rich_coupon",
      dayKey: todayDayKey,
      status: "SETTLED",
      targetType: "FITNESS_PUNCH",
      effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 2 }),
      settledAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { coins: 180, currentStreak: 4, lastPunchDayKey: todayDayKey },
  });
  await prisma.seasonMemberStat.create({
    data: {
      seasonId: season.id,
      userId: user.id,
      seasonIncome: 40,
      slotContribution: 1,
      colorIndex: 0,
      memberOrder: 0,
      firstContributionAt: new Date(),
    },
  });
  await prisma.punchRecord.create({
    data: {
      userId: user.id,
      seasonId: season.id,
      dayIndex: today,
      dayKey: todayDayKey,
      punched: true,
      punchType: "default",
      streakAfterPunch: 4,
      assetAwarded: 80,
      baseAssetAwarded: 40,
      boostAssetBonus: 40,
      baseSeasonContribution: 40,
      boostSeasonBonus: 0,
      seasonContributionAwarded: 40,
      boostItemUseRecordId: itemUse.id,
      boostSummaryJson: JSON.stringify({ boostLabel: "银子暴富券" }),
      countedForSeasonSlot: true,
    },
  });

  const response = await DELETE(request("DELETE", user.id));
  expect(response.status).toBe(200);

  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
    where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
  });
  const inventoryCount = await prisma.inventoryItem.count({
    where: { userId: user.id, itemId: "coin_rich_coupon" },
  });

  expect(after.coins).toBe(100);
  expect(stat.seasonIncome).toBe(0);
  expect(inventoryCount).toBe(0);
});
```

- [ ] **Step 4: Run board punch tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

---

### Task 7: Update Activity Copy Tests

**Files:**
- Modify: `__tests__/activity-events-api.test.ts`
- Modify: `lib/activity-events.ts`

- [ ] **Step 1: Add boost activity fixture**

In `__tests__/activity-events-api.test.ts`, add or update a punch activity fixture:

```ts
await prisma.activityEvent.create({
  data: {
    teamId: user.teamId,
    userId: user.id,
    type: "PUNCH",
    message: "li 刚刚打卡，拿下 60 银子，小暴击券生效",
    assetAwarded: 60,
    createdAt: new Date(),
  },
});
```

- [ ] **Step 2: Assert boost message is returned unchanged**

Add:

```ts
expect(punchBody.events.map((event: { text: string }) => event.text)).toContain(
  "li 刚刚打卡，拿下 60 银子，小暴击券生效",
);
```

- [ ] **Step 3: Run activity tests**

Run:

```bash
npm test -- __tests__/activity-events-api.test.ts
```

Expected: PASS.

---

### Task 8: Verification

**Files:**
- Modified files from Tasks 1-7.

- [ ] **Step 1: Run boost settlement tests**

Run:

```bash
npm test -- __tests__/gamification-boost-settlement.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run punch API tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run item-use tests**

Run:

```bash
npm test -- __tests__/gamification-item-use.test.ts __tests__/gamification-item-use-api.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run activity event tests**

Run:

```bash
npm test -- __tests__/activity-events-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run seed and board state regression tests**

Run:

```bash
npm test -- __tests__/seed.test.ts __tests__/board-state.test.ts
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

- [ ] **Step 8: Commit GM-09**

```bash
git add prisma/schema.prisma lib/gamification/boost-settlement.ts lib/gamification/item-use.ts app/api/board/punch/route.ts lib/activity-events.ts lib/types.ts components/punch-board/ActivityStream.tsx __tests__/gamification-boost-settlement.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-item-use.test.ts __tests__/gamification-item-use-api.test.ts __tests__/activity-events-api.test.ts __tests__/seed.test.ts __tests__/board-state.test.ts
git commit -m "feat: settle gamification boosts"
```

## Self-Review Checklist

- Personal coins and season income are persisted separately on `PunchRecord`.
- Small boost affects only personal coins.
- Coin-rich boost affects only personal coins.
- Season sprint boost affects only season income.
- Double niuma boost affects personal coins and season income.
- Boost settlement consumes one inventory item exactly once.
- Boost settlement marks `ItemUseRecord` as `SETTLED`.
- Same boost cannot settle twice.
- Punch undo rolls back personal coins by `assetAwarded`.
- Punch undo rolls back season income by `seasonContributionAwarded`.
- Punch undo does not refund consumed boost inventory.
- Boosts do not add extra season slots or overfill `filledSlots`.
- Activity copy shows boost effects.
