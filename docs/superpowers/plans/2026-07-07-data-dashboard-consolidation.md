# Data Dashboard Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the top-level `牛马日历` and `战报中心` navigation entries into one `数据看板` entry with `我的日历` and `团队战报` secondary tabs.

**Architecture:** Add a small `DataDashboard` shell that owns only the secondary tab state and delegates rendering to the existing personal dashboard and team report components. Collapse the main navigation type from `calendar` / `dash` to `data`, while keeping `/calendar` and `/report` as compatible routes that choose the initial secondary view.

**Tech Stack:** Next.js App Router, React client components, TypeScript strict mode, Tailwind CSS v4 utility classes plus existing `app/globals.css`, Vitest + jsdom.

## Global Constraints

- Do not change Prisma schema.
- Do not change personal dashboard or team report aggregation semantics.
- Do not merge `/api/dashboard/state` and `/api/dashboard/team-state`.
- Do not redesign personal dashboard or team report chart internals.
- Do not add new UI, state management, or request libraries.
- Keep `/calendar` and `/report` available.
- Do not stack `我的日历` and `团队战报` into one long page without secondary tabs.
- Keep existing uncommitted work outside this task intact. Stage only files named by each task.

---

## File Structure

- Create `components/data-dashboard/DataDashboard.tsx`: client shell for the `数据看板` page, secondary tabs, and delegated content rendering.
- Create `__tests__/data-dashboard.test.tsx`: component tests for default view, team initial view, tab switching, and prop resync.
- Modify `components/board/BoardApp.tsx`: add `initialDataView`, render `DynamicDataDashboard`, and wrap `data` with `DrinkProvider`.
- Modify `components/board/dynamic-tabs.tsx`: add `DynamicDataDashboard`.
- Modify `components/board/tab-component-loaders.ts`: add `loadDataDashboard` and map `AppTab.data` to data-dashboard preloading.
- Modify `lib/types.ts`: replace top-level `dash` / `calendar` app tabs with `data`.
- Modify `lib/navigation-routes.ts`: map `data` to `/calendar`.
- Modify `app/(board)/calendar/page.tsx`: open `DataDashboard` on `personal`.
- Modify `app/(board)/report/page.tsx`: open `DataDashboard` on `team`.
- Modify `components/navbar/Navbar.tsx`: replace the two primary buttons with one `数据看板` button.
- Modify `app/globals.css`: add `data-tab` color hooks and keep active primary-tab styling stable.
- Modify route and navigation tests listed in the tasks below.

---

### Task 1: DataDashboard Shell

**Files:**
- Create: `components/data-dashboard/DataDashboard.tsx`
- Create: `__tests__/data-dashboard.test.tsx`

**Interfaces:**
- Produces: `export type DataDashboardView = "personal" | "team"`
- Produces: `export function DataDashboard({ initialView = "personal" }: { initialView?: DataDashboardView }): JSX.Element`
- Consumes: `loadDashboardBoard()` and `loadReportCenter()` from `components/board/tab-component-loaders.ts`

- [ ] **Step 1: Write the failing component test**

Create `__tests__/data-dashboard.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataDashboard } from "@/components/data-dashboard/DataDashboard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    if (loader.name === "loadDashboardBoard") {
      return function MockPersonalDashboard() {
        return <section data-testid="personal-dashboard">个人看板内容</section>;
      };
    }

    return function MockTeamReport() {
      return <section data-testid="team-report">团队战报内容</section>;
    };
  },
}));

vi.mock("@/components/board/BoardTabLoadingShell", () => ({
  BoardTabLoadingShell: ({ label }: { label: string }) => <div data-testid="loading-shell">{label}</div>,
}));

describe("DataDashboard", () => {
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

  it("defaults to the personal dashboard view", async () => {
    await act(async () => {
      root.render(<DataDashboard />);
    });

    expect(container.textContent).toContain("数据看板");
    expect(container.querySelector("[data-testid='personal-dashboard']")).not.toBeNull();
    expect(container.querySelector("[data-testid='team-report']")).toBeNull();
    expect(container.querySelector("[data-dashboard-tab='personal']")?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("false");
  });

  it("can start directly on the team report view", async () => {
    await act(async () => {
      root.render(<DataDashboard initialView="team" />);
    });

    expect(container.querySelector("[data-testid='team-report']")).not.toBeNull();
    expect(container.querySelector("[data-testid='personal-dashboard']")).toBeNull();
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("true");
  });

  it("switches between the two secondary tabs without remounting the shell", async () => {
    await act(async () => {
      root.render(<DataDashboard />);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-dashboard-tab='team']")?.click();
    });

    expect(container.querySelector("[data-testid='team-report']")).not.toBeNull();
    expect(container.querySelector("[data-testid='personal-dashboard']")).toBeNull();
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("true");
  });

  it("resyncs when the route supplies a new initial view", async () => {
    await act(async () => {
      root.render(<DataDashboard initialView="personal" />);
    });

    await act(async () => {
      root.render(<DataDashboard initialView="team" />);
    });

    expect(container.querySelector("[data-testid='team-report']")).not.toBeNull();
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("true");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/data-dashboard.test.tsx
```

Expected: FAIL because `@/components/data-dashboard/DataDashboard` does not exist.

- [ ] **Step 3: Implement the minimal shell**

Create `components/data-dashboard/DataDashboard.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BoardTabLoadingShell } from "@/components/board/BoardTabLoadingShell";
import { loadDashboardBoard, loadReportCenter } from "@/components/board/tab-component-loaders";

export type DataDashboardView = "personal" | "team";

interface DataDashboardProps {
  initialView?: DataDashboardView;
}

const PersonalDashboardView = dynamic(loadDashboardBoard, {
  loading: () => <BoardTabLoadingShell label="我的日历加载中" />,
});

const TeamReportView = dynamic(loadReportCenter, {
  loading: () => <BoardTabLoadingShell label="团队战报加载中" />,
});

const tabs: Array<{ id: DataDashboardView; label: string; panelId: string }> = [
  { id: "personal", label: "我的日历", panelId: "data-dashboard-personal-panel" },
  { id: "team", label: "团队战报", panelId: "data-dashboard-team-panel" },
];

export function DataDashboard({ initialView = "personal" }: DataDashboardProps) {
  const [activeView, setActiveView] = useState<DataDashboardView>(initialView);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const activeTab = tabs.find((tab) => tab.id === activeView) ?? tabs[0];

  return (
    <section className="data-dashboard-shell flex h-full min-h-0 flex-col bg-slate-50">
      <div className="data-dashboard-chrome shrink-0 border-b-2 border-slate-800 bg-white px-4 py-3 shadow-[0_3px_0_0_#1f2937]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">数据看板</h1>
            <p className="text-sm font-bold text-slate-500">
              {activeView === "personal" ? "个人维度" : "团队维度"}
            </p>
          </div>
          <div
            aria-label="数据看板视图"
            className="inline-flex rounded-lg border-2 border-slate-800 bg-slate-100 p-1"
            role="tablist"
          >
            {tabs.map((tab) => {
              const selected = activeView === tab.id;

              return (
                <button
                  aria-controls={tab.panelId}
                  aria-selected={selected}
                  className={`rounded-md px-3 py-1.5 text-sm font-black transition-colors ${
                    selected ? "bg-yellow-300 text-slate-900 shadow-[0_2px_0_0_#1f2937]" : "text-slate-600 hover:bg-white"
                  }`}
                  data-dashboard-tab={tab.id}
                  id={`data-dashboard-${tab.id}-tab`}
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        aria-labelledby={`data-dashboard-${activeTab.id}-tab`}
        className="data-dashboard-content relative min-h-0 flex-1 overflow-auto"
        id={activeTab.panelId}
        role="tabpanel"
      >
        {activeView === "personal" ? <PersonalDashboardView /> : <TeamReportView />}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/data-dashboard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add components/data-dashboard/DataDashboard.tsx __tests__/data-dashboard.test.tsx
git commit -m "feat: add data dashboard shell"
```

---

### Task 2: Route And Dynamic Loading Wiring

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/navigation-routes.ts`
- Modify: `app/(board)/calendar/page.tsx`
- Modify: `app/(board)/report/page.tsx`
- Modify: `components/board/BoardApp.tsx`
- Modify: `components/board/dynamic-tabs.tsx`
- Modify: `components/board/tab-component-loaders.ts`
- Modify: `__tests__/navigation-routes.test.ts`
- Modify: `__tests__/board-app-dynamic-tabs.test.ts`
- Modify: `__tests__/home-supply-navigation.test.tsx`
- Modify: `__tests__/board-provider-sync.test.tsx`
- Modify: `__tests__/supply-dashboard-ui-lab-route.test.ts`
- Modify: `__tests__/supply-shop-ui-lab-route.test.ts`
- Modify: `__tests__/supply-backpack-ui-lab-route.test.ts`
- Modify: `__tests__/supply-draw-pool-ui-lab-route.test.ts`
- Modify: `__tests__/supply-task-record-ui-lab-route.test.ts`

**Interfaces:**
- Consumes: `DataDashboard` and `DataDashboardView` from Task 1.
- Produces: `AppTab = "punch" | "board" | "coffee" | "data" | "supply"`.
- Produces: `appTabRoutes.data === "/calendar"`.
- Produces: `BoardApp({ activeTab: "data", initialDataView })`.

- [ ] **Step 1: Update route and dynamic boundary tests first**

In `__tests__/navigation-routes.test.ts`, change the expected `appTabRoutes` object to:

```ts
expect(appTabRoutes).toEqual({
  punch: "/",
  board: "/board",
  coffee: "/drink",
  data: "/calendar",
  supply: "/dashboard/status",
});
```

In `__tests__/board-app-dynamic-tabs.test.ts`, update the dynamic import assertions:

```ts
expect(boardAppSource).not.toContain('from "@/components/data-dashboard/DataDashboard"');
expect(dynamicTabsSource).toContain("DynamicDataDashboard");
expect(loaderSource).toContain("loadDataDashboard");
expect(loaderSource).toContain('case "data"');
expect(loaderSource).not.toContain('case "dash"');
expect(loaderSource).not.toContain('case "calendar"');
```

In each supply route test listed above, replace the old AppTab source assertion with:

```ts
expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "data" | "supply";');
```

In `__tests__/board-provider-sync.test.tsx`, replace the initial `activeTab: "dash"` value and related assertions with `activeTab: "data"`:

```ts
activeTab: "data",
```

```ts
expect(state.activeTab).toBe("data");
```

In `__tests__/home-supply-navigation.test.tsx`, update the dynamic tab mock to provide `DynamicDataDashboard`:

```tsx
DynamicDataDashboard: ({ initialView }: { initialView?: "personal" | "team" }) => (
  <section data-initial-view={initialView} data-testid="data-dashboard">
    数据看板
  </section>
),
```

Then update the report route provider test to assert `initialView="team"`:

```ts
const { default: ReportPage } = await import("@/app/(board)/report/page");

await act(async () => {
  root.render(<ReportPage />);
});

expect(container.querySelector("[data-testid='drink-provider']")).not.toBeNull();
expect(container.querySelector("[data-testid='data-dashboard']")?.getAttribute("data-initial-view")).toBe("team");
```

Add this route compatibility test in `__tests__/home-supply-navigation.test.tsx`:

```tsx
it("keeps calendar and report routes as data dashboard entry points", async () => {
  const { default: CalendarPage } = await import("@/app/(board)/calendar/page");

  await act(async () => {
    root.render(<CalendarPage />);
  });

  expect(navbarPropsMock).toHaveBeenLastCalledWith(
    expect.objectContaining({
      activeTabOverride: "data",
    }),
  );
  expect(container.querySelector("[data-testid='data-dashboard']")?.getAttribute("data-initial-view")).toBe("personal");

  const { default: ReportPage } = await import("@/app/(board)/report/page");

  await act(async () => {
    root.render(<ReportPage />);
  });

  expect(navbarPropsMock).toHaveBeenLastCalledWith(
    expect.objectContaining({
      activeTabOverride: "data",
    }),
  );
  expect(container.querySelector("[data-testid='data-dashboard']")?.getAttribute("data-initial-view")).toBe("team");
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npm test -- __tests__/navigation-routes.test.ts __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx __tests__/board-provider-sync.test.tsx __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-task-record-ui-lab-route.test.ts
```

Expected: FAIL because `AppTab.data`, `DynamicDataDashboard`, and `BoardApp.initialDataView` are not implemented yet.

- [ ] **Step 3: Update the AppTab type and route map**

In `lib/types.ts`, replace the `AppTab` type with:

```ts
export type AppTab = "punch" | "board" | "coffee" | "data" | "supply";
```

In `lib/navigation-routes.ts`, replace `appTabRoutes` with:

```ts
export const appTabRoutes: Record<AppTab, string> = {
  punch: "/",
  board: "/board",
  coffee: "/drink",
  data: "/calendar",
  supply: "/dashboard/status",
};
```

- [ ] **Step 4: Update compatible route pages**

In `app/(board)/calendar/page.tsx`, replace the component with:

```tsx
import { BoardApp } from "@/components/board/BoardApp";

export default function CalendarRoutePage() {
  return <BoardApp activeTab="data" initialDataView="personal" />;
}
```

In `app/(board)/report/page.tsx`, replace the component with:

```tsx
import { BoardApp } from "@/components/board/BoardApp";

export default function ReportRoutePage() {
  return <BoardApp activeTab="data" initialDataView="team" />;
}
```

- [ ] **Step 5: Add data-dashboard dynamic loading**

In `components/board/tab-component-loaders.ts`, add the loader:

```ts
export const loadDataDashboard = () => import("@/components/data-dashboard/DataDashboard").then((mod) => mod.DataDashboard);
```

Update `preloadBoardTabComponent` to use the new `data` case:

```ts
export function preloadBoardTabComponent(tab: AppTab) {
  switch (tab) {
    case "board":
      void loadSharedBoard();
      break;
    case "coffee":
      void loadDrinkCheckin();
      break;
    case "data":
      void loadDataDashboard();
      void loadDashboardBoard();
      break;
    case "supply":
      void loadSupplyStation();
      break;
    case "punch":
      break;
  }
}
```

In `components/board/dynamic-tabs.tsx`, import `loadDataDashboard` and add:

```tsx
export const DynamicDataDashboard = dynamic(loadDataDashboard, {
  loading: () => <BoardTabLoadingShell label="数据看板加载中" />,
});
```

- [ ] **Step 6: Wire BoardApp to the data tab**

In `components/board/BoardApp.tsx`, import the new dynamic component and type:

```ts
import {
  DynamicDataDashboard,
  DynamicDrinkCheckin,
  DynamicSharedBoard,
  DynamicSupplyStation,
} from "@/components/board/dynamic-tabs";
import type { DataDashboardView } from "@/components/data-dashboard/DataDashboard";
```

Update the function signature:

```tsx
export function BoardApp({
  activeTab,
  supplyPanel = "dashboard",
  initialDataView = "personal",
}: {
  activeTab: AppTab;
  supplyPanel?: SupplyPanelKey;
  initialDataView?: DataDashboardView;
}) {
```

Replace the old `calendar` and `dash` switch cases with:

```tsx
case "data":
  return <DynamicDataDashboard initialView={initialDataView} />;
```

Replace the provider conditions with:

```tsx
if (activeTab === "coffee" || activeTab === "data") {
  return <DrinkProvider>{pageShell}</DrinkProvider>;
}
```

- [ ] **Step 7: Run the focused route and wiring tests**

Run:

```bash
npm test -- __tests__/navigation-routes.test.ts __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx __tests__/board-provider-sync.test.tsx __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-task-record-ui-lab-route.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add lib/types.ts lib/navigation-routes.ts app/\(board\)/calendar/page.tsx app/\(board\)/report/page.tsx components/board/BoardApp.tsx components/board/dynamic-tabs.tsx components/board/tab-component-loaders.ts __tests__/navigation-routes.test.ts __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx __tests__/board-provider-sync.test.tsx __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-task-record-ui-lab-route.test.ts
git commit -m "feat: route calendar and report through data dashboard"
```

---

### Task 3: Navbar Consolidation

**Files:**
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/navbar-supply-chrome.test.tsx`

**Interfaces:**
- Consumes: `AppTab.data` and `appTabRoutes.data` from Task 2.
- Produces: one primary `数据看板` nav item in desktop and mobile menus.
- Produces: `preloadBoardTabComponent("data")` on data-tab hover/focus.

- [ ] **Step 1: Update Navbar tests first**

In `__tests__/navbar-supply-chrome.test.tsx`, update the primary nav order test:

```ts
const expectedOrder = ["健身打卡", "牛马水铺", "共享看板", "数据看板", "牛马补给站"];
```

Replace `activeTab = "dash"` and `activeTabOverride="dash"` occurrences with `activeTab = "data"` and `activeTabOverride="data"`.

Update the prefetch test to target `数据看板`:

```ts
const dataTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
  button.textContent?.includes("数据看板"),
);

await act(async () => {
  dataTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
});

expect(routerPrefetchMock).toHaveBeenCalledWith("/calendar");
expect(preloadBoardTabComponentMock).toHaveBeenCalledWith("data");
expect(preloadSupplyPanelComponentMock).not.toHaveBeenCalled();
```

Add assertions to the order test that removed labels are not present:

```ts
expect(container.textContent).not.toContain("牛马日历");
expect(container.textContent).not.toContain("战报中心");
```

- [ ] **Step 2: Run the Navbar test and verify it fails**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because Navbar still renders separate `牛马日历` and `战报中心` buttons.

- [ ] **Step 3: Replace desktop nav buttons**

In `components/navbar/Navbar.tsx`, replace the desktop `calendar` and `dash` `TabBtn` blocks with:

```tsx
<TabBtn
  active={activeTab === "data"}
  className="data-tab"
  pending={pendingTab === "data"}
  onFocus={() => prefetchAppTab("data")}
  onMouseEnter={() => prefetchAppTab("data")}
  onClick={() => handleTabChange("data")}
>
  <AssetIcon name="calendar" className="h-4 w-4 object-contain" />
  数据看板
</TabBtn>
```

- [ ] **Step 4: Replace mobile nav buttons**

In the mobile panel in `components/navbar/Navbar.tsx`, replace the `calendar` and `dash` `TabBtn` blocks with:

```tsx
<TabBtn
  active={activeTab === "data"}
  className="mobile-tab-btn data-tab justify-between"
  pending={pendingTab === "data"}
  onFocus={() => prefetchAppTab("data")}
  onMouseEnter={() => prefetchAppTab("data")}
  onClick={() => handleTabChange("data")}
>
  <span className="flex items-center gap-2">
    <AssetIcon name="calendar" className="h-4 w-4 object-contain" />
    数据看板
  </span>
</TabBtn>
```

- [ ] **Step 5: Add data-tab styling**

In `app/globals.css`, replace the old `calendar-tab` and `report-tab` special active/hover blocks with:

```css
.tab-btn.data-tab.active {
  background-color: #ddd6fe;
  color: #4c1d95;
}
.tab-btn.data-tab.inactive:hover {
  background-color: #ede9fe;
  color: #5b21b6;
}
```

Update the `.home-tab-strip` active selector to include `data-tab` and remove `calendar-tab` / `report-tab`:

```css
.home-tab-strip .tab-btn.active,
.home-tab-strip .tab-btn.board-tab.active,
.home-tab-strip .tab-btn.coffee-tab.active,
.home-tab-strip .tab-btn.data-tab.active,
.home-tab-strip .tab-btn.supply-tab.active {
  border-color: #111827;
  background-color: #fde047;
  color: #111827;
  box-shadow: 0 3px 0 0 #111827;
}
```

- [ ] **Step 6: Run the focused Navbar test**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add components/navbar/Navbar.tsx app/globals.css __tests__/navbar-supply-chrome.test.tsx
git commit -m "feat: consolidate dashboard navigation"
```

---

### Task 4: Regression Sweep And Build Verification

**Files:**
- Modify only files required by failed verification from Tasks 1-3.

**Interfaces:**
- Consumes: all interfaces from Tasks 1-3.
- Produces: verified implementation with no remaining production `dash` / `calendar` app-tab branches.

- [ ] **Step 1: Search for stale AppTab branches**

Run:

```bash
rg -n 'activeTab="dash"|activeTab="calendar"|activeTab: "dash"|activeTab: "calendar"|case "dash"|case "calendar"|pendingTab === "dash"|pendingTab === "calendar"|prefetchAppTab\("dash"|prefetchAppTab\("calendar"|handleTabChange\("dash"|handleTabChange\("calendar"' app components lib __tests__ --glob '!app/ui-prototypes/**'
```

Expected: no output.

- [ ] **Step 2: Run the focused feature test set**

Run:

```bash
npm test -- __tests__/data-dashboard.test.tsx __tests__/navigation-routes.test.ts __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx __tests__/navbar-supply-chrome.test.tsx __tests__/report-center-container.test.tsx __tests__/dashboard-board.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run route string regression tests touched by AppTab**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-task-record-ui-lab-route.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run the production build**

Run:

```bash
npm run build
```

Expected: build exits with code 0. The route list still includes `/calendar` and `/report`.

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git diff --stat
git diff -- app/\(board\)/calendar/page.tsx app/\(board\)/report/page.tsx components/data-dashboard/DataDashboard.tsx components/board/BoardApp.tsx components/navbar/Navbar.tsx lib/types.ts lib/navigation-routes.ts
```

Expected: diff only reflects the data-dashboard consolidation. No Prisma schema, seed, API aggregation, or unrelated supply-station logic changes appear.

- [ ] **Step 6: Commit any verification fixes**

If Step 1-5 required additional fixes, stage only those files and commit:

```bash
git add components/data-dashboard/DataDashboard.tsx __tests__/data-dashboard.test.tsx lib/types.ts lib/navigation-routes.ts app/\(board\)/calendar/page.tsx app/\(board\)/report/page.tsx components/board/BoardApp.tsx components/board/dynamic-tabs.tsx components/board/tab-component-loaders.ts components/navbar/Navbar.tsx app/globals.css __tests__/navigation-routes.test.ts __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx __tests__/board-provider-sync.test.tsx __tests__/navbar-supply-chrome.test.tsx __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-task-record-ui-lab-route.test.ts
git commit -m "fix: complete data dashboard consolidation"
```

If Step 1-5 passed without extra changes, skip this commit.
