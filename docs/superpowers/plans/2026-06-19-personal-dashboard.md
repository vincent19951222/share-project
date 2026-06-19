# 个人 Dashboard 替换牛马日历 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/ui-lab/dashboard` 的纯静态 Dashboard 原型接入真实数据，并替换 `/calendar` 路由，使其成为用户个人健身/饮水的数据看板。

**Architecture:** 后端新增一个 `/api/dashboard/state?period=month|year` 接口，由 `lib/dashboard-state.ts` 统一聚合健身记录（`PunchRecord`/`WorkoutRecord`/`WorkoutEntry`）和饮水记录（`DrinkRecord`）；前端 `DashboardBoard` 通过 `lib/api.ts` 的 `fetchDashboardState` 取数，替换掉当前 `CalendarBoard`。保留现有 Brutalist 视觉风格与日历页装饰素材。

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS v4, Prisma ORM + better-sqlite3, Vitest + jsdom.

## Global Constraints

- TypeScript strict mode: no `any`.
- 所有日期/时区统一使用 `Asia/Shanghai`，通过 `lib/economy.ts` 的 `getShanghaiDayKey(now)` 获取。
- Prisma Client 自定义输出路径 `lib/generated/prisma/client`。
- 不引入新图表库，所有图表用纯 Tailwind/CSS 实现。
- 饮水查询必须带 `deletedAt: null` 软删除过滤。
- 非法 `drinkType` 归入 `other`。
- API 返回统一结构：`{ snapshot }` 成功、`{ error }` 401/500。
- 测试使用 `randomUUID()` 生成唯一用户名/团队 code 保证隔离。
- 每次 task 完成后运行对应测试并通过再 commit。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `lib/types.ts` | 已包含 Dashboard 类型，本计划不再新增 |
| `lib/dashboard-state.ts` | 新增：核心聚合器 `buildDashboardSnapshotForUser(userId, period, now)` |
| `app/api/dashboard/state/route.ts` | 新增：`GET /api/dashboard/state?period=month\|year` |
| `lib/api.ts` | 修改：新增 `fetchDashboardState(period)` |
| `components/dashboard/DashboardBoard.tsx` | 修改：从 mock 数据改为调用 `fetchDashboardState` |
| `components/dashboard/mock-data.ts` | 删除：Phase 0 的纯静态 mock 数据 |
| `components/dashboard/DashboardHeader.tsx` | 不变：周期切换 |
| `components/dashboard/MetricCards.tsx` | 不变：汇总卡 |
| `components/dashboard/WorkoutBalanceChart.tsx` | 不变：训练平衡条形图 |
| `components/dashboard/DrinkBreakdownChart.tsx` | 不变：饮品构成分类图 |
| `components/dashboard/ActivityHeatmap.tsx` | 不变：全年 Heatmap |
| `components/dashboard/MonthCalendar.tsx` | 不变：当月日历 + Tooltip |
| `components/dashboard/DayTooltip.tsx` | 不变：日期详情 Tooltip |
| `components/dashboard/dashboard-data.ts` | 不变：视图 helper |
| `components/board/BoardApp.tsx` | 修改：`activeTab="calendar"` 渲染 `DynamicDashboardBoard` |
| `components/board/dynamic-tabs.tsx` | 修改：新增 `DynamicDashboardBoard` 动态导入 |
| `components/board/tab-component-loaders.ts` | 修改：新增 `loadDashboardBoard` |
| `app/ui-lab/dashboard/page.tsx` | 删除：Phase 0 预览路由 |
| `app/globals.css` | 已有 Dashboard 样式，本计划不再新增 |
| `__tests__/dashboard-state.test.ts` | 新增：聚合器单元测试 |
| `__tests__/dashboard-board.test.tsx` | 新增：Dashboard 组件渲染与交互测试 |
| `__tests__/api-dashboard-state.test.ts` | 新增：API 路由测试 |

---

### Task 1: 后端聚合器 `lib/dashboard-state.ts`

**Files:**
- Create: `lib/dashboard-state.ts`
- Test: `__tests__/dashboard-state.test.ts`（将在 Task 6 实现）

**Interfaces:**
- Consumes: `DashboardPeriod`, `DashboardSnapshot`, `DashboardHeatmapDay`, `WorkoutBalanceItem`, `DrinkBreakdownItem`, `DashboardMonthSnapshot`, `DashboardDayRecord` from `lib/types.ts`; `DrinkType`, `drinkCatalog`, `isDrinkType` from `lib/drinks.ts`; `STRENGTH_PARTS`, `CARDIO_ITEMS` from `lib/workouts.ts`; `getShanghaiDayKey` from `lib/economy.ts`; `prisma` from `lib/prisma.ts`; `buildCalendarMonthSnapshotForUser` from `lib/calendar-state.ts`.
- Produces: `buildDashboardSnapshotForUser(userId: string, period: DashboardPeriod, now?: Date): Promise<DashboardSnapshot | null>`; `buildDashboardMonthSnapshotForUser(userId: string, monthKey: string, now?: Date): Promise<DashboardMonthSnapshot | null>`.

- [ ] **Step 1: 创建 `lib/dashboard-state.ts` 骨架并导入依赖**

```typescript
import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import { drinkCatalog, isDrinkType } from "@/lib/drinks";
import { CARDIO_ITEMS, STRENGTH_PARTS } from "@/lib/workouts";
import { buildCalendarMonthSnapshotForUser } from "@/lib/calendar-state";
import type {
  DashboardDayRecord,
  DashboardDrinkSummary,
  DashboardHeatmapDay,
  DashboardMonthSnapshot,
  DashboardPeriod,
  DashboardSnapshot,
  DashboardWorkoutSummary,
  DrinkBreakdownItem,
  WorkoutBalanceItem,
} from "@/lib/types";

function createEmptyDrinkCounts(): Record<"water" | "milkTea" | "americano" | "latte" | "other", number> {
  return { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 };
}

function createEmptyDrinkBreakdown(): DrinkBreakdownItem[] {
  return (Object.keys(drinkCatalog) as Array<keyof typeof drinkCatalog>).map((type) => ({
    type,
    label: drinkCatalog[type].label,
    count: 0,
    color: drinkCatalog[type].color,
    softColor: drinkCatalog[type].softColor,
    textColor: drinkCatalog[type].textColor,
  }));
}
```

- [ ] **Step 2: 实现 `buildDashboardMonthSnapshotForUser`**

```typescript
export async function buildDashboardMonthSnapshotForUser(
  userId: string,
  monthKey: string,
  now: Date = new Date(),
): Promise<DashboardMonthSnapshot | null> {
  const baseSnapshot = await buildCalendarMonthSnapshotForUser(userId, monthKey, now);
  if (!baseSnapshot) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      workoutRecords: {
        where: {
          dayKey: { startsWith: monthKey },
        },
        include: { entries: true },
      },
      drinkRecords: {
        where: {
          dayKey: { startsWith: monthKey },
          deletedAt: null,
        },
        select: { dayKey: true, drinkType: true },
      },
    },
  });

  const workoutByDay = new Map<number, (typeof user.workoutRecords)[number]>();
  const drinkCountsByDay = new Map<number, Record<keyof typeof drinkCatalog, number>>();

  if (user) {
    for (const record of user.workoutRecords) {
      const day = Number(record.dayKey.slice(8, 10));
      if (day >= 1 && day <= baseSnapshot.totalDays) {
        workoutByDay.set(day, record);
      }
    }

    for (const record of user.drinkRecords) {
      const day = Number(record.dayKey.slice(8, 10));
      if (day < 1 || day > baseSnapshot.totalDays) {
        continue;
      }
      const counts = drinkCountsByDay.get(day) ?? createEmptyDrinkCounts();
      const type = isDrinkType(record.drinkType) ? record.drinkType : "other";
      counts[type] += 1;
      drinkCountsByDay.set(day, counts);
    }
  }

  const days: DashboardDayRecord[] = baseSnapshot.days.map((dayRecord) => {
    const workout = workoutByDay.get(dayRecord.day);
    const drinkCounts = drinkCountsByDay.get(dayRecord.day) ?? createEmptyDrinkCounts();
    const strengthParts =
      workout?.entries
        .filter((entry) => entry.category === "strength")
        .map((entry) => entry.code)
        .filter((code): code is typeof STRENGTH_PARTS[number] =>
          (STRENGTH_PARTS as readonly string[]).includes(code),
        ) ?? [];
    const cardioEntry = workout?.entries.find((entry) => entry.category === "cardio");

    return {
      ...dayRecord,
      workoutMinutes: workout?.durationMinutes ?? 0,
      trainingType:
        workout?.trainingType === "cardio" || workout?.trainingType === "strength" || workout?.trainingType === "both"
          ? workout.trainingType
          : null,
      cardioItem:
        cardioEntry && (CARDIO_ITEMS as readonly string[]).includes(cardioEntry.code)
          ? (cardioEntry.code as typeof CARDIO_ITEMS[number])
          : null,
      strengthParts,
      drinkCounts,
    };
  });

  return {
    ...baseSnapshot,
    days,
  };
}
```

- [ ] **Step 3: 实现 `buildDashboardSnapshotForUser`**

```typescript
export async function buildDashboardSnapshotForUser(
  userId: string,
  period: DashboardPeriod,
  now: Date = new Date(),
): Promise<DashboardSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const year = Number(todayDayKey.slice(0, 4));
  const month = Number(todayDayKey.slice(5, 7));
  const prefix = period === "month" ? currentMonthKey : String(year);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      workoutRecords: {
        where: {
          dayKey: { startsWith: prefix },
        },
        include: { entries: true },
      },
      drinkRecords: {
        where: {
          dayKey: { startsWith: prefix },
          deletedAt: null,
        },
        select: { dayKey: true, drinkType: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const workoutDays = new Set(user.workoutRecords.map((record) => record.dayKey));
  const totalMinutes = user.workoutRecords.reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0);

  const workoutBalance = buildWorkoutBalance(user.workoutRecords);

  const drinkByType = createEmptyDrinkCounts();
  for (const record of user.drinkRecords) {
    const type = isDrinkType(record.drinkType) ? record.drinkType : "other";
    drinkByType[type] += 1;
  }

  const drinkBreakdown: DrinkBreakdownItem[] = (Object.keys(drinkCatalog) as Array<keyof typeof drinkCatalog>).map(
    (type) => ({
      type,
      label: drinkCatalog[type].label,
      count: drinkByType[type],
      color: drinkCatalog[type].color,
      softColor: drinkCatalog[type].softColor,
      textColor: drinkCatalog[type].textColor,
    }),
  );

  const activityByDay: Record<string, { workoutMinutes: number; drinkCups: number }> = {};
  for (const record of user.workoutRecords) {
    activityByDay[record.dayKey] = {
      workoutMinutes: (activityByDay[record.dayKey]?.workoutMinutes ?? 0) + (record.durationMinutes ?? 0),
      drinkCups: activityByDay[record.dayKey]?.drinkCups ?? 0,
    };
  }
  for (const record of user.drinkRecords) {
    activityByDay[record.dayKey] = {
      workoutMinutes: activityByDay[record.dayKey]?.workoutMinutes ?? 0,
      drinkCups: (activityByDay[record.dayKey]?.drinkCups ?? 0) + 1,
    };
  }

  const heatmap = buildHeatmapDays(year, activityByDay);
  const monthCalendar = await buildDashboardMonthSnapshotForUser(userId, currentMonthKey, now);

  if (!monthCalendar) {
    return null;
  }

  return {
    currentUserId: user.id,
    year,
    month,
    currentMonthKey,
    period,
    workoutSummary: {
      days: workoutDays.size,
      totalMinutes,
    },
    drinkSummary: {
      cups: user.drinkRecords.length,
      byType: drinkByType,
    },
    workoutBalance,
    drinkBreakdown,
    heatmap,
    monthCalendar,
  };
}
```

- [ ] **Step 4: 实现辅助函数 `buildWorkoutBalance` 和 `buildHeatmapDays`**

```typescript
function buildWorkoutBalance(workoutRecords: { entries: { category: string; code: string; label: string }[] }[]): WorkoutBalanceItem[] {
  const countMap = new Map<string, { label: string; category: "strength" | "cardio"; count: number }>();

  for (const record of workoutRecords) {
    for (const entry of record.entries) {
      const existing = countMap.get(entry.code);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(entry.code, {
          label: entry.label,
          category: entry.category === "cardio" ? "cardio" : "strength",
          count: 1,
        });
      }
    }
  }

  const balance: WorkoutBalanceItem[] = [];
  for (const part of STRENGTH_PARTS) {
    const item = countMap.get(part);
    balance.push({
      code: part,
      label: item?.label ?? part,
      category: "strength",
      count: item?.count ?? 0,
    });
  }
  for (const item of CARDIO_ITEMS) {
    const found = countMap.get(item);
    balance.push({
      code: item,
      label: found?.label ?? item,
      category: "cardio",
      count: found?.count ?? 0,
    });
  }

  return balance;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getIntensityLevel(workoutMinutes: number, drinkCups: number): 0 | 1 | 2 | 3 | 4 {
  if (workoutMinutes === 0 && drinkCups === 0) {
    return 0;
  }
  const score =
    (workoutMinutes >= 90 ? 4 : workoutMinutes >= 60 ? 3 : workoutMinutes >= 30 ? 2 : workoutMinutes > 0 ? 1 : 0) +
    Math.min(2, Math.floor(drinkCups / 2));
  if (score >= 5) return 4;
  if (score >= 3) return 3;
  if (score >= 2) return 2;
  if (score >= 1) return 1;
  return 0;
}

function buildHeatmapDays(
  year: number,
  activityByDay: Record<string, { workoutMinutes: number; drinkCups: number }>,
): DashboardHeatmapDay[] {
  const totalDays = isLeapYear(year) ? 366 : 365;
  const days: DashboardHeatmapDay[] = [];

  for (let dayOfYear = 1; dayOfYear <= totalDays; dayOfYear += 1) {
    const date = new Date(Date.UTC(year, 0, dayOfYear));
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const dayKey = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const activity = activityByDay[dayKey] ?? { workoutMinutes: 0, drinkCups: 0 };

    days.push({
      dayKey,
      month,
      day,
      workoutMinutes: activity.workoutMinutes,
      drinkCups: activity.drinkCups,
      intensityLevel: getIntensityLevel(activity.workoutMinutes, activity.drinkCups),
    });
  }

  return days;
}
```

- [ ] **Step 5: 运行 TypeScript 检查**

Run: `npm run lint`
Expected: `tsc --noEmit` passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard-state.ts
git commit -m "feat(dashboard): add backend state aggregator

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: API 路由 `app/api/dashboard/state/route.ts`

**Files:**
- Create: `app/api/dashboard/state/route.ts`
- Test: `__tests__/api-dashboard-state.test.ts`（将在 Task 8 实现）

**Interfaces:**
- Consumes: `parseCookieValue` from `lib/auth.ts`; `buildDashboardSnapshotForUser` from `lib/dashboard-state.ts`; `getShanghaiDayKey` from `lib/economy.ts`; `DashboardPeriod` from `lib/types.ts`.
- Produces: `GET /api/dashboard/state?period=month|year` returns `{ snapshot: DashboardSnapshot }` or `{ error: string }` with 401/500.

- [ ] **Step 1: 创建 API 路由文件**

```typescript
import { NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { getShanghaiDayKey } from "@/lib/economy";
import { buildDashboardSnapshotForUser } from "@/lib/dashboard-state";
import type { DashboardPeriod } from "@/lib/types";

export async function GET(request: Request) {
  const userId = parseCookieValue(request.headers.get("cookie")?.match(/userId=([^;]+)/)?.[1]);

  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get("period");
  const period: DashboardPeriod = rawPeriod === "year" ? "year" : "month";

  try {
    const snapshot = await buildDashboardSnapshotForUser(userId, period);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Dashboard state error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

Wait - cookie parsing in Next.js App Router: use `cookies()` from `next/headers` or parse manually. The existing routes use `request.cookies.get("userId")?.value`. Let's follow that pattern.

Correct Step 1 code:

```typescript
import { NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { getShanghaiDayKey } from "@/lib/economy";
import { buildDashboardSnapshotForUser } from "@/lib/dashboard-state";
import type { DashboardPeriod } from "@/lib/types";

export async function GET(request: Request) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);

  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get("period");
  const period: DashboardPeriod = rawPeriod === "year" ? "year" : "month";

  try {
    const snapshot = await buildDashboardSnapshotForUser(userId, period);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Dashboard state error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 运行 TypeScript 检查**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add app/api/dashboard/state/route.ts
git commit -m "feat(dashboard): add GET /api/dashboard/state route

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 前端数据获取 `lib/api.ts`

**Files:**
- Modify: `lib/api.ts`
- Test: `__tests__/dashboard-board.test.tsx`（将在 Task 7 实现）

**Interfaces:**
- Consumes: `DashboardPeriod`, `DashboardSnapshot` from `lib/types.ts`.
- Produces: `fetchDashboardState(period: DashboardPeriod): Promise<DashboardSnapshot>`.

- [ ] **Step 1: 在 `lib/api.ts` 中新增 `fetchDashboardState`**

Add near existing `fetchCalendarState`:

```typescript
import type { DashboardPeriod, DashboardSnapshot } from "@/lib/types";

export async function fetchDashboardState(period: DashboardPeriod): Promise<DashboardSnapshot> {
  const response = await fetch(`/api/dashboard/state?period=${period}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(body.error ?? `请求失败: ${response.status}`);
  }

  const data = (await response.json()) as { snapshot: DashboardSnapshot };
  return data.snapshot;
}
```

- [ ] **Step 2: 运行 TypeScript 检查**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat(dashboard): add fetchDashboardState client helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 改造 `DashboardBoard` 接入真实数据

**Files:**
- Modify: `components/dashboard/DashboardBoard.tsx`
- Delete: `components/dashboard/mock-data.ts`
- Test: `__tests__/dashboard-board.test.tsx`（将在 Task 7 实现）

**Interfaces:**
- Consumes: `fetchDashboardState` from `lib/api.ts`; `DashboardPeriod` from `lib/types.ts`; `CALENDAR_REFRESH_EVENT` from `lib/calendar-refresh.ts`.
- Produces: `DashboardBoard` component that fetches real data, handles loading/error, and refreshes on calendar refresh events.

- [ ] **Step 1: 重写 `components/dashboard/DashboardBoard.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { fetchDashboardState } from "@/lib/api";
import { CALENDAR_REFRESH_EVENT } from "@/lib/calendar-refresh";
import type { DashboardPeriod, DashboardSnapshot } from "@/lib/types";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DashboardHeader } from "./DashboardHeader";
import { DrinkBreakdownChart } from "./DrinkBreakdownChart";
import { MetricCards } from "./MetricCards";
import { MonthCalendar } from "./MonthCalendar";
import { WorkoutBalanceChart } from "./WorkoutBalanceChart";

export function DashboardBoard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBusy(true);
      setError(null);

      try {
        const nextSnapshot = await fetchDashboardState(period);
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Dashboard 加载失败");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    function handleRefresh() {
      let cancelled = false;

      async function load() {
        try {
          const nextSnapshot = await fetchDashboardState(period);
          if (!cancelled) {
            setSnapshot(nextSnapshot);
            setError(null);
          }
        } catch (caught) {
          if (!cancelled) {
            setError(caught instanceof Error ? caught.message : "Dashboard 刷新失败");
          }
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    };
  }, [period]);

  return (
    <section className="calendar-board-viewport absolute inset-0">
      <div className="calendar-scene">
        <div className="calendar-scene-background" aria-hidden="true" />
        <div className="calendar-scene-props" aria-hidden="true">
          <img
            className="calendar-prop calendar-prop-rings"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_binder_rings_left.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-clip"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_binder_clip.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-highlighter"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_highlighter_focus_progress.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-sticker"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_sticker_just_lift.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-note"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_note_keep_going_purple.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-stamp"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_calendar_coffee_stamp_paper.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-stain"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_calendar_coffee_ring_stain.webp"
            alt=""
          />
        </div>

        <div className="calendar-scene-content">
          <div className="calendar-binder-shell">
            <div className="calendar-paper-surface dashboard-paper-surface">
              <DashboardHeader period={period} onPeriodChange={setPeriod} />

              <div className="dashboard-content-scroll">
                {error ? (
                  <div className="dashboard-loading-state">{error}</div>
                ) : snapshot && !busy ? (
                  <>
                    <MetricCards
                      workoutSummary={snapshot.workoutSummary}
                      drinkSummary={snapshot.drinkSummary}
                    />

                    <div className="dashboard-charts-row">
                      <WorkoutBalanceChart items={snapshot.workoutBalance} />
                      <DrinkBreakdownChart items={snapshot.drinkBreakdown} />
                    </div>

                    <ActivityHeatmap days={snapshot.heatmap} year={snapshot.year} />

                    <MonthCalendar snapshot={snapshot.monthCalendar} />
                  </>
                ) : (
                  <div className="dashboard-loading-state">Dashboard 加载中...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 删除 `components/dashboard/mock-data.ts`**

```bash
rm components/dashboard/mock-data.ts
```

- [ ] **Step 3: 运行 TypeScript 检查**

Run: `npm run lint`
Expected: passes. If any imports from `mock-data.ts` remain, fix them.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/DashboardBoard.tsx components/dashboard/mock-data.ts
git commit -m "feat(dashboard): wire DashboardBoard to real API

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 替换 `/calendar` 路由

**Files:**
- Modify: `components/board/BoardApp.tsx`
- Modify: `components/board/dynamic-tabs.tsx`
- Modify: `components/board/tab-component-loaders.ts`
- Delete: `app/ui-lab/dashboard/page.tsx`

**Interfaces:**
- Consumes: existing `DynamicCalendarBoard` and new `DynamicDashboardBoard`.
- Produces: `/calendar` renders the new Dashboard instead of the old CalendarBoard.

- [ ] **Step 1: 在 `components/board/tab-component-loaders.ts` 新增 loader**

Add after existing loaders:

```typescript
export async function loadDashboardBoard() {
  const { DashboardBoard } = await import("@/components/dashboard/DashboardBoard");
  return DashboardBoard;
}
```

- [ ] **Step 2: 在 `components/board/dynamic-tabs.tsx` 新增 dynamic export**

Add after existing dynamic tabs:

```typescript
export const DynamicDashboardBoard = dynamic(() =>
  import("./tab-component-loaders").then((mod) =>
    mod.loadDashboardBoard().then((Component) => ({ default: Component })),
  ),
);
```

- [ ] **Step 3: 修改 `components/board/BoardApp.tsx` 的 calendar case**

Replace:

```typescript
case "calendar":
  return <DynamicCalendarBoard />;
```

With:

```typescript
case "calendar":
  return <DynamicDashboardBoard />;
```

- [ ] **Step 4: 删除 `/ui-lab/dashboard` 预览路由**

```bash
rm -rf app/ui-lab/dashboard
```

- [ ] **Step 5: 运行 TypeScript 检查**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add components/board/BoardApp.tsx components/board/dynamic-tabs.tsx components/board/tab-component-loaders.ts app/ui-lab/dashboard
git commit -m "feat(dashboard): replace /calendar with new Dashboard

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 聚合器单元测试 `__tests__/dashboard-state.test.ts`

**Files:**
- Create: `__tests__/dashboard-state.test.ts`
- Depends on: Task 1.

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`; `buildDashboardSnapshotForUser`, `buildDashboardMonthSnapshotForUser` from `lib/dashboard-state.ts`; `hashPassword` from `lib/auth.ts`; `getShanghaiDayKey` from `lib/economy.ts`.

- [ ] **Step 1: 创建测试文件并添加 setup helper**

```typescript
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  buildDashboardMonthSnapshotForUser,
  buildDashboardSnapshotForUser,
} from "@/lib/dashboard-state";

async function createTestUser() {
  const team = await prisma.team.create({
    data: {
      code: `team-${randomUUID()}`,
      name: "测试战队",
    },
  });

  const passwordHash = await hashPassword("0000");
  const user = await prisma.user.create({
    data: {
      username: `user-${randomUUID()}`,
      name: "测试用户",
      password: passwordHash,
      avatarKey: "male1",
      teamId: team.id,
    },
  });

  return { user, team };
}

async function createPunchWithWorkout(
  userId: string,
  teamId: string,
  dayKey: string,
  payload: {
    trainingType: "cardio" | "strength" | "both";
    cardioItem?: string;
    strengthParts?: string[];
    durationMinutes: number;
  },
) {
  const punch = await prisma.punchRecord.create({
    data: {
      userId,
      teamId,
      dayKey,
      punched: true,
      punchType: "workout",
    },
  });

  const entries: { category: string; code: string; label: string }[] = [];
  if ((payload.trainingType === "cardio" || payload.trainingType === "both") && payload.cardioItem) {
    entries.push({ category: "cardio", code: payload.cardioItem, label: payload.cardioItem });
  }
  if (payload.trainingType === "strength" || payload.trainingType === "both") {
    for (const part of payload.strengthParts ?? []) {
      entries.push({ category: "strength", code: part, label: part });
    }
  }

  await prisma.workoutRecord.create({
    data: {
      userId,
      teamId,
      punchRecordId: punch.id,
      dayKey,
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        create: entries,
      },
    },
  });
}

async function createDrink(
  userId: string,
  teamId: string,
  dayKey: string,
  drinkType: string,
) {
  await prisma.drinkRecord.create({
    data: {
      userId,
      teamId,
      dayKey,
      drinkType,
    },
  });
}
```

- [ ] **Step 2: 添加 month snapshot 测试**

```typescript
describe("buildDashboardMonthSnapshotForUser", () => {
  it("aggregates workout and drink details by day", async () => {
    const { user, team } = await createTestUser();
    const monthKey = getShanghaiDayKey(new Date()).slice(0, 7);
    const dayKey = `${monthKey}-05`;

    await createPunchWithWorkout(user.id, team.id, dayKey, {
      trainingType: "both",
      cardioItem: "treadmill",
      strengthParts: ["chest", "abs"],
      durationMinutes: 60,
    });
    await createDrink(user.id, team.id, dayKey, "water");
    await createDrink(user.id, team.id, dayKey, "americano");

    const snapshot = await buildDashboardMonthSnapshotForUser(user.id, monthKey);

    expect(snapshot).not.toBeNull();
    const day = snapshot!.days.find((d) => d.day === 5);
    expect(day?.workedOut).toBe(true);
    expect(day?.workoutMinutes).toBe(60);
    expect(day?.trainingType).toBe("both");
    expect(day?.cardioItem).toBe("treadmill");
    expect(day?.strengthParts).toEqual(["chest", "abs"]);
    expect(day?.drinkCups).toBe(2);
    expect(day?.drinkCounts.water).toBe(1);
    expect(day?.drinkCounts.americano).toBe(1);
  });
});
```

- [ ] **Step 3: 添加 dashboard snapshot 测试**

```typescript
describe("buildDashboardSnapshotForUser", () => {
  it("returns month workout and drink summaries", async () => {
    const { user, team } = await createTestUser();
    const monthKey = getShanghaiDayKey(new Date()).slice(0, 7);
    const dayKey = `${monthKey}-10`;

    await createPunchWithWorkout(user.id, team.id, dayKey, {
      trainingType: "strength",
      strengthParts: ["arms", "shoulder"],
      durationMinutes: 50,
    });
    await createDrink(user.id, team.id, dayKey, "latte");

    const snapshot = await buildDashboardSnapshotForUser(user.id, "month");

    expect(snapshot).not.toBeNull();
    expect(snapshot!.workoutSummary.days).toBe(1);
    expect(snapshot!.workoutSummary.totalMinutes).toBe(50);
    expect(snapshot!.drinkSummary.cups).toBe(1);
    expect(snapshot!.drinkSummary.byType.latte).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "arms")?.count).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "shoulder")?.count).toBe(1);
  });

  it("aggregates full year data when period is year", async () => {
    const { user, team } = await createTestUser();
    const year = Number(getShanghaiDayKey(new Date()).slice(0, 4));

    await createPunchWithWorkout(user.id, team.id, `${year}-01-15`, {
      trainingType: "cardio",
      cardioItem: "swim",
      durationMinutes: 30,
    });
    await createPunchWithWorkout(user.id, team.id, `${year}-06-15`, {
      trainingType: "cardio",
      cardioItem: "swim",
      durationMinutes: 40,
    });
    await createDrink(user.id, team.id, `${year}-03-10`, "water");

    const snapshot = await buildDashboardSnapshotForUser(user.id, "year");

    expect(snapshot).not.toBeNull();
    expect(snapshot!.workoutSummary.days).toBe(2);
    expect(snapshot!.workoutSummary.totalMinutes).toBe(70);
    expect(snapshot!.drinkSummary.cups).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "swim")?.count).toBe(2);
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `npm test -- __tests__/dashboard-state.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/dashboard-state.test.ts
git commit -m "test(dashboard): add dashboard-state aggregator tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 组件测试 `__tests__/dashboard-board.test.tsx`

**Files:**
- Create: `__tests__/dashboard-board.test.tsx`
- Depends on: Task 4.

**Interfaces:**
- Consumes: `DashboardBoard` from `components/dashboard/DashboardBoard`; `createMockDashboardSnapshot` pattern.

- [ ] **Step 1: 创建测试文件**

```typescript
import { act, createRoot } from "react-dom/client";
import { DashboardBoard } from "@/components/dashboard/DashboardBoard";

function createMockSnapshot(period: "month" | "year") {
  return {
    currentUserId: "user-1",
    year: 2026,
    month: 6,
    currentMonthKey: "2026-06",
    period,
    workoutSummary: { days: 12, totalMinutes: 450 },
    drinkSummary: {
      cups: 55,
      byType: { water: 32, milkTea: 4, americano: 12, latte: 6, other: 1 },
    },
    workoutBalance: [
      { code: "chest", label: "胸", category: "strength" as const, count: 4 },
      { code: "back", label: "背", category: "strength" as const, count: 3 },
      { code: "shoulder", label: "肩", category: "strength" as const, count: 2 },
      { code: "arms", label: "手臂", category: "strength" as const, count: 3 },
      { code: "glutes", label: "臀", category: "strength" as const, count: 1 },
      { code: "legs", label: "腿", category: "strength" as const, count: 2 },
      { code: "abs", label: "腹", category: "strength" as const, count: 4 },
      { code: "treadmill", label: "跑步机", category: "cardio" as const, count: 3 },
      { code: "elliptical", label: "椭圆机", category: "cardio" as const, count: 1 },
      { code: "walk", label: "散步", category: "cardio" as const, count: 2 },
      { code: "swim", label: "游泳", category: "cardio" as const, count: 2 },
    ],
    drinkBreakdown: [
      { type: "water" as const, label: "水", count: 32, color: "#4fb8d6", softColor: "#e8f8fc", textColor: "#0087a6" },
      { type: "milkTea" as const, label: "奶茶", count: 4, color: "#ef7f8f", softColor: "#fff1ee", textColor: "#e96f83" },
      { type: "americano" as const, label: "美式", count: 12, color: "#7a5438", softColor: "#fff3df", textColor: "#76411f" },
      { type: "latte" as const, label: "拿铁", count: 6, color: "#ef9d36", softColor: "#fff4dd", textColor: "#e4841b" },
      { type: "other" as const, label: "其他", count: 1, color: "#8f948e", softColor: "#f4f3ed", textColor: "#555555" },
    ],
    heatmap: [],
    monthCalendar: {
      monthKey: "2026-06",
      currentMonthKey: "2026-06",
      todayDay: 19,
      totalDays: 30,
      workoutDays: 12,
      drinkCupTotal: 55,
      coffeeCupTotal: 55,
      days: [],
    },
  };
}

describe("DashboardBoard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ snapshot: createMockSnapshot("month") }),
    });
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("renders dashboard title and period toggle", async () => {
    await act(async () => {
      createRoot(container).render(<DashboardBoard />);
    });

    expect(container.textContent).toContain("牛马日历");
    expect(container.textContent).toContain("本月");
    expect(container.textContent).toContain("本年");
  });

  it("switches period and refetches", async () => {
    await act(async () => {
      createRoot(container).render(<DashboardBoard />);
    });

    const yearButton = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("本年"),
    );

    await act(async () => {
      yearButton?.click();
    });

    expect(global.fetch).toHaveBeenLastCalledWith("/api/dashboard/state?period=year", expect.any(Object));
  });
});
```

- [ ] **Step 2: 运行测试**

Run: `npm test -- __tests__/dashboard-board.test.tsx`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/dashboard-board.test.tsx
git commit -m "test(dashboard): add DashboardBoard component tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: API 路由测试 `__tests__/api-dashboard-state.test.ts`

**Files:**
- Create: `__tests__/api-dashboard-state.test.ts`
- Depends on: Task 2.

**Interfaces:**
- Consumes: `GET` handler from `app/api/dashboard/state/route.ts`; `NextRequest` from `next/server`.

- [ ] **Step 1: 创建测试文件**

```typescript
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/state/route";
import { signCookieValue } from "@/lib/auth";

function createRequest(cookie?: string, period?: string) {
  const url = period ? `http://localhost:3000/api/dashboard/state?period=${period}` : "http://localhost:3000/api/dashboard/state";
  const request = new NextRequest(url);
  if (cookie) {
    request.headers.set("cookie", `userId=${cookie}`);
  }
  return request;
}

describe("GET /api/dashboard/state", () => {
  it("returns 401 when no cookie", async () => {
    const response = await GET(createRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("未登录");
  });

  it("returns 401 for invalid user", async () => {
    const cookie = await signCookieValue("nonexistent-user-id");
    const response = await GET(createRequest(cookie));
    expect(response.status).toBe(401);
  });
});
```

Note: `signCookieValue` may not exist in `lib/auth.ts`. If not, use the same cookie signing function used elsewhere in tests, or import the actual implementation. Check existing API route tests for cookie handling pattern.

- [ ] **Step 2: 运行测试**

Run: `npm test -- __tests__/api-dashboard-state.test.ts`
Expected: tests pass. Adjust cookie signing import based on actual `lib/auth.ts` exports.

- [ ] **Step 3: Commit**

```bash
git add __tests__/api-dashboard-state.test.ts
git commit -m "test(dashboard): add dashboard state API tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: 最终验证与清理

**Files:**
- All modified/created files above.

- [ ] **Step 1: 运行完整测试套件**

Run: `npm test`
Expected: all tests pass. If dashboard-related tests fail, fix and rerun.

- [ ] **Step 2: 运行 linter 和构建**

Run: `npm run lint && npm run build`
Expected: `tsc --noEmit` passes and `next build` completes without errors.

- [ ] **Step 3: 启动开发服务器并手动验证**

Run: `npm run dev`
Open: `http://localhost:3001/calendar`
Verify:
- Dashboard renders with real data.
- Month/year toggle works and updates data.
- Heatmap shows active days.
- Calendar cells show tooltips on hover.
- Clicking a calendar cell on mobile shows tooltip.
- After punching in or drinking, the `calendar:refresh` event updates the Dashboard.

- [ ] **Step 4: 清理临时原型截图文件**

```bash
rm -f dashboard-*.png
```

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat(dashboard): replace calendar with personal dashboard

- Add dashboard-state aggregator for workout/drink stats
- Add GET /api/dashboard/state endpoint
- Wire DashboardBoard to real data
- Replace /calendar route with new Dashboard
- Add unit and API tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 本月/本年健身汇总（天数、时长） — Task 1, Task 4
- ✅ 训练平衡（11 部位/有氧频次） — Task 1, Task 4
- ✅ 喝水汇总与分类 — Task 1, Task 4
- ✅ 全年 Heatmap — Task 1, Task 4
- ✅ 增强当月日历 — Task 1, Task 4
- ✅ 替换 `/calendar` — Task 5
- ✅ 测试覆盖 — Task 6, 7, 8

**2. Placeholder scan:**
- 无 TBD/TODO/"implement later"。
- 所有代码步骤均包含完整代码。
- 所有测试步骤均包含完整测试代码。
- 注意：Task 8 的 cookie signing 函数需要根据 `lib/auth.ts` 实际导出调整；已在步骤中说明。

**3. Type consistency:**
- `DashboardPeriod` 始终为 `"month" | "year"`。
- `buildDashboardSnapshotForUser` 签名在 Task 1 定义，Task 2 调用一致。
- `fetchDashboardState` 在 Task 3 定义，Task 4 使用一致。
- `DashboardSnapshot` 类型已在 `lib/types.ts` 中定义。
