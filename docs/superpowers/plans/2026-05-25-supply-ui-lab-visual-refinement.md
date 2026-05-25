# Supply UI Lab Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将牛马补给站 UI Lab 页面族从“高密度静态复刻”推进到“层级清楚、移动端保留记忆点、关键动作反馈明确”的游戏化产品原型。

**Architecture:** 先在共享 primitives、Topbar 和 CSS contract 中建立视觉层级能力，再逐页收敛视觉噪音和主流程反馈。所有变更限定在 UI Lab route、UI Lab components、UI Lab mock data、UI Lab tests 和 `app/globals.css` 的 Supply UI Lab 区域，不触碰生产 `SupplyStation` 真实业务。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4 global CSS, Vitest + jsdom.

---

## File Structure

Shared UI Lab layer:

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
  - Add visual hierarchy tones for panels and richer action/status tones.
  - Keep existing component names and call sites stable.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
  - Keep shared topbar API stable.
  - Add markup hooks for mobile title/resource layout and non-current tab visual hierarchy.
- Modify: `app/globals.css`
  - Add shared hierarchy variables and tone selectors.
  - Update Supply UI Lab page sections without changing unrelated app styles.

Dashboard:

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - Add mobile hero summary.
  - Strengthen completed quest sticker semantics and feedback hooks.
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
  - Only change labels/status fixtures if needed for UI states.
- Test: `__tests__/supply-dashboard-scene.test.tsx`
- Test: `__tests__/supply-ui-lab-mobile-css.test.ts`
- Test: `__tests__/supply-dashboard-scene-css.test.ts`

Shop:

- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
  - Add richer selected product/detail/action state hooks.
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
  - Ensure mock products cover available, limit reached, admin confirmation, and insufficient balance states.
- Test: `__tests__/supply-shop-scene.test.tsx`
- Test: `__tests__/supply-shop-scene-css.test.ts`

Task Record:

- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
  - Add stable event type classes and empty state.
- Test: `__tests__/supply-task-record-scene.test.tsx`
- Test: `__tests__/supply-task-record-scene-css.test.ts`

Backpack:

- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
  - Add item inspection states and action result preview.
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
  - Ensure mock details cover usable, active, admin-confirmed, and unavailable states.
- Test: `__tests__/supply-backpack-scene.test.tsx`
- Test: `__tests__/supply-backpack-scene-css.test.ts`

Draw Pool:

- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
  - Strengthen draw CTA state and rarity result hierarchy.
- Test: `__tests__/supply-draw-pool-scene.test.tsx`
- Test: `__tests__/supply-draw-pool-scene-css.test.ts`

Verification:

- Modify: `__tests__/supply-ui-lab-mobile-css.test.ts`
  - Update mobile contract from “hide Dashboard hero” to “show compact hero”.
- Create if useful: `tmp/visual-qa/` screenshots from local browser checks.
  - Visual QA artifacts stay untracked unless the project already tracks the specific baseline.

---

### Task 1: Add Shared Visual Hierarchy Primitives

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-ui-lab-primitives.test.tsx`

- [ ] **Step 1: Write the failing primitive tone test**

Add assertions to `__tests__/supply-ui-lab-primitives.test.tsx` inside `renders semantic panel, button, badge, progress, and filters` so it verifies the new tone class names without changing existing behavior.

```tsx
await act(async () => {
  root.render(
    <>
      <SupplyUiLabPixelPanel title="主焦点" tone="hero" ariaLabel="主焦点面板">
        <SupplyUiLabStatusBadge tone="rare">SSR</SupplyUiLabStatusBadge>
        <SupplyUiLabActionButton tone="secondary">次要动作</SupplyUiLabActionButton>
        <SupplyUiLabActionButton tone="quiet">稍后再说</SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
      <SupplyUiLabPixelPanel title="低噪信息" tone="quiet" ariaLabel="低噪信息面板">
        <SupplyUiLabActionButton tone="primary">主动作</SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </>,
  );
});

expect(container.querySelector(".supply-ui-lab-panel--hero")).not.toBeNull();
expect(container.querySelector(".supply-ui-lab-panel--quiet")).not.toBeNull();
expect(container.querySelector(".supply-ui-lab-status--rare")?.textContent).toBe("SSR");
expect(container.querySelector(".supply-ui-lab-action--quiet")?.textContent).toBe("稍后再说");
```

- [ ] **Step 2: Run the primitive test and verify it fails**

Run:

```bash
npm test -- supply-ui-lab-primitives
```

Expected: FAIL because `hero`, `quiet`, and `rare` are not yet valid primitive tones.

- [ ] **Step 3: Extend primitive TypeScript tone unions**

Modify `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`:

```ts
export type SupplyUiLabPanelTone = "hero" | "primary" | "paper" | "yellow" | "dark" | "quiet";
export type SupplyUiLabStatusTone = "success" | "warning" | "danger" | "muted" | "rare";
```

Update `SupplyUiLabActionButton` tone type:

```ts
tone?: "primary" | "secondary" | "ghost" | "quiet" | "danger";
```

- [ ] **Step 4: Add shared CSS tone rules**

In `app/globals.css`, under `/* Supply UI Lab shared primitives */`, add tone rules that preserve existing defaults and introduce hierarchy:

```css
.supply-ui-lab-panel--hero {
  border-width: 4px;
  background: #fff6cf;
  box-shadow: 6px 6px 0 rgba(17, 24, 39, 0.96);
}

.supply-ui-lab-panel--primary {
  border-width: 3px;
  background: #fff8e8;
  box-shadow: 3px 3px 0 rgba(17, 24, 39, 0.72);
}

.supply-ui-lab-panel--quiet {
  border-width: 2px;
  background: #fffaf0;
  box-shadow: none;
}

.supply-ui-lab-action--quiet {
  background: #fffaf0;
  color: #374151;
  box-shadow: none;
}

.supply-ui-lab-status--rare {
  border-color: #7c2d12;
  background: #fef3c7;
  color: #7c2d12;
}
```

- [ ] **Step 5: Run the primitive test and verify it passes**

Run:

```bash
npm test -- supply-ui-lab-primitives
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx app/globals.css __tests__/supply-ui-lab-primitives.test.tsx
git commit -m "feat: add supply ui visual hierarchy primitives"
```

---

### Task 2: Refine Shared Topbar Density and Mobile Contract

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-dashboard-scene.test.tsx`
- Test: `__tests__/supply-ui-lab-mobile-css.test.ts`

- [ ] **Step 1: Write the failing Topbar structure assertions**

In `__tests__/supply-dashboard-scene.test.tsx`, add assertions to the first render test:

```ts
expect(container.querySelector(".supply-ui-lab-current-page")).not.toBeNull();
expect(container.querySelector(".supply-ui-lab-current-page")?.textContent).toBe("我的状态");
expect(container.querySelector(".supply-ui-lab-resource-strip")).not.toBeNull();
expect(container.querySelectorAll(".supply-ui-lab-topbar-tab[aria-current='page']")).toHaveLength(1);
```

- [ ] **Step 2: Update mobile CSS test expectations**

In `__tests__/supply-ui-lab-mobile-css.test.ts`, add a test that requires three-row mobile topbar and non-truncated resources:

```ts
it("keeps the shared topbar readable as a three-row mobile header", () => {
  expectMobileRule(
    ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb)",
    [/grid-template-rows:\s*auto\s+auto\s+auto/, /overflow:\s*hidden/],
  );
  expectMobileRule(
    ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource-strip",
    /overflow-x:\s*auto/,
  );
  expectMobileRule(
    ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource strong",
    /text-overflow:\s*ellipsis/,
  );
});
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm test -- supply-dashboard-scene supply-ui-lab-mobile-css
```

Expected: FAIL because the new topbar markup hooks do not exist yet.

- [ ] **Step 4: Add Topbar markup hooks**

Modify `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`:

```tsx
{!isBreadcrumb ? <strong className="supply-ui-lab-current-page">{activeLabel}</strong> : null}
<div className="supply-ui-lab-resource-strip">
  <div className="supply-ui-lab-statusbar" aria-label="资源状态">
    {resources.map((resource) => (
      <div className={`supply-ui-lab-resource supply-ui-lab-resource--${resource.id}`} key={resource.id}>
        {/* keep existing resource content */}
      </div>
    ))}
    {/* keep existing user menu / close button */}
  </div>
</div>
```

Keep the existing resource contents unchanged; only wrap the statusbar and add the current-page label for responsive layout.

- [ ] **Step 5: Add desktop and mobile Topbar CSS**

In `app/globals.css`, update shared topbar rules:

```css
.supply-ui-lab-current-page {
  display: none;
}

.supply-ui-lab-resource-strip {
  min-width: 0;
}

.supply-ui-lab-topbar-tab:not([aria-current="page"]) {
  background: transparent;
  box-shadow: none;
}

.supply-ui-lab-resource {
  box-shadow: 2px 2px 0 rgba(17, 24, 39, 0.4);
}
```

Inside the existing `@media (max-width: 768px)` block:

```css
.supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto auto;
}

.supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-brand {
  min-width: 0;
}

.supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-current-page {
  display: inline-flex;
  align-items: center;
  justify-self: end;
  border: 2px solid #111827;
  background: #fff8e8;
  padding: 0.2rem 0.45rem;
  font-size: 0.82rem;
  font-weight: 900;
}

.supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-tabs {
  grid-column: 1 / -1;
}

.supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource-strip {
  grid-column: 1 / -1;
  overflow-x: auto;
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- supply-dashboard-scene supply-ui-lab-mobile-css
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx app/globals.css __tests__/supply-dashboard-scene.test.tsx __tests__/supply-ui-lab-mobile-css.test.ts
git commit -m "feat: refine supply ui lab topbar hierarchy"
```

---

### Task 3: Restore Dashboard Brand Memory on Mobile

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-dashboard-scene.test.tsx`
- Test: `__tests__/supply-ui-lab-mobile-css.test.ts`

- [ ] **Step 1: Replace the old mobile hidden-hero test**

In `__tests__/supply-ui-lab-mobile-css.test.ts`, replace the test named `removes the Dashboard character stage from the narrow mobile flow` with:

```ts
it("keeps a compact Dashboard hero in the narrow mobile flow", () => {
  expectMobileRule(".supply-dashboard-hero-stage", /display:\s*none/);
  expectMobileRule(".supply-dashboard-mobile-hero", /display:\s*grid/);
  expectMobileRule(".supply-dashboard-mobile-hero", /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/);
  expectMobileRule(".supply-dashboard-quest-list", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
```

- [ ] **Step 2: Add Dashboard scene assertions**

In `__tests__/supply-dashboard-scene.test.tsx`, add:

```ts
expect(container.querySelector(".supply-dashboard-mobile-hero")).not.toBeNull();
expect(container.querySelector(".supply-dashboard-mobile-hero img")?.getAttribute("src")).toBe(
  supplyDashboardAssetPaths.hero,
);
expect(container.querySelector(".supply-dashboard-mobile-hero")?.textContent).toContain("Lv.1");
expect(container.querySelector(".supply-dashboard-mobile-hero")?.textContent).toContain(supplyDashboardMock.motto);
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- supply-dashboard-scene supply-ui-lab-mobile-css
```

Expected: FAIL because `.supply-dashboard-mobile-hero` does not exist.

- [ ] **Step 4: Add compact mobile hero component**

In `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`, add:

```tsx
function MobileHeroSummary({ data }: { data: SupplyDashboardPreview }) {
  return (
    <section className="supply-dashboard-mobile-hero" aria-label="今日牛马状态摘要">
      <Image
        alt="脱脂牛马角色"
        height={96}
        src={supplyDashboardAssetPaths.hero}
        unoptimized
        width={72}
      />
      <div>
        <p>今日主线</p>
        <h2>{data.motto}</h2>
        <strong>Lv.{data.profile.level}</strong>
        <SupplyUiLabProgress
          current={data.profile.currentLevelExp}
          label="等级经验"
          max={data.profile.nextLevelExp}
          showPercent
          valueDisplay="tooltip"
        />
      </div>
    </section>
  );
}
```

Render it immediately before `<CharacterStatusPanel data={data} />` inside `.supply-dashboard-stage`.

- [ ] **Step 5: Add compact hero CSS**

In `app/globals.css`, add default hidden style near Dashboard rules:

```css
.supply-dashboard-mobile-hero {
  display: none;
}
```

Inside `@media (max-width: 768px)`:

```css
.supply-dashboard-mobile-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  border: 3px solid #111827;
  background: #fff8e8;
  padding: 0.75rem;
  box-shadow: 4px 4px 0 rgba(17, 24, 39, 0.72);
}

.supply-dashboard-mobile-hero img {
  width: 4.5rem;
  height: 5.25rem;
  object-fit: cover;
  object-position: top center;
  filter: drop-shadow(3px 3px 0 rgba(17, 24, 39, 0.25));
}

.supply-dashboard-mobile-hero p,
.supply-dashboard-mobile-hero h2 {
  margin: 0;
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- supply-dashboard-scene supply-ui-lab-mobile-css
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx app/globals.css __tests__/supply-dashboard-scene.test.tsx __tests__/supply-ui-lab-mobile-css.test.ts
git commit -m "feat: keep dashboard hero visible on mobile"
```

---

### Task 4: Reduce Dashboard Noise and Strengthen Quest Completion Feedback

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-dashboard-scene.test.tsx`
- Test: `__tests__/supply-dashboard-scene-css.test.ts`

- [ ] **Step 1: Add completion sticker assertions**

In `__tests__/supply-dashboard-scene.test.tsx`, add:

```ts
expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay[data-visual='stamp']")).toHaveLength(3);
expect(container.querySelector(".supply-dashboard-shortcut-card--home")?.getAttribute("data-priority")).toBe("primary");
expect(container.querySelector(".supply-dashboard-shortcut-card--backpack")?.getAttribute("data-priority")).toBe("secondary");
expect(container.querySelector(".supply-dashboard-announcement")?.getAttribute("data-priority")).toBe("quiet");
```

- [ ] **Step 2: Add CSS contract assertions**

In `__tests__/supply-dashboard-scene-css.test.ts`, add checks that Dashboard auxiliary elements use lighter shadows:

```ts
expect(css).toMatch(/\.supply-dashboard-status-panel[\s\S]*box-shadow:\s*3px\s+3px\s+0/);
expect(css).toMatch(/\.supply-dashboard-quest-card-complete-overlay\[data-visual="stamp"\]/);
expect(css).toMatch(/\.supply-dashboard-announcement\[data-priority="quiet"\][\s\S]*background:\s*#fef3c7/);
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm test -- supply-dashboard-scene supply-dashboard-scene-css
```

Expected: FAIL because data attributes and lighter CSS rules are not present.

- [ ] **Step 4: Add data attributes to Dashboard JSX**

Modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`:

```tsx
<div
  className="supply-dashboard-quest-card-complete-overlay"
  data-visual="stamp"
  aria-hidden="true"
>
  <span>✓</span>
  <strong>已完成</strong>
</div>
```

Update shortcut cards:

```tsx
data-priority={shortcut.id === "home" ? "primary" : "secondary"}
```

Update announcement:

```tsx
<aside className="supply-dashboard-announcement" data-priority="quiet" aria-label="团队公告">
```

- [ ] **Step 5: Refine Dashboard CSS hierarchy**

In `app/globals.css`, adjust Dashboard rules:

```css
.supply-dashboard-status-panel,
.supply-ui-lab-panel.supply-dashboard-status-panel {
  box-shadow: 3px 3px 0 rgba(17, 24, 39, 0.72);
}

.supply-dashboard-quest-card-complete-overlay[data-visual="stamp"] {
  border: 3px solid #14532d;
  background: rgba(220, 252, 231, 0.92);
  transform: rotate(-6deg);
}

.supply-dashboard-shortcut-card[data-priority="secondary"] {
  box-shadow: 3px 3px 0 rgba(17, 24, 39, 0.64);
}

.supply-dashboard-announcement[data-priority="quiet"] {
  border-top-width: 3px;
  background: #fef3c7;
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- supply-dashboard-scene supply-dashboard-scene-css
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx app/globals.css __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
git commit -m "feat: sharpen dashboard visual hierarchy"
```

---

### Task 5: Clarify Shop Selection, Detail Attributes, and Redemption States

**Files:**
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
- Modify: `app/globals.css`
- Test: `__tests__/supply-shop-scene.test.tsx`
- Test: `__tests__/supply-shop-scene-css.test.ts`

- [ ] **Step 1: Add selected product and action state tests**

In `__tests__/supply-shop-scene.test.tsx`, add to the first test:

```ts
const selectedProduct = container.querySelector("[data-testid='supply-shop-product-card'][aria-selected='true']");
expect(selectedProduct?.getAttribute("data-selected-visual")).toBe("focus");
expect(container.querySelector(".supply-shop-detail-attributes")).not.toBeNull();
expect(container.querySelector(".supply-shop-detail-attribute[data-attribute='effect']")?.textContent).toContain("效果");
expect(container.querySelector(".supply-shop-detail-attribute[data-attribute='timing']")?.textContent).toContain("使用时机");
expect(container.querySelector(".supply-shop-redeem-button")?.getAttribute("data-action-state")).toBe("available");
```

Add an insufficient-balance scenario:

```ts
it("shows a clear insufficient balance redemption state", async () => {
  await act(async () => {
    root.render(<SupplyShopScene data={supplyShopMock} />);
  });

  const expensiveCard = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-shop-product-card']"),
  ).find((card) => card.textContent?.includes("轻食便当兑换券"));

  expect(expensiveCard).toBeDefined();

  await act(async () => {
    expensiveCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(container.querySelector(".supply-shop-redeem-button")?.getAttribute("data-action-state")).toMatch(
    /insufficient|admin/,
  );
  expect(container.querySelector(".supply-shop-detail-cost")?.textContent).toContain("银子");
});
```

- [ ] **Step 2: Add CSS contract assertions**

In `__tests__/supply-shop-scene-css.test.ts`, add:

```ts
expect(css).toMatch(/\.supply-shop-product-card\[data-selected-visual="focus"\]/);
expect(css).toMatch(/\.supply-shop-detail-attributes/);
expect(css).toMatch(/\.supply-shop-redeem-button\[data-action-state="insufficient"\]/);
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm test -- supply-shop-scene supply-shop-scene-css
```

Expected: FAIL because product visual hooks and action states are not present.

- [ ] **Step 4: Extend shop action state model**

In `components/gamification/ui-lab/supply-shop/types.ts`, add:

```ts
export type SupplyShopRedeemState = "available" | "insufficient" | "limitReached" | "adminConfirmation";
```

Add to `SupplyShopProductDetail`:

```ts
redeemState: SupplyShopRedeemState;
redeemDisabledReason?: string;
```

- [ ] **Step 5: Update shop mock data states**

In `components/gamification/ui-lab/supply-shop/mock-data.ts`, set detail states:

```ts
redeemState: "available",
```

For real-world or admin-confirmed reward details:

```ts
redeemState: "adminConfirmation",
```

For the most expensive item or a daily-limited fixture:

```ts
redeemState: "insufficient",
redeemDisabledReason: "银子不足，还差 450",
```

- [ ] **Step 6: Update shop JSX detail structure**

In `SupplyShopScene.tsx`, add selected visual hook:

```tsx
data-selected-visual={selected ? "focus" : undefined}
```

Replace loose detail rules with:

```tsx
<dl className="supply-shop-detail-attributes">
  <div className="supply-shop-detail-attribute" data-attribute="source">
    <dt>来源</dt>
    <dd>{detail.sourceLabel}</dd>
  </div>
  <div className="supply-shop-detail-attribute" data-attribute="effect">
    <dt>效果</dt>
    <dd>{detail.effect}</dd>
  </div>
  <div className="supply-shop-detail-attribute" data-attribute="timing">
    <dt>使用时机</dt>
    <dd>{detail.useTiming}</dd>
  </div>
  <div className="supply-shop-detail-attribute" data-attribute="limit">
    <dt>购买限制</dt>
    <dd>{detail.limitLabel}</dd>
  </div>
</dl>
```

Update redeem button:

```tsx
<SupplyUiLabActionButton
  className="supply-shop-redeem-button"
  disabled={detail.redeemState === "insufficient" || detail.redeemState === "limitReached"}
  onClick={onRedeem}
  tone={detail.redeemState === "available" ? "primary" : "secondary"}
>
  <span data-action-state={detail.redeemState}>
    {detail.redeemState === "adminConfirmation" ? "申请兑换" : detail.redeemState === "insufficient" ? "银子不足" : "兑换"}
  </span>
</SupplyUiLabActionButton>
```

If `SupplyUiLabActionButton` does not forward arbitrary attributes, put `data-action-state={detail.redeemState}` on the button via a plain `button` with existing classes instead.

- [ ] **Step 7: Add shop CSS**

In `app/globals.css`:

```css
.supply-shop-product-card[data-selected-visual="focus"] {
  outline: 4px solid #facc15;
  outline-offset: 3px;
  transform: translate(-2px, -2px);
}

.supply-shop-detail-attributes {
  display: grid;
  gap: 0.55rem;
}

.supply-shop-detail-attribute {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.5rem;
  border-bottom: 2px dashed rgba(17, 24, 39, 0.25);
  padding-bottom: 0.45rem;
}

.supply-shop-redeem-button[data-action-state="insufficient"] {
  background: #e5e7eb;
  color: #4b5563;
}
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- supply-shop-scene supply-shop-scene-css
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/gamification/ui-lab/supply-shop app/globals.css __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts
git commit -m "feat: clarify supply shop item focus states"
```

---

### Task 6: Strengthen Task Record Timeline Scannability

**Files:**
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-task-record-scene.test.tsx`
- Test: `__tests__/supply-task-record-scene-css.test.ts`

- [ ] **Step 1: Add timeline type and empty state tests**

In `__tests__/supply-task-record-scene.test.tsx`, add:

```ts
expect(container.querySelectorAll(".supply-task-record-timeline-item[data-event-type]")).not.toHaveLength(0);
expect(
  Array.from(container.querySelectorAll(".supply-task-record-timeline-item[data-event-type]")).map((item) =>
    item.getAttribute("data-event-type"),
  ),
).toEqual(expect.arrayContaining(["task", "reward"]));
expect(container.querySelector(".supply-task-record-event-icon")).not.toBeNull();
```

Add an empty filter scenario:

```ts
it("shows a useful empty state for filters with no visible records", async () => {
  const emptyData = {
    ...supplyTaskRecordMock,
    recordsByDate: {
      ...supplyTaskRecordMock.recordsByDate,
      [supplyTaskRecordMock.activeDateKey]: [],
    },
  };

  await act(async () => {
    root.render(<SupplyTaskRecordScene data={emptyData} />);
  });

  expect(container.querySelector(".supply-task-record-empty-state")?.textContent).toContain("当前筛选没有记录");
});
```

- [ ] **Step 2: Add CSS contract assertions**

In `__tests__/supply-task-record-scene-css.test.ts`, add:

```ts
expect(css).toMatch(/\.supply-task-record-timeline-item\[data-event-type="task"\]/);
expect(css).toMatch(/\.supply-task-record-timeline-item\[data-event-type="draw"\]/);
expect(css).toMatch(/\.supply-task-record-empty-state/);
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm test -- supply-task-record-scene supply-task-record-scene-css
```

Expected: FAIL because event-type hooks and empty state are missing.

- [ ] **Step 4: Add event type mapping**

In `SupplyTaskRecordScene.tsx`, add:

```ts
const timelineEventTypeByCategory: Record<SupplyTaskRecordTimelineItem["category"], string> = {
  task: "task",
  reward: "reward",
  draw: "draw",
  redemption: "redemption",
  social: "social",
};

const timelineEventIconByType: Record<string, string> = {
  task: "✓",
  reward: "银",
  draw: "券",
  redemption: "兑",
  social: "友",
};
```

- [ ] **Step 5: Add timeline hooks and empty state JSX**

In the timeline record render:

```tsx
<article
  className="supply-task-record-timeline-item"
  data-event-type={timelineEventTypeByCategory[record.category]}
  data-status={record.status}
>
  <span className="supply-task-record-event-icon" aria-hidden="true">
    {timelineEventIconByType[timelineEventTypeByCategory[record.category]]}
  </span>
  {/* keep existing record content */}
</article>
```

Before rendering records:

```tsx
{records.length === 0 ? (
  <div className="supply-task-record-empty-state" role="status">
    <strong>当前筛选没有记录</strong>
    <p>切回“全部”可以查看今日完整任务、奖励和兑换流水。</p>
  </div>
) : null}
```

- [ ] **Step 6: Add task record CSS**

In `app/globals.css`:

```css
.supply-task-record-timeline-item[data-event-type="task"] {
  --task-record-event-color: #16a34a;
}

.supply-task-record-timeline-item[data-event-type="reward"] {
  --task-record-event-color: #ca8a04;
}

.supply-task-record-timeline-item[data-event-type="draw"] {
  --task-record-event-color: #a855f7;
}

.supply-task-record-timeline-item[data-event-type="redemption"] {
  --task-record-event-color: #ea580c;
}

.supply-task-record-timeline-item[data-event-type="social"] {
  --task-record-event-color: #2563eb;
}

.supply-task-record-event-icon {
  display: grid;
  width: 2rem;
  aspect-ratio: 1;
  place-items: center;
  border: 2px solid #111827;
  background: var(--task-record-event-color, #e5e7eb);
  color: #fff;
  font-weight: 1000;
}

.supply-task-record-empty-state {
  border: 2px dashed rgba(17, 24, 39, 0.42);
  background: #fffaf0;
  padding: 1rem;
}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- supply-task-record-scene supply-task-record-scene-css
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx app/globals.css __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
git commit -m "feat: improve task record timeline scanning"
```

---

### Task 7: Make Backpack Items Feel Inspectable and Actionable

**Files:**
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- Modify: `app/globals.css`
- Test: `__tests__/supply-backpack-scene.test.tsx`
- Test: `__tests__/supply-backpack-scene-css.test.ts`

- [ ] **Step 1: Add backpack detail and action tests**

In `__tests__/supply-backpack-scene.test.tsx`, add:

```ts
expect(container.querySelector(".supply-backpack-detail-card[data-inspection='item-card']")).not.toBeNull();
expect(container.querySelector(".supply-backpack-detail-result-preview")?.textContent).toContain("使用后");
expect(container.querySelector(".supply-backpack-use-button")?.getAttribute("data-action-state")).toMatch(
  /usable|active|admin|unavailable/,
);
expect(container.querySelector(".supply-backpack-slot[aria-selected='true']")?.getAttribute("data-selected-visual")).toBe(
  "focus",
);
```

- [ ] **Step 2: Add CSS contract assertions**

In `__tests__/supply-backpack-scene-css.test.ts`, add:

```ts
expect(css).toMatch(/\.supply-backpack-detail-card\[data-inspection="item-card"\]/);
expect(css).toMatch(/\.supply-backpack-slot\[data-selected-visual="focus"\]/);
expect(css).toMatch(/\.supply-backpack-detail-result-preview/);
expect(css).toMatch(/\.supply-backpack-use-button\[data-action-state="unavailable"\]/);
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm test -- supply-backpack-scene supply-backpack-scene-css
```

Expected: FAIL because inspection hooks and action states are missing.

- [ ] **Step 4: Extend backpack detail type**

In `components/gamification/ui-lab/supply-backpack/types.ts`, add:

```ts
export type SupplyBackpackActionState = "usable" | "active" | "admin" | "unavailable";
```

Add to `SupplyBackpackSelectedDetail`:

```ts
actionState: SupplyBackpackActionState;
resultPreview: string;
```

- [ ] **Step 5: Update backpack mock details**

In `components/gamification/ui-lab/supply-backpack/mock-data.ts`, every item detail gets:

```ts
actionState: "usable",
resultPreview: "使用后将立即进入今日效果，并持续到今日 23:59。",
```

Use varied states for at least three details:

```ts
actionState: "active",
resultPreview: "今天已经生效，可在左侧今日效果查看剩余时间。",
```

```ts
actionState: "admin",
resultPreview: "提交后进入管理员确认流程，确认后发放真实福利。",
```

```ts
actionState: "unavailable",
resultPreview: "当前场景不可使用，请在任务进行中再试。",
```

- [ ] **Step 6: Add backpack JSX hooks**

In the inventory slot button:

```tsx
data-selected-visual={slot.type === "item" && slot.item.id === selectedItemId ? "focus" : undefined}
```

In detail panel wrapper:

```tsx
<SupplyUiLabPixelPanel
  ariaLabel={`道具详情：${detail.name}`}
  className="supply-backpack-detail-card"
  tone="primary"
>
  <article className="supply-backpack-detail" data-inspection="item-card">
```

Add result preview:

```tsx
<div className="supply-backpack-detail-result-preview">
  <span>使用后</span>
  <p>{detail.resultPreview}</p>
</div>
```

Update action button:

```tsx
<button
  className="supply-backpack-use-button supply-ui-lab-action supply-ui-lab-action--primary"
  data-action-state={detail.actionState}
  disabled={detail.actionState === "active" || detail.actionState === "unavailable"}
  onClick={() => onAction(detail.actionLabel)}
  type="button"
>
  {detail.actionState === "active"
    ? "今日已生效"
    : detail.actionState === "admin"
      ? "申请使用"
      : detail.actionState === "unavailable"
        ? "暂不可用"
        : detail.actionLabel}
</button>
```

- [ ] **Step 7: Add backpack CSS**

In `app/globals.css`:

```css
.supply-backpack-slot[data-selected-visual="focus"] {
  outline: 4px solid #facc15;
  outline-offset: 3px;
}

.supply-backpack-detail-card[data-inspection="item-card"],
.supply-backpack-detail[data-inspection="item-card"] {
  position: relative;
}

.supply-backpack-detail-result-preview {
  border: 2px solid #111827;
  background: #fff8e8;
  padding: 0.75rem;
}

.supply-backpack-use-button[data-action-state="active"],
.supply-backpack-use-button[data-action-state="unavailable"] {
  background: #e5e7eb;
  color: #4b5563;
}
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- supply-backpack-scene supply-backpack-scene-css
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/gamification/ui-lab/supply-backpack app/globals.css __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
git commit -m "feat: add backpack item inspection states"
```

---

### Task 8: Make Draw Pool CTA and Result Rarity Hierarchy Obvious

**Files:**
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-draw-pool-scene.test.tsx`
- Test: `__tests__/supply-draw-pool-scene-css.test.ts`

- [ ] **Step 1: Add draw CTA and rarity result tests**

In `__tests__/supply-draw-pool-scene.test.tsx`, add:

```ts
expect(container.querySelector(".supply-draw-pool-machine-controls")?.getAttribute("data-control-style")).toBe(
  "arcade",
);
expect(container.querySelector(".supply-draw-pool-action--ten")?.getAttribute("data-priority")).toBe("primary");
expect(container.querySelector(".supply-draw-pool-action--single")?.getAttribute("data-priority")).toBe("secondary");
```

In the existing draw interaction test, after triggering a draw:

```ts
expect(container.querySelector(".supply-draw-pool-result")?.getAttribute("data-result-reveal")).toBe("rarity");
expect(container.querySelectorAll(".supply-draw-pool-drop[data-rarity]")).not.toHaveLength(0);
```

- [ ] **Step 2: Add CSS contract assertions**

In `__tests__/supply-draw-pool-scene-css.test.ts`, add:

```ts
expect(css).toMatch(/\.supply-draw-pool-machine-controls\[data-control-style="arcade"\]/);
expect(css).toMatch(/\.supply-draw-pool-action\[data-priority="primary"\]/);
expect(css).toMatch(/\.supply-draw-pool-result\[data-result-reveal="rarity"\]/);
expect(css).toMatch(/\.supply-draw-pool-drop\[data-rarity="SSR"\]/);
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm test -- supply-draw-pool-scene supply-draw-pool-scene-css
```

Expected: FAIL because draw priority and rarity hooks are missing.

- [ ] **Step 4: Add CTA priority hooks**

In `SupplyDrawPoolScene.tsx`, update controls:

```tsx
<div className="supply-draw-pool-machine-controls" data-control-style="arcade">
```

Update each action button:

```tsx
data-priority={action.id === "ten" ? "primary" : "secondary"}
```

If `SupplyUiLabActionButton` does not forward arbitrary attributes, replace the action with a plain button using:

```tsx
<button
  aria-label={...}
  className={`supply-ui-lab-action supply-draw-pool-action supply-draw-pool-action--${action.id}`}
  data-priority={action.id === "ten" ? "primary" : "secondary"}
  disabled={disabled}
  onClick={() => onDraw(action.drawCount)}
  type="button"
>
  {/* keep existing label/cost/guarantee contents */}
</button>
```

- [ ] **Step 5: Add result rarity hooks**

In `DrawResultPanel`:

```tsx
<SupplyUiLabPixelPanel
  ariaLabel={resultLabel}
  className="supply-draw-pool-result"
  title={resultLabel}
>
  <div data-result-reveal="rarity">
```

Or put `data-result-reveal="rarity"` directly on the rendered result panel wrapper if the primitive can pass it through.

In `DrawRewardList`:

```tsx
<li
  className={`supply-draw-pool-drop supply-draw-pool-drop--${drop.rarity.toLowerCase()}`}
  data-rarity={drop.rarity}
  key={drop.id}
>
```

- [ ] **Step 6: Add draw pool CSS**

In `app/globals.css`:

```css
.supply-draw-pool-machine-controls[data-control-style="arcade"] {
  align-items: end;
}

.supply-draw-pool-action[data-priority="primary"] {
  min-height: 4.75rem;
  background: #f97316;
  box-shadow: 6px 6px 0 rgba(17, 24, 39, 0.96);
}

.supply-draw-pool-action[data-priority="secondary"] {
  min-height: 4rem;
  box-shadow: 3px 3px 0 rgba(17, 24, 39, 0.72);
}

.supply-draw-pool-result[data-result-reveal="rarity"],
.supply-draw-pool-result [data-result-reveal="rarity"] {
  border-color: #7c2d12;
}

.supply-draw-pool-drop[data-rarity="SSR"] {
  border-color: #f59e0b;
  background: #fef3c7;
  transform: translateY(-2px);
}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- supply-draw-pool-scene supply-draw-pool-scene-css
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx app/globals.css __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
git commit -m "feat: emphasize draw pool actions and rarity"
```

---

### Task 9: Run Integrated Verification and Visual QA

**Files:**
- No required source changes unless verification finds an issue.

- [ ] **Step 1: Run focused UI Lab test set**

Run:

```bash
npm test -- supply-ui-lab-primitives supply-ui-lab-mobile-css supply-dashboard-scene supply-dashboard-scene-css supply-shop-scene supply-shop-scene-css supply-task-record-scene supply-task-record-scene-css supply-backpack-scene supply-backpack-scene-css supply-draw-pool-scene supply-draw-pool-scene-css
```

Expected: all selected Vitest suites pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: `tsc --noEmit` exits 0.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js production build exits 0.

- [ ] **Step 4: Start local dev server for visual QA**

Run:

```bash
npm run dev
```

Expected: local server starts on `http://localhost:3001`. If port 3001 is already in use by this project, reuse the existing server.

- [ ] **Step 5: Browser-check required routes**

Open these routes in desktop `1440 x 1100` and mobile `390 x 844`:

```text
http://localhost:3001/ui-lab/supply-dashboard
http://localhost:3001/ui-lab/supply-dashboard/shop
http://localhost:3001/ui-lab/supply-dashboard/task-record
http://localhost:3001/ui-lab/supply-dashboard/backpack
http://localhost:3001/ui-lab/supply-dashboard/draw-pool
```

Expected:

- Dashboard desktop makes the character and today tasks the strongest focal points.
- Dashboard mobile shows compact hero before status/task content.
- Shop selected product and redeem state are obvious.
- Task Record event type color/icon system is scannable.
- Backpack selected item and result preview are obvious.
- Draw Pool ten-draw CTA and rarity result hierarchy are obvious.
- Topbar resource values remain readable on mobile.
- No text overlap in buttons, cards, topbar, or detail panels.

- [ ] **Step 6: Fix verification regressions**

If any test, typecheck, build, or visual QA check fails, make the smallest targeted fix in the corresponding page/component and rerun the failing command. Do not broaden scope beyond the visual refinement spec.

- [ ] **Step 7: Commit final fixes**

```bash
git add components/gamification/ui-lab app/globals.css __tests__
git commit -m "test: verify supply ui lab visual refinement"
```

---

## Self-Review Notes

Spec coverage:

- Shared hierarchy primitives: Task 1.
- Topbar density and mobile resources: Task 2.
- Dashboard mobile hero and visual focus: Tasks 3 and 4.
- Shop selection/detail/action states: Task 5.
- Task Record timeline scanning and empty state: Task 6.
- Backpack inspection and action states: Task 7.
- Draw Pool CTA and rarity hierarchy: Task 8.
- Desktop/mobile visual QA and verification: Task 9.

Scope boundary:

- The plan does not connect real APIs, Prisma, session data, production `SupplyStation`, or real economic mutations.
- The plan does not add routes or new UI library dependencies.
- Each task can be implemented, tested, and committed independently.

