# Supply Shared Navigation Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第一阶段把牛马补给站接回主站共享导航壳：一级 tab 统一、补给站二级 tab 常驻、右侧资产 slot 展示银子/抽奖券/背包/头像，并移除生产补给站页面里重复的内部 topbar。

**Architecture:** `BoardApp` 继续负责主站页面壳，所有正式页面都渲染同一个 `Navbar`。`SupplyStationShell` 仍负责加载补给站生产快照和业务动作，但通过回调把轻量导航上下文交给 `BoardApp`，再由 `Navbar` 渲染补给站二级导航和资产 chips。UI Lab 场景组件新增 `chrome="embedded"` 模式，生产补给站使用 embedded 模式隐藏内部 topbar；UI Lab 独立原型页面保持默认 standalone 模式。

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict mode, Vitest/jsdom, existing global CSS/Tailwind utilities, Browser plugin visual QA.

---

## Locked Decisions

- 第一阶段只做导航统一，不做补给站首页三列重排。
- 二级 tab 放在顶部主导航下方，常驻显示；不采用底部 dock。
- 二级 tab 包含 5 项：`我的状态`、`补给商店`、`任务记录`、`背包`、`抽奖池`。
- 主站 `Navbar` 是唯一生产导航壳；补给站内部 topbar 在生产路由隐藏。
- 右侧资产 slot 只在补给站上下文中展示：`银子`、`抽奖券`、`背包`，右侧继续保留用户头像。
- 补给站内容主体第一期尽量不重排；删除/隐藏重复导航 chrome 后，保留当前各 panel 的业务功能。
- UI Lab 静态 route 仍可展示原来的独立 topbar，避免破坏历史原型验收。

## Non-Goals

- 不重做 `我的状态` 首页三列布局。
- 不统一商店/背包/任务记录/抽奖池的页面 chrome。
- 不重构全局 UI token。
- 不修改 Prisma schema、API Route 或补给站业务 mutation。
- 不删除 `/ui-prototypes/supply-nav` 原型页；它只作为视觉参考，不是生产入口。

## File Structure

- Modify: `lib/navigation-routes.ts`
  - 增加补给站二级导航配置和轻量导航上下文类型。
- Modify: `components/navbar/Navbar.tsx`
  - 支持 `activeSupplyPanel`、`supplyNavContext`。
  - 渲染二级 tab 和补给站资产 slot。
- Modify: `components/board/BoardApp.tsx`
  - 不再对 `activeTab === "supply"` 隐藏 `Navbar`。
  - 接收 `SupplyStation` 回传的导航上下文并传给 `Navbar`。
- Modify: `components/gamification/production/SupplyStationShell.tsx`
  - 新增 `onNavContextChange` prop。
  - 从生产 snapshot 生成轻量导航上下文。
  - 对生产 UI Lab 场景传入 `chrome="embedded"`。
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
  - 新增 `chrome?: "standalone" | "embedded"`，默认 standalone。
  - embedded 模式隐藏内部 topbar/资源条/返回大厅 chrome。
- Modify: `app/globals.css`
  - 增加 Navbar 二级 tab、资产 chip、embedded scene spacing 的样式。
- Test: `__tests__/navbar-supply-chrome.test.tsx`
  - 新增 Navbar 补给站二级 tab 和资产 slot 单元测试。
- Test: `__tests__/home-supply-navigation.test.tsx`
  - 更新 BoardApp 生产补给站路由行为：Navbar 应出现，且收到补给站 panel/context props。
- Test: `__tests__/supply-dashboard-scene.test.tsx`
  - 增加 embedded 模式不渲染内部 topbar 的断言。
- Test: existing focused scene tests for shop/task-record/backpack/draw-pool remain the regression suite; Task 4 keeps their default standalone behavior unchanged.

## Task 1: Navigation Contract

**Files:**

- Modify: `lib/navigation-routes.ts`
- Test: `__tests__/navbar-supply-chrome.test.tsx`

- [ ] **Step 1: Add the failing Navbar supply chrome test**

Create `__tests__/navbar-supply-chrome.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";
import type { AppTab } from "@/lib/types";
import type { SupplyNavContext } from "@/lib/navigation-routes";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerPushMock = vi.fn();

let activeTab: AppTab = "supply";

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      activeTab,
      currentUserId: "u1",
      currentUser: {
        assetBalance: 440,
        currentStreak: 12,
        nextReward: 10,
        seasonIncome: 120,
        isAdmin: false,
      },
      members: [{ id: "u1", name: "li", avatarKey: "male1" }],
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/components/navbar/TeamDynamicsBell", () => ({
  TeamDynamicsBell: () => <button aria-label="团队动态，未读 4 条">铃铛</button>,
}));

vi.mock("@/components/profile/EditProfileModal", () => ({
  EditProfileModal: () => <div data-testid="edit-profile-modal" />,
}));

const supplyNavContext: SupplyNavContext = {
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

describe("Navbar supply chrome", () => {
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
    routerPushMock.mockClear();
    activeTab = "supply";
  });

  it("renders the supply secondary tabs when the supply primary tab is active", async () => {
    await act(async () => {
      root.render(
        <Navbar
          activeSupplyPanel="dashboard"
          activeTabOverride="supply"
          supplyNavContext={supplyNavContext}
        />,
      );
    });

    expect(container.querySelector(".app-supply-secondary-nav")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll(".app-supply-secondary-tab")).map((tab) => tab.textContent?.trim()),
    ).toEqual(["⌂我的状态", "▤补给商店", "▣任务记录", "◫背包", "◈抽奖池"]);
    expect(container.querySelector(".app-supply-secondary-tab[aria-current='page']")?.textContent).toContain("我的状态");
  });

  it("pushes formal dashboard routes from secondary tabs", async () => {
    await act(async () => {
      root.render(
        <Navbar
          activeSupplyPanel="dashboard"
          activeTabOverride="supply"
          supplyNavContext={supplyNavContext}
        />,
      );
    });

    const backpackTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".app-supply-secondary-tab")).find(
      (button) => button.textContent?.includes("背包"),
    );

    await act(async () => {
      backpackTab?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/dashboard/backpack");
  });

  it("renders supply resources in the right context slot", async () => {
    await act(async () => {
      root.render(
        <Navbar
          activeSupplyPanel="dashboard"
          activeTabOverride="supply"
          supplyNavContext={supplyNavContext}
        />,
      );
    });

    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("银子");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("440");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("7");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("背包");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("12/60");
    expect(container.querySelector('img[src="/avatars/male1.png"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because `SupplyNavContext`, `activeSupplyPanel`, and `supplyNavContext` do not exist yet.

- [ ] **Step 3: Add navigation config and types**

Modify `lib/navigation-routes.ts`:

```ts
import type { AppTab } from "@/lib/types";

export type SupplyPanelKey = "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord";

export type SupplyNavResourceId = "coins" | "ticket" | "backpack";

export interface SupplyNavResource {
  id: SupplyNavResourceId;
  label: "银子" | "抽奖券" | "背包";
  value: number;
  maxValue?: number;
  iconImage: string;
}

export interface SupplyNavContext {
  resources: SupplyNavResource[];
  profile: {
    username: string;
    avatarKey: string;
  };
}

export interface SupplyNavItem {
  id: SupplyPanelKey;
  label: string;
  icon: string;
  route: string;
}

export const appTabRoutes: Record<AppTab, string> = {
  punch: "/",
  board: "/board",
  coffee: "/drink",
  calendar: "/calendar",
  dash: "/report",
  supply: "/dashboard/status",
};

export const supplyPanelRoutes: Record<SupplyPanelKey, string> = {
  dashboard: "/dashboard/status",
  drawPool: "/dashboard/cards",
  backpack: "/dashboard/backpack",
  shop: "/dashboard/store",
  taskRecord: "/dashboard/quest",
};

export const supplyNavItems: SupplyNavItem[] = [
  { id: "dashboard", label: "我的状态", icon: "⌂", route: supplyPanelRoutes.dashboard },
  { id: "shop", label: "补给商店", icon: "▤", route: supplyPanelRoutes.shop },
  { id: "taskRecord", label: "任务记录", icon: "▣", route: supplyPanelRoutes.taskRecord },
  { id: "backpack", label: "背包", icon: "◫", route: supplyPanelRoutes.backpack },
  { id: "drawPool", label: "抽奖池", icon: "◈", route: supplyPanelRoutes.drawPool },
];
```

- [ ] **Step 4: Commit navigation contract**

```bash
git add lib/navigation-routes.ts __tests__/navbar-supply-chrome.test.tsx
git commit -m "test: define supply navigation chrome contract"
```

Expected: commit contains the failing test and shared navigation contract.

## Task 2: Navbar Secondary Tabs And Asset Slot

**Files:**

- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/navbar-supply-chrome.test.tsx`

- [ ] **Step 1: Add Navbar props and secondary nav rendering**

Modify the `Navbar` signature and imports:

```tsx
import {
  appTabRoutes,
  supplyNavItems,
  type SupplyNavContext,
  type SupplyPanelKey,
} from "@/lib/navigation-routes";

export function Navbar({
  activeTabOverride,
  activeSupplyPanel,
  supplyNavContext,
}: {
  activeTabOverride?: AppTab;
  activeSupplyPanel?: SupplyPanelKey;
  supplyNavContext?: SupplyNavContext | null;
} = {}) {
```

Inside `Navbar`, add:

```tsx
  function handleSupplyPanelChange(panel: SupplyPanelKey) {
    const item = supplyNavItems.find((candidate) => candidate.id === panel);
    if (!item) {
      return;
    }

    startTransition(() => {
      router.push(item.route);
    });
  }

  const showSupplyChrome = activeTab === "supply";
```

After the existing mobile panel block and before `</nav>`, render:

```tsx
        {showSupplyChrome ? (
          <div className="app-supply-secondary-nav" aria-label="牛马补给站分区导航">
            <div className="app-supply-secondary-rail" role="tablist">
              {supplyNavItems.map((item) => {
                const selected = item.id === (activeSupplyPanel ?? "dashboard");

                return (
                  <button
                    aria-current={selected ? "page" : undefined}
                    aria-selected={selected}
                    className="app-supply-secondary-tab"
                    key={item.id}
                    onClick={() => handleSupplyPanelChange(item.id)}
                    role="tab"
                    type="button"
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
```

- [ ] **Step 2: Replace the right context slot when supply data is available**

In the right side button area, keep `TeamDynamicsBell`, then replace the normal profile button only when `showSupplyChrome && supplyNavContext`:

```tsx
            {showSupplyChrome && supplyNavContext ? (
              <>
                <div className="app-supply-assets" aria-label="补给站资产">
                  {supplyNavContext.resources.map((resource) => (
                    <button
                      className={`app-supply-asset-chip app-supply-asset-chip--${resource.id}`}
                      key={resource.id}
                      type="button"
                      aria-label={`${resource.label} ${resource.maxValue ? `${resource.value}/${resource.maxValue}` : resource.value}`}
                    >
                      <img src={resource.iconImage} alt="" aria-hidden="true" />
                      <span>{resource.label}</span>
                      <strong>{resource.maxValue ? `${resource.value}/${resource.maxValue}` : resource.value}</strong>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleProfileClick}
                  disabled={!currentMember}
                  className="app-supply-profile-button"
                  type="button"
                >
                  <img
                    src={getAvatarUrl(supplyNavContext.profile.avatarKey)}
                    alt={supplyNavContext.profile.username}
                  />
                  <span>{supplyNavContext.profile.username}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleProfileClick}
                disabled={!currentMember}
                className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full pl-2 pr-4 py-1 text-slate-900 hover:border-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                  {currentMember ? (
                    <img src={getAvatarUrl(currentMember.avatarKey)} alt={currentMember.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-slate-400">?</span>
                  )}
                </div>
                <span className="font-bold text-sm">{currentMember?.name ?? "未分配成员"}</span>
              </button>
            )}
```

Keep the existing `ProfileDropdown` and `EditProfileModal` behavior unchanged.

- [ ] **Step 3: Add CSS for secondary tabs and assets**

Append near existing `.app-top-nav` rules in `app/globals.css`:

```css
.app-supply-secondary-nav {
  display: flex;
  justify-content: center;
  margin-top: 0.7rem;
  padding-inline: 0.35rem;
}

.app-supply-secondary-rail {
  display: flex;
  max-width: min(100%, 56rem);
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  overflow-x: auto;
  border: 3px solid #111827;
  border-radius: 1.25rem;
  background: rgba(255, 248, 232, 0.96);
  box-shadow: 5px 5px 0 rgba(17, 24, 39, 0.5);
  padding: 0.45rem;
  scrollbar-width: none;
}

.app-supply-secondary-rail::-webkit-scrollbar {
  display: none;
}

.app-supply-secondary-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.65rem;
  border: 2px solid #111827;
  border-radius: 999px;
  background: #fff;
  color: #111827;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 1000;
  line-height: 1;
  padding: 0 0.8rem;
}

.app-supply-secondary-tab span {
  display: grid;
  width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  border: 2px solid #111827;
  border-radius: 0.4rem;
  background: #e0f2fe;
}

.app-supply-secondary-tab[aria-current="page"] {
  background: #fde047;
  box-shadow: 4px 4px 0 rgba(17, 24, 39, 0.5);
}

.app-supply-assets {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.app-supply-asset-chip,
.app-supply-profile-button {
  display: inline-flex;
  align-items: center;
  border: 2px solid #111827;
  border-radius: 999px;
  background: #f8fafc;
  color: #111827;
  box-shadow: 0 3px 0 rgba(17, 24, 39, 0.35);
  font: inherit;
  font-weight: 1000;
}

.app-supply-asset-chip {
  gap: 0.35rem;
  min-height: 2.75rem;
  padding: 0.28rem 0.55rem 0.28rem 0.35rem;
}

.app-supply-asset-chip img {
  width: 1.85rem;
  height: 1.85rem;
  object-fit: contain;
}

.app-supply-asset-chip span {
  color: #64748b;
  font-size: 0.7rem;
  line-height: 1;
}

.app-supply-asset-chip strong {
  font-size: 0.95rem;
  line-height: 1;
}

.app-supply-profile-button {
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0.2rem 0.65rem 0.2rem 0.3rem;
}

.app-supply-profile-button img {
  width: 2.1rem;
  height: 2.1rem;
  border: 2px solid #bfdbfe;
  border-radius: 999px;
  background: #dbeafe;
  object-fit: cover;
}
```

Add responsive rules inside the existing `@media (max-width: 640px)` block:

```css
  .app-supply-secondary-nav {
    justify-content: flex-start;
    padding-inline: 0;
  }

  .app-supply-secondary-rail {
    justify-content: flex-start;
    width: 100%;
    border-radius: 1rem;
  }

  .app-supply-secondary-tab {
    min-height: 2.45rem;
    padding-inline: 0.7rem;
  }

  .app-supply-assets {
    gap: 0.25rem;
  }

  .app-supply-asset-chip {
    min-height: 2.35rem;
    padding: 0.2rem 0.35rem;
  }

  .app-supply-asset-chip img {
    width: 1.45rem;
    height: 1.45rem;
  }

  .app-supply-asset-chip span {
    display: none;
  }

  .app-supply-profile-button {
    min-height: 2.35rem;
    padding: 0.15rem;
  }

  .app-supply-profile-button img {
    width: 1.8rem;
    height: 1.8rem;
  }

  .app-supply-profile-button span {
    display: none;
  }
```

- [ ] **Step 4: Run Navbar test**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Navbar chrome**

```bash
git add components/navbar/Navbar.tsx app/globals.css __tests__/navbar-supply-chrome.test.tsx
git commit -m "feat: add supply secondary nav chrome"
```

## Task 3: BoardApp And Supply Snapshot Bridge

**Files:**

- Modify: `components/board/BoardApp.tsx`
- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `__tests__/home-supply-navigation.test.tsx`

- [ ] **Step 1: Update BoardApp test contract**

In `__tests__/home-supply-navigation.test.tsx`, update the Navbar mock:

```tsx
const navbarPropsMock = vi.fn();

vi.mock("@/components/navbar/Navbar", () => ({
  Navbar: (props: Record<string, unknown>) => {
    navbarPropsMock(props);
    return <nav data-testid="home-navbar">首页导航</nav>;
  },
}));
```

Update the SupplyStation mock to call `onNavContextChange`:

```tsx
vi.mock("@/components/gamification/SupplyStation", () => ({
  SupplyStation: ({
    initialPanel,
    onBackToPunch,
    onPanelChange,
    onNavContextChange,
  }: {
    initialPanel?: string;
    onBackToPunch?: () => void;
    onPanelChange?: (panel: "shop" | "taskRecord") => void;
    onNavContextChange?: (context: unknown) => void;
  }) => {
    onNavContextChange?.({
      resources: [
        { id: "coins", label: "银子", value: 440, iconImage: "/assets/home-scenes/supply/shared/supply-resource-coins.png" },
        { id: "ticket", label: "抽奖券", value: 7, iconImage: "/assets/home-scenes/supply/shared/supply-resource-ticket.png" },
        { id: "backpack", label: "背包", value: 12, maxValue: 60, iconImage: "/assets/home-scenes/supply/shared/supply-resource-backpack.png" },
      ],
      profile: { username: "li", avatarKey: "male1" },
    });

    return (
      <section data-testid="supply-station">
        牛马补给站
        <span data-testid="supply-panel">{initialPanel}</span>
        <button onClick={onBackToPunch} type="button">回到打卡</button>
        <button onClick={() => onPanelChange?.("shop")} type="button">去商店</button>
        <button onClick={() => onPanelChange?.("taskRecord")} type="button">去任务记录</button>
      </section>
    );
  },
}));
```

Replace the existing supply navbar test with:

```tsx
  it("keeps the home navbar while the dashboard status route is active", async () => {
    const { default: SupplyStatusPage } = await import("@/app/(board)/dashboard/status/page");

    await act(async () => {
      root.render(<SupplyStatusPage />);
    });

    expect(container.querySelector("[data-testid='home-navbar']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-station']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-panel']")?.textContent).toBe("dashboard");
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "supply",
        activeSupplyPanel: "dashboard",
        supplyNavContext: expect.objectContaining({
          profile: { username: "li", avatarKey: "male1" },
        }),
      }),
    );
  });
```

- [ ] **Step 2: Run failing BoardApp test**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx
```

Expected: FAIL because `BoardApp` still hides Navbar for supply and `SupplyStationShell` does not accept `onNavContextChange`.

- [ ] **Step 3: Implement BoardApp supply nav context state**

Modify `components/board/BoardApp.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { SupplyNavContext } from "@/lib/navigation-routes";
```

Inside `BoardApp`:

```tsx
  const [supplyNavContext, setSupplyNavContext] = useState<SupplyNavContext | null>(null);

  useEffect(() => {
    if (activeTab !== "supply") {
      setSupplyNavContext(null);
    }
  }, [activeTab]);
```

Pass the callback to `SupplyStation`:

```tsx
          <SupplyStation
            initialPanel={supplyPanel}
            onBackToPunch={() => router.push(appTabRoutes.punch)}
            onNavContextChange={setSupplyNavContext}
            onPanelChange={(panel) => router.push(supplyPanelRoutes[panel])}
          />
```

Render Navbar for all non-supply and supply tabs:

```tsx
      <Navbar
        activeSupplyPanel={activeTab === "supply" ? supplyPanel : undefined}
        activeTabOverride={activeTab}
        supplyNavContext={activeTab === "supply" ? supplyNavContext : null}
      />
```

- [ ] **Step 4: Implement SupplyStationShell navigation context callback**

Modify `components/gamification/production/SupplyStationShell.tsx` imports:

```tsx
import type { SupplyNavContext } from "@/lib/navigation-routes";
import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
```

Add helper near `getSupplyErrorState`:

```tsx
function buildSupplyNavContext(snapshot: SupplyStationProductionSnapshot): SupplyNavContext {
  return {
    resources: [
      {
        id: "coins",
        label: snapshot.resources.coins.label,
        value: snapshot.resources.coins.value,
        maxValue: snapshot.resources.coins.maxValue,
        iconImage: supplyUiLabResourceIconPaths.coins,
      },
      {
        id: "ticket",
        label: snapshot.resources.ticket.label,
        value: snapshot.resources.ticket.value,
        maxValue: snapshot.resources.ticket.maxValue,
        iconImage: supplyUiLabResourceIconPaths.ticket,
      },
      {
        id: "backpack",
        label: snapshot.resources.backpack.label,
        value: snapshot.resources.backpack.value,
        maxValue: snapshot.resources.backpack.maxValue,
        iconImage: supplyUiLabResourceIconPaths.backpack,
      },
    ],
    profile: {
      username: snapshot.profile.username,
      avatarKey: snapshot.profile.avatarKey,
    },
  };
}
```

Add prop:

```tsx
export function SupplyStationShell({
  initialPanel = "dashboard",
  onBackToPunch,
  onNavContextChange,
  onPanelChange,
}: {
  initialPanel?: SupplyProductionPanel;
  onBackToPunch?: () => void;
  onNavContextChange?: (context: SupplyNavContext | null) => void;
  onPanelChange?: (panel: SupplyProductionPanel) => void;
}) {
```

Add effect after snapshot state:

```tsx
  useEffect(() => {
    onNavContextChange?.(snapshot ? buildSupplyNavContext(snapshot) : null);

    return () => {
      onNavContextChange?.(null);
    };
  }, [onNavContextChange, snapshot]);
```

- [ ] **Step 5: Run BoardApp test**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit shell bridge**

```bash
git add components/board/BoardApp.tsx components/gamification/production/SupplyStationShell.tsx __tests__/home-supply-navigation.test.tsx
git commit -m "feat: bridge supply state into shared navbar"
```

## Task 4: Production Embedded Supply Scenes

**Files:**

- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/supply-dashboard-scene.test.tsx`

- [ ] **Step 1: Add embedded-mode dashboard test**

Append to `__tests__/supply-dashboard-scene.test.tsx`:

```tsx
  it("can render embedded in the shared app shell without its internal topbar", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene chrome="embedded" data={supplyDashboardMock} />);
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-scene--embedded")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource-strip")).toBeNull();
    expect(container.querySelector(".supply-dashboard-stage")).not.toBeNull();
  });
```

- [ ] **Step 2: Run failing dashboard scene test**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL because `chrome` prop does not exist.

- [ ] **Step 3: Add embedded prop to Dashboard scene**

Modify `SupplyDashboardScene` props:

```tsx
export function SupplyDashboardScene({
  chrome = "standalone",
  data,
  feedbackMessage,
  onBackToPunch,
  onClaimRewards,
  onCompleteQuest,
  onNavigate,
  onRerollQuest,
  onSelectSupplyTab,
}: {
  chrome?: "standalone" | "embedded";
  data: SupplyDashboardPreview;
  feedbackMessage?: string | null;
  onBackToPunch?: () => void;
  onClaimRewards?: () => void;
  onCompleteQuest?: (questId: string) => void;
  onNavigate?: (target: SupplyDashboardShortcutLink["id"]) => void;
  onRerollQuest?: (questId: string) => void;
  onSelectSupplyTab?: (tabId: SupplyUiLabTopBarTabId) => void;
}) {
```

Update the root class and topbar:

```tsx
    <main
      className={`supply-dashboard-scene${chrome === "embedded" ? " supply-dashboard-scene--embedded" : ""}`}
      aria-label="牛马补给站"
    >
```

```tsx
        {chrome === "standalone" ? (
          <SupplyUiLabTopBar
            activeLabel="我的状态"
            onSelectTab={onSelectSupplyTab}
            returnAction={
              onBackToPunch
                ? {
                    label: "回到打卡",
                    onClick: onBackToPunch,
                  }
                : undefined
            }
            profile={{
              username: data.profile.username,
              avatar: data.profile.avatar,
            }}
            resources={getTopBarResources(data)}
          />
        ) : null}
```

- [ ] **Step 4: Add embedded prop to the other supply scenes**

For each scene, add `chrome?: "standalone" | "embedded"` with default `"standalone"` and hide the internal topbar only in embedded mode.

Use these root class modifiers:

```tsx
className={`supply-shop-scene${chrome === "embedded" ? " supply-shop-scene--embedded" : ""}`}
className={`supply-task-record-scene${chrome === "embedded" ? " supply-task-record-scene--embedded" : ""}`}
className={`supply-backpack-scene${chrome === "embedded" ? " supply-backpack-scene--embedded" : ""}`}
className={`supply-draw-pool-scene${chrome === "embedded" ? " supply-draw-pool-scene--embedded" : ""}`}
```

In `SupplyShopScene`, change the props and root/topbar block to:

```tsx
export function SupplyShopScene({
  chrome = "standalone",
  data,
  onBackToPunch,
  onPurchase,
  onSelectProduct,
  onSelectSupplyTab,
  selectedProductId: controlledSelectedProductId,
}: {
  chrome?: "standalone" | "embedded";
  data: SupplyShopPreview;
  onBackToPunch?: () => void;
  onPurchase?: (itemId: string) => void;
  onSelectProduct?: (itemId: string) => void;
  onSelectSupplyTab?: (tabId: SupplyUiLabTopBarTabId) => void;
  selectedProductId?: string | null;
}) {
```

```tsx
    <main
      className={`supply-shop-scene${chrome === "embedded" ? " supply-shop-scene--embedded" : ""}`}
      aria-label="补给商店"
    >
      <div className="supply-shop-background" aria-hidden="true" />
      <div className="supply-shop-content">
        {chrome === "standalone" ? (
          <SupplyUiLabTopBar
            activeLabel="补给商店"
            onSelectTab={onSelectSupplyTab}
            profile={data.topBar.profile}
            resources={data.topBar.resources}
            returnAction={
              onBackToPunch
                ? {
                    label: "回到打卡",
                    onClick: onBackToPunch,
                  }
                : undefined
            }
          />
        ) : null}
```

In `SupplyTaskRecordScene`, change the props and root/topbar block to:

```tsx
export function SupplyTaskRecordScene({
  chrome = "standalone",
  data,
  onBackToPunch,
  onRespondSocialInvitation,
  onSelectSupplyTab,
}: {
  chrome?: "standalone" | "embedded";
  data: SupplyTaskRecordPreview;
  onBackToPunch?: () => void;
  onRespondSocialInvitation?: (inviteId: string) => void;
  onSelectSupplyTab?: (tabId: SupplyUiLabTopBarTabId) => void;
}) {
```

```tsx
    <main className={`supply-task-record-scene${chrome === "embedded" ? " supply-task-record-scene--embedded" : ""}`}>
      <div className="supply-task-record-background" aria-hidden="true" />
      <div className="supply-task-record-content">
        {chrome === "standalone" ? (
          <SupplyUiLabTopBar
            activeLabel="任务记录"
            onSelectTab={onSelectSupplyTab}
            profile={data.topBar.profile}
            resources={data.topBar.resources}
            returnAction={
              onBackToPunch
                ? {
                    label: "回到打卡",
                    onClick: onBackToPunch,
                  }
                : undefined
            }
          />
        ) : null}
```

In `SupplyBackpackScene`, change the props and root/topbar block to:

```tsx
export function SupplyBackpackScene({
  chrome = "standalone",
  data,
  onRequestRedemption,
  onSelectItem,
  onUseItem,
  selectedItemId: controlledSelectedItemId,
}: {
  chrome?: "standalone" | "embedded";
  data: SupplyBackpackPreview;
  onRequestRedemption?: (itemId: string) => void;
  onSelectItem?: (itemId: string) => void;
  onUseItem?: (itemId: string, target?: { recipientUserId?: string }) => void;
  selectedItemId?: string | null;
}) {
```

```tsx
    <main
      className={`supply-backpack-scene${chrome === "embedded" ? " supply-backpack-scene--embedded" : ""}`}
      aria-label="牛马补给站背包静态原型"
    >
      <div className="supply-backpack-background" aria-hidden="true" />
      <div className="supply-backpack-content">
        {chrome === "standalone" ? (
          <SupplyUiLabTopBar
            activeLabel={activeLabel}
            brandLabel={brandLabel}
            closeHref="/dashboard/status"
            resources={data.topBar.resources}
            variant="breadcrumb"
          />
        ) : null}
```

In `SupplyDrawPoolScene`, change the props and root/topbar block to:

```tsx
export function SupplyDrawPoolScene({
  chrome = "standalone",
  data,
  onDraw,
}: {
  chrome?: "standalone" | "embedded";
  data: SupplyDrawPoolPreview;
  onDraw?: (actionId: SupplyDrawPoolActionId) => void;
}) {
```

```tsx
    <main
      className={`supply-draw-pool-scene${chrome === "embedded" ? " supply-draw-pool-scene--embedded" : ""}`}
      aria-label="抽奖池"
    >
      <div className="supply-draw-pool-background" aria-hidden="true">
        <Image alt="" fill priority sizes="100vw" src={data.media.background} unoptimized />
      </div>
      <div className="supply-draw-pool-content">
        {chrome === "standalone" ? <DrawPoolTopBar data={data} ticketBalance={ticketBalance} /> : null}
```

- [ ] **Step 5: Pass embedded chrome from production shell**

Modify `SupplyStationShell`:

```tsx
            <SupplyDashboardScene
              chrome="embedded"
              data={toSupplyDashboardPreview(snapshot)}
              feedbackMessage={successMessage}
              onBackToPunch={onBackToPunch}
              onClaimRewards={handleClaimTicket}
              onCompleteQuest={(questId) => handleCompleteTask(questId as GamificationDimensionSnapshot["key"])}
              onNavigate={(target) => handlePanelNavigation(target)}
              onRerollQuest={(questId) => handleRerollTask(questId as GamificationDimensionSnapshot["key"])}
              onSelectSupplyTab={handleTopBarTabNavigation}
            />
```

```tsx
            <SupplyDrawPoolScene
              chrome="embedded"
              data={toSupplyDrawPoolPreview(snapshot, latestDraw)}
              onDraw={(actionId) =>
                handleDraw(
                  actionId === "ten" ? "TEN" : "SINGLE",
                  actionId === "ten" && snapshot.drawPool.lottery.tenDrawTopUpRequired > 0,
                )
              }
            />
```

```tsx
            <SupplyBackpackScene
              chrome="embedded"
              data={toSupplyBackpackPreview(snapshot, selectedBackpackItemId)}
              onRequestRedemption={handleRequestRedemption}
              onSelectItem={setSelectedBackpackItemId}
              onUseItem={handleUseItem}
              selectedItemId={selectedBackpackItemId}
            />
```

```tsx
            <SupplyShopScene
              chrome="embedded"
              data={toSupplyShopPreview(snapshot, selectedShopItemId)}
              onBackToPunch={onBackToPunch}
              onPurchase={handlePurchase}
              onSelectProduct={setSelectedShopItemId}
              onSelectSupplyTab={handleTopBarTabNavigation}
              selectedProductId={selectedShopItemId}
            />
```

```tsx
            <SupplyTaskRecordScene
              chrome="embedded"
              data={toSupplyTaskRecordPreview(snapshot)}
              onBackToPunch={onBackToPunch}
              onRespondSocialInvitation={handleRespondSocialInvitation}
              onSelectSupplyTab={handleTopBarTabNavigation}
            />
```

- [ ] **Step 6: Add embedded spacing CSS**

Append near supply scene responsive rules in `app/globals.css`:

```css
.supply-dashboard-scene--embedded .supply-dashboard-content,
.supply-shop-scene--embedded .supply-shop-content,
.supply-task-record-scene--embedded .supply-task-record-content,
.supply-backpack-scene--embedded .supply-backpack-content,
.supply-draw-pool-scene--embedded .supply-draw-pool-content {
  padding-top: clamp(0.75rem, 1.5vw, 1.25rem);
}

.supply-dashboard-scene--embedded .supply-dashboard-stage,
.supply-shop-scene--embedded .supply-shop-shell,
.supply-task-record-scene--embedded .supply-task-record-shell,
.supply-backpack-scene--embedded .supply-backpack-shell,
.supply-draw-pool-scene--embedded .supply-draw-pool-layout {
  min-height: 0;
}
```

- [ ] **Step 7: Run focused scene tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx __tests__/supply-shop-scene.test.tsx __tests__/supply-backpack-scene.test.tsx __tests__/supply-task-record-scene.test.tsx __tests__/supply-draw-pool-scene.test.tsx
```

Expected: PASS. Existing standalone scene tests must keep seeing their internal topbars unless they explicitly render `chrome="embedded"`.

- [ ] **Step 8: Commit embedded scenes**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx components/gamification/production/SupplyStationShell.tsx app/globals.css __tests__/supply-dashboard-scene.test.tsx
git commit -m "feat: embed supply scenes in shared app shell"
```

## Task 5: Verification And Visual QA

**Files:**

- No required source changes unless QA finds visual issues.
- Optional fixes: `components/navbar/Navbar.tsx`, `app/globals.css`, affected supply scene CSS.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx __tests__/home-supply-navigation.test.tsx __tests__/supply-dashboard-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related regression tests**

Run:

```bash
npm test -- __tests__/supply-ui-lab-production-adapters.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-backpack-scene.test.tsx __tests__/supply-task-record-scene.test.tsx __tests__/supply-draw-pool-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run type check**

Run:

```bash
npm run lint
```

Expected: `tsc --noEmit` exits 0.

- [ ] **Step 4: Browser QA desktop**

Open:

```text
http://127.0.0.1:3001/dashboard/status
```

Use a 1440x900 viewport. Verify:

- 主站 `Navbar` 可见。
- 一级 tab 中 `牛马补给站` active。
- 二级 tab 常驻显示 5 项：我的状态、补给商店、任务记录、背包、抽奖池。
- 右侧资产 slot 展示银子、抽奖券、背包、头像。
- 页面内容不再出现补给站内部 topbar。
- 点击二级 tab `补给商店` 跳转到 `/dashboard/store`。
- 点击二级 tab `背包` 跳转到 `/dashboard/backpack`。
- console 没有应用相关 error/warn。

- [ ] **Step 5: Browser QA mobile**

Use a 390x844 viewport on:

```text
http://127.0.0.1:3001/dashboard/status
```

Verify:

- 页面无 document 级横向溢出。
- 一级导航和二级导航可横向滚动，但不会遮挡正文。
- 资产 chip 在窄屏隐藏 label，只保留图标/数字或紧凑形式。
- 头像可见。
- 二级 tab 点击可跳转。

- [ ] **Step 6: Commit QA fixes**

If QA requires CSS fixes:

```bash
git add components/navbar/Navbar.tsx app/globals.css components/gamification/ui-lab
git commit -m "fix: polish supply shared navigation responsive layout"
```

Expected: only commit if there are actual QA fixes.

## Self-Review

**Spec coverage:**  
本计划覆盖第一期范围：共享主站 Navbar、顶部常驻二级 tab、资产 slot、生产补给站隐藏内部 topbar、路由跳转、桌面/移动 QA。第二期内容（三列重排、所有分区 chrome 统一、全局 token 收敛）被明确列为 Non-Goals。

**Placeholder scan:**  
没有使用 `TBD`、`TODO`、`implement later` 或“写适当测试”这类占位描述。每个测试任务包含具体测试代码或具体断言，每个实现任务给出目标文件和代码形状。

**Type consistency:**  
二级 tab panel key 全程使用 `SupplyPanelKey`：`dashboard | shop | taskRecord | backpack | drawPool`。资产上下文全程使用 `SupplyNavContext`。场景 chrome prop 全程使用 `"standalone" | "embedded"`，默认 `standalone`，生产 shell 显式传 `embedded`。
