# Supply UI Lab Task 10 Verification QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the Phase 2 static Supply UI Lab business closure across all six routes, tests, TypeScript, production build, and browser QA without adding new product behavior.

**Architecture:** Treat this task as a release verification gate. Run the existing focused Supply UI Lab contract tests first, then validate TypeScript and production build, then inspect the six isolated `/ui-lab/supply-dashboard/*` pages in the in-app browser at desktop and mobile widths. If any failure appears, make only the smallest verification fix needed, rerun the specific failing check, and keep those fixes in a separate commit from unrelated dirty worktree changes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab components, Codex in-app Browser QA.

---

## Scope

This plan implements the approved task-level spec:

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-10-verification-design.md`

It closes Task 10 from the overall plan:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

This task does not create new Supply UI Lab behavior, connect real APIs, change Prisma data, modify the production `components/gamification/SupplyStation.tsx`, add snapshot tests, or merge unrelated dirty worktree changes.

## File Structure

Expected happy path:

- No source files are modified.
- No test files are modified.
- No commit is created if every verification check passes.

Potential verification-fix files, only if a check fails:

- Modify: `components/gamification/ui-lab/supply-dashboard/*`
  - Dashboard-only vocabulary, local interaction, layout, or route rendering fixes.
- Modify: `components/gamification/ui-lab/supply-team-goal/*`
  - Team Goal-only claim feedback, terminology, mock data, or layout fixes.
- Modify: `components/gamification/ui-lab/supply-shop/*`
  - Shop-only product selection, detail state, terminology, mock data, or layout fixes.
- Modify: `components/gamification/ui-lab/supply-task-record/*`
  - Task Record-only tab/sidebar state, terminology, mock data, or layout fixes.
- Modify: `components/gamification/ui-lab/supply-draw-pool/*`
  - Draw Pool-only single/ten draw feedback, terminology, mock data, or layout fixes.
- Modify: `components/gamification/ui-lab/supply-backpack/*`
  - Backpack-only selection, pagination, terminology, mock data, or layout fixes.
- Modify: `components/gamification/ui-lab/supply-data/*`
  - Shared catalog/resource/effect/record fixture fixes when a cross-page contract is wrong.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
  - Shared primitive fixes only when a focused primitive or interaction check fails.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
  - Shared topbar/resource vocabulary fixes only when resource labels or links are wrong.
- Modify: `app/globals.css`
  - Supply UI Lab CSS-only fixes for overlap, overflow, responsive layout, or missing CSS contract selectors.
- Modify: matching `__tests__/supply-*.test.ts*`
  - Test expectation fixes only when the implementation is already correct and the test contradicts the approved Task 10 spec.

Do not modify:

- `components/gamification/SupplyStation.tsx`
- Prisma schema, seed data, or generated Prisma output
- Auth routes, production board routes, or non-Supply UI Lab application code

## Verification Routes

Use these six routes for browser QA:

```text
http://localhost:3001/ui-lab/supply-dashboard
http://localhost:3001/ui-lab/supply-dashboard/team-goal
http://localhost:3001/ui-lab/supply-dashboard/shop
http://localhost:3001/ui-lab/supply-dashboard/task-record
http://localhost:3001/ui-lab/supply-dashboard/draw-pool
http://localhost:3001/ui-lab/supply-dashboard/backpack
```

## Task 1: Baseline The Worktree

**Files:**
- No files modified.

- [ ] **Step 1: Inspect current dirty state**

Run:

```bash
git status --short
```

Expected: The command prints either nothing or a list of existing changes. Record mentally which files were already dirty before Task 10. Do not revert, stage, or format unrelated files.

- [ ] **Step 2: Confirm Task 10 source documents are present**

Run:

```bash
test -f docs/superpowers/specs/2026-05-18-supply-ui-lab-task-10-verification-design.md && test -f docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md
```

Expected: PASS with no output.

## Task 2: Run Focused Supply UI Lab Tests

**Files:**
- Modify only files required to fix failures discovered by this task.

- [ ] **Step 1: Run all focused Supply UI Lab tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-catalog.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

- [ ] **Step 2: If the focused suite fails, isolate the failing file**

Run the single failing test file named in the Vitest output. Example:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: FAIL with the same assertion or TypeScript error as the focused suite.

- [ ] **Step 3: Fix only the failing contract**

Use this failure map:

```text
Route import failure -> app/ui-lab/supply-dashboard/**/page.tsx
Mock data contract failure -> matching components/gamification/ui-lab/supply-*/mock-data.ts or shared supply-data fixture
Asset contract failure -> matching public asset path or matching mock media reference
Scene interaction failure -> matching Supply*Scene.tsx
CSS selector failure -> app/globals.css or the matching CSS test when the selector name intentionally changed
Primitive failure -> SupplyUiLabPrimitives.tsx
Catalog/resource/effect failure -> components/gamification/ui-lab/supply-data/*
Global banned term/dead link failure -> matching rendered scene/topbar/mock copy, not the guardrail test
```

Do not broaden the fix. A banned term fix should replace the rendered copy or remove the obsolete link. A broken interaction fix should touch the scene state that owns the clicked control. A responsive overflow fix should be limited to Supply UI Lab CSS selectors.

- [ ] **Step 4: Rerun the isolated failing test**

Run the exact failing file from Step 2. For the global guardrail example, run:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Rerun the full focused suite**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-catalog.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

## Task 3: Run TypeScript And Production Build

**Files:**
- Modify only files required to fix TypeScript or build failures discovered by this task.

- [ ] **Step 1: Run lint/typecheck**

Run:

```bash
npm run lint
```

Expected: PASS. The script runs `tsc --noEmit`.

- [ ] **Step 2: If lint fails, rerun after the minimal typed fix**

Use the TypeScript diagnostic location as the source of truth. Fix the named file only, then run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. The script runs Prisma generation through `prebuild`, then `next build`.

- [ ] **Step 4: If build fails, isolate whether it is compile, route, or render-time**

Run:

```bash
npm run lint
```

Expected: PASS before investigating Next.js-specific build errors.

Then fix the file named in the build output and rerun:

```bash
npm run build
```

Expected: PASS.

## Task 4: Start The UI Lab Dev Server

**Files:**
- No files modified.

- [ ] **Step 1: Start the dev server**

Run in a long-running terminal session:

```bash
npm run dev
```

Expected: The server starts at `http://localhost:3001`.

- [ ] **Step 2: Confirm the server responds**

Run in a second terminal:

```bash
curl -I -L http://localhost:3001/ui-lab/supply-dashboard
```

Expected: The final response status is `HTTP/1.1 200 OK`. There should be no terminal crash in the dev server session.

## Task 5: Browser QA At Desktop Width

**Files:**
- Modify only files required to fix browser QA failures discovered by this task.

- [ ] **Step 1: Open desktop viewport**

Use the Codex in-app Browser. Set the viewport to `1536 x 1024`.

Open each route:

```text
http://localhost:3001/ui-lab/supply-dashboard
http://localhost:3001/ui-lab/supply-dashboard/team-goal
http://localhost:3001/ui-lab/supply-dashboard/shop
http://localhost:3001/ui-lab/supply-dashboard/task-record
http://localhost:3001/ui-lab/supply-dashboard/draw-pool
http://localhost:3001/ui-lab/supply-dashboard/backpack
```

Expected: Each page renders without a console error.

- [ ] **Step 2: Check global visual and vocabulary requirements on every route**

For each route, verify:

```text
No rendered banned terms: 补给券, 生命票, 体力, 扩容, 帮助中心, 意见反馈, 设置
No visible broken image icon
No obvious overlapping text
No clipped primary button text
Topbar resources use 银子 / 抽奖券 / 背包 where topbar resources are shown
Main navigation links go to real UI Lab routes, not href="#"
Console has no errors
```

Expected: All checks pass.

- [ ] **Step 3: Check route-specific desktop interactions**

Verify:

```text
Dashboard: top tabs or local filters switch active state without console errors.
Team Goal: reward claim button shows local feedback and does not navigate away.
Shop: product click changes the selected detail panel.
Task Record: sidebar modes and date tabs change visible content.
Draw Pool: single draw and ten draw buttons show result feedback.
Backpack: item selection changes detail, and pagination changes visible items or active page state.
```

Expected: Every interaction gives visible local feedback.

- [ ] **Step 4: If a desktop QA failure appears, make the smallest UI Lab-only fix**

Use this browser failure map:

```text
Console error on route load -> matching scene component, mock data shape, or page import
Broken image -> matching mock media path or missing public asset
Forbidden term -> matching mock copy, topbar label, scene copy, or shared fixture
Dead href="#" -> replace with the corresponding /ui-lab/supply-dashboard route or a button when it is a local action
Click has no feedback -> matching scene component local state
Desktop overlap -> app/globals.css Supply UI Lab selectors
```

After the fix, rerun the relevant focused test from Task 2 and reload the affected browser route.

Expected: The failed check now passes and no new console error appears.

## Task 6: Browser QA At Mobile Width

**Files:**
- Modify only files required to fix mobile browser QA failures discovered by this task.

- [ ] **Step 1: Open mobile viewport**

Use the Codex in-app Browser. Set the viewport to approximately `390 x 844`.

Open each route:

```text
http://localhost:3001/ui-lab/supply-dashboard
http://localhost:3001/ui-lab/supply-dashboard/team-goal
http://localhost:3001/ui-lab/supply-dashboard/shop
http://localhost:3001/ui-lab/supply-dashboard/task-record
http://localhost:3001/ui-lab/supply-dashboard/draw-pool
http://localhost:3001/ui-lab/supply-dashboard/backpack
```

Expected: Each page renders without a console error.

- [ ] **Step 2: Check mobile layout requirements on every route**

For each route, verify:

```text
No horizontal page overflow
No primary UI text overlaps adjacent content
No topbar resource text collides with navigation
No fixed-width panel forces the viewport wider than the screen
Filter bars and tabs wrap or scroll in an intentional way
Primary controls remain tappable
No rendered banned terms: 补给券, 生命票, 体力, 扩容, 帮助中心, 意见反馈, 设置
Console has no errors
```

Expected: All checks pass.

- [ ] **Step 3: Recheck route-specific mobile interactions**

Verify:

```text
Shop: tapping a product changes detail without losing scroll position unexpectedly.
Task Record: date tabs and sidebar modes are reachable and change content.
Draw Pool: single draw and ten draw result feedback stays inside the viewport.
Backpack: pagination and item selection remain tappable.
Team Goal: claim feedback fits in its panel.
Dashboard: local filters/tabs remain usable.
```

Expected: Every interaction gives visible local feedback and stays within the mobile viewport.

- [ ] **Step 4: If a mobile QA failure appears, make a CSS-first fix when behavior is correct**

Prefer `app/globals.css` Supply UI Lab selectors for pure layout issues. Touch scene components only when the DOM structure or copy is the actual cause.

After the fix, rerun:

```bash
npm test -- __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

Then reload the affected mobile route and confirm the layout failure is gone.

## Task 7: Final Verification Sweep

**Files:**
- Modify only files required to fix failures discovered by this task.

- [ ] **Step 1: Rerun the focused Supply UI Lab suite**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts __tests__/supply-ui-lab-primitives.test.tsx __tests__/supply-ui-lab-catalog.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Rerun lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Rerun build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Stop the dev server**

In the dev server terminal, press `Ctrl-C`.

Expected: The `npm run dev` session exits cleanly.

## Task 8: Commit Only Verification Fixes When Needed

**Files:**
- Stage only files changed by Task 10 verification fixes.

- [ ] **Step 1: Inspect final dirty state**

Run:

```bash
git status --short
```

Expected: The output shows either the same pre-existing dirty files from Task 1 or a small set of additional files changed by Task 10 fixes.

- [ ] **Step 2: If no Task 10 fixes were needed, skip commit**

Do not create an empty commit. Record the passing commands and browser QA results in the final response.

- [ ] **Step 3: If Task 10 fixes were needed, inspect the diff before staging**

Run:

```bash
git diff -- components/gamification/ui-lab app/ui-lab app/globals.css __tests__
```

Expected: The diff only contains minimal Supply UI Lab verification fixes.

- [ ] **Step 4: Stage only Task 10 files**

Run `git add` with explicit paths. Example when the only fixes are CSS and one scene:

```bash
git add app/globals.css components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx
```

Expected: Only Task 10 verification fix files are staged.

- [ ] **Step 5: Commit staged verification fixes**

Run:

```bash
git commit -m "fix: verify supply ui lab business closure"
```

Expected: Commit succeeds. Do not include unrelated dirty files.

## Final Review Checklist

- [ ] All focused Supply UI Lab tests pass.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] The six UI Lab routes render at `1536 x 1024` with no console errors.
- [ ] The six UI Lab routes render at approximately `390 x 844` with no console errors.
- [ ] Rendered UI contains none of these banned terms: `补给券`, `生命票`, `体力`, `扩容`, `帮助中心`, `意见反馈`, `设置`.
- [ ] Main-flow UI contains no `href="#"` dead links.
- [ ] Topbar/resource vocabulary uses `银子 / 抽奖券 / 背包`.
- [ ] Shop product selection, Backpack pagination/selection, Draw Pool draw feedback, Task Record mode/date tabs, Team Goal reward claim feedback, and Dashboard local tabs/filters work.
- [ ] No changes touch production `SupplyStation`.
- [ ] No unrelated dirty worktree changes are staged or committed.
