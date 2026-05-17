# Supply Dashboard Task Record Static Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `/ui-lab/supply-dashboard/task-record` static scene that visually prototypes the 牛马补给站任务记录 page without touching the stable production `SupplyStation` flow.

**Architecture:** Create a route-local UI lab page backed by centralized mock data and semantic static components. Reuse the existing Dashboard UI-lab top tabs, Dashboard scene assets, reward icons, and avatars; add task-record-only CSS under `supply-task-record-*` class names in `app/globals.css`. Add lightweight Vitest contracts for route isolation, mock data shape, reused assets, scene structure, CSS layering, and responsive safeguards.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, existing static media under `public/assets/home-scenes/supply/dashboard/`, `public/gamification/rewards/icons/`, and `public/avatars/`.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-task-record-static-scene-design.md`
- UI lab plan: `docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard static scene spec: `docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- Shop static scene spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- Team goal static scene spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- Image workflow: `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Target prototype: `design/ui-assets/任务记录.png`

## Scope Guardrails

- Do not modify `components/gamification/SupplyStation.tsx`.
- Do not modify `app/(board)/page.tsx`, `app/(board)/layout.tsx`, `components/navbar/Navbar.tsx`, `lib/store.tsx`, or `lib/types.ts`.
- Do not add to the production nav and do not change `AppTab`.
- Do not call `/api/gamification/*` or any other API from the UI lab route.
- Do not read cookies, sessions, Prisma, or real auth state.
- Do not paste `design/ui-assets/任务记录.png` into the page as a background image.
- Do not add external UI dependencies.
- Only modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx` to wire the task-record UI lab href.

## File Structure

- Create: `app/ui-lab/supply-dashboard/task-record/page.tsx`
  - Route entry for the isolated static prototype.
- Create: `components/gamification/ui-lab/supply-task-record/types.ts`
  - Static task-record page data types.
- Create: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
  - Centralized static mock data and reused asset path references.
- Create: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
  - Scene shell and semantic subcomponents.
- Create: `__tests__/supply-task-record-ui-lab-route.test.ts`
  - Route isolation and top-tab href contract.
- Create: `__tests__/supply-task-record-mock-data.test.ts`
  - Mock data coverage for timeline, radar, redemption, filters, and side menu.
- Create: `__tests__/supply-task-record-assets.test.ts`
  - Reused media asset existence and size budget contract.
- Create: `__tests__/supply-task-record-scene.test.tsx`
  - Static scene DOM structure and image path contract.
- Create: `__tests__/supply-task-record-scene-css.test.ts`
  - CSS layer, responsive, and reduced-motion contract.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
  - Change the task-record tab href from `#` to `/ui-lab/supply-dashboard/task-record`.
- Modify: `app/globals.css`
  - Add `supply-task-record-*` scene styles only.

## Task 1: Lock Route Isolation And Top Tab Contract

**Files:**
- Create: `__tests__/supply-task-record-ui-lab-route.test.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
- Create: `app/ui-lab/supply-dashboard/task-record/page.tsx`

- [ ] **Step 1: Write the failing route isolation test**

Create `__tests__/supply-task-record-ui-lab-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply task record ui lab route isolation", () => {
  it("uses a standalone task-record route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/task-record/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const topTabs = readFileSync("components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyTaskRecordScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyTaskRecordScene");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
    expect(topTabs).toContain('label: "任务记录"');
    expect(topTabs).toContain('href: "/ui-lab/supply-dashboard/task-record"');
  });
});
```

- [ ] **Step 2: Run the isolation test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-task-record-ui-lab-route.test.ts
```

Expected: FAIL because `app/ui-lab/supply-dashboard/task-record/page.tsx` does not exist and the top tab still points at `#`.

- [ ] **Step 3: Wire the task-record tab href**

Modify the task-record entry in `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`:

```ts
const supplyDashboardTabs: SupplyDashboardTab[] = [
  { label: "我的状态", icon: "⌂", href: "/ui-lab/supply-dashboard" },
  { label: "团队目标", icon: "◎", href: "/ui-lab/supply-dashboard/team-goal" },
  { label: "排行榜", icon: "▥", href: "#" },
  { label: "补给商店", icon: "▤", href: "/ui-lab/supply-dashboard/shop" },
  { label: "任务记录", icon: "▣", href: "/ui-lab/supply-dashboard/task-record" },
];
```

- [ ] **Step 4: Add the route placeholder**

Create `app/ui-lab/supply-dashboard/task-record/page.tsx`:

```tsx
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

export default function SupplyDashboardTaskRecordPage() {
  return <SupplyTaskRecordScene data={supplyTaskRecordMock} />;
}
```

- [ ] **Step 5: Run the isolation test again**

Run:

```bash
npm test -- __tests__/supply-task-record-ui-lab-route.test.ts
```

Expected: FAIL until the imported scene and mock data files are added in the next task.

## Task 2: Add Static Types And Mock Data

**Files:**
- Create: `components/gamification/ui-lab/supply-task-record/types.ts`
- Create: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- Create: `__tests__/supply-task-record-mock-data.test.ts`

- [ ] **Step 1: Add task-record data types**

Create `components/gamification/ui-lab/supply-task-record/types.ts`:

```ts
export type SupplyTaskRecordResource = {
  id: "coins" | "ticket";
  label: string;
  value: string;
  icon: string;
};

export type SupplyTaskRecordMenuItem = {
  id: "today" | "draws" | "redemptions" | "radar" | "rules";
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyTaskRecordFilter = {
  id: "all" | "mainline" | "social" | "reward" | "system";
  label: string;
  active: boolean;
};

export type SupplyTaskRecordTimelineCategory = "mainline" | "social" | "reward" | "draw" | "system";
export type SupplyTaskRecordTimelineStatus = "completed" | "claimed";

export type SupplyTaskRecordTimelineItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  category: SupplyTaskRecordTimelineCategory;
  categoryLabel: string;
  categoryTone: "green" | "orange";
  icon: {
    type: "text" | "image";
    value: string;
    alt: string;
  };
  reward: {
    icon: string;
    label: string;
    amount: string;
  };
  status: SupplyTaskRecordTimelineStatus;
  statusLabel: string;
};

export type SupplyTaskRecordRadarTab = {
  id: "pending" | "responded" | "expired";
  label: string;
  active: boolean;
};

export type SupplyTaskRecordInvite = {
  id: string;
  avatar: string;
  name: string;
  message: string;
  timeLabel: string;
  statusLabel: string;
};

export type SupplyTaskRecordRedemption = {
  id: string;
  icon: string;
  title: string;
  requestedAt: string;
  secondaryLabel: string;
  status: "processing" | "completed" | "expired";
  statusLabel: string;
};

export type SupplyTaskRecordPreview = {
  topBar: {
    resources: SupplyTaskRecordResource[];
    profile: {
      username: string;
      avatar: string;
    };
  };
  sidebar: {
    menuItems: SupplyTaskRecordMenuItem[];
    backHref: string;
    mascot: {
      background: string;
      hero: string;
    };
  };
  filters: SupplyTaskRecordFilter[];
  day: {
    label: string;
    dateLabel: string;
    weekday: string;
  };
  timelineRecords: SupplyTaskRecordTimelineItem[];
  radar: {
    tabs: SupplyTaskRecordRadarTab[];
    invites: SupplyTaskRecordInvite[];
  };
  redemptions: {
    items: SupplyTaskRecordRedemption[];
  };
};
```

- [ ] **Step 2: Add centralized mock data and asset references**

Create `components/gamification/ui-lab/supply-task-record/mock-data.ts`:

```ts
import type { SupplyTaskRecordPreview } from "./types";

export const supplyTaskRecordAssetPaths = {
  profileAvatar: "/avatars/male1.png",
  avatars: {
    sailor: "/avatars/male2.png",
    deer: "/avatars/female1.png",
    runner: "/avatars/male3.png",
  },
  sidebar: {
    background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
    hero: "/assets/home-scenes/supply/dashboard/niuma-hero-clean.webp",
  },
  rewardIcons: {
    coins: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
  },
} as const;

export const supplyTaskRecordMock: SupplyTaskRecordPreview = {
  topBar: {
    resources: [
      { id: "coins", label: "银子", value: "2,450", icon: "◎" },
      { id: "ticket", label: "补给券", value: "18", icon: "券" },
    ],
    profile: {
      username: "Vincent",
      avatar: supplyTaskRecordAssetPaths.profileAvatar,
    },
  },
  sidebar: {
    menuItems: [
      { id: "today", label: "今日记录", icon: "▤", active: true },
      { id: "draws", label: "抽卡记录", icon: "▥", active: false },
      { id: "redemptions", label: "兑换记录", icon: "券", active: false },
      { id: "radar", label: "队友雷达", icon: "●●", active: false },
      { id: "rules", label: "规则说明", icon: "冊", active: false },
    ],
    backHref: "/ui-lab/supply-dashboard",
    mascot: {
      background: supplyTaskRecordAssetPaths.sidebar.background,
      hero: supplyTaskRecordAssetPaths.sidebar.hero,
    },
  },
  filters: [
    { id: "all", label: "全部", active: true },
    { id: "mainline", label: "主线任务", active: false },
    { id: "social", label: "社交互动", active: false },
    { id: "reward", label: "奖励领取", active: false },
    { id: "system", label: "系统通知", active: false },
  ],
  day: {
    label: "今天",
    dateLabel: "05月24日",
    weekday: "星期六",
  },
  timelineRecords: [
    {
      id: "movement-task",
      time: "08:21",
      title: "运动任务",
      subtitle: "累计步数 ≥ 8000 步",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "👟", alt: "运动任务" },
      reward: { icon: "券", label: "生命票", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "hydration-task",
      time: "09:03",
      title: "喝水任务",
      subtitle: "累计饮水 ≥ 2000 ml",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "💧", alt: "喝水任务" },
      reward: { icon: "券", label: "生命票", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "social-task",
      time: "10:15",
      title: "社交任务",
      subtitle: "与队友互动 ≥ 1 次",
      category: "social",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "💬", alt: "社交任务" },
      reward: { icon: "券", label: "生命票", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "learning-task",
      time: "11:40",
      title: "学习任务",
      subtitle: "学习时长 ≥ 30 分钟",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "📖", alt: "学习任务" },
      reward: { icon: "券", label: "生命票", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "mainline-bonus",
      time: "12:02",
      title: "完成全部主线任务",
      subtitle: "",
      category: "reward",
      categoryLabel: "奖励领取",
      categoryTone: "orange",
      icon: { type: "image", value: supplyTaskRecordAssetPaths.rewardIcons.ticket, alt: "补给券" },
      reward: { icon: "券", label: "补给券", amount: "x1" },
      status: "claimed",
      statusLabel: "已领取",
    },
    {
      id: "draw-reward",
      time: "12:05",
      title: "在补给抽卡机中抽取",
      subtitle: "",
      category: "draw",
      categoryLabel: "抽卡奖励",
      categoryTone: "orange",
      icon: { type: "text", value: "🎰", alt: "抽卡奖励" },
      reward: { icon: "🧃", label: "运动饮料（R）", amount: "x1" },
      status: "claimed",
      statusLabel: "已领取",
    },
    {
      id: "streak-reward",
      time: "12:06",
      title: "连续打卡 18 天奖励",
      subtitle: "",
      category: "system",
      categoryLabel: "系统奖励",
      categoryTone: "orange",
      icon: { type: "image", value: supplyTaskRecordAssetPaths.rewardIcons.coins, alt: "牛马币" },
      reward: { icon: "◎", label: "牛马币", amount: "x100" },
      status: "claimed",
      statusLabel: "已领取",
    },
  ],
  radar: {
    tabs: [
      { id: "pending", label: "待响应 (3)", active: true },
      { id: "responded", label: "已回应", active: false },
      { id: "expired", label: "已过期", active: false },
    ],
    invites: [
      {
        id: "invite-sailor",
        avatar: supplyTaskRecordAssetPaths.avatars.sailor,
        name: "大力水手",
        message: "邀请你互动",
        timeLabel: "今天 10:20",
        statusLabel: "待响应",
      },
      {
        id: "invite-deer",
        avatar: supplyTaskRecordAssetPaths.avatars.deer,
        name: "小鹿同学",
        message: "邀请你互动",
        timeLabel: "今天 09:15",
        statusLabel: "待响应",
      },
      {
        id: "invite-runner",
        avatar: supplyTaskRecordAssetPaths.avatars.runner,
        name: "跑步阿斌",
        message: "邀请你互动",
        timeLabel: "昨天 21:47",
        statusLabel: "待响应",
      },
    ],
  },
  redemptions: {
    items: [
      {
        id: "coffee-processing",
        icon: supplyTaskRecordAssetPaths.rewardIcons.coffee,
        title: "咖啡兑换券（中杯）",
        requestedAt: "申请时间：05-24 12:10",
        secondaryLabel: "预计完成：05-24 20:00",
        status: "processing",
        statusLabel: "兑换中",
      },
      {
        id: "coffee-completed",
        icon: supplyTaskRecordAssetPaths.rewardIcons.coffee,
        title: "咖啡兑换券（中杯）",
        requestedAt: "申请时间：05-22 08:30",
        secondaryLabel: "完成时间：05-22 14:05",
        status: "completed",
        statusLabel: "已完成",
      },
      {
        id: "coffee-expired",
        icon: supplyTaskRecordAssetPaths.rewardIcons.coffee,
        title: "咖啡兑换券（中杯）",
        requestedAt: "申请时间：05-19 19:40",
        secondaryLabel: "失效时间：05-21 19:40",
        status: "expired",
        statusLabel: "已失效",
      },
    ],
  },
};
```

- [ ] **Step 3: Write the mock data contract test**

Create `__tests__/supply-task-record-mock-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  supplyTaskRecordAssetPaths,
  supplyTaskRecordMock,
} from "@/components/gamification/ui-lab/supply-task-record/mock-data";

describe("supply task record mock data", () => {
  it("models the prototype top bar, sidebar, filters, and day header", () => {
    expect(supplyTaskRecordMock.topBar.resources.map((resource) => resource.value)).toEqual(["2,450", "18"]);
    expect(supplyTaskRecordMock.sidebar.menuItems).toHaveLength(5);
    expect(supplyTaskRecordMock.sidebar.menuItems.find((item) => item.active)?.label).toBe("今日记录");
    expect(supplyTaskRecordMock.sidebar.backHref).toBe("/ui-lab/supply-dashboard");
    expect(supplyTaskRecordMock.filters.map((filter) => filter.label)).toEqual([
      "全部",
      "主线任务",
      "社交互动",
      "奖励领取",
      "系统通知",
    ]);
    expect(supplyTaskRecordMock.filters.find((filter) => filter.active)?.label).toBe("全部");
    expect(supplyTaskRecordMock.day).toEqual({ label: "今天", dateLabel: "05月24日", weekday: "星期六" });
  });

  it("covers the prototype timeline record statuses and rewards", () => {
    expect(supplyTaskRecordMock.timelineRecords.map((record) => record.time)).toEqual([
      "08:21",
      "09:03",
      "10:15",
      "11:40",
      "12:02",
      "12:05",
      "12:06",
    ]);
    expect(supplyTaskRecordMock.timelineRecords.filter((record) => record.status === "completed")).toHaveLength(4);
    expect(supplyTaskRecordMock.timelineRecords.filter((record) => record.status === "claimed")).toHaveLength(3);
    expect(supplyTaskRecordMock.timelineRecords.map((record) => record.reward.label)).toEqual(
      expect.arrayContaining(["生命票", "补给券", "运动饮料（R）", "牛马币"]),
    );
  });

  it("models teammate radar and redemption side panels", () => {
    expect(supplyTaskRecordMock.radar.tabs.map((tab) => tab.label)).toEqual(["待响应 (3)", "已回应", "已过期"]);
    expect(supplyTaskRecordMock.radar.tabs.find((tab) => tab.active)?.id).toBe("pending");
    expect(supplyTaskRecordMock.radar.invites).toHaveLength(3);
    expect(supplyTaskRecordMock.radar.invites.every((invite) => invite.statusLabel === "待响应")).toBe(true);
    expect(supplyTaskRecordMock.redemptions.items.map((item) => item.statusLabel)).toEqual([
      "兑换中",
      "已完成",
      "已失效",
    ]);
  });

  it("references reused dashboard, reward, and avatar assets", () => {
    expect(supplyTaskRecordAssetPaths.sidebar.background).toBe(
      "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
    );
    expect(supplyTaskRecordAssetPaths.sidebar.hero).toBe("/assets/home-scenes/supply/dashboard/niuma-hero-clean.webp");
    expect(supplyTaskRecordAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
    expect(Object.values(supplyTaskRecordAssetPaths.avatars).every((path) => path.startsWith("/avatars/"))).toBe(true);
  });
});
```

- [ ] **Step 4: Run the mock data test**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts
```

Expected: PASS.

## Task 3: Verify Reused Asset Availability

**Files:**
- Create: `__tests__/supply-task-record-assets.test.ts`

- [ ] **Step 1: Write the asset contract test**

Create `__tests__/supply-task-record-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyTaskRecordAssetPaths } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

const publicPath = (assetPath: string) => `public${assetPath}`;

describe("supply task record reused assets", () => {
  it("keeps all referenced reused assets available", () => {
    const requiredAssets = [
      supplyTaskRecordAssetPaths.profileAvatar,
      supplyTaskRecordAssetPaths.sidebar.background,
      supplyTaskRecordAssetPaths.sidebar.hero,
      supplyTaskRecordAssetPaths.rewardIcons.coins,
      supplyTaskRecordAssetPaths.rewardIcons.ticket,
      supplyTaskRecordAssetPaths.rewardIcons.coffee,
      ...Object.values(supplyTaskRecordAssetPaths.avatars),
    ];

    for (const asset of requiredAssets) {
      expect(existsSync(publicPath(asset)), asset).toBe(true);
    }
  });

  it("does not depend on the prototype image as a page background", () => {
    const serializedPaths = JSON.stringify(supplyTaskRecordAssetPaths);

    expect(serializedPaths).not.toContain("design/ui-assets/任务记录.png");
    expect(serializedPaths).not.toContain("任务记录.png");
  });

  it("keeps reused sidebar images within static scene budgets", () => {
    expect(statSync(publicPath(supplyTaskRecordAssetPaths.sidebar.background)).size).toBeLessThanOrEqual(450 * 1024);
    expect(statSync(publicPath(supplyTaskRecordAssetPaths.sidebar.hero)).size).toBeLessThanOrEqual(260 * 1024);
  });
});
```

- [ ] **Step 2: Run the asset test**

Run:

```bash
npm test -- __tests__/supply-task-record-assets.test.ts
```

Expected: PASS because the task-record page reuses already committed Dashboard, reward, and avatar assets.

## Task 4: Build The Static Scene Component

**Files:**
- Create: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Create: `__tests__/supply-task-record-scene.test.tsx`

- [ ] **Step 1: Write the scene DOM test**

Create `__tests__/supply-task-record-scene.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyTaskRecordScene", () => {
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

  it("renders the core task-record surfaces from the prototype", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    expect(container.querySelector(".supply-task-record-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-top-tabs a[aria-selected='true']")?.textContent).toContain(
      "任务记录",
    );
    expect(container.querySelector("a.supply-task-record-back-link")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelector(".supply-task-record-sidebar")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-timeline-panel")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-radar")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-redemptions")).not.toBeNull();
    expect(container.querySelectorAll(".supply-task-record-sidebar nav button")).toHaveLength(5);
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "今日记录",
    );
    expect(container.querySelector(".supply-task-record-filters [role='tab'][aria-selected='true']")?.textContent).toBe(
      "全部",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(7);
    expect(container.querySelectorAll("[data-status='completed']")).toHaveLength(4);
    expect(container.querySelectorAll("[data-status='claimed']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-testid='task-record-radar-invite']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-testid='task-record-redemption']")).toHaveLength(3);
    expect(container.textContent).toContain("05月24日");
    expect(container.textContent).toContain("运动任务");
    expect(container.textContent).toContain("队友雷达");
    expect(container.textContent).toContain("兑换状态");
  });

  it("uses reused scene, reward, and avatar images", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
        "/assets/home-scenes/supply/dashboard/niuma-hero-clean.webp",
        "/gamification/rewards/icons/task_reroll_coupon.png",
        "/gamification/rewards/icons/coins_020.png",
        "/gamification/rewards/icons/luckin_coffee_coupon.png",
        "/avatars/male2.png",
        "/avatars/female1.png",
        "/avatars/male3.png",
      ]),
    );
  });
});
```

- [ ] **Step 2: Add the scene component**

Create `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { SupplyDashboardTopTabs } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs";
import type {
  SupplyTaskRecordInvite,
  SupplyTaskRecordPreview,
  SupplyTaskRecordRedemption,
  SupplyTaskRecordTimelineItem,
} from "./types";

export function SupplyTaskRecordScene({ data }: { data: SupplyTaskRecordPreview }) {
  return (
    <main className="supply-task-record-scene">
      <div className="supply-task-record-background" aria-hidden="true" />
      <div className="supply-task-record-content">
        <header className="supply-task-record-topbar">
          <div className="supply-task-record-brand">
            <span aria-hidden="true">🐮</span>
            <strong>牛马补给站</strong>
          </div>
          <SupplyDashboardTopTabs activeLabel="任务记录" />
          <div className="supply-task-record-resources" aria-label="当前资源">
            {data.topBar.resources.map((resource) => (
              <span key={resource.id}>
                <b aria-hidden="true">{resource.icon}</b>
                {resource.value}
              </span>
            ))}
            <Image src={data.topBar.profile.avatar} alt={data.topBar.profile.username} width={44} height={44} />
            <span aria-hidden="true">⌄</span>
          </div>
        </header>
        <section className="supply-task-record-shell" aria-label="任务记录静态页">
          <TaskRecordSidebar data={data} />
          <TaskTimelinePanel data={data} />
          <aside className="supply-task-record-aside" aria-label="任务记录侧栏">
            <TeammateRadarPanel invites={data.radar.invites} tabs={data.radar.tabs} />
            <RedemptionStatusPanel items={data.redemptions.items} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function TaskRecordSidebar({ data }: { data: SupplyTaskRecordPreview }) {
  return (
    <aside className="supply-task-record-sidebar" aria-label="任务记录分类">
      <nav>
        {data.sidebar.menuItems.map((item) => (
          <button aria-pressed={item.active} key={item.id} type="button">
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <Link className="supply-task-record-back-link" href={data.sidebar.backHref}>
        <span aria-hidden="true">←</span>
        返回大厅
      </Link>
      <div className="supply-task-record-mascot" aria-label="补给站健身角色">
        <Image src={data.sidebar.mascot.background} alt="" fill sizes="260px" />
        <Image src={data.sidebar.mascot.hero} alt="健身牛马角色" width={220} height={360} />
      </div>
    </aside>
  );
}

function TaskTimelinePanel({ data }: { data: SupplyTaskRecordPreview }) {
  return (
    <section className="supply-task-record-timeline-panel" aria-labelledby="task-record-title">
      <h1 id="task-record-title">任务记录</h1>
      <div className="supply-task-record-filters" role="tablist" aria-label="记录筛选">
        {data.filters.map((filter) => (
          <button aria-selected={filter.active} key={filter.id} role="tab" type="button">
            {filter.label}
          </button>
        ))}
      </div>
      <div className="supply-task-record-day">
        <strong>{data.day.label}</strong>
        <span>{data.day.dateLabel}</span>
        <span>{data.day.weekday}</span>
      </div>
      <div className="supply-task-record-timeline" aria-label="今天的任务记录">
        {data.timelineRecords.map((record) => (
          <TimelineItem key={record.id} record={record} />
        ))}
      </div>
      <button className="supply-task-record-load-more" type="button">
        加载更多记录 <span aria-hidden="true">⌄</span>
      </button>
    </section>
  );
}

function TimelineItem({ record }: { record: SupplyTaskRecordTimelineItem }) {
  return (
    <article className="supply-task-record-timeline-item" data-status={record.status} data-testid="task-record-timeline-item">
      <time>{record.time}</time>
      <span className="supply-task-record-dot" aria-hidden="true" />
      <div className="supply-task-record-entry">
        <div className="supply-task-record-entry-icon" aria-hidden="true">
          {record.icon.type === "image" ? <Image src={record.icon.value} alt="" width={44} height={44} /> : record.icon.value}
        </div>
        <div>
          <span data-tone={record.categoryTone}>{record.categoryLabel}</span>
          <h2>{record.title}</h2>
          {record.subtitle ? <p>{record.subtitle}</p> : null}
        </div>
        <div className="supply-task-record-reward">
          <b aria-hidden="true">{record.reward.icon}</b>
          {record.reward.label} {record.reward.amount}
        </div>
        <strong>{record.statusLabel}</strong>
      </div>
    </article>
  );
}

function TeammateRadarPanel({
  tabs,
  invites,
}: {
  tabs: SupplyTaskRecordPreview["radar"]["tabs"];
  invites: SupplyTaskRecordInvite[];
}) {
  return (
    <section className="supply-task-record-radar" aria-labelledby="task-record-radar-title">
      <header>
        <h2 id="task-record-radar-title">队友雷达</h2>
        <button type="button">全部已读</button>
      </header>
      <div className="supply-task-record-radar-tabs" role="tablist" aria-label="队友雷达状态">
        {tabs.map((tab) => (
          <button aria-selected={tab.active} key={tab.id} role="tab" type="button">
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {invites.map((invite) => (
          <article data-testid="task-record-radar-invite" key={invite.id}>
            <Image src={invite.avatar} alt={invite.name} width={54} height={54} />
            <div>
              <h3>
                {invite.name} <span>{invite.message}</span>
              </h3>
              <p>{invite.timeLabel}</p>
            </div>
            <strong>{invite.statusLabel}</strong>
            <button type="button">回应</button>
            <button type="button">忽略</button>
          </article>
        ))}
      </div>
      <button className="supply-task-record-view-all" type="button">
        查看全部 <span aria-hidden="true">›</span>
      </button>
    </section>
  );
}

function RedemptionStatusPanel({ items }: { items: SupplyTaskRecordRedemption[] }) {
  return (
    <section className="supply-task-record-redemptions" aria-labelledby="task-record-redemptions-title">
      <h2 id="task-record-redemptions-title">兑换状态</h2>
      <div>
        {items.map((item) => (
          <article data-status={item.status} data-testid="task-record-redemption" key={item.id}>
            <Image src={item.icon} alt="" width={54} height={54} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.requestedAt}</p>
              <p>{item.secondaryLabel}</p>
            </div>
            <strong>{item.statusLabel}</strong>
          </article>
        ))}
      </div>
      <button className="supply-task-record-view-all" type="button">
        查看全部 <span aria-hidden="true">›</span>
      </button>
    </section>
  );
}
```

- [ ] **Step 3: Run the scene test**

Run:

```bash
npm test -- __tests__/supply-task-record-scene.test.tsx
```

Expected: PASS once the scene component, mock data, and route imports compile.

## Task 5: Add Task-Record Scene CSS

**Files:**
- Create: `__tests__/supply-task-record-scene-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the CSS contract test**

Create `__tests__/supply-task-record-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply task record scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines isolated task-record scene, sidebar, timeline, radar, and redemption layers", () => {
    expect(css).toContain(".supply-task-record-scene");
    expect(css).toContain(".supply-task-record-content");
    expect(css).toContain(".supply-task-record-shell");
    expect(css).toContain(".supply-task-record-sidebar");
    expect(css).toContain(".supply-task-record-timeline-panel");
    expect(css).toContain(".supply-task-record-timeline-item");
    expect(css).toContain(".supply-task-record-radar");
    expect(css).toContain(".supply-task-record-redemptions");
    expect(css).toContain("border: 4px solid");
  });

  it("includes responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1200px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
```

- [ ] **Step 2: Add isolated CSS to `app/globals.css`**

Append a task-record section near the existing `supply-shop-*` and `supply-team-goal-*` UI-lab styles:

```css
.supply-task-record-scene {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow: hidden;
  background: #111827;
  color: #111827;
}

.supply-task-record-background {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 18% 16%, rgba(253, 224, 71, 0.3), transparent 28rem),
    linear-gradient(135deg, #1f2937 0%, #111827 54%, #0b1020 100%);
}

.supply-task-record-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.supply-task-record-topbar {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(560px, 1.6fr) minmax(260px, 0.8fr);
  align-items: center;
  gap: 1rem;
  min-height: 80px;
  padding: 0.75rem 1.5rem;
  border-bottom: 4px solid #000;
  background: #facc15;
  box-shadow: 0 6px 0 #000;
}

.supply-task-record-brand,
.supply-task-record-resources,
.supply-task-record-resources span {
  display: flex;
  align-items: center;
}

.supply-task-record-brand {
  gap: 0.75rem;
  font-size: clamp(1.7rem, 2vw, 2.4rem);
  font-weight: 900;
}

.supply-task-record-resources {
  justify-content: flex-end;
  gap: 0.75rem;
}

.supply-task-record-resources span {
  min-height: 42px;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  border: 2px solid #111827;
  border-radius: 0.45rem;
  background: rgba(255, 255, 255, 0.28);
  font-weight: 900;
}

.supply-task-record-resources img {
  border: 3px solid #111827;
  border-radius: 0.45rem;
  background: #f8fafc;
}

.supply-task-record-shell {
  display: grid;
  grid-template-columns: minmax(220px, 18%) minmax(520px, 1fr) minmax(360px, 31%);
  gap: 1rem;
  flex: 1;
  min-height: 0;
  padding: 1rem;
}
```

Append the rest of the task-record CSS in the same section:

```css
.supply-task-record-sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  padding: 1rem;
  border: 4px solid #000;
  border-radius: 0.75rem;
  background: linear-gradient(180deg, #20242b 0%, #111827 100%);
  box-shadow: 6px 6px 0 #000;
}

.supply-task-record-sidebar nav {
  display: grid;
  gap: 0.75rem;
}

.supply-task-record-sidebar nav button,
.supply-task-record-back-link,
.supply-task-record-load-more,
.supply-task-record-view-all,
.supply-task-record-radar header button,
.supply-task-record-radar article button {
  min-height: 42px;
  border: 3px solid #111827;
  border-radius: 0.45rem;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 3px 3px 0 #000;
}

.supply-task-record-sidebar nav button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: flex-start;
  padding: 0.75rem 0.9rem;
  background: #1f2937;
  color: #f8fafc;
}

.supply-task-record-sidebar nav button[aria-pressed='true'],
.supply-task-record-back-link,
.supply-task-record-radar-tabs button[aria-selected='true'],
.supply-task-record-filters button[aria-selected='true'],
.supply-task-record-radar article button:first-of-type,
.supply-task-record-load-more {
  background: #facc15;
  color: #111827;
}

.supply-task-record-back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: auto;
  padding: 0.8rem 1rem;
}

.supply-task-record-mascot {
  position: relative;
  min-height: 250px;
  overflow: hidden;
  border: 4px solid #000;
  border-radius: 0.6rem;
  background: #111827;
}

.supply-task-record-mascot img:first-child {
  object-fit: cover;
  opacity: 0.72;
}

.supply-task-record-mascot img:last-child {
  position: absolute;
  left: 50%;
  bottom: -2.25rem;
  z-index: 1;
  width: min(82%, 220px);
  height: auto;
  transform: translateX(-50%);
  filter: drop-shadow(0 8px 0 rgba(0, 0, 0, 0.45));
}

.supply-task-record-timeline-panel,
.supply-task-record-radar,
.supply-task-record-redemptions {
  min-width: 0;
  border: 3px solid rgba(17, 24, 39, 0.55);
  border-radius: 0.65rem;
  background: #fffaf0;
  box-shadow: 4px 4px 0 rgba(17, 24, 39, 0.22);
}

.supply-task-record-timeline-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 1.1rem 1.25rem;
}

.supply-task-record-timeline-panel h1,
.supply-task-record-radar h2,
.supply-task-record-redemptions h2 {
  margin: 0;
  font-weight: 900;
  letter-spacing: 0;
}

.supply-task-record-timeline-panel h1 {
  font-size: 1.9rem;
}

.supply-task-record-filters,
.supply-task-record-radar-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.9rem;
}

.supply-task-record-filters button,
.supply-task-record-radar-tabs button {
  min-height: 36px;
  padding: 0.45rem 1.1rem;
  border: 2px solid #111827;
  border-radius: 0.35rem;
  background: #fffdf6;
  font-weight: 900;
}

.supply-task-record-day {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem 0.4rem;
  border-top: 2px solid rgba(17, 24, 39, 0.2);
}

.supply-task-record-timeline {
  position: relative;
  display: grid;
  gap: 0.75rem;
  overflow: auto;
  padding: 0 0.35rem 0.25rem 0;
}

.supply-task-record-timeline::before {
  content: "";
  position: absolute;
  top: 0.8rem;
  bottom: 0.8rem;
  left: 1.55rem;
  width: 3px;
  background: #374151;
}

.supply-task-record-timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 4.3rem 1.8rem minmax(0, 1fr);
  align-items: center;
  gap: 0.6rem;
}

.supply-task-record-timeline-item time {
  justify-self: end;
  color: #4b5563;
  font-weight: 800;
}

.supply-task-record-dot {
  z-index: 1;
  width: 22px;
  height: 22px;
  border: 3px solid #111827;
  border-radius: 9999px;
  background: #fffaf0;
}

.supply-task-record-timeline-item[data-status='completed'] .supply-task-record-dot {
  border-color: #15803d;
  background: #22c55e;
}

.supply-task-record-entry {
  display: grid;
  grid-template-columns: 62px minmax(130px, 1fr) minmax(120px, 0.55fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 86px;
  padding: 0.75rem;
  border: 2px solid #374151;
  border-radius: 0.45rem;
  background: #fffdf6;
}

.supply-task-record-entry-icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 2px solid rgba(17, 24, 39, 0.25);
  border-radius: 0.5rem;
  background: #eef2ff;
  font-size: 1.9rem;
}

.supply-task-record-entry-icon img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.supply-task-record-entry span[data-tone] {
  display: inline-flex;
  width: fit-content;
  margin-bottom: 0.2rem;
  padding: 0.1rem 0.45rem;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.supply-task-record-entry span[data-tone='green'] {
  background: #dcfce7;
  color: #15803d;
}

.supply-task-record-entry span[data-tone='orange'] {
  background: #ffedd5;
  color: #c2410c;
}

.supply-task-record-entry h2,
.supply-task-record-entry p,
.supply-task-record-radar article h3,
.supply-task-record-radar article p,
.supply-task-record-redemptions article h3,
.supply-task-record-redemptions article p {
  margin: 0;
}

.supply-task-record-entry h2,
.supply-task-record-radar article h3,
.supply-task-record-redemptions article h3 {
  font-size: 1rem;
  font-weight: 900;
}

.supply-task-record-entry p,
.supply-task-record-radar article p,
.supply-task-record-redemptions article p {
  color: #4b5563;
  font-size: 0.82rem;
  font-weight: 700;
}

.supply-task-record-reward {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 900;
}

.supply-task-record-entry > strong {
  justify-self: end;
  white-space: nowrap;
  font-weight: 900;
}

.supply-task-record-timeline-item[data-status='completed'] .supply-task-record-entry > strong {
  padding: 0.35rem 0.55rem;
  border: 3px solid #15803d;
  color: #15803d;
  transform: rotate(-10deg);
}

.supply-task-record-timeline-item[data-status='claimed'] .supply-task-record-entry > strong {
  min-width: 84px;
  padding: 0.45rem 0.65rem;
  border: 3px solid #111827;
  border-radius: 0.45rem;
  background: #facc15;
  text-align: center;
  box-shadow: 3px 3px 0 #000;
}

.supply-task-record-load-more {
  align-self: center;
  margin-top: 0.9rem;
  padding: 0.45rem 2.5rem;
  background: #fffdf6;
}

.supply-task-record-aside {
  display: grid;
  min-height: 0;
  gap: 1rem;
}

.supply-task-record-radar,
.supply-task-record-redemptions {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 0.85rem;
}

.supply-task-record-radar header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.supply-task-record-radar header button {
  min-height: 34px;
  padding: 0.25rem 1rem;
  background: #fffdf6;
  box-shadow: none;
}

.supply-task-record-radar article,
.supply-task-record-redemptions article {
  display: grid;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 0.4rem;
  border-bottom: 1px solid rgba(17, 24, 39, 0.18);
}

.supply-task-record-radar article {
  grid-template-columns: 58px minmax(0, 1fr) auto auto auto;
}

.supply-task-record-radar article img,
.supply-task-record-redemptions article img {
  border: 2px solid #111827;
  border-radius: 0.35rem;
  background: #e0f2fe;
}

.supply-task-record-radar article strong {
  padding: 0.2rem 0.45rem;
  border: 1px solid #f97316;
  border-radius: 0.25rem;
  color: #ea580c;
  font-size: 0.78rem;
}

.supply-task-record-radar article button {
  min-height: 32px;
  padding: 0.25rem 0.85rem;
  box-shadow: 2px 2px 0 #000;
}

.supply-task-record-radar article button:last-of-type {
  background: #e5e7eb;
}

.supply-task-record-redemptions article {
  grid-template-columns: 58px minmax(0, 1fr) auto;
}

.supply-task-record-redemptions article strong {
  font-weight: 900;
}

.supply-task-record-redemptions article[data-status='processing'] strong {
  color: #2563eb;
}

.supply-task-record-redemptions article[data-status='completed'] strong {
  color: #15803d;
}

.supply-task-record-redemptions article[data-status='expired'] strong {
  color: #4b5563;
}

.supply-task-record-view-all {
  width: 100%;
  margin-top: auto;
  background: #fffdf6;
  box-shadow: none;
}

@media (max-width: 1200px) {
  .supply-task-record-topbar {
    grid-template-columns: 1fr;
  }

  .supply-task-record-resources {
    justify-content: flex-start;
  }

  .supply-task-record-shell {
    grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
  }

  .supply-task-record-aside {
    grid-column: 2;
  }

  .supply-task-record-entry {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .supply-task-record-reward,
  .supply-task-record-entry > strong {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 768px) {
  .supply-task-record-scene {
    overflow: auto;
  }

  .supply-task-record-topbar {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0.75rem;
  }

  .supply-task-record-shell {
    grid-template-columns: 1fr;
    padding: 0.75rem;
  }

  .supply-task-record-sidebar,
  .supply-task-record-aside {
    grid-column: auto;
  }

  .supply-task-record-sidebar nav {
    display: flex;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }

  .supply-task-record-sidebar nav button {
    min-width: 128px;
  }

  .supply-task-record-mascot {
    display: none;
  }

  .supply-task-record-timeline-item {
    grid-template-columns: 3.7rem 1.4rem minmax(0, 1fr);
  }

  .supply-task-record-timeline::before {
    left: 1.15rem;
  }

  .supply-task-record-entry,
  .supply-task-record-radar article,
  .supply-task-record-redemptions article {
    grid-template-columns: 1fr;
  }

  .supply-task-record-entry-icon,
  .supply-task-record-radar article img,
  .supply-task-record-redemptions article img {
    justify-self: start;
  }

  .supply-task-record-reward,
  .supply-task-record-entry > strong {
    grid-column: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .supply-task-record-scene *,
  .supply-task-record-scene *::before,
  .supply-task-record-scene *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Run the CSS test**

Run:

```bash
npm test -- __tests__/supply-task-record-scene-css.test.ts
```

Expected: PASS.

## Task 6: Run Focused Verification And Visual QA

**Files:**
- Verify only files created or modified in this plan.

- [ ] **Step 1: Run all task-record focused tests**

Run:

```bash
npm test -- __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing unrelated warnings. If lint reports task-record files, fix them before continuing.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts, usually at `http://localhost:3000`.

- [ ] **Step 4: Open the route and verify desktop layout**

Open:

```text
http://localhost:3000/ui-lab/supply-dashboard/task-record
```

Check at a desktop viewport near `1536 x 1024`:

- Top tab active state is on `任务记录`.
- Left black menu, center timeline, right radar/redemption panels match the target structure.
- The seven timeline records are visible and aligned.
- Completed records use green stamp styling; claimed reward records use yellow button styling.
- Radar rows show three pending invites with response/ignore controls.
- Redemption rows show `兑换中`、`已完成`、`已失效`.
- No text overlaps inside buttons, cards, or resource capsules.

- [ ] **Step 5: Verify mobile layout**

Check near `390 x 844`:

- Page scrolls vertically.
- Topbar remains readable or horizontally scrollable.
- Sidebar menu does not cover the timeline.
- Timeline records keep time, title, reward, and status readable.
- Radar and redemption panels stack after the timeline.

- [ ] **Step 6: Review git diff**

Run:

```bash
git diff -- app/ui-lab/supply-dashboard/task-record/page.tsx components/gamification/ui-lab/supply-task-record components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx app/globals.css __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
```

Expected:

- Only task-record UI lab files, top-tab href, focused tests, and task-record CSS changed.
- No production `SupplyStation`, board route, navbar, Prisma, API, or type union changes.
- No reference to `design/ui-assets/任务记录.png` from runtime component or mock data.

## Plan Self-Review Checklist

- Spec coverage: tasks cover route isolation, top tab href, mock data, reused assets, scene structure, CSS, responsive behavior, visual QA, and no production integration.
- Placeholder scan: no task relies on undefined future files or unspecified data contracts.
- Type consistency: `SupplyTaskRecordPreview`, `supplyTaskRecordMock`, tests, and component props use the same field names.
- Scope check: implementation is a single static UI-lab scene and does not include business API integration.
