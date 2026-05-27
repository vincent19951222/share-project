# Supply Task 04 EXP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the EXP service into daily task completion, real fitness punch creation, and the gamification state profile.

**Architecture:** Reuse `lib/gamification/experience.ts` as the only EXP rules module. Task completion and punch creation call the service inside write transactions, while `buildGamificationStateForUser()` maps `User.exp` into a read-only level snapshot for clients.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom, React 19.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-04-exp-integration-design.md`

This task does not build shop catalog, shop purchase service, supply production view-model, or new production UI panels.

## File Structure

- Modify: `lib/types.ts`
  - Add `GamificationProfileSnapshot`.
  - Add `profile` to `GamificationStateSnapshot`.
- Modify: `lib/gamification/state.ts`
  - Select `User.exp`.
  - Map `profile` with `getUserLevelSnapshot(user.exp)`.
- Modify: `lib/gamification/tasks.ts`
  - Call `grantTaskCompletionExperience()` only for first completion.
- Modify: `app/api/board/punch/route.ts`
  - Call `grantFitnessPunchExperience()` in the POST transaction after `PunchRecord` creation.
  - Add a short DELETE comment documenting no EXP rollback.
- Modify: `__tests__/gamification-tasks.test.ts`
  - Add EXP ledger and duplicate-completion assertions.
- Modify: `__tests__/board-punch-api.test.ts`
  - Add EXP assertions and reset cleanup.
- Modify: `__tests__/gamification-state-api.test.ts`
  - Add profile assertions for empty and non-zero EXP snapshots.
- Modify: `__tests__/supply-station-shell.test.tsx`
  - Add profile to local snapshot fixture.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-04-exp-integration-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-04-exp-integration.md`

## Task 1: Failing EXP Integration Tests

**Files:**
- Modify: `__tests__/gamification-tasks.test.ts`
- Modify: `__tests__/board-punch-api.test.ts`
- Modify: `__tests__/gamification-state-api.test.ts`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Add task completion EXP expectations**

In `__tests__/gamification-tasks.test.ts`, inside `"marks a dimension task complete with optional completion text"`, after the assignment assertions, add:

```typescript
    const userAfterCompletion = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const expLedger = await prisma.experienceLedger.findFirstOrThrow({
      where: { userId, sourceType: "daily_task_assignment", sourceId: assignment.id },
    });

    expect(userAfterCompletion.exp).toBe(50);
    expect(expLedger.reason).toBe("DAILY_TASK_COMPLETION_EXP");
    expect(expLedger.delta).toBe(50);
```

In `"does not rewrite an already completed task"`, after the existing completion text assertion, add:

```typescript
    expect(await prisma.experienceLedger.count({ where: { userId } })).toBe(1);
    const userAfterDuplicate = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(userAfterDuplicate.exp).toBe(50);
```

- [ ] **Step 2: Add board punch EXP expectations and reset cleanup**

In `__tests__/board-punch-api.test.ts`, inside `resetState()`, after deleting `lotteryTicketLedger`, add:

```typescript
    await prisma.experienceLedger.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
```

In the `prisma.user.updateMany()` reset block, set:

```typescript
        exp: 0,
```

Inside `"creates today's punch, increments coins once, and returns the latest snapshot without a season"`, after `after` is loaded, add:

```typescript
    const expLedger = await prisma.experienceLedger.findFirstOrThrow({
      where: { userId, sourceType: "fitness_punch", sourceId: record!.id },
    });
```

After the coin/streak expectations, add:

```typescript
    expect(after.exp).toBe(before.exp + 100);
    expect(expLedger.delta).toBe(100);
    expect(expLedger.reason).toBe("FITNESS_PUNCH_EXP");
```

- [ ] **Step 3: Add state profile expectations**

In `__tests__/gamification-state-api.test.ts`, inside the first successful snapshot `toMatchObject`, after `ticketBalance: 0`, add:

```typescript
      profile: {
        totalExp: 0,
        level: 1,
        currentLevelExp: 0,
        nextLevelExp: 1000,
        title: "自律牛马",
      },
```

In `"enables ten draw top-up when four tickets can be filled with coins"`, update the user with EXP:

```typescript
        exp: 10_240,
```

After the lottery expectation, add:

```typescript
    expect(body.snapshot.profile).toMatchObject({
      totalExp: 10_240,
      level: 11,
      currentLevelExp: 240,
      nextLevelExp: 1000,
      title: "稳定脱脂牛马",
    });
```

- [ ] **Step 4: Update SupplyStation fixture for the new type**

In `__tests__/supply-station-shell.test.tsx`, inside `buildSnapshot()`, after `ticketBalance: 8`, add:

```typescript
    profile: {
      totalExp: 0,
      level: 1,
      currentLevelExp: 0,
      nextLevelExp: 1000,
      title: "自律牛马",
    },
```

- [ ] **Step 5: Run focused tests and verify failures**

Run:

```bash
npm test -- __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: FAIL because task completion and punch do not grant EXP, and state has no `profile` field.

## Task 2: State Profile Type And Mapping

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/gamification/state.ts`

- [ ] **Step 1: Add profile snapshot type**

In `lib/types.ts`, before `GamificationStateSnapshot`, add:

```typescript
export interface GamificationProfileSnapshot {
  totalExp: number;
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  title: string;
}
```

Add `profile: GamificationProfileSnapshot;` to `GamificationStateSnapshot` after `ticketBalance`.

- [ ] **Step 2: Map profile from user exp**

In `lib/gamification/state.ts`, import:

```typescript
import { getUserLevelSnapshot } from "@/lib/gamification/experience";
```

In the `prisma.user.findUnique()` select, add:

```typescript
      exp: true,
```

In the returned snapshot, after `ticketBalance: user.ticketBalance`, add:

```typescript
    profile: getUserLevelSnapshot(user.exp),
```

- [ ] **Step 3: Run state and fixture tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: PASS for state profile and the updated fixture type.

## Task 3: Grant EXP From Daily Tasks

**Files:**
- Modify: `lib/gamification/tasks.ts`

- [ ] **Step 1: Import task EXP helper**

In `lib/gamification/tasks.ts`, add:

```typescript
import { grantTaskCompletionExperience } from "@/lib/gamification/experience";
```

- [ ] **Step 2: Wrap first completion in a transaction**

Replace the current first-completion update in `completeDailyTask()` with:

```typescript
  if (!assignment.completedAt) {
    await prisma.$transaction(async (tx) => {
      await tx.dailyTaskAssignment.update({
        where: { id: assignment.id },
        data: {
          completedAt: now,
          completionText: normalizedCompletionText,
        },
      });

      await grantTaskCompletionExperience({
        userId,
        teamId: assignment.teamId,
        dayKey,
        assignmentId: assignment.id,
        db: tx,
      });
    });
  }
```

- [ ] **Step 3: Run daily task tests**

Run:

```bash
npm test -- __tests__/gamification-tasks.test.ts
```

Expected: PASS.

## Task 4: Grant EXP From Real Punches

**Files:**
- Modify: `app/api/board/punch/route.ts`

- [ ] **Step 1: Import punch EXP helper**

In `app/api/board/punch/route.ts`, add:

```typescript
import { grantFitnessPunchExperience } from "@/lib/gamification/experience";
```

- [ ] **Step 2: Grant EXP inside the POST transaction**

After `const grantsFitnessTicket = shouldGrantFitnessPunchTicket(punch);`, add:

```typescript
        await grantFitnessPunchExperience({
          userId: user.id,
          teamId: user.teamId,
          dayKey: todayDayKey,
          punchRecordId: punch.id,
          db: tx,
        });
```

- [ ] **Step 3: Document no EXP rollback in DELETE**

Before the `await prisma.$transaction(async (tx) => {` inside `DELETE`, add:

```typescript
      // Phase 3 records EXP as an achievement ledger; undoing a punch does not revoke EXP.
```

- [ ] **Step 4: Run board punch tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

## Task 5: Full Focused Verification And Commit

**Files:**
- Add: `docs/superpowers/specs/2026-05-25-supply-task-04-exp-integration-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-04-exp-integration.md`
- Modify: `lib/types.ts`
- Modify: `lib/gamification/state.ts`
- Modify: `lib/gamification/tasks.ts`
- Modify: `app/api/board/punch/route.ts`
- Modify: `__tests__/gamification-tasks.test.ts`
- Modify: `__tests__/board-punch-api.test.ts`
- Modify: `__tests__/gamification-state-api.test.ts`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Run focused verification**

Run:

```bash
npm test -- __tests__/gamification-experience.test.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Review changed files**

Run:

```bash
git status --short
git diff -- docs/superpowers/specs/2026-05-25-supply-task-04-exp-integration-design.md docs/superpowers/plans/2026-05-25-supply-task-04-exp-integration.md lib/types.ts lib/gamification/state.ts lib/gamification/tasks.ts app/api/board/punch/route.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: only Task 4 files are changed.

- [ ] **Step 4: Commit Task 4**

Run:

```bash
git add docs/superpowers/specs/2026-05-25-supply-task-04-exp-integration-design.md docs/superpowers/plans/2026-05-25-supply-task-04-exp-integration.md lib/types.ts lib/gamification/state.ts lib/gamification/tasks.ts app/api/board/punch/route.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
git commit -m "feat: grant exp from tasks and punches"
```

Expected: commit succeeds.

## Completion Criteria

Task 4 is complete when:

- Task 4 spec and plan exist.
- Daily task first completion grants one `DAILY_TASK_COMPLETION_EXP` ledger and `50 EXP`.
- Duplicate task completion does not grant duplicate EXP.
- Real punch creation grants one `FITNESS_PUNCH_EXP` ledger and `100 EXP`.
- Punch deletion documents that EXP is not revoked in Phase 3.
- Gamification state snapshots include profile level data.
- Focused tests and typecheck pass.
- Changes are committed.
