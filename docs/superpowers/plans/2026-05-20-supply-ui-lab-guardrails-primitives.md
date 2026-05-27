# Supply UI Lab Guardrails And Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supply UI Lab guardrail tests for Phase 2 vocabulary and dead links, while making the shared filter primitive support controlled local selection.

**Architecture:** Keep the implementation UI Lab-only. Add one reusable optional callback to `SupplyUiLabFilterBar`, extend its primitive test, and create a cross-scene guardrail test that renders the six Supply UI Lab scene components from their static mock data. The guardrail test is expected to fail until the later page cleanup tasks remove old vocabulary and dead anchors.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab React components.

---

## Scope

This plan implements the approved task-level spec:

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-03-guardrails-primitives-design.md`

This task does not update the six page scenes to satisfy the global guardrail. It only installs the guardrail and makes the shared primitive interaction-ready. Later tasks 4-9 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` should make the guardrail pass as they clean each page.

## File Structure

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
  - Add an optional `onSelect(id)` prop to `SupplyUiLabFilterBar`.
  - Keep the existing `role="tablist"` and `role="tab"` semantics.
- Modify: `__tests__/supply-ui-lab-primitives.test.tsx`
  - Import `vi`.
  - Add a focused interaction test for `SupplyUiLabFilterBar`.
- Create: `__tests__/supply-ui-lab-static-business-closure.test.tsx`
  - Render Dashboard, Team Goal, Shop, Task Record, Draw Pool, and Backpack UI Lab scenes.
  - Assert banned Phase 1 terms do not appear in rendered text.
  - Assert main-flow dead anchors do not render.

## Task 1: Add Failing Primitive Interaction Test

**Files:**
- Modify: `__tests__/supply-ui-lab-primitives.test.tsx`

- [ ] **Step 1: Import `vi`**

Change the Vitest import at the top of `__tests__/supply-ui-lab-primitives.test.tsx` from:

```typescript
import { afterEach, beforeEach, describe, expect, it } from "vitest";
```

to:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
```

- [ ] **Step 2: Add the failing selection test**

Append this test inside the existing `describe("Supply UI Lab shared primitives", () => { ... })` block, after the current rendering test:

```typescript
  it("supports controlled filter selection", async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root.render(
        <SupplyUiLabFilterBar
          ariaLabel="记录筛选"
          filters={[
            { id: "all", label: "全部", active: true },
            { id: "draws", label: "抽卡", active: false },
          ]}
          onSelect={onSelect}
        />,
      );
    });

    container.querySelectorAll("button")[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("draws");
  });
```

- [ ] **Step 3: Run the focused primitive test and verify failure**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: FAIL with a TypeScript or test transform error because `SupplyUiLabFilterBar` does not yet accept `onSelect`.

## Task 2: Implement Controlled Filter Primitive

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`

- [ ] **Step 1: Update `SupplyUiLabFilterBar` props and click behavior**

Replace the existing `SupplyUiLabFilterBar` function with:

```typescript
export function SupplyUiLabFilterBar({
  ariaLabel,
  filters,
  onSelect,
}: {
  ariaLabel: string;
  filters: Array<{ id: string; label: string; active: boolean }>;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="supply-ui-lab-filterbar" role="tablist" aria-label={ariaLabel}>
      {filters.map((filter) => (
        <button
          aria-selected={filter.active}
          key={filter.id}
          onClick={() => onSelect?.(filter.id)}
          role="tab"
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run the primitive test and verify pass**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: PASS.

## Task 3: Add Global Supply UI Lab Guardrail Test

**Files:**
- Create: `__tests__/supply-ui-lab-static-business-closure.test.tsx`

- [ ] **Step 1: Create the guardrail test file**

Create `__tests__/supply-ui-lab-static-business-closure.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bannedRenderedTerms = ["补给券", "生命票", "体力", "扩容", "帮助中心", "意见反馈", "设置"];

function renderAllSupplyUiLabScenes() {
  return (
    <>
      <SupplyDashboardScene data={supplyDashboardMock} />
      <SupplyTeamGoalScene data={supplyTeamGoalMock} />
      <SupplyShopScene data={supplyShopMock} />
      <SupplyTaskRecordScene data={supplyTaskRecordMock} />
      <SupplyDrawPoolScene data={supplyDrawPoolMock} />
      <SupplyBackpackScene data={supplyBackpackMock} />
    </>
  );
}

describe("Supply UI Lab static business closure", () => {
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

  it("keeps all rendered UI Lab pages on the Phase 2 vocabulary", async () => {
    await act(async () => {
      root.render(renderAllSupplyUiLabScenes());
    });

    const renderedText = container.textContent ?? "";

    for (const term of bannedRenderedTerms) {
      expect(renderedText).not.toContain(term);
    }

    expect(renderedText).toContain("抽奖券");
    expect(renderedText).toContain("背包");
  });

  it("does not render dead main-flow anchors", async () => {
    await act(async () => {
      root.render(renderAllSupplyUiLabScenes());
    });

    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(container.querySelector('a[href="#help"]')).toBeNull();
    expect(container.querySelector('a[href="#feedback"]')).toBeNull();
    expect(container.querySelector('a[href="#settings"]')).toBeNull();
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the guardrail test and verify expected failure**

Run:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: FAIL. Current UI Lab pages still render banned terms such as `帮助中心`, `意见反馈`, and `扩容`, and may still contain hash-only local anchors. Do not fix those page scenes in this task.

## Task 4: Verify Intended Task Boundary

**Files:**
- No new files.

- [ ] **Step 1: Run the passing primitive test**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the installed guardrail test**

Run:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: FAIL for banned rendered vocabulary or dead anchors. This confirms the guardrail is installed before the page cleanup tasks.

- [ ] **Step 3: Run TypeScript lint if the local database/client setup allows it**

Run:

```bash
npm run lint
```

Expected: PASS. If Prisma generation or local environment setup blocks lint, record the exact error in the task handoff and keep the primitive test result as the minimum verification for this task.

- [ ] **Step 4: Commit the task**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-static-business-closure.test.tsx
git commit -m "test: add supply ui lab guardrails"
```

## Self-Review Notes

- Spec coverage: `onSelect(id)` is covered by Tasks 1-2; banned rendered terms and dead anchors are covered by Task 3; expected failing global guardrail is covered by Task 4.
- Production isolation: only UI Lab component/test files are touched. No production `SupplyStation`, API Route, Prisma, or board route code is modified.
- Known red state: `__tests__/supply-ui-lab-static-business-closure.test.tsx` intentionally fails until later page tasks remove old terms and dead anchors.
