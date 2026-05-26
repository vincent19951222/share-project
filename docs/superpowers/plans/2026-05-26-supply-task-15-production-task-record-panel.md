# Supply Task 15 Production Task Record Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production Task Record panel that renders real date tabs, timeline records, draw history, redemption records, radar invitations, rules, and stable radar response callbacks.

**Architecture:** Keep data aggregation in `lib/gamification/task-records.ts` and mutation wiring in the future shell. This task creates a pure client component that reads `SupplyStationProductionSnapshot`, manages mode/date selection locally, and emits radar response actions through props.

**Tech Stack:** React 19, Next.js client component conventions, TypeScript strict mode, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-26-supply-task-15-production-task-record-panel-design.md`

This task does not modify production shell wiring, API routes, Prisma schema, the task-record aggregator, global CSS, or UI Lab mock-data files.

## File Structure

- Create: `components/gamification/production/SupplyTaskRecordPanel.tsx`
  - Client component.
  - Accepts `SupplyStationProductionSnapshot`, `activeAction`, and `onRespondSocialInvitation`.
  - Renders modes: `today`, `draws`, `redemptions`, `radar`, `rules`.
  - Uses `snapshot.taskRecord`, `snapshot.redemptions`, and `snapshot.social`.
- Create: `__tests__/supply-production-task-record-panel.test.tsx`
  - Renders fixture snapshot.
  - Verifies date tabs, timeline filtering, mode switching, radar response callback, and absence of `team-goal`.
- Add: `docs/superpowers/specs/2026-05-26-supply-task-15-production-task-record-panel-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-15-production-task-record-panel.md`

## Task 1: Failing Production Task Record Panel Test

**Files:**
- Create: `__tests__/supply-production-task-record-panel.test.tsx`

- [ ] **Step 1: Create the failing component test**

Create `__tests__/supply-production-task-record-panel.test.tsx` with a `SupplyStationProductionSnapshot` fixture. It must import `SupplyTaskRecordPanel` from `@/components/gamification/production/SupplyTaskRecordPanel`, so it fails before the component exists.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-task-record-panel.test.tsx
```

Expected: FAIL because `components/gamification/production/SupplyTaskRecordPanel.tsx` does not exist.

## Task 2: Production Task Record Panel Component

**Files:**
- Create: `components/gamification/production/SupplyTaskRecordPanel.tsx`
- Test: `__tests__/supply-production-task-record-panel.test.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gamification/production/SupplyTaskRecordPanel.tsx` with:

- `"use client"`.
- Local state for `activeMode` and `selectedDateKey`.
- `data-testid="supply-task-record-date"` on date buttons.
- `data-testid="supply-task-record-row"` on timeline/draw rows.
- `data-action="respond-social-invitation"` on radar response buttons.
- No UI Lab imports.

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-production-task-record-panel.test.tsx
```

Expected: PASS.

## Task 3: Regression Checks And Commit

**Files:**
- Check: `components/gamification/production/SupplyTaskRecordPanel.tsx`
- Check: `__tests__/supply-production-task-record-panel.test.tsx`

- [ ] **Step 1: Verify task-record related tests together**

Run:

```bash
npm test -- __tests__/supply-production-task-record-panel.test.tsx __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 2: Verify lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Check for UI Lab mock imports and team-goal leakage**

Run:

```bash
rg -n "mock-data|supplyTaskRecordMock|ui-lab|team-goal" components/gamification/production/SupplyTaskRecordPanel.tsx __tests__/supply-production-task-record-panel.test.tsx
```

Expected: no matches except the test assertion string `team-goal`.

- [ ] **Step 4: Commit only Task 15 files**

Run:

```bash
git add components/gamification/production/SupplyTaskRecordPanel.tsx __tests__/supply-production-task-record-panel.test.tsx docs/superpowers/specs/2026-05-26-supply-task-15-production-task-record-panel-design.md docs/superpowers/plans/2026-05-26-supply-task-15-production-task-record-panel.md
git commit -m "feat: add production supply task record panel"
```

## Self-Review

- Spec coverage: The plan covers seven date tabs, selected-date timeline rows, five modes, radar response callbacks, no `team-goal`, and mock isolation.
- Placeholder scan: No placeholders remain.
- Type consistency: Component props use `SupplyStationProductionSnapshot` and existing social/redemption snapshot fields from `lib/types.ts`.
