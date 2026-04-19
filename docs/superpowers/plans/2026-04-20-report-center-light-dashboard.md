# Report Center Light Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `战报中心` as a lightweight dashboard driven by existing `BoardState` data.

**Architecture:** Add one pure report-data helper that derives metrics, highlights, and chart points from `BoardState`. Keep the existing `components/report-center/` module boundary, but make the UI components receive derived props instead of rendering fixed prototype content.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Tailwind CSS utility classes, Vitest + jsdom.

---

## File Structure

- Create: `components/report-center/report-data.ts`
  - Pure helper for all dashboard calculations.
  - Exports `buildReportData(state, now?)` and related types.
- Create: `__tests__/report-center-data.test.ts`
  - Unit coverage for total punches, completion rate, full-attendance days, peak/low days, member highlight, and sparse data.
- Create: `__tests__/report-center-component.test.tsx`
  - Lightweight render test for `ReportCenter` inside `BoardProvider`.
- Modify: `components/report-center/ReportCenter.tsx`
  - Reads `BoardState`, builds report data with `useMemo`, and lays out the dashboard.
- Modify: `components/report-center/ReportHeader.tsx`
  - Replaces hardcoded `OCTOBER REPORT` and fake score with report title, summary, and vault progress.
- Modify: `components/report-center/Milestones.tsx`
  - Keeps filename but changes role to four compact metric cards.
- Modify: `components/report-center/TrendChart.tsx`
  - Renders SVG from real `dailyPoints`.
- Modify: `components/report-center/Highlights.tsx`
  - Replaces static Bob/Dave cards with lightweight report highlights.

---

### Task 1: Add Report Data Derivation

**Files:**
- Create: `components/report-center/report-data.ts`
- Create: `__tests__/report-center-data.test.ts`

- [ ] **Step 1: Write the failing data tests**

Create `__tests__/report-center-data.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildReportData } from "@/components/report-center/report-data";
import type { BoardState } from "@/lib/types";

function createState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1" },
      { id: "u2", name: "luo", avatarKey: "male2" },
      { id: "u3", name: "liu", avatarKey: "female1" },
    ],
    gridData: [
      [true, true, false, true, null],
      [true, false, false, true, null],
      [true, true, false, false, null],
    ],
    teamCoins: 1450,
    targetCoins: 2000,
    today: 4,
    totalDays: 5,
    logs: [],
    activeTab: "dash",
    currentUserId: "u1",
    ...overrides,
  };
}

describe("buildReportData", () => {
  it("derives lightweight dashboard metrics from board state", () => {
    const report = buildReportData(createState(), new Date("2026-04-20T12:00:00+08:00"));

    expect(report.title).toBe("APRIL DASHBOARD");
    expect(report.summary).toBe("本月打卡 7 次，全勤 1 天，团队节奏还有上升空间。");
    expect(report.teamVault).toEqual({ current: 1450, target: 2000, progress: 73 });
    expect(report.metrics.map((metric) => [metric.label, metric.value])).toEqual([
      ["团队完成率", "58%"],
      ["总打卡次数", "7"],
      ["全勤日", "1"],
      ["本月高光", "最稳：li"],
    ]);
    expect(report.metrics[3].helper).toBe("最长连续 2 天没掉链子");
    expect(report.dailyPoints.map((point) => [point.day, point.count, point.isFullAttendance])).toEqual([
      [1, 3, true],
      [2, 2, false],
      [3, 0, false],
      [4, 2, false],
    ]);
    expect(report.peakDay).toEqual({ day: 1, count: 3 });
    expect(report.lowDay).toEqual({ day: 3, count: 0 });
    expect(report.highlights.map((highlight) => highlight.title)).toEqual([
      "气氛组播报",
      "团队小结",
      "轻提醒",
    ]);
  });

  it("uses safe fallbacks when there is no elapsed member data", () => {
    const report = buildReportData(
      createState({
        members: [],
        gridData: [],
        teamCoins: 0,
        targetCoins: 0,
        today: 0,
        totalDays: 0,
      }),
      new Date("2026-04-20T12:00:00+08:00"),
    );

    expect(report.summary).toBe("本月打卡 0 次，全勤 0 天，先攒一点数据再看趋势。");
    expect(report.teamVault).toEqual({ current: 0, target: 0, progress: 0 });
    expect(report.metrics.map((metric) => metric.value)).toEqual(["0%", "0", "0", "暂无高光"]);
    expect(report.dailyPoints).toEqual([]);
    expect(report.peakDay).toBeNull();
    expect(report.lowDay).toBeNull();
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm test -- __tests__/report-center-data.test.ts
```

Expected: fail because `components/report-center/report-data.ts` does not exist.

- [ ] **Step 3: Add the data helper**

Create `components/report-center/report-data.ts`:

```typescript
import type { BoardState } from "@/lib/types";

export interface ReportMetric {
  label: string;
  value: string;
  helper: string;
  tone: "plain" | "good" | "warm";
}

export interface DailyTrendPoint {
  day: number;
  count: number;
  isFullAttendance: boolean;
  isPeak: boolean;
  isLow: boolean;
}

export interface ReportHighlight {
  title: string;
  body: string;
  tone: "blue" | "green" | "rose";
}

export interface ReportDaySummary {
  day: number;
  count: number;
}

export interface ReportData {
  title: string;
  summary: string;
  teamVault: {
    current: number;
    target: number;
    progress: number;
  };
  metrics: ReportMetric[];
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
  highlights: ReportHighlight[];
}

interface StreakSummary {
  name: string;
  streak: number;
}

function clampElapsedDays(state: BoardState) {
  return Math.max(0, Math.min(state.today, state.totalDays));
}

function countPunchesForDay(state: BoardState, dayIndex: number) {
  return state.gridData.reduce((count, row) => count + (row[dayIndex] === true ? 1 : 0), 0);
}

function getLongestStreak(state: BoardState, elapsedDays: number): StreakSummary | null {
  let best: StreakSummary | null = null;

  state.members.forEach((member, memberIndex) => {
    const row = state.gridData[memberIndex] ?? [];
    let current = 0;
    let longest = 0;

    for (let dayIndex = 0; dayIndex < elapsedDays; dayIndex += 1) {
      if (row[dayIndex] === true) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }

    if (!best || longest > best.streak) {
      best = { name: member.name, streak: longest };
    }
  });

  return best && best.streak > 0 ? best : null;
}

function getDashboardTitle(now: Date) {
  const month = now.toLocaleString("en-US", { month: "long" }).toUpperCase();
  return `${month} DASHBOARD`;
}

function getSummary(totalPunches: number, fullAttendanceDays: number, completionRate: number) {
  if (totalPunches === 0) {
    return "本月打卡 0 次，全勤 0 天，先攒一点数据再看趋势。";
  }

  const rhythm = completionRate >= 80 ? "团队节奏稳住了" : "团队节奏还有上升空间";
  return `本月打卡 ${totalPunches} 次，全勤 ${fullAttendanceDays} 天，${rhythm}。`;
}

function getCompletionHelper(completionRate: number) {
  if (completionRate >= 90) return "很顶，几乎全员在线";
  if (completionRate >= 75) return "节奏不错，继续保持";
  if (completionRate > 0) return "还有上升空间";
  return "等第一批打卡点亮";
}

function getHighlights(
  completionRate: number,
  fullAttendanceDays: number,
  peakDay: ReportDaySummary | null,
  lowDay: ReportDaySummary | null,
  memberCount: number,
): ReportHighlight[] {
  const teamSummary =
    completionRate >= 80
      ? "最近整体完成率不错，说明团队节奏正在稳定。"
      : "目前波动还比较明显，先把连续打卡节奏养起来。";

  const cheerBody = peakDay
    ? `第 ${peakDay.day} 天有 ${peakDay.count}/${memberCount} 人打卡，是本段最高点。`
    : "暂无足够数据，等大家点亮第一批格子。";

  const reminderBody =
    lowDay && memberCount > 0 && lowDay.count < memberCount
      ? `第 ${lowDay.day} 天是低谷，提前约一波会更稳。`
      : "目前没有明显低谷，保持这个节奏就很好。";

  return [
    { title: "气氛组播报", body: cheerBody, tone: "blue" },
    { title: "团队小结", body: teamSummary, tone: "green" },
    { title: "轻提醒", body: reminderBody, tone: "rose" },
  ];
}

export function buildReportData(state: BoardState, now = new Date()): ReportData {
  const elapsedDays = clampElapsedDays(state);
  const memberCount = state.members.length;
  const elapsedMemberDays = memberCount * elapsedDays;

  const rawDailyCounts = Array.from({ length: elapsedDays }, (_, dayIndex) => ({
    day: dayIndex + 1,
    count: countPunchesForDay(state, dayIndex),
  }));

  const totalPunches = rawDailyCounts.reduce((sum, point) => sum + point.count, 0);
  const completionRate =
    elapsedMemberDays > 0 ? Math.round((totalPunches / elapsedMemberDays) * 100) : 0;
  const fullAttendanceDays =
    memberCount > 0 ? rawDailyCounts.filter((point) => point.count === memberCount).length : 0;

  const peakDay = rawDailyCounts.reduce<ReportDaySummary | null>(
    (best, point) => (!best || point.count > best.count ? point : best),
    null,
  );
  const lowDay = rawDailyCounts.reduce<ReportDaySummary | null>(
    (best, point) => (!best || point.count < best.count ? point : best),
    null,
  );

  const dailyPoints = rawDailyCounts.map((point) => ({
    ...point,
    isFullAttendance: memberCount > 0 && point.count === memberCount,
    isPeak: peakDay?.day === point.day,
    isLow: lowDay?.day === point.day,
  }));

  const mostConsistentMember = getLongestStreak(state, elapsedDays);
  const vaultProgress =
    state.targetCoins > 0 ? Math.min(100, Math.round((state.teamCoins / state.targetCoins) * 100)) : 0;

  return {
    title: getDashboardTitle(now),
    summary: getSummary(totalPunches, fullAttendanceDays, completionRate),
    teamVault: {
      current: state.teamCoins,
      target: state.targetCoins,
      progress: vaultProgress,
    },
    metrics: [
      {
        label: "团队完成率",
        value: `${completionRate}%`,
        helper: getCompletionHelper(completionRate),
        tone: completionRate >= 75 ? "good" : "plain",
      },
      {
        label: "总打卡次数",
        value: totalPunches.toLocaleString("zh-CN"),
        helper: `${memberCount} 人 · ${elapsedDays} 天`,
        tone: "plain",
      },
      {
        label: "全勤日",
        value: fullAttendanceDays.toLocaleString("zh-CN"),
        helper: fullAttendanceDays > 0 ? "全员亮灯的日子" : "还在等第一次全员亮灯",
        tone: "good",
      },
      {
        label: "本月高光",
        value: mostConsistentMember ? `最稳：${mostConsistentMember.name}` : "暂无高光",
        helper: mostConsistentMember
          ? `最长连续 ${mostConsistentMember.streak} 天没掉链子`
          : "先攒一点连续记录",
        tone: "warm",
      },
    ],
    dailyPoints,
    peakDay,
    lowDay,
    highlights: getHighlights(completionRate, fullAttendanceDays, peakDay, lowDay, memberCount),
  };
}
```

- [ ] **Step 4: Run the data tests**

Run:

```bash
npm test -- __tests__/report-center-data.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add components/report-center/report-data.ts __tests__/report-center-data.test.ts
git commit -m "test: cover report center data derivation"
```

---

### Task 2: Wire ReportCenter To Derived Data

**Files:**
- Modify: `components/report-center/ReportCenter.tsx`
- Modify: `components/report-center/ReportHeader.tsx`
- Modify: `components/report-center/Milestones.tsx`

- [ ] **Step 1: Update the report container**

Replace `components/report-center/ReportCenter.tsx` with:

```typescript
"use client";

import { useMemo } from "react";
import { useBoard } from "@/lib/store";
import { ReportHeader } from "./ReportHeader";
import { Milestones } from "./Milestones";
import { Highlights } from "./Highlights";
import { TrendChart } from "./TrendChart";
import { buildReportData } from "./report-data";

export function ReportCenter() {
  const { state } = useBoard();
  const report = useMemo(() => buildReportData(state), [state]);

  return (
    <div className="absolute inset-0 flex flex-col gap-4 transition-opacity duration-300 bg-white soft-card p-4 sm:p-6 overflow-y-auto">
      <ReportHeader
        title={report.title}
        summary={report.summary}
        teamVault={report.teamVault}
      />

      <Milestones metrics={report.metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 pb-2">
        <TrendChart
          dailyPoints={report.dailyPoints}
          peakDay={report.peakDay}
          lowDay={report.lowDay}
        />
        <Highlights highlights={report.highlights} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the header**

Replace `components/report-center/ReportHeader.tsx` with:

```typescript
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportData } from "./report-data";

interface ReportHeaderProps {
  title: string;
  summary: string;
  teamVault: ReportData["teamVault"];
}

export function ReportHeader({ title, summary, teamVault }: ReportHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 relative z-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
        <p className="text-sub font-bold mt-2 flex items-center gap-2 leading-relaxed">
          {summary}
          <span className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
      </div>
      <div className="lg:text-right min-w-48">
        <div className="text-xs font-bold text-sub">TEAM VAULT</div>
        <div className="text-3xl font-black text-yellow-500">
          {teamVault.current.toLocaleString("zh-CN")}
          <span className="text-base text-slate-300">/{teamVault.target.toLocaleString("zh-CN")}</span>
        </div>
        <div className="mt-2 h-3 w-full lg:w-44 bg-slate-100 border-2 border-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-300 border-r-2 border-slate-800 transition-all duration-500"
            style={{ width: `${teamVault.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update the metric cards**

Replace `components/report-center/Milestones.tsx` with:

```typescript
"use client";

import type { ReportMetric } from "./report-data";

interface MilestonesProps {
  metrics: ReportMetric[];
}

const toneClasses: Record<ReportMetric["tone"], string> = {
  plain: "bg-white border-slate-200 text-slate-900",
  good: "bg-green-50 border-green-200 text-green-900",
  warm: "bg-yellow-50 border-yellow-300 text-yellow-900",
};

const helperClasses: Record<ReportMetric["tone"], string> = {
  plain: "text-sub",
  good: "text-green-700",
  warm: "text-yellow-700",
};

export function Milestones({ metrics }: MilestonesProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`border-4 rounded-[1rem] p-4 shadow-sm min-h-32 flex flex-col justify-between ${toneClasses[metric.tone]}`}
        >
          <div className="text-xs font-black text-sub tracking-wide">{metric.label}</div>
          <div className="text-3xl font-black mt-2 break-words">{metric.value}</div>
          <p className={`text-xs font-bold mt-2 leading-relaxed ${helperClasses[metric.tone]}`}>
            {metric.helper}
          </p>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Run TypeScript-facing tests**

Run:

```bash
npm test -- __tests__/report-center-data.test.ts
```

Expected: pass. This catches prop/type drift from the helper changes.

- [ ] **Step 5: Commit**

```bash
git add components/report-center/ReportCenter.tsx components/report-center/ReportHeader.tsx components/report-center/Milestones.tsx
git commit -m "feat: wire report center summary metrics"
```

---

### Task 3: Render The Real Activity Trend Chart

**Files:**
- Modify: `components/report-center/TrendChart.tsx`

- [ ] **Step 1: Replace the static chart**

Replace `components/report-center/TrendChart.tsx` with:

```typescript
"use client";

import type { DailyTrendPoint, ReportDaySummary } from "./report-data";

interface TrendChartProps {
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
}

const chartWidth = 1000;
const chartHeight = 160;
const paddingX = 40;
const topY = 26;
const bottomY = 124;

function getPointCoordinates(points: DailyTrendPoint[]) {
  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = bottomY - topY;

  return points.map((point, index) => {
    const x =
      points.length === 1
        ? chartWidth / 2
        : paddingX + (index / (points.length - 1)) * usableWidth;
    const y = topY + ((maxCount - point.count) / maxCount) * usableHeight;

    return { ...point, x, y };
  });
}

function getTickDays(points: DailyTrendPoint[]) {
  if (points.length <= 3) return points.map((point) => point.day);

  const middle = points[Math.floor(points.length / 2)].day;
  return Array.from(new Set([points[0].day, middle, points[points.length - 1].day]));
}

export function TrendChart({ dailyPoints, peakDay, lowDay }: TrendChartProps) {
  const coordinates = getPointCoordinates(dailyPoints);
  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const tickDays = getTickDays(dailyPoints);

  return (
    <section className="xl:col-span-2 bg-white border-4 border-slate-100 rounded-[1.5rem] p-5 sm:p-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <h2 className="text-xl font-black">ACTIVITY TREND / 活跃趋势</h2>
        <span className="text-xs font-bold text-sub bg-slate-100 px-3 py-1 rounded-full w-fit">
          每日打卡人数
        </span>
      </div>

      <div className="w-full relative mt-2 bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden">
        {dailyPoints.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm font-bold text-sub">
            暂无趋势数据
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full h-48 drop-shadow-md"
              role="img"
              aria-label="团队每日打卡人数趋势"
            >
              <line x1="0" y1="36" x2={chartWidth} y2="36" stroke="#e2e8f0" strokeDasharray="6,6" strokeWidth="2" />
              <line x1="0" y1="78" x2={chartWidth} y2="78" stroke="#e2e8f0" strokeDasharray="6,6" strokeWidth="2" />
              <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="#e2e8f0" strokeDasharray="6,6" strokeWidth="2" />
              <polyline
                fill="none"
                stroke="#fde047"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
              {coordinates.map((point) => (
                <circle
                  key={point.day}
                  cx={point.x}
                  cy={point.y}
                  r={point.isFullAttendance ? 9 : 5}
                  fill={point.isFullAttendance ? "#1f2937" : "#f59e0b"}
                />
              ))}
            </svg>

            <div className="absolute inset-x-0 bottom-1 flex justify-between px-6 text-[10px] font-bold text-slate-400 pointer-events-none">
              {tickDays.map((day) => (
                <span key={day}>{day} 日</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
        <div className="rounded-xl bg-yellow-50 border-2 border-yellow-100 px-3 py-2 text-yellow-800">
          峰值：{peakDay ? `第 ${peakDay.day} 天 · ${peakDay.count} 人打卡` : "暂无数据"}
        </div>
        <div className="rounded-xl bg-slate-50 border-2 border-slate-100 px-3 py-2 text-sub">
          低谷：{lowDay ? `第 ${lowDay.day} 天 · ${lowDay.count} 人打卡` : "暂无数据"}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run the data tests again**

Run:

```bash
npm test -- __tests__/report-center-data.test.ts
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/report-center/TrendChart.tsx
git commit -m "feat: render report center trend from board data"
```

---

### Task 4: Replace Static Highlights With Lightweight Cards

**Files:**
- Modify: `components/report-center/Highlights.tsx`

- [ ] **Step 1: Replace the highlight component**

Replace `components/report-center/Highlights.tsx` with:

```typescript
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportHighlight } from "./report-data";

interface HighlightsProps {
  highlights: ReportHighlight[];
}

const toneClasses: Record<ReportHighlight["tone"], string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-900",
  green: "bg-green-50 border-green-100 text-green-900",
  rose: "bg-rose-50 border-rose-100 text-rose-900",
};

const bodyClasses: Record<ReportHighlight["tone"], string> = {
  blue: "text-blue-700",
  green: "text-green-700",
  rose: "text-rose-700",
};

const iconByTone: Record<ReportHighlight["tone"], string> = {
  blue: SvgIcons.megaphone,
  green: SvgIcons.trophy,
  rose: SvgIcons.target,
};

export function Highlights({ highlights }: HighlightsProps) {
  return (
    <aside className="flex flex-col gap-4">
      {highlights.map((highlight) => (
        <article
          key={highlight.title}
          className={`border-4 rounded-[1.25rem] p-5 flex-1 min-h-32 ${toneClasses[highlight.tone]}`}
        >
          <div className="w-9 h-9 mb-3" dangerouslySetInnerHTML={{ __html: iconByTone[highlight.tone] }} />
          <h3 className="font-black text-lg">{highlight.title}</h3>
          <p className={`text-sm font-bold mt-2 leading-relaxed ${bodyClasses[highlight.tone]}`}>
            {highlight.body}
          </p>
        </article>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Run a focused TypeScript check through tests**

Run:

```bash
npm test -- __tests__/report-center-data.test.ts
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/report-center/Highlights.tsx
git commit -m "feat: add report center highlight cards"
```

---

### Task 5: Add Render Regression Coverage

**Files:**
- Create: `__tests__/report-center-component.test.tsx`

- [ ] **Step 1: Write the render test**

Create `__tests__/report-center-component.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const initialState: BoardState = {
  members: [
    { id: "u1", name: "li", avatarKey: "male1" },
    { id: "u2", name: "luo", avatarKey: "male2" },
  ],
  gridData: [
    [true, true, false],
    [true, false, true],
  ],
  teamCoins: 1450,
  targetCoins: 2000,
  today: 3,
  totalDays: 3,
  logs: [],
  activeTab: "dash",
  currentUserId: "u1",
};

describe("ReportCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the lightweight dashboard from board state", () => {
    act(() => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ReportCenter />
        </BoardProvider>,
      );
    });

    expect(container.textContent).toContain("DASHBOARD");
    expect(container.textContent).toContain("团队完成率");
    expect(container.textContent).toContain("总打卡次数");
    expect(container.textContent).toContain("ACTIVITY TREND / 活跃趋势");
    expect(container.textContent).toContain("气氛组播报");
    expect(container.textContent).not.toContain("OCTOBER REPORT");
    expect(container.textContent).not.toContain("+12,450");
    expect(container.textContent).not.toContain("Bob");
    expect(container.querySelector("svg[aria-label='团队每日打卡人数趋势']")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the new render test**

Run:

```bash
npm test -- __tests__/report-center-component.test.tsx
```

Expected: pass.

- [ ] **Step 3: Run all report-center tests**

Run:

```bash
npm test -- __tests__/report-center-data.test.ts __tests__/report-center-component.test.tsx
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/report-center-component.test.tsx
git commit -m "test: cover report center dashboard render"
```

---

### Task 6: Final Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Build the app**

Run:

```bash
npm run build
```

Expected: production build completes successfully.

- [ ] **Step 3: Manual browser check**

Run:

```bash
npm run dev
```

Open the app, log in with the seeded user flow already used by the project, switch to `战报中心`, and verify:

- Header shows a current dashboard title rather than `OCTOBER REPORT`.
- Summary sentence uses real totals.
- Four metric cards render and wrap cleanly.
- Trend chart reflects the number of elapsed days.
- Peak and low labels match the visible chart.
- Highlight cards are friendly and not overly formal.
- `协同打卡` and `共享看板` tabs still work.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat HEAD
git status --short
```

Expected: no uncommitted files after the task commits, unless the worker intentionally left verification notes.

---

## Self-Review

- Spec coverage: The plan covers the header summary, lightweight metrics, real activity trend chart, highlight cards, existing module boundary, responsive layout, and test verification.
- Scope: The plan does not add date pickers, archives, leaderboards, task integration, new APIs, new database tables, or external chart libraries.
- Type consistency: `ReportData`, `ReportMetric`, `DailyTrendPoint`, `ReportDaySummary`, and `ReportHighlight` are defined once in `report-data.ts` and imported by components.
- Test coverage: Data calculations are unit-tested and dashboard rendering is smoke-tested through `BoardProvider`.
