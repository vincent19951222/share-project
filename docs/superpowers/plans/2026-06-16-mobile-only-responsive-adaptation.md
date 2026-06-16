# Mobile-Only Responsive Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the share-project mobile experience usable and polished at 360-430px widths without changing any PC UI presentation.

**Architecture:** Keep desktop styles as the default source of truth and add a final mobile-only CSS adaptation layer under `@media (max-width: 760px)` plus `@media (max-width: 768px)` where existing Supply UI Lab tests require it. Add class hooks to JSX only when a mobile rule needs a stable selector; do not change DOM order, text, data flow, or desktop visual rules. Use focused CSS contract tests and browser viewport checks to guard against horizontal overflow and PC regressions.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes, `app/globals.css`, Vitest + jsdom, Codex Browser visual verification.

---

## Assumptions

- Mobile means `max-width: 760px`, with target verification at `375x812`, `393x852`, and `430x932`.
- Desktop means `min-width: 761px`; default CSS and Tailwind class behavior must remain visually equivalent.
- This plan is documentation only until executed. The current worktree has unrelated dirty files, so implementation must inspect `git status --short --branch` before editing and must not revert unrelated changes.
- No backend, Prisma, API route, route structure, copy, or product mechanic changes are required.
- Existing mobile work already covers parts of nav, calendar, report, and supply station. Treat that as baseline and tighten the remaining mobile contracts instead of reworking from scratch.

## Success Criteria

- Phone pages do not create document-level horizontal scroll on `/`, `/board`, `/drink`, `/calendar`, `/report`, `/dashboard/status`, `/dashboard/shop`, `/dashboard/task-record`, `/dashboard/backpack`, `/dashboard/draw-pool`, `/dynamics`, and `/docs`.
- Mobile touch targets for primary navigation, profile, dynamic bell, supply wallet, filters, and critical actions are at least `44px` high.
- Wide tables and secondary navs scroll inside their own containers only.
- Decorative scene assets never block reading or tapping on phone.
- Desktop `1440x900` checks show no visible changes on `/`, `/drink`, `/calendar`, `/report`, and `/dashboard/status`.
- Targeted tests, `npm run lint`, and `npm run build` pass before completion.

## File Structure

- Create `__tests__/mobile-only-adaptation-css.test.ts`: shared CSS contract tests for mobile-only page shell, navigation, scene flows, long pages, and desktop guardrails.
- Modify `app/globals.css`: append one final mobile-only adaptation layer; keep PC defaults unchanged.
- Modify `__tests__/navbar-supply-chrome.test.tsx`: preserve mobile wallet and desktop asset chip DOM contracts.
- Modify `components/drink-checkin/DrinkCheckin.tsx`: add mobile CSS hook classes only.
- Modify `components/drink-checkin/DrinkTeamGrid.tsx`: add table/container CSS hook classes only.
- Modify `__tests__/drink-checkin.test.tsx`: assert drink page and team grid expose mobile layout hooks.
- Modify `__tests__/home-ui-calendar-scene-css.test.ts`: lock tighter mobile calendar overflow and grid behavior.
- Modify `__tests__/home-ui-report-scene-css.test.ts`: lock tighter mobile report overflow and first-screen density.
- Modify `__tests__/supply-ui-lab-mobile-css.test.ts`: cover backpack and production embedded mobile overflow rules.

---

### Task 1: Mobile Shell And CSS Guard Harness

**Files:**
- Create: `__tests__/mobile-only-adaptation-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing CSS harness test**

Create `__tests__/mobile-only-adaptation-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function extractBlockAt(marker: string, markerIndex: number) {
  const blockStart = css.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    if (css[cursor] === "{") depth += 1;
    if (css[cursor] === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return css.slice(blockStart + 1, cursor - 1);
}

function extractBlocks(marker: string) {
  const blocks: string[] = [];
  let markerIndex = css.indexOf(marker);

  while (markerIndex >= 0) {
    blocks.push(extractBlockAt(marker, markerIndex));
    markerIndex = css.indexOf(marker, markerIndex + marker.length);
  }

  expect(blocks.length).toBeGreaterThan(0);
  return blocks;
}

function stripMediaBlocks(source: string) {
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    if (source.startsWith("@media", cursor)) {
      const blockStart = source.indexOf("{", cursor);
      expect(blockStart).toBeGreaterThan(cursor);

      let depth = 1;
      cursor = blockStart + 1;

      while (depth > 0 && cursor < source.length) {
        if (source[cursor] === "{") depth += 1;
        if (source[cursor] === "}") depth -= 1;
        cursor += 1;
      }

      expect(depth).toBe(0);
      continue;
    }

    output += source[cursor];
    cursor += 1;
  }

  return output;
}

function extractRuleBody(block: string, selector: string) {
  const markerIndex = block.indexOf(selector);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = block.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < block.length) {
    if (block[cursor] === "{") depth += 1;
    if (block[cursor] === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return block.slice(blockStart + 1, cursor - 1);
}

function expectMobileRule(selector: string, patterns: RegExp | RegExp[]) {
  const expectedPatterns = Array.isArray(patterns) ? patterns : [patterns];
  const mobileBlocks = extractBlocks("@media (max-width: 760px)");
  const hasMatchingRule = mobileBlocks.some((block) => {
    if (!block.includes(selector)) return false;
    const body = extractRuleBody(block, selector);
    return expectedPatterns.every((pattern) => pattern.test(body));
  });

  expect(hasMatchingRule, selector).toBe(true);
}

describe("mobile-only adaptation CSS", () => {
  it("keeps the fixed desktop page shell out of the mobile flow", () => {
    const rootCss = stripMediaBlocks(css);

    expect(rootCss).not.toMatch(/body\s*\{[^}]*100svh/);
    expectMobileRule("body", [
      /min-height:\s*100svh/,
      /height:\s*auto/,
      /width:\s*100%/,
      /overflow-x:\s*hidden/,
      /padding:\s*0\.75rem/,
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".board-tab-stage", [
      /min-height:\s*0/,
      /overflow-x:\s*hidden/,
      /overflow-y:\s*auto/,
    ]);
    expectMobileRule(".board-tab-panel-active", [
      /position:\s*relative/,
      /inset:\s*auto/,
      /min-height:\s*100%/,
    ]);
  });
});
```

- [ ] **Step 2: Run the harness test and verify it fails**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts
```

Expected: FAIL because `body` and the board shell do not yet expose the full final mobile shell contract.

- [ ] **Step 3: Append the mobile shell CSS**

Append this section to the end of `app/globals.css`:

```css
/* Mobile-only adaptation layer. Keep desktop defaults above as the source of truth. */
@media (max-width: 760px) {
  html,
  body {
    width: 100%;
    max-width: 100%;
  }

  body {
    min-height: 100svh;
    height: auto;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .board-tab-stage {
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .board-tab-panel-active {
    position: relative;
    inset: auto;
    min-height: 100%;
  }
}
```

- [ ] **Step 4: Run the harness test and verify it passes**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add app/globals.css __tests__/mobile-only-adaptation-css.test.ts
git commit -m "test: add mobile-only layout guard"
```

---

### Task 2: Mobile Navigation And Supply Rails

**Files:**
- Modify: `__tests__/mobile-only-adaptation-css.test.ts`
- Modify: `__tests__/navbar-supply-chrome.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Extend the CSS harness for mobile nav**

Add this test inside `describe("mobile-only adaptation CSS", () => {`:

```ts
  it("keeps mobile navigation and supply rails inside the phone viewport", () => {
    expectMobileRule(".app-top-nav", [
      /position:\s*sticky/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".app-top-nav > div:first-child", [
      /grid-template-areas:\s*"brand actions"\s*"wallet wallet"/,
      /min-width:\s*0/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".app-supply-mobile-wallet", [
      /grid-area:\s*wallet/,
      /width:\s*100%/,
      /min-height:\s*44px/,
    ]);
    expectMobileRule(".app-supply-secondary-nav", [
      /max-width:\s*100%/,
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".app-supply-secondary-tab", [
      /min-height:\s*44px/,
      /flex:\s*0 0 auto/,
    ]);
  });
```

- [ ] **Step 2: Strengthen the existing navbar DOM contract**

In `__tests__/navbar-supply-chrome.test.tsx`, keep the existing mobile wallet test and add this assertion near the existing `wallet?.parentElement` assertion:

```tsx
    expect(container.querySelector(".app-top-nav-actions")).not.toBeNull();
    expect(container.querySelector(".mobile-tab-panel")).toBeNull();
```

- [ ] **Step 3: Run nav tests and verify failure**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL on at least one missing mobile CSS contract such as sticky nav, secondary rail overflow, or secondary tab hit area.

- [ ] **Step 4: Add mobile-only nav CSS**

Append these rules inside the final `@media (max-width: 760px)` layer from Task 1:

```css
  .app-top-nav {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 60;
    max-width: 100%;
    padding: 0;
  }

  .app-top-nav > div:first-child {
    min-width: 0;
    max-width: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "brand actions"
      "wallet wallet";
  }

  .app-top-nav-brand-area,
  .app-top-nav-actions {
    min-width: 0;
  }

  .app-supply-mobile-wallet {
    grid-area: wallet;
    width: 100%;
    max-width: none;
    min-height: 44px;
  }

  .mobile-tab-panel {
    max-height: calc(100svh - 6.5rem);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .app-supply-secondary-nav {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }

  .app-supply-secondary-rail {
    width: max-content;
    min-width: 100%;
  }

  .app-supply-secondary-tab {
    flex: 0 0 auto;
    min-height: 44px;
  }
```

- [ ] **Step 5: Verify nav tests pass**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add app/globals.css __tests__/mobile-only-adaptation-css.test.ts __tests__/navbar-supply-chrome.test.tsx
git commit -m "fix: constrain mobile navigation rails"
```

---

### Task 3: Punch Board And Shared Board Mobile Flow

**Files:**
- Modify: `__tests__/mobile-only-adaptation-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Add mobile scene flow tests**

Add this test inside `describe("mobile-only adaptation CSS", () => {`:

```ts
  it("turns punch and shared board scenes into mobile vertical flows", () => {
    expectMobileRule(".punch-board-shell", [
      /position:\s*relative/,
      /min-height:\s*auto/,
      /overflow:\s*visible/,
    ]);
    expectMobileRule(".punch-scene-content", [
      /padding-inline:\s*0/,
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".heatmap-mobile-scroll", [
      /max-width:\s*100%/,
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".activity-stream-list", [
      /padding-inline:\s*0\.75rem/,
    ]);
    expectMobileRule(".shared-board-scene", [
      /height:\s*auto/,
      /min-height:\s*100%/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".shared-board-content", [
      /width:\s*100%/,
      /padding-inline:\s*0\.75rem/,
    ]);
    expectMobileRule(".shared-board-note-wall", [
      /column-count:\s*1/,
      /gap:\s*0\.85rem/,
    ]);
  });
```

- [ ] **Step 2: Run the scene flow tests and verify failure**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts
```

Expected: FAIL until the final mobile layer contains the explicit punch and shared board rules.

- [ ] **Step 3: Add mobile-only punch and shared board CSS**

Append these rules inside the final `@media (max-width: 760px)` layer:

```css
  .punch-board-shell {
    position: relative;
    inset: auto;
    min-height: auto;
    overflow: visible;
  }

  .punch-scene-content {
    padding-inline: 0;
    gap: 0.75rem;
  }

  .heatmap-mobile-scroll {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .activity-stream-list {
    padding-inline: 0.75rem;
  }

  .shared-board-scene {
    height: auto;
    min-height: 100%;
    overflow-x: hidden;
  }

  .shared-board-content {
    width: 100%;
    padding-inline: 0.75rem;
  }

  .shared-board-composer-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .shared-board-note-wall,
  .note-masonry {
    column-count: 1;
    gap: 0.85rem;
  }
```

- [ ] **Step 4: Verify the scene flow test passes**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add app/globals.css __tests__/mobile-only-adaptation-css.test.ts
git commit -m "fix: stack mobile board scenes"
```

---

### Task 4: 牛马水铺 Mobile Hooks And Wide Table Containment

**Files:**
- Modify: `components/drink-checkin/DrinkCheckin.tsx`
- Modify: `components/drink-checkin/DrinkTeamGrid.tsx`
- Modify: `__tests__/drink-checkin.test.tsx`
- Modify: `__tests__/mobile-only-adaptation-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Add drink hook assertions**

In `__tests__/drink-checkin.test.tsx`, inside the test named `uses an internal vertical scroll container inside the fixed board tab panel`, add:

```tsx
    expect(container.querySelector(".drink-checkin-shell")).not.toBeNull();
    expect(container.querySelector(".drink-checkin-content")).not.toBeNull();
```

Inside the test named `renders the latest 7 drink days including today in the team grid`, add:

```tsx
    expect(container.querySelector(".drink-team-board")).not.toBeNull();
    expect(container.querySelector(".drink-team-scroll")).not.toBeNull();
    expect(container.querySelector(".drink-team-table")).not.toBeNull();
```

- [ ] **Step 2: Add drink CSS contract tests**

Add this test inside `describe("mobile-only adaptation CSS", () => {`:

```ts
  it("contains water shop wide content inside mobile containers", () => {
    expectMobileRule(".drink-checkin-shell", [
      /padding:\s*0\.75rem/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".drink-checkin-content", [
      /width:\s*100%/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".drink-checkin-secondary-grid", [
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".drink-team-scroll", [
      /max-width:\s*100%/,
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".drink-team-table", [
      /min-width:\s*38rem/,
    ]);
  });
```

- [ ] **Step 3: Run drink tests and verify failure**

Run:

```bash
npm test -- --run __tests__/drink-checkin.test.tsx __tests__/mobile-only-adaptation-css.test.ts
```

Expected: FAIL because the drink components do not expose the new stable hook classes yet.

- [ ] **Step 4: Add hook classes to DrinkCheckin**

In `components/drink-checkin/DrinkCheckin.tsx`, change the success-state `main` and wrappers to:

```tsx
    <main className="drink-checkin-shell h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#f7eddc] bg-[linear-gradient(rgba(255,253,247,0.72),rgba(247,237,220,0.88))] px-4 py-6 text-slate-950 sm:px-8">
      <div className="drink-checkin-content mx-auto grid max-w-[1390px] gap-6">
        <DrinkReceipt
          snapshot={snapshot}
          busy={busy}
          error={error}
          onConfirmDrink={confirmDrink}
          onRemoveDrink={removeLatestDrink}
        />

        <div className="drink-checkin-secondary-grid grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DrinkTeamGrid snapshot={snapshot} />
          <DrinkActivityFeed />
        </div>
      </div>
    </main>
```

- [ ] **Step 5: Add hook classes to DrinkTeamGrid**

In `components/drink-checkin/DrinkTeamGrid.tsx`, change the section and table wrappers to:

```tsx
    <section className="drink-team-board rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-5 shadow-[8px_8px_0_rgba(15,23,42,0.24)]">
```

```tsx
      <div className="drink-team-scroll overflow-x-auto">
        <div className="drink-team-table min-w-[720px] space-y-2">
```

- [ ] **Step 6: Add mobile-only drink CSS**

Append these rules inside the final `@media (max-width: 760px)` layer:

```css
  .drink-checkin-shell {
    padding: 0.75rem;
    overflow-x: hidden;
  }

  .drink-checkin-content {
    width: 100%;
    max-width: 100%;
    gap: 0.85rem;
  }

  .drink-checkin-secondary-grid {
    gap: 0.75rem;
  }

  .drink-team-board {
    padding: 0.85rem;
  }

  .drink-team-scroll {
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }

  .drink-team-table {
    min-width: 38rem;
  }
```

- [ ] **Step 7: Verify drink tests pass**

Run:

```bash
npm test -- --run __tests__/drink-checkin.test.tsx __tests__/mobile-only-adaptation-css.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

```bash
git add components/drink-checkin/DrinkCheckin.tsx components/drink-checkin/DrinkTeamGrid.tsx __tests__/drink-checkin.test.tsx __tests__/mobile-only-adaptation-css.test.ts app/globals.css
git commit -m "fix: contain water shop mobile width"
```

---

### Task 5: Calendar And Report Mobile Density

**Files:**
- Modify: `__tests__/home-ui-calendar-scene-css.test.ts`
- Modify: `__tests__/home-ui-report-scene-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Extend the calendar mobile CSS test**

In `__tests__/home-ui-calendar-scene-css.test.ts`, inside `includes responsive and reduced-motion coverage for the calendar scene`, add:

```ts
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-board-viewport") &&
          /overflow-y:\s*auto/.test(block) &&
          /overflow-x:\s*hidden/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-month-table") &&
          /min-width:\s*0/.test(block),
      ),
    ).toBe(true);
```

- [ ] **Step 2: Extend the report mobile CSS test**

In `__tests__/home-ui-report-scene-css.test.ts`, inside `includes responsive and reduced-motion coverage for the report scene`, add:

```ts
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-board") &&
          /overflow-x:\s*hidden/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".game-weekly-report-desk") &&
          /max-height:\s*none/.test(block),
      ),
    ).toBe(true);
```

- [ ] **Step 3: Run calendar and report tests and verify failure**

Run:

```bash
npm test -- --run __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-report-scene-css.test.ts
```

Expected: FAIL until the final mobile layer explicitly locks overflow and long report behavior.

- [ ] **Step 4: Add mobile-only calendar and report CSS**

Append these rules inside the final `@media (max-width: 760px)` layer:

```css
  .calendar-board-viewport {
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .calendar-scene,
  .calendar-binder-shell,
  .calendar-paper-surface {
    max-width: 100%;
  }

  .calendar-binder-shell {
    width: 100%;
  }

  .calendar-month-table {
    min-width: 0;
  }

  .calendar-month-grid {
    overflow-y: visible;
  }

  .report-board {
    overflow-x: hidden;
  }

  .report-scene,
  .report-scene-content,
  .report-scene-analysis,
  .report-scene-bottom {
    max-width: 100%;
  }

  .game-weekly-report-desk {
    max-height: none;
    overflow-x: hidden;
  }
```

- [ ] **Step 5: Verify calendar and report tests pass**

Run:

```bash
npm test -- --run __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-report-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add app/globals.css __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-report-scene-css.test.ts
git commit -m "fix: tighten mobile calendar and report flow"
```

---

### Task 6: Supply Station Production Panels On Phones

**Files:**
- Modify: `__tests__/supply-ui-lab-mobile-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Extend the Supply UI Lab mobile tests**

In `__tests__/supply-ui-lab-mobile-css.test.ts`, add this test inside `describe("Supply UI Lab mobile CSS", () => {`:

```ts
  it("contains every embedded production panel inside the phone viewport", () => {
    for (const selector of [
      ".supply-dashboard-scene--embedded",
      ".supply-shop-scene--embedded",
      ".supply-task-record-scene--embedded",
      ".supply-backpack-scene--embedded",
      ".supply-draw-pool-scene--embedded",
    ]) {
      expectMobileRule(selector, [/max-width:\s*100%/, /overflow-x:\s*hidden/]);
    }

    expectMobileRule(".supply-backpack-content", [/width:\s*100%/, /min-width:\s*0/, /max-width:\s*100%/]);
    expectMobileRule(".supply-backpack-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-shop-scene--embedded .supply-shop-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-task-record-scene--embedded .supply-task-record-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-draw-pool-scene--embedded .supply-draw-pool-layout", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
```

- [ ] **Step 2: Run supply mobile tests and verify failure**

Run:

```bash
npm test -- --run __tests__/supply-ui-lab-mobile-css.test.ts
```

Expected: FAIL until backpack and embedded production panels are included in the mobile containment contract.

- [ ] **Step 3: Add mobile-only Supply CSS**

Append this `768px` block near the final mobile adaptation layer, after the `760px` block:

```css
@media (max-width: 768px) {
  .supply-dashboard-scene--embedded,
  .supply-shop-scene--embedded,
  .supply-task-record-scene--embedded,
  .supply-backpack-scene--embedded,
  .supply-draw-pool-scene--embedded {
    max-width: 100%;
    overflow-x: hidden;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-content,
  .supply-shop-scene--embedded .supply-shop-content,
  .supply-task-record-scene--embedded .supply-task-record-content,
  .supply-backpack-scene--embedded .supply-backpack-content,
  .supply-draw-pool-scene--embedded .supply-draw-pool-content,
  .supply-backpack-content {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-stage,
  .supply-shop-scene--embedded .supply-shop-shell,
  .supply-task-record-scene--embedded .supply-task-record-shell,
  .supply-backpack-scene--embedded .supply-backpack-shell,
  .supply-draw-pool-scene--embedded .supply-draw-pool-layout,
  .supply-backpack-shell {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 4: Verify supply mobile tests pass**

Run:

```bash
npm test -- --run __tests__/supply-ui-lab-mobile-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```bash
git add app/globals.css __tests__/supply-ui-lab-mobile-css.test.ts
git commit -m "fix: contain supply station mobile panels"
```

---

### Task 7: Team Dynamics And Docs Long-Page Mobile Pass

**Files:**
- Modify: `__tests__/mobile-only-adaptation-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Add long-page mobile tests**

Add this test inside `describe("mobile-only adaptation CSS", () => {`:

```ts
  it("keeps dynamics and docs long pages readable on phones", () => {
    expectMobileRule(".team-dynamics-page", [
      /padding:\s*0\.85rem/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".team-dynamic-filter", [
      /min-height:\s*44px/,
    ]);
    expectMobileRule(".docs-center-shell", [
      /max-width:\s*100%/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".docs-tabs", [
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".docs-tab", [
      /min-width:\s*min\(11\.5rem,\s*80vw\)/,
    ]);
  });
```

- [ ] **Step 2: Run long-page tests and verify failure**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts
```

Expected: FAIL until the final mobile layer contains team dynamics and docs rules.

- [ ] **Step 3: Add mobile-only long-page CSS**

Append these rules inside the final `@media (max-width: 760px)` layer:

```css
  .team-dynamics-page {
    max-width: 100%;
    padding: 0.85rem;
  }

  .team-dynamics-page .quest-btn,
  .team-dynamic-filter {
    min-height: 44px;
  }

  .docs-center-shell {
    max-width: 100%;
    overflow-x: hidden;
  }

  .docs-tabs {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }

  .docs-tab {
    min-width: min(11.5rem, 80vw);
  }
```

- [ ] **Step 4: Verify long-page tests pass**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 7**

```bash
git add app/globals.css __tests__/mobile-only-adaptation-css.test.ts
git commit -m "fix: improve mobile long pages"
```

---

### Task 8: Final Verification And PC Guard

**Files:**
- No new files.
- Verify: targeted Vitest suites, TypeScript lint, production build, browser visual checks.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- --run __tests__/mobile-only-adaptation-css.test.ts __tests__/navbar-supply-chrome.test.tsx __tests__/drink-checkin.test.tsx __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-report-scene-css.test.ts __tests__/supply-ui-lab-mobile-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full code checks**

Run:

```bash
npm run lint
```

Expected: PASS with TypeScript reporting no errors.

Run:

```bash
npm run build
```

Expected: PASS and Next.js production build completes.

- [ ] **Step 3: Start the dev server for visual verification**

Run:

```bash
npm run dev
```

Expected: dev server starts at `http://localhost:3001`.

- [ ] **Step 4: Browser-check mobile overflow**

Use Codex Browser or an equivalent real browser viewport at `375x812`, `393x852`, and `430x932`. Visit:

```text
http://localhost:3001/
http://localhost:3001/board
http://localhost:3001/drink
http://localhost:3001/calendar
http://localhost:3001/report
http://localhost:3001/dashboard/status
http://localhost:3001/dashboard/shop
http://localhost:3001/dashboard/task-record
http://localhost:3001/dashboard/backpack
http://localhost:3001/dashboard/draw-pool
http://localhost:3001/dynamics
http://localhost:3001/docs
```

For each route, run this in the browser console:

```js
({
  viewport: window.innerWidth,
  documentScrollWidth: document.documentElement.scrollWidth,
  bodyScrollWidth: document.body.scrollWidth,
  hasHorizontalOverflow:
    document.documentElement.scrollWidth > window.innerWidth + 1 ||
    document.body.scrollWidth > window.innerWidth + 1,
})
```

Expected: `hasHorizontalOverflow` is `false` on every route and viewport.

- [ ] **Step 5: Browser-check desktop invariance**

Use a `1440x900` viewport and visit:

```text
http://localhost:3001/
http://localhost:3001/drink
http://localhost:3001/calendar
http://localhost:3001/report
http://localhost:3001/dashboard/status
```

Expected:
- Desktop tab strip remains horizontal.
- Desktop supply asset chips remain visible as separate chips.
- Calendar and report still use the desktop scene proportions.
- Supply dashboard still uses the desktop production scene composition.

- [ ] **Step 6: Inspect the diff for PC-safety**

Run:

```bash
git diff -- app/globals.css components/drink-checkin/DrinkCheckin.tsx components/drink-checkin/DrinkTeamGrid.tsx
```

Expected:
- `app/globals.css` visual layout additions are inside `@media (max-width: 760px)` or `@media (max-width: 768px)`.
- JSX changes only add class names.
- No desktop Tailwind class, text, route, data, or component order is changed.

- [ ] **Step 7: Commit verification fixes if any were needed**

If Step 4 or Step 5 required a correction, commit the correction:

```bash
git add app/globals.css __tests__/mobile-only-adaptation-css.test.ts __tests__/navbar-supply-chrome.test.tsx __tests__/drink-checkin.test.tsx __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-report-scene-css.test.ts __tests__/supply-ui-lab-mobile-css.test.ts components/drink-checkin/DrinkCheckin.tsx components/drink-checkin/DrinkTeamGrid.tsx
git commit -m "fix: complete mobile-only responsive QA"
```

Expected: commit succeeds only when there are actual corrections to commit.

## Self-Review

- Spec coverage: The plan covers page shell, navigation, punch/shared board, water shop, calendar, report, supply station, team dynamics/docs, automated checks, and browser QA.
- PC invariant: Every implementation step either adds mobile media-query CSS or class hooks without visual effect outside mobile.
- Placeholder scan: No task relies on vague follow-up work; each code-changing step includes exact code or exact assertions.
- Type consistency: New class hooks use the same names in tests, JSX snippets, and CSS snippets.

Plan complete and saved to `docs/superpowers/plans/2026-06-16-mobile-only-responsive-adaptation.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
