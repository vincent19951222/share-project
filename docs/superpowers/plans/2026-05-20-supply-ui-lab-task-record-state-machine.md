# Supply UI Lab Task Record State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Supply UI Lab `任务记录` 从静态总览页升级成单 route 的本地状态机，支持今日记录、抽卡记录、兑换记录、队友雷达和规则说明完整主视图。

**Architecture:** 新增 UI Lab 共享 `records.ts` 作为任务记录页面的日期、历史、雷达、兑换和规则 fixture 来源；`supply-task-record` mock 只组合页面结构和共享记录数据。`SupplyTaskRecordScene` 改为 client component，用本地 state 控制侧栏模式和最近 7 天日期 tab，不查询 API、不新增 route、不修改真实兑换或社交状态。

**Tech Stack:** Next.js 15 App Router, React 19 client component state, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab CSS and primitives.

---

## Scope

本计划对应任务级 spec：

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-08-task-record-design.md`

它是总计划中任务 8 的聚焦执行计划：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

## Assumptions

任务 1-7 已完成或正在同一工作树中推进。以下共享文件应已存在：

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`

工作树可能已有 Dashboard、Shop 或其他 UI Lab 任务的未提交变更。执行本任务时只 stage 和 commit Task Record 相关文件；不要回滚其他任务的改动。

不要在本任务里尝试让全局 static business closure guardrail 全部通过。它可能仍会因为 Team Goal 或其他未执行任务失败。本任务只负责移除任务记录自身的旧词汇、死锚点和假单日记录。

## File Structure

- Create: `components/gamification/ui-lab/supply-data/records.ts`
  - 提供最近 7 天日期、按日期分组的时间线、抽卡历史、雷达邀请、兑换历史和规则说明。
  - 所有奖励词汇使用 `银子`、`抽奖券` 或具体道具名，不使用 `生命票`、`补给券`。
- Modify: `components/gamification/ui-lab/supply-task-record/types.ts`
  - 新增 `SupplyTaskRecordMode`、日期、抽卡历史、规则类型。
  - 将 `SupplyTaskRecordPreview` 从单日静态结构改为本地状态机所需结构。
- Modify: `components/gamification/ui-lab/supply-task-record/mock-data.ts`
  - 导入 `supplyUiLabResources.dashboard` 和 `supply-data/records.ts` fixtures。
  - 设置 `activeMode: "today"`、`activeDateKey`、`dates`、`recordsByDate`、`drawHistory`、`rules`。
  - 移除 `生命票`、`补给券`、`牛马币` 展示词，改为 `抽奖券` 和 `银子`。
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
  - 添加 `"use client";`。
  - 用 `useState` 管理 `activeMode` 和 `activeDateKey`。
  - 侧栏按钮切换主面板标题和内容。
  - 日期 tab 切换 `recordsByDate`；无记录日期展示空状态。
  - 抽卡记录、兑换记录、队友雷达和规则说明都能作为完整主视图渲染。
- Modify: `app/globals.css`
  - 为日期 tab、空状态、抽卡历史、完整雷达、完整兑换和规则说明添加 Task Record 局部样式。
- Modify: `__tests__/supply-task-record-mock-data.test.ts`
  - 验证 7 天日期、按日期记录、抽卡历史、雷达、兑换、规则和旧词汇移除。
- Modify: `__tests__/supply-task-record-scene.test.tsx`
  - 验证侧栏模式切换、日期切换、空状态、抽卡历史、雷达主视图、兑换主视图和规则主视图。
- Modify: `__tests__/supply-task-record-scene-css.test.ts`
  - 验证新增语义 CSS selector 存在。
- No change expected: `__tests__/supply-task-record-assets.test.ts`
  - 继续验证头像和奖励图标资产存在。

## Task 1: Update Task Record Contract Tests First

**Files:**
- Modify: `__tests__/supply-task-record-mock-data.test.ts`
- Modify: `__tests__/supply-task-record-scene.test.tsx`
- Modify: `__tests__/supply-task-record-scene-css.test.ts`

- [ ] **Step 1: Replace the Task Record mock data test**

Replace the full contents of `__tests__/supply-task-record-mock-data.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import {
  supplyTaskRecordAssetPaths,
  supplyTaskRecordMock,
} from "@/components/gamification/ui-lab/supply-task-record/mock-data";

describe("supply task record mock data", () => {
  it("models a single-route local state machine with seven date tabs", () => {
    expect(supplyTaskRecordMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyTaskRecordMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyTaskRecordMock.activeMode).toBe("today");
    expect(supplyTaskRecordMock.activeDateKey).toBe("2026-05-18");
    expect(supplyTaskRecordMock.dates).toHaveLength(7);
    expect(supplyTaskRecordMock.dates.map((date) => date.label)).toEqual([
      "今天",
      "昨天",
      "前天",
      "3天前",
      "4天前",
      "5天前",
      "6天前",
    ]);
    expect(Object.keys(supplyTaskRecordMock.recordsByDate)).toEqual([
      "2026-05-18",
      "2026-05-17",
      "2026-05-16",
      "2026-05-15",
      "2026-05-14",
      "2026-05-13",
      "2026-05-12",
    ]);
    expect(supplyTaskRecordMock.recordsByDate["2026-05-13"]).toEqual([]);
  });

  it("covers timeline records, draw history, redemptions, radar, and rules without legacy vocabulary", () => {
    const todayRecords = supplyTaskRecordMock.recordsByDate[supplyTaskRecordMock.activeDateKey] ?? [];
    const serializedMock = JSON.stringify(supplyTaskRecordMock);

    expect(todayRecords.map((record) => record.time)).toEqual([
      "08:21",
      "09:03",
      "10:15",
      "11:40",
      "12:02",
      "12:05",
      "12:06",
    ]);
    expect(todayRecords.filter((record) => record.status === "completed")).toHaveLength(4);
    expect(todayRecords.filter((record) => record.status === "claimed")).toHaveLength(3);
    expect(todayRecords.map((record) => record.reward.label)).toEqual(
      expect.arrayContaining(["抽奖券", "运动饮料（R）", "银子"]),
    );

    expect(supplyTaskRecordMock.drawHistory.map((draw) => draw.drawType)).toEqual(["十连", "单抽", "十连"]);
    expect(supplyTaskRecordMock.drawHistory.map((draw) => draw.ticketSpent)).toEqual([10, 1, 10]);
    expect(supplyTaskRecordMock.drawHistory.some((draw) => draw.guaranteeApplied)).toBe(true);
    expect(supplyTaskRecordMock.drawHistory[0]?.rewards.map((reward) => reward.name)).toEqual(
      expect.arrayContaining(["任务换班券", "瑞幸咖啡券"]),
    );

    expect(supplyTaskRecordMock.radar.tabs.map((tab) => tab.label)).toEqual(["待响应 (3)", "已回应", "已过期"]);
    expect(supplyTaskRecordMock.radar.invites.map((invite) => invite.statusLabel)).toEqual(
      expect.arrayContaining(["待响应", "已回应", "已过期"]),
    );
    expect(supplyTaskRecordMock.redemptions.items.map((item) => item.statusLabel)).toEqual([
      "兑换中",
      "已完成",
      "已失效",
    ]);
    expect(supplyTaskRecordMock.rules).toHaveLength(4);
    expect(supplyTaskRecordMock.rules.join("\n")).toContain("抽卡记录展示单抽、十连、消耗抽奖券和批次保底状态");

    expect(serializedMock).not.toContain("生命票");
    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("牛马币");
    expect(serializedMock).not.toContain("panelImage");
    expect(serializedMock).not.toMatch(/task-record-(sidebar|timeline|radar|redemptions)-panel/);
  });

  it("references reused reward and avatar assets", () => {
    expect(supplyTaskRecordAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
    expect(Object.values(supplyTaskRecordAssetPaths.avatars).every((path) => path.startsWith("/avatars/"))).toBe(true);
  });
});
```

- [ ] **Step 2: Replace the Task Record scene test**

Replace the full contents of `__tests__/supply-task-record-scene.test.tsx` with:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const clickButtonContaining = async (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((candidate) =>
    candidate.textContent?.includes(label),
  );

  expect(button, label).toBeDefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

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

  it("renders today records with date tabs and Phase 2 vocabulary", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    expect(container.querySelector(".supply-task-record-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector("a.supply-task-record-back-link")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelectorAll(".supply-task-record-sidebar nav button")).toHaveLength(5);
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "今日记录",
    );
    expect(container.querySelector("#task-record-title")?.textContent).toBe("今日记录");
    expect(container.querySelectorAll(".supply-task-record-date-tabs button")).toHaveLength(7);
    expect(container.querySelector(".supply-task-record-date-tabs button[aria-selected='true']")?.textContent).toContain(
      "今天",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(7);
    expect(container.textContent).toContain("05月18日");
    expect(container.textContent).toContain("运动任务");
    expect(container.textContent).toContain("抽奖券 x1");
    expect(container.textContent).not.toContain("生命票");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("牛马币");
  });

  it("switches the visible records when a date tab is selected and shows an empty state", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    await clickButtonContaining(container, "昨天");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("今日记录");
    expect(container.textContent).toContain("05月17日");
    expect(container.textContent).toContain("完成队友互动");
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(3);

    await clickButtonContaining(container, "5天前");

    expect(container.textContent).toContain("05月13日");
    expect(container.textContent).toContain("这一天还没有任务记录");
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(0);
  });

  it("switches sidebar modes into full main views", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    await clickButtonContaining(container, "抽卡记录");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("抽卡记录");
    expect(container.querySelectorAll("[data-testid='task-record-draw-history']")).toHaveLength(3);
    expect(container.textContent).toContain("十连");
    expect(container.textContent).toContain("消耗抽奖券 10");
    expect(container.textContent).toContain("批次保底已触发");

    await clickButtonContaining(container, "兑换记录");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("兑换记录");
    expect(container.querySelectorAll("[data-testid='task-record-redemption-full']")).toHaveLength(3);
    expect(container.textContent).toContain("兑换中");
    expect(container.textContent).toContain("已完成");
    expect(container.textContent).toContain("已失效");

    await clickButtonContaining(container, "队友雷达");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("队友雷达");
    expect(container.querySelectorAll("[data-testid='task-record-radar-invite-full']")).toHaveLength(5);
    expect(container.textContent).toContain("待响应");
    expect(container.textContent).toContain("已回应");
    expect(container.textContent).toContain("已过期");

    await clickButtonContaining(container, "规则说明");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("规则说明");
    expect(container.querySelectorAll("[data-testid='task-record-rule']")).toHaveLength(4);
    expect(container.textContent).toContain("日期 tab 展示最近 7 天");
    expect(container.textContent).toContain("抽卡记录展示单抽、十连、消耗抽奖券和批次保底状态");
  });

  it("uses reused reward and avatar images without panel crops", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => {
      const src = image.getAttribute("src") ?? "";
      const optimizedUrl = new URL(src, "http://localhost").searchParams.get("url");

      return optimizedUrl ?? src;
    });

    expect(imageSources).toEqual(
      expect.arrayContaining([
        "/avatars/male1.png",
        "/gamification/rewards/icons/task_reroll_coupon.png",
        "/gamification/rewards/icons/coins_020.png",
        "/gamification/rewards/icons/luckin_coffee_coupon.png",
        "/avatars/male2.png",
        "/avatars/female1.png",
        "/avatars/male3.png",
      ]),
    );
    expect(imageSources.join("\n")).not.toMatch(/\/assets\/home-scenes\/supply\/task-record\/.*-panel\.png/);
  });
});
```

- [ ] **Step 3: Extend the Task Record CSS test**

In `__tests__/supply-task-record-scene-css.test.ts`, inside `it("defines isolated task-record scene and semantic component surfaces", () => { ... })`, add these assertions after the existing `.supply-task-record-load-more` or card assertions:

```typescript
expect(css).toContain(".supply-task-record-date-tabs");
expect(css).toContain(".supply-task-record-empty");
expect(css).toContain(".supply-task-record-draw-list");
expect(css).toContain(".supply-task-record-draw");
expect(css).toContain(".supply-task-record-reward-grid");
expect(css).toContain(".supply-task-record-full-list");
expect(css).toContain(".supply-task-record-rules-list");
```

- [ ] **Step 4: Run Task Record focused tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
```

Expected: FAIL. The failures should mention missing `activeMode`, missing `dates`, old `生命票` / `补给券` strings, missing mode switching, and missing CSS selectors.

## Task 2: Add Shared Records Fixture And Update Types

**Files:**
- Create: `components/gamification/ui-lab/supply-data/records.ts`
- Modify: `components/gamification/ui-lab/supply-task-record/types.ts`

- [ ] **Step 1: Create the shared Task Record fixture**

Create `components/gamification/ui-lab/supply-data/records.ts`:

```typescript
import type {
  SupplyTaskRecordDateOption,
  SupplyTaskRecordDrawHistoryItem,
  SupplyTaskRecordInvite,
  SupplyTaskRecordRedemption,
  SupplyTaskRecordTimelineItem,
} from "../supply-task-record/types";

export const supplyUiLabRecordDates: SupplyTaskRecordDateOption[] = [
  { key: "2026-05-18", label: "今天", dateLabel: "05月18日", weekday: "星期一" },
  { key: "2026-05-17", label: "昨天", dateLabel: "05月17日", weekday: "星期日" },
  { key: "2026-05-16", label: "前天", dateLabel: "05月16日", weekday: "星期六" },
  { key: "2026-05-15", label: "3天前", dateLabel: "05月15日", weekday: "星期五" },
  { key: "2026-05-14", label: "4天前", dateLabel: "05月14日", weekday: "星期四" },
  { key: "2026-05-13", label: "5天前", dateLabel: "05月13日", weekday: "星期三" },
  { key: "2026-05-12", label: "6天前", dateLabel: "05月12日", weekday: "星期二" },
];

const rewardIcons = {
  coins: "/gamification/rewards/icons/coins_020.png",
  ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
  coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
} as const;

export const supplyUiLabRecordsByDate: Record<string, SupplyTaskRecordTimelineItem[]> = {
  "2026-05-18": [
    {
      id: "movement-task",
      time: "08:21",
      title: "运动任务",
      subtitle: "累计步数 >= 8000 步",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "步", alt: "运动任务" },
      reward: { icon: "券", label: "抽奖券", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "hydration-task",
      time: "09:03",
      title: "喝水任务",
      subtitle: "累计饮水 >= 2000 ml",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "水", alt: "喝水任务" },
      reward: { icon: "券", label: "抽奖券", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "social-task",
      time: "10:15",
      title: "社交任务",
      subtitle: "与队友互动 >= 1 次",
      category: "social",
      categoryLabel: "社交互动",
      categoryTone: "green",
      icon: { type: "text", value: "聊", alt: "社交任务" },
      reward: { icon: "券", label: "抽奖券", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "learning-task",
      time: "11:40",
      title: "学习任务",
      subtitle: "学习时长 >= 30 分钟",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "学", alt: "学习任务" },
      reward: { icon: "券", label: "抽奖券", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "mainline-bonus",
      time: "12:02",
      title: "完成全部主线任务",
      subtitle: "获得一次补给抽卡机会",
      category: "reward",
      categoryLabel: "奖励领取",
      categoryTone: "orange",
      icon: { type: "image", value: rewardIcons.ticket, alt: "抽奖券" },
      reward: { icon: "券", label: "抽奖券", amount: "x1" },
      status: "claimed",
      statusLabel: "已领取",
    },
    {
      id: "draw-reward",
      time: "12:05",
      title: "在补给抽卡机中抽取",
      subtitle: "十连抽触发批次保底",
      category: "draw",
      categoryLabel: "抽卡奖励",
      categoryTone: "orange",
      icon: { type: "text", value: "抽", alt: "抽卡奖励" },
      reward: { icon: "饮", label: "运动饮料（R）", amount: "x1" },
      status: "claimed",
      statusLabel: "已领取",
    },
    {
      id: "streak-reward",
      time: "12:06",
      title: "连续打卡 18 天奖励",
      subtitle: "连胜奖励已入账",
      category: "system",
      categoryLabel: "系统奖励",
      categoryTone: "orange",
      icon: { type: "image", value: rewardIcons.coins, alt: "银子" },
      reward: { icon: "银", label: "银子", amount: "x100" },
      status: "claimed",
      statusLabel: "已领取",
    },
  ],
  "2026-05-17": [
    {
      id: "yesterday-social",
      time: "09:18",
      title: "完成队友互动",
      subtitle: "回应大力水手的运动提醒",
      category: "social",
      categoryLabel: "社交互动",
      categoryTone: "green",
      icon: { type: "text", value: "聊", alt: "社交互动" },
      reward: { icon: "银", label: "银子", amount: "x10" },
      status: "completed",
      statusLabel: "已完成",
    },
    {
      id: "yesterday-draw",
      time: "12:25",
      title: "完成一次单抽",
      subtitle: "消耗抽奖券 1",
      category: "draw",
      categoryLabel: "抽卡奖励",
      categoryTone: "orange",
      icon: { type: "text", value: "抽", alt: "抽卡奖励" },
      reward: { icon: "券", label: "任务换班券", amount: "x1" },
      status: "claimed",
      statusLabel: "已领取",
    },
    {
      id: "yesterday-coins",
      time: "21:12",
      title: "夜间打卡奖励",
      subtitle: "完成今日所有记录",
      category: "reward",
      categoryLabel: "奖励领取",
      categoryTone: "orange",
      icon: { type: "image", value: rewardIcons.coins, alt: "银子" },
      reward: { icon: "银", label: "银子", amount: "x20" },
      status: "claimed",
      statusLabel: "已领取",
    },
  ],
  "2026-05-16": [
    {
      id: "before-yesterday-walk",
      time: "08:44",
      title: "散步提醒完成",
      subtitle: "队友雷达邀请已回应",
      category: "social",
      categoryLabel: "社交互动",
      categoryTone: "green",
      icon: { type: "text", value: "走", alt: "散步提醒" },
      reward: { icon: "银", label: "银子", amount: "x10" },
      status: "completed",
      statusLabel: "已完成",
    },
  ],
  "2026-05-15": [
    {
      id: "three-days-draw",
      time: "20:30",
      title: "十连抽记录",
      subtitle: "批次保底未触发",
      category: "draw",
      categoryLabel: "抽卡奖励",
      categoryTone: "orange",
      icon: { type: "text", value: "抽", alt: "抽卡奖励" },
      reward: { icon: "咖", label: "瑞幸咖啡券", amount: "x1" },
      status: "claimed",
      statusLabel: "已领取",
    },
  ],
  "2026-05-14": [
    {
      id: "four-days-water",
      time: "10:02",
      title: "喝水任务",
      subtitle: "累计饮水 >= 2000 ml",
      category: "mainline",
      categoryLabel: "主线任务",
      categoryTone: "green",
      icon: { type: "text", value: "水", alt: "喝水任务" },
      reward: { icon: "券", label: "抽奖券", amount: "x1" },
      status: "completed",
      statusLabel: "已完成",
    },
  ],
  "2026-05-13": [],
  "2026-05-12": [
    {
      id: "six-days-redeem",
      time: "19:40",
      title: "申请真实福利兑换",
      subtitle: "咖啡兑换券进入管理员确认流程",
      category: "system",
      categoryLabel: "兑换记录",
      categoryTone: "orange",
      icon: { type: "image", value: rewardIcons.coffee, alt: "瑞幸咖啡券" },
      reward: { icon: "咖", label: "瑞幸咖啡券", amount: "x1" },
      status: "claimed",
      statusLabel: "已提交",
    },
  ],
};

export const supplyUiLabDrawHistory: SupplyTaskRecordDrawHistoryItem[] = [
  {
    id: "draw-ten-2026-05-18",
    drawType: "十连",
    time: "05月18日 12:05",
    ticketSpent: 10,
    guaranteeApplied: true,
    guaranteeLabel: "批次保底已触发",
    rewards: [
      { name: "任务换班券", quantityLabel: "x1", rarity: "R" },
      { name: "银子", quantityLabel: "x5", rarity: "N" },
      { name: "瑞幸咖啡券", quantityLabel: "x1", rarity: "SSR" },
    ],
  },
  {
    id: "draw-single-2026-05-17",
    drawType: "单抽",
    time: "05月17日 12:25",
    ticketSpent: 1,
    guaranteeApplied: false,
    guaranteeLabel: "批次保底未触发",
    rewards: [{ name: "任务换班券", quantityLabel: "x1", rarity: "R" }],
  },
  {
    id: "draw-ten-2026-05-15",
    drawType: "十连",
    time: "05月15日 20:30",
    ticketSpent: 10,
    guaranteeApplied: false,
    guaranteeLabel: "批次保底累计 7/10",
    rewards: [
      { name: "银子", quantityLabel: "x20", rarity: "N" },
      { name: "运动饮料", quantityLabel: "x1", rarity: "R" },
      { name: "瑞幸咖啡券", quantityLabel: "x1", rarity: "SSR" },
    ],
  },
];

export const supplyUiLabRadarInvites: SupplyTaskRecordInvite[] = [
  {
    id: "invite-sailor",
    avatar: "/avatars/male2.png",
    name: "大力水手",
    message: "邀请你互动",
    timeLabel: "今天 10:20",
    status: "pending",
    statusLabel: "待响应",
  },
  {
    id: "invite-deer",
    avatar: "/avatars/female1.png",
    name: "小鹿同学",
    message: "提醒你一起喝水",
    timeLabel: "今天 09:15",
    status: "pending",
    statusLabel: "待响应",
  },
  {
    id: "invite-runner",
    avatar: "/avatars/male3.png",
    name: "跑步阿斌",
    message: "约你晚上散步",
    timeLabel: "昨天 21:47",
    status: "pending",
    statusLabel: "待响应",
  },
  {
    id: "invite-coach",
    avatar: "/avatars/male1.png",
    name: "教练老周",
    message: "已回应你的拉伸邀请",
    timeLabel: "昨天 18:20",
    status: "responded",
    statusLabel: "已回应",
  },
  {
    id: "invite-expired",
    avatar: "/avatars/female2.png",
    name: "咖啡同学",
    message: "午后走路邀请已过期",
    timeLabel: "05月15日 14:00",
    status: "expired",
    statusLabel: "已过期",
  },
];

export const supplyUiLabRedemptions: SupplyTaskRecordRedemption[] = [
  {
    id: "coffee-processing",
    icon: rewardIcons.coffee,
    title: "瑞幸咖啡券",
    requestedAt: "申请时间：05-18 12:10",
    secondaryLabel: "预计完成：05-18 20:00",
    status: "processing",
    statusLabel: "兑换中",
  },
  {
    id: "coffee-completed",
    icon: rewardIcons.coffee,
    title: "瑞幸咖啡券",
    requestedAt: "申请时间：05-17 08:30",
    secondaryLabel: "完成时间：05-17 14:05",
    status: "completed",
    statusLabel: "已完成",
  },
  {
    id: "coffee-expired",
    icon: rewardIcons.coffee,
    title: "瑞幸咖啡券",
    requestedAt: "申请时间：05-12 19:40",
    secondaryLabel: "失效时间：05-14 19:40",
    status: "expired",
    statusLabel: "已失效",
  },
];

export const supplyUiLabRecordRules = [
  "日期 tab 展示最近 7 天，切换后只读取本地 recordsByDate。",
  "今日记录展示任务、奖励、抽卡和系统提示；无记录日期展示空状态。",
  "抽卡记录展示单抽、十连、消耗抽奖券和批次保底状态。",
  "队友雷达和兑换记录展示完整状态列表，但不响应真实社交邀请或真实兑换。",
];
```

- [ ] **Step 2: Replace the Task Record type file**

Replace the full contents of `components/gamification/ui-lab/supply-task-record/types.ts` with:

```typescript
import type { SupplyUiLabResource } from "../supply-dashboard/SupplyUiLabTopBar";

export type SupplyTaskRecordMode = "today" | "draws" | "redemptions" | "radar" | "rules";

export type SupplyTaskRecordMenuItem = {
  id: SupplyTaskRecordMode;
  label: string;
  icon: string;
};

export type SupplyTaskRecordFilter = {
  id: "all" | "mainline" | "social" | "reward" | "system";
  label: string;
  active: boolean;
};

export type SupplyTaskRecordTimelineCategory = "mainline" | "social" | "reward" | "draw" | "system";
export type SupplyTaskRecordTimelineStatus = "completed" | "claimed";

export type SupplyTaskRecordDateOption = {
  key: string;
  label: string;
  dateLabel: string;
  weekday: string;
};

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

export type SupplyTaskRecordDrawHistoryItem = {
  id: string;
  drawType: "单抽" | "十连";
  time: string;
  ticketSpent: number;
  guaranteeApplied: boolean;
  guaranteeLabel: string;
  rewards: Array<{ name: string; quantityLabel: string; rarity: string }>;
};

export type SupplyTaskRecordRadarStatus = "pending" | "responded" | "expired";

export type SupplyTaskRecordRadarTab = {
  id: SupplyTaskRecordRadarStatus;
  label: string;
  active: boolean;
};

export type SupplyTaskRecordInvite = {
  id: string;
  avatar: string;
  name: string;
  message: string;
  timeLabel: string;
  status: SupplyTaskRecordRadarStatus;
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
  activeMode: SupplyTaskRecordMode;
  activeDateKey: string;
  dates: SupplyTaskRecordDateOption[];
  recordsByDate: Record<string, SupplyTaskRecordTimelineItem[]>;
  drawHistory: SupplyTaskRecordDrawHistoryItem[];
  rules: string[];
  topBar: {
    resources: SupplyUiLabResource[];
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
  radar: {
    tabs: SupplyTaskRecordRadarTab[];
    invites: SupplyTaskRecordInvite[];
  };
  redemptions: {
    items: SupplyTaskRecordRedemption[];
  };
};
```

- [ ] **Step 3: Run type-aware focused tests and verify current mock failures**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts
```

Expected: FAIL because `mock-data.ts` has not been updated to satisfy the new `SupplyTaskRecordPreview` shape.

## Task 3: Update Task Record Mock Data

**Files:**
- Modify: `components/gamification/ui-lab/supply-task-record/mock-data.ts`

- [ ] **Step 1: Replace the Task Record mock data file**

Replace the full contents of `components/gamification/ui-lab/supply-task-record/mock-data.ts` with:

```typescript
import { supplyUiLabResources } from "../supply-data/resources";
import {
  supplyUiLabDrawHistory,
  supplyUiLabRadarInvites,
  supplyUiLabRecordDates,
  supplyUiLabRecordRules,
  supplyUiLabRecordsByDate,
  supplyUiLabRedemptions,
} from "../supply-data/records";
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
  activeMode: "today",
  activeDateKey: supplyUiLabRecordDates[0]?.key ?? "2026-05-18",
  dates: supplyUiLabRecordDates,
  recordsByDate: supplyUiLabRecordsByDate,
  drawHistory: supplyUiLabDrawHistory,
  rules: supplyUiLabRecordRules,
  topBar: {
    resources: supplyUiLabResources.dashboard,
    profile: {
      username: "Vincent",
      avatar: supplyTaskRecordAssetPaths.profileAvatar,
    },
  },
  sidebar: {
    menuItems: [
      { id: "today", label: "今日记录", icon: "▤" },
      { id: "draws", label: "抽卡记录", icon: "▥" },
      { id: "redemptions", label: "兑换记录", icon: "券" },
      { id: "radar", label: "队友雷达", icon: "●●" },
      { id: "rules", label: "规则说明", icon: "册" },
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
  radar: {
    tabs: [
      { id: "pending", label: "待响应 (3)", active: true },
      { id: "responded", label: "已回应", active: false },
      { id: "expired", label: "已过期", active: false },
    ],
    invites: supplyUiLabRadarInvites,
  },
  redemptions: {
    items: supplyUiLabRedemptions,
  },
};
```

- [ ] **Step 2: Run mock data tests**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts
```

Expected: PASS for mock data and asset tests.

## Task 4: Convert Task Record Scene To A Client State Machine

**Files:**
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`

- [ ] **Step 1: Add client component imports**

At the top of `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`, insert `"use client";` and add React state imports:

```typescript
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
```

Keep the existing imports for `SupplyUiLabActionButton`, `SupplyUiLabFilterBar`, `SupplyUiLabPixelPanel`, `SupplyUiLabStatusBadge`, and `SupplyUiLabTopBar`.

- [ ] **Step 2: Update imported Task Record types**

Replace the current type import with:

```typescript
import type {
  SupplyTaskRecordDateOption,
  SupplyTaskRecordDrawHistoryItem,
  SupplyTaskRecordInvite,
  SupplyTaskRecordMode,
  SupplyTaskRecordPreview,
  SupplyTaskRecordRadarStatus,
  SupplyTaskRecordRedemption,
  SupplyTaskRecordTimelineItem,
} from "./types";
```

- [ ] **Step 3: Add shared tone maps**

Keep `timelineStatusTone` and `redemptionStatusTone`, then add:

```typescript
const radarStatusTone: Record<SupplyTaskRecordRadarStatus, "success" | "warning" | "muted"> = {
  expired: "muted",
  pending: "warning",
  responded: "success",
};

const modeTitles: Record<SupplyTaskRecordMode, string> = {
  draws: "抽卡记录",
  radar: "队友雷达",
  redemptions: "兑换记录",
  rules: "规则说明",
  today: "今日记录",
};
```

- [ ] **Step 4: Replace the `SupplyTaskRecordScene` function**

Replace the existing `SupplyTaskRecordScene` function with:

```tsx
export function SupplyTaskRecordScene({ data }: { data: SupplyTaskRecordPreview }) {
  const [activeMode, setActiveMode] = useState<SupplyTaskRecordMode>(data.activeMode);
  const [activeDateKey, setActiveDateKey] = useState(data.activeDateKey);
  const selectedDate = useMemo(
    () => data.dates.find((date) => date.key === activeDateKey) ?? data.dates[0],
    [activeDateKey, data.dates],
  );
  const selectedRecords = data.recordsByDate[activeDateKey] ?? [];

  return (
    <main className="supply-task-record-scene">
      <div className="supply-task-record-background" aria-hidden="true" />
      <div className="supply-task-record-content">
        <SupplyUiLabTopBar activeLabel="任务记录" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-task-record-shell" aria-label="任务记录静态页">
          <TaskRecordSidebar activeMode={activeMode} data={data} onSelectMode={setActiveMode} />
          <TaskRecordMainPanel
            activeDateKey={activeDateKey}
            activeMode={activeMode}
            data={data}
            records={selectedRecords}
            selectedDate={selectedDate}
            onSelectDate={setActiveDateKey}
          />
          <aside className="supply-task-record-aside" aria-label="任务记录侧栏">
            <TeammateRadarPanel invites={data.radar.invites.filter((invite) => invite.status === "pending")} tabs={data.radar.tabs} />
            <RedemptionStatusPanel items={data.redemptions.items} />
          </aside>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Replace `TaskRecordSidebar`**

Replace the existing `TaskRecordSidebar` function with:

```tsx
function TaskRecordSidebar({
  activeMode,
  data,
  onSelectMode,
}: {
  activeMode: SupplyTaskRecordMode;
  data: SupplyTaskRecordPreview;
  onSelectMode: (mode: SupplyTaskRecordMode) => void;
}) {
  return (
    <aside className="supply-task-record-sidebar" aria-label="任务记录分类">
      <SupplyUiLabPixelPanel
        ariaLabel="任务记录分类"
        className="supply-task-record-sidebar-card"
        title={
          <span className="supply-task-record-sidebar-title">
            <span aria-hidden="true">▣</span>
            任务记录
          </span>
        }
      >
        <nav className="supply-task-record-menu" aria-label="任务记录分类">
          {data.sidebar.menuItems.map((item) => {
            const isActive = item.id === activeMode;

            return (
              <button
                aria-pressed={isActive}
                className={isActive ? "is-active" : undefined}
                key={item.id}
                onClick={() => onSelectMode(item.id)}
                type="button"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
        </nav>
        <div
          className="supply-task-record-sidebar-mascot"
          aria-label="补给大厅引导"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(8, 13, 20, 0.18), rgba(8, 13, 20, 0.82)), url(${data.sidebar.mascot.background})`,
          }}
        >
          <Image alt="" height={124} src={data.sidebar.mascot.hero} unoptimized width={124} />
          <p>记录每次脱脂成果，把银子花在刀刃上。</p>
        </div>
        <Link className="supply-task-record-back-link" href={data.sidebar.backHref}>
          返回大厅
        </Link>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}
```

- [ ] **Step 6: Add `TaskRecordMainPanel` and replace `TaskTimelinePanel`**

Replace the existing `TaskTimelinePanel` function with these functions:

```tsx
function TaskRecordMainPanel({
  activeDateKey,
  activeMode,
  data,
  onSelectDate,
  records,
  selectedDate,
}: {
  activeDateKey: string;
  activeMode: SupplyTaskRecordMode;
  data: SupplyTaskRecordPreview;
  onSelectDate: (dateKey: string) => void;
  records: SupplyTaskRecordTimelineItem[];
  selectedDate?: SupplyTaskRecordDateOption;
}) {
  return (
    <section className="supply-task-record-timeline-panel" aria-labelledby="task-record-title">
      <SupplyUiLabPixelPanel ariaLabel={modeTitles[activeMode]} className="supply-task-record-timeline-card">
        <header className="supply-task-record-timeline-header">
          <div>
            <p>{activeMode === "today" ? selectedDate?.label : "完整视图"}</p>
            <h1 id="task-record-title">{modeTitles[activeMode]}</h1>
          </div>
          <div className="supply-task-record-day">
            <strong>{selectedDate?.dateLabel ?? "最近"}</strong>
            <span>{selectedDate?.weekday ?? "全部记录"}</span>
          </div>
        </header>
        {activeMode === "today" ? (
          <TaskTimelinePanel
            activeDateKey={activeDateKey}
            data={data}
            records={records}
            onSelectDate={onSelectDate}
          />
        ) : null}
        {activeMode === "draws" ? <DrawHistoryPanel draws={data.drawHistory} /> : null}
        {activeMode === "redemptions" ? <RedemptionFullPanel items={data.redemptions.items} /> : null}
        {activeMode === "radar" ? <RadarFullPanel invites={data.radar.invites} /> : null}
        {activeMode === "rules" ? <RulesPanel rules={data.rules} /> : null}
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function TaskTimelinePanel({
  activeDateKey,
  data,
  onSelectDate,
  records,
}: {
  activeDateKey: string;
  data: SupplyTaskRecordPreview;
  onSelectDate: (dateKey: string) => void;
  records: SupplyTaskRecordTimelineItem[];
}) {
  return (
    <>
      <div className="supply-task-record-date-tabs" role="tablist" aria-label="记录日期">
        {data.dates.map((date) => (
          <button
            aria-selected={date.key === activeDateKey}
            key={date.key}
            onClick={() => onSelectDate(date.key)}
            role="tab"
            type="button"
          >
            <span>{date.label}</span>
            <small>{date.dateLabel}</small>
          </button>
        ))}
      </div>
      <div className="supply-task-record-filters">
        <SupplyUiLabFilterBar ariaLabel="记录筛选" filters={data.filters} />
      </div>
      <div className="supply-task-record-timeline" aria-label="任务记录时间线">
        {records.length > 0 ? (
          records.map((record) => <TimelineItem key={record.id} record={record} />)
        ) : (
          <div className="supply-task-record-empty">
            <strong>这一天还没有任务记录</strong>
            <p>空状态来自本地 recordsByDate，不再展示假数据。</p>
          </div>
        )}
      </div>
      <SupplyUiLabActionButton className="supply-task-record-load-more" tone="secondary">
        加载更多记录 <span aria-hidden="true">⌄</span>
      </SupplyUiLabActionButton>
    </>
  );
}
```

- [ ] **Step 7: Add full-view panels below `TimelineItem`**

Add these functions below `TimelineItem`:

```tsx
function DrawHistoryPanel({ draws }: { draws: SupplyTaskRecordDrawHistoryItem[] }) {
  return (
    <div className="supply-task-record-draw-list" aria-label="抽卡历史">
      {draws.map((draw) => (
        <article className="supply-task-record-draw" data-testid="task-record-draw-history" key={draw.id}>
          <div className="supply-task-record-draw-meta">
            <strong>{draw.drawType}</strong>
            <time>{draw.time}</time>
            <span>消耗抽奖券 {draw.ticketSpent}</span>
          </div>
          <SupplyUiLabStatusBadge tone={draw.guaranteeApplied ? "warning" : "muted"}>
            {draw.guaranteeLabel}
          </SupplyUiLabStatusBadge>
          <div className="supply-task-record-reward-grid" aria-label={`${draw.drawType}奖励明细`}>
            {draw.rewards.map((reward) => (
              <span key={`${draw.id}-${reward.name}-${reward.quantityLabel}`}>
                <b>{reward.rarity}</b>
                {reward.name} {reward.quantityLabel}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function RedemptionFullPanel({ items }: { items: SupplyTaskRecordRedemption[] }) {
  return (
    <div className="supply-task-record-full-list" aria-label="完整兑换记录">
      {items.map((item) => (
        <div data-testid="task-record-redemption-full" key={item.id}>
          <RedemptionRecord item={item} />
        </div>
      ))}
    </div>
  );
}

function RadarFullPanel({ invites }: { invites: SupplyTaskRecordInvite[] }) {
  return (
    <div className="supply-task-record-full-list" aria-label="完整队友雷达">
      {invites.map((invite) => (
        <div data-testid="task-record-radar-invite-full" key={invite.id}>
          <InviteRecord invite={invite} />
        </div>
      ))}
    </div>
  );
}

function RulesPanel({ rules }: { rules: string[] }) {
  return (
    <ol className="supply-task-record-rules-list" aria-label="任务记录规则说明">
      {rules.map((rule) => (
        <li data-testid="task-record-rule" key={rule}>
          {rule}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 8: Extract reusable invite and redemption records**

Replace the inline `article` markup inside `TeammateRadarPanel` and `RedemptionStatusPanel` with these reusable helper components:

```tsx
function InviteRecord({ invite }: { invite: SupplyTaskRecordInvite }) {
  return (
    <article className="supply-task-record-invite" data-testid="task-record-radar-invite" key={invite.id}>
      <Image src={invite.avatar} alt={invite.name} width={54} height={54} unoptimized />
      <div>
        <h3>{invite.name}</h3>
        <p>{invite.message}</p>
        <time>{invite.timeLabel}</time>
      </div>
      <div className="supply-task-record-radar-actions">
        <SupplyUiLabStatusBadge tone={radarStatusTone[invite.status]}>{invite.statusLabel}</SupplyUiLabStatusBadge>
        {invite.status === "pending" ? <button type="button">回应</button> : null}
        {invite.status === "pending" ? <button type="button">忽略</button> : null}
      </div>
    </article>
  );
}

function RedemptionRecord({ item }: { item: SupplyTaskRecordRedemption }) {
  return (
    <article className="supply-task-record-redemption" data-status={item.status} data-testid="task-record-redemption">
      <div className="supply-task-record-redemption-icon">
        <Image src={item.icon} alt="" width={54} height={54} unoptimized />
      </div>
      <div>
        <h3>{item.title}</h3>
        <p>{item.requestedAt}</p>
        <p>{item.secondaryLabel}</p>
      </div>
      <SupplyUiLabStatusBadge tone={redemptionStatusTone[item.status]}>{item.statusLabel}</SupplyUiLabStatusBadge>
    </article>
  );
}
```

Then update `TeammateRadarPanel` invite rendering to:

```tsx
{invites.map((invite) => (
  <InviteRecord invite={invite} key={invite.id} />
))}
```

Update `RedemptionStatusPanel` item rendering to:

```tsx
{items.map((item) => (
  <RedemptionRecord item={item} key={item.id} />
))}
```

- [ ] **Step 9: Run scene tests and verify CSS-only failure remains**

Run:

```bash
npm test -- __tests__/supply-task-record-scene.test.tsx
```

Expected: PASS for scene behavior. The full radar and redemption views use `task-record-radar-invite-full` and `task-record-redemption-full` selectors so the persistent right aside does not affect exact-count assertions.

## Task 5: Add Task Record State-Machine CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add Task Record local state-machine CSS**

In `app/globals.css`, add this block after the existing `.supply-task-record-filters .supply-ui-lab-filterbar button` rule and before `.supply-task-record-timeline`:

```css
.supply-task-record-date-tabs {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.45rem;
  overflow-x: auto;
}

.supply-task-record-date-tabs button {
  display: grid;
  gap: 0.12rem;
  min-height: 3rem;
  border: 2px solid #111827;
  background: #ffffff;
  color: #111827;
  padding: 0.38rem 0.5rem;
  font-weight: 1000;
  cursor: pointer;
}

.supply-task-record-date-tabs button[aria-selected="true"] {
  background: #fde047;
  box-shadow: inset 0 -3px 0 rgba(17, 24, 39, 0.22);
}

.supply-task-record-date-tabs small {
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 900;
}

.supply-task-record-empty {
  display: grid;
  place-items: center;
  gap: 0.35rem;
  min-height: 13rem;
  border: 3px dashed #111827;
  background: rgba(255, 255, 255, 0.72);
  padding: 1rem;
  text-align: center;
}

.supply-task-record-empty strong {
  color: #111827;
  font-size: 1.15rem;
  font-weight: 1000;
}

.supply-task-record-empty p {
  margin: 0;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 900;
}

.supply-task-record-draw-list,
.supply-task-record-full-list,
.supply-task-record-rules-list {
  display: grid;
  align-content: start;
  gap: 0.72rem;
  min-height: 0;
  overflow-y: auto;
  padding: 0.1rem 0.12rem 0.2rem 0;
}

.supply-task-record-draw {
  display: grid;
  grid-template-columns: minmax(9rem, 0.82fr) auto minmax(0, 1.5fr);
  align-items: start;
  gap: 0.72rem;
  border: 3px solid #111827;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(17, 24, 39, 0.85);
  padding: 0.82rem;
}

.supply-task-record-draw-meta {
  display: grid;
  gap: 0.25rem;
}

.supply-task-record-draw-meta strong {
  color: #111827;
  font-size: 1.05rem;
  font-weight: 1000;
}

.supply-task-record-draw-meta time,
.supply-task-record-draw-meta span {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 900;
}

.supply-task-record-reward-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.supply-task-record-reward-grid span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.3rem;
  border: 2px solid #111827;
  background: #fff8e8;
  padding: 0.28rem 0.45rem;
  font-size: 0.8rem;
  font-weight: 900;
}

.supply-task-record-reward-grid b {
  display: grid;
  min-width: 2rem;
  min-height: 1.65rem;
  place-items: center;
  border: 2px solid #111827;
  background: #fde047;
  font-size: 0.72rem;
  font-weight: 1000;
}

.supply-task-record-rules-list {
  counter-reset: task-record-rule;
  list-style: none;
  margin: 0;
}

.supply-task-record-rules-list li {
  counter-increment: task-record-rule;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  border: 3px solid #111827;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(17, 24, 39, 0.85);
  padding: 0.82rem;
  color: #111827;
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.45;
}

.supply-task-record-rules-list li::before {
  content: counter(task-record-rule);
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 2px solid #111827;
  background: #fde047;
  font-weight: 1000;
}
```

- [ ] **Step 2: Add responsive CSS for new grids**

Inside the existing `@media (max-width: 768px)` block that already contains `.supply-task-record-entry`, add:

```css
.supply-task-record-date-tabs {
  grid-template-columns: repeat(7, minmax(5.2rem, 1fr));
}

.supply-task-record-draw {
  grid-template-columns: minmax(0, 1fr);
}

.supply-task-record-reward-grid {
  grid-template-columns: minmax(0, 1fr);
}
```

- [ ] **Step 3: Run CSS and scene tests**

Run:

```bash
npm test -- __tests__/supply-task-record-scene-css.test.ts __tests__/supply-task-record-scene.test.tsx
```

Expected: PASS.

## Task 6: Final Verification And Commit

**Files:**
- Verify all Task 8 files.
- Commit only Task 8 files.

- [ ] **Step 1: Run the complete Task Record test set**

Run:

```bash
npm test -- __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the route smoke test**

Run:

```bash
npm test -- __tests__/supply-task-record-ui-lab-route.test.ts
```

Expected: PASS. This confirms `/ui-lab/supply-dashboard/task-record` still renders the scene with static mock data.

- [ ] **Step 3: Search for banned Task Record vocabulary**

Run:

```bash
rg -n "生命票|补给券|牛马币|panelImage|task-record-(sidebar|timeline|radar|redemptions)-panel" components/gamification/ui-lab/supply-task-record components/gamification/ui-lab/supply-data/records.ts __tests__/supply-task-record-*.test.*
```

Expected: no matches.

- [ ] **Step 4: Check git diff for unrelated files**

Run:

```bash
git diff --stat
```

Expected: Task 8 changes should be limited to:

```text
app/globals.css
components/gamification/ui-lab/supply-data/records.ts
components/gamification/ui-lab/supply-task-record/types.ts
components/gamification/ui-lab/supply-task-record/mock-data.ts
components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx
__tests__/supply-task-record-mock-data.test.ts
__tests__/supply-task-record-scene.test.tsx
__tests__/supply-task-record-scene-css.test.ts
```

Unrelated dirty files may already exist from other tasks. Do not stage them.

- [ ] **Step 5: Commit Task 8**

Run:

```bash
git add app/globals.css components/gamification/ui-lab/supply-data/records.ts components/gamification/ui-lab/supply-task-record/types.ts components/gamification/ui-lab/supply-task-record/mock-data.ts components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
git commit -m "feat: add supply task record mock state machine"
```

Expected: commit succeeds with only Task 8 files staged.

## Self-Review Notes

- Spec coverage: side menu modes, today timeline, date tabs, empty date state, draw history, redemption history, teammate radar, rules, and old vocabulary removal are covered.
- Non-goals preserved: no new route, no API calls, no real social invite response, no real redemption mutation.
- Type consistency: `SupplyTaskRecordMode`, `SupplyTaskRecordDateOption`, `SupplyTaskRecordDrawHistoryItem`, `SupplyTaskRecordInvite`, and `SupplyTaskRecordRedemption` are defined before use.
- Risk: the right aside remains visible while full radar/redemption views are active, so tests must use full-view-specific selectors if exact counts are needed.
