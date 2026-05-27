# Supply UI Lab Team Goal Rewards Local State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Supply UI Lab `团队目标` 页面补齐赛季达成奖励、里程碑奖励、今日团队任务指标来源和本地领取反馈，并彻底移除旧的 `补给券` 与辅助入口。

**Architecture:** 仅更新 `supply-team-goal` 页面自己的类型、mock、渲染和局部 CSS；顶部资源复用已存在的 `supplyUiLabResources.dashboard`，不新增真实 season service、不写入数据库、不写团队动态。`SupplyTeamGoalScene` 改为 client component，用一段本地 state 展示奖励领取按钮反馈。

**Tech Stack:** Next.js 15 App Router, React 19 client component state, TypeScript strict mode, Tailwind CSS v4 plus existing `app/globals.css`, Vitest + jsdom.

---

## Scope

本计划对应任务级 spec：

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-09-team-goal-design.md`

它是总计划中任务 9 的聚焦执行计划：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

本任务只处理团队目标页面：

- 展示 `赛季达成奖励`。
- 展示 `银子 x100`、`抽奖券 x3`、`团队称号 30天`、`赛季达成高光`。
- 展示 20%、40%、65%、85%、100% 五个里程碑奖励。
- 每个今日团队任务展示指标来源文案。
- 将页面内所有 `补给券` 改成 `抽奖券`。
- 移除 `帮助中心`、`意见反馈`、`设置` 入口。
- 奖励领取按钮只做本地反馈，不接真实发奖。

## Assumptions

任务 1 已完成或同一工作树里已经存在以下共享资源文件：

- `components/gamification/ui-lab/supply-data/resources.ts`
- `components/gamification/ui-lab/supply-data/types.ts`

当前共享资源没有 `teamGoal` 分组。本任务直接使用 `supplyUiLabResources.dashboard`，避免为单页增加共享层 surface area。

工作树可能已有其他 Supply UI Lab 任务的未提交变更。执行本任务时只 stage 和 commit 本计划列出的文件，不回滚其他任务改动。

## File Structure

- Modify: `components/gamification/ui-lab/supply-team-goal/types.ts`
  - 新增 `TeamGoalCompletionReward`、`TeamGoalMilestoneReward`。
  - 给 `TeamGoalTask` 增加 `metricSource`。
  - 给 `SupplyTeamGoalPreview` 增加 `completionReward`、`milestoneRewards`。
- Modify: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
  - 导入 `supplyUiLabResources.dashboard`。
  - 顶部资源统一为 `银子 / 抽奖券 / 背包` 和 `2,450 / 18 / 18/60`。
  - 新增赛季达成奖励和里程碑奖励 fixtures。
  - 所有任务奖励和预览文案使用 `抽奖券`。
- Modify: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
  - 添加 `"use client";`。
  - 使用 `useState` 做领取按钮本地反馈。
  - 渲染赛季达成奖励、里程碑奖励和任务指标来源。
  - 删除公告栏辅助入口 nav。
- Modify: `app/globals.css`
  - 添加赛季达成奖励、里程碑奖励、指标来源和公告栏无 nav 后的布局样式。
- Modify: `__tests__/supply-team-goal-mock-data.test.ts`
  - 验证新增奖励数据、任务指标来源和旧词汇移除。
- Modify: `__tests__/supply-team-goal-scene.test.tsx`
  - 验证页面渲染新增奖励、指标来源、无辅助入口，以及领取按钮本地反馈。
- Modify: `__tests__/supply-team-goal-scene-css.test.ts`
  - 验证新增语义 CSS selector 存在。
- No change expected: `__tests__/supply-team-goal-assets.test.ts`
  - 继续验证原有团队目标资产。

## Task 1: Update Team Goal Contract Tests First

**Files:**
- Modify: `__tests__/supply-team-goal-mock-data.test.ts`
- Modify: `__tests__/supply-team-goal-scene.test.tsx`
- Modify: `__tests__/supply-team-goal-scene-css.test.ts`

- [ ] **Step 1: Replace the Team Goal mock data test**

Replace the full contents of `__tests__/supply-team-goal-mock-data.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import {
  supplyTeamGoalAssetPaths,
  supplyTeamGoalMock,
} from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

describe("supply team goal mock data", () => {
  it("covers the prototype's team, season, milestone, task, and reward state", () => {
    expect(supplyTeamGoalMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyTeamGoalMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
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

  it("models season completion rewards and milestone rewards from the Task 9 spec", () => {
    expect(supplyTeamGoalMock.completionReward).toEqual({
      title: "赛季达成奖励",
      memberRewards: ["银子 x100", "抽奖券 x3"],
      teamReward: "团队称号 30天",
      reportReward: "赛季达成高光",
    });
    expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.percent)).toEqual([20, 40, 65, 85, 100]);
    expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.rewardLabel)).toEqual([
      "团队公告高光",
      "每人 抽奖券 x1",
      "团队称号预览",
      "每人 银子 x50",
      "触发赛季达成奖励",
    ]);
    expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.status)).toEqual([
      "completed",
      "completed",
      "current",
      "active",
      "locked",
    ]);
  });

  it("explains the source metric for each daily team task", () => {
    expect(supplyTeamGoalMock.tasks.map((task) => task.metricSource)).toEqual([
      "今日有效健身打卡人数",
      "今日四维任务完成份数",
      "今日弱社交已回应次数",
      "今日全队抽卡次数",
    ]);
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

  it("uses Phase 2 vocabulary and removes legacy helper entries", () => {
    const serializedMock = JSON.stringify(supplyTeamGoalMock);

    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("帮助中心");
    expect(serializedMock).not.toContain("意见反馈");
    expect(serializedMock).not.toContain("设置");
  });

  it("keeps image asset paths under the team-goal public folder", () => {
    expect(supplyTeamGoalAssetPaths.topbarLogo).toBe("/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png");
    expect(supplyTeamGoalAssetPaths.media).toEqual({
      roadBackground: "/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp",
      crest: "/assets/home-scenes/supply/team-goal/team-goal-crest.webp",
      vaultChest: "/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp",
    });
    expect(JSON.stringify(supplyTeamGoalAssetPaths)).not.toContain("panelImages");
    expect(serializedAssetData()).not.toMatch(/team-goal-(raid|road|tasks|rewards|announcement)-panel\.(png|webp|jpe?g)/);
  });
});

function serializedAssetData() {
  return JSON.stringify({ supplyTeamGoalAssetPaths, supplyTeamGoalMock });
}
```

- [ ] **Step 2: Replace the Team Goal scene test**

Replace the full contents of `__tests__/supply-team-goal-scene.test.tsx` with:

```typescript
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyTeamGoalScene", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("renders the team goal prototype with Task 9 reward and metric additions", async () => {
    await act(async () => {
      root.render(<SupplyTeamGoalScene data={supplyTeamGoalMock} />);
    });

    expect(host.querySelector(".supply-team-goal-scene")).not.toBeNull();
    expect(host.textContent).toContain("牛马补给站");
    expect(host.textContent).toContain("团队目标");
    expect(host.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(host.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(host.querySelector(".supply-ui-lab-topbar-tab[aria-selected='true']")?.textContent).toContain("团队目标");
    expect(host.querySelector(".supply-ui-lab-topbar-tab[href='/ui-lab/supply-dashboard']")?.textContent).toContain(
      "我的状态",
    );
    expect(host.querySelector(".supply-ui-lab-brand img")).not.toBeNull();
    expect(host.querySelector(".supply-ui-lab-statusbar")).not.toBeNull();
    expect(host.querySelector(".supply-ui-lab-user-menu")).not.toBeNull();
    expect(host.querySelector(".supply-team-goal-panel-image")).toBeNull();
    expect(host.innerHTML).not.toMatch(/team-goal-(raid|road|tasks|rewards|announcement)-panel\.(png|webp|jpe?g)/);
    expect(host.textContent).not.toContain("查看成员");
    expect(host.textContent).toContain("返回大厅");
    expect(host.textContent).toContain("本周团队副本");
    expect(host.textContent).toContain("78,560");
    expect(host.textContent).toContain("120,000");
    expect(host.textContent).toContain("65%");
    expect(host.textContent).toContain("5,680");
    expect(host.textContent).toContain("今日团队任务");
    expect(host.textContent).toContain("奖励预览");
    expect(host.textContent).toContain("赛季达成奖励");
    expect(host.textContent).toContain("银子 x100");
    expect(host.textContent).toContain("抽奖券 x3");
    expect(host.textContent).toContain("团队称号 30天");
    expect(host.textContent).toContain("赛季达成高光");
    expect(host.textContent).toContain("20%");
    expect(host.textContent).toContain("每人 抽奖券 x1");
    expect(host.textContent).toContain("今日有效健身打卡人数");
    expect(host.textContent).toContain("今日四维任务完成份数");
    expect(host.textContent).toContain("今日弱社交已回应次数");
    expect(host.textContent).toContain("今日全队抽卡次数");
    expect(host.textContent).toContain("当前阶段：3/5");
    expect(host.querySelector(".supply-team-goal-road-track")).not.toBeNull();
    expect(host.querySelectorAll("[data-testid='team-goal-milestone']")).toHaveLength(5);
    expect(host.querySelectorAll("[data-testid='team-goal-milestone-reward']")).toHaveLength(5);
    expect(host.querySelectorAll("[data-testid='team-goal-task']")).toHaveLength(4);
    expect(host.querySelectorAll("[data-testid='team-goal-reward']")).toHaveLength(4);
    expect(host.textContent).not.toContain("补给券");
    expect(host.textContent).not.toContain("帮助中心");
    expect(host.textContent).not.toContain("意见反馈");
    expect(host.textContent).not.toContain("设置");
  });

  it("shows local feedback when the reward claim button is clicked", async () => {
    await act(async () => {
      root.render(<SupplyTeamGoalScene data={supplyTeamGoalMock} />);
    });

    const claimButton = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("领取团队奖励"),
    );

    expect(claimButton).toBeDefined();
    expect(host.textContent).toContain("达成所有阶段即可领取全部奖励");

    await act(async () => {
      claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.textContent).toContain("本地预览：奖励已加入领取反馈");
  });
});
```

- [ ] **Step 3: Extend the Team Goal CSS selector test**

Modify `__tests__/supply-team-goal-scene-css.test.ts` so the selector list in the first test includes these entries:

```typescript
      ".supply-team-goal-completion-reward",
      ".supply-team-goal-completion-list",
      ".supply-team-goal-milestone-rewards",
      ".supply-team-goal-metric-source",
```

Also add this expectation in the same test:

```typescript
    expect(css).not.toContain(".supply-team-goal-announcement nav");
```

- [ ] **Step 4: Run focused Team Goal tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
```

Expected: FAIL because `completionReward`, `milestoneRewards`, `metricSource`, new CSS selectors, removed helper nav, and local claim feedback are not implemented yet.

## Task 2: Add Team Goal Reward And Metric Data

**Files:**
- Modify: `components/gamification/ui-lab/supply-team-goal/types.ts`
- Modify: `components/gamification/ui-lab/supply-team-goal/mock-data.ts`

- [ ] **Step 1: Replace Team Goal types**

Replace the full contents of `components/gamification/ui-lab/supply-team-goal/types.ts` with:

```typescript
import type { SupplyUiLabResource } from "@/components/gamification/ui-lab/supply-data/types";

export type TeamGoalMilestoneStatus = "completed" | "current" | "active" | "locked";
export type TeamGoalTaskStatus = "active" | "completed" | "locked";
export type TeamGoalRewardTone = "purple" | "orange" | "blue" | "violet";

export type TeamGoalResource = SupplyUiLabResource;

export type TeamGoalSeasonReward = {
  id: string;
  icon: string;
  label: string;
  value: string;
};

export type TeamGoalCompletionReward = {
  title: string;
  memberRewards: string[];
  teamReward: string;
  reportReward: string;
};

export type TeamGoalMilestone = {
  id: string;
  order: number;
  title: string;
  targetPoints: number;
  status: TeamGoalMilestoneStatus;
  rewardLabel: string;
};

export type TeamGoalMilestoneReward = {
  percent: 20 | 40 | 65 | 85 | 100;
  title: string;
  rewardLabel: string;
  status: TeamGoalMilestoneStatus;
};

export type TeamGoalTask = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  metricSource: string;
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
  media: {
    roadBackground: string;
    crest: string;
    vaultChest: string;
  };
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
    helper: string;
  };
  seasonRewards: TeamGoalSeasonReward[];
  completionReward: TeamGoalCompletionReward;
  milestones: TeamGoalMilestone[];
  milestoneRewards: TeamGoalMilestoneReward[];
  tasks: TeamGoalTask[];
  rewardPreview: TeamGoalRewardPreview[];
  announcement: {
    message: string;
  };
};
```

- [ ] **Step 2: Replace Team Goal mock data**

Replace the full contents of `components/gamification/ui-lab/supply-team-goal/mock-data.ts` with:

```typescript
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";
import type { SupplyTeamGoalPreview } from "./types";

export const supplyTeamGoalAssetPaths = {
  topbarLogo: "/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png",
  media: {
    roadBackground: "/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp",
    crest: "/assets/home-scenes/supply/team-goal/team-goal-crest.webp",
    vaultChest: "/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp",
  },
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
  media: supplyTeamGoalAssetPaths.media,
  topBar: {
    resources: supplyUiLabResources.dashboard,
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
    helper: "通过团队目标获得",
  },
  seasonRewards: [
    { id: "team-exp", icon: "EXP", label: "团队经验", value: "+30%" },
    { id: "ticket-boost", icon: "券", label: "抽奖券获取", value: "+20%" },
    { id: "team-title", icon: "盾", label: "团队称号", value: "全力以赴" },
    { id: "avatar-frame", icon: "框", label: "专属头像框", value: "30天" },
  ],
  completionReward: {
    title: "赛季达成奖励",
    memberRewards: ["银子 x100", "抽奖券 x3"],
    teamReward: "团队称号 30天",
    reportReward: "赛季达成高光",
  },
  milestones: [
    { id: "start", order: 1, title: "启程之路", targetPoints: 20000, status: "completed", rewardLabel: "已完成" },
    { id: "front", order: 2, title: "并肩前行", targetPoints: 50000, status: "completed", rewardLabel: "已完成" },
    { id: "all-in", order: 3, title: "全力以赴", targetPoints: 80000, status: "current", rewardLabel: "当前阶段" },
    { id: "limit", order: 4, title: "突破极限", targetPoints: 100000, status: "active", rewardLabel: "进行中" },
    { id: "glory", order: 5, title: "荣耀时刻", targetPoints: 120000, status: "locked", rewardLabel: "未解锁" },
  ],
  milestoneRewards: [
    { percent: 20, title: "公告点亮", rewardLabel: "团队公告高光", status: "completed" },
    { percent: 40, title: "全员小补给", rewardLabel: "每人 抽奖券 x1", status: "completed" },
    { percent: 65, title: "称号预览", rewardLabel: "团队称号预览", status: "current" },
    { percent: 85, title: "银子加班费", rewardLabel: "每人 银子 x50", status: "active" },
    { percent: 100, title: "赛季达成", rewardLabel: "触发赛季达成奖励", status: "locked" },
  ],
  tasks: [
    {
      id: "team-workout",
      icon: "👟",
      title: "全队运动打卡",
      subtitle: "全队累计运动打卡",
      metricSource: "今日有效健身打卡人数",
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
      metricSource: "今日四维任务完成份数",
      current: 28,
      target: 40,
      unit: "份",
      reward: { icon: "券", label: "抽奖券", value: "+2" },
      status: "active",
    },
    {
      id: "social-response",
      icon: "💬",
      title: "社交互动响应",
      subtitle: "回复队友互动消息",
      metricSource: "今日弱社交已回应次数",
      current: 12,
      target: 15,
      unit: "次",
      reward: { icon: "EXP", label: "团队经验", value: "+80" },
      status: "active",
    },
    {
      id: "draw-usage",
      icon: "🎟",
      title: "全队抽卡活跃",
      subtitle: "全队消耗抽奖券抽卡",
      metricSource: "今日全队抽卡次数",
      current: 18,
      target: 25,
      unit: "次",
      reward: { icon: "券", label: "抽奖券", value: "+2" },
      status: "active",
    },
  ],
  rewardPreview: [
    {
      id: "team-chest",
      title: "团队宝箱",
      subtitle: "达成后解锁丰厚随机奖励",
      image: supplyTeamGoalAssetPaths.media.vaultChest,
      icon: "🎁",
      tone: "purple",
    },
    {
      id: "team-boost",
      title: "团队加成（7天）",
      subtitle: "经验 +30% / 抽奖券 +20%",
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
      subtitle: "赛季达成高光展示专属时刻",
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

- [ ] **Step 3: Run mock data test**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts
```

Expected: PASS.

## Task 3: Render Rewards, Metrics, And Local Claim Feedback

**Files:**
- Modify: `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`

- [ ] **Step 1: Replace Team Goal scene component**

Replace the full contents of `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx` with:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  SupplyUiLabActionButton,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyTeamGoalPreview,
  TeamGoalMilestone,
  TeamGoalMilestoneReward,
  TeamGoalRewardPreview,
  TeamGoalTask,
  TeamGoalTaskStatus,
} from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getTaskTone(status: TeamGoalTaskStatus): "success" | "warning" | "muted" {
  if (status === "completed") {
    return "success";
  }

  if (status === "active") {
    return "warning";
  }

  return "muted";
}

function getTaskStatusLabel(status: TeamGoalTaskStatus) {
  return {
    active: "进行中",
    completed: "已完成",
    locked: "未解锁",
  }[status];
}

export function SupplyTeamGoalScene({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <main className="supply-team-goal-scene" aria-label="团队目标 UI Lab">
      <div className="supply-team-goal-background" aria-hidden="true" />
      <div className="supply-team-goal-content">
        <SupplyUiLabTopBar activeLabel="团队目标" profile={data.topBar.profile} resources={data.topBar.resources} />
        <header className="supply-team-goal-header">
          <Link className="supply-team-goal-back-button" href="/ui-lab/supply-dashboard">
            ← 返回大厅
          </Link>
          <h1>✦ 团队目标 ✦</h1>
        </header>
        <RaidPanel data={data} />
        <MilestoneRoad data={data} />
        <section className="supply-team-goal-lower-grid">
          <TeamTasks data={data} />
          <RewardPreview data={data} />
        </section>
        <AnnouncementPanel data={data} />
      </div>
    </main>
  );
}

function RaidPanel({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="本周团队副本" className="supply-team-goal-raid-panel">
      <section className="supply-team-goal-team-card" aria-label="团队信息">
        <h2>本周团队副本</h2>
        <Image
          alt=""
          className="supply-team-goal-crest"
          height={128}
          src={data.media.crest}
          unoptimized
          width={128}
        />
        <div>
          <h3>{data.team.name}</h3>
          <p>Lv.{data.team.level} 团队</p>
          <p>
            {data.team.memberCount}/{data.team.memberLimit} 成员
          </p>
        </div>
        <SupplyUiLabActionButton tone="secondary">成员名单</SupplyUiLabActionButton>
      </section>

      <section className="supply-team-goal-season-summary" aria-label="赛季目标">
        <p>
          {data.season.label}：{data.season.goalName}
        </p>
        <span>
          {data.season.dateRange} 剩余 {data.season.remainingDays} 天
        </span>
        <h2>
          {formatNumber(data.season.currentPoints)}
          <small> / {formatNumber(data.season.targetPoints)}</small>
        </h2>
        <SupplyUiLabProgress current={data.season.currentPoints} label="团队进度" max={data.season.targetPoints} />
        <strong>{data.season.progressPercent}%</strong>
      </section>

      <section className="supply-team-goal-vault" aria-label="牛马金库">
        <h2>牛马金库</h2>
        <Image alt="" height={118} src={data.media.vaultChest} unoptimized width={118} />
        <strong>{formatNumber(data.vault.amount)}</strong>
        <p>{data.vault.helper}</p>
        <SupplyUiLabActionButton tone="primary">宝库商店</SupplyUiLabActionButton>
      </section>

      <section className="supply-team-goal-season-rewards" aria-label="赛季奖励">
        <h2>赛季目标</h2>
        <p>全队累计完成 120,000 点团队进度，解锁丰厚奖励！</p>
        {data.seasonRewards.map((reward) => (
          <div key={reward.id}>
            <span aria-hidden="true">{reward.icon}</span>
            <span>
              {reward.label}：{reward.value}
            </span>
          </div>
        ))}
      </section>
    </SupplyUiLabPixelPanel>
  );
}

function MilestoneRoad({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <section className="supply-team-goal-road" aria-label="团队目标里程碑">
      <Image alt="" fill priority sizes="100vw" src={data.media.roadBackground} unoptimized />
      <div className="supply-team-goal-road-line" aria-hidden="true" />
      <div className="supply-team-goal-road-track">
        {data.milestones.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}
      </div>
      <div className="supply-team-goal-milestone-rewards" aria-label="里程碑奖励">
        {data.milestoneRewards.map((reward) => (
          <MilestoneRewardCard key={reward.percent} reward={reward} />
        ))}
      </div>
    </section>
  );
}

function MilestoneCard({ milestone }: { milestone: TeamGoalMilestone }) {
  return (
    <article className={`supply-team-goal-milestone is-${milestone.status}`} data-testid="team-goal-milestone">
      <strong>{milestone.title}</strong>
      <span>{formatNumber(milestone.targetPoints)}</span>
      <div aria-hidden="true">★</div>
      <b>{milestone.order}</b>
      <em>{milestone.rewardLabel}</em>
    </article>
  );
}

function MilestoneRewardCard({ reward }: { reward: TeamGoalMilestoneReward }) {
  return (
    <article
      className={`supply-team-goal-milestone-reward is-${reward.status}`}
      data-testid="team-goal-milestone-reward"
    >
      <strong>{reward.percent}%</strong>
      <span>{reward.title}</span>
      <p>{reward.rewardLabel}</p>
    </article>
  );
}

function TeamTasks({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="今日团队任务" className="supply-team-goal-tasks">
      <header>
        <h2>今日团队任务</h2>
        <span>明日 05:18:22 后刷新</span>
      </header>
      <div className="supply-team-goal-task-list">
        {data.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function TaskRow({ task }: { task: TeamGoalTask }) {
  return (
    <article className="supply-team-goal-task" data-testid="team-goal-task">
      <span className="supply-team-goal-task-icon" aria-hidden="true">
        {task.icon}
      </span>
      <div>
        <h3>{task.title}</h3>
        <p>{task.subtitle}</p>
        <small className="supply-team-goal-metric-source">{task.metricSource}</small>
      </div>
      <strong>
        {task.current}/{task.target} {task.unit}
      </strong>
      <SupplyUiLabProgress current={task.current} label={task.title} max={task.target} />
      <p>
        {task.reward.icon} {task.reward.label} {task.reward.value}
      </p>
      <SupplyUiLabStatusBadge tone={getTaskTone(task.status)}>{getTaskStatusLabel(task.status)}</SupplyUiLabStatusBadge>
    </article>
  );
}

function RewardPreview({ data }: { data: SupplyTeamGoalPreview }) {
  const [claimFeedback, setClaimFeedback] = useState("达成所有阶段即可领取全部奖励");

  return (
    <SupplyUiLabPixelPanel ariaLabel="奖励预览" className="supply-team-goal-rewards">
      <header>
        <h2>奖励预览</h2>
        <SupplyUiLabActionButton tone="ghost">全部奖励</SupplyUiLabActionButton>
      </header>
      <section className="supply-team-goal-completion-reward" aria-label={data.completionReward.title}>
        <h3>{data.completionReward.title}</h3>
        <div className="supply-team-goal-completion-list">
          {data.completionReward.memberRewards.map((reward) => (
            <span key={reward}>{reward}</span>
          ))}
          <span>{data.completionReward.teamReward}</span>
          <span>{data.completionReward.reportReward}</span>
        </div>
      </section>
      <div className="supply-team-goal-reward-grid">
        {data.rewardPreview.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}
      </div>
      <div className="supply-team-goal-claim">
        <SupplyUiLabActionButton tone="primary" onClick={() => setClaimFeedback("本地预览：奖励已加入领取反馈")}>
          领取团队奖励
        </SupplyUiLabActionButton>
        <span>{claimFeedback}</span>
        <strong>
          当前阶段：{data.season.currentStage}/{data.season.totalStages}
        </strong>
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function RewardCard({ reward }: { reward: TeamGoalRewardPreview }) {
  return (
    <article className={`supply-team-goal-reward is-${reward.tone}`} data-testid="team-goal-reward">
      <h3>{reward.title}</h3>
      {reward.image ? (
        <Image alt="" height={92} src={reward.image} unoptimized width={92} />
      ) : (
        <strong>{reward.icon}</strong>
      )}
      <p>{reward.subtitle}</p>
    </article>
  );
}

function AnnouncementPanel({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <footer className="supply-team-goal-announcement" aria-label="团队公告">
      <span className="supply-team-goal-announcement-icon" aria-hidden="true">
        !
      </span>
      <span>{data.announcement.message}</span>
    </footer>
  );
}
```

- [ ] **Step 2: Run scene test and verify CSS is still failing**

Run:

```bash
npm test -- __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
```

Expected: scene test PASS, CSS test FAIL because new selectors are not defined and old announcement nav CSS still exists.

## Task 4: Add Team Goal Local Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `__tests__/supply-team-goal-scene-css.test.ts`

- [ ] **Step 1: Remove old announcement nav CSS**

In `app/globals.css`, delete the selector `.supply-team-goal-announcement nav` from the early shared transition rule and remove the dedicated blocks for:

```css
.supply-team-goal-announcement nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.supply-team-goal-announcement a {
  color: #111827;
  font-size: 0.75rem;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

Also remove any mobile media rules that target `.supply-team-goal-announcement nav`.

- [ ] **Step 2: Add completion reward, milestone reward, and metric source CSS**

Add this block near the existing `.supply-team-goal-reward-grid` and `.supply-team-goal-claim` rules in `app/globals.css`:

```css
.supply-team-goal-milestone-rewards {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.supply-team-goal-milestone-reward {
  border: 2px solid #111827;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 4px 4px 0 rgba(17, 24, 39, 0.22);
  padding: 10px;
  color: #111827;
}

.supply-team-goal-milestone-reward strong,
.supply-team-goal-milestone-reward span,
.supply-team-goal-milestone-reward p {
  display: block;
}

.supply-team-goal-milestone-reward strong {
  font-size: 0.95rem;
  font-weight: 1000;
}

.supply-team-goal-milestone-reward span {
  margin-top: 4px;
  font-size: 0.82rem;
  font-weight: 950;
}

.supply-team-goal-milestone-reward p {
  margin-top: 6px;
  color: #4b5563;
  font-size: 0.74rem;
  font-weight: 800;
}

.supply-team-goal-milestone-reward.is-completed {
  background: #dcfce7;
}

.supply-team-goal-milestone-reward.is-current {
  background: #fef08a;
}

.supply-team-goal-milestone-reward.is-active {
  background: #dbeafe;
}

.supply-team-goal-milestone-reward.is-locked {
  background: rgba(243, 244, 246, 0.92);
  color: #6b7280;
}

.supply-team-goal-metric-source {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 0.72rem;
  font-weight: 850;
}

.supply-team-goal-completion-reward {
  border: 2px solid #111827;
  border-radius: 8px;
  background: #fef3c7;
  box-shadow: 4px 4px 0 rgba(17, 24, 39, 0.18);
  margin-bottom: 14px;
  padding: 12px;
}

.supply-team-goal-completion-reward h3 {
  color: #111827;
  font-size: 0.9rem;
  font-weight: 1000;
  margin: 0 0 10px;
}

.supply-team-goal-completion-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.supply-team-goal-completion-list span {
  border: 2px solid #111827;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  font-size: 0.76rem;
  font-weight: 950;
  padding: 6px 8px;
  text-align: center;
}
```

Add these responsive rules inside the existing `@media (max-width: 768px)` Supply Team Goal area:

```css
  .supply-team-goal-milestone-rewards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .supply-team-goal-completion-list {
    grid-template-columns: 1fr;
  }
```

Add this rule inside the existing narrow mobile `@media (max-width: 520px)` Supply Team Goal area:

```css
  .supply-team-goal-milestone-rewards {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 3: Run CSS test**

Run:

```bash
npm test -- __tests__/supply-team-goal-scene-css.test.ts
```

Expected: PASS.

## Task 5: Verify Task 9 And Commit

**Files:**
- Modify only files needed to fix verification failures discovered by this task.

- [ ] **Step 1: Run all Team Goal tests**

Run:

```bash
npm test -- __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run static business closure guardrail if earlier tasks are already complete**

Run:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected when tasks 1-9 are complete: PASS.

If it fails only for pages from tasks that are not part of this plan, record the failing page names in the execution notes and do not change unrelated pages during Task 9.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit Task 9**

Run:

```bash
git add components/gamification/ui-lab/supply-team-goal app/globals.css __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts
git commit -m "feat: close supply team goal reward mock"
```

Expected: commit succeeds with only Task 9 files staged.

## Self-Review Checklist

- Spec coverage:
  - `赛季达成奖励`: Task 1 tests it, Task 2 data adds it, Task 3 renders it.
  - `银子 x100` and `抽奖券 x3`: Task 1 tests both, Task 2 data adds both.
  - Milestone reward list: Task 1 tests 20/40/65/85/100, Task 2 data adds all five, Task 3 renders all five.
  - 今日团队任务指标来源: Task 1 tests all four strings, Task 2 data adds `metricSource`, Task 3 renders it.
  - `补给券` replacement: Task 1 tests data and render absence, Task 2 replaces strings.
  - Remove helper entries: Task 1 tests render absence, Task 3 removes footer nav, Task 4 removes nav CSS.
  - Local claim feedback: Task 1 scene test clicks button, Task 3 implements local state.
- Placeholder scan:
  - No placeholder markers or incomplete edge-case instructions.
- Type consistency:
  - `TeamGoalMilestoneReward.status` uses the existing `TeamGoalMilestoneStatus`.
  - `TeamGoalTask.metricSource` is defined in `types.ts`, assigned in `mock-data.ts`, and rendered in `SupplyTeamGoalScene.tsx`.
  - `supplyUiLabResources.dashboard` exists in `components/gamification/ui-lab/supply-data/resources.ts`.
