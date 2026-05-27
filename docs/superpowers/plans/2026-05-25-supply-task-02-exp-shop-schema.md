# Supply Task 02 EXP And Shop Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the minimal Prisma schema and seed support for real User EXP, EXP ledger rows, and shop purchase audit rows.

**Architecture:** This task only changes persistence contracts. Focused Vitest tests prove the new Prisma Client delegates and constraints exist, while `seedDatabase()` keeps the local fixture deterministic for future EXP and shop service tests.

**Tech Stack:** Next.js 15 App Router repository, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest.

---

## Scope

本计划对应 spec：

`docs/superpowers/specs/2026-05-25-supply-task-02-exp-shop-schema-design.md`

本任务只做 schema、seed 和 schema 级测试，不实现：

- EXP 发放服务
- 任务完成或真实打卡发 EXP
- 商店购买 API
- 限购业务判断
- 任务记录聚合
- 生产 UI 替换

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `User.exp`.
  - Add `Team.experienceLedgers`, `Team.shopPurchases`, `User.experienceLedgers`, and `User.shopPurchases`.
  - Add `ExperienceLedger` model.
  - Add `ShopPurchase` model.
- Modify: `lib/db-seed.ts`
  - Clear new ledger/purchase rows for the seeded team and extra users.
  - Reset seeded users' `exp` to `0`.
- Modify: `__tests__/seed.test.ts`
  - Clear new ledger/purchase rows in fixture cleanup before deleting users.
- Create: `__tests__/gamification-experience-schema.test.ts`
  - Proves `User.exp`, `ExperienceLedger`, and the source unique key work.
- Create: `__tests__/gamification-shop-schema.test.ts`
  - Proves `ShopPurchase` audit rows can be created and read.
- Generated: `lib/generated/prisma/*`
  - Update locally after `npx prisma generate`.
  - This path is ignored by `.gitignore`, so do not force-add it.

## Task 1: Schema Contract Tests

**Files:**
- Create: `__tests__/gamification-experience-schema.test.ts`
- Create: `__tests__/gamification-shop-schema.test.ts`

- [ ] **Step 1: Write the failing experience schema test**

Create `__tests__/gamification-experience-schema.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("gamification experience schema", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores user exp and enforces an idempotent experience ledger source", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

    await prisma.user.update({ where: { id: user.id }, data: { exp: 100 } });
    await prisma.experienceLedger.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-05-25",
        delta: 100,
        balanceAfter: 100,
        reason: "FITNESS_PUNCH_EXP",
        sourceType: "fitness_punch",
        sourceId: "punch-1",
      },
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.exp).toBe(100);

    await expect(
      prisma.experienceLedger.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey: "2026-05-25",
          delta: 100,
          balanceAfter: 200,
          reason: "FITNESS_PUNCH_EXP",
          sourceType: "fitness_punch",
          sourceId: "punch-1",
        },
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Write the failing shop schema test**

Create `__tests__/gamification-shop-schema.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("gamification shop schema", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores purchase audit rows for inventory purchases", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

    const purchase = await prisma.shopPurchase.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        itemId: "task_reroll_coupon",
        quantity: 1,
        unitPriceCoins: 150,
        totalPriceCoins: 150,
        dayKey: "2026-05-25",
        weekKey: "2026-W22",
        status: "SETTLED",
      },
    });

    expect(purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      status: "SETTLED",
    });
  });
});
```

- [ ] **Step 3: Run the schema tests and verify they fail**

Run:

```bash
npm test -- __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts
```

Expected: FAIL because the generated Prisma Client does not yet expose `User.exp`, `experienceLedger`, or `shopPurchase`.

## Task 2: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add relations and models**

In `prisma/schema.prisma`, add `experienceLedgers` and `shopPurchases` to `Team`:

```prisma
  experienceLedgers ExperienceLedger[]
  shopPurchases     ShopPurchase[]
```

Add `exp`, `experienceLedgers`, and `shopPurchases` to `User` near the existing game economy fields:

```prisma
  coins                 Int                    @default(0)
  ticketBalance         Int                    @default(0)
  exp                   Int                    @default(0)
```

```prisma
  experienceLedgers     ExperienceLedger[]
  shopPurchases         ShopPurchase[]
```

Add these models after `LotteryTicketLedger`:

```prisma
model ExperienceLedger {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  teamId       String
  team         Team     @relation(fields: [teamId], references: [id])
  dayKey       String
  delta        Int
  balanceAfter Int
  reason       String
  sourceType   String
  sourceId     String
  metadataJson String?
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
  @@index([teamId, dayKey, createdAt])
  @@unique([sourceType, sourceId])
}

model ShopPurchase {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  teamId          String
  team            Team     @relation(fields: [teamId], references: [id])
  itemId          String
  quantity        Int
  unitPriceCoins  Int
  totalPriceCoins Int
  dayKey          String
  weekKey         String
  status          String
  metadataJson    String?
  createdAt       DateTime @default(now())

  @@index([userId, dayKey, itemId])
  @@index([userId, weekKey, itemId])
  @@index([teamId, createdAt])
}
```

## Task 3: Seed Cleanup

**Files:**
- Modify: `lib/db-seed.ts`
- Modify: `__tests__/seed.test.ts`

- [ ] **Step 1: Clear new rows for the seeded team**

After deleting `lotteryTicketLedger` rows for the seeded team, add:

```typescript
  await prisma.shopPurchase.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.experienceLedger.deleteMany({
    where: { teamId: team.id },
  });
```

- [ ] **Step 2: Reset seeded users' exp**

In seeded user `update` and `create`, set:

```typescript
        exp: 0,
```

In the final `prisma.user.updateMany` reset block, set:

```typescript
      exp: 0,
```

- [ ] **Step 3: Clear new rows for extra users**

Before deleting extra users, after deleting `lotteryTicketLedger` rows for `extraUserIds`, add:

```typescript
    await prisma.shopPurchase.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.experienceLedger.deleteMany({ where: { userId: { in: extraUserIds } } });
```

- [ ] **Step 4: Clear new rows in seed test fixture cleanup**

In `__tests__/seed.test.ts`, after deleting `lotteryTicketLedger` rows in `beforeAll`, add:

```typescript
    await prisma.shopPurchase.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.experienceLedger.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
```

## Task 4: Generate, Push, Verify

**Files:**
- Generated: `lib/generated/prisma/*`
- Local DB schema: SQLite database resolved by current `DATABASE_URL`

- [ ] **Step 1: Generate Prisma Client**

Run:

```bash
npx prisma generate
```

Expected: PASS and `lib/generated/prisma` updates include `ExperienceLedger` and `ShopPurchase`.

Note: `lib/generated/prisma` is ignored by `.gitignore`; leave it as a local generated artifact.

- [ ] **Step 2: Push development schema**

Run:

```bash
npx prisma db push
```

Expected: PASS and the local development SQLite schema is updated.

Note: `*.db` is ignored by `.gitignore`; leave database files as local generated artifacts.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts __tests__/seed.test.ts
```

Expected: PASS.

## Task 5: Commit

**Files:**
- Add: `docs/superpowers/specs/2026-05-25-supply-task-02-exp-shop-schema-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-02-exp-shop-schema.md`
- Add: `__tests__/gamification-experience-schema.test.ts`
- Add: `__tests__/gamification-shop-schema.test.ts`
- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Modify: `__tests__/seed.test.ts`
- Local generated only: `lib/generated/prisma/*`

- [ ] **Step 1: Review changed files**

Run:

```bash
git status --short
git diff -- prisma/schema.prisma lib/db-seed.ts __tests__/seed.test.ts __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts docs/superpowers/specs/2026-05-25-supply-task-02-exp-shop-schema-design.md docs/superpowers/plans/2026-05-25-supply-task-02-exp-shop-schema.md
```

Expected: only Task 2 files are changed.

- [ ] **Step 2: Commit Task 2**

Run:

```bash
git add docs/superpowers/specs/2026-05-25-supply-task-02-exp-shop-schema-design.md docs/superpowers/plans/2026-05-25-supply-task-02-exp-shop-schema.md prisma/schema.prisma lib/db-seed.ts __tests__/seed.test.ts __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts
git commit -m "feat: add supply exp and shop purchase schema"
```

Expected: commit succeeds.

## Completion Criteria

Task 2 is complete when:

- Task 2 spec and plan exist.
- Prisma schema has `User.exp`, `ExperienceLedger`, and `ShopPurchase`.
- Seed reset includes EXP and clears both new tables.
- Seed test fixture cleanup clears both new tables.
- Generated Prisma Client is up to date.
- Development SQLite schema is pushed.
- Generated Prisma Client and SQLite database files remain ignored local artifacts.
- Focused tests pass.
- Changes are committed.
