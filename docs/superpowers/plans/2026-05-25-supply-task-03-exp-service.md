# Supply Task 03 EXP Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reusable EXP service that derives levels, writes idempotent EXP ledger rows, and prepares task/punch EXP integration for the next task.

**Architecture:** Keep EXP business rules in one focused module under `lib/gamification/experience.ts`. The service updates `User.exp` and `ExperienceLedger` together, supports caller-provided Prisma transactions, and returns whether a grant was newly applied or skipped as an idempotent duplicate.

**Tech Stack:** Next.js 15 App Router repository, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-03-exp-service-design.md`

This task only creates the EXP service and focused tests. It does not integrate EXP grants into task completion, board punch, state snapshots, API routes, or UI.

## File Structure

- Create: `lib/gamification/experience.ts`
  - EXP constants.
  - `ExperienceError`.
  - Level snapshot mapper.
  - Idempotent `adjustExperience()`.
  - Task completion and fitness punch helper functions.
- Create: `__tests__/gamification-experience.test.ts`
  - Covers level math, ledger writes, idempotency, source metadata, and invalid deltas.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-03-exp-service-design.md`
  - Task-level design.
- Add: `docs/superpowers/plans/2026-05-25-supply-task-03-exp-service.md`
  - This implementation plan.

## Task 1: Service Contract Tests

**Files:**
- Create: `__tests__/gamification-experience.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/gamification-experience.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  ExperienceError,
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
      totalExp: 25_000,
      level: 26,
      currentLevelExp: 0,
      title: "卷王预备役",
    });
    expect(getUserLevelSnapshot(-1.2)).toMatchObject({
      totalExp: 0,
      level: 1,
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
      metadata: { punchRecordId: "punch-1" },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledger = await prisma.experienceLedger.findUniqueOrThrow({
      where: { sourceType_sourceId: { sourceType: "fitness_punch", sourceId: "punch-1" } },
    });

    expect(result.applied).toBe(true);
    expect(user.exp).toBe(100);
    expect(ledger.balanceAfter).toBe(100);
    expect(ledger.metadataJson).toBe(JSON.stringify({ punchRecordId: "punch-1" }));
  });

  it("is idempotent by source type and source id", async () => {
    const first = await grantFitnessPunchExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      punchRecordId: "punch-1",
    });
    const second = await grantFitnessPunchExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      punchRecordId: "punch-1",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.experienceLedger.findMany({ where: { userId } });

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.ledger.id).toBe(first.ledger.id);
    expect(user.exp).toBe(FITNESS_PUNCH_EXP);
    expect(ledgers).toHaveLength(1);
  });

  it("can run inside a caller-provided transaction", async () => {
    const result = await prisma.$transaction((tx) =>
      adjustExperience({
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 25,
        reason: "TEST_TRANSACTION",
        sourceType: "test_transaction",
        sourceId: "transaction-1",
        db: tx,
      }),
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(result.applied).toBe(true);
    expect(user.exp).toBe(25);
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
      balanceAfter: TASK_COMPLETION_EXP,
    });
  });

  it("rejects non-positive exp deltas", async () => {
    await expect(
      adjustExperience({
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 0,
        reason: "NOOP",
        sourceType: "noop",
        sourceId: "noop-1",
      }),
    ).rejects.toBeInstanceOf(ExperienceError);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts
```

Expected: FAIL because `lib/gamification/experience.ts` does not exist.

## Task 2: EXP Service Implementation

**Files:**
- Create: `lib/gamification/experience.ts`

- [ ] **Step 1: Implement the service**

Create `lib/gamification/experience.ts`:

```typescript
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma, type PrismaClientOrTransaction } from "@/lib/prisma";

export const TASK_COMPLETION_EXP = 50;
export const FITNESS_PUNCH_EXP = 100;
export const LEVEL_EXP_SIZE = 1000;

export class ExperienceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperienceError";
  }
}

function isPrismaClient(db: PrismaClientOrTransaction): db is typeof prisma {
  return "$transaction" in db;
}

async function runInTransaction<T>(
  db: PrismaClientOrTransaction,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (isPrismaClient(db)) {
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
  if (input.delta <= 0) {
    throw new ExperienceError("Experience delta must be positive");
  }

  const db = input.db ?? prisma;

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
      const ledger = await db.experienceLedger.findUniqueOrThrow({
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

- [ ] **Step 2: Run the focused service test**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts
```

Expected: PASS.

## Task 3: Review And Commit

**Files:**
- Add: `docs/superpowers/specs/2026-05-25-supply-task-03-exp-service-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-03-exp-service.md`
- Add: `__tests__/gamification-experience.test.ts`
- Add: `lib/gamification/experience.ts`

- [ ] **Step 1: Review changed files**

Run:

```bash
git status --short
git diff -- docs/superpowers/specs/2026-05-25-supply-task-03-exp-service-design.md docs/superpowers/plans/2026-05-25-supply-task-03-exp-service.md __tests__/gamification-experience.test.ts lib/gamification/experience.ts
```

Expected: only Task 3 files are changed.

- [ ] **Step 2: Commit Task 3**

Run:

```bash
git add docs/superpowers/specs/2026-05-25-supply-task-03-exp-service-design.md docs/superpowers/plans/2026-05-25-supply-task-03-exp-service.md __tests__/gamification-experience.test.ts lib/gamification/experience.ts
git commit -m "feat: add gamification experience service"
```

Expected: commit succeeds.

## Completion Criteria

Task 3 is complete when:

- Task 3 spec and plan exist.
- `lib/gamification/experience.ts` exists and exports the planned API.
- Focused service tests pass.
- No task completion, board punch, state snapshot, API route, or UI production integration is included in this commit.
- Changes are committed.
