# Main Tab Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve main tab switching smoothness by adding immediate navigation feedback, removing redundant route-change state writes, dynamically splitting heavy tab content, preloading likely destinations, and replacing the heaviest draw-pool image with an optimized asset.

**Architecture:** Keep the existing App Router routes and shared `BoardApp` shell. `Navbar` owns perceived-navigation feedback and preloading intent; `BoardApp` owns content selection. Heavy tab components move behind a small dynamic-tab module so default routes stop importing every large tab synchronously.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict mode, Vitest/jsdom, existing CSS in `app/globals.css`, `cwebp` for local WebP generation.

---

## Spec

Use the approved design spec:

- `docs/superpowers/specs/2026-05-28-main-tab-performance-optimization-design.md`

## File Structure

- Create: `scripts/measure-main-tab-performance.mjs`
  - Prints repeatable build/chunk/resource measurements after `npm run build`.
- Create: `docs/performance/main-tab-performance-before.txt`
  - Captures the pre-optimization measurement.
- Create: `docs/performance/main-tab-performance-after.txt`
  - Captures the post-optimization measurement.
- Create: `components/board/BoardTabLoadingShell.tsx`
  - Stable brutalist loading shell for dynamically loaded tab content.
- Create: `components/board/tab-component-loaders.ts`
  - Defines reusable dynamic import loader functions and preload helpers without JSX.
- Create: `components/board/dynamic-tabs.tsx`
  - Wraps heavy tab loader functions with `next/dynamic` and stable loading shells.
- Modify: `components/board/BoardApp.tsx`
  - Remove the redundant `SET_TAB` effect after moving `SharedBoard` to an explicit `isActive` prop.
  - Render dynamic tab components for non-default heavy tabs.
- Modify: `components/shared-board/SharedBoard.tsx`
  - Accept explicit `isActive?: boolean` instead of reading `state.activeTab`.
- Modify: `components/navbar/Navbar.tsx`
  - Add pending visual state and route/component preload on hover/focus.
- Modify: `components/ui/TabBtn.tsx`
  - Support a `pending` state class and `aria-busy`.
- Modify: `app/globals.css`
  - Style pending tabs and dynamic loading shells.
- Modify: `components/gamification/ui-lab/supply-draw-pool/assets.ts`
  - Point draw-pool machine art at the optimized WebP asset.
- Modify: `app/ui-prototypes/supply-nav/page.tsx`
  - Keep prototype references aligned with the optimized draw-pool machine asset.
- Create: `public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp`
  - Optimized draw-pool machine image generated from the existing PNG.
- Modify: `__tests__/navbar-supply-chrome.test.tsx`
  - Cover pending state and preload behavior.
- Modify: `__tests__/home-supply-navigation.test.tsx`
  - Cover removal of redundant `SET_TAB` route-change dispatch and dynamic tab module wiring.
- Create: `__tests__/board-app-dynamic-tabs.test.ts`
  - Static contract that `BoardApp` no longer statically imports heavy tab components.
- Modify: `__tests__/supply-draw-pool-assets.test.ts`
  - Cover optimized draw-pool machine asset path and size budget.

---

## Task 1: Add Repeatable Performance Baseline

**Files:**

- Create: `scripts/measure-main-tab-performance.mjs`
- Create: `docs/performance/main-tab-performance-before.txt`

- [ ] **Step 1: Create the measurement script**

Create `scripts/measure-main-tab-performance.mjs`:

```js
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const appBuildManifestPath = ".next/app-build-manifest.json";
const mainTabPages = [
  "/(board)/page",
  "/(board)/board/page",
  "/(board)/drink/page",
  "/(board)/calendar/page",
  "/(board)/report/page",
  "/(board)/dashboard/status/page",
  "/(board)/dashboard/store/page",
  "/(board)/dashboard/quest/page",
  "/(board)/dashboard/backpack/page",
  "/(board)/dashboard/cards/page",
];

const watchedAssets = [
  "public/assets/home-scenes/supply/draw-pool/draw-pool-machine.png",
  "public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp",
  "public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
];

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function fileSize(filePath) {
  return existsSync(filePath) ? statSync(filePath).size : 0;
}

function walkFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

if (!existsSync(appBuildManifestPath)) {
  console.error("Missing .next/app-build-manifest.json. Run npm run build first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(appBuildManifestPath, "utf8"));

console.log("# Main Tab Performance Measurement");
console.log("");
console.log(`Generated at: ${new Date().toISOString()}`);
console.log("");
console.log("## Main Tab App Chunks");

for (const page of mainTabPages) {
  const chunks = manifest.pages?.[page] ?? [];
  const totalBytes = chunks.reduce((total, chunk) => total + fileSize(path.join(".next", chunk)), 0);
  console.log(`- ${page}: ${formatBytes(totalBytes)}`);
  for (const chunk of chunks) {
    console.log(`  - ${chunk}: ${formatBytes(fileSize(path.join(".next", chunk)))}`);
  }
}

console.log("");
console.log("## Watched Assets");

for (const asset of watchedAssets) {
  const size = fileSize(asset);
  console.log(`- ${asset}: ${size > 0 ? formatBytes(size) : "missing"}`);
}

const supplyAssetBytes = walkFiles("public/assets/home-scenes/supply").reduce(
  (total, filePath) => total + fileSize(filePath),
  0,
);

console.log("");
console.log(`Supply home-scene asset total: ${formatBytes(supplyAssetBytes)}`);
```

- [ ] **Step 2: Run the baseline build**

Run:

```bash
npm run build
```

Expected: PASS. The output should include all formal routes and no TypeScript errors.

- [ ] **Step 3: Capture the baseline measurement**

Run:

```bash
mkdir -p docs/performance
node scripts/measure-main-tab-performance.mjs > docs/performance/main-tab-performance-before.txt
sed -n '1,120p' docs/performance/main-tab-performance-before.txt
```

Expected: output lists the main tab page chunks and shows `draw-pool-machine.webp` as `missing` before the image optimization task.

- [ ] **Step 4: Commit the baseline tooling**

Run:

```bash
git add scripts/measure-main-tab-performance.mjs docs/performance/main-tab-performance-before.txt
git commit -m "chore: add main tab performance baseline"
```

---

## Task 2: Add Navbar Pending State And Route Prefetch Tests

**Files:**

- Modify: `__tests__/navbar-supply-chrome.test.tsx`
- Modify: `components/ui/TabBtn.tsx`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write failing tests for pending state and route prefetch**

Add these tests near the end of `__tests__/navbar-supply-chrome.test.tsx`:

```tsx
  it("marks a primary tab as pending immediately after click and clears when it becomes active", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const boardTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("共享看板"),
    );

    await act(async () => {
      boardTab?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/board");
    expect(boardTab?.classList.contains("pending")).toBe(true);
    expect(boardTab?.getAttribute("aria-busy")).toBe("true");

    activeTab = "board";

    await act(async () => {
      root.render(<Navbar activeTabOverride="board" supplyNavContext={supplyNavContext} />);
    });

    const activeBoardTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("共享看板"),
    );

    expect(activeBoardTab?.classList.contains("pending")).toBe(false);
    expect(activeBoardTab?.getAttribute("aria-busy")).toBeNull();
  });

  it("does not mark the current primary tab as pending", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const punchTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("健身打卡"),
    );

    await act(async () => {
      punchTab?.click();
    });

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(punchTab?.classList.contains("pending")).toBe(false);
  });

  it("prefetches primary and supply secondary routes on hover or focus", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    routerPrefetchMock.mockClear();

    const calendarTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("牛马日历"),
    );
    const drawPoolTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".app-supply-secondary-tab")).find(
      (button) => button.textContent?.includes("抽奖池"),
    );

    await act(async () => {
      calendarTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      drawPoolTab?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    });

    expect(routerPrefetchMock).toHaveBeenCalledWith("/calendar");
    expect(routerPrefetchMock).toHaveBeenCalledWith("/dashboard/cards");
  });
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because `.pending` is not rendered and secondary tabs do not prefetch on focus.

- [ ] **Step 3: Add `pending` support to `TabBtn`**

Replace `components/ui/TabBtn.tsx` with:

```tsx
"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface TabBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  pending?: boolean;
}

export function TabBtn({ children, active, pending = false, className = "", ...props }: TabBtnProps) {
  return (
    <button
      aria-busy={pending || undefined}
      className={`tab-btn ${active ? "active" : "inactive"}${pending ? " pending" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Add pending and route prefetch logic to `Navbar`**

In `components/navbar/Navbar.tsx`, add state below `supplyMenuOpen`:

```tsx
  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);
  const [pendingSupplyPanel, setPendingSupplyPanel] = useState<SupplyPanelKey | null>(null);
```

Add effects after `const showSupplyChrome = activeTab === "supply";`:

```tsx
  useEffect(() => {
    if (pendingTab === activeTab) {
      setPendingTab(null);
    }
  }, [activeTab, pendingTab]);

  useEffect(() => {
    if (pendingSupplyPanel && pendingSupplyPanel === activeSupplyPanel) {
      setPendingSupplyPanel(null);
    }
  }, [activeSupplyPanel, pendingSupplyPanel]);
```

Add helpers before `handleTabChange`:

```tsx
  const prefetchAppTab = useCallback(
    (tab: AppTab) => {
      router.prefetch?.(appTabRoutes[tab]);
    },
    [router],
  );

  const prefetchSupplyPanel = useCallback(
    (panel: SupplyPanelKey) => {
      const item = supplyNavItems.find((candidate) => candidate.id === panel);
      if (item) {
        router.prefetch?.(item.route);
      }
    },
    [router],
  );
```

Update `handleTabChange`:

```tsx
  function handleTabChange(tab: AppTab) {
    setMobileTabsOpen(false);
    setSupplyMenuOpen(false);
    setPendingSupplyPanel(null);

    if (tab === activeTab) {
      return;
    }

    setPendingTab(tab);
    startTransition(() => {
      router.push(appTabRoutes[tab]);
    });
  }
```

Update `handleSupplyPanelChange`:

```tsx
  function handleSupplyPanelChange(panel: SupplyPanelKey) {
    const item = supplyNavItems.find((candidate) => candidate.id === panel);
    if (!item) {
      return;
    }

    setSupplyMenuOpen(false);

    if (panel === activeSupplyPanel) {
      return;
    }

    setPendingTab("supply");
    setPendingSupplyPanel(panel);
    startTransition(() => {
      router.push(item.route);
    });
  }
```

For each desktop and mobile `TabBtn`, pass `pending={pendingTab === "<tab>"}` and add `onMouseEnter={() => prefetchAppTab("<tab>")}` plus `onFocus={() => prefetchAppTab("<tab>")}`. For the supply desktop tab, keep the existing menu handlers and combine them:

```tsx
                pending={pendingTab === "supply"}
                onBlur={scheduleSupplyMenuClose}
                onFocus={() => {
                  openSupplyMenu();
                  prefetchAppTab("supply");
                }}
                onMouseEnter={() => {
                  openSupplyMenu();
                  prefetchAppTab("supply");
                }}
```

For each `.app-supply-secondary-tab`, add:

```tsx
                  className={`app-supply-secondary-tab${pendingSupplyPanel === item.id ? " pending" : ""}`}
                  onFocus={() => prefetchSupplyPanel(item.id)}
                  onMouseEnter={() => prefetchSupplyPanel(item.id)}
```

- [ ] **Step 5: Style pending state**

Add to `app/globals.css` near the existing `.tab-btn` rules:

```css
.tab-btn.pending,
.app-supply-secondary-tab.pending {
  transform: translateY(2px);
  box-shadow: 0 1px 0 0 #111827;
  filter: saturate(0.92);
}

.tab-btn.pending::after,
.app-supply-secondary-tab.pending::after {
  content: "";
  width: 0.45rem;
  height: 0.45rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: tab-pending-spin 700ms linear infinite;
}

@keyframes tab-pending-spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 6: Verify focused tests pass**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add components/ui/TabBtn.tsx components/navbar/Navbar.tsx app/globals.css __tests__/navbar-supply-chrome.test.tsx
git commit -m "feat: add pending feedback for tab navigation"
```

---

## Task 3: Remove Redundant Route-Change `SET_TAB`

**Files:**

- Modify: `__tests__/home-supply-navigation.test.tsx`
- Modify: `components/shared-board/SharedBoard.tsx`
- Modify: `components/board/BoardApp.tsx`

- [ ] **Step 1: Write failing route-dispatch regression test**

Add this test to `__tests__/home-supply-navigation.test.tsx` before the coffee provider tests:

```tsx
  it("does not dispatch SET_TAB after rendering a route-selected tab", async () => {
    activeTab = "punch";
    const { default: SharedBoardRoutePage } = await import("@/app/(board)/board/page");

    await act(async () => {
      root.render(<SharedBoardRoutePage />);
    });

    expect(container.querySelector("[data-testid='shared-board']")).not.toBeNull();
    expect(dispatchMock).not.toHaveBeenCalledWith({ type: "SET_TAB", tab: "board" });
  });
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx
```

Expected: FAIL because `BoardApp` still dispatches `{ type: "SET_TAB", tab: "board" }`.

- [ ] **Step 3: Make `SharedBoard` use explicit active state**

In `components/shared-board/SharedBoard.tsx`, change the component signature and remove the derived `isActive` line:

```tsx
export function SharedBoard({ isActive = true }: { isActive?: boolean }) {
  const { state } = useBoard();
  const [notes, setNotes] = useState<BoardNoteDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<BoardMessage | null>(null);
```

- [ ] **Step 4: Stop route render from dispatching `SET_TAB`**

In `components/board/BoardApp.tsx`, remove this effect:

```tsx
  useEffect(() => {
    if (state.activeTab !== activeTab) {
      dispatch({ type: "SET_TAB", tab: activeTab });
    }
  }, [activeTab, dispatch, state.activeTab]);
```

Update the board branch:

```tsx
      case "board":
        return <SharedBoard isActive={activeTab === "board"} />;
```

Remove `dispatch` from:

```tsx
  const { state, dispatch } = useBoard();
```

so it becomes:

```tsx
  const { state } = useBoard();
```

- [ ] **Step 5: Verify focused tests pass**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Verify board provider tests still pass**

Run:

```bash
npm test -- __tests__/board-provider-sync.test.tsx
```

Expected: PASS. The reducer can keep the `SET_TAB` action for compatibility; it is no longer used by route rendering.

- [ ] **Step 7: Commit**

Run:

```bash
git add components/shared-board/SharedBoard.tsx components/board/BoardApp.tsx __tests__/home-supply-navigation.test.tsx
git commit -m "perf: avoid route tab context dispatch"
```

---

## Task 4: Dynamically Split Heavy Main Tab Components

**Files:**

- Create: `components/board/BoardTabLoadingShell.tsx`
- Create: `components/board/tab-component-loaders.ts`
- Create: `components/board/dynamic-tabs.tsx`
- Create: `__tests__/board-app-dynamic-tabs.test.ts`
- Modify: `components/board/BoardApp.tsx`
- Modify: `__tests__/home-supply-navigation.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write static contract test for dynamic tab imports**

Create `__tests__/board-app-dynamic-tabs.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("BoardApp dynamic tab boundaries", () => {
  const boardAppSource = readFileSync("components/board/BoardApp.tsx", "utf8");
  const loaderSource = readFileSync("components/board/tab-component-loaders.ts", "utf8");
  const dynamicTabsSource = readFileSync("components/board/dynamic-tabs.tsx", "utf8");

  it("keeps the default punch tab static and moves heavy tabs behind dynamic imports", () => {
    expect(boardAppSource).toContain('from "@/components/punch-board/PunchBoard"');
    expect(boardAppSource).not.toContain('from "@/components/shared-board/SharedBoard"');
    expect(boardAppSource).not.toContain('from "@/components/coffee-checkin/CoffeeCheckin"');
    expect(boardAppSource).not.toContain('from "@/components/calendar/CalendarBoard"');
    expect(boardAppSource).not.toContain('from "@/components/report-center/ReportCenter"');
    expect(boardAppSource).not.toContain('from "@/components/gamification/SupplyStation"');
  });

  it("defines reusable dynamic tab components and preload helpers", () => {
    expect(dynamicTabsSource).toContain('from "next/dynamic"');
    expect(dynamicTabsSource).toContain("DynamicSharedBoard");
    expect(dynamicTabsSource).toContain("DynamicCoffeeCheckin");
    expect(dynamicTabsSource).toContain("DynamicCalendarBoard");
    expect(dynamicTabsSource).toContain("DynamicReportCenter");
    expect(dynamicTabsSource).toContain("DynamicSupplyStation");
    expect(loaderSource).toContain("loadSharedBoard");
    expect(loaderSource).toContain("loadSupplyStation");
    expect(loaderSource).toContain("preloadBoardTabComponent");
    expect(loaderSource).toContain("preloadSupplyPanelComponent");
  });
});
```

- [ ] **Step 2: Run the static contract test and verify it fails**

Run:

```bash
npm test -- __tests__/board-app-dynamic-tabs.test.ts
```

Expected: FAIL because `components/board/dynamic-tabs.tsx` does not exist and `BoardApp` still statically imports heavy tab components.

- [ ] **Step 3: Add stable loading shell**

Create `components/board/BoardTabLoadingShell.tsx`:

```tsx
export function BoardTabLoadingShell({ label }: { label: string }) {
  return (
    <section className="board-tab-loading-shell" aria-label={label} aria-busy="true">
      <div className="board-tab-loading-card">
        <span className="board-tab-loading-dot" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
    </section>
  );
}
```

Add to `app/globals.css` near `.board-tab-stage`:

```css
.board-tab-loading-shell {
  display: grid;
  min-height: 100%;
  place-items: center;
  padding: 1rem;
}

.board-tab-loading-card {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  border: 3px solid #111827;
  border-radius: 1rem;
  background: #fff8e8;
  box-shadow: 5px 5px 0 rgba(17, 24, 39, 0.45);
  color: #111827;
  font-weight: 1000;
  padding: 0.9rem 1rem;
}

.board-tab-loading-dot {
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid #111827;
  border-radius: 999px;
  background: #fde047;
  animation: board-tab-loading-pulse 700ms ease-in-out infinite alternate;
}

@keyframes board-tab-loading-pulse {
  to {
    transform: scale(1.25);
  }
}
```

- [ ] **Step 4: Add tab loader and dynamic tab modules**

Create `components/board/tab-component-loaders.ts`:

```ts
import type { AppTab } from "@/lib/types";
import type { SupplyPanelKey } from "@/lib/navigation-routes";

export const loadSharedBoard = () => import("@/components/shared-board/SharedBoard").then((mod) => mod.SharedBoard);
export const loadCoffeeCheckin = () => import("@/components/coffee-checkin/CoffeeCheckin").then((mod) => mod.CoffeeCheckin);
export const loadCalendarBoard = () => import("@/components/calendar/CalendarBoard").then((mod) => mod.CalendarBoard);
export const loadReportCenter = () => import("@/components/report-center/ReportCenter").then((mod) => mod.ReportCenter);
export const loadSupplyStation = () => import("@/components/gamification/SupplyStation").then((mod) => mod.SupplyStation);

export function preloadBoardTabComponent(tab: AppTab) {
  switch (tab) {
    case "board":
      void loadSharedBoard();
      break;
    case "coffee":
      void loadCoffeeCheckin();
      break;
    case "calendar":
      void loadCalendarBoard();
      break;
    case "dash":
      void loadReportCenter();
      break;
    case "supply":
      void loadSupplyStation();
      break;
    case "punch":
      break;
  }
}

export function preloadSupplyPanelComponent(_panel: SupplyPanelKey) {
  void loadSupplyStation();
}
```

Create `components/board/dynamic-tabs.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { BoardTabLoadingShell } from "./BoardTabLoadingShell";
import {
  loadCalendarBoard,
  loadCoffeeCheckin,
  loadReportCenter,
  loadSharedBoard,
  loadSupplyStation,
} from "./tab-component-loaders";

export const DynamicSharedBoard = dynamic(loadSharedBoard, {
  loading: () => <BoardTabLoadingShell label="共享看板加载中" />,
});

export const DynamicCoffeeCheckin = dynamic(loadCoffeeCheckin, {
  loading: () => <BoardTabLoadingShell label="续命咖啡加载中" />,
});

export const DynamicCalendarBoard = dynamic(loadCalendarBoard, {
  loading: () => <BoardTabLoadingShell label="牛马日历加载中" />,
});

export const DynamicReportCenter = dynamic(loadReportCenter, {
  loading: () => <BoardTabLoadingShell label="战报中心加载中" />,
});

export const DynamicSupplyStation = dynamic(loadSupplyStation, {
  loading: () => <BoardTabLoadingShell label="牛马补给站加载中" />,
});
```

- [ ] **Step 5: Update `BoardApp` to use dynamic tabs**

In `components/board/BoardApp.tsx`, remove imports for `CalendarBoard`, `CoffeeCheckin`, `SupplyStation`, `ReportCenter`, and `SharedBoard`.

Add:

```tsx
import {
  DynamicCalendarBoard,
  DynamicCoffeeCheckin,
  DynamicReportCenter,
  DynamicSharedBoard,
  DynamicSupplyStation,
} from "@/components/board/dynamic-tabs";
```

Update switch branches:

```tsx
      case "board":
        return <DynamicSharedBoard isActive={activeTab === "board"} />;
      case "coffee":
        return <DynamicCoffeeCheckin />;
      case "supply":
        return (
          <DynamicSupplyStation
            initialPanel={supplyPanel}
            onBackToPunch={handleBackToPunch}
            onNavContextChange={handleSupplyNavContextChange}
            onPanelChange={handleSupplyPanelChange}
          />
        );
      case "calendar":
        return <DynamicCalendarBoard />;
      case "dash":
        return <DynamicReportCenter />;
```

- [ ] **Step 6: Update `home-supply-navigation` test mocks**

In `__tests__/home-supply-navigation.test.tsx`, replace the individual component mocks for shared board, coffee, report, calendar, and supply station with a single mock for the dynamic module.

Replace the five component mocks with:

```tsx
vi.mock("@/components/board/dynamic-tabs", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  function createSupplyNavContext() {
    return {
      resources: [
        { id: "coins", label: "银子", value: 440, iconImage: "/assets/home-scenes/supply/shared/supply-resource-coins.png" },
        { id: "ticket", label: "抽奖券", value: 7, iconImage: "/assets/home-scenes/supply/shared/supply-resource-ticket.png" },
        {
          id: "backpack",
          label: "背包",
          value: 12,
          maxValue: 60,
          iconImage: "/assets/home-scenes/supply/shared/supply-resource-backpack.png",
        },
      ],
      profile: { username: "li", avatarKey: "male1" },
    };
  }

  return {
    DynamicSharedBoard: ({ isActive }: { isActive?: boolean }) => (
      <section data-active={String(isActive)} data-testid="shared-board">
        共享看板
      </section>
    ),
    DynamicCoffeeCheckin: () => <section data-testid="coffee-checkin">续命咖啡</section>,
    DynamicReportCenter: () => <section data-testid="report-center">战报中心</section>,
    DynamicCalendarBoard: () => <section data-testid="calendar-board">牛马日历</section>,
    DynamicSupplyStation: ({
      initialPanel,
      onBackToPunch,
      onNavContextChange,
      onPanelChange,
    }: {
      initialPanel?: string;
      onBackToPunch?: () => void;
      onNavContextChange?: (context: unknown) => void;
      onPanelChange?: (panel: "shop" | "taskRecord") => void;
    }) => {
      React.useEffect(() => {
        supplyContextReports.current += 1;
        if (supplyContextReports.current > 5) {
          throw new Error("supply nav context callback is unstable");
        }

        onNavContextChange?.(createSupplyNavContext());
      }, [onNavContextChange]);

      return (
        <section data-testid="supply-station">
          牛马补给站
          <span data-testid="supply-panel">{initialPanel}</span>
          <button onClick={onBackToPunch} type="button">
            回到打卡
          </button>
          <button onClick={() => onPanelChange?.("shop")} type="button">
            去商店
          </button>
          <button onClick={() => onPanelChange?.("taskRecord")} type="button">
            去任务记录
          </button>
        </section>
      );
    },
  };
});
```

Remove the old mocks for:

- `@/components/shared-board/SharedBoard`
- `@/components/coffee-checkin/CoffeeCheckin`
- `@/components/report-center/ReportCenter`
- `@/components/calendar/CalendarBoard`
- `@/components/gamification/SupplyStation`

- [ ] **Step 7: Verify focused tests pass**

Run:

```bash
npm test -- __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Run a build to check split chunks**

Run:

```bash
npm run build
node scripts/measure-main-tab-performance.mjs | sed -n '1,140p'
```

Expected: PASS. Main tab chunk lists should change from the baseline because heavy tab code is now behind dynamic imports.

- [ ] **Step 9: Commit**

Run:

```bash
git add components/board/BoardTabLoadingShell.tsx components/board/tab-component-loaders.ts components/board/dynamic-tabs.tsx components/board/BoardApp.tsx app/globals.css __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx
git commit -m "perf: dynamically split heavy board tabs"
```

---

## Task 5: Preload Dynamic Tab Components From Navbar Intent

**Files:**

- Modify: `__tests__/navbar-supply-chrome.test.tsx`
- Modify: `components/navbar/Navbar.tsx`

- [ ] **Step 1: Mock dynamic preload helpers in Navbar tests**

In `__tests__/navbar-supply-chrome.test.tsx`, add hoisted mocks:

```tsx
const { preloadBoardTabComponentMock, preloadSupplyPanelComponentMock } = vi.hoisted(() => ({
  preloadBoardTabComponentMock: vi.fn(),
  preloadSupplyPanelComponentMock: vi.fn(),
}));
```

Add:

```tsx
vi.mock("@/components/board/tab-component-loaders", () => ({
  preloadBoardTabComponent: preloadBoardTabComponentMock,
  preloadSupplyPanelComponent: preloadSupplyPanelComponentMock,
}));
```

In `afterEach`, clear both mocks:

```tsx
    preloadBoardTabComponentMock.mockClear();
    preloadSupplyPanelComponentMock.mockClear();
```

- [ ] **Step 2: Extend preload test to require component preloading**

In the test named `"prefetches primary and supply secondary routes on hover or focus"`, after the route prefetch expectations, add:

```tsx
    expect(preloadBoardTabComponentMock).toHaveBeenCalledWith("calendar");
    expect(preloadSupplyPanelComponentMock).toHaveBeenCalledWith("drawPool");
```

- [ ] **Step 3: Run focused test and verify it fails**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because `Navbar` does not call the component preload helpers yet.

- [ ] **Step 4: Wire component preload helpers into `Navbar`**

In `components/navbar/Navbar.tsx`, add:

```tsx
import { preloadBoardTabComponent, preloadSupplyPanelComponent } from "@/components/board/tab-component-loaders";
```

Update `prefetchAppTab`:

```tsx
  const prefetchAppTab = useCallback(
    (tab: AppTab) => {
      router.prefetch?.(appTabRoutes[tab]);
      preloadBoardTabComponent(tab);
    },
    [router],
  );
```

Update `prefetchSupplyPanel`:

```tsx
  const prefetchSupplyPanel = useCallback(
    (panel: SupplyPanelKey) => {
      const item = supplyNavItems.find((candidate) => candidate.id === panel);
      if (item) {
        router.prefetch?.(item.route);
        preloadSupplyPanelComponent(panel);
      }
    },
    [router],
  );
```

- [ ] **Step 5: Verify focused tests pass**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add components/navbar/Navbar.tsx __tests__/navbar-supply-chrome.test.tsx
git commit -m "perf: preload tab chunks from navigation intent"
```

---

## Task 6: Optimize Draw-Pool Machine Asset

**Files:**

- Modify: `__tests__/supply-draw-pool-assets.test.ts`
- Modify: `components/gamification/ui-lab/supply-draw-pool/assets.ts`
- Modify: `app/ui-prototypes/supply-nav/page.tsx`
- Create: `public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp`

- [ ] **Step 1: Write failing optimized asset test**

In `__tests__/supply-draw-pool-assets.test.ts`, update `requiredDrawPoolAssets`:

```ts
const requiredDrawPoolAssets = [
  ["draw-pool-machine.png", 1600 * 1024],
  ["draw-pool-machine.webp", 520 * 1024],
  ["draw-pool-capsule-bed.webp", 280 * 1024],
  ["draw-pool-guide-mascot.webp", 160 * 1024],
  ["draw-pool-wristband.webp", 90 * 1024],
  ["draw-pool-running-shoe.webp", 90 * 1024],
] as const;
```

Add this test after `"references existing reusable dashboard and reward assets"`:

```ts
  it("uses the optimized WebP machine art in draw-pool view models", () => {
    expect(supplyDrawPoolAssetPaths.drawPool.machine).toBe(
      "/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp",
    );
    expect(existsSync(publicPath(supplyDrawPoolAssetPaths.drawPool.machine))).toBe(true);
  });
```

- [ ] **Step 2: Run asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-draw-pool-assets.test.ts
```

Expected: FAIL because `draw-pool-machine.webp` does not exist and the asset path still points to PNG.

- [ ] **Step 3: Generate WebP asset**

Run:

```bash
cwebp -q 82 public/assets/home-scenes/supply/draw-pool/draw-pool-machine.png -o public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp
ls -lh public/assets/home-scenes/supply/draw-pool/draw-pool-machine.png public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp
```

Expected: WebP file exists and is no larger than `520K`. If it exceeds `520K`, run:

```bash
cwebp -q 76 public/assets/home-scenes/supply/draw-pool/draw-pool-machine.png -o public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp
```

- [ ] **Step 4: Point production asset path to WebP**

In `components/gamification/ui-lab/supply-draw-pool/assets.ts`, change:

```ts
    machine: "/assets/home-scenes/supply/draw-pool/draw-pool-machine.png",
```

to:

```ts
    machine: "/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp",
```

In `app/ui-prototypes/supply-nav/page.tsx`, change the draw-pool image:

```tsx
    image: "/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp",
```

- [ ] **Step 5: Verify asset tests pass**

Run:

```bash
npm test -- __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add __tests__/supply-draw-pool-assets.test.ts components/gamification/ui-lab/supply-draw-pool/assets.ts app/ui-prototypes/supply-nav/page.tsx public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp
git commit -m "perf: optimize draw pool machine asset"
```

---

## Task 7: Capture Post-Optimization Measurement And Verify

**Files:**

- Create: `docs/performance/main-tab-performance-after.txt`

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run type check**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Capture after measurement**

Run:

```bash
node scripts/measure-main-tab-performance.mjs > docs/performance/main-tab-performance-after.txt
sed -n '1,160p' docs/performance/main-tab-performance-after.txt
```

Expected:

- `draw-pool-machine.webp` is present.
- Heavy tab chunk lists differ from `docs/performance/main-tab-performance-before.txt`.
- At least one main tab initial chunk total is lower or heavy tab code appears in async chunks outside the initial app page list.

- [ ] **Step 5: Check whitespace and git status**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: `git diff --check` has no output. `git status` only lists files changed by this plan.

- [ ] **Step 6: Commit final measurement**

Run:

```bash
git add docs/performance/main-tab-performance-after.txt
git commit -m "chore: record main tab performance results"
```

---

## Manual QA

After Task 7, run the app locally:

```bash
npm run dev
```

Open the local URL printed by Next.js and check:

- `/` -> `/board`
- `/` -> `/dashboard/status`
- `/dashboard/status` -> `/dashboard/store`
- `/dashboard/status` -> `/dashboard/cards`
- `/calendar` -> `/report`

For each path:

- The clicked tab immediately shows pending feedback.
- The top navbar height and asset slot do not jump.
- The content area never stays blank; it shows either the target page or a loading shell.
- Supply mutations still update nav assets after the supply snapshot refreshes.

## Plan Self-Review

- Spec coverage: Tasks 1 and 7 cover measurement; Tasks 2 and 5 cover feedback/preload; Task 3 covers redundant context update; Task 4 covers dynamic splitting; Task 6 covers image optimization.
- Completion scan: no unfinished markers or unspecified implementation steps remain.
- Type consistency: `AppTab`, `SupplyPanelKey`, `isActive`, `pending`, `preloadBoardTabComponent`, and `preloadSupplyPanelComponent` are used consistently across tasks.
