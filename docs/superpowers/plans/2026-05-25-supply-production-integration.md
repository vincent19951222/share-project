# Supply Production Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the production 牛马补给站 UI with the approved Supply UI Lab visual system, while adding real EXP/level data, real shop purchases, and a production task-record aggregator.

**Architecture:** Keep the existing Next.js tab entry and existing gamification APIs, then add missing service/model layers before replacing UI panels. The production UI must read a dedicated supply view-model, not UI Lab mock data and not raw Prisma rows. Mutation APIs return enough fresh state for the new shell to refresh predictably.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom, React 19, existing Tailwind/global CSS.

---

## Locked Decisions

- `team-goal` is out of scope for this phase.
- Keep database field `User.coins`; UI displays it as `银子`.
- Add real `User.exp` and `ExperienceLedger`; derive level from EXP.
- Add real `ShopPurchase`; shop purchases deduct `coins` and add `InventoryItem`.
- Backpack capacity displays a fixed `60`; no capacity model or expansion purchase.
- UI Lab routes remain available as reference routes and must not call production APIs.

Approved spec:

- `docs/superpowers/specs/2026-05-25-supply-production-integration-overall-design.md`

## File Structure

Create or modify these implementation units:

- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Modify: `lib/types.ts`
- Modify: `lib/api.ts`
- Modify: `lib/gamification/tasks.ts`
- Modify: `app/api/board/punch/route.ts`
- Modify: `components/gamification/SupplyStation.tsx`
- Create: `content/gamification/shop-catalog.ts`
- Create: `lib/gamification/experience.ts`
- Create: `lib/gamification/shop.ts`
- Create: `lib/gamification/task-records.ts`
- Create: `lib/gamification/supply-view-model.ts`
- Create: `app/api/gamification/supply/state/route.ts`
- Create: `app/api/gamification/shop/purchase/route.ts`
- Create: `components/gamification/production/SupplyStationShell.tsx`
- Create: `components/gamification/production/SupplyDashboardPanel.tsx`
- Create: `components/gamification/production/SupplyDrawPoolPanel.tsx`
- Create: `components/gamification/production/SupplyBackpackPanel.tsx`
- Create: `components/gamification/production/SupplyShopPanel.tsx`
- Create: `components/gamification/production/SupplyTaskRecordPanel.tsx`
- Create focused tests under `__tests__/` named in each task.

Generated after schema changes:

- Update generated Prisma client with `npx prisma generate`.
- Push development schema with `npx prisma db push` before running DB-backed tests.

## Task 1: Release Guardrails And Phase-3 Contracts

**Files:**

- Modify: `docs/database-workflow.md`
- Modify: `docs/production-release-checklist.md`
- Modify: `docs/gamification-acceptance-checklist.md`
- Create: `__tests__/supply-production-plan-contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

Create `__tests__/supply-production-plan-contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spec = readFileSync(
  "docs/superpowers/specs/2026-05-25-supply-production-integration-overall-design.md",
  "utf8",
);
const dbWorkflow = readFileSync("docs/database-workflow.md", "utf8");
const releaseChecklist = readFileSync("docs/production-release-checklist.md", "utf8");
const acceptance = readFileSync("docs/gamification-acceptance-checklist.md", "utf8");

describe("supply production integration contracts", () => {
  it("locks the approved phase-3 product decisions", () => {
    expect(spec).toContain("`team-goal` 不进入第三阶段");
    expect(spec).toContain("数据库继续保留 `User.coins`");
    expect(spec).toContain("UI 文案继续把 `coins` 展示为“银子”");
    expect(spec).toContain("`Lv / EXP / 牛马等级` 在第三阶段做成真实业务数据");
    expect(spec).toContain("补给商店在第三阶段做真实购买");
  });

  it("documents production database release safeguards", () => {
    expect(dbWorkflow).toContain("ExperienceLedger");
    expect(dbWorkflow).toContain("ShopPurchase");
    expect(dbWorkflow).toContain("备份生产 SQLite");
    expect(releaseChecklist).toContain("npx prisma db push");
    expect(releaseChecklist).toContain("pm2 restart share-project --update-env");
  });

  it("extends acceptance checks for exp and shop purchase consistency", () => {
    expect(acceptance).toContain("ExperienceLedger");
    expect(acceptance).toContain("ShopPurchase");
    expect(acceptance).toContain("userExp");
    expect(acceptance).toContain("shopPurchases");
  });
});
```

- [ ] **Step 2: Run the focused contract test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: FAIL because the release and acceptance docs do not yet mention `ExperienceLedger`, `ShopPurchase`, and the new SQL checks.

- [ ] **Step 3: Update the docs with concrete release steps**

Add sections to the three docs that include these exact operational facts:

````md
### 牛马补给站第三阶段 DB 变更

新增表和字段：

- `User.exp`
- `ExperienceLedger`
- `ShopPurchase`

发布前必须备份生产 SQLite：

```bash
copy E:\data\share-project\prod.db E:\data\share-project\prod.db.bak-YYYYMMDD-HHMM
```

生产发布顺序：

1. `git pull`
2. `npm install`
3. `set DATABASE_URL=file:/E:/data/share-project/prod.db`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run build`
7. `pm2 restart share-project --update-env`
````

Add acceptance SQL using these selected aliases:

```sql
select
  u.username,
  u.exp as userExp,
  coalesce((select sum(delta) from ExperienceLedger e where e.userId = u.id), 0) as ledgerExp,
  coalesce((select count(*) from ShopPurchase s where s.userId = u.id), 0) as shopPurchases
from User u
order by u.createdAt;
```

- [ ] **Step 4: Run the contract test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/database-workflow.md docs/production-release-checklist.md docs/gamification-acceptance-checklist.md __tests__/supply-production-plan-contract.test.ts
git commit -m "docs: add supply production release guardrails"
```

## Task 2: Prisma Schema For EXP And Shop Purchases

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Test: `__tests__/gamification-experience-schema.test.ts`
- Test: `__tests__/gamification-shop-schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `__tests__/gamification-experience-schema.test.ts`:

```ts
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

  it("stores user exp and an idempotent experience ledger source", async () => {
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

Create `__tests__/gamification-shop-schema.test.ts`:

```ts
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

    expect(purchase.itemId).toBe("task_reroll_coupon");
    expect(purchase.totalPriceCoins).toBe(150);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail before schema changes**

Run:

```bash
npm test -- __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts
```

Expected: FAIL with missing Prisma delegates or missing `User.exp`.

- [ ] **Step 3: Add schema fields and models**

In `prisma/schema.prisma`, add `exp Int @default(0)` to `User`, add relations from `Team` and `User`, and add these models:

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

Add to `Team`:

```prisma
experienceLedgers ExperienceLedger[]
shopPurchases     ShopPurchase[]
```

Add to `User`:

```prisma
exp               Int                @default(0)
experienceLedgers ExperienceLedger[]
shopPurchases     ShopPurchase[]
```

- [ ] **Step 4: Update seed cleanup**

In `lib/db-seed.ts`, delete `shopPurchase` and `experienceLedger` rows before resetting users, and reset user `exp` to `0` wherever seed resets `coins` and `ticketBalance`:

```ts
await prisma.shopPurchase.deleteMany({ where: { teamId: team.id } });
await prisma.experienceLedger.deleteMany({ where: { teamId: team.id } });
```

For extra users, add:

```ts
await prisma.shopPurchase.deleteMany({ where: { userId: { in: extraUserIds } } });
await prisma.experienceLedger.deleteMany({ where: { userId: { in: extraUserIds } } });
```

- [ ] **Step 5: Generate Prisma client and push dev schema**

Run:

```bash
npx prisma generate
npx prisma db push
```

Expected: Prisma client generated and development SQLite schema updated.

- [ ] **Step 6: Run focused schema tests**

Run:

```bash
npm test -- __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts __tests__/seed.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/db-seed.ts lib/generated __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts
git commit -m "feat: add supply exp and shop purchase schema"
```

## Task 3: EXP Service

**Files:**

- Create: `lib/gamification/experience.ts`
- Test: `__tests__/gamification-experience.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `__tests__/gamification-experience.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  FITNESS_PUNCH_EXP,
  TASK_COMPLETION_EXP,
  adjustExperience,
  getUserLevelSnapshot,
  grantFitnessPunchExperience,
  grantTaskCompletionExperience,
} from "@/lib/gamification/experience";
import { prisma } from "@/lib/prisma";

describe("gamification experience service", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives level snapshot from total exp", () => {
    expect(getUserLevelSnapshot(0)).toEqual({
      totalExp: 0,
      level: 1,
      currentLevelExp: 0,
      nextLevelExp: 1000,
      title: "自律牛马",
    });
    expect(getUserLevelSnapshot(10_240)).toMatchObject({
      totalExp: 10_240,
      level: 11,
      currentLevelExp: 240,
      title: "稳定脱脂牛马",
    });
    expect(getUserLevelSnapshot(25_000)).toMatchObject({
      level: 26,
      title: "卷王预备役",
    });
  });

  it("adjusts exp and writes one ledger row", async () => {
    const result = await adjustExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      delta: 100,
      reason: "FITNESS_PUNCH_EXP",
      sourceType: "fitness_punch",
      sourceId: "punch-1",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.exp).toBe(100);
    expect(result.ledger.balanceAfter).toBe(100);
  });

  it("is idempotent by source type and source id", async () => {
    await grantFitnessPunchExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      punchRecordId: "punch-1",
    });
    await grantFitnessPunchExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      punchRecordId: "punch-1",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.experienceLedger.findMany({ where: { userId } });
    expect(user.exp).toBe(FITNESS_PUNCH_EXP);
    expect(ledgers).toHaveLength(1);
  });

  it("uses the task completion source key", async () => {
    await grantTaskCompletionExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      assignmentId: "assignment-1",
    });

    const ledger = await prisma.experienceLedger.findFirstOrThrow({ where: { userId } });
    expect(ledger).toMatchObject({
      delta: TASK_COMPLETION_EXP,
      reason: "DAILY_TASK_COMPLETION_EXP",
      sourceType: "daily_task_assignment",
      sourceId: "assignment-1",
    });
  });
});
```

- [ ] **Step 2: Run service tests and verify they fail**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts
```

Expected: FAIL because `lib/gamification/experience.ts` does not exist.

- [ ] **Step 3: Implement the service**

Create `lib/gamification/experience.ts` with these exports and behavior:

```ts
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma, type PrismaClientOrTransaction } from "@/lib/prisma";

export const TASK_COMPLETION_EXP = 50;
export const FITNESS_PUNCH_EXP = 100;
export const LEVEL_EXP_SIZE = 1000;

function runInTransaction<T>(
  db: PrismaClientOrTransaction,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if ("$transaction" in db) {
    return db.$transaction(callback);
  }

  return callback(db);
}

export function getUserLevelSnapshot(totalExp: number) {
  const normalizedExp = Math.max(0, Math.floor(totalExp));
  const level = Math.floor(normalizedExp / LEVEL_EXP_SIZE) + 1;

  return {
    totalExp: normalizedExp,
    level,
    currentLevelExp: normalizedExp % LEVEL_EXP_SIZE,
    nextLevelExp: LEVEL_EXP_SIZE,
    title: level >= 25 ? "卷王预备役" : level >= 10 ? "稳定脱脂牛马" : "自律牛马",
  };
}

export async function adjustExperience(input: {
  userId: string;
  teamId: string;
  dayKey: string;
  delta: number;
  reason: string;
  sourceType: string;
  sourceId: string;
  metadata?: unknown;
  db?: PrismaClientOrTransaction;
}) {
  const db = input.db ?? prisma;

  if (input.delta <= 0) {
    throw new Error("Experience delta must be positive");
  }

  try {
    return await runInTransaction(db, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { exp: true },
      });
      const balanceAfter = user.exp + input.delta;

      await tx.user.update({
        where: { id: input.userId },
        data: { exp: balanceAfter },
      });

      const ledger = await tx.experienceLedger.create({
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

      return { ledger, applied: true as const };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const ledger = await prisma.experienceLedger.findUniqueOrThrow({
        where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
      });
      return { ledger, applied: false as const };
    }

    throw error;
  }
}

export function grantTaskCompletionExperience(input: {
  userId: string;
  teamId: string;
  dayKey: string;
  assignmentId: string;
  db?: PrismaClientOrTransaction;
}) {
  return adjustExperience({
    ...input,
    delta: TASK_COMPLETION_EXP,
    reason: "DAILY_TASK_COMPLETION_EXP",
    sourceType: "daily_task_assignment",
    sourceId: input.assignmentId,
    metadata: { assignmentId: input.assignmentId },
  });
}

export function grantFitnessPunchExperience(input: {
  userId: string;
  teamId: string;
  dayKey: string;
  punchRecordId: string;
  db?: PrismaClientOrTransaction;
}) {
  return adjustExperience({
    ...input,
    delta: FITNESS_PUNCH_EXP,
    reason: "FITNESS_PUNCH_EXP",
    sourceType: "fitness_punch",
    sourceId: input.punchRecordId,
    metadata: { punchRecordId: input.punchRecordId },
  });
}
```

- [ ] **Step 4: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/gamification/experience.ts __tests__/gamification-experience.test.ts
git commit -m "feat: add gamification experience service"
```

## Task 4: EXP Integration In Tasks, Punch, And State

**Files:**

- Modify: `lib/gamification/tasks.ts`
- Modify: `app/api/board/punch/route.ts`
- Modify: `lib/gamification/state.ts`
- Modify: `lib/types.ts`
- Test: `__tests__/gamification-tasks.test.ts`
- Test: `__tests__/board-punch-api.test.ts`
- Test: `__tests__/gamification-state-api.test.ts`
- Test: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Add failing expectations**

In `__tests__/gamification-tasks.test.ts`, extend the task completion test that verifies completion text:

```ts
const userAfterCompletion = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
const expLedger = await prisma.experienceLedger.findFirstOrThrow({
  where: { userId, sourceType: "daily_task_assignment", sourceId: assignment.id },
});

expect(userAfterCompletion.exp).toBe(50);
expect(expLedger.reason).toBe("DAILY_TASK_COMPLETION_EXP");
```

In `"does not rewrite an already completed task"`, add:

```ts
expect(await prisma.experienceLedger.count({ where: { userId } })).toBe(1);
const userAfterDuplicate = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
expect(userAfterDuplicate.exp).toBe(50);
```

In `__tests__/board-punch-api.test.ts`, extend `"creates today's punch..."`:

```ts
const expLedger = await prisma.experienceLedger.findFirstOrThrow({
  where: { userId, sourceType: "fitness_punch", sourceId: record!.id },
});
expect(after.exp).toBe(before.exp + 100);
expect(expLedger.delta).toBe(100);
```

In `__tests__/gamification-state-api.test.ts`, extend the empty snapshot expectation:

```ts
expect(body.snapshot.profile).toMatchObject({
  totalExp: 0,
  level: 1,
  currentLevelExp: 0,
  nextLevelExp: 1000,
  title: "自律牛马",
});
```

In `__tests__/supply-station-shell.test.tsx`, update the local `buildSnapshot()` fixture to include:

```ts
profile: {
  totalExp: 0,
  level: 1,
  currentLevelExp: 0,
  nextLevelExp: 1000,
  title: "自律牛马",
},
```

- [ ] **Step 2: Run focused tests and verify failures**

Run:

```bash
npm test -- __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts
```

Expected: FAIL because task completion and punch do not grant EXP and state has no profile field.

- [ ] **Step 3: Add profile type**

In `lib/types.ts`, add:

```ts
export interface GamificationProfileSnapshot {
  totalExp: number;
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  title: string;
}
```

Add `profile: GamificationProfileSnapshot;` to `GamificationStateSnapshot`.

- [ ] **Step 4: Add profile mapping in state**

In `lib/gamification/state.ts`, select `exp: true` for the user and return:

```ts
profile: getUserLevelSnapshot(user.exp),
```

Import `getUserLevelSnapshot` from `lib/gamification/experience`.

- [ ] **Step 5: Grant task completion EXP only for newly completed tasks**

In `completeDailyTask()`, preserve the current completed guard. When `assignment.completedAt` is null, update it and call:

```ts
await grantTaskCompletionExperience({
  userId,
  teamId: assignment.teamId,
  dayKey,
  assignmentId: assignment.id,
});
```

The call must not run when the task was already completed before this request.

- [ ] **Step 6: Grant fitness punch EXP inside the punch transaction**

In `app/api/board/punch/route.ts`, after `punch` is created inside the POST transaction, call:

```ts
await grantFitnessPunchExperience({
  userId: user.id,
  teamId: user.teamId,
  dayKey: todayDayKey,
  punchRecordId: punch.id,
  db: tx,
});
```

Do not add EXP rollback to DELETE in this phase. Add a short code comment before DELETE's punch rollback transaction:

```ts
// Phase 3 records EXP as an achievement ledger; undoing a punch does not revoke EXP.
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/gamification/state.ts lib/gamification/tasks.ts app/api/board/punch/route.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
git commit -m "feat: grant exp from tasks and punches"
```

## Task 5: Shop Catalog Contract

**Files:**

- Create: `content/gamification/shop-catalog.ts`
- Test: `__tests__/gamification-shop-catalog.test.ts`

- [ ] **Step 1: Write failing catalog tests**

Create `__tests__/gamification-shop-catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getShopCatalogItems, getShopCatalogItem } from "@/content/gamification/shop-catalog";
import { getItemDefinition } from "@/lib/gamification/content";

describe("gamification shop catalog", () => {
  it("exposes the approved buyable item ids with prices and limits", () => {
    const items = getShopCatalogItems();
    expect(items.map((item) => item.itemId)).toEqual([
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
    expect(getShopCatalogItem("task_reroll_coupon")).toMatchObject({
      itemId: "task_reroll_coupon",
      priceCoins: 150,
      dailyLimit: 1,
    });
    expect(getShopCatalogItem("double_niuma_coupon")).toMatchObject({
      weeklyLimit: 1,
      priceCoins: 600,
    });
  });

  it("only references enabled content item definitions", () => {
    for (const item of getShopCatalogItems()) {
      const definition = getItemDefinition(item.itemId);
      expect(definition?.enabled, item.itemId).toBe(true);
      expect(item.priceCoins, item.itemId).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run catalog tests and verify they fail**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts
```

Expected: FAIL because `content/gamification/shop-catalog.ts` does not exist.

- [ ] **Step 3: Implement catalog**

Create `content/gamification/shop-catalog.ts`:

```ts
export interface ShopCatalogItem {
  itemId: string;
  priceCoins: number;
  dailyLimit?: number;
  weeklyLimit?: number;
}

const SHOP_CATALOG_ITEMS: ShopCatalogItem[] = [
  { itemId: "task_reroll_coupon", priceCoins: 150, dailyLimit: 1 },
  { itemId: "small_boost_coupon", priceCoins: 220, dailyLimit: 1 },
  { itemId: "fitness_leave_coupon", priceCoins: 260, dailyLimit: 1 },
  { itemId: "drink_water_ping", priceCoins: 80, dailyLimit: 2 },
  { itemId: "walk_ping", priceCoins: 80, dailyLimit: 2 },
  { itemId: "team_standup_ping", priceCoins: 180, dailyLimit: 1 },
  { itemId: "chat_ping", priceCoins: 90, dailyLimit: 2 },
  { itemId: "share_info_ping", priceCoins: 90, dailyLimit: 2 },
  { itemId: "team_broadcast_coupon", priceCoins: 200, dailyLimit: 1 },
  { itemId: "double_niuma_coupon", priceCoins: 600, weeklyLimit: 1 },
  { itemId: "season_sprint_coupon", priceCoins: 520, weeklyLimit: 1 },
  { itemId: "luckin_coffee_coupon", priceCoins: 500, dailyLimit: 1 },
];

export function getShopCatalogItems() {
  return SHOP_CATALOG_ITEMS;
}

export function getShopCatalogItem(itemId: string) {
  return SHOP_CATALOG_ITEMS.find((item) => item.itemId === itemId) ?? null;
}
```

- [ ] **Step 4: Run catalog tests**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add content/gamification/shop-catalog.ts __tests__/gamification-shop-catalog.test.ts
git commit -m "feat: add gamification shop catalog"
```

## Task 6: Shop Purchase Service

**Files:**

- Create: `lib/gamification/shop.ts`
- Test: `__tests__/gamification-shop.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `__tests__/gamification-shop.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { purchaseShopItem, ShopPurchaseError } from "@/lib/gamification/shop";
import { getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

describe("gamification shop purchase service", () => {
  const fixedNow = new Date("2026-05-25T09:00:00+08:00");
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deducts coins, increments inventory, and writes purchase audit", async () => {
    const result = await purchaseShopItem({
      userId,
      itemId: "task_reroll_coupon",
      now: fixedNow,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "task_reroll_coupon" } },
    });
    const purchase = await prisma.shopPurchase.findFirstOrThrow({ where: { userId } });

    expect(result.purchase.itemId).toBe("task_reroll_coupon");
    expect(user.coins).toBe(850);
    expect(inventory.quantity).toBe(1);
    expect(purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      dayKey: getShanghaiDayKey(fixedNow),
      weekKey: getShanghaiWeekKey(getShanghaiDayKey(fixedNow)),
      status: "SETTLED",
    });
  });

  it("rejects insufficient coins without changing inventory", async () => {
    await prisma.user.update({ where: { id: userId }, data: { coins: 10 } });

    await expect(
      purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_COINS" });

    expect(await prisma.inventoryItem.count({ where: { userId } })).toBe(0);
  });

  it("enforces daily and weekly purchase limits", async () => {
    await purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow });
    await expect(
      purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED" });

    await purchaseShopItem({ userId, itemId: "double_niuma_coupon", now: fixedNow });
    await expect(
      purchaseShopItem({
        userId,
        itemId: "double_niuma_coupon",
        now: new Date("2026-05-26T09:00:00+08:00"),
      }),
    ).rejects.toMatchObject({ code: "WEEKLY_LIMIT_REACHED" });
  });

  it("rejects unknown shop items", async () => {
    await expect(
      purchaseShopItem({ userId, itemId: "single_draw_guarantee_coupon", now: fixedNow }),
    ).rejects.toBeInstanceOf(ShopPurchaseError);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- __tests__/gamification-shop.test.ts
```

Expected: FAIL because `lib/gamification/shop.ts` does not exist.

- [ ] **Step 3: Implement shop service**

Create `lib/gamification/shop.ts` with:

```ts
import { getShopCatalogItem } from "@/content/gamification/shop-catalog";
import { getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
import { prisma } from "@/lib/prisma";

export class ShopPurchaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = "ShopPurchaseError";
  }
}

export async function purchaseShopItem(input: {
  userId: string;
  itemId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const weekKey = getShanghaiWeekKey(dayKey);
  const catalogItem = getShopCatalogItem(input.itemId);
  const definition = getItemDefinition(input.itemId);

  if (!catalogItem || !definition || !definition.enabled) {
    throw new ShopPurchaseError("这个商品不存在或已下架。", "ITEM_NOT_BUYABLE", 404);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true, coins: true },
    });

    if (!user) {
      throw new ShopPurchaseError("用户不存在。", "UNAUTHORIZED", 401);
    }

    if (catalogItem.dailyLimit) {
      const dailyCount = await tx.shopPurchase.count({
        where: { userId: input.userId, itemId: input.itemId, dayKey, status: "SETTLED" },
      });
      if (dailyCount >= catalogItem.dailyLimit) {
        throw new ShopPurchaseError("今天这个商品已经买到上限。", "DAILY_LIMIT_REACHED");
      }
    }

    if (catalogItem.weeklyLimit) {
      const weeklyCount = await tx.shopPurchase.count({
        where: { userId: input.userId, itemId: input.itemId, weekKey, status: "SETTLED" },
      });
      if (weeklyCount >= catalogItem.weeklyLimit) {
        throw new ShopPurchaseError("本周这个商品已经买到上限。", "WEEKLY_LIMIT_REACHED");
      }
    }

    if (user.coins < catalogItem.priceCoins) {
      throw new ShopPurchaseError("银子不足。", "INSUFFICIENT_COINS");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { coins: { decrement: catalogItem.priceCoins } },
    });

    await tx.inventoryItem.upsert({
      where: { userId_itemId: { userId: input.userId, itemId: input.itemId } },
      create: { userId: input.userId, teamId: user.teamId, itemId: input.itemId, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });

    const purchase = await tx.shopPurchase.create({
      data: {
        userId: input.userId,
        teamId: user.teamId,
        itemId: input.itemId,
        quantity: 1,
        unitPriceCoins: catalogItem.priceCoins,
        totalPriceCoins: catalogItem.priceCoins,
        dayKey,
        weekKey,
        status: "SETTLED",
        metadataJson: JSON.stringify({
          itemName: definition.name,
          category: definition.category,
          requiresAdminConfirmation: definition.requiresAdminConfirmation,
        }),
      },
    });

    return { purchase };
  });
}
```

- [ ] **Step 4: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-shop.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/gamification/shop.ts __tests__/gamification-shop.test.ts
git commit -m "feat: add gamification shop purchase service"
```

## Task 7: Shop Purchase API And Client Helper

**Files:**

- Create: `app/api/gamification/shop/purchase/route.ts`
- Modify: `lib/api.ts`
- Test: `__tests__/gamification-shop-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `__tests__/gamification-shop-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/shop/purchase/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string, body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/gamification/shop/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/shop/purchase", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { itemId: "task_reroll_coupon" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when itemId is missing", async () => {
    const response = await POST(request(userId, {}));
    expect(response.status).toBe(400);
  });

  it("purchases an item and returns purchase plus snapshot", async () => {
    const response = await POST(request(userId, { itemId: "task_reroll_coupon" }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.purchase).toMatchObject({ itemId: "task_reroll_coupon", totalPriceCoins: 150 });
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.backpack.totalQuantity).toBe(1);
  });
});
```

- [ ] **Step 2: Run API test and verify failure**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement API route**

Create `app/api/gamification/shop/purchase/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { purchaseShopItem, ShopPurchaseError } from "@/lib/gamification/shop";
import { buildGamificationStateForUser } from "@/lib/gamification/state";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as { itemId?: string };

    if (!payload.itemId) {
      return NextResponse.json({ error: "缺少商品 ID" }, { status: 400 });
    }

    const result = await purchaseShopItem({ userId, itemId: payload.itemId });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ purchase: result.purchase, snapshot });
  } catch (error) {
    if (error instanceof ShopPurchaseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Add client helper**

In `lib/api.ts`, add:

```ts
export async function purchaseGamificationShopItem(itemId: string): Promise<{
  purchase: {
    id: string;
    itemId: string;
    totalPriceCoins: number;
  };
  snapshot: GamificationStateSnapshot;
}> {
  const response = await fetch("/api/gamification/shop/purchase", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId }),
  });

  return readApiResult(response, "购买补给响应解析失败");
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/gamification/shop/purchase/route.ts lib/api.ts __tests__/gamification-shop-api.test.ts
git commit -m "feat: add gamification shop purchase api"
```

## Task 8: Production Supply View-Model Foundation

**Files:**

- Modify: `lib/types.ts`
- Create: `lib/gamification/supply-view-model.ts`
- Test: `__tests__/supply-production-view-model.test.ts`

- [ ] **Step 1: Write failing view-model tests**

Create `__tests__/supply-production-view-model.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import { ensureTodayTaskAssignments } from "@/lib/gamification/tasks";
import { prisma } from "@/lib/prisma";

describe("supply production view model", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await prisma.user.update({ where: { id: userId }, data: { coins: 2450, ticketBalance: 18, exp: 2720 } });
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 2 },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("maps real state into the production supply snapshot", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId);

    expect(snapshot).toMatchObject({
      currentUserId: userId,
      teamId,
      resources: {
        coins: { label: "银子", value: 2450 },
        ticket: { label: "抽奖券", value: 18 },
        backpack: { label: "背包", value: 2, maxValue: 60 },
      },
      profile: {
        level: 3,
        totalExp: 2720,
        currentLevelExp: 720,
        nextLevelExp: 1000,
      },
    });
    expect(snapshot.dashboard.dailyQuests).toHaveLength(4);
    expect(snapshot.backpack.capacity.totalSlots).toBe(60);
    expect(snapshot.shop.products.length).toBeGreaterThan(0);
    expect(snapshot.drawPool.wallet.ticketBalance).toBe(18);
    expect(snapshot.taskRecord.dates).toHaveLength(7);
  });

  it("returns null for an unknown user", async () => {
    await expect(buildSupplyStationViewModelForUser("missing-user")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-view-model.test.ts
```

Expected: FAIL because `supply-view-model.ts` and new types do not exist.

- [ ] **Step 3: Add production view-model types**

In `lib/types.ts`, add `SupplyStationProductionSnapshot` and child interfaces. Include these required fields:

```ts
export interface SupplyResourceSnapshot {
  label: "银子" | "抽奖券" | "背包";
  value: number;
  maxValue?: number;
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
    products: Array<{
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
    }>;
  };
  taskRecord: SupplyTaskRecordSnapshot;
  social: GamificationSocialSummary;
  redemptions: GamificationRedemptionSectionSnapshot;
}

export interface SupplyTaskRecordSnapshot {
  dates: Array<{ key: string; label: string; dateLabel: string; weekday: string }>;
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
```

- [ ] **Step 4: Implement minimal mapper**

Create `lib/gamification/supply-view-model.ts` that:

- Calls `buildGamificationStateForUser(userId, now)`.
- Loads user `username`, `avatarKey`, `coins`, `ticketBalance`, `exp`.
- Uses fixed backpack capacity `60`.
- Uses `getShopCatalogItems()` and item definitions for products.
- Uses a temporary empty task record list with seven date entries until Task 14 adds the full aggregator.

The mapper must return `Promise<SupplyStationProductionSnapshot | null>`.

- [ ] **Step 5: Run view-model test**

Run:

```bash
npm test -- __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/gamification/supply-view-model.ts __tests__/supply-production-view-model.test.ts
git commit -m "feat: add supply production view model"
```

## Task 9: Production Supply State API

**Files:**

- Create: `app/api/gamification/supply/state/route.ts`
- Modify: `lib/api.ts`
- Test: `__tests__/gamification-supply-state-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `__tests__/gamification-supply-state-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/supply/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/supply/state", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/gamification/supply/state", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("ensures today's tasks and returns production supply snapshot", async () => {
    const response = await GET(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.dayKey).toBe(getShanghaiDayKey());
    expect(body.snapshot.dashboard.dailyQuests).toHaveLength(4);
    expect(body.snapshot.resources.coins.label).toBe("银子");
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- __tests__/gamification-supply-state-api.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement route**

Create `app/api/gamification/supply/state/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { ensureTodayTaskAssignments } from "@/lib/gamification/tasks";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";

export async function GET(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    await ensureTodayTaskAssignments({ userId });
    const snapshot = await buildSupplyStationViewModelForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Add client helper**

In `lib/api.ts`, import `SupplyStationProductionSnapshot` and add:

```ts
export async function fetchSupplyStationState(): Promise<SupplyStationProductionSnapshot> {
  const response = await fetch("/api/gamification/supply/state", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{ snapshot: SupplyStationProductionSnapshot }>(
    response,
    "获取牛马补给站失败",
  );

  return payload.snapshot;
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/gamification/supply/state/route.ts lib/api.ts __tests__/gamification-supply-state-api.test.ts
git commit -m "feat: add supply production state api"
```

## Task 10: Production Dashboard Panel

**Files:**

- Create: `components/gamification/production/SupplyDashboardPanel.tsx`
- Test: `__tests__/supply-production-dashboard-panel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `__tests__/supply-production-dashboard-panel.test.tsx` with a fixture `SupplyStationProductionSnapshot` and assertions:

```ts
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyDashboardPanel } from "@/components/gamification/production/SupplyDashboardPanel";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-25",
  resources: {
    coins: { label: "银子", value: 2450 },
    ticket: { label: "抽奖券", value: 18 },
    backpack: { label: "背包", value: 2, maxValue: 60 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 2720,
    level: 3,
    currentLevelExp: 720,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "动一动",
        description: "movement",
        assignment: {
          id: "a1",
          taskCardId: "movement_001",
          title: "工位重启",
          description: "站起来",
          status: "pending",
          completedAt: null,
          completionText: null,
          rerollCount: 0,
          rerollLimit: 1,
          canComplete: true,
          canReroll: true,
        },
      },
    ],
  },
} as SupplyStationProductionSnapshot;

describe("SupplyDashboardPanel", () => {
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

  it("renders production resources, profile, and task actions", async () => {
    const onComplete = vi.fn();
    const onReroll = vi.fn();

    await act(async () => {
      root.render(
        <SupplyDashboardPanel
          snapshot={snapshot}
          activeAction={null}
          onCompleteTask={onComplete}
          onRerollTask={onReroll}
          onClaimTicket={vi.fn()}
          onNavigate={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("Lv.3");
    expect(container.textContent).toContain("720/1000");
    expect(container.textContent).toContain("工位重启");

    const completeButton = container.querySelector<HTMLButtonElement>("[data-action='complete-task']");
    completeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onComplete).toHaveBeenCalledWith("movement");
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement component**

Create `components/gamification/production/SupplyDashboardPanel.tsx`:

- Render profile level and EXP.
- Render resource cards using `snapshot.resources`.
- Render `snapshot.dashboard.dailyQuests`.
- Add buttons with `data-action="complete-task"`, `data-action="reroll-task"`, and `data-action="claim-ticket"`.
- Do not import `components/gamification/ui-lab/*/mock-data`.
- Use existing UI Lab CSS class names only where they describe visual primitives, not mock state.

- [ ] **Step 4: Run component test**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/gamification/production/SupplyDashboardPanel.tsx __tests__/supply-production-dashboard-panel.test.tsx
git commit -m "feat: add production supply dashboard panel"
```

## Task 11: Production Draw Pool Panel

**Files:**

- Create: `components/gamification/production/SupplyDrawPoolPanel.tsx`
- Test: `__tests__/supply-production-draw-pool-panel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create tests that render a fixture with `drawPool.wallet.ticketBalance = 8`, `drawPool.lottery.tenDrawTopUpRequired = 2`, and assert:

```ts
expect(container.textContent).toContain("抽奖券");
expect(container.textContent).toContain("单抽");
expect(container.textContent).toContain("补券十连");
expect(container.textContent).toContain("十连保底");
```

Click assertions:

```ts
container.querySelector<HTMLButtonElement>("[data-action='draw-single']")?.click();
expect(onDraw).toHaveBeenCalledWith("SINGLE", false);

container.querySelector<HTMLButtonElement>("[data-action='draw-ten']")?.click();
expect(onDraw).toHaveBeenCalledWith("TEN", true);
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-draw-pool-panel.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement component**

Create `SupplyDrawPoolPanel` with props:

```ts
export function SupplyDrawPoolPanel({
  snapshot,
  latestDraw,
  activeAction,
  onDraw,
}: {
  snapshot: SupplyStationProductionSnapshot;
  latestDraw: GamificationLotteryDrawSnapshot | null;
  activeAction: string | null;
  onDraw: (drawType: "SINGLE" | "TEN", useCoinTopUp: boolean) => void;
}) {
  // render implementation
}
```

Use `snapshot.drawPool.lottery.singleDrawEnabled`, `tenDrawEnabled`, `tenDrawTopUpRequired`, and `message` for button states and helper text.

- [ ] **Step 4: Run component test**

Run:

```bash
npm test -- __tests__/supply-production-draw-pool-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/gamification/production/SupplyDrawPoolPanel.tsx __tests__/supply-production-draw-pool-panel.test.tsx
git commit -m "feat: add production supply draw pool panel"
```

## Task 12: Production Backpack Panel

**Files:**

- Create: `components/gamification/production/SupplyBackpackPanel.tsx`
- Test: `__tests__/supply-production-backpack-panel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Test requirements:

- Renders fixed capacity `2/60`.
- Renders inventory items from `snapshot.backpack.groups`.
- Selecting an item displays description, timing, effect, limit and action.
- Clicking a regular item calls `onUseItem(itemId, target)`.
- Clicking real-world item calls `onRequestRedemption(itemId)`.

Use these selectors:

```ts
"[data-testid='supply-backpack-item']"
"[data-action='use-item']"
"[data-action='request-redemption']"
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-backpack-panel.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement component**

Create `SupplyBackpackPanel` with props:

```ts
export function SupplyBackpackPanel({
  snapshot,
  activeAction,
  selectedItemId,
  onSelectItem,
  onUseItem,
  onRequestRedemption,
}: {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUseItem: (itemId: string, target?: { dimensionKey?: string; recipientUserId?: string; message?: string }) => void;
  onRequestRedemption: (itemId: string) => void;
}) {
  // render implementation
}
```

Reuse production snapshot fields only. Do not import `supplyBackpackMock`.

- [ ] **Step 4: Run component test**

Run:

```bash
npm test -- __tests__/supply-production-backpack-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/gamification/production/SupplyBackpackPanel.tsx __tests__/supply-production-backpack-panel.test.tsx
git commit -m "feat: add production supply backpack panel"
```

## Task 13: Production Shop Panel

**Files:**

- Create: `components/gamification/production/SupplyShopPanel.tsx`
- Test: `__tests__/supply-production-shop-panel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Test requirements:

- Renders products from `snapshot.shop.products`.
- Renders price as `银子 {priceCoins}`.
- Renders owned quantity and limit labels.
- Disabled products expose disabled button reason.
- Clicking enabled purchase button calls `onPurchase(itemId)`.

Use:

```ts
"[data-testid='supply-shop-product']"
"[data-action='purchase-shop-item']"
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-shop-panel.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement component**

Create `SupplyShopPanel` with props:

```ts
export function SupplyShopPanel({
  snapshot,
  activeAction,
  selectedItemId,
  onSelectItem,
  onPurchase,
}: {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onPurchase: (itemId: string) => void;
}) {
  // render implementation
}
```

Filter/category state can be local component state. Purchase state must come from `snapshot.shop.products`.

- [ ] **Step 4: Run component test**

Run:

```bash
npm test -- __tests__/supply-production-shop-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/gamification/production/SupplyShopPanel.tsx __tests__/supply-production-shop-panel.test.tsx
git commit -m "feat: add production supply shop panel"
```

## Task 14: Task Record Aggregator

**Files:**

- Create: `lib/gamification/task-records.ts`
- Modify: `lib/gamification/supply-view-model.ts`
- Test: `__tests__/gamification-task-records.test.ts`
- Test: `__tests__/supply-production-view-model.test.ts`

- [ ] **Step 1: Write failing aggregator tests**

Create `__tests__/gamification-task-records.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildSupplyTaskRecordSnapshot } from "@/lib/gamification/task-records";
import { prisma } from "@/lib/prisma";

describe("supply task record aggregator", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.experienceLedger.create({
      data: {
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 50,
        balanceAfter: 50,
        reason: "DAILY_TASK_COMPLETION_EXP",
        sourceType: "daily_task_assignment",
        sourceId: "assignment-1",
        createdAt: new Date("2026-05-25T09:00:00+08:00"),
      },
    });
    await prisma.shopPurchase.create({
      data: {
        userId,
        teamId,
        itemId: "task_reroll_coupon",
        quantity: 1,
        unitPriceCoins: 150,
        totalPriceCoins: 150,
        dayKey: "2026-05-25",
        weekKey: "2026-W22",
        status: "SETTLED",
        createdAt: new Date("2026-05-25T10:00:00+08:00"),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("builds seven date tabs and timeline rows from real tables", async () => {
    const snapshot = await buildSupplyTaskRecordSnapshot({
      userId,
      teamId,
      now: new Date("2026-05-25T12:00:00+08:00"),
    });

    expect(snapshot.dates).toHaveLength(7);
    expect(snapshot.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "exp", title: expect.stringContaining("EXP") }),
        expect.objectContaining({ category: "shop", title: expect.stringContaining("购买") }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- __tests__/gamification-task-records.test.ts
```

Expected: FAIL because `task-records.ts` does not exist.

- [ ] **Step 3: Implement aggregator**

Create `lib/gamification/task-records.ts` with `buildSupplyTaskRecordSnapshot({ userId, teamId, now })`. It must:

- Produce seven date entries ending at `getShanghaiDayKey(now)`.
- Query `DailyTaskAssignment`, `LotteryDraw`, `LotteryTicketLedger`, `ExperienceLedger`, `ShopPurchase`, `ItemUseRecord`, `RealWorldRedemption`, `SocialInvitation`, and `SocialInvitationResponse` for those days.
- Normalize each row to `SupplyTaskRecordSnapshot["timeline"][number]`.
- Sort timeline by `occurredAt` descending.

Use Chinese labels:

- EXP row: `获得 EXP`
- Shop row: `购买补给`
- Draw row: `补给抽卡`
- Redemption row: `真实福利兑换`
- Social row: `队友雷达`

- [ ] **Step 4: Wire aggregator into view-model**

In `lib/gamification/supply-view-model.ts`, replace the temporary task record object with:

```ts
taskRecord: await buildSupplyTaskRecordSnapshot({
  userId: user.id,
  teamId: user.teamId,
  now,
}),
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/gamification/task-records.ts lib/gamification/supply-view-model.ts __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts
git commit -m "feat: add supply task record aggregator"
```

## Task 15: Production Task Record Panel

**Files:**

- Create: `components/gamification/production/SupplyTaskRecordPanel.tsx`
- Test: `__tests__/supply-production-task-record-panel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Test requirements:

- Renders recent seven date tabs.
- Renders timeline rows grouped by selected date.
- Can switch modes: `today`, `draws`, `redemptions`, `radar`, `rules`.
- In radar mode, received pending invitations expose response buttons.
- Does not expose `team-goal`.

Use selectors:

```ts
"[data-testid='supply-task-record-date']"
"[data-testid='supply-task-record-row']"
"[data-action='respond-social-invitation']"
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-task-record-panel.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement component**

Create `SupplyTaskRecordPanel` with props:

```ts
export function SupplyTaskRecordPanel({
  snapshot,
  activeAction,
  onRespondSocialInvitation,
}: {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: string | null;
  onRespondSocialInvitation: (invitationId: string) => void;
}) {
  // render implementation
}
```

Use local state for active mode and selected date. Read timeline from `snapshot.taskRecord`.

- [ ] **Step 4: Run component test**

Run:

```bash
npm test -- __tests__/supply-production-task-record-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/gamification/production/SupplyTaskRecordPanel.tsx __tests__/supply-production-task-record-panel.test.tsx
git commit -m "feat: add production supply task record panel"
```

## Task 16: Production Shell And Mutation Wiring

**Files:**

- Create: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `components/gamification/SupplyStation.tsx`
- Modify: `lib/api.ts`
- Test: `__tests__/supply-production-shell.test.tsx`
- Test: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Write failing shell test**

Create `__tests__/supply-production-shell.test.tsx` that stubs `fetch` and asserts:

- Initial load calls `/api/gamification/supply/state`.
- Completing task calls `/api/gamification/tasks/complete`.
- Drawing calls `/api/gamification/lottery/draw`.
- Purchasing calls `/api/gamification/shop/purchase`.
- The old route export `components/gamification/SupplyStation.tsx` renders the production shell.

Use this first assertion:

```ts
expect(fetch).toHaveBeenNthCalledWith(
  1,
  "/api/gamification/supply/state",
  expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
);
```

- [ ] **Step 2: Run shell test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx
```

Expected: FAIL because production shell is not wired.

- [ ] **Step 3: Implement shell**

Create `SupplyStationShell` as a client component. It owns:

- `snapshot: SupplyStationProductionSnapshot | null`
- `activePanel: "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord"`
- `activeAction: string | null`
- `latestDraw`
- selected backpack and shop item ids
- error and success messages

Use existing helpers:

- `fetchSupplyStationState()`
- `completeGamificationTask()`
- `rerollGamificationTask()`
- `claimGamificationLifeTicket()`
- `drawGamificationLottery()`
- `useGamificationItem()`
- `respondToSocialInvitation()`
- `requestRealWorldRedemption()`
- `confirmRealWorldRedemption()`
- `cancelRealWorldRedemption()`
- `purchaseGamificationShopItem()`

After each mutation, update local snapshot from the mutation result when it returns a compatible snapshot. If the mutation returns `GamificationStateSnapshot`, call `fetchSupplyStationState()` once to refresh the production view-model.

- [ ] **Step 4: Replace entry component**

Replace `components/gamification/SupplyStation.tsx` contents with:

```tsx
"use client";

export { SupplyStationShell as SupplyStation } from "@/components/gamification/production/SupplyStationShell";
```

Keep old tests that import `SupplyStation` passing by updating assertions to production UI vocabulary where necessary.

- [ ] **Step 5: Run shell tests**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/gamification/production/SupplyStationShell.tsx components/gamification/SupplyStation.tsx lib/api.ts __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx
git commit -m "feat: wire production supply station shell"
```

## Task 17: UI Lab And Production Isolation Regression

**Files:**

- Create: `__tests__/supply-production-isolation.test.ts`
- Modify: existing UI Lab tests only when a focused isolation test identifies a stale import path

- [ ] **Step 1: Write isolation tests**

Create `__tests__/supply-production-isolation.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const productionFiles = [
  "components/gamification/SupplyStation.tsx",
  "components/gamification/production/SupplyStationShell.tsx",
  "components/gamification/production/SupplyDashboardPanel.tsx",
  "components/gamification/production/SupplyDrawPoolPanel.tsx",
  "components/gamification/production/SupplyBackpackPanel.tsx",
  "components/gamification/production/SupplyShopPanel.tsx",
  "components/gamification/production/SupplyTaskRecordPanel.tsx",
  "lib/gamification/supply-view-model.ts",
];

describe("supply production isolation", () => {
  it("does not import UI Lab mock data into production code", () => {
    for (const file of productionFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("mock-data");
      expect(source, file).not.toContain("supplyDashboardMock");
      expect(source, file).not.toContain("supplyShopMock");
      expect(source, file).not.toContain("supplyBackpackMock");
      expect(source, file).not.toContain("supplyTaskRecordMock");
      expect(source, file).not.toContain("supplyDrawPoolMock");
    }
  });

  it("keeps team goal out of production flow", () => {
    for (const file of productionFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("team-goal");
      expect(source, file).not.toContain("团队目标");
    }
  });
});
```

- [ ] **Step 2: Run isolation tests**

Run:

```bash
npm test -- __tests__/supply-production-isolation.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/supply-production-isolation.test.ts
git commit -m "test: guard supply production ui isolation"
```

## Task 18: Final Verification And Release Readiness

**Files:**

- Modify only files required by failures found during verification.

- [ ] **Step 1: Run focused supply tests**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-catalog.test.ts __tests__/gamification-shop.test.ts __tests__/gamification-shop-api.test.ts __tests__/gamification-task-records.test.ts __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts __tests__/supply-production-dashboard-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-shop-panel.test.tsx __tests__/supply-production-task-record-panel.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-production-isolation.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related regression tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts __tests__/gamification-tasks.test.ts __tests__/gamification-tasks-api.test.ts __tests__/gamification-lottery.test.ts __tests__/gamification-lottery-api.test.ts __tests__/gamification-item-use.test.ts __tests__/gamification-item-use-api.test.ts __tests__/gamification-redemptions.test.ts __tests__/gamification-redemption-api.test.ts __tests__/gamification-social-invitations.test.ts __tests__/gamification-social-respond-api.test.ts __tests__/board-punch-api.test.ts __tests__/board-punch-fitness-ticket.test.ts __tests__/seed.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run typecheck and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass.

- [ ] **Step 4: Browser QA**

Start dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3001
```

Manual checks:

- Login as `li / 0000`.
- Open 补给站.
- Dashboard shows 银子, 抽奖券, 背包, Lv/EXP.
- Complete a task, reroll a task, claim task ticket.
- Draw single and ten draw.
- Use a backpack item.
- Buy `任务换班券` in shop and confirm inventory increases.
- Open task record and confirm EXP/shop/draw/task rows appear.
- Confirm no production link shows `团队目标`.

- [ ] **Step 5: Commit verification fixes**

If verification required changes:

```bash
git add <changed-files>
git commit -m "fix: stabilize supply production integration"
```

If no changes were required, do not create an empty commit.

## Execution Order

Implement tasks in order. Tasks 2 through 7 must land before production UI work because the view-model depends on new schema and services. Tasks 10 through 15 can be split among subagents after Task 9 is complete because each panel has its own component and tests. Task 16 must run after all panels exist.

## Coverage Checklist

- [ ] `team-goal` absent from production flow.
- [ ] `coins` database field retained.
- [ ] UI resource label uses `银子`.
- [ ] EXP and level backed by `User.exp` and `ExperienceLedger`.
- [ ] Shop purchase backed by `ShopPurchase`.
- [ ] Backpack capacity fixed at `60`.
- [ ] Production UI does not import UI Lab mock data.
- [ ] UI Lab routes remain isolated.
- [ ] All listed focused tests pass.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
