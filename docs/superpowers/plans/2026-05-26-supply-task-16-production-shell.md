# Supply Task 16 Production Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the production SupplyStation shell to the production view-model API and existing mutation helpers.

**Architecture:** Add one client shell that owns loading, active panel, action state, selection state, messages, and refreshes `SupplyStationProductionSnapshot` after each mutation. Keep all five production panels pure and replace the old `components/gamification/SupplyStation.tsx` body with a compatibility export.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict mode, Vitest/jsdom, existing `lib/api.ts` helpers.

---

## Files

- Create: `components/gamification/production/SupplyStationShell.tsx`
- Replace: `components/gamification/SupplyStation.tsx`
- Create: `__tests__/supply-production-shell.test.tsx`
- Replace: `__tests__/supply-station-shell.test.tsx`
- Add: `docs/superpowers/specs/2026-05-26-supply-task-16-production-shell-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-16-production-shell.md`

## Task 1: Shell Contract Test

- [ ] **Step 1: Create production shell tests**

Create `__tests__/supply-production-shell.test.tsx` with a `SupplyStationProductionSnapshot` fixture. Tests must stub `fetch` and verify:

- first call is `/api/gamification/supply/state`;
- complete task posts to `/api/gamification/tasks/complete`;
- single draw posts to `/api/gamification/lottery/draw`;
- shop purchase posts to `/api/gamification/shop/purchase`;
- old `SupplyStation` export renders production shell;
- 401 shows `/login`.

- [ ] **Step 2: Run focused failing test**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx
```

Expected before implementation: FAIL because `SupplyStationShell.tsx` does not exist.

## Task 2: Implement Production Shell

- [ ] **Step 1: Create `SupplyStationShell.tsx`**

Implement a client component with:

- `snapshot: SupplyStationProductionSnapshot | null`
- `activePanel: "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord"`
- `activeAction: string | null`
- `latestDraw: GamificationLotteryDrawSnapshot | null`
- `selectedBackpackItemId: string | null`
- `selectedShopItemId: string | null`
- `errorMessage: string | null`
- `successMessage: string | null`

Use `fetchSupplyStationState()` on mount and after each mutation.

- [ ] **Step 2: Wire panel callbacks**

Wire:

- `SupplyDashboardPanel`
- `SupplyDrawPoolPanel`
- `SupplyBackpackPanel`
- `SupplyShopPanel`
- `SupplyTaskRecordPanel`

Each callback sets an action key, runs the matching `lib/api.ts` helper, refreshes the production snapshot, then clears the action key.

- [ ] **Step 3: Add loading, error, and nav UI**

Render:

- loading text while `snapshot` is null and no error exists;
- `/login` link when the current error is 401;
- retry button for load errors;
- rules link `/docs?tab=rules#supply-station-rules`;
- probability link `/docs?tab=rules#supply-station-probability`.

## Task 3: Replace Legacy Entry

- [ ] **Step 1: Replace `components/gamification/SupplyStation.tsx`**

Use exactly:

```tsx
"use client";

export { SupplyStationShell as SupplyStation } from "@/components/gamification/production/SupplyStationShell";
```

- [ ] **Step 2: Replace legacy shell test**

Replace `__tests__/supply-station-shell.test.tsx` with a focused compatibility test that imports `SupplyStation`, stubs `/api/gamification/supply/state`, and asserts production shell content plus docs links render.

## Task 4: Verification

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run panel regression tests**

Run:

```bash
npm test -- __tests__/supply-production-dashboard-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-shop-panel.test.tsx __tests__/supply-production-task-record-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Review production isolation by search**

Run:

```bash
rg -n "mock-data|supplyDashboardMock|supplyShopMock|team-goal|团队目标" components/gamification/production components/gamification/SupplyStation.tsx
```

Expected: no matches.
