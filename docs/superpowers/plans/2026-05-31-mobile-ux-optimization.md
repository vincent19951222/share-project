# Mobile UX Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile experience for the top navigation, 牛马日历, 战报中心, and 牛马补给站 fit a 375-430px phone viewport without changing the desktop UI.

**Architecture:** Keep the desktop presentation as the source of truth and add mobile-only layout contracts under `@media (max-width: 760px)` or component classes that are hidden on desktop. Use existing Next.js/React components, existing CSS tests, and the current brutalist visual language; do not introduce a UI library or new routing model. Preserve all production data/API behavior.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes, `app/globals.css`, Vitest + jsdom, in-app browser visual verification at 393x852 and 375x812.

---

## Assumptions

- Desktop means widths above `760px`. Desktop selectors and default CSS must remain visually equivalent.
- Mobile means `max-width: 760px`, with primary verification at 393x852 and 375x812.
- The current worktree has unrelated dirty files in supply production assets. Before implementation, inspect them and only edit a dirty file when a task explicitly requires it.
- No backend, Prisma, API route, or data model changes are needed.
- Mobile optimization should improve hierarchy and touch ergonomics, not remove product functionality.

## Success Criteria

- Top nav closed state stays within one row at 375px and 393px, with no overlapping assets.
- Mobile touch targets for nav, profile, wallet, and critical supply actions are at least `44px` high or have an equivalent hit area.
- 牛马日历 no longer has the current `72px` mobile top gap; the paper surface uses most of the available width and the month grid reads as a grid rather than tall narrow columns.
- 战报中心 first screen shows the report title, the core summary, vault/metric context, and the start of the trend section without a cramped poster feel.
- 牛马补给站 status page becomes a mobile task flow: status summary, daily quest list, reward claim, shortcut nav. It must not rely on desktop absolute-positioned stage layout on mobile.
- The four targeted suites pass during task work: `__tests__/navbar-supply-chrome.test.tsx`, `__tests__/home-ui-calendar-scene-css.test.ts`, `__tests__/home-ui-report-scene-css.test.ts`, and `__tests__/supply-ui-lab-mobile-css.test.ts`. Then `npm run lint` and `npm run build` pass before completion.
- In-app browser verification confirms no horizontal scroll and no incoherent overlap on `/report`, `/calendar`, and `/dashboard/status`.

## File Structure

- Modify `components/navbar/Navbar.tsx`: add a mobile-only wallet summary button and keep the existing desktop asset chips.
- Modify `app/globals.css`: add mobile nav, calendar, report, and supply layout rules; keep desktop rules outside mobile media unchanged unless a test proves the change is desktop-neutral.
- Modify `__tests__/navbar-supply-chrome.test.tsx`: cover the mobile wallet DOM contract and preserve existing desktop supply assets.
- Modify `__tests__/home-ui-calendar-scene-css.test.ts`: lock the mobile calendar gap, width, and compact summary rules.
- Modify `__tests__/home-ui-report-scene-css.test.ts`: lock the mobile report compact hierarchy rules.
- Modify `__tests__/supply-ui-lab-mobile-css.test.ts`: lock the mobile supply dashboard task-flow rules.
- Modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx` only if the CSS-only mobile task flow cannot provide readable actions. Prefer CSS first.
- Modify `components/gamification/ui-lab/task-cards/TaskCardPreview.tsx` only if supply quest card action placement cannot be solved through existing `density="dashboard"` styling.

## Baseline Evidence From 2026-05-31 Audit

- `/report` at 393x852: closed nav height `77px`; asset strip width `159px`; each asset chip height `33px`; report header height `322px`; metrics height `291px`; trend card height `494px`; coffee card height `559px`; weekly report height `1306px`.
- `/calendar` at 393x852: `.calendar-scene` has `margin-top: 72px`; paper surface width is about `304px`; visible grid width is about `263px`; day cells are about `32x66px`.
- `/dashboard/status` at 393x852: status page total height is about `1935px`; daily quest panel height is about `1025px`; each quest card shell is about `158x210px`; content is a patched UI Lab stage rather than a phone-first flow.

---

### Task 1: Mobile Top Nav And Wallet Contract

**Files:**
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/navbar-supply-chrome.test.tsx`

- [ ] **Step 1: Write the failing navbar test**

Add this test to `__tests__/navbar-supply-chrome.test.tsx` inside the existing `describe("Navbar supply chrome", () => {` block, after the asset placeholder test:

```tsx
  it("renders a compact mobile wallet while preserving desktop supply asset chips", async () => {
    activeTab = "dash";

    await act(async () => {
      root.render(<Navbar activeTabOverride="dash" supplyNavContext={supplyNavContext} />);
    });

    const wallet = container.querySelector<HTMLButtonElement>(".app-supply-mobile-wallet");
    expect(wallet).not.toBeNull();
    expect(wallet?.getAttribute("aria-label")).toBe("补给站资产：银子 440，抽奖券 7，背包 12/60");
    expect(wallet?.textContent).toContain("440");
    expect(wallet?.textContent).toContain("7");
    expect(wallet?.textContent).toContain("12/60");

    expect(container.querySelectorAll(".app-supply-asset-chip")).toHaveLength(3);
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("银子");
  });
```

- [ ] **Step 2: Run the navbar test to verify it fails**

Run:

```bash
npm test -- --run __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because `.app-supply-mobile-wallet` does not exist.

- [ ] **Step 3: Add the mobile wallet markup**

In `components/navbar/Navbar.tsx`, create a compact label before `return`:

```tsx
  const supplyAssetSummary = supplyNavContext
    ? supplyNavContext.resources
        .map((resource) => {
          const valueLabel = resource.maxValue ? `${resource.value}/${resource.maxValue}` : `${resource.value}`;
          return `${resource.label} ${valueLabel}`;
        })
        .join("，")
    : "加载中";
```

Inside the right-side nav cluster, place this button immediately before the existing supply asset `<div>` whose class starts with `app-supply-assets`:

```tsx
            <button
              type="button"
              aria-label={`补给站资产：${supplyAssetSummary}`}
              className="app-supply-mobile-wallet"
            >
              <AssetIcon name="supply" className="h-5 w-5 object-contain" />
              <span>{supplyAssetSummary}</span>
            </button>
```

- [ ] **Step 4: Add mobile-only CSS for nav density**

In `app/globals.css`, add the default hidden state near `.app-supply-assets`:

```css
.app-supply-mobile-wallet {
  display: none;
}
```

Inside the existing `@media (max-width: 760px)` nav section, add or update these rules:

```css
  .app-top-nav {
    padding-inline: 0.5rem;
  }

  .app-top-nav > div:first-child {
    min-height: 3.75rem;
    padding: 0.42rem 0.5rem;
  }

  .app-top-nav .font-black.text-2xl {
    width: 2rem;
    overflow: hidden;
  }

  .mobile-nav-toggle,
  .app-top-nav .team-dynamics-bell button,
  .app-top-nav button[aria-label^="补给站资产"],
  .app-top-nav button:has(img[alt]) {
    min-width: 44px;
    min-height: 44px;
  }

  .app-supply-assets {
    display: none;
  }

  .app-supply-mobile-wallet {
    display: inline-grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.28rem;
    max-width: clamp(5rem, 28vw, 7rem);
    min-height: 44px;
    border: 2px solid #111827;
    border-radius: 999px;
    background: #f8fafc;
    color: #111827;
    padding: 0.18rem 0.45rem;
    box-shadow: 0 3px 0 rgba(17, 24, 39, 0.35);
    font: inherit;
    font-size: 0.72rem;
    font-weight: 1000;
  }

  .app-supply-mobile-wallet span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
```

- [ ] **Step 5: Verify navbar test passes**

Run:

```bash
npm test -- --run __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Browser-check the top nav**

Use the in-app browser at `http://localhost:3001/report` and `http://localhost:3001/dashboard/status` with a 393x852 viewport.

Expected:
- The closed top nav is one row.
- The wallet summary does not overlap the bell or avatar.
- Opening the mobile menu still shows all six primary tabs.
- Desktop `min-[761px]` tab strip behavior remains unchanged.

- [ ] **Step 7: Commit Task 1**

```bash
git add components/navbar/Navbar.tsx app/globals.css __tests__/navbar-supply-chrome.test.tsx
git commit -m "fix: compact mobile top navigation assets"
```

---

### Task 2: 牛马日历 Mobile Density

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/home-ui-calendar-scene-css.test.ts`

- [ ] **Step 1: Write the failing calendar CSS test**

In `__tests__/home-ui-calendar-scene-css.test.ts`, extend the existing test named `includes responsive and reduced-motion coverage for the calendar scene` with these expectations:

```ts
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-scene") &&
          /margin-top:\s*0/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-month-grid") &&
          /grid-auto-rows:\s*minmax\(2\.75rem,\s*1fr\)/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes("@media (max-width: 430px)") === false &&
          block.includes(".calendar-summary-row") &&
          /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(block),
      ),
    ).toBe(true);
```

- [ ] **Step 2: Run the calendar CSS test to verify it fails**

Run:

```bash
npm test -- --run __tests__/home-ui-calendar-scene-css.test.ts
```

Expected: FAIL because mobile `.calendar-scene` currently inherits a tablet `margin-top`.

- [ ] **Step 3: Add compact mobile calendar CSS**

In `app/globals.css`, update the final `@media (max-width: 760px)` calendar block so the mobile override is after the tablet rule:

```css
  .calendar-scene {
    margin-top: 0;
    border-radius: 1rem;
  }

  .calendar-board-viewport {
    padding: 0.5rem;
  }

  .calendar-scene-content {
    padding: 0.35rem;
  }

  .calendar-binder-shell {
    padding: 0.25rem 0.28rem 0.35rem 0.42rem;
  }

  .calendar-paper-surface {
    gap: 0.5rem;
    padding: 0.72rem;
    padding-left: 0.85rem;
  }

  .calendar-header {
    gap: 0.45rem;
    padding-bottom: 0.45rem;
  }

  .calendar-header-title {
    font-size: 1.55rem;
  }

  .calendar-header-month {
    font-size: 1rem;
  }

  .calendar-header-actions {
    gap: 0.4rem;
  }

  .calendar-summary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .calendar-summary-chip {
    min-height: 2.85rem;
    padding: 0.35rem 0.42rem;
  }

  .calendar-summary-icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .calendar-summary-label,
  .calendar-summary-unit {
    font-size: 0.72rem;
  }

  .calendar-summary-value {
    font-size: 1.25rem;
  }

  .calendar-grid-section {
    min-height: 0;
  }

  .calendar-month-grid {
    grid-auto-rows: minmax(2.75rem, 1fr);
    overflow: hidden;
  }

  .calendar-day-cell,
  .calendar-neighbor-cell {
    min-height: 2.75rem;
  }
```

Replace the existing `@media (max-width: 430px)` calendar summary override with:

```css
@media (max-width: 430px) {
  .calendar-summary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 4: Verify calendar CSS test passes**

Run:

```bash
npm test -- --run __tests__/home-ui-calendar-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Browser-check `/calendar`**

Use the in-app browser at `http://localhost:3001/calendar` with 393x852 and 375x812.

Expected:
- No top blank gap between nav and calendar scene.
- The paper surface is visually wider than the current 263px content width.
- Summary chips stay two-up.
- The calendar grid does not require horizontal scroll.

- [ ] **Step 6: Commit Task 2**

```bash
git add app/globals.css __tests__/home-ui-calendar-scene-css.test.ts
git commit -m "fix: tighten mobile calendar layout"
```

---

### Task 3: 战报中心 Mobile Hierarchy

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/home-ui-report-scene-css.test.ts`

- [ ] **Step 1: Write the failing report CSS test**

In `__tests__/home-ui-report-scene-css.test.ts`, extend the mobile section test with these expectations:

```ts
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-header-strip") &&
          /min-height:\s*0/.test(block) &&
          /padding:\s*0\.75rem/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-header-decor-row") &&
          /display:\s*none/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".coffee-report-inset-shell") &&
          /min-height:\s*0/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".game-weekly-report-desk") &&
          /max-height:\s*42rem/.test(block) &&
          /overflow-y:\s*auto/.test(block),
      ),
    ).toBe(true);
```

- [ ] **Step 2: Run the report CSS test to verify it fails**

Run:

```bash
npm test -- --run __tests__/home-ui-report-scene-css.test.ts
```

Expected: FAIL because the mobile report still keeps large desktop-derived card heights.

- [ ] **Step 3: Add mobile report compression CSS**

In `app/globals.css`, update the `@media (max-width: 760px)` report block:

```css
  .report-board {
    padding: 0.5rem;
  }

  .report-scene {
    border-radius: 1rem;
    box-shadow: 0 8px 0 0 #111827;
  }

  .report-scene-content {
    gap: 0.6rem;
    padding: 0.55rem;
  }

  .report-header-strip {
    min-height: 0;
    border-width: 3px;
    border-radius: 1rem;
    padding: 0.75rem !important;
    box-shadow: 4px 4px 0 #1f2937;
  }

  .report-header-strip > .relative.grid {
    gap: 0.6rem !important;
  }

  .report-header-strip h1 {
    font-size: 1.55rem !important;
    line-height: 1 !important;
  }

  .report-header-copy {
    gap: 0.45rem !important;
    padding-bottom: 0 !important;
  }

  .report-header-copy p {
    font-size: 0.78rem !important;
    line-height: 1.35 !important;
  }

  .report-header-decor-row {
    display: none !important;
  }

  .report-header-vault {
    border-width: 2px !important;
    border-radius: 0.85rem !important;
    padding: 0.65rem !important;
  }

  .report-header-vault img {
    height: 2.6rem !important;
  }

  .report-scene-metrics {
    gap: 0.55rem;
  }

  .report-metric-tile {
    min-height: 4.2rem !important;
    border-width: 3px;
    box-shadow: 4px 4px 0 #1f2937;
  }

  .report-analysis-paper {
    min-height: 20rem;
    border-width: 3px;
    box-shadow: 4px 4px 0 #1f2937;
  }

  .report-analysis-body-grid {
    min-height: 12rem;
  }

  .coffee-report-inset-shell {
    min-height: 0;
    border-width: 3px;
    box-shadow: 4px 4px 0 rgba(120, 53, 15, 0.18);
  }

  .coffee-report-scene {
    min-height: 11rem;
  }

  .game-weekly-report-desk {
    max-height: 42rem;
    overflow-y: auto;
    border-width: 3px;
    box-shadow: 4px 4px 0 #1f2937;
    -webkit-overflow-scrolling: touch;
  }
```

- [ ] **Step 4: Verify report CSS test passes**

Run:

```bash
npm test -- --run __tests__/home-ui-report-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Browser-check `/report`**

Use the in-app browser at `http://localhost:3001/report` with 393x852 and 375x812.

Expected:
- Header no longer consumes roughly 322px.
- The first screen shows title, summary, vault, and at least two metric tiles without visible overlap.
- Trend chart starts near the first screen instead of after a long poster stack.
- Weekly report scrolls inside its own card only when its content exceeds the mobile cap.

- [ ] **Step 6: Commit Task 3**

```bash
git add app/globals.css __tests__/home-ui-report-scene-css.test.ts
git commit -m "fix: clarify mobile report hierarchy"
```

---

### Task 4: 牛马补给站 Mobile Task Flow

**Files:**
- Modify: `app/globals.css`
- Modify only if required: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Test: `__tests__/supply-ui-lab-mobile-css.test.ts`

- [ ] **Step 1: Write the failing supply mobile CSS test**

In `__tests__/supply-ui-lab-mobile-css.test.ts`, add this test:

```ts
  it("turns the embedded dashboard into a phone-first task flow", () => {
    expectMobileRule(".supply-dashboard-scene--embedded .supply-dashboard-content", [
      /padding:\s*0\.5rem/,
      /min-height:\s*100%/,
    ]);
    expectMobileRule(".supply-dashboard-scene--embedded .supply-dashboard-stage", [
      /gap:\s*0\.65rem/,
      /width:\s*100%/,
    ]);
    expectMobileRule(".supply-dashboard-scene--embedded .supply-dashboard-quest-panel", [
      /max-height:\s*none/,
      /overflow:\s*visible/,
    ]);
    expectMobileRule(".supply-dashboard-scene--embedded .supply-dashboard-quest-card-shell", [
      /width:\s*100%/,
      /min-height:\s*0/,
    ]);
  });
```

- [ ] **Step 2: Run the supply mobile CSS test to verify it fails**

Run:

```bash
npm test -- --run __tests__/supply-ui-lab-mobile-css.test.ts
```

Expected: FAIL because embedded dashboard mobile rules are still broad static-scene overrides.

- [ ] **Step 3: Inspect dirty supply files before editing**

Run:

```bash
git diff -- components/gamification/production/SupplyStationShell.tsx components/gamification/production/supply-ui-lab-adapters.ts components/gamification/ui-lab/supply-dashboard/assets.ts components/gamification/ui-lab/supply-dashboard/mock-data.ts
```

Expected: Review output and avoid changing these dirty files in this task unless the diff shows the current task depends on them.

- [ ] **Step 4: Add embedded dashboard mobile flow CSS**

In `app/globals.css`, after the existing embedded scene rules near `.supply-dashboard-scene--embedded`, add:

```css
@media (max-width: 768px) {
  .supply-dashboard-scene--embedded .supply-dashboard-content {
    min-height: 100%;
    padding: 0.5rem;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-stage {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.65rem;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-mobile-hero,
  .supply-dashboard-scene--embedded .supply-dashboard-status-panel,
  .supply-dashboard-scene--embedded .supply-dashboard-quest-panel,
  .supply-dashboard-scene--embedded .supply-dashboard-shortcut-dock,
  .supply-dashboard-scene--embedded .supply-dashboard-announcement {
    width: 100%;
    min-width: 0;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-quest-panel {
    max-height: none;
    overflow: visible;
    padding: 0.75rem;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-quest-heading {
    gap: 0.5rem;
    padding-bottom: 0.45rem;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-quest-progress {
    align-items: flex-end;
    flex-direction: column;
    gap: 0.28rem;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-quest-card-shell {
    width: 100%;
    min-height: 0;
    justify-self: stretch;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-quest-card.supply-task-card {
    min-height: 8.25rem;
  }

  .supply-dashboard-scene--embedded .supply-task-card-action {
    min-height: 44px;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-quest-footer {
    grid-template-columns: 1fr;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-claim-button {
    min-height: 44px;
    width: 100%;
  }

  .supply-dashboard-scene--embedded .supply-dashboard-shortcut-card {
    min-height: 4.25rem;
  }
}
```

- [ ] **Step 5: If task cards still look like tall posters, add a mobile dashboard density hook**

Only perform this step if the browser check after Step 4 still shows each quest card as a tall 3:4 card. In `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`, add a wrapper modifier around the quest list:

```tsx
      <div className="supply-dashboard-quest-list supply-dashboard-quest-list--mobile-flow">
        {quests.map((quest, index) => (
          <QuestCard
            index={index}
            key={quest.id}
            onComplete={onCompleteQuest}
            onReroll={onRerollQuest}
            quest={quest}
          />
        ))}
      </div>
```

Then add mobile CSS:

```css
@media (max-width: 768px) {
  .supply-dashboard-quest-list--mobile-flow {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 6: Verify supply mobile CSS test passes**

Run:

```bash
npm test -- --run __tests__/supply-ui-lab-mobile-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Browser-check `/dashboard/status`**

Use the in-app browser at `http://localhost:3001/dashboard/status` with 393x852 and 375x812.

Expected:
- Status page has no horizontal scroll.
- Top summary, status panel, quest panel, rewards, and shortcuts form a single readable phone column.
- Quest action buttons are not cramped and are at least `44px` high.
- The page height decreases materially from the baseline `1935px` without hiding critical actions.

- [ ] **Step 8: Commit Task 4**

```bash
git add app/globals.css __tests__/supply-ui-lab-mobile-css.test.ts components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx
git commit -m "fix: streamline supply dashboard mobile flow"
```

If Step 5 was skipped, omit `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx` from `git add`.

---

### Task 5: Cross-Route Mobile Verification And Desktop Guardrail

**Files:**
- Modify if screenshots reveal issues: `app/globals.css`
- No new test file required unless a regression is found.

- [ ] **Step 1: Run targeted regression tests**

Run:

```bash
npm test -- --run __tests__/navbar-supply-chrome.test.tsx __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-report-scene-css.test.ts __tests__/supply-ui-lab-mobile-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run broader relevant UI tests**

Run:

```bash
npm test -- --run __tests__/calendar-board.test.tsx __tests__/report-center-component.test.tsx __tests__/supply-dashboard-scene.test.tsx __tests__/supply-production-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run lint
```

Expected: TypeScript completes with no errors.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build completes successfully.

- [ ] **Step 5: Verify desktop is unchanged**

Use the in-app browser or a local browser at widths `1024px` and `1440px` for:

```text
http://localhost:3001/report
http://localhost:3001/calendar
http://localhost:3001/dashboard/status
```

Expected:
- Desktop tab strip still appears at `min-[761px]`.
- Desktop report scene keeps the editorial desk composition.
- Desktop calendar keeps the binder/desk composition.
- Desktop supply dashboard keeps its UI Lab stage layout.

- [ ] **Step 6: Verify mobile acceptance**

Use the in-app browser at `393x852` and `375x812` for:

```text
http://localhost:3001/report
http://localhost:3001/calendar
http://localhost:3001/dashboard/status
```

For each route, record:
- `document.documentElement.scrollWidth <= window.innerWidth`
- No visually overlapping nav, cards, text, or buttons.
- All primary mobile actions are visible and tappable.
- Vertical scrolling feels like one main page, not nested fighting scroll regions.

- [ ] **Step 7: Commit verification fixes**

If Step 5 or Step 6 required CSS adjustments, run targeted tests again and commit:

```bash
git add app/globals.css
git commit -m "fix: polish mobile responsive verification"
```

If no adjustments were needed, skip this commit.

---

## Self-Review

- Spec coverage: Top nav, 牛马日历, 战报中心, and 牛马补给站 each have a dedicated task with files, tests, browser checks, and success criteria.
- Desktop guardrail: Every visual task is scoped to mobile media rules or mobile-only markup hidden on desktop; Task 5 explicitly verifies 1024px and 1440px.
- Placeholder scan: The plan contains no placeholder markers, no unbounded error-handling instruction, and no step that asks for unspecified tests.
- Type consistency: Component names and classes match the current code: `Navbar`, `CalendarBoard`, `ReportCenter`, `SupplyDashboardScene`, `.app-supply-assets`, `.calendar-scene`, `.report-scene-content`, `.supply-dashboard-scene--embedded`.
- Risk: `app/globals.css` is large and has repeated mobile blocks. Implementation should place new overrides near the existing relevant sections and verify cascade order with tests before browser inspection.
