# GM-04 Daily Tasks and Life Ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `牛马补给站` four-dimension task loop usable: generate today's tasks, complete tasks, reroll one task per dimension, and claim one life ticket after all four tasks are complete.

**Architecture:** Add a focused `lib/gamification/tasks.ts` service layer for all daily task mutations, keep `GET /api/gamification/state` read-only, and expose task actions through dedicated POST routes. Reuse GM-01 local content, GM-02 task/ticket tables, and GM-03 snapshot/page shell.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, React 19, Tailwind CSS v4.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Upgrade `LotteryTicketLedger` source dedupe from index to unique constraint if GM-02 did not already do this.
- Modify: `lib/types.ts`
  - Extend gamification task assignment and ticket summary snapshot fields.
- Modify: `lib/gamification/state.ts`
  - Include completion text, reroll state, task progress count, and life-ticket claimable state.
- Create: `lib/gamification/tasks.ts`
  - Service functions for ensure, complete, reroll, and claim.
- Create: `app/api/gamification/tasks/ensure-today/route.ts`
  - Idempotently create today's assignments and return snapshot.
- Create: `app/api/gamification/tasks/complete/route.ts`
  - Mark one dimension complete and return snapshot.
- Create: `app/api/gamification/tasks/reroll/route.ts`
  - Reroll one incomplete dimension task and return snapshot.
- Create: `app/api/gamification/tasks/claim-ticket/route.ts`
  - Claim the daily life ticket and return snapshot.
- Modify: `lib/api.ts`
  - Add client helpers for task actions.
- Modify: `components/gamification/SupplyStation.tsx`
  - Load tasks through `ensure-today`, enable complete/reroll/claim actions, and keep lottery/backpack/social placeholders.
- Create: `__tests__/gamification-tasks.test.ts`
  - Service tests for task generation, completion, reroll, and ticket claim.
- Create: `__tests__/gamification-tasks-api.test.ts`
  - API tests for authenticated actions and response snapshots.
- Modify: `__tests__/supply-station-shell.test.tsx`
  - Update component tests from placeholder-only to interactive four-task flow.

## Implementation Rules

- Keep `GET /api/gamification/state` read-only.
- Do not modify `POST /api/board/punch`.
- Do not grant fitness tickets in GM-04.
- Do not create punch records, season contribution, activity events, or coin rewards.
- Do not implement lottery draw actions.
- Do not consume inventory items for reroll.
- Do not send enterprise WeChat messages.
- Every successful mutation returns `{ snapshot }`.

---

### Task 1: Add Failing Service Tests

**Files:**
- Create: `__tests__/gamification-tasks.test.ts`

- [ ] **Step 1: Write service tests**

Create `__tests__/gamification-tasks.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getShanghaiDayKey } from "@/lib/economy";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";
import {
  claimDailyTasksTicket,
  completeDailyTask,
  ensureTodayTaskAssignments,
  rerollDailyTask,
} from "@/lib/gamification/tasks";

describe("gamification daily tasks", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
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
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("creates one assignment for each dimension and is idempotent", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await ensureTodayTaskAssignments({ userId, rng: () => 0.99 });

    const assignments = await prisma.dailyTaskAssignment.findMany({
      where: { userId, dayKey },
      orderBy: { dimensionKey: "asc" },
    });

    expect(assignments).toHaveLength(4);
    expect(new Set(assignments.map((assignment) => assignment.dimensionKey))).toEqual(
      new Set(["movement", "hydration", "social", "learning"]),
    );
    expect(assignments.every((assignment) => assignment.teamId === teamId)).toBe(true);
    expect(assignments.every((assignment) => assignment.rerollCount === 0)).toBe(true);
  });

  it("marks a dimension task complete with optional completion text", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });

    await completeDailyTask({
      userId,
      dimensionKey: "movement",
      completionText: "屁股离线",
    });

    const assignment = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    expect(assignment.completedAt).toBeInstanceOf(Date);
    expect(assignment.completionText).toBe("屁股离线");
  });

  it("does not rewrite an already completed task", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await completeDailyTask({
      userId,
      dimensionKey: "movement",
      completionText: "第一次",
    });
    const before = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    await completeDailyTask({
      userId,
      dimensionKey: "movement",
      completionText: "第二次",
    });

    const after = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    expect(after.completedAt?.toISOString()).toBe(before.completedAt?.toISOString());
    expect(after.completionText).toBe("第一次");
  });

  it("rerolls an incomplete task once per dimension", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    const before = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    await rerollDailyTask({
      userId,
      dimensionKey: "movement",
      rng: () => 0.99,
    });

    const after = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    expect(after.taskCardId).not.toBe(before.taskCardId);
    expect(after.rerollCount).toBe(1);
    expect(after.rerolledFromTaskCardId).toBe(before.taskCardId);

    await expect(
      rerollDailyTask({
        userId,
        dimensionKey: "movement",
        rng: () => 0.5,
      }),
    ).rejects.toThrow(/今天这个维度已经换过一次/);
  });

  it("rejects reroll after completion", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await completeDailyTask({ userId, dimensionKey: "movement" });

    await expect(
      rerollDailyTask({
        userId,
        dimensionKey: "movement",
        rng: () => 0.99,
      }),
    ).rejects.toThrow(/已完成的任务不能再换/);
  });

  it("rejects life-ticket claim before all four tasks are complete", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await completeDailyTask({ userId, dimensionKey: "movement" });

    await expect(claimDailyTasksTicket({ userId })).rejects.toThrow(/四项任务全部完成后才能领取生活券/);
  });

  it("grants one life ticket after all four tasks are complete", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });

    for (const dimensionKey of ["movement", "hydration", "social", "learning"] as const) {
      await completeDailyTask({ userId, dimensionKey });
    }

    await claimDailyTasksTicket({ userId });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey,
        reason: "DAILY_TASKS_GRANTED",
      },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
    expect(ledgers[0]).toMatchObject({
      delta: 1,
      balanceAfter: 1,
      sourceType: "daily_tasks",
      sourceId: `${userId}:${dayKey}`,
    });
  });

  it("does not grant a second ticket on repeated claim", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });

    for (const dimensionKey of ["movement", "hydration", "social", "learning"] as const) {
      await completeDailyTask({ userId, dimensionKey });
    }

    await claimDailyTasksTicket({ userId });
    await claimDailyTasksTicket({ userId });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey,
        reason: "DAILY_TASKS_GRANTED",
      },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-tasks.test.ts
```

Expected: FAIL because `lib/gamification/tasks.ts` does not exist yet.

---

### Task 2: Add Ticket Ledger Source Dedupe Constraint

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Upgrade source index to unique constraint**

In `LotteryTicketLedger`, replace this index if it exists:

```prisma
@@index([sourceType, sourceId])
```

with:

```prisma
@@unique([sourceType, sourceId])
```

The model should include:

```prisma
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
  @@unique([sourceType, sourceId])
}
```

- [ ] **Step 2: Push schema and regenerate client**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: both commands succeed.

---

### Task 3: Extend Snapshot Types And Read-Only State Aggregator

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/gamification/state.ts`

- [ ] **Step 1: Extend snapshot interfaces**

Modify `GamificationTaskAssignmentSnapshot` in `lib/types.ts`:

```ts
export interface GamificationTaskAssignmentSnapshot {
  id: string;
  taskCardId: string;
  title: string;
  description: string;
  status: GamificationTaskStatus;
  completedAt: string | null;
  completionText: string | null;
  rerollCount: number;
  rerollLimit: 1;
  canComplete: boolean;
  canReroll: boolean;
}
```

Modify `GamificationTicketSummary`:

```ts
export interface GamificationTicketSummary {
  maxFreeTicketsToday: 2;
  todayEarned: number;
  todaySpent: number;
  lifeTicketEarned: boolean;
  fitnessTicketEarned: boolean;
  taskCompletedCount: number;
  lifeTicketClaimable: boolean;
}
```

- [ ] **Step 2: Add fields in state aggregator**

In `lib/gamification/state.ts`, update the assignment snapshot mapping:

```ts
assignment: assignment
  ? {
      id: assignment.id,
      taskCardId: assignment.taskCardId,
      title: taskCard?.title ?? "未知任务",
      description: taskCard?.description ?? "这张任务卡已经不在本地配置中。",
      status: assignment.completedAt ? "completed" : "pending",
      completedAt: assignment.completedAt?.toISOString() ?? null,
      completionText: assignment.completionText ?? null,
      rerollCount: assignment.rerollCount,
      rerollLimit: 1,
      canComplete: !assignment.completedAt,
      canReroll: !assignment.completedAt && assignment.rerollCount < 1,
    }
  : null,
```

Add derived task progress values before returning:

```ts
const taskCompletedCount = dimensions.filter(
  (dimension) => dimension.assignment?.status === "completed",
).length;
const lifeTicketEarned = user.lotteryTicketLedgers.some(
  (ledger) => ledger.reason === "DAILY_TASKS_GRANTED",
);
```

Then update `ticketSummary`:

```ts
ticketSummary: {
  maxFreeTicketsToday: 2,
  todayEarned,
  todaySpent,
  lifeTicketEarned,
  fitnessTicketEarned: user.lotteryTicketLedgers.some((ledger) => ledger.reason === "FITNESS_PUNCH_GRANTED"),
  taskCompletedCount,
  lifeTicketClaimable: taskCompletedCount === 4 && !lifeTicketEarned,
},
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run lint
```

Expected: FAIL until service and frontend changes are completed, because tests and API helpers are still missing.

---

### Task 4: Implement Daily Task Service

**Files:**
- Create: `lib/gamification/tasks.ts`

- [ ] **Step 1: Create task service**

Create `lib/gamification/tasks.ts`:

```ts
import { Prisma } from "@/lib/generated/prisma/client";
import { getGamificationDimensions, getTaskCards } from "@/lib/gamification/content";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import type { TaskCardDefinition, TaskDimensionKey } from "@/content/gamification/types";
import type { GamificationStateSnapshot } from "@/lib/types";

const REROLL_LIMIT_PER_DIMENSION = 1;
const COMPLETION_TEXT_LIMIT = 80;

const DIMENSION_KEYS = getGamificationDimensions().map((dimension) => dimension.key);

type Rng = () => number;

export class GamificationTaskError extends Error {
  readonly status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "GamificationTaskError";
    this.status = status;
  }
}

interface UserTeamIdentity {
  id: string;
  teamId: string;
}

interface EnsureTodayTaskAssignmentsInput {
  userId: string;
  now?: Date;
  rng?: Rng;
}

interface CompleteDailyTaskInput {
  userId: string;
  dimensionKey: TaskDimensionKey;
  completionText?: string;
  now?: Date;
}

interface RerollDailyTaskInput {
  userId: string;
  dimensionKey: TaskDimensionKey;
  now?: Date;
  rng?: Rng;
}

interface ClaimDailyTasksTicketInput {
  userId: string;
  now?: Date;
}

function assertDimensionKey(value: string): asserts value is TaskDimensionKey {
  if (!DIMENSION_KEYS.includes(value as TaskDimensionKey)) {
    throw new GamificationTaskError("未知任务维度", 400);
  }
}

function normalizeCompletionText(text: string | undefined): string | null {
  const normalized = text?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.length > COMPLETION_TEXT_LIMIT) {
    throw new GamificationTaskError(`完成状态词不能超过 ${COMPLETION_TEXT_LIMIT} 个字符`, 400);
  }

  return normalized;
}

function isWeekend(dayKey: string): boolean {
  const [yearText, monthText, dayText] = dayKey.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  const weekday = date.getUTCDay();
  return weekday === 0 || weekday === 6;
}

function dayKeyToUtcTime(dayKey: string): number {
  const [yearText, monthText, dayText] = dayKey.split("-");
  return Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function isWithinCooldown(card: TaskCardDefinition, todayDayKey: string, previousDayKeys: string[]) {
  if (card.repeatCooldownDays <= 0) {
    return false;
  }

  const todayTime = dayKeyToUtcTime(todayDayKey);

  return previousDayKeys.some((dayKey) => {
    const diffDays = Math.floor((todayTime - dayKeyToUtcTime(dayKey)) / 86_400_000);
    return diffDays > 0 && diffDays <= card.repeatCooldownDays;
  });
}

function selectWeightedTaskCard(cards: TaskCardDefinition[], rng: Rng): TaskCardDefinition {
  const totalWeight = cards.reduce((sum, card) => sum + card.weight, 0);
  let cursor = Math.min(Math.max(rng(), 0), 0.999999) * totalWeight;

  for (const card of cards) {
    cursor -= card.weight;
    if (cursor < 0) {
      return card;
    }
  }

  return cards[cards.length - 1];
}

function chooseTaskCard({
  dimensionKey,
  dayKey,
  previousAssignments,
  excludedTaskCardIds = [],
  rng,
}: {
  dimensionKey: TaskDimensionKey;
  dayKey: string;
  previousAssignments: { taskCardId: string; dayKey: string }[];
  excludedTaskCardIds?: string[];
  rng: Rng;
}): TaskCardDefinition {
  const excluded = new Set(excludedTaskCardIds);
  const weekend = isWeekend(dayKey);
  const allCards = getTaskCards().filter(
    (card) =>
      card.enabled &&
      card.dimensionKey === dimensionKey &&
      (weekend || !card.isWeekendOnly) &&
      !excluded.has(card.id),
  );

  if (allCards.length === 0) {
    throw new GamificationTaskError("当前维度没有可用任务卡", 409);
  }

  const previousDayKeysByTaskId = new Map<string, string[]>();

  for (const assignment of previousAssignments) {
    const dayKeys = previousDayKeysByTaskId.get(assignment.taskCardId) ?? [];
    dayKeys.push(assignment.dayKey);
    previousDayKeysByTaskId.set(assignment.taskCardId, dayKeys);
  }

  const cooldownFiltered = allCards.filter(
    (card) => !isWithinCooldown(card, dayKey, previousDayKeysByTaskId.get(card.id) ?? []),
  );
  const candidates = cooldownFiltered.length > 0 ? cooldownFiltered : allCards;

  return selectWeightedTaskCard(candidates, rng);
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findUserIdentity(userId: string): Promise<UserTeamIdentity> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });

  if (!user) {
    throw new GamificationTaskError("用户不存在", 401);
  }

  return user;
}

async function buildSnapshotOrThrow(userId: string, now: Date): Promise<GamificationStateSnapshot> {
  const snapshot = await buildGamificationStateForUser(userId, now);

  if (!snapshot) {
    throw new GamificationTaskError("用户不存在", 401);
  }

  return snapshot;
}

export async function ensureTodayTaskAssignments({
  userId,
  now = new Date(),
  rng = Math.random,
}: EnsureTodayTaskAssignmentsInput): Promise<GamificationStateSnapshot> {
  const user = await findUserIdentity(userId);
  const dayKey = getShanghaiDayKey(now);
  const lookbackMonthKey = dayKey.slice(0, 7);

  try {
    await prisma.$transaction(async (tx) => {
      const existingAssignments = await tx.dailyTaskAssignment.findMany({
        where: { userId, dayKey },
        select: { dimensionKey: true },
      });
      const existingDimensions = new Set(existingAssignments.map((assignment) => assignment.dimensionKey));

      const previousAssignments = await tx.dailyTaskAssignment.findMany({
        where: {
          userId,
          dayKey: { startsWith: lookbackMonthKey },
        },
        select: {
          dimensionKey: true,
          taskCardId: true,
          dayKey: true,
        },
      });

      for (const dimension of getGamificationDimensions()) {
        if (existingDimensions.has(dimension.key)) {
          continue;
        }

        const taskCard = chooseTaskCard({
          dimensionKey: dimension.key,
          dayKey,
          previousAssignments: previousAssignments.filter(
            (assignment) => assignment.dimensionKey === dimension.key && assignment.dayKey !== dayKey,
          ),
          rng,
        });

        await tx.dailyTaskAssignment.create({
          data: {
            userId,
            teamId: user.teamId,
            dayKey,
            dimensionKey: dimension.key,
            taskCardId: taskCard.id,
          },
        });
      }
    });
  } catch (error) {
    if (!isUniqueConflict(error)) {
      throw error;
    }
  }

  return buildSnapshotOrThrow(userId, now);
}

export async function completeDailyTask({
  userId,
  dimensionKey,
  completionText,
  now = new Date(),
}: CompleteDailyTaskInput): Promise<GamificationStateSnapshot> {
  assertDimensionKey(dimensionKey);
  const normalizedCompletionText = normalizeCompletionText(completionText);
  const dayKey = getShanghaiDayKey(now);

  await ensureTodayTaskAssignments({ userId, now });

  await prisma.$transaction(async (tx) => {
    const assignment = await tx.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey,
        },
      },
    });

    if (assignment.completedAt) {
      return;
    }

    await tx.dailyTaskAssignment.update({
      where: { id: assignment.id },
      data: {
        completedAt: now,
        completionText: normalizedCompletionText,
      },
    });
  });

  return buildSnapshotOrThrow(userId, now);
}

export async function rerollDailyTask({
  userId,
  dimensionKey,
  now = new Date(),
  rng = Math.random,
}: RerollDailyTaskInput): Promise<GamificationStateSnapshot> {
  assertDimensionKey(dimensionKey);
  const dayKey = getShanghaiDayKey(now);
  const lookbackMonthKey = dayKey.slice(0, 7);

  await ensureTodayTaskAssignments({ userId, now, rng });

  await prisma.$transaction(async (tx) => {
    const assignment = await tx.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey,
        },
      },
    });

    if (assignment.completedAt) {
      throw new GamificationTaskError("已完成的任务不能再换");
    }

    if (assignment.rerollCount >= REROLL_LIMIT_PER_DIMENSION) {
      throw new GamificationTaskError("今天这个维度已经换过一次");
    }

    const previousAssignments = await tx.dailyTaskAssignment.findMany({
      where: {
        userId,
        dimensionKey,
        dayKey: { startsWith: lookbackMonthKey },
      },
      select: {
        taskCardId: true,
        dayKey: true,
      },
    });

    const nextTaskCard = chooseTaskCard({
      dimensionKey,
      dayKey,
      previousAssignments: previousAssignments.filter((item) => item.dayKey !== dayKey),
      excludedTaskCardIds: [assignment.taskCardId],
      rng,
    });

    await tx.dailyTaskAssignment.update({
      where: { id: assignment.id },
      data: {
        taskCardId: nextTaskCard.id,
        rerollCount: { increment: 1 },
        rerolledFromTaskCardId: assignment.taskCardId,
      },
    });
  });

  return buildSnapshotOrThrow(userId, now);
}

export async function claimDailyTasksTicket({
  userId,
  now = new Date(),
}: ClaimDailyTasksTicketInput): Promise<GamificationStateSnapshot> {
  const user = await findUserIdentity(userId);
  const dayKey = getShanghaiDayKey(now);
  const sourceType = "daily_tasks";
  const sourceId = `${userId}:${dayKey}`;

  await prisma.$transaction(async (tx) => {
    const assignments = await tx.dailyTaskAssignment.findMany({
      where: { userId, dayKey },
      select: {
        id: true,
        dimensionKey: true,
        completedAt: true,
      },
    });

    const completedDimensions = new Set(
      assignments
        .filter((assignment) => assignment.completedAt)
        .map((assignment) => assignment.dimensionKey),
    );

    if (!DIMENSION_KEYS.every((dimensionKey) => completedDimensions.has(dimensionKey))) {
      throw new GamificationTaskError("四项任务全部完成后才能领取生活券");
    }

    const existingLedger = await tx.lotteryTicketLedger.findFirst({
      where: {
        userId,
        dayKey,
        reason: "DAILY_TASKS_GRANTED",
        sourceType,
        sourceId,
      },
      select: { id: true },
    });

    if (existingLedger) {
      return;
    }

    const currentUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ticketBalance: true },
    });
    const balanceAfter = currentUser.ticketBalance + 1;

    try {
      await tx.lotteryTicketLedger.create({
        data: {
          userId,
          teamId: user.teamId,
          dayKey,
          delta: 1,
          balanceAfter,
          reason: "DAILY_TASKS_GRANTED",
          sourceType,
          sourceId,
          metadataJson: JSON.stringify({
            dimensions: DIMENSION_KEYS,
            assignmentIds: assignments.map((assignment) => assignment.id),
          }),
        },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) {
        throw error;
      }

      return;
    }

    await tx.user.update({
      where: { id: userId },
      data: { ticketBalance: balanceAfter },
    });
  });

  return buildSnapshotOrThrow(userId, now);
}
```

- [ ] **Step 2: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-tasks.test.ts
```

Expected: PASS after any generated Prisma names are corrected.

---

### Task 5: Add Task API Routes

**Files:**
- Create: `app/api/gamification/tasks/ensure-today/route.ts`
- Create: `app/api/gamification/tasks/complete/route.ts`
- Create: `app/api/gamification/tasks/reroll/route.ts`
- Create: `app/api/gamification/tasks/claim-ticket/route.ts`

- [ ] **Step 1: Create ensure-today route**

Create `app/api/gamification/tasks/ensure-today/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { ensureTodayTaskAssignments, GamificationTaskError } from "@/lib/gamification/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await ensureTodayTaskAssignments({ userId });
    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create complete route**

Create `app/api/gamification/tasks/complete/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { completeDailyTask, GamificationTaskError } from "@/lib/gamification/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      dimensionKey?: string;
      completionText?: string;
    };

    if (!payload.dimensionKey) {
      return NextResponse.json({ error: "缺少任务维度" }, { status: 400 });
    }

    const snapshot = await completeDailyTask({
      userId,
      dimensionKey: payload.dimensionKey as never,
      completionText: payload.completionText,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create reroll route**

Create `app/api/gamification/tasks/reroll/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { GamificationTaskError, rerollDailyTask } from "@/lib/gamification/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      dimensionKey?: string;
    };

    if (!payload.dimensionKey) {
      return NextResponse.json({ error: "缺少任务维度" }, { status: 400 });
    }

    const snapshot = await rerollDailyTask({
      userId,
      dimensionKey: payload.dimensionKey as never,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create claim-ticket route**

Create `app/api/gamification/tasks/claim-ticket/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { claimDailyTasksTicket, GamificationTaskError } from "@/lib/gamification/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await claimDailyTasksTicket({ userId });
    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

After this step, replace `payload.dimensionKey as never` with a local imported `TaskDimensionKey` cast if TypeScript requires a narrower type:

```ts
import type { TaskDimensionKey } from "@/content/gamification/types";
```

and:

```ts
dimensionKey: payload.dimensionKey as TaskDimensionKey,
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS for the route files after imports are corrected.

---

### Task 6: Add API Route Tests

**Files:**
- Create: `__tests__/gamification-tasks-api.test.ts`

- [ ] **Step 1: Write API tests**

Create `__tests__/gamification-tasks-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as ensureToday } from "@/app/api/gamification/tasks/ensure-today/route";
import { POST as completeTask } from "@/app/api/gamification/tasks/complete/route";
import { POST as rerollTask } from "@/app/api/gamification/tasks/reroll/route";
import { POST as claimTicket } from "@/app/api/gamification/tasks/claim-ticket/route";
import { createCookieValue } from "@/lib/auth";
import { getShanghaiDayKey } from "@/lib/economy";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(url: string, userId?: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("gamification task APIs", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    userId = (await prisma.user.findUniqueOrThrow({ where: { username: "li" } })).id;
    dayKey = getShanghaiDayKey(fixedNow);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("rejects unauthenticated task actions", async () => {
    const response = await ensureToday(request("/api/gamification/tasks/ensure-today"));
    expect(response.status).toBe(401);
  });

  it("ensures today's assignments and returns a snapshot", async () => {
    const response = await ensureToday(request("/api/gamification/tasks/ensure-today", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot.dimensions).toHaveLength(4);
    expect(body.snapshot.dimensions.every((dimension: { assignment: unknown }) => dimension.assignment)).toBe(true);

    const assignments = await prisma.dailyTaskAssignment.findMany({ where: { userId, dayKey } });
    expect(assignments).toHaveLength(4);
  });

  it("completes a task and exposes progress in the snapshot", async () => {
    await ensureToday(request("/api/gamification/tasks/ensure-today", userId));

    const response = await completeTask(
      request("/api/gamification/tasks/complete", userId, {
        dimensionKey: "movement",
        completionText: "已复活",
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const movement = body.snapshot.dimensions.find((dimension: { key: string }) => dimension.key === "movement");
    expect(movement.assignment).toMatchObject({
      status: "completed",
      completionText: "已复活",
      canComplete: false,
      canReroll: false,
    });
    expect(body.snapshot.ticketSummary.taskCompletedCount).toBe(1);
    expect(body.snapshot.ticketSummary.lifeTicketClaimable).toBe(false);
  });

  it("rerolls an incomplete task", async () => {
    await ensureToday(request("/api/gamification/tasks/ensure-today", userId));
    const before = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    const response = await rerollTask(
      request("/api/gamification/tasks/reroll", userId, {
        dimensionKey: "movement",
      }),
    );
    expect(response.status).toBe(200);

    const after = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });
    expect(after.taskCardId).not.toBe(before.taskCardId);
    expect(after.rerollCount).toBe(1);
  });

  it("claims exactly one life ticket after all four tasks are complete", async () => {
    await ensureToday(request("/api/gamification/tasks/ensure-today", userId));

    for (const dimensionKey of ["movement", "hydration", "social", "learning"]) {
      await completeTask(
        request("/api/gamification/tasks/complete", userId, {
          dimensionKey,
        }),
      );
    }

    const firstResponse = await claimTicket(request("/api/gamification/tasks/claim-ticket", userId));
    const secondResponse = await claimTicket(request("/api/gamification/tasks/claim-ticket", userId));
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const body = await secondResponse.json();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: { userId, dayKey, reason: "DAILY_TASKS_GRANTED" },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
    expect(body.snapshot.ticketSummary).toMatchObject({
      lifeTicketEarned: true,
      lifeTicketClaimable: false,
      todayEarned: 1,
    });
  });
});
```

- [ ] **Step 2: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-tasks-api.test.ts
```

Expected: PASS.

---

### Task 7: Add Client API Helpers

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add mutation helpers**

Add these functions to `lib/api.ts`:

```ts
async function postGamificationAction(
  path: string,
  body: Record<string, unknown> = {},
): Promise<GamificationStateSnapshot> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return readGamificationSnapshot(response);
}

export async function ensureTodayGamificationTasks(): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/ensure-today");
}

export async function completeGamificationTask({
  dimensionKey,
  completionText,
}: {
  dimensionKey: string;
  completionText?: string;
}): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/complete", {
    dimensionKey,
    completionText,
  });
}

export async function rerollGamificationTask({
  dimensionKey,
}: {
  dimensionKey: string;
}): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/reroll", {
    dimensionKey,
  });
}

export async function claimGamificationLifeTicket(): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/claim-ticket");
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS for `lib/api.ts`.

---

### Task 8: Upgrade Supply Station UI

**Files:**
- Modify: `components/gamification/SupplyStation.tsx`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Update component tests for interactive task flow**

Modify `__tests__/supply-station-shell.test.tsx` so the first test stubs these fetch calls in order:

```ts
vi.stubGlobal(
  "fetch",
  vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ snapshot: buildSnapshotWithTasks() }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ snapshot: buildSnapshotWithCompletedMovement() }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ snapshot: buildSnapshotWithRerolledHydration() }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ snapshot: buildSnapshotWithClaimedTicket() }),
    }),
);
```

Add assertions:

```ts
expect(fetch).toHaveBeenNthCalledWith(
  1,
  "/api/gamification/tasks/ensure-today",
  expect.objectContaining({
    method: "POST",
    credentials: "same-origin",
  }),
);

const completeButton = Array.from(container.querySelectorAll("button")).find((button) =>
  button.textContent?.includes("我完成了"),
);
expect(completeButton).toBeDefined();

await act(async () => {
  completeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});

expect(fetch).toHaveBeenNthCalledWith(
  2,
  "/api/gamification/tasks/complete",
  expect.objectContaining({
    method: "POST",
  }),
);
expect(container.textContent).toContain("已复活");

const rerollButton = Array.from(container.querySelectorAll("button")).find((button) =>
  button.textContent?.includes("换一个"),
);
expect(rerollButton).toBeDefined();

await act(async () => {
  rerollButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});

expect(fetch).toHaveBeenNthCalledWith(
  3,
  "/api/gamification/tasks/reroll",
  expect.objectContaining({
    method: "POST",
  }),
);

const claimButton = Array.from(container.querySelectorAll("button")).find((button) =>
  button.textContent?.includes("领取生活券"),
);
expect(claimButton).toBeDefined();

await act(async () => {
  claimButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});

expect(fetch).toHaveBeenNthCalledWith(
  4,
  "/api/gamification/tasks/claim-ticket",
  expect.objectContaining({
    method: "POST",
  }),
);
expect(container.textContent).toContain("今日生活券已到账");
```

- [ ] **Step 2: Update SupplyStation imports**

Modify imports in `components/gamification/SupplyStation.tsx`:

```tsx
import {
  ApiError,
  claimGamificationLifeTicket,
  completeGamificationTask,
  ensureTodayGamificationTasks,
  rerollGamificationTask,
} from "@/lib/api";
```

- [ ] **Step 3: Replace initial load with ensure-today**

Update `loadState`:

```tsx
async function loadState() {
  setBusy(true);
  setError(null);

  try {
    setSnapshot(await ensureTodayGamificationTasks());
  } catch (caught) {
    setError(getSupplyErrorMessage(caught));
  } finally {
    setBusy(false);
  }
}
```

- [ ] **Step 4: Add task action runner**

Add local state and runner inside `SupplyStation`:

```tsx
const [activeAction, setActiveAction] = useState<string | null>(null);

async function runTaskAction(actionKey: string, action: () => Promise<GamificationStateSnapshot>) {
  setActiveAction(actionKey);
  setError(null);

  try {
    setSnapshot(await action());
  } catch (caught) {
    setError(getSupplyErrorMessage(caught));
  } finally {
    setActiveAction(null);
  }
}
```

- [ ] **Step 5: Make DimensionCard accept action callbacks**

Change `DimensionCard` props:

```tsx
function DimensionCard({
  dimension,
  busy,
  onComplete,
  onReroll,
}: {
  dimension: GamificationDimensionSnapshot;
  busy: boolean;
  onComplete: () => void;
  onReroll: () => void;
}) {
```

Replace the disabled placeholder button with:

```tsx
<div className="mt-4 grid grid-cols-2 gap-2">
  <button
    type="button"
    disabled={busy || !assignment?.canComplete}
    onClick={onComplete}
    className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
  >
    {assignment?.status === "completed" ? "已完成" : "我完成了"}
  </button>
  <button
    type="button"
    disabled={busy || !assignment?.canReroll}
    onClick={onReroll}
    className="rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
  >
    换一个
  </button>
</div>
```

Show completion text in the dashed body:

```tsx
{assignment
  ? assignment.status === "completed"
    ? assignment.completionText ?? "已自报完成"
    : assignment.title
  : "正在生成今日任务..."}
```

- [ ] **Step 6: Wire callbacks in task grid**

Update the task card render:

```tsx
{snapshot.dimensions.map((dimension) => (
  <DimensionCard
    key={dimension.key}
    dimension={dimension}
    busy={activeAction !== null}
    onComplete={() => {
      void runTaskAction(`complete:${dimension.key}`, () =>
        completeGamificationTask({
          dimensionKey: dimension.key,
          completionText: dimension.assignment?.completionText ?? undefined,
        }),
      );
    }}
    onReroll={() => {
      void runTaskAction(`reroll:${dimension.key}`, () =>
        rerollGamificationTask({
          dimensionKey: dimension.key,
        }),
      );
    }}
  />
))}
```

- [ ] **Step 7: Add life-ticket claim button**

In the `今日券路` section, after the summary cards add:

```tsx
<button
  type="button"
  disabled={activeAction !== null || !snapshot.ticketSummary.lifeTicketClaimable}
  onClick={() => {
    void runTaskAction("claim-ticket", claimGamificationLifeTicket);
  }}
  className="mt-3 w-full rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-3 text-sm font-black text-slate-900 shadow-[0_4px_0_0_#1f2937] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
>
  {snapshot.ticketSummary.lifeTicketEarned
    ? "今日生活券已到账"
    : snapshot.ticketSummary.lifeTicketClaimable
      ? "领取生活券"
      : `四维进度 ${snapshot.ticketSummary.taskCompletedCount}/4`}
</button>
```

- [ ] **Step 8: Run component tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS after test fixtures include the new snapshot fields.

---

### Task 9: Verification

**Files:**
- No new files beyond previous tasks.

- [ ] **Step 1: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-tasks.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-tasks-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run supply station component tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run GM-03 state API regression tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit GM-04**

```bash
git add prisma/schema.prisma prisma/dev.db lib/generated/prisma lib/types.ts lib/api.ts lib/gamification/state.ts lib/gamification/tasks.ts app/api/gamification/tasks components/gamification/SupplyStation.tsx __tests__/gamification-tasks.test.ts __tests__/gamification-tasks-api.test.ts __tests__/supply-station-shell.test.tsx
git commit -m "feat: add daily gamification tasks"
```

## Self-Review Checklist

- `GET /api/gamification/state` remains read-only.
- `ensure-today` creates missing assignments idempotently.
- Each user/day/dimension has at most one assignment.
- Completion is trust-based and does not require proof.
- Completed tasks cannot be rerolled.
- Each dimension can be rerolled at most once per day.
- Life-ticket claim requires all four tasks completed.
- Repeated claim does not create a second ledger or add a second ticket.
- GM-04 does not touch fitness punch, season contribution, lottery draw, item use, Enterprise WeChat, or Team Dynamics.
