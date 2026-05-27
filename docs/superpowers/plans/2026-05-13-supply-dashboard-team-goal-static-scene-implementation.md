# Supply Dashboard Team Goal Static Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `/ui-lab/supply-dashboard/team-goal` static Team Goal scene that visually prototypes the 团队目标 page from `design/ui-assets/团队目标.png` without touching the stable production `SupplyStation` flow.

**Architecture:** Create a route-local UI lab page backed by local mock data and semantic static components. Keep new media assets under `public/assets/home-scenes/supply/team-goal/`, reuse existing reward and avatar assets where possible, and put scene-level CSS in `app/globals.css` behind `supply-team-goal-*` class names. Add focused Vitest contracts for route isolation, mock data shape, required assets, scene structure, CSS layering, and responsive safeguards.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, built-in `imagegen` for missing raster assets, ImageMagick `magick` and/or `cwebp` for local image processing.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- UI lab plan: `docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard static scene spec: `docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- Image workflow: `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Target prototype: `design/ui-assets/团队目标.png`

## Scope Guardrails

- Do not modify `components/gamification/SupplyStation.tsx`.
- Do not modify `app/(board)/page.tsx`, `app/(board)/layout.tsx`, `components/navbar/Navbar.tsx`, `lib/store.tsx`, or `lib/types.ts`.
- Do not add to the production nav and do not change `AppTab`.
- Do not call `/api/gamification/*`, `/api/admin/*`, or any other API from the UI lab route.
- Do not read cookies, sessions, Prisma, or real auth state.
- Do not implement real reward claiming, team member viewing, vault shop navigation, or season management.
- Do not add external UI dependencies.

## File Structure

- Create: `app/ui-lab/supply-dashboard/team-goal/page.tsx`
  - Route entry for the isolated static prototype.
- Create: `components/gamification/ui-lab/supply-team-goal/types.ts`
  - Static Team Goal data types.
- Create: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
  - Centralized static mock data and asset path references.
- Create: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
  - Scene shell and semantic subcomponents.
- Create: `__tests__/supply-team-goal-ui-lab-route.test.ts`
  - Route isolation contract.
- Create: `__tests__/supply-team-goal-mock-data.test.ts`
  - Mock data coverage contract.
- Create: `__tests__/supply-team-goal-assets.test.ts`
  - Required final media asset existence and size budgets.
- Create: `__tests__/supply-team-goal-scene.test.tsx`
  - Static scene DOM structure and image path contract.
- Create: `__tests__/supply-team-goal-scene-css.test.ts`
  - CSS layer, responsive, and reduced-motion contract.
- Create: `public/assets/home-scenes/supply/team-goal/`
  - Final compressed Team Goal media assets.
- Modify: `app/globals.css`
  - Add `supply-team-goal-*` scene styles only.

## Task 1: Lock Route Isolation And Mock Data Contracts

**Files:**
- Create: `__tests__/supply-team-goal-ui-lab-route.test.ts`
- Create: `__tests__/supply-team-goal-mock-data.test.ts`
- Create: `components/gamification/ui-lab/supply-team-goal/types.ts`
- Create: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`

- [ ] **Step 1: Write the failing route isolation test**

Create `__tests__/supply-team-goal-ui-lab-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply team goal ui lab route isolation", () => {
  it("uses a standalone team-goal route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/team-goal/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyTeamGoalScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyTeamGoalScene");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
  });
});
```

- [ ] **Step 2: Run the isolation test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-team-goal-ui-lab-route.test.ts
```

Expected: FAIL because `app/ui-lab/supply-dashboard/team-goal/page.tsx` does not exist yet.

- [ ] **Step 3: Add Team Goal data types**

Create `components/gamification/ui-lab/supply-team-goal/types.ts`:

```ts
export type TeamGoalMilestoneStatus = "completed" | "current" | "active" | "locked";
export type TeamGoalTaskStatus = "active" | "completed" | "locked";
export type TeamGoalRewardTone = "purple" | "orange" | "blue" | "violet";

export type TeamGoalResource = {
  id: "coins" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type TeamGoalSeasonReward = {
  id: string;
  icon: string;
  label: string;
  value: string;
};

export type TeamGoalMilestone = {
  id: string;
  order: number;
  title: string;
  targetPoints: number;
  status: TeamGoalMilestoneStatus;
  rewardLabel: string;
};

export type TeamGoalTask = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  current: number;
  target: number;
  unit: string;
  reward: {
    icon: string;
    label: string;
    value: string;
  };
  status: TeamGoalTaskStatus;
};

export type TeamGoalRewardPreview = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  icon: string;
  tone: TeamGoalRewardTone;
};

export type SupplyTeamGoalPreview = {
  topBar: {
    resources: TeamGoalResource[];
    profile: {
      username: string;
      avatar: string;
    };
  };
  team: {
    name: string;
    level: number;
    memberCount: number;
    memberLimit: number;
    crestImage: string;
  };
  season: {
    label: string;
    goalName: string;
    dateRange: string;
    remainingDays: number;
    currentPoints: number;
    targetPoints: number;
    progressPercent: number;
    currentStage: number;
    totalStages: number;
  };
  vault: {
    amount: number;
    image: string;
    helper: string;
  };
  seasonRewards: TeamGoalSeasonReward[];
  milestones: TeamGoalMilestone[];
  tasks: TeamGoalTask[];
  rewardPreview: TeamGoalRewardPreview[];
  announcement: {
    message: string;
  };
};
```

- [ ] **Step 4: Add centralized mock data**

Create `components/gamification/ui-lab/supply-team-goal/mock-data.ts`:

```ts
import type { SupplyTeamGoalPreview } from "./types";

export const supplyTeamGoalAssetPaths = {
  roadBackground: "/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp",
  crest: "/assets/home-scenes/supply/team-goal/team-goal-crest.webp",
  vaultChest: "/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp",
  fallbackLogo: "/logo.png",
  profileAvatar: "/avatars/male1.png",
  rewardIcons: {
    coins: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    boost: "/gamification/rewards/icons/small_boost_coupon.png",
    teamBroadcast: "/gamification/rewards/icons/team_broadcast_coupon.png",
  },
} as const;

export const supplyTeamGoalMock: SupplyTeamGoalPreview = {
  topBar: {
    resources: [
      { id: "coins", label: "银子", value: "2,450", icon: "◎" },
      { id: "ticket", label: "补给券", value: "18", icon: "券" },
      { id: "backpack", label: "背包", value: "68/120", icon: "包" },
    ],
    profile: {
      username: "Vincent",
      avatar: supplyTeamGoalAssetPaths.profileAvatar,
    },
  },
  team: {
    name: "牛马不加班",
    level: 12,
    memberCount: 28,
    memberLimit: 30,
    crestImage: supplyTeamGoalAssetPaths.crest,
  },
  season: {
    label: "赛季目标 S3",
    goalName: "牛马不加班",
    dateRange: "05.20 - 06.16",
    remainingDays: 18,
    currentPoints: 78560,
    targetPoints: 120000,
    progressPercent: 65,
    currentStage: 3,
    totalStages: 5,
  },
  vault: {
    amount: 5680,
    image: supplyTeamGoalAssetPaths.vaultChest,
    helper: "通过团队目标获得",
  },
  seasonRewards: [
    { id: "team-exp", icon: "EXP", label: "团队经验", value: "+30%" },
    { id: "ticket-boost", icon: "券", label: "补给券获取", value: "+20%" },
    { id: "team-title", icon: "盾", label: "团队称号", value: "全力以赴" },
    { id: "avatar-frame", icon: "框", label: "专属头像框", value: "30天" },
  ],
  milestones: [
    { id: "start", order: 1, title: "启程之路", targetPoints: 20000, status: "completed", rewardLabel: "已完成" },
    { id: "front", order: 2, title: "并肩前行", targetPoints: 50000, status: "completed", rewardLabel: "已完成" },
    { id: "all-in", order: 3, title: "全力以赴", targetPoints: 80000, status: "current", rewardLabel: "当前阶段" },
    { id: "limit", order: 4, title: "突破极限", targetPoints: 100000, status: "active", rewardLabel: "进行中" },
    { id: "glory", order: 5, title: "荣耀时刻", targetPoints: 120000, status: "locked", rewardLabel: "未解锁" },
  ],
  tasks: [
    {
      id: "team-workout",
      icon: "👟",
      title: "全队运动打卡",
      subtitle: "全队累计运动打卡",
      current: 20,
      target: 30,
      unit: "人",
      reward: { icon: "EXP", label: "团队经验", value: "+100" },
      status: "active",
    },
    {
      id: "four-dimension",
      icon: "📖",
      title: "四维任务完成",
      subtitle: "运动/喝水/社交/学习任务",
      current: 28,
      target: 40,
      unit: "份",
      reward: { icon: "券", label: "补给券", value: "+2" },
      status: "active",
    },
    {
      id: "social-response",
      icon: "💬",
      title: "社交互动响应",
      subtitle: "回复队友互动消息",
      current: 12,
      target: 15,
      unit: "次",
      reward: { icon: "EXP", label: "团队经验", value: "+80" },
      status: "active",
    },
    {
      id: "ticket-usage",
      icon: "🎟",
      title: "补给券活跃使用",
      subtitle: "全队使用补给券",
      current: 18,
      target: 25,
      unit: "张",
      reward: { icon: "券", label: "补给券", value: "+2" },
      status: "active",
    },
  ],
  rewardPreview: [
    {
      id: "team-chest",
      title: "团队宝箱",
      subtitle: "达成后解锁丰厚随机奖励",
      image: supplyTeamGoalAssetPaths.vaultChest,
      icon: "🎁",
      tone: "purple",
    },
    {
      id: "team-boost",
      title: "团队加成（7天）",
      subtitle: "经验 +30% / 补给 +20%",
      image: null,
      icon: "EXP",
      tone: "orange",
    },
    {
      id: "team-title",
      title: "团队称号",
      subtitle: "团队专属称号 30天",
      image: null,
      icon: "全力以赴",
      tone: "blue",
    },
    {
      id: "weekly-highlight",
      title: "周报高光",
      subtitle: "每周高光展示专属时刻",
      image: null,
      icon: "📈",
      tone: "violet",
    },
  ],
  announcement: {
    message: "团队公告：周六早上 8 点公园团练，记得来哦！💪",
  },
};
```

- [ ] **Step 5: Write the mock data contract test**

Create `__tests__/supply-team-goal-mock-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { supplyTeamGoalAssetPaths, supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

describe("supply team goal mock data", () => {
  it("covers the prototype's team, season, milestone, task, and reward state", () => {
    expect(supplyTeamGoalMock.topBar.resources.map((resource) => resource.value)).toEqual(["2,450", "18", "68/120"]);
    expect(supplyTeamGoalMock.team.name).toBe("牛马不加班");
    expect(supplyTeamGoalMock.team.memberCount).toBe(28);
    expect(supplyTeamGoalMock.team.memberLimit).toBe(30);
    expect(supplyTeamGoalMock.season.currentPoints).toBe(78560);
    expect(supplyTeamGoalMock.season.targetPoints).toBe(120000);
    expect(supplyTeamGoalMock.season.progressPercent).toBe(65);
    expect(supplyTeamGoalMock.season.currentStage).toBe(3);
    expect(supplyTeamGoalMock.vault.amount).toBe(5680);
    expect(supplyTeamGoalMock.milestones).toHaveLength(5);
    expect(supplyTeamGoalMock.tasks).toHaveLength(4);
    expect(supplyTeamGoalMock.rewardPreview).toHaveLength(4);
  });

  it("includes all milestone states needed by the road UI", () => {
    expect(supplyTeamGoalMock.milestones.map((milestone) => milestone.status)).toEqual([
      "completed",
      "completed",
      "current",
      "active",
      "locked",
    ]);
  });

  it("keeps image asset paths under the team-goal public folder", () => {
    expect(supplyTeamGoalAssetPaths.roadBackground).toBe("/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp");
    expect(supplyTeamGoalAssetPaths.crest).toBe("/assets/home-scenes/supply/team-goal/team-goal-crest.webp");
    expect(supplyTeamGoalAssetPaths.vaultChest).toBe("/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp");
  });
});
```

- [ ] **Step 6: Run the mock data test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts components/gamification/ui-lab/supply-team-goal/types.ts components/gamification/ui-lab/supply-team-goal/mock-data.ts
git commit -m "test: lock supply team goal ui lab contract"
```

## Task 2: Prepare Team Goal Media Assets

**Files:**
- Create: `public/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp`
- Create: `public/assets/home-scenes/supply/team-goal/team-goal-crest.webp`
- Create: `public/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp`
- Create: `__tests__/supply-team-goal-assets.test.ts`

- [ ] **Step 1: Write the failing asset contract test**

Create `__tests__/supply-team-goal-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const assets = [
  {
    path: "public/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp",
    maxBytes: 260 * 1024,
  },
  {
    path: "public/assets/home-scenes/supply/team-goal/team-goal-crest.webp",
    maxBytes: 140 * 1024,
  },
  {
    path: "public/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp",
    maxBytes: 140 * 1024,
  },
];

describe("supply team goal media assets", () => {
  it.each(assets)("$path exists and stays within its size budget", ({ path, maxBytes }) => {
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeLessThanOrEqual(maxBytes);
  });
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-team-goal-assets.test.ts
```

Expected: FAIL because the new assets do not exist yet.

- [ ] **Step 3: Generate or reuse `team-goal-road-bg.webp`**

Use the `imagegen` skill only if no existing asset can match the prototype. Generate a wide pixel-art grassland background with no readable text:

```text
Wide 16-bit pixel art game background, bright blue sky with soft clouds, green training field and distant trees, cheerful fitness team quest map atmosphere, horizontal side-scroller composition, no characters, no text, no UI, clean center lane for overlayed milestone road, crisp pixel edges, warm daylight.
```

Process the final image into:

```text
public/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp
```

Target dimensions: `1536 x 260`. Target size: `<= 260 KB`.

- [ ] **Step 4: Generate or reuse `team-goal-crest.webp`**

Use this prompt if generation is needed:

```text
Transparent background 16-bit pixel art team crest, cute strong cow mascot wearing a yellow gym headband and black gym shirt, holding a dumbbell, laurel leaves around a shield badge, bold black outline, cheerful Chinese fitness app style, no readable text, centered icon, high contrast.
```

Process the final image into:

```text
public/assets/home-scenes/supply/team-goal/team-goal-crest.webp
```

Target dimensions: around `360 x 360`. Target size: `<= 140 KB`.

- [ ] **Step 5: Generate or reuse `team-goal-vault-chest.webp`**

First check whether `public/assets/home-scenes/report/vault-safe-yellow.webp` or a Dashboard asset matches the gold treasure chest style. If not, use this prompt:

```text
Transparent background 16-bit pixel art golden treasure chest, chunky black outline, bright yellow gold highlights, small sparkles, game reward vault prop, front three-quarter view, no readable text, centered object, crisp pixel edges.
```

Process the final image into:

```text
public/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp
```

Target dimensions: around `360 x 280`. Target size: `<= 140 KB`.

- [ ] **Step 6: Run the asset contract test**

Run:

```bash
npm test -- __tests__/supply-team-goal-assets.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add public/assets/home-scenes/supply/team-goal __tests__/supply-team-goal-assets.test.ts
git commit -m "test: add supply team goal media assets"
```

## Task 3: Build Static Route And Scene Markup

**Files:**
- Create: `app/ui-lab/supply-dashboard/team-goal/page.tsx`
- Create: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
- Create: `__tests__/supply-team-goal-scene.test.tsx`

- [ ] **Step 1: Write the failing scene DOM test**

Create `__tests__/supply-team-goal-scene.test.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

describe("SupplyTeamGoalScene", () => {
  it("renders the static team goal prototype structure", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);

    await act(async () => {
      root.render(<SupplyTeamGoalScene data={supplyTeamGoalMock} />);
    });

    expect(host.querySelector(".supply-team-goal-scene")).not.toBeNull();
    expect(host.textContent).toContain("牛马补给站");
    expect(host.textContent).toContain("团队目标");
    expect(host.textContent).toContain("返回大厅");
    expect(host.textContent).toContain("本周团队副本");
    expect(host.textContent).toContain("78,560");
    expect(host.textContent).toContain("120,000");
    expect(host.textContent).toContain("65%");
    expect(host.textContent).toContain("5,680");
    expect(host.textContent).toContain("今日团队任务");
    expect(host.textContent).toContain("奖励预览");
    expect(host.textContent).toContain("当前阶段：3/5");
    expect(host.querySelectorAll("[data-testid='team-goal-milestone']")).toHaveLength(5);
    expect(host.querySelectorAll("[data-testid='team-goal-task']")).toHaveLength(4);
    expect(host.querySelectorAll("[data-testid='team-goal-reward']")).toHaveLength(4);

    root.unmount();
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-team-goal-scene.test.tsx
```

Expected: FAIL because `SupplyTeamGoalScene` does not exist yet.

- [ ] **Step 3: Add the static route**

Create `app/ui-lab/supply-dashboard/team-goal/page.tsx`:

```tsx
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

export default function SupplyDashboardTeamGoalPage() {
  return <SupplyTeamGoalScene data={supplyTeamGoalMock} />;
}
```

- [ ] **Step 4: Add the scene component**

Create `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`:

```tsx
import Image from "next/image";
import type { SupplyTeamGoalPreview, TeamGoalMilestone, TeamGoalRewardPreview, TeamGoalTask } from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function SupplyTeamGoalScene({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <main className="supply-team-goal-scene min-h-screen bg-[#fff7db] text-slate-950">
      <div className="supply-team-goal-background" aria-hidden="true" />
      <div className="supply-team-goal-content">
        <TopBar data={data} />
        <header className="supply-team-goal-header">
          <button type="button" className="supply-team-goal-back-button">← 返回大厅</button>
          <h1>✦ 团队目标 ✦</h1>
        </header>
        <section className="supply-team-goal-raid-panel" aria-label="本周团队副本">
          <TeamIdentity data={data} />
          <SeasonSummary data={data} />
          <TeamVault data={data} />
          <SeasonRewards data={data} />
        </section>
        <MilestoneRoad data={data} />
        <section className="supply-team-goal-lower-grid">
          <TeamTasks tasks={data.tasks} />
          <RewardPreview data={data} />
        </section>
        <footer className="supply-team-goal-announcement">
          <span>📣</span>
          <strong>团队公告：</strong>
          <span>{data.announcement.message.replace("团队公告：", "")}</span>
          <nav aria-label="团队目标辅助入口">
            <a href="#help">帮助中心</a>
            <a href="#feedback">意见反馈</a>
            <a href="#settings">⚙</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function TopBar({ data }: { data: SupplyTeamGoalPreview }) {
  const navItems = ["我的状态", "团队目标", "排行榜", "补给商店", "任务记录"];

  return (
    <nav className="supply-team-goal-topbar" aria-label="牛马补给站导航">
      <div className="supply-team-goal-brand">
        <span className="supply-team-goal-brand-icon">🐮</span>
        <span>牛马补给站</span>
      </div>
      <div className="supply-team-goal-nav-items">
        {navItems.map((item) => (
          <button key={item} type="button" className={item === "团队目标" ? "is-active" : ""}>
            {item}
          </button>
        ))}
      </div>
      <div className="supply-team-goal-resources">
        {data.topBar.resources.map((resource) => (
          <span key={resource.id} className="supply-team-goal-resource">
            <span>{resource.icon}</span>
            <strong>{resource.value}</strong>
            <span className="supply-team-goal-resource-plus">+</span>
          </span>
        ))}
        <Image src={data.topBar.profile.avatar} alt="" width={44} height={44} className="supply-team-goal-avatar" />
      </div>
    </nav>
  );
}

function TeamIdentity({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <div className="supply-team-goal-team-card">
      <h2>✦ 本周团队副本</h2>
      <Image src={data.team.crestImage} alt="" width={172} height={172} className="supply-team-goal-crest" />
      <div>
        <h3>{data.team.name}</h3>
        <p>Lv.{data.team.level} 团队</p>
        <p>👥 {data.team.memberCount}/{data.team.memberLimit} 成员</p>
      </div>
      <button type="button">查看成员</button>
    </div>
  );
}

function SeasonSummary({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <div className="supply-team-goal-season-summary">
      <p>{data.season.label}：{data.season.goalName}</p>
      <span>{data.season.dateRange}　剩余 {data.season.remainingDays} 天</span>
      <h2>{formatNumber(data.season.currentPoints)} <small>/ {formatNumber(data.season.targetPoints)}</small></h2>
      <div className="supply-team-goal-progress" aria-label={`团队进度 ${data.season.progressPercent}%`}>
        <span style={{ width: `${data.season.progressPercent}%` }} />
      </div>
      <strong>{data.season.progressPercent}%</strong>
    </div>
  );
}

function TeamVault({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <div className="supply-team-goal-vault">
      <h2>✦ 牛马金库</h2>
      <Image src={data.vault.image} alt="" width={176} height={136} />
      <strong>{formatNumber(data.vault.amount)} ◎</strong>
      <p>{data.vault.helper}</p>
      <button type="button">宝库商店 ›</button>
    </div>
  );
}

function SeasonRewards({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <aside className="supply-team-goal-season-rewards" aria-label="赛季目标奖励">
      <h2>赛季目标</h2>
      <p>全队累计完成 120,000 点团队进度，解锁丰厚奖励！</p>
      {data.seasonRewards.map((reward) => (
        <div key={reward.id}>
          <span>{reward.icon}</span>
          <span>{reward.label}：{reward.value}</span>
        </div>
      ))}
    </aside>
  );
}

function MilestoneRoad({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <section className="supply-team-goal-road" aria-label="团队目标里程碑">
      <Image src="/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp" alt="" fill sizes="100vw" />
      <div className="supply-team-goal-road-track">
        {data.milestones.map((milestone) => (
          <MilestoneNode key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </section>
  );
}

function MilestoneNode({ milestone }: { milestone: TeamGoalMilestone }) {
  return (
    <article className={`supply-team-goal-milestone is-${milestone.status}`} data-testid="team-goal-milestone">
      <strong>{milestone.title}</strong>
      <span>{formatNumber(milestone.targetPoints)}</span>
      <div>{milestone.status === "locked" ? "🔒" : milestone.status === "current" ? "⚔" : "✓"}</div>
      <b>{milestone.order}</b>
      <em>{milestone.rewardLabel}</em>
    </article>
  );
}

function TeamTasks({ tasks }: { tasks: TeamGoalTask[] }) {
  return (
    <section className="supply-team-goal-tasks" aria-label="今日团队任务">
      <header>
        <h2>今日团队任务</h2>
        <span>⏱ 明日 05:18:22 后刷新</span>
      </header>
      {tasks.map((task) => (
        <article key={task.id} className="supply-team-goal-task" data-testid="team-goal-task">
          <span>{task.icon}</span>
          <div>
            <h3>{task.title}</h3>
            <p>{task.subtitle}</p>
          </div>
          <strong>{task.current}/{task.target} {task.unit}</strong>
          <div className="supply-team-goal-task-progress"><span style={{ width: `${Math.round((task.current / task.target) * 100)}%` }} /></div>
          <p>{task.reward.icon} {task.reward.label} {task.reward.value}</p>
          <button type="button">进行中</button>
        </article>
      ))}
    </section>
  );
}

function RewardPreview({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <section className="supply-team-goal-rewards" aria-label="奖励预览">
      <header>
        <h2>✦ 奖励预览</h2>
        <button type="button">全部奖励 ›</button>
      </header>
      <div className="supply-team-goal-reward-grid">
        {data.rewardPreview.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}
      </div>
      <div className="supply-team-goal-claim">
        <button type="button">🎁 领取团队奖励</button>
        <span>达成所有阶段即可领取全部奖励</span>
        <strong>当前阶段：{data.season.currentStage}/{data.season.totalStages}</strong>
      </div>
    </section>
  );
}

function RewardCard({ reward }: { reward: TeamGoalRewardPreview }) {
  return (
    <article className={`supply-team-goal-reward is-${reward.tone}`} data-testid="team-goal-reward">
      <h3>{reward.title}</h3>
      {reward.image ? <Image src={reward.image} alt="" width={112} height={88} /> : <strong>{reward.icon}</strong>}
      <p>{reward.subtitle}</p>
    </article>
  );
}
```

- [ ] **Step 5: Run scene and isolation tests**

Run:

```bash
npm test -- __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-ui-lab-route.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add app/ui-lab/supply-dashboard/team-goal/page.tsx components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx __tests__/supply-team-goal-scene.test.tsx
git commit -m "feat: add supply team goal static scene"
```

## Task 4: Add Scene CSS And Responsive Contracts

**Files:**
- Modify: `app/globals.css`
- Create: `__tests__/supply-team-goal-scene-css.test.ts`

- [ ] **Step 1: Write the failing CSS contract test**

Create `__tests__/supply-team-goal-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

function expectRule(selector: string) {
  expect(css).toContain(selector);
}

describe("supply team goal scene css", () => {
  it("defines scene, topbar, panels, road, task, and reward layers", () => {
    [
      ".supply-team-goal-scene",
      ".supply-team-goal-background",
      ".supply-team-goal-content",
      ".supply-team-goal-topbar",
      ".supply-team-goal-raid-panel",
      ".supply-team-goal-road",
      ".supply-team-goal-milestone",
      ".supply-team-goal-lower-grid",
      ".supply-team-goal-task",
      ".supply-team-goal-reward",
      ".supply-team-goal-announcement",
    ].forEach(expectRule);
  });

  it("keeps responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".supply-team-goal-road-track");
  });
});
```

- [ ] **Step 2: Run the CSS test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-team-goal-scene-css.test.ts
```

Expected: FAIL because CSS rules do not exist yet.

- [ ] **Step 3: Add scene CSS to `app/globals.css`**

Append a section scoped to `supply-team-goal-*`. The implementation must include these structural rules:

```css
.supply-team-goal-scene {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: #fff7db;
  color: #111827;
  overflow-x: hidden;
}

.supply-team-goal-background {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 247, 219, 0.88)),
    radial-gradient(circle at 12% 18%, rgba(250, 204, 21, 0.28), transparent 24rem),
    #fff7db;
}

.supply-team-goal-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto auto auto 1fr auto auto;
  gap: 0.55rem;
  padding: 0.35rem 0.65rem 0.5rem;
}

.supply-team-goal-topbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: 4rem;
  border: 4px solid #111827;
  border-radius: 0.55rem;
  background: #facc15;
  box-shadow: 0 5px 0 #111827;
}

.supply-team-goal-nav-items,
.supply-team-goal-resources {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.supply-team-goal-nav-items button,
.supply-team-goal-resource,
.supply-team-goal-back-button,
.supply-team-goal-team-card button,
.supply-team-goal-vault button,
.supply-team-goal-task button,
.supply-team-goal-claim button {
  border: 3px solid #111827;
  background: #fff7d6;
  box-shadow: 0 3px 0 #111827;
  font-weight: 900;
}

.supply-team-goal-nav-items button.is-active,
.supply-team-goal-claim button,
.supply-team-goal-vault button {
  background: #facc15;
}

.supply-team-goal-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.supply-team-goal-header h1 {
  text-align: center;
  font-size: clamp(2rem, 3.2vw, 3.4rem);
  font-weight: 1000;
}

.supply-team-goal-raid-panel,
.supply-team-goal-tasks,
.supply-team-goal-rewards {
  border: 4px solid #111827;
  border-radius: 0.75rem;
  background: #fffaf0;
  box-shadow: 0 4px 0 #111827;
}

.supply-team-goal-raid-panel {
  display: grid;
  grid-template-columns: 1.15fr 1.35fr 1.05fr 1.35fr;
  gap: 1rem;
  padding: 1rem;
}

.supply-team-goal-progress,
.supply-team-goal-task-progress {
  overflow: hidden;
  border: 2px solid #111827;
  background: #e7ddc9;
}

.supply-team-goal-progress span,
.supply-team-goal-task-progress span {
  display: block;
  height: 100%;
  background: #5bbf37;
}

.supply-team-goal-road {
  position: relative;
  overflow: hidden;
  min-height: 14rem;
  border: 4px solid #111827;
  border-radius: 0.75rem;
  background: #a7d875;
  box-shadow: 0 4px 0 #111827;
}

.supply-team-goal-road img {
  object-fit: cover;
  z-index: 0;
}

.supply-team-goal-road-track {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  min-height: 14rem;
  padding: 1rem 4rem;
}

.supply-team-goal-milestone {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  min-width: 0;
  text-align: center;
  font-weight: 900;
}

.supply-team-goal-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 0.7rem;
  min-height: 0;
}

.supply-team-goal-task {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(5rem, 7rem) auto auto;
  align-items: center;
  gap: 0.75rem;
  border: 2px solid #d8c9ad;
  background: #fffdf7;
}

.supply-team-goal-reward-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.supply-team-goal-announcement {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 4px solid #111827;
  border-radius: 0.55rem;
  background: #facc15;
  box-shadow: 0 4px 0 #111827;
}

@media (max-width: 1024px) {
  .supply-team-goal-topbar,
  .supply-team-goal-raid-panel,
  .supply-team-goal-lower-grid {
    grid-template-columns: 1fr;
  }

  .supply-team-goal-nav-items,
  .supply-team-goal-resources {
    overflow-x: auto;
  }

  .supply-team-goal-reward-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .supply-team-goal-content {
    padding: 0.35rem;
  }

  .supply-team-goal-header {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .supply-team-goal-road-track {
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 1rem;
  }

  .supply-team-goal-task {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .supply-team-goal-reward-grid {
    grid-template-columns: 1fr;
  }

  .supply-team-goal-announcement {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .supply-team-goal-scene *,
  .supply-team-goal-scene *::before,
  .supply-team-goal-scene *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Refine spacing, colors, and exact selectors as needed, while keeping every selector in the CSS contract test.

- [ ] **Step 4: Run CSS and scene tests**

Run:

```bash
npm test -- __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-team-goal-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add app/globals.css __tests__/supply-team-goal-scene-css.test.ts
git commit -m "style: add supply team goal scene css"
```

## Task 5: Browser QA, Build, And Final Verification

**Files:**
- Modify only files from Tasks 1-4 if QA finds layout defects.

- [ ] **Step 1: Run the focused contract suite**

Run:

```bash
npm test -- __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
```

Expected: PASS for all five files.

- [ ] **Step 2: Run lint**

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

- [ ] **Step 4: Start the dev server**

Run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Expected: server starts at `http://127.0.0.1:3000`.

- [ ] **Step 5: Verify desktop visual match**

Open:

```text
http://127.0.0.1:3000/ui-lab/supply-dashboard/team-goal
```

Set viewport to `1536 x 1024`. Confirm:

- The top bar matches the prototype hierarchy and active tab is `团队目标`.
- The page shows `返回大厅` and centered `团队目标`.
- The top raid panel fits in one row and shows `78,560 / 120,000`, `65%`, and `5,680`.
- The milestone road has five evenly spaced nodes and stage 3 is visually current.
- The lower grid shows four team tasks and four reward cards without text overlap.
- The announcement bar remains visible at the bottom.

- [ ] **Step 6: Verify mobile responsive behavior**

Set viewport to `390 x 844`. Confirm:

- No horizontal page overflow.
- Top navigation can scroll if needed.
- The raid panel, milestone list, tasks, and rewards stack into readable sections.
- Buttons and task rows do not clip Chinese text.
- Images do not stretch or cover text.

- [ ] **Step 7: Fix QA defects with targeted edits**

If QA finds defects, edit only these files:

```text
components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx
app/globals.css
components/gamification/ui-lab/supply-team-goal/mock-data.ts
```

After each edit, rerun the focused test that covers the changed area.

- [ ] **Step 8: Final full verification**

Run:

```bash
npm test -- __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 9: Commit final QA refinements**

```bash
git add app/ui-lab/supply-dashboard/team-goal/page.tsx components/gamification/ui-lab/supply-team-goal __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts app/globals.css public/assets/home-scenes/supply/team-goal
git commit -m "feat: complete supply team goal ui lab scene"
```

## Self-Review Checklist

- Spec coverage: every requirement in `2026-05-13-supply-dashboard-team-goal-static-scene-design.md` maps to a task above.
- Route isolation: production `SupplyStation`, `AppTab`, board layout, navbar, API routes, Prisma, and auth remain untouched.
- Mock data: all prototype values and states are centralized in `mock-data.ts`.
- Assets: final files live under `public/assets/home-scenes/supply/team-goal/` and pass size budgets.
- CSS: all new rules are scoped to `supply-team-goal-*`.
- QA: desktop `1536 x 1024` and mobile `390 x 844` are both checked before completion.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-13-supply-dashboard-team-goal-static-scene-implementation.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Choose the execution mode before starting implementation.
