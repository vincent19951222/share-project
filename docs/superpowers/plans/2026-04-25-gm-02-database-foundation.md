# GM-02 Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Prisma database foundation for `牛马补给站`: daily task assignments, ticket ledger, inventory, item use records, lottery records, social invitations, real-world redemptions, and minimal safe mutation helpers.

**Architecture:** Extend the existing Prisma schema with user-state models that reference local config IDs from GM-01 as strings, not foreign keys. Add a small `lib/gamification/db.ts` service layer for transaction-safe ticket and inventory updates; leave all feature flows, pages, APIs, draw logic, and item settlement to later GM stories.

**Tech Stack:** Prisma + SQLite, TypeScript strict mode, Vitest.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `User.ticketBalance`.
  - Add gamification relations to `User` and `Team`.
  - Add `DailyTaskAssignment`, `LotteryTicketLedger`, `InventoryItem`, `ItemUseRecord`, `LotteryDraw`, `LotteryDrawResult`, `SocialInvitation`, and `RealWorldRedemption`.
- Modify: `prisma/dev.db`
  - Updated by `npx prisma db push`.
- Create: `lib/gamification/db.ts`
  - Minimal transaction-safe helpers for ticket and inventory updates.
- Create: `__tests__/gamification-db.test.ts`
  - Database and service invariant tests.

## Implementation Rules

- Do not create pages.
- Do not create HTTP API routes.
- Do not implement daily task assignment generation.
- Do not implement lottery draw randomization.
- Do not implement item settlement.
- Do not connect to enterprise WeChat.
- `taskCardId`, `itemId`, and `rewardId` remain string references to local config IDs.
- Enforce negative-balance and negative-inventory protection in service helpers.

---

### Task 1: Add Failing Database Foundation Tests

**Files:**
- Create: `__tests__/gamification-db.test.ts`

- [ ] **Step 1: Write failing tests for schema models and service invariants**

Create `__tests__/gamification-db.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { adjustInventoryItem, adjustLotteryTickets } from "@/lib/gamification/db";

async function getSeedUser() {
  await seedDatabase();
  return prisma.user.findUniqueOrThrow({ where: { username: "li" } });
}

describe("gamification database foundation", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it("creates one daily task assignment per user/day/dimension", async () => {
    const user = await getSeedUser();

    await prisma.dailyTaskAssignment.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-25",
        dimensionKey: "movement",
        taskCardId: "movement_001",
      },
    });

    await expect(
      prisma.dailyTaskAssignment.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey: "2026-04-25",
          dimensionKey: "movement",
          taskCardId: "movement_002",
        },
      }),
    ).rejects.toThrow();
  });

  it("updates ticket balance and writes ledger in one helper", async () => {
    const user = await getSeedUser();

    const result = await adjustLotteryTickets({
      userId: user.id,
      teamId: user.teamId,
      dayKey: "2026-04-25",
      delta: 2,
      reason: "DAILY_TASKS_GRANTED",
      sourceType: "daily_tasks",
      sourceId: "daily-2026-04-25",
    });

    expect(result.balanceAfter).toBe(2);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.ticketBalance).toBe(2);

    const ledger = await prisma.lotteryTicketLedger.findMany({ where: { userId: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      delta: 2,
      balanceAfter: 2,
      reason: "DAILY_TASKS_GRANTED",
    });
  });

  it("rejects zero ticket delta", async () => {
    const user = await getSeedUser();

    await expect(
      adjustLotteryTickets({
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-25",
        delta: 0,
        reason: "ADMIN_ADJUSTMENT",
      }),
    ).rejects.toThrow(/delta cannot be 0/);
  });

  it("rejects negative ticket balances", async () => {
    const user = await getSeedUser();

    await expect(
      adjustLotteryTickets({
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-25",
        delta: -1,
        reason: "LOTTERY_DRAW_SPENT",
      }),
    ).rejects.toThrow(/Ticket balance cannot be negative/);
  });

  it("creates and adjusts inventory rows", async () => {
    const user = await getSeedUser();

    const item = await adjustInventoryItem({
      userId: user.id,
      teamId: user.teamId,
      itemId: "task_reroll_coupon",
      delta: 2,
    });

    expect(item.quantity).toBe(2);

    const adjusted = await adjustInventoryItem({
      userId: user.id,
      teamId: user.teamId,
      itemId: "task_reroll_coupon",
      delta: -1,
    });

    expect(adjusted.quantity).toBe(1);
  });

  it("rejects negative inventory quantities", async () => {
    const user = await getSeedUser();

    await expect(
      adjustInventoryItem({
        userId: user.id,
        teamId: user.teamId,
        itemId: "task_reroll_coupon",
        delta: -1,
      }),
    ).rejects.toThrow(/Inventory quantity cannot be negative/);
  });

  it("creates lottery draw results with ordered positions", async () => {
    const user = await getSeedUser();

    const draw = await prisma.lotteryDraw.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        drawType: "SINGLE",
        ticketSpent: 1,
        results: {
          create: {
            position: 1,
            rewardId: "coins_005",
            rewardTier: "coin",
            rewardKind: "coins",
            rewardSnapshotJson: JSON.stringify({ amount: 5 }),
          },
        },
      },
      include: { results: true },
    });

    expect(draw.results).toHaveLength(1);
    expect(draw.results[0].position).toBe(1);
  });

  it("creates social invitation linked to item use record", async () => {
    const user = await getSeedUser();

    const itemUse = await prisma.itemUseRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        itemId: "drink_water_ping",
        dayKey: "2026-04-25",
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId: user.teamId,
        senderUserId: user.id,
        invitationType: "DRINK_WATER",
        itemUseRecordId: itemUse.id,
        status: "PENDING",
        dayKey: "2026-04-25",
        message: "喝水，别把自己腌入味。",
      },
    });

    expect(invitation.itemUseRecordId).toBe(itemUse.id);
  });

  it("creates real-world redemption with optional confirmer", async () => {
    const user = await getSeedUser();

    const redemption = await prisma.realWorldRedemption.create({
      data: {
        teamId: user.teamId,
        userId: user.id,
        itemId: "luckin_coffee_coupon",
        status: "REQUESTED",
      },
    });

    expect(redemption.status).toBe("REQUESTED");
    expect(redemption.confirmedByUserId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-db.test.ts
```

Expected: FAIL because Prisma models and `lib/gamification/db.ts` do not exist.

---

### Task 2: Extend Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `ticketBalance` and relations to `User` and `Team`**

Update `Team` with:

```prisma
dailyTaskAssignments DailyTaskAssignment[]
lotteryTicketLedgers LotteryTicketLedger[]
inventoryItems       InventoryItem[]
itemUseRecords       ItemUseRecord[]
lotteryDraws         LotteryDraw[]
socialInvitations    SocialInvitation[]
realWorldRedemptions RealWorldRedemption[]
```

Update `User` with:

```prisma
ticketBalance              Int                   @default(0)
dailyTaskAssignments       DailyTaskAssignment[]
lotteryTicketLedgers       LotteryTicketLedger[]
inventoryItems             InventoryItem[]
itemUseRecords             ItemUseRecord[]
lotteryDraws               LotteryDraw[]
sentSocialInvitations      SocialInvitation[]    @relation("SocialInvitationSender")
receivedSocialInvitations  SocialInvitation[]    @relation("SocialInvitationRecipient")
realWorldRedemptions       RealWorldRedemption[]
confirmedRedemptions       RealWorldRedemption[] @relation("RedemptionConfirmer")
```

- [ ] **Step 2: Add gamification models**

Append these models to `prisma/schema.prisma`:

```prisma
model DailyTaskAssignment {
  id                     String    @id @default(cuid())
  userId                 String
  user                   User      @relation(fields: [userId], references: [id])
  teamId                 String
  team                   Team      @relation(fields: [teamId], references: [id])
  dayKey                 String
  dimensionKey           String
  taskCardId             String
  rerollCount            Int       @default(0)
  rerolledFromTaskCardId String?
  completedAt            DateTime?
  completionText         String?
  note                   String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@unique([userId, dayKey, dimensionKey])
  @@index([teamId, dayKey])
}

model LotteryTicketLedger {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  teamId       String
  team         Team     @relation(fields: [teamId], references: [id])
  dayKey       String
  delta        Int
  balanceAfter Int
  reason       String
  sourceType   String?
  sourceId     String?
  metadataJson String?
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
  @@index([teamId, dayKey, createdAt])
  @@index([sourceType, sourceId])
}

model InventoryItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  itemId    String
  quantity  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, itemId])
  @@index([teamId, itemId])
}

model ItemUseRecord {
  id                 String            @id @default(cuid())
  userId             String
  user               User              @relation(fields: [userId], references: [id])
  teamId             String
  team               Team              @relation(fields: [teamId], references: [id])
  itemId             String
  dayKey             String
  status             String
  targetType         String?
  targetId           String?
  effectSnapshotJson String
  settledAt          DateTime?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  socialInvitation   SocialInvitation?

  @@index([userId, dayKey, status])
  @@index([teamId, dayKey, status])
  @@index([targetType, targetId])
}

model LotteryDraw {
  id               String              @id @default(cuid())
  userId           String
  user             User                @relation(fields: [userId], references: [id])
  teamId           String
  team             Team                @relation(fields: [teamId], references: [id])
  drawType         String
  ticketSpent      Int
  coinSpent        Int                 @default(0)
  guaranteeApplied Boolean             @default(false)
  createdAt        DateTime            @default(now())
  results          LotteryDrawResult[]

  @@index([userId, createdAt])
  @@index([teamId, createdAt])
}

model LotteryDrawResult {
  id                 String      @id @default(cuid())
  drawId             String
  draw               LotteryDraw @relation(fields: [drawId], references: [id])
  position           Int
  rewardId           String
  rewardTier         String
  rewardKind         String
  rewardSnapshotJson String
  createdAt          DateTime    @default(now())

  @@unique([drawId, position])
}

model SocialInvitation {
  id                  String        @id @default(cuid())
  teamId              String
  team                Team          @relation(fields: [teamId], references: [id])
  senderUserId        String
  senderUser          User          @relation("SocialInvitationSender", fields: [senderUserId], references: [id])
  recipientUserId     String?
  recipientUser       User?         @relation("SocialInvitationRecipient", fields: [recipientUserId], references: [id])
  invitationType      String
  itemUseRecordId     String        @unique
  itemUseRecord       ItemUseRecord @relation(fields: [itemUseRecordId], references: [id])
  status              String
  dayKey              String
  message             String
  wechatWebhookSentAt DateTime?
  respondedAt         DateTime?
  expiredAt           DateTime?
  rewardSettledAt     DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([teamId, dayKey, status])
  @@index([senderUserId, dayKey])
  @@index([recipientUserId, dayKey, status])
}

model RealWorldRedemption {
  id                String    @id @default(cuid())
  teamId            String
  team              Team      @relation(fields: [teamId], references: [id])
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  itemId            String
  status            String
  requestedAt       DateTime  @default(now())
  confirmedByUserId String?
  confirmedByUser   User?     @relation("RedemptionConfirmer", fields: [confirmedByUserId], references: [id])
  confirmedAt       DateTime?
  cancelledAt       DateTime?
  note              String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([teamId, status, requestedAt])
  @@index([userId, status, requestedAt])
}
```

- [ ] **Step 3: Push schema and regenerate Prisma client**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: both commands succeed and generated client exposes the new models.

---

### Task 3: Add Minimal Database Service Helpers

**Files:**
- Create: `lib/gamification/db.ts`

- [ ] **Step 1: Implement ticket and inventory adjustment helpers**

Create `lib/gamification/db.ts`:

```ts
import { prisma } from "@/lib/prisma";
import type { PrismaClientOrTransaction } from "@/lib/prisma";

type DbClient = PrismaClientOrTransaction;

interface AdjustLotteryTicketsInput {
  userId: string;
  teamId: string;
  dayKey: string;
  delta: number;
  reason: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: unknown;
  db?: DbClient;
}

interface AdjustInventoryItemInput {
  userId: string;
  teamId: string;
  itemId: string;
  delta: number;
  db?: DbClient;
}

export async function adjustLotteryTickets(input: AdjustLotteryTicketsInput) {
  const db = input.db ?? prisma;

  if (input.delta === 0) {
    throw new Error("Lottery ticket delta cannot be 0");
  }

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    const balanceAfter = user.ticketBalance + input.delta;

    if (balanceAfter < 0) {
      throw new Error("Ticket balance cannot be negative");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { ticketBalance: balanceAfter },
    });

    return tx.lotteryTicketLedger.create({
      data: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: input.dayKey,
        delta: input.delta,
        balanceAfter,
        reason: input.reason,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metadataJson: input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
      },
    });
  });
}

export async function adjustInventoryItem(input: AdjustInventoryItemInput) {
  const db = input.db ?? prisma;

  if (input.delta === 0) {
    throw new Error("Inventory delta cannot be 0");
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findUnique({
      where: {
        userId_itemId: {
          userId: input.userId,
          itemId: input.itemId,
        },
      },
    });

    const currentQuantity = existing?.quantity ?? 0;
    const nextQuantity = currentQuantity + input.delta;

    if (nextQuantity < 0) {
      throw new Error("Inventory quantity cannot be negative");
    }

    return tx.inventoryItem.upsert({
      where: {
        userId_itemId: {
          userId: input.userId,
          itemId: input.itemId,
        },
      },
      create: {
        userId: input.userId,
        teamId: input.teamId,
        itemId: input.itemId,
        quantity: nextQuantity,
      },
      update: {
        quantity: nextQuantity,
      },
    });
  });
}
```

- [ ] **Step 2: If `PrismaClientOrTransaction` does not exist, add it**

Inspect `lib/prisma.ts`. If it does not export a transaction-compatible type, add:

```ts
export type PrismaClientOrTransaction = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
```

If the generated Prisma client type does not support that exact expression, use a local type in `lib/gamification/db.ts`:

```ts
type DbClient = typeof prisma;
```

and remove the optional `db` plumbing from the helper signatures for GM-02. Later stories can widen it if needed.

- [ ] **Step 3: Run gamification database test**

Run:

```bash
npm test -- __tests__/gamification-db.test.ts
```

Expected: PASS after fixing any generated Prisma type names.

---

### Task 4: Verification

**Files:**
- No new files beyond previous tasks.

- [ ] **Step 1: Run targeted database tests**

Run:

```bash
npm test -- __tests__/gamification-db.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run existing seed tests**

Run:

```bash
npm test -- __tests__/seed.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit GM-02**

```bash
git add prisma/schema.prisma prisma/dev.db lib/generated/prisma lib/gamification/db.ts __tests__/gamification-db.test.ts
git commit -m "feat: add gamification database foundation"
```

## Self-Review Checklist

- GM-02 does not add pages.
- GM-02 does not add HTTP APIs.
- GM-02 does not implement lottery randomization.
- GM-02 does not implement daily task assignment.
- Ticket balance changes are ledgered.
- Inventory changes cannot go negative.
- Local config IDs remain strings, not database foreign keys.
