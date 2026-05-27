# Supply Task 14 Task Record Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only task-record aggregator that turns recent production gamification events into `SupplyTaskRecordSnapshot` and wires it into the production supply view-model.

**Architecture:** Keep aggregation in `lib/gamification/task-records.ts` so `supply-view-model.ts` stays focused on composing the production snapshot. The aggregator queries existing tables only, maps rows to the existing timeline type, and filters all events to the latest seven Shanghai day keys.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 with SQLite, Vitest.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-26-supply-task-14-task-record-aggregator-design.md`

This task does not modify UI panels, API routes, Prisma schema, or UI Lab files.

## File Structure

- Create: `lib/gamification/task-records.ts`
  - Exports `buildSupplyTaskRecordSnapshot({ userId, teamId, now })`.
  - Builds seven date tabs.
  - Queries and normalizes completed tasks, lottery draws, ticket ledgers, EXP ledgers, shop purchases, item uses, redemptions, social invitations, and social responses.
- Modify: `lib/gamification/supply-view-model.ts`
  - Removes the temporary task-record placeholder.
  - Calls `buildSupplyTaskRecordSnapshot()`.
- Create: `__tests__/gamification-task-records.test.ts`
  - Seeds real rows across all supported categories and verifies normalized timeline output.
- Modify: `__tests__/supply-production-view-model.test.ts`
  - Verifies production snapshot includes task-record timeline rows from the aggregator.
- Add: `docs/superpowers/specs/2026-05-26-supply-task-14-task-record-aggregator-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-14-task-record-aggregator.md`

## Task 1: Failing Task Record Aggregator Test

**Files:**
- Create: `__tests__/gamification-task-records.test.ts`

- [ ] **Step 1: Create the failing aggregator test**

Create `__tests__/gamification-task-records.test.ts` with fixtures for all timeline categories. The test imports `buildSupplyTaskRecordSnapshot` from `@/lib/gamification/task-records`, so it must fail before the implementation file exists.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npm test -- __tests__/gamification-task-records.test.ts
```

Expected: FAIL because `lib/gamification/task-records.ts` does not exist.

## Task 2: Task Record Aggregator

**Files:**
- Create: `lib/gamification/task-records.ts`
- Test: `__tests__/gamification-task-records.test.ts`

- [ ] **Step 1: Implement `buildSupplyTaskRecordSnapshot`**

Create `lib/gamification/task-records.ts` with these concrete behaviors:

- `dates`: latest seven Shanghai day keys, newest first.
- `timeline`: normalized rows from production tables only.
- `DailyTaskAssignment`: only rows with `completedAt`.
- `LotteryDraw` and `RealWorldRedemption`: filter by timestamp converted through `getShanghaiDayKey`.
- Timeline sorting: newest `occurredAt` first, then `id` for deterministic ties.
- Unknown task cards or items use fallback labels.

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/gamification-task-records.test.ts
```

Expected: PASS.

## Task 3: Wire Aggregator Into Supply View-Model

**Files:**
- Modify: `lib/gamification/supply-view-model.ts`
- Modify: `__tests__/supply-production-view-model.test.ts`

- [ ] **Step 1: Write the view-model expectation**

Update `__tests__/supply-production-view-model.test.ts` so setup creates an `ExperienceLedger` row for `2026-05-25`, and the main snapshot assertion expects `snapshot.taskRecord.timeline` to contain `{ category: "exp", title: "获得 EXP" }`.

- [ ] **Step 2: Run the view-model test and verify failure**

Run:

```bash
npm test -- __tests__/supply-production-view-model.test.ts
```

Expected: FAIL because `buildSupplyStationViewModelForUser()` still returns an empty task-record timeline.

- [ ] **Step 3: Replace the placeholder**

In `lib/gamification/supply-view-model.ts`:

- Import `buildSupplyTaskRecordSnapshot`.
- Remove local placeholder date helpers.
- Set `taskRecord` by awaiting `buildSupplyTaskRecordSnapshot({ userId: user.id, teamId: snapshot.teamId, now })`.

- [ ] **Step 4: Run focused view-model tests**

Run:

```bash
npm test -- __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

## Task 4: Regression Checks And Commit

**Files:**
- Check: `lib/gamification/task-records.ts`
- Check: `lib/gamification/supply-view-model.ts`
- Check: `__tests__/gamification-task-records.test.ts`
- Check: `__tests__/supply-production-view-model.test.ts`

- [ ] **Step 1: Verify lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 2: Check for UI Lab mock imports**

Run:

```bash
rg -n "mock-data|supplyTaskRecordMock|ui-lab" lib/gamification/task-records.ts __tests__/gamification-task-records.test.ts
```

Expected: no matches.

- [ ] **Step 3: Commit only Task 14 files**

Run:

```bash
git add lib/gamification/task-records.ts lib/gamification/supply-view-model.ts __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts docs/superpowers/specs/2026-05-26-supply-task-14-task-record-aggregator-design.md docs/superpowers/plans/2026-05-26-supply-task-14-task-record-aggregator.md
git commit -m "feat: add supply task record aggregator"
```

## Self-Review

- Spec coverage: The plan covers all required tables, seven date tabs, descending timeline sort, view-model wiring, and mock isolation.
- Placeholder scan: No implementation placeholders remain.
- Type consistency: The aggregator returns `SupplyTaskRecordSnapshot`, matching `lib/types.ts`.
