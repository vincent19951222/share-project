# Supply UI Lab Componentized Static Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing 6-page Supply UI Lab static prototype from panel-image-driven pages into maintainable TSX/CSS componentized static pages, while removing Ranking from the top navigation.

**Architecture:** Keep all work isolated under `/ui-lab/supply-dashboard/*` and `components/gamification/ui-lab/*`. Use shared UI Lab primitives for topbar, panels, buttons, resource pills, tabs, progress, and status badges, then rebuild page surfaces with structured mock data and atomic media assets. Do not touch production `components/gamification/SupplyStation.tsx` or real data flows.

**Tech Stack:** Next.js App Router, TypeScript strict mode, React components, Tailwind-compatible global CSS in `app/globals.css`, Vitest + jsdom tests, `next/image` for atomic media.

---

## File Structure

Shared files:

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
  - Remove Ranking tab.
  - Export shared topbar tab metadata only if tests or page components need it.
- Create: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
  - Shared presentational components: `SupplyUiLabPixelPanel`, `SupplyUiLabActionButton`, `SupplyUiLabResourcePill`, `SupplyUiLabStatusBadge`, `SupplyUiLabProgress`, `SupplyUiLabFilterBar`.
- Modify: `app/globals.css`
  - Consolidate Supply UI Lab CSS into one active set.
  - Add shared primitive rules.
  - Remove obsolete screenshot-hotspot rules after their JSX no longer uses them.

Page files:

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
- Modify: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/types.ts`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/types.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/types.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`

Tests:

- Modify existing `__tests__/supply-*-*.test.ts*` files.
- Add focused tests only when an existing file cannot express a new shared primitive contract cleanly.

Assets:

- Keep atomic media under `public/assets/home-scenes/supply/<page>/`.
- Remove references to obsolete panel crops from mock data and tests before deleting files.
- Do not delete physical panel crop files until no test or component references them; deletion can be a final cleanup commit.

---

### Task 1: Remove Ranking From Shared Navigation

**Files:**

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`
- Modify: `__tests__/supply-dashboard-scene-css.test.ts`
- Modify: route/page tests if they assert tab counts

- [ ] **Step 1: Write the failing topbar test**

Update the Dashboard scene render test to assert the shared tab labels do not include Ranking:

```ts
const tabs = Array.from(container.querySelectorAll(".supply-ui-lab-topbar-tab")).map((tab) =>
  tab.textContent?.trim(),
);

expect(tabs).toEqual(["⌂我的状态", "◎团队目标", "▤补给商店", "▣任务记录"]);
expect(container.textContent).not.toContain("排行榜");
expect(container.querySelector('a[href="#"]')).toBeNull();
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL because `排行榜` is still rendered by `SupplyUiLabTopBar`.

- [ ] **Step 3: Remove Ranking from both tab lists**

In `SupplyUiLabTopBar.tsx`, change `supplyUiLabTabs` to:

```ts
const supplyUiLabTabs = [
  { id: "status", label: "我的状态", icon: "⌂", href: "/ui-lab/supply-dashboard" },
  { id: "team-goal", label: "团队目标", icon: "◎", href: "/ui-lab/supply-dashboard/team-goal" },
  { id: "shop", label: "补给商店", icon: "▤", href: "/ui-lab/supply-dashboard/shop" },
  { id: "task-record", label: "任务记录", icon: "▣", href: "/ui-lab/supply-dashboard/task-record" },
] as const;
```

In `SupplyDashboardTopTabs.tsx`, remove the Ranking entry so legacy tests or imports cannot reintroduce it.

- [ ] **Step 4: Remove Ranking-specific CSS selectors**

In `app/globals.css`, delete rules that only target:

```css
.supply-ui-lab-topbar-tab--ranking
.supply-shop-topbar-hotspot--ranking
.supply-task-record-topbar-hotspot--ranking
```

Keep shared tab styling that applies to the remaining tabs.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx __tests__/supply-shop-scene.test.tsx __tests__/supply-task-record-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx app/globals.css __tests__/supply-dashboard-scene.test.tsx __tests__/supply-shop-scene.test.tsx __tests__/supply-task-record-scene.test.tsx
git commit -m "fix: remove ranking from supply ui lab tabs"
```

---

### Task 2: Add Shared Supply UI Lab Primitives

**Files:**

- Create: `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- Modify: `app/globals.css`
- Create or modify: `__tests__/supply-ui-lab-primitives.test.tsx`

- [ ] **Step 1: Write the failing primitive render test**

Create `__tests__/supply-ui-lab-primitives.test.tsx`:

```ts
import { render } from "@testing-library/react";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";

describe("Supply UI Lab shared primitives", () => {
  it("renders semantic panel, button, badge, progress, and filters", () => {
    const { container } = render(
      <SupplyUiLabPixelPanel title="今日任务" tone="paper" ariaLabel="今日任务面板">
        <SupplyUiLabFilterBar
          ariaLabel="商品筛选"
          filters={[
            { id: "all", label: "全部", active: true },
            { id: "owned", label: "已拥有", active: false },
          ]}
        />
        <SupplyUiLabProgress current={35} label="完成度" max={100} />
        <SupplyUiLabStatusBadge tone="success">已完成</SupplyUiLabStatusBadge>
        <SupplyUiLabActionButton tone="primary">领取</SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>,
    );

    expect(container.querySelector(".supply-ui-lab-panel")).not.toBeNull();
    expect(container.querySelector("[role='tablist']")?.getAttribute("aria-label")).toBe("商品筛选");
    expect(container.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow")).toBe("35");
    expect(container.querySelector("button")?.textContent).toContain("全部");
    expect(container.textContent).toContain("领取");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: FAIL because `SupplyUiLabPrimitives.tsx` does not exist.

- [ ] **Step 3: Implement shared primitives**

Create `SupplyUiLabPrimitives.tsx` with these exports:

```tsx
import type { PropsWithChildren, ReactNode } from "react";

export type SupplyUiLabTone = "paper" | "yellow" | "dark" | "success" | "warning" | "danger" | "muted";

export function SupplyUiLabPixelPanel({
  ariaLabel,
  children,
  className = "",
  title,
  tone = "paper",
}: PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  title?: ReactNode;
  tone?: SupplyUiLabTone;
}>) {
  return (
    <section
      aria-label={ariaLabel}
      className={`supply-ui-lab-panel supply-ui-lab-panel--${tone} ${className}`.trim()}
    >
      {title ? <h2 className="supply-ui-lab-panel-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function SupplyUiLabActionButton({
  children,
  className = "",
  disabled = false,
  tone = "primary",
  type = "button",
}: PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit" | "reset";
}>) {
  return (
    <button className={`supply-ui-lab-action supply-ui-lab-action--${tone} ${className}`.trim()} disabled={disabled} type={type}>
      {children}
    </button>
  );
}

export function SupplyUiLabStatusBadge({
  children,
  tone = "muted",
}: PropsWithChildren<{ tone?: SupplyUiLabTone }>) {
  return <span className={`supply-ui-lab-status supply-ui-lab-status--${tone}`}>{children}</span>;
}

export function SupplyUiLabProgress({
  current,
  label,
  max,
}: {
  current: number;
  label: string;
  max: number;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((current / max) * 100));

  return (
    <div className="supply-ui-lab-progress">
      <div className="supply-ui-lab-progress-label">
        <span>{label}</span>
        <strong>
          {current}/{max}
        </strong>
      </div>
      <div aria-label={label} aria-valuemax={max} aria-valuemin={0} aria-valuenow={current} role="progressbar">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function SupplyUiLabFilterBar({
  ariaLabel,
  filters,
}: {
  ariaLabel: string;
  filters: Array<{ id: string; label: string; active: boolean }>;
}) {
  return (
    <div className="supply-ui-lab-filterbar" role="tablist" aria-label={ariaLabel}>
      {filters.map((filter) => (
        <button aria-selected={filter.active} key={filter.id} role="tab" type="button">
          {filter.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add CSS for primitives**

Append one shared CSS block before page-specific Supply UI Lab rules in `app/globals.css`:

```css
/* Supply UI Lab shared primitives */
.supply-ui-lab-panel {
  position: relative;
  box-sizing: border-box;
  border: 4px solid #111827;
  border-radius: 0.35rem;
  background: #fff8e8;
  box-shadow: 8px 8px 0 rgba(17, 24, 39, 0.92);
  color: #111827;
}

.supply-ui-lab-panel--yellow {
  background: #fde047;
}

.supply-ui-lab-panel--dark {
  background: #1f2937;
  color: #fff8e8;
}

.supply-ui-lab-panel-title {
  margin: 0;
  font-size: clamp(1.05rem, 1.4vw, 1.45rem);
  font-weight: 1000;
  letter-spacing: 0;
  line-height: 1.05;
}

.supply-ui-lab-action {
  min-height: 2.35rem;
  border: 3px solid #111827;
  border-radius: 0.25rem;
  box-shadow: 0 4px 0 #111827;
  cursor: pointer;
  font: inherit;
  font-weight: 1000;
}

.supply-ui-lab-action--primary {
  background: #fde047;
  color: #111827;
}

.supply-ui-lab-action--secondary {
  background: #fff8e8;
  color: #111827;
}

.supply-ui-lab-action--ghost {
  background: transparent;
  box-shadow: none;
}

.supply-ui-lab-action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.supply-ui-lab-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #111827;
  border-radius: 999px;
  padding: 0.16rem 0.5rem;
  font-size: 0.76rem;
  font-weight: 1000;
}

.supply-ui-lab-status--success {
  background: #bbf7d0;
}

.supply-ui-lab-status--warning {
  background: #fde68a;
}

.supply-ui-lab-status--danger {
  background: #fecaca;
}

.supply-ui-lab-status--muted {
  background: #e5e7eb;
}

.supply-ui-lab-progress {
  display: grid;
  gap: 0.35rem;
}

.supply-ui-lab-progress-label {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.82rem;
  font-weight: 900;
}

.supply-ui-lab-progress [role="progressbar"] {
  height: 0.72rem;
  overflow: hidden;
  border: 2px solid #111827;
  background: #f3f4f6;
}

.supply-ui-lab-progress [role="progressbar"] span {
  display: block;
  height: 100%;
  background: #22c55e;
}

.supply-ui-lab-filterbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.supply-ui-lab-filterbar button {
  border: 2px solid #111827;
  border-radius: 999px;
  background: #fffdf4;
  padding: 0.35rem 0.7rem;
  font-weight: 950;
}

.supply-ui-lab-filterbar button[aria-selected="true"] {
  background: #fde047;
  box-shadow: 0 3px 0 #111827;
}
```

- [ ] **Step 5: Run primitive tests**

Run:

```bash
npm test -- __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx app/globals.css __tests__/supply-ui-lab-primitives.test.tsx
git commit -m "feat: add supply ui lab primitives"
```

---

### Task 3: Rebaseline Dashboard as the Componentized Reference Page

**Files:**

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- Modify: `__tests__/supply-dashboard-mock-data.test.ts`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`
- Modify: `__tests__/supply-dashboard-scene-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Tighten tests around atomic media only**

In `__tests__/supply-dashboard-mock-data.test.ts`, keep the assertion that dashboard mock data does not contain:

```ts
expect(serializedAssets).not.toMatch(/dashboard-(status|hero|quests|shortcut|announcement)-panel/);
expect(serializedMock).not.toMatch(/panelImages/);
```

Add an assertion that shortcut links cover the surviving routes:

```ts
expect(supplyDashboardMock.shortcutLinks.map((link) => link.href)).toEqual([
  "/ui-lab/supply-dashboard",
  "/ui-lab/supply-dashboard/backpack",
  "/ui-lab/supply-dashboard/draw-pool",
  "/ui-lab/supply-dashboard/task-record",
]);
```

If `shortcutLinks` does not exist yet, add it in Step 3.

- [ ] **Step 2: Run Dashboard tests and verify the link contract fails if needed**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL only if `shortcutLinks` is not modeled separately yet.

- [ ] **Step 3: Move Dashboard shortcut metadata into mock data**

In `mock-data.ts`, add:

```ts
shortcutLinks: [
  {
    id: "home",
    href: "/ui-lab/supply-dashboard",
    title: "首页",
    subtitle: "查看你的今日状态",
    badge: "",
    image: null,
  },
  {
    id: "backpack",
    href: "/ui-lab/supply-dashboard/backpack",
    title: "背包",
    subtitle: "查看全部道具",
    badge: "16/20",
    image: supplyDashboardAssetPaths.dockBackpack,
  },
  {
    id: "draw-pool",
    href: "/ui-lab/supply-dashboard/draw-pool",
    title: "补给站",
    subtitle: "随机获取道具，效果或补给券！",
    badge: "3/5",
    image: supplyDashboardAssetPaths.dockSupplyMachine,
  },
  {
    id: "task-record",
    href: "/ui-lab/supply-dashboard/task-record",
    title: "任务记录",
    subtitle: "查看历史任务与奖励",
    badge: "",
    image: supplyDashboardAssetPaths.dockTaskRecord,
  },
],
```

Update `types.ts` with a matching `shortcutLinks` property.

- [ ] **Step 4: Use shared primitives in Dashboard panels**

Import:

```tsx
import {
  SupplyUiLabActionButton,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
  SupplyUiLabStatusBadge,
} from "./SupplyUiLabPrimitives";
```

Replace hand-built panel shells for status and quest panels with `SupplyUiLabPixelPanel`, while preserving existing class names for page-specific positioning:

```tsx
<SupplyUiLabPixelPanel ariaLabel="角色状态" className="supply-dashboard-status-panel" title="角色状态">
  ...
</SupplyUiLabPixelPanel>
```

Use `SupplyUiLabProgress` for the hero EXP progress and quest progress where it does not disrupt the prototype layout.

- [ ] **Step 5: Remove unused dashboard panel crop CSS and assets references**

In `app/globals.css`, remove rules for:

```css
.supply-dashboard-panel-image
.supply-dashboard-quest-hotspots
.supply-dashboard-shortcut-hotspot
```

Do not delete physical `dashboard-*-panel.webp` files until the final asset cleanup task.

- [ ] **Step 6: Run Dashboard focused tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-dashboard app/globals.css __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
git commit -m "refactor: rebaseline supply dashboard ui lab"
```

---

### Task 4: Componentize Backpack

**Files:**

- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-backpack/types.ts`
- Modify: `__tests__/supply-backpack-mock-data.test.ts`
- Modify: `__tests__/supply-backpack-scene.test.tsx`
- Modify: `__tests__/supply-backpack-scene-css.test.ts`
- Modify: `__tests__/supply-backpack-assets.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Rewrite tests to reject panel image fields**

In `__tests__/supply-backpack-mock-data.test.ts`, add:

```ts
const serialized = JSON.stringify(supplyBackpackMock);

expect(serialized).not.toContain("panelImages");
expect(serialized).not.toContain("backpack-sidebar-panel");
expect(serialized).not.toContain("backpack-inventory-panel");
expect(serialized).not.toContain("backpack-detail-panel");
```

In `__tests__/supply-backpack-scene.test.tsx`, replace "uses cropped backpack panel assets" with:

```ts
it("renders backpack surfaces as semantic UI instead of panel crops", async () => {
  const { container } = render(<SupplyBackpackScene data={supplyBackpackMock} />);

  expect(container.querySelector(".supply-backpack-panel-image")).toBeNull();
  expect(container.querySelector(".supply-backpack-sidebar .supply-ui-lab-panel-title")?.textContent).toContain("背包");
  expect(container.querySelector("[role='grid'][aria-label='背包库存']")).not.toBeNull();
  expect(container.querySelector(".supply-backpack-detail")).not.toBeNull();
});
```

- [ ] **Step 2: Run Backpack tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-scene.test.tsx
```

Expected: FAIL because `panelImages` and `.supply-backpack-panel-image` still exist.

- [ ] **Step 3: Remove panel image fields from Backpack types and mock data**

Delete `panelImages` from `SupplyBackpackPreview`.

Keep structured fields:

```ts
topBar: ...
sidebar: ...
inventory: ...
selectedSort: ...
sortOptions: ...
selectedItemDetail: ...
hint: ...
```

Ensure every item slot keeps `image`, `rarity`, `quantity`, and `selected`.

- [ ] **Step 4: Rebuild BackpackSidebar with real UI**

Remove the background `<Image>` and use:

```tsx
<SupplyUiLabPixelPanel ariaLabel="背包分类与今日效果" className="supply-backpack-sidebar" title="背包">
  <div className="supply-backpack-capacity">容量 {data.sidebar.capacity}</div>
  <nav aria-label="背包分类" className="supply-backpack-categories">
    {data.sidebar.categories.map((category) => (
      <button aria-current={category.active ? "page" : undefined} key={category.id} type="button">
        <span aria-hidden="true">{category.icon}</span>
        {category.label}
      </button>
    ))}
  </nav>
  <section aria-label="今日效果" className="supply-backpack-effects-list">
    ...
  </section>
</SupplyUiLabPixelPanel>
```

- [ ] **Step 5: Render item images in inventory slots**

Update `InventoryItemCard` to display atomic media:

```tsx
<Image alt="" height={54} src={item.image} unoptimized width={54} />
<span className="supply-backpack-rarity">{item.rarity}</span>
<strong className="supply-backpack-quantity">x{item.quantity}</strong>
```

Keep the `role="gridcell"` and `aria-selected` attributes.

- [ ] **Step 6: Rebuild detail panel with real content**

Use `SupplyUiLabPixelPanel`, `SupplyUiLabStatusBadge`, and `SupplyUiLabActionButton` for the detail panel. Render detail image, rarity, title, description, effect, timing, restrictions, and actions as visible content.

- [ ] **Step 7: Replace Backpack CSS**

In `app/globals.css`, remove `.supply-backpack-panel-image` and hotspot-only rules that are no longer used. Keep:

```css
.supply-backpack-scene
.supply-backpack-content
.supply-backpack-shell
.supply-backpack-sidebar
.supply-backpack-inventory-panel
.supply-backpack-detail
.supply-backpack-grid
.supply-backpack-slot
.supply-backpack-hint
```

Style these selectors as real UI surfaces using the shared primitive visual language.

- [ ] **Step 8: Run Backpack focused tests**

Run:

```bash
npm test -- __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-backpack app/globals.css __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
git commit -m "refactor: componentize supply backpack ui lab"
```

---

### Task 5: Componentize Shop

**Files:**

- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-shop/types.ts`
- Modify: `__tests__/supply-shop-mock-data.test.ts`
- Modify: `__tests__/supply-shop-scene.test.tsx`
- Modify: `__tests__/supply-shop-scene-css.test.ts`
- Modify: `__tests__/supply-shop-assets.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Rewrite tests to reject shop panel crops**

In `__tests__/supply-shop-mock-data.test.ts`, assert:

```ts
const serialized = JSON.stringify(supplyShopMock);

expect(serialized).not.toContain("panelImages");
expect(serialized).not.toContain("shop-sidebar-panel");
expect(serialized).not.toContain("shop-catalog-panel");
expect(serialized).not.toContain("shop-detail-panel");
expect(serialized).not.toContain("shop-topbar-panel");
```

In `__tests__/supply-shop-scene.test.tsx`, add:

```ts
expect(container.querySelector(".supply-shop-panel-image")).toBeNull();
expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(supplyShopMock.products.length);
expect(container.querySelector(".supply-shop-detail")?.textContent).toContain(supplyShopMock.selectedProductDetail.effect);
```

- [ ] **Step 2: Run Shop tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-scene.test.tsx
```

Expected: FAIL because `panelImages` and `.supply-shop-panel-image` still exist.

- [ ] **Step 3: Remove `panelImages` from Shop data contract**

Delete `SupplyShopPanelImages` and `panelImages` from `SupplyShopPreview`.

Keep product-level `image` fields:

```ts
products: Array<{
  id: string;
  name: string;
  subtitle: string;
  image: string;
  selected: boolean;
  price: { icon: string; amount: number; label: string };
  tags: string[];
  ...
}>;
```

- [ ] **Step 4: Rebuild ShopSidebar**

Use `SupplyUiLabPixelPanel` and visible resource rows:

```tsx
<SupplyUiLabPixelPanel ariaLabel="补给商店侧栏" className="supply-shop-sidebar" title="补给商店">
  <nav aria-label="补给商店分类">...</nav>
  <section aria-label="我的资源">...</section>
  <Link className="supply-shop-back-link" href="/ui-lab/supply-dashboard">返回大厅</Link>
</SupplyUiLabPixelPanel>
```

- [ ] **Step 5: Rebuild ShopCatalog**

Use `SupplyUiLabFilterBar`, a real `select`, and visible product cards:

```tsx
<article className="supply-shop-product-card" data-selected={product.selected} data-testid="supply-shop-product-card">
  <Image alt="" height={70} src={product.image} unoptimized width={70} />
  <h3>{product.name}</h3>
  <p>{product.subtitle}</p>
  <strong>{product.price.label}</strong>
  ...
</article>
```

- [ ] **Step 6: Rebuild ShopDetail**

Render selected product image, name, owned quantity, description, effect, timing, purchase limit, cost, and disabled redeem button. Keep disabled state driven by mock data:

```ts
selectedProductDetail: {
  redeemDisabled: true,
  redeemDisabledReason: "今日兑换次数已用完",
  ...
}
```

- [ ] **Step 7: Update Shop CSS**

Remove image-layer/hotspot rules:

```css
.supply-shop-panel-image
.supply-shop-sidebar-hotspot
.supply-shop-product-card--task-reroll
.supply-shop-detail-redeem-hotspot
```

Add real grid/card/detail styling for `.supply-shop-product-card`, `.supply-shop-detail`, and `.supply-shop-sidebar`.

- [ ] **Step 8: Run Shop focused tests**

Run:

```bash
npm test -- __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-shop app/globals.css __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts
git commit -m "refactor: componentize supply shop ui lab"
```

---

### Task 6: Componentize Task Record

**Files:**

- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/types.ts`
- Modify: `__tests__/supply-task-record-mock-data.test.ts`
- Modify: `__tests__/supply-task-record-scene.test.tsx`
- Modify: `__tests__/supply-task-record-scene-css.test.ts`
- Modify: `__tests__/supply-task-record-assets.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Rewrite tests to reject task-record panel crops**

In mock-data tests:

```ts
const serialized = JSON.stringify(supplyTaskRecordMock);

expect(serialized).not.toContain("panelImage");
expect(serialized).not.toContain("task-record-sidebar-panel");
expect(serialized).not.toContain("task-record-timeline-panel");
expect(serialized).not.toContain("task-record-radar-panel");
expect(serialized).not.toContain("task-record-redemptions-panel");
```

In scene tests:

```ts
expect(container.querySelector(".supply-task-record-panel-image")).toBeNull();
expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(
  supplyTaskRecordMock.timelineRecords.length,
);
expect(container.querySelectorAll("[data-testid='task-record-radar-invite']")).toHaveLength(
  supplyTaskRecordMock.radar.invites.length,
);
```

- [ ] **Step 2: Run Task Record tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-scene.test.tsx
```

Expected: FAIL because panel image fields are still used.

- [ ] **Step 3: Remove panel image fields from types and mock data**

Delete:

```ts
topBar.panelImage
sidebar.panelImage
timelinePanelImage
radar.panelImage
redemptions.panelImage
```

Keep structured data for menu items, filters, timeline records, radar tabs, invites, and redemption items.

- [ ] **Step 4: Rebuild TaskRecordSidebar**

Use visible nav buttons:

```tsx
<SupplyUiLabPixelPanel ariaLabel="任务记录分类" className="supply-task-record-sidebar" title="任务记录">
  <nav aria-label="任务记录分类">
    {data.sidebar.menuItems.map((item) => (
      <button aria-pressed={item.active} key={item.id} type="button">
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </button>
    ))}
  </nav>
  <Link href={data.sidebar.backHref}>返回大厅</Link>
</SupplyUiLabPixelPanel>
```

- [ ] **Step 5: Rebuild TimelinePanel**

Use `SupplyUiLabFilterBar` for filters and real timeline articles for records. Keep existing `TimelineItem` shape, but move it out of `sr-only`.

- [ ] **Step 6: Rebuild Radar and Redemption panels**

Use `SupplyUiLabPixelPanel` for each side panel. Render invite avatars, status labels, response/ignore buttons, redemption icons, and status badges visibly.

- [ ] **Step 7: Update CSS**

Remove `.supply-task-record-panel-image` and hotspot-only selectors. Keep layout selectors and style real content with compact cards and a stable right rail.

- [ ] **Step 8: Run Task Record focused tests**

Run:

```bash
npm test -- __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-task-record app/globals.css __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
git commit -m "refactor: componentize supply task record ui lab"
```

---

### Task 7: Componentize Team Goal

**Files:**

- Modify: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
- Modify: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/types.ts`
- Modify: `__tests__/supply-team-goal-mock-data.test.ts`
- Modify: `__tests__/supply-team-goal-scene.test.tsx`
- Modify: `__tests__/supply-team-goal-scene-css.test.ts`
- Modify: `__tests__/supply-team-goal-assets.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Rewrite tests to reject team-goal panel crops**

In mock-data tests:

```ts
const serialized = JSON.stringify(supplyTeamGoalMock);

expect(serialized).not.toContain("panelImages");
expect(serialized).not.toContain("team-goal-raid-panel");
expect(serialized).not.toContain("team-goal-road-panel");
expect(serialized).not.toContain("team-goal-tasks-panel");
expect(serialized).not.toContain("team-goal-rewards-panel");
expect(serialized).not.toContain("team-goal-announcement-panel");
```

In scene tests:

```ts
expect(container.querySelector(".supply-team-goal-panel-image")).toBeNull();
expect(container.querySelectorAll("[data-testid='team-goal-milestone']")).toHaveLength(
  supplyTeamGoalMock.milestones.length,
);
expect(container.querySelectorAll("[data-testid='team-goal-task']")).toHaveLength(supplyTeamGoalMock.tasks.length);
```

- [ ] **Step 2: Run Team Goal tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-scene.test.tsx
```

Expected: FAIL because `panelImages` still exist.

- [ ] **Step 3: Remove panelImages from types and mock data**

Delete `panelImages` from `SupplyTeamGoalPreview`.

Keep atomic media:

```ts
roadBackground: string;
crestImage: string;
vaultChestImage: string;
```

or group them under:

```ts
media: {
  roadBackground: string;
  crest: string;
  vaultChest: string;
}
```

- [ ] **Step 4: Rebuild RaidPanel**

Use a real multi-column TSX structure with `SupplyUiLabPixelPanel`, `SupplyUiLabProgress`, and `SupplyUiLabActionButton`. Render team card, season summary, vault, and season rewards as visible content.

- [ ] **Step 5: Rebuild MilestoneRoad**

Use `roadBackground` as optional decorative background only. Render each milestone as a visible article:

```tsx
<article className={`supply-team-goal-milestone is-${milestone.status}`} data-testid="team-goal-milestone">
  <strong>{milestone.title}</strong>
  <span>{formatNumber(milestone.targetPoints)}</span>
  <em>{milestone.rewardLabel}</em>
</article>
```

- [ ] **Step 6: Rebuild Tasks, Rewards, and Announcement**

Use real cards and buttons. Render rewards with visible icon/title/subtitle and claim button. Render announcement as a real footer with links.

- [ ] **Step 7: Update CSS**

Remove `.supply-team-goal-panel-image` and hotspot-only selectors. Keep the 1536-wide stage proportions and compressed lower grid.

- [ ] **Step 8: Run Team Goal focused tests**

Run:

```bash
npm test -- __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-team-goal app/globals.css __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
git commit -m "refactor: componentize supply team goal ui lab"
```

---

### Task 8: Componentize Draw Pool

**Files:**

- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/types.ts`
- Modify: `__tests__/supply-draw-pool-mock-data.test.ts`
- Modify: `__tests__/supply-draw-pool-scene.test.tsx`
- Modify: `__tests__/supply-draw-pool-scene-css.test.ts`
- Modify: `__tests__/supply-draw-pool-assets.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Rewrite tests to allow only machine/background atomic media**

In mock-data tests:

```ts
const serialized = JSON.stringify(supplyDrawPoolMock);

expect(serialized).not.toContain("topbarPanel");
expect(serialized).not.toContain("walletPanel");
expect(serialized).not.toContain("guidePanel");
expect(serialized).not.toContain("ratesPanel");
expect(serialized).not.toContain("probabilityPanel");
expect(serialized).not.toContain("pityPanel");
expect(serialized).not.toContain("rulesPanel");
expect(serialized).not.toContain("recentPanel");
expect(supplyDrawPoolMock.machine.media.machineImage).toContain("draw-pool-machine");
```

In scene tests:

```ts
expect(container.querySelector(".supply-draw-pool-topbar-image")).toBeNull();
expect(container.querySelector(".supply-draw-pool-wallet-image")).toBeNull();
expect(container.querySelector(".supply-draw-pool-machine-image")).not.toBeNull();
expect(container.querySelector("button[aria-label*='单抽']")).not.toBeNull();
expect(container.querySelector("button[aria-label*='十连']")).not.toBeNull();
```

- [ ] **Step 2: Run Draw Pool tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx
```

Expected: FAIL because panel fields and image-layer topbar/wallet still exist.

- [ ] **Step 3: Restructure Draw Pool media data**

Keep:

```ts
media: {
  background: string;
  machine: string;
  capsuleBed: string;
  guideMascot: string;
  wristband: string;
  runningShoe: string;
}
```

Remove panel fields for topbar, wallet, guide, rates, probability, pity, rules, and recent.

- [ ] **Step 4: Replace DrawPoolTopBar**

Use `SupplyUiLabTopBar` if the visual parity remains acceptable. If the draw-pool needs a close-button variant, implement it as semantic TSX, not a topbar screenshot.

- [ ] **Step 5: Rebuild side panels**

Use `SupplyUiLabPixelPanel` for wallet, guide, rates, probability, pity, rules, and recent drops. Render pool rates and recent drops as visible lists with atomic icons.

- [ ] **Step 6: Keep machine as atomic media with real controls**

In `DrawMachineStage`, keep:

```tsx
<Image alt="补给抽卡机" className="supply-draw-pool-machine-image" ... />
```

Render buttons as visible `SupplyUiLabActionButton` elements, not transparent hotspots:

```tsx
<SupplyUiLabActionButton tone="primary">单抽 x1</SupplyUiLabActionButton>
<SupplyUiLabActionButton tone="primary">十连 x10</SupplyUiLabActionButton>
```

- [ ] **Step 7: Update Draw Pool CSS**

Remove hotspot-only selectors:

```css
.supply-draw-pool-wallet-hotspot
.supply-draw-pool-guide-hotspot
.supply-draw-pool-machine-hotspot
.supply-draw-pool-rules-hotspot
.supply-draw-pool-recent-hotspot
```

Keep the three-column desktop layout and responsive stacking rules.

- [ ] **Step 8: Run Draw Pool focused tests**

Run:

```bash
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-draw-pool app/globals.css __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
git commit -m "refactor: componentize supply draw pool ui lab"
```

---

### Task 9: Final CSS and Asset Cleanup

**Files:**

- Modify: `app/globals.css`
- Modify: all `__tests__/supply-*-scene-css.test.ts`
- Modify: all `__tests__/supply-*-assets.test.ts`
- Delete unused `public/assets/home-scenes/supply/**/**-panel.*` files only after confirming no references remain

- [ ] **Step 1: Search for remaining panel references**

Run:

```bash
rg -n "panelImage|panelImages|topbarPanel|sidebarPanel|catalogPanel|detailPanel|timelinePanel|radarPanel|redemptionsPanel|walletPanel|machinePanel|guidePanel|ratesPanel|probabilityPanel|pityPanel|rulesPanel|recentPanel|panel-image|hotspot--ranking|排行榜" components/gamification/ui-lab __tests__ app/globals.css
```

Expected: No matches except explanatory test names that assert absence. If explanatory test names create noisy matches, rename them to use "image crop" wording without exact deleted field names.

- [ ] **Step 2: Delete unused panel crop assets**

After Step 1 has no runtime references, delete obsolete panel crop files with `git rm`, for example:

```bash
git rm public/assets/home-scenes/supply/shop/shop-sidebar-panel.png public/assets/home-scenes/supply/shop/shop-catalog-panel.png public/assets/home-scenes/supply/shop/shop-detail-panel.png public/assets/home-scenes/supply/shop/shop-topbar-panel.png
```

Repeat for obsolete backpack, task-record, team-goal, draw-pool, and dashboard panel crops only when no references remain.

- [ ] **Step 3: Update asset tests to check atomic media**

Asset tests should assert kept images exist and stay within budgets, for example:

```ts
const atomicAssets = [
  "/assets/home-scenes/supply/backpack/backpack-sports-drink.webp",
  "/assets/home-scenes/supply/backpack/backpack-rice-ball.webp",
  "/assets/home-scenes/supply/shop/shop-energy-bottle.webp",
  "/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp",
];

for (const asset of atomicAssets) {
  expect(existsSync(projectPath(asset)), asset).toBe(true);
}
```

- [ ] **Step 4: Verify CSS has one active Supply UI Lab block per page**

Run:

```bash
rg -n "/\\* Supply .* UI Lab|\\.supply-(dashboard|team-goal|shop|task-record|draw-pool|backpack)-scene" app/globals.css
```

Expected: One clear shared block and one clear page block for each page family.

- [ ] **Step 5: Run all Supply UI Lab focused tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add app/globals.css __tests__ public/assets/home-scenes/supply
git commit -m "chore: clean supply ui lab panel assets"
```

---

### Task 10: Browser Visual QA and Build Verification

**Files:**

- No source changes unless QA finds a concrete layout bug.
- Possible generated screenshots under `tmp/visual-qa/` should remain untracked unless the project already tracks them intentionally.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts at `http://localhost:3000`.

- [ ] **Step 2: Check 6 routes in browser**

Open:

```text
http://localhost:3000/ui-lab/supply-dashboard
http://localhost:3000/ui-lab/supply-dashboard/team-goal
http://localhost:3000/ui-lab/supply-dashboard/shop
http://localhost:3000/ui-lab/supply-dashboard/task-record
http://localhost:3000/ui-lab/supply-dashboard/draw-pool
http://localhost:3000/ui-lab/supply-dashboard/backpack
```

Expected:

- No blank page.
- No console runtime error.
- No visible Ranking tab.
- Dashboard links navigate to child routes.
- Child routes can return to Dashboard.
- Text does not overlap at desktop width.
- Mobile width still allows reading and interaction through scrolling or stacking.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS, including `tsc --noEmit` if lint script runs it.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Check git status**

Run:

```bash
git status --short --branch
```

Expected: Only intentional changes remain. If `tmp/visual-qa/` or `.superpowers/` appears untracked, leave it uncommitted unless the user explicitly wants those artifacts.

- [ ] **Step 6: Final commit if QA fixes were needed**

If Steps 2-5 required source fixes, commit them:

```bash
git add app/globals.css components/gamification/ui-lab __tests__
git commit -m "fix: polish supply ui lab componentized pages"
```

If no source fixes were needed, do not create an empty commit.

---

## Plan Self-Review

- Spec coverage: The plan covers Ranking removal, 6-page scope, shared primitives, removal of panel image data, atomic media strategy, page interactions, CSS cleanup, focused tests, lint, build, and browser QA.
- Placeholder scan: The plan contains no unresolved placeholder markers or open-ended implementation placeholders.
- Type consistency: Shared primitive names and page component names are consistent across tasks. The plan uses `panelImage` and related names only as things to remove or search for during cleanup.

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-05-17-supply-ui-lab-componentized-static-pages.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
