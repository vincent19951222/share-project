# 战报中心重做（团队看板）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把战报中心从汇总报表重做为团队体检看板，新增按 teamId 聚合的后端，4 个模块（每日打卡趋势柱状图 / 团队训练部位均衡 / 水铺饮品构成 / 赛季冲刺通栏）+ 摘要条 + 本月/本年周期切换。

**Architecture:** 镜像个人看板 `lib/dashboard-state.ts`（按 userId）→ 新建 `lib/team-dashboard-state.ts`（按 teamId）+ `app/api/dashboard/team-state/route.ts`。前端重写 `ReportCenter`，退役 5 个旧文件。赛季冲刺从现有 `BoardState.activeSeason` 取，不参与周期切换；其余 3 模块走新 API。

**Tech Stack:** Next.js 15 App Router / TypeScript strict / Prisma (SQLite, better-sqlite3) / Vitest + jsdom / 自实现 SVG 图表 / Tailwind v4 Brutalist 风格

## Global Constraints

- TypeScript strict mode，禁止 `any` 类型
- 时区统一 Asia/Shanghai，dayKey 格式 `YYYY-MM-DD`
- 所有图表自实现 SVG，不引入外部图表库
- 部位/饮品常量直接 import：`STRENGTH_PARTS` / `CARDIO_ITEMS`（`lib/workouts.ts`）、`drinkCatalog` / `DRINK_TYPES`（`lib/drinks.ts`），保证和个人看板口径一致
- 饮品聚合必须排除 `deletedAt != null` 的软删除记录
- Prisma Client import 路径：`@/lib/generated/prisma/client`
- 测试文件约定：`__tests__/*.test.ts`，describe/it/expect 全局可用
- 周期类型复用 `DashboardPeriod = "month" | "year"`（`lib/types.ts`）
- 战报是只读快照，不做实时轮询；进入页面/切换周期时请求一次

---

## File Structure

**新建：**
- `lib/team-dashboard-state.ts` — 纯聚合函数 `buildTeamDashboardSnapshot`，按 teamId 查询并聚合成 `TeamDashboardSnapshot`
- `app/api/dashboard/team-state/route.ts` — GET `?period=month|year`，鉴权后返回快照
- `__tests__/team-dashboard-state.test.ts` — 聚合函数单测
- `__tests__/team-dashboard-state-api.test.ts` — API route 鉴权/参数单测
- `components/report-center/TeamHeader.tsx` — 标题 + 周期切换
- `components/report-center/PeriodSwitcher.tsx` — 共享本月/本年切换器（牛马日历后续接入，本计划只新建并在此处使用）
- `components/report-center/MetricSummary.tsx` — 摘要条 3 张卡
- `components/report-center/SeasonSprintPanel.tsx` — 赛季冲刺通栏
- `components/report-center/PunchTrendChart.tsx` — 打卡趋势柱状图
- `components/report-center/WorkoutBalancePanel.tsx` — 团队训练部位均衡条形图
- `components/report-center/DrinkCompositionPanel.tsx` — 水铺饮品构成（饼图 + 趋势柱）
- `components/report-center/EmptyState.tsx` — 通用空状态文案组件
- `__tests__/report-center-*.test.tsx` — 各组件渲染测试

**修改：**
- `lib/types.ts` — 新增 `TeamDashboardSnapshot` 及子类型
- `lib/api.ts` — 新增 `fetchTeamDashboardState(period)` client helper
- `components/report-center/ReportCenter.tsx` — 重写为按 period 请求 + 组装新模块

**删除：**
- `components/report-center/report-data.ts`
- `components/report-center/CoffeeReportPanel.tsx`
- `components/report-center/TrendChart.tsx`
- `components/report-center/DrinkReportPanel.tsx`
- `components/report-center/Milestones.tsx`

---

## Task 1: 定义 TeamDashboardSnapshot 类型

**Files:**
- Modify: `lib/types.ts`（在 `DashboardSnapshot` 定义之后追加）
- Test: 无（类型定义）

**Interfaces:**
- Produces: `TeamDashboardSnapshot`、`TeamPunchTrendPoint`、`TeamWorkoutBalanceItem`、`TeamDrinkBreakdownItem`、`TeamDrinkTrendPoint`、`TeamMetrics`（供后续 task import）

- [ ] **Step 1: 追加类型定义**

在 `lib/types.ts` 末尾追加（`DrinkType` 已由文件顶部 import）：

```ts
export interface TeamPunchTrendPoint {
  /** 月视图=日期 YYYY-MM-DD；年视图=月份 YYYY-MM */
  dayKey: string;
  count: number;
  isFullAttendance: boolean;
}

export interface TeamWorkoutBalanceItem {
  /** 部位/有氧项的 code，如 "chest"、"treadmill" */
  code: string;
  label: string;
  count: number;
}

export interface TeamDrinkBreakdownItem {
  type: DrinkType;
  label: string;
  count: number;
  color: string;
}

export interface TeamDrinkTrendPoint {
  /** 月视图=日期 YYYY-MM-DD；年视图=月份 YYYY-MM */
  dayKey: string;
  count: number;
}

export interface TeamMetrics {
  /** 0-1 之间，totalPunches / (memberCount * elapsedDays) */
  completionRate: number;
  totalPunches: number;
  fullAttendanceDays: number;
}

export interface TeamDashboardSnapshot {
  period: { type: DashboardPeriod; startKey: string; endKey: string };
  metrics: TeamMetrics;
  punchTrend: TeamPunchTrendPoint[];
  workoutBalance: TeamWorkoutBalanceItem[];
  drinkBreakdown: TeamDrinkBreakdownItem[];
  drinkTrend: TeamDrinkTrendPoint[];
}
```

- [ ] **Step 2: 验证类型编译**

Run: `npx tsc --noEmit`
Expected: 无新增类型错误（若项目本身有既有错误，仅确认本次新增不引入错误）

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(team-dashboard): add TeamDashboardSnapshot types"
```

---

## Task 2: buildTeamDashboardSnapshot 聚合函数（核心）

这是整个重做的数据心脏。先写测试，TDD。

**Files:**
- Create: `lib/team-dashboard-state.ts`
- Test: `__tests__/team-dashboard-state.test.ts`

**Interfaces:**
- Consumes: `prisma`（`@/lib/prisma`）、`getShanghaiDayKey`（`lib/dashboard-state.ts` 已 export，复用）、`STRENGTH_PARTS`/`CARDIO_ITEMS`（`lib/workouts.ts`）、`drinkCatalog`/`isDrinkType`（`lib/drinks.ts`）、`TeamDashboardSnapshot`（Task 1）
- Produces: `buildTeamDashboardSnapshot(teamId: string, period: DashboardPeriod, now?: Date): Promise<TeamDashboardSnapshot | null>`

**关键设计：**
- `now` 默认 `new Date()`，测试时传入固定时间
- 月视图：`summaryStartDayKey = ${currentMonthKey}-01`，`endKey = todayDayKey`
- 年视图：`summaryStartDayKey = ${year}-01-01`，`endKey = todayDayKey`
- 查询：`prisma.team.findUnique({ where:{id:teamId}, select:{ users:{ include:{ punchRecords:{where:{dayKey:{gte,lte}}}, workoutRecords:{where:{dayKey:{gte,lte}}, include:{entries:true}}, drinkRecords:{where:{dayKey:{gte,lte}, deletedAt:null}} } } } })`
- team 不存在 → 返回 null
- `elapsedDays`：范围内含今天的天数（月视图=今天几号；年视图=今年第几天）
- `workoutBalance`：遍历各成员 workoutRecords → entries，strength 的 entry.code 落入 STRENGTH_PARTS，cardio 的 entry.code 落入 CARDIO_ITEMS，分别累加。label 用 workouts.ts 的 label 映射。
- `drinkBreakdown`：遍历 drinkRecords 按 drinkType 累加，用 drinkCatalog 补 label/color；count 为 0 的类型也保留（保证饼图扇区稳定）
- `punchTrend` 月视图：逐天（startKey→endKey）算当天 `punched=true` 的人数 + isFullAttendance；年视图：按 `YYYY-MM` 聚合成 12 根（1月到当前月）
- `drinkTrend`：同 punchTrend 但累加当天 drinkRecords 数量

**WorkoutEntry 结构确认**（来自 schema）：`category: "strength"|"cardio"`, `code: string`（strength 的 code 是 StrengthPart，cardio 的 code 是 CardioItem）。

**Label 映射**：`lib/workouts.ts` 有 `STRENGTH_PART_LABELS` / `CARDIO_ITEM_LABELS`（若不存在则用内联 Record）。Step 1 先核对。

- [ ] **Step 1: 核对 workouts.ts 的 label 映射常量名**

Run: `grep -n "LABEL\|label" lib/workouts.ts`
确认是否存在 `STRENGTH_PART_LABELS` / `CARDIO_ITEM_LABELS` 这类映射。若存在记下确切名字；若不存在，本函数内联一个 Record 映射（code→中文 label）。

- [ ] **Step 2: 写失败测试 — 月视图 punchTrend 与 metrics**

在 `__tests__/team-dashboard-state.test.ts` 顶部用测试工厂 mock prisma。由于项目用真实 prisma，本测试用 vitest mock `@/lib/prisma`。

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

// 固定"今天"为 2026-06-15
const NOW = new Date("2026-06-15T03:00:00Z"); // 上海时区 11:00，仍是 06-15

function makeTeam(overrides: any = {}) {
  return {
    id: "team-1",
    users: [],
    ...overrides,
  };
}

describe("buildTeamDashboardSnapshot - month", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when team not found", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(null);
    const snap = await buildTeamDashboardSnapshot("missing", "month", NOW);
    expect(snap).toBeNull();
  });

  it("computes punchTrend per day with full-attendance flag and metrics", async () => {
    // 2 成员，06-10 两人都打，06-11 只一人打
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2026-06-10", punched: true },
              { dayKey: "2026-06-11", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
          {
            id: "u2",
            punchRecords: [
              { dayKey: "2026-06-10", punched: true },
              { dayKey: "2026-06-11", punched: false },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot("team-1", "month", NOW);
    expect(snap).not.toBeNull();
    const point10 = snap!.punchTrend.find((p) => p.dayKey === "2026-06-10");
    const point11 = snap!.punchTrend.find((p) => p.dayKey === "2026-06-11");
    expect(point10).toEqual({ dayKey: "2026-06-10", count: 2, isFullAttendance: true });
    expect(point11).toEqual({ dayKey: "2026-06-11", count: 1, isFullAttendance: false });
    // 月视图 punchTrend 覆盖 06-01 到 06-15 = 15 天
    expect(snap!.punchTrend.length).toBe(15);
    expect(snap!.metrics.totalPunches).toBe(3);
    expect(snap!.metrics.fullAttendanceDays).toBe(1);
    // completionRate = 3 / (2 成员 * 15 天) = 0.1
    expect(snap!.metrics.completionRate).toBeCloseTo(0.1, 5);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: FAIL（`buildTeamDashboardSnapshot` 未定义 / 模块不存在）

- [ ] **Step 4: 实现 buildTeamDashboardSnapshot（月视图部分先过测试）**

创建 `lib/team-dashboard-state.ts`。先实现 getShanghaiDayKey 复用——确认 `lib/dashboard-state.ts` 已 export 它；若未 export，本文件从其依赖的同一工具 import，或内联实现（项目内多处内联，参考 `lib/calendar-state.ts`）。**先核对：**

Run: `grep -n "export.*getShanghaiDayKey\|function getShanghaiDayKey" lib/dashboard-state.ts lib/calendar-state.ts`

```ts
import { prisma } from "@/lib/prisma";
import { STRENGTH_PARTS, CARDIO_ITEMS } from "@/lib/workouts";
import { drinkCatalog, isDrinkType, type DrinkType } from "@/lib/drinks";
import type {
  DashboardPeriod,
  TeamDashboardSnapshot,
  TeamPunchTrendPoint,
  TeamWorkoutBalanceItem,
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";

// 若 dashboard-state 未 export，则内联（与 calendar-state 同款实现）
function getShanghaiDayKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date).replace(/\//g, "-");
}

const STRENGTH_PART_LABELS: Record<string, string> = {
  chest: "胸",
  back: "背",
  shoulder: "肩",
  arms: "臂",
  glutes: "臀",
  legs: "腿",
  abs: "腹",
};

const CARDIO_ITEM_LABELS: Record<string, string> = {
  treadmill: "跑步机",
  elliptical: "椭圆机",
  walk: "步行",
  swim: "游泳",
};

function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return getShanghaiDayKey(d);
}

function countElapsedDays(startKey: string, endKey: string): number {
  let count = 0;
  let cur = startKey;
  while (cur <= endKey) {
    count += 1;
    cur = addDays(cur, 1);
  }
  return count;
}

export async function buildTeamDashboardSnapshot(
  teamId: string,
  period: DashboardPeriod,
  now: Date = new Date(),
): Promise<TeamDashboardSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const year = Number(todayDayKey.slice(0, 4));
  const monthKey = todayDayKey.slice(0, 7);
  const startKey = period === "month" ? `${monthKey}-01` : `${year}-01-01`;
  const endKey = todayDayKey;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      users: {
        select: {
          id: true,
          punchRecords: {
            where: { dayKey: { gte: startKey, lte: endKey } },
            select: { dayKey: true, punched: true },
          },
          workoutRecords: {
            where: { dayKey: { gte: startKey, lte: endKey } },
            include: { entries: true },
          },
          drinkRecords: {
            where: { dayKey: { gte: startKey, lte: endKey }, deletedAt: null },
            select: { dayKey: true, drinkType: true },
          },
        },
      },
    },
  });

  if (!team) {
    return null;
  }

  const memberCount = team.users.length;
  const elapsedDays = countElapsedDays(startKey, endKey);

  // --- punch 聚合 ---
  const punchByDay = new Map<string, number>();
  for (const u of team.users) {
    for (const p of u.punchRecords) {
      if (p.punched) {
        punchByDay.set(p.dayKey, (punchByDay.get(p.dayKey) ?? 0) + 1);
      }
    }
  }

  // 月视图 punchTrend：逐天
  const punchTrend: TeamPunchTrendPoint[] = [];
  let cur = startKey;
  while (cur <= endKey) {
    const count = punchByDay.get(cur) ?? 0;
    punchTrend.push({
      dayKey: cur,
      count,
      isFullAttendance: memberCount > 0 && count === memberCount,
    });
    cur = addDays(cur, 1);
  }

  const totalPunches = Array.from(punchByDay.values()).reduce((a, b) => a + b, 0);
  const fullAttendanceDays = punchTrend.filter((p) => p.isFullAttendance).length;
  const completionRate =
    memberCount > 0 && elapsedDays > 0 ? totalPunches / (memberCount * elapsedDays) : 0;

  // --- workout balance ---
  const balanceCount = new Map<string, number>();
  for (const u of team.users) {
    for (const wr of u.workoutRecords) {
      for (const entry of wr.entries) {
        if (STRENGTH_PARTS.includes(entry.code as any) || CARDIO_ITEMS.includes(entry.code as any)) {
          balanceCount.set(entry.code, (balanceCount.get(entry.code) ?? 0) + 1);
        }
      }
    }
  }
  const workoutBalance: TeamWorkoutBalanceItem[] = [
    ...STRENGTH_PARTS.map((code) => ({
      code,
      label: STRENGTH_PART_LABELS[code] ?? code,
      count: balanceCount.get(code) ?? 0,
    })),
    ...CARDIO_ITEMS.map((code) => ({
      code,
      label: CARDIO_ITEM_LABELS[code] ?? code,
      count: balanceCount.get(code) ?? 0,
    })),
  ];

  // --- drink breakdown ---
  const drinkCount = new Map<DrinkType, number>();
  for (const u of team.users) {
    for (const dr of u.drinkRecords) {
      const type = isDrinkType(dr.drinkType) ? dr.drinkType : "other";
      drinkCount.set(type, (drinkCount.get(type) ?? 0) + 1);
    }
  }
  const drinkBreakdown: TeamDrinkBreakdownItem[] = (
    Object.keys(drinkCatalog) as DrinkType[]
  ).map((type) => ({
    type,
    label: drinkCatalog[type].label,
    count: drinkCount.get(type) ?? 0,
    color: drinkCatalog[type].color,
  }));

  // --- drink trend (月视图逐天) ---
  const drinkByDay = new Map<string, number>();
  for (const u of team.users) {
    for (const dr of u.drinkRecords) {
      drinkByDay.set(dr.dayKey, (drinkByDay.get(dr.dayKey) ?? 0) + 1);
    }
  }
  const drinkTrend: TeamDrinkTrendPoint[] = [];
  let dCur = startKey;
  while (dCur <= endKey) {
    drinkTrend.push({ dayKey: dCur, count: drinkByDay.get(dCur) ?? 0 });
    dCur = addDays(dCur, 1);
  }

  return {
    period: { type: period, startKey, endKey },
    metrics: { completionRate, totalPunches, fullAttendanceDays },
    punchTrend,
    workoutBalance,
    drinkBreakdown,
    drinkTrend,
  };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: PASS（2 个用例）

- [ ] **Step 6: Commit**

```bash
git add lib/team-dashboard-state.ts __tests__/team-dashboard-state.test.ts
git commit -m "feat(team-dashboard): add buildTeamDashboardSnapshot aggregator (month view)"
```

---

## Task 3: 年视图聚合

**Files:**
- Modify: `lib/team-dashboard-state.ts`
- Test: `__tests__/team-dashboard-state.test.ts`

**Interfaces:**
- Produces: 同 Task 2，年视图行为：`punchTrend`/`drinkTrend` 按月聚合成 12 根（1 月到当前月，dayKey=`YYYY-MM`）；`workoutBalance`/`drinkBreakdown`/`metrics` 全年累计

- [ ] **Step 1: 写失败测试 — 年视图按月聚合**

在测试文件追加：

```ts
describe("buildTeamDashboardSnapshot - year", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aggregates punchTrend and drinkTrend by month (12 buckets up to current month)", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2026-01-05", punched: true },
              { dayKey: "2026-06-10", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [
              { dayKey: "2026-06-10", drinkType: "water" },
            ],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot("team-1", "year", NOW);
    expect(snap!.period).toEqual({
      type: "year",
      startKey: "2026-01-01",
      endKey: "2026-06-15",
    });
    // 年视图 punchTrend = 6 个月（1-6月）
    expect(snap!.punchTrend.length).toBe(6);
    expect(snap!.punchTrend[0]).toEqual({ dayKey: "2026-01", count: 1, isFullAttendance: true });
    expect(snap!.punchTrend[5]).toEqual({ dayKey: "2026-06", count: 1, isFullAttendance: true });
    expect(snap!.drinkTrend[5]).toEqual({ dayKey: "2026-06", count: 1 });
    expect(snap!.drinkTrend[0].count).toBe(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: FAIL（年视图仍是逐天，长度不对）

- [ ] **Step 3: 实现年视图聚合**

在 `buildTeamDashboardSnapshot` 内，把 punchTrend/drinkTrend 的构建改为按 period 分支。在函数内、计算 `punchByDay`/`drinkByDay` 之后替换 punchTrend/drinkTrend 构建逻辑：

```ts
  const punchTrend: TeamPunchTrendPoint[] = [];
  const drinkTrend: TeamDrinkTrendPoint[] = [];

  if (period === "month") {
    let cur = startKey;
    while (cur <= endKey) {
      const count = punchByDay.get(cur) ?? 0;
      punchTrend.push({
        dayKey: cur,
        count,
        isFullAttendance: memberCount > 0 && count === memberCount,
      });
      drinkTrend.push({ dayKey: cur, count: drinkByDay.get(cur) ?? 0 });
      cur = addDays(cur, 1);
    }
  } else {
    // 年视图：按月聚合 1 月到当前月
    const currentMonth = Number(todayDayKey.slice(5, 7));
    const punchByMonth = new Map<string, number>();
    const drinkByMonth = new Map<string, number>();
    for (const [day, c] of punchByDay) {
      const m = day.slice(0, 7);
      punchByMonth.set(m, (punchByMonth.get(m) ?? 0) + c);
    }
    for (const [day, c] of drinkByDay) {
      const m = day.slice(0, 7);
      drinkByMonth.set(m, (drinkByMonth.get(m) ?? 0) + c);
    }
    for (let m = 1; m <= currentMonth; m++) {
      const monthKey2 = `${year}-${String(m).padStart(2, "0")}`;
      const count = punchByMonth.get(monthKey2) ?? 0;
      punchTrend.push({
        dayKey: monthKey2,
        count,
        isFullAttendance: false, // 年视图不标全勤
      });
      drinkTrend.push({ dayKey: monthKey2, count: drinkByMonth.get(monthKey2) ?? 0 });
    }
  }
```

（删除原先分别构建 punchTrend 和 drinkTrend 的两段 while 循环。）

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: PASS（全部用例）

- [ ] **Step 5: Commit**

```bash
git add lib/team-dashboard-state.ts __tests__/team-dashboard-state.test.ts
git commit -m "feat(team-dashboard): aggregate year view by month"
```

---

## Task 4: 补充 workoutBalance / drinkBreakdown / 软删除边界测试

**Files:**
- Test: `__tests__/team-dashboard-state.test.ts`

- [ ] **Step 1: 写失败测试 — 训练部位分桶 + 软删除排除 + 空团队**

追加：

```ts
describe("buildTeamDashboardSnapshot - balance & drinks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("buckets workout entries into strength parts and cardio items", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [],
            workoutRecords: [
              {
                dayKey: "2026-06-10",
                entries: [
                  { category: "strength", code: "chest" },
                  { category: "strength", code: "chest" },
                  { category: "cardio", code: "treadmill" },
                ],
              },
            ],
            drinkRecords: [],
          },
        ],
      }),
    );
    const snap = await buildTeamDashboardSnapshot("team-1", "month", NOW);
    const chest = snap!.workoutBalance.find((b) => b.code === "chest");
    const treadmill = snap!.workoutBalance.find((b) => b.code === "treadmill");
    const back = snap!.workoutBalance.find((b) => b.code === "back");
    expect(chest!.count).toBe(2);
    expect(treadmill!.count).toBe(1);
    expect(back!.count).toBe(0);
    // 7 力量 + 4 有氧 = 11 行
    expect(snap!.workoutBalance.length).toBe(11);
  });

  it("buckets drinks by type and keeps zero-count types", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [],
            workoutRecords: [],
            drinkRecords: [
              { dayKey: "2026-06-10", drinkType: "water" },
              { dayKey: "2026-06-10", drinkType: "milkTea" },
              { dayKey: "2026-06-11", drinkType: "unknown-type" },
            ],
          },
        ],
      }),
    );
    const snap = await buildTeamDashboardSnapshot("team-1", "month", NOW);
    const water = snap!.drinkBreakdown.find((d) => d.type === "water");
    const milkTea = snap!.drinkBreakdown.find((d) => d.type === "milkTea");
    const americano = snap!.drinkBreakdown.find((d) => d.type === "americano");
    expect(water!.count).toBe(1);
    expect(milkTea!.count).toBe(1);
    expect(americano!.count).toBe(0);
    // unknown-type 被归入 other
    const other = snap!.drinkBreakdown.find((d) => d.type === "other");
    expect(other!.count).toBe(1);
    expect(snap!.drinkBreakdown.length).toBe(5);
  });

  it("handles empty team gracefully", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(makeTeam({ users: [] }));
    const snap = await buildTeamDashboardSnapshot("team-1", "month", NOW);
    expect(snap!.metrics.completionRate).toBe(0);
    expect(snap!.metrics.totalPunches).toBe(0);
    expect(snap!.punchTrend.length).toBe(15);
    expect(snap!.punchTrend.every((p) => !p.isFullAttendance)).toBe(true);
  });
});
```

注意：软删除排除由 Prisma where 子句 `deletedAt: null` 保证，测试不直接覆盖 DB 层（mock 已只喂未删除记录）；此用例聚焦分桶逻辑。

- [ ] **Step 2: 运行确认通过（实现已在 Task 2 完整）**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: PASS。若 `unknown-type` 未归入 other 则 FAIL，按 Task 2 实现的 `isDrinkType` 兜底应已通过。

- [ ] **Step 3: Commit**

```bash
git add __tests__/team-dashboard-state.test.ts
git commit -m "test(team-dashboard): cover balance/drink bucketing and empty team"
```

---

## Task 5: team-state API route

**Files:**
- Create: `app/api/dashboard/team-state/route.ts`
- Test: `__tests__/team-dashboard-state-api.test.ts`

**Interfaces:**
- Consumes: `parseCookieValue`（`@/lib/auth`）、`buildTeamDashboardSnapshot`（Task 2）、用户当前 teamId（从 cookie userId → user.teamId）。**需先确认如何取当前用户的 teamId**——参考现有 route 取 user 的模式。
- Produces: `GET /api/dashboard/team-state?period=month|year` → `{ snapshot: TeamDashboardSnapshot } | { error }`

- [ ] **Step 1: 核对如何从 userId 取 teamId**

Run: `grep -rn "teamId\|team.id\|user.team" app/api/dashboard/state/route.ts app/api/board/state/route.ts lib/board-state.ts | head -20`

确认 board-state 是如何从 userId 拿到 team 的（应该是 `prisma.user.findUnique({select:{teamId:true}})` 或类似）。记下确切查询。

- [ ] **Step 2: 写失败测试 — 鉴权 + 参数回退**

`__tests__/team-dashboard-state-api.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    team: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/team-dashboard-state", () => ({
  buildTeamDashboardSnapshot: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";
import { GET } from "@/app/api/dashboard/team-state/route";

function makeReq(cookie: string | undefined, period = "month") {
  const url = `http://localhost/api/dashboard/team-state?period=${period}`;
  const req = new Request(url);
  if (cookie) {
    Object.defineProperty(req, "cookies", {
      get: () => ({ get: () => cookie }),
    });
  } else {
    Object.defineProperty(req, "cookies", { get: () => ({ get: () => undefined }) });
  }
  return req as any;
}

describe("team-state route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    const res = await GET(makeReq(undefined));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not found", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await GET(makeReq("u1"));
    expect(res.status).toBe(401);
  });

  it("calls aggregator with teamId and falls back period to month", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue({
      period: { type: "month", startKey: "2026-06-01", endKey: "2026-06-15" },
      metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
      punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
    });
    const res = await GET(makeReq("u1", "bogus"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith("team-1", "month", expect.any(Date));
  });

  it("passes year period through", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue({
      period: { type: "year", startKey: "2026-01-01", endKey: "2026-06-15" },
      metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
      punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
    });
    const res = await GET(makeReq("u1", "year"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith("team-1", "year", expect.any(Date));
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run __tests__/team-dashboard-state-api.test.ts`
Expected: FAIL（route 不存在）

- [ ] **Step 4: 实现 route**

创建 `app/api/dashboard/team-state/route.ts`（镜像 `app/api/dashboard/state/route.ts`，多一步取 teamId）：

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";
import type { DashboardPeriod } from "@/lib/types";

export async function GET(request: NextRequest) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);

  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });

  if (!user?.teamId) {
    return NextResponse.json({ error: "未加入团队" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get("period");
  const period: DashboardPeriod = rawPeriod === "year" ? "year" : "month";

  try {
    const snapshot = await buildTeamDashboardSnapshot(user.teamId, period);

    if (!snapshot) {
      return NextResponse.json({ error: "团队不存在" }, { status: 404 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Team dashboard state error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run __tests__/team-dashboard-state-api.test.ts`
Expected: PASS（4 个用例）

- [ ] **Step 6: Commit**

```bash
git add app/api/dashboard/team-state/route.ts __tests__/team-dashboard-state-api.test.ts
git commit -m "feat(team-dashboard): add GET /api/dashboard/team-state route"
```

---

## Task 6: fetchTeamDashboardState client helper

**Files:**
- Modify: `lib/api.ts`（在 `fetchDashboardState` 之后追加）

**Interfaces:**
- Consumes: `TeamDashboardSnapshot`（Task 1）
- Produces: `fetchTeamDashboardState(period: DashboardPeriod): Promise<TeamDashboardSnapshot>`

- [ ] **Step 1: 核对 readDashboardSnapshot / readApiResult 模式**

Run: `sed -n '230,260p' lib/api.ts`
确认 `fetchDashboardState` 用的 `readDashboardSnapshot` 是怎么解包 `{ snapshot }` 的。新 helper 复用 `readApiResult<T>({snapshot}>` 模式（见 `fetchSupplyStationState`）。

- [ ] **Step 2: 追加 helper**

在 `fetchDashboardState` 函数之后追加：

```ts
export async function fetchTeamDashboardState(
  period: DashboardPeriod,
): Promise<TeamDashboardSnapshot> {
  const response = await fetch(`/api/dashboard/team-state?period=${period}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{ snapshot: TeamDashboardSnapshot }>(
    response,
    "获取团队战报失败",
  );
  return payload.snapshot;
}
```

并在 `lib/api.ts` 顶部 import 处补 `TeamDashboardSnapshot` 类型 import（若 `DashboardSnapshot` 已 import 则并列加）。

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat(team-dashboard): add fetchTeamDashboardState client helper"
```

---

## Task 7: PeriodSwitcher + EmptyState 基础组件

**Files:**
- Create: `components/report-center/PeriodSwitcher.tsx`
- Create: `components/report-center/EmptyState.tsx`

**Interfaces:**
- Produces:
  - `PeriodSwitcher({ period, onChange }: { period: DashboardPeriod; onChange: (p: DashboardPeriod) => void })`
  - `EmptyState({ message }: { message: string })`

- [ ] **Step 1: 实现 PeriodSwitcher**

```tsx
"use client";

import type { DashboardPeriod } from "@/lib/types";

const OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "month", label: "本月" },
  { value: "year", label: "本年" },
];

export function PeriodSwitcher({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border-2 border-[#1f2937] bg-white p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 text-sm font-bold transition-colors ${
            period === opt.value
              ? "bg-[#fde047] text-[#1f2937]"
              : "text-[#1f2937] hover:bg-[#fde047]/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 实现 EmptyState**

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center p-4 text-center text-sub">
      <p>{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add components/report-center/PeriodSwitcher.tsx components/report-center/EmptyState.tsx
git commit -m "feat(team-dashboard): add PeriodSwitcher and EmptyState components"
```

---

## Task 8: TeamHeader + MetricSummary

**Files:**
- Create: `components/report-center/TeamHeader.tsx`
- Create: `components/report-center/MetricSummary.tsx`
- Test: `__tests__/report-center-metric-summary.test.tsx`

**Interfaces:**
- Consumes: `PeriodSwitcher`（Task 7）、`TeamMetrics`（Task 1）
- Produces:
  - `TeamHeader({ period, onPeriodChange })`
  - `MetricSummary({ metrics, period })`

- [ ] **Step 1: 实现 TeamHeader**

```tsx
"use client";

import type { DashboardPeriod } from "@/lib/types";
import { PeriodSwitcher } from "./PeriodSwitcher";

function periodLabel(period: DashboardPeriod): string {
  // 由 ReportCenter 传入当前日期派生的中文标题更准确；此处简化用副标题占位
  return period === "month" ? "本月战报" : "本年战报";
}

export function TeamHeader({
  period,
  onPeriodChange,
}: {
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-main">战报中心</h1>
        <p className="text-sub">{periodLabel(period)}</p>
      </div>
      <PeriodSwitcher period={period} onChange={onPeriodChange} />
    </div>
  );
}
```

- [ ] **Step 2: 实现 MetricSummary**

```tsx
import type { TeamMetrics } from "@/lib/types";
import type { DashboardPeriod } from "@/lib/types";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function MetricSummary({
  metrics,
}: {
  metrics: TeamMetrics;
  period: DashboardPeriod;
}) {
  const cards = [
    { label: "完成率", value: pct(metrics.completionRate) },
    { label: "总打卡", value: String(metrics.totalPunches) },
    { label: "全勤日", value: String(metrics.fullAttendanceDays) },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="soft-card flex flex-col items-center justify-center p-4">
          <span className="text-2xl font-extrabold text-main">{c.value}</span>
          <span className="mt-1 text-sm text-sub">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 写组件测试**

`__tests__/report-center-metric-summary.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricSummary } from "@/components/report-center/MetricSummary";

describe("MetricSummary", () => {
  it("renders three cards with computed values", () => {
    render(
      <MetricSummary
        metrics={{ completionRate: 0.5, totalPunches: 30, fullAttendanceDays: 4 }}
        period="month"
      />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("完成率")).toBeInTheDocument();
    expect(screen.getByText("总打卡")).toBeInTheDocument();
    expect(screen.getByText("全勤日")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/report-center-metric-summary.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/report-center/TeamHeader.tsx components/report-center/MetricSummary.tsx __tests__/report-center-metric-summary.test.tsx
git commit -m "feat(team-dashboard): add TeamHeader and MetricSummary"
```

---

## Task 9: PunchTrendChart 柱状图

**Files:**
- Create: `components/report-center/PunchTrendChart.tsx`
- Test: `__tests__/report-center-punch-trend.test.tsx`

**Interfaces:**
- Consumes: `TeamPunchTrendPoint[]`（Task 1）、`EmptyState`（Task 7）
- Produces: `PunchTrendChart({ points }: { points: TeamPunchTrendPoint[] })`
- 行为：渲染 N 根柱（柱高 = count/maxCount）；全勤柱用强调色 `#16a34a`（绿），普通柱用黄 `#fde047`；标注峰值日"🔥峰值 N人"；空数据用 EmptyState

- [ ] **Step 1: 写失败测试**

`__tests__/report-center-punch-trend.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PunchTrendChart } from "@/components/report-center/PunchTrendChart";

describe("PunchTrendChart", () => {
  it("renders empty state when no points", () => {
    render(<PunchTrendChart points={[]} />);
    expect(screen.getByText(/暂无打卡数据/)).toBeInTheDocument();
  });

  it("renders a bar per point and highlights peak", () => {
    const points = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];
    const { container } = render(<PunchTrendChart points={points} />);
    // 2 根柱（rect）
    const bars = container.querySelectorAll("rect[data-bar]");
    expect(bars.length).toBe(2);
    // 峰值标注
    expect(screen.getByText(/峰值 2人/)).toBeInTheDocument();
  });

  it("uses green fill for full-attendance bars", () => {
    const points = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];
    const { container } = render(<PunchTrendChart points={points} />);
    const bars = container.querySelectorAll("rect[data-bar]");
    expect(bars[0].getAttribute("fill")).toBe("#16a34a");
    expect(bars[1].getAttribute("fill")).toBe("#fde047");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/report-center-punch-trend.test.tsx`
Expected: FAIL（组件不存在）

- [ ] **Step 3: 实现 PunchTrendChart**

```tsx
import type { TeamPunchTrendPoint } from "@/lib/types";
import { EmptyState } from "./EmptyState";

const BAR_W = 14;
const GAP = 4;
const HEIGHT = 140;
const FULL_COLOR = "#16a34a";
const NORMAL_COLOR = "#fde047";

export function PunchTrendChart({ points }: { points: TeamPunchTrendPoint[] }) {
  if (points.length === 0) {
    return <EmptyState message="本月还没有打卡数据" />;
  }

  const max = Math.max(...points.map((p) => p.count), 1);
  const peakCount = Math.max(...points.map((p) => p.count));
  const width = points.length * (BAR_W + GAP);

  return (
    <div className="soft-card p-4">
      <h3 className="mb-2 text-sm font-bold text-main">每日打卡趋势</h3>
      <svg width={width} height={HEIGHT} role="img" aria-label="每日打卡趋势">
        {points.map((p, i) => {
          const h = (p.count / max) * (HEIGHT - 20);
          const x = i * (BAR_W + GAP);
          const y = HEIGHT - h;
          return (
            <rect
              key={p.dayKey}
              data-bar
              x={x}
              y={y}
              width={BAR_W}
              height={Math.max(h, 2)}
              fill={p.isFullAttendance ? FULL_COLOR : NORMAL_COLOR}
              stroke="#1f2937"
              strokeWidth={1}
            >
              <title>{`${p.dayKey}: ${p.count} 人${p.isFullAttendance ? "（全勤）" : ""}`}</title>
            </rect>
          );
        })}
      </svg>
      {peakCount > 0 && (
        <p className="mt-2 text-xs text-sub">🔥峰值 {peakCount}人</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/report-center-punch-trend.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/report-center/PunchTrendChart.tsx __tests__/report-center-punch-trend.test.tsx
git commit -m "feat(team-dashboard): add PunchTrendChart bar chart"
```

---

## Task 10: WorkoutBalancePanel 条形图

**Files:**
- Create: `components/report-center/WorkoutBalancePanel.tsx`
- Test: `__tests__/report-center-workout-balance.test.tsx`

**Interfaces:**
- Consumes: `TeamWorkoutBalanceItem[]`、`EmptyState`
- Produces: `WorkoutBalancePanel({ items })`
- 行为：每部位一行（label + 条形 + 次数）；条形宽度 = count/maxCount；最长高亮（黄底）、最短标灰并标"最薄弱"；全 0 用 EmptyState

- [ ] **Step 1: 写失败测试**

`__tests__/report-center-workout-balance.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkoutBalancePanel } from "@/components/report-center/WorkoutBalancePanel";

describe("WorkoutBalancePanel", () => {
  it("renders empty state when all zero", () => {
    render(<WorkoutBalancePanel items={[{ code: "chest", label: "胸", count: 0 }]} />);
    expect(screen.getByText(/暂无训练数据/)).toBeInTheDocument();
  });

  it("highlights max and marks min as weakest", () => {
    const items = [
      { code: "chest", label: "胸", count: 5 },
      { code: "back", label: "背", count: 1 },
      { code: "legs", label: "腿", count: 3 },
    ];
    render(<WorkoutBalancePanel items={items} />);
    expect(screen.getByText("胸")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    // 最薄弱标
    expect(screen.getByText(/最薄弱/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/report-center-workout-balance.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现 WorkoutBalancePanel**

```tsx
import type { TeamWorkoutBalanceItem } from "@/lib/types";
import { EmptyState } from "./EmptyState";

export function WorkoutBalancePanel({ items }: { items: TeamWorkoutBalanceItem[] }) {
  const max = Math.max(...items.map((i) => i.count), 0);
  const min = Math.min(...items.map((i) => i.count), 0);

  if (max === 0) {
    return (
      <div className="soft-card p-4">
        <h3 className="mb-2 text-sm font-bold text-main">团队训练部位均衡</h3>
        <EmptyState message="暂无训练数据" />
      </div>
    );
  }

  // 最薄弱项 = count === min 且 min < max（避免全相等时误标）
  const weakestCode = min < max ? items.find((i) => i.count === min)?.code : undefined;

  return (
    <div className="soft-card p-4">
      <h3 className="mb-2 text-sm font-bold text-main">团队训练部位均衡</h3>
      <div className="space-y-2">
        {items.map((i) => {
          const isMax = i.count === max;
          const isWeakest = i.code === weakestCode;
          const widthPct = (i.count / max) * 100;
          return (
            <div key={i.code} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs text-sub">{i.label}</span>
              <div className="h-4 flex-1 rounded border border-[#1f2937]/30 bg-[#f3f4f6]">
                <div
                  className={`h-full rounded ${isMax ? "bg-[#fde047]" : "bg-[#fbbf24]/60"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className={`w-8 shrink-0 text-right text-xs ${isWeakest ? "text-sub" : "text-main"}`}>
                {i.count}
              </span>
              {isWeakest && <span className="text-[10px] text-sub">最薄弱</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/report-center-workout-balance.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/report-center/WorkoutBalancePanel.tsx __tests__/report-center-workout-balance.test.tsx
git commit -m "feat(team-dashboard): add WorkoutBalancePanel"
```

---

## Task 11: DrinkCompositionPanel（饼图 + 趋势柱）

**Files:**
- Create: `components/report-center/DrinkCompositionPanel.tsx`
- Test: `__tests__/report-center-drink-composition.test.tsx`

**Interfaces:**
- Consumes: `TeamDrinkBreakdownItem[]`、`TeamDrinkTrendPoint[]`、`EmptyState`
- Produces: `DrinkCompositionPanel({ breakdown, trend })`
- 行为：左侧饼图（仅 count>0 的扇区，单类型退化为整圆）；右侧趋势柱状图；空数据 EmptyState

- [ ] **Step 1: 写失败测试**

`__tests__/report-center-drink-composition.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DrinkCompositionPanel } from "@/components/report-center/DrinkCompositionPanel";

describe("DrinkCompositionPanel", () => {
  it("renders empty state when no drinks", () => {
    render(
      <DrinkCompositionPanel
        breakdown={[
          { type: "water", label: "水", count: 0, color: "#4fb8d6" },
        ]}
        trend={[]}
      />,
    );
    expect(screen.getByText(/暂无饮水数据/)).toBeInTheDocument();
  });

  it("renders pie slices for non-zero types and trend bars", () => {
    const breakdown = [
      { type: "water", label: "水", count: 4, color: "#4fb8d6" },
      { type: "milkTea", label: "奶茶", count: 2, color: "#ef7f8f" },
      { type: "americano", label: "美式", count: 0, color: "#7a5438" },
    ];
    const trend = [
      { dayKey: "2026-06-10", count: 3 },
      { dayKey: "2026-06-11", count: 1 },
    ];
    const { container } = render(
      <DrinkCompositionPanel breakdown={breakdown} trend={trend} />,
    );
    // 饼图扇区 = 非零类型数 = 2
    const slices = container.querySelectorAll("path[data-slice]");
    expect(slices.length).toBe(2);
    // 趋势柱 = 2
    const bars = container.querySelectorAll("rect[data-drink-bar]");
    expect(bars.length).toBe(2);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/report-center-drink-composition.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现 DrinkCompositionPanel**

```tsx
import type {
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";
import { EmptyState } from "./EmptyState";

const R = 50;
const C = 2 * Math.PI * R;

function arcPath(start: number, end: number): string {
  // start/end 为 0-1 占比
  if (end - start >= 1) {
    // 整圆（单类型退化）
    return `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z`;
  }
  const a0 = start * 2 * Math.PI - Math.PI / 2;
  const a1 = end * 2 * Math.PI - Math.PI / 2;
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

const BAR_W = 10;
const BAR_GAP = 3;
const TREND_H = 100;

export function DrinkCompositionPanel({
  breakdown,
  trend,
}: {
  breakdown: TeamDrinkBreakdownItem[];
  trend: TeamDrinkTrendPoint[];
}) {
  const nonZero = breakdown.filter((b) => b.count > 0);
  const total = nonZero.reduce((a, b) => a + b.count, 0);

  if (total === 0) {
    return (
      <div className="soft-card p-4">
        <h3 className="mb-2 text-sm font-bold text-main">水铺饮品构成</h3>
        <EmptyState message="暂无饮水数据" />
      </div>
    );
  }

  // 饼图扇区
  let acc = 0;
  const slices = nonZero.map((b) => {
    const start = acc / total;
    acc += b.count;
    const end = acc / total;
    return { ...b, start, end };
  });

  // 趋势柱
  const trendMax = Math.max(...trend.map((t) => t.count), 1);
  const trendW = trend.length * (BAR_W + BAR_GAP);

  return (
    <div className="soft-card p-4">
      <h3 className="mb-2 text-sm font-bold text-main">水铺饮品构成</h3>
      <div className="flex flex-wrap items-center gap-4">
        <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} role="img" aria-label="饮品构成">
          {slices.map((s) => (
            <path
              key={s.type}
              data-slice
              d={arcPath(s.start, s.end)}
              fill={s.color}
              stroke="#1f2937"
              strokeWidth={1}
            >
              <title>{`${s.label}: ${s.count} 杯 (${Math.round((s.count / total) * 100)}%)`}</title>
            </path>
          ))}
        </svg>
        <ul className="space-y-1 text-xs">
          {slices.map((s) => (
            <li key={s.type} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-[#1f2937]/40"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-main">{s.label}</span>
              <span className="text-sub">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
      {trend.length > 0 && (
        <svg className="mt-3" width={trendW} height={TREND_H} role="img" aria-label="每日饮水趋势">
          {trend.map((t, i) => {
            const h = (t.count / trendMax) * (TREND_H - 16);
            return (
              <rect
                key={t.dayKey}
                data-drink-bar
                x={i * (BAR_W + BAR_GAP)}
                y={TREND_H - h}
                width={BAR_W}
                height={Math.max(h, 2)}
                fill="#4fb8d6"
                stroke="#1f2937"
                strokeWidth={1}
              >
                <title>{`${t.dayKey}: ${t.count} 杯`}</title>
              </rect>
            );
          })}
        </svg>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/report-center-drink-composition.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/report-center/DrinkCompositionPanel.tsx __tests__/report-center-drink-composition.test.tsx
git commit -m "feat(team-dashboard): add DrinkCompositionPanel (pie + trend)"
```

---

## Task 12: SeasonSprintPanel 赛季冲刺通栏

**Files:**
- Create: `components/report-center/SeasonSprintPanel.tsx`
- Test: `__tests__/report-center-season-sprint.test.tsx`

**Interfaces:**
- Consumes: `ActiveSeasonSnapshot | null | undefined`（`lib/types.ts`，含 `targetSlots`/`filledSlots`/`contributions: BoardContribution[]`）、`EmptyState`
- Produces: `SeasonSprintPanel({ season })`
- 行为：无 season → "休赛期"占位；有 → 左进度条（filledSlots/targetSlots + 百分比）+ 右贡献占比饼图（按 slotContribution，0 贡献成员不显示，用 colorIndex 配色）

**成员颜色映射**：需确认 `colorIndex` 如何映射到具体颜色。核对打卡看板用的调色板。

- [ ] **Step 1: 核对成员调色板**

Run: `grep -rn "colorIndex\|MEMBER_COLORS\|memberColor\|palette" lib/ components/punch-board/ components/board/ | grep -i "color\|palette" | head -20`

找出现成的 `colorIndex → hex` 映射常量并记下其路径与名字，本组件 import 复用。若不存在，内联一个调色板数组。

- [ ] **Step 2: 写失败测试**

`__tests__/report-center-season-sprint.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeasonSprintPanel } from "@/components/report-center/SeasonSprintPanel";

describe("SeasonSprintPanel", () => {
  it("renders off-season placeholder when no season", () => {
    render(<SeasonSprintPanel season={null} />);
    expect(screen.getByText(/休赛期/)).toBeInTheDocument();
  });

  it("renders progress bar and contribution pie", () => {
    const season = {
      id: "s1",
      monthKey: "2026-06",
      goalName: "六月冲刺",
      targetSlots: 10,
      filledSlots: 4,
      contributions: [
        { userId: "u1", name: "张三", avatarKey: "a", colorIndex: 0, slotContribution: 3, seasonIncome: 0 },
        { userId: "u2", name: "李四", avatarKey: "b", colorIndex: 1, slotContribution: 1, seasonIncome: 0 },
        { userId: "u3", name: "王五", avatarKey: "c", colorIndex: 2, slotContribution: 0, seasonIncome: 0 },
      ],
    };
    const { container } = render(<SeasonSprintPanel season={season} />);
    expect(screen.getByText("六月冲刺")).toBeInTheDocument();
    // 进度文案 "已 4 / 目标 10"
    expect(screen.getByText(/4 \/ 10/)).toBeInTheDocument();
    // 贡献饼图扇区 = 非0贡献成员 = 2（王五 0 不显示）
    const slices = container.querySelectorAll("path[data-season-slice]");
    expect(slices.length).toBe(2);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run __tests__/report-center-season-sprint.test.tsx`
Expected: FAIL

- [ ] **Step 4: 实现 SeasonSprintPanel**

（成员调色板按 Step 1 核对结果 import 或内联。下方假设内联 `MEMBER_COLORS` 数组，若核对到现成常量则改为 import。）

```tsx
import type { ActiveSeasonSnapshot } from "@/lib/types";
import { EmptyState } from "./EmptyState";

// 若 Step 1 找到现成常量，改为 import；否则内联：
const MEMBER_COLORS = [
  "#fde047", "#4fb8d6", "#ef7f8f", "#7a5438",
  "#ef9d36", "#8f948e", "#a3e635", "#c084fc",
];

const R = 50;

function arcPath(start: number, end: number): string {
  if (end - start >= 1) {
    return `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z`;
  }
  const a0 = start * 2 * Math.PI - Math.PI / 2;
  const a1 = end * 2 * Math.PI - Math.PI / 2;
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function SeasonSprintPanel({ season }: { season: ActiveSeasonSnapshot | null }) {
  if (!season) {
    return (
      <div className="soft-card flex min-h-[120px] items-center justify-center p-4">
        <EmptyState message="休赛期，暂无冲刺目标" />
      </div>
    );
  }

  const pct = season.targetSlots > 0 ? season.filledSlots / season.targetSlots : 0;
  const contributors = season.contributions.filter((c) => c.slotContribution > 0);
  const totalContribution = contributors.reduce((a, c) => a + c.slotContribution, 0);

  let acc = 0;
  const slices = contributors.map((c) => {
    const start = totalContribution > 0 ? acc / totalContribution : 0;
    acc += c.slotContribution;
    const end = totalContribution > 0 ? acc / totalContribution : 1;
    return { ...c, start, end };
  });

  return (
    <div className="soft-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <h3 className="mb-2 text-sm font-bold text-main">赛季冲刺 · {season.goalName}</h3>
          <div className="h-6 w-full rounded border-2 border-[#1f2937] bg-[#f3f4f6]">
            <div
              className="h-full rounded-sm bg-[#fde047]"
              style={{ width: `${Math.min(pct, 1) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-sub">
            {Math.round(pct * 100)}% · 已 {season.filledSlots} / 目标 {season.targetSlots}
          </p>
        </div>
        {contributors.length > 0 && (
          <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} role="img" aria-label="贡献占比">
            {slices.map((s) => (
              <path
                key={s.userId}
                data-season-slice
                d={arcPath(s.start, s.end)}
                fill={MEMBER_COLORS[s.colorIndex % MEMBER_COLORS.length]}
                stroke="#1f2937"
                strokeWidth={1}
              >
                <title>{`${s.name}: ${s.slotContribution} 槽 (${Math.round((s.slotContribution / totalContribution) * 100)}%)`}</title>
              </path>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run __tests__/report-center-season-sprint.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/report-center/SeasonSprintPanel.tsx __tests__/report-center-season-sprint.test.tsx
git commit -m "feat(team-dashboard): add SeasonSprintPanel"
```

---

## Task 13: 重写 ReportCenter 容器 + 接线

**Files:**
- Modify: `components/report-center/ReportCenter.tsx`（重写）
- Test: `__tests__/report-center-container.test.tsx`

**Interfaces:**
- Consumes: `fetchTeamDashboardState`（Task 6）、所有面板组件（Task 8-12）、`useBoard()`（取 `activeSeason`）、`TeamHeader`/`MetricSummary`
- Produces: 默认导出 `ReportCenter`（被 `BoardApp` 的 `dash` tab dynamic import）

- [ ] **Step 1: 核对现有 ReportCenter 的导出方式与 BoardApp 接线**

Run: `grep -n "export\|default" components/report-center/ReportCenter.tsx | head` 和 `grep -rn "ReportCenter\|DynamicReportCenter" components/board/tab-component-loaders.ts components/board/dynamic-tabs.ts 2>/dev/null`
确认是 `export default` 还是具名，以及 dynamic import 路径。

- [ ] **Step 2: 写失败测试 — 容器渲染各模块**

`__tests__/report-center-container.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  fetchTeamDashboardState: vi.fn(),
}));
vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      activeSeason: {
        id: "s1", monthKey: "2026-06", goalName: "六月冲刺",
        targetSlots: 10, filledSlots: 4, contributions: [],
      },
    },
  }),
}));

import { fetchTeamDashboardState } from "@/lib/api";
import { ReportCenter } from "@/components/report-center/ReportCenter";

describe("ReportCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all panels after loading snapshot", async () => {
    (fetchTeamDashboardState as any).mockResolvedValue({
      period: { type: "month", startKey: "2026-06-01", endKey: "2026-06-15" },
      metrics: { completionRate: 0.5, totalPunches: 30, fullAttendanceDays: 4 },
      punchTrend: [{ dayKey: "2026-06-10", count: 2, isFullAttendance: true }],
      workoutBalance: [{ code: "chest", label: "胸", count: 1 }],
      drinkBreakdown: [{ type: "water", label: "水", count: 1, color: "#4fb8d6" }],
      drinkTrend: [{ dayKey: "2026-06-10", count: 1 }],
    });
    render(<ReportCenter />);
    await waitFor(() => expect(screen.getByText("战报中心")).toBeInTheDocument());
    expect(screen.getByText("50%")).toBeInTheDocument(); // MetricSummary
    expect(screen.getByText("六月冲刺")).toBeInTheDocument(); // SeasonSprint
    expect(screen.getByText("每日打卡趋势")).toBeInTheDocument();
    expect(screen.getByText("团队训练部位均衡")).toBeInTheDocument();
    expect(screen.getByText("水铺饮品构成")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run __tests__/report-center-container.test.tsx`
Expected: FAIL

- [ ] **Step 4: 重写 ReportCenter**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { DashboardPeriod, TeamDashboardSnapshot } from "@/lib/types";
import { fetchTeamDashboardState } from "@/lib/api";
import { useBoard } from "@/lib/store";
import { TeamHeader } from "./TeamHeader";
import { MetricSummary } from "./MetricSummary";
import { SeasonSprintPanel } from "./SeasonSprintPanel";
import { PunchTrendChart } from "./PunchTrendChart";
import { WorkoutBalancePanel } from "./WorkoutBalancePanel";
import { DrinkCompositionPanel } from "./DrinkCompositionPanel";
import { EmptyState } from "./EmptyState";

export function ReportCenter() {
  const { state } = useBoard();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [snapshot, setSnapshot] = useState<TeamDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTeamDashboardState(period)
      .then((snap) => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="space-y-4 p-4">
      <TeamHeader period={period} onPeriodChange={setPeriod} />

      {loading && !snapshot ? (
        <EmptyState message="加载中…" />
      ) : error ? (
        <div className="soft-card p-4">
          <EmptyState message="战报加载失败" />
          <button
            type="button"
            className="quest-btn mt-2"
            onClick={() => setPeriod(period)}
          >
            重试
          </button>
        </div>
      ) : snapshot ? (
        <>
          <MetricSummary metrics={snapshot.metrics} period={period} />
          <SeasonSprintPanel season={state.activeSeason ?? null} />
          <div className="grid gap-4 md:grid-cols-3">
            <PunchTrendChart points={snapshot.punchTrend} />
            <WorkoutBalancePanel items={snapshot.workoutBalance} />
            <DrinkCompositionPanel
              breakdown={snapshot.drinkBreakdown}
              trend={snapshot.drinkTrend}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ReportCenter;
```

> 若 Step 1 核对出现有是 `export default`，保留默认导出；若 BoardApp 用具名导入，保留具名。两者并存最安全。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run __tests__/report-center-container.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/report-center/ReportCenter.tsx __tests__/report-center-container.test.tsx
git commit -m "feat(team-dashboard): rewrite ReportCenter container with period fetch"
```

---

## Task 14: 删除退役文件 + 修正引用

**Files:**
- Delete: `components/report-center/report-data.ts`, `CoffeeReportPanel.tsx`, `TrendChart.tsx`, `DrinkReportPanel.tsx`, `Milestones.tsx`
- Modify: 任何仍 import 上述文件的文件（需核查）

- [ ] **Step 1: 核查退役文件的引用**

Run: `grep -rn "report-data\|CoffeeReportPanel\|TrendChart\|DrinkReportPanel\|Milestones" components/ app/ lib/ __tests__/ | grep -v "components/report-center/ReportCenter" `
列出所有引用点。除 ReportCenter（已在 Task 13 重写）外，其余引用需在删除前清理。

- [ ] **Step 2: 删除退役文件**

```bash
git rm components/report-center/report-data.ts \
       components/report-center/CoffeeReportPanel.tsx \
       components/report-center/TrendChart.tsx \
       components/report-center/DrinkReportPanel.tsx \
       components/report-center/Milestones.tsx
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误。若有残留引用报错，回到 Step 1 修正引用点。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(team-dashboard): remove retired report-center files"
```

---

## Task 15: 全量验证

**Files:** 无新增

- [ ] **Step 1: 跑全部测试**

Run: `npm test`
Expected: 全绿

- [ ] **Step 2: lint + build**

Run: `npm run lint && npm run build`
Expected: 全绿

- [ ] **Step 3: 手动冒烟（可选但推荐）**

Run: `npm run dev`，登录后访问 `/report`：
- 默认本月视图，4 模块 + 摘要 + 赛季通栏可见
- 切到本年，趋势图变 12 根
- 无 active 赛季时（可在 dev DB 模拟）赛季通栏显示休赛期占位

- [ ] **Step 4: Commit（若有 lint/格式修正）**

```bash
git add -A
git commit -m "chore(team-dashboard): final verification pass"
```

---

## Self-Review

**Spec coverage 核对：**
- 4 模块（打卡趋势/训练部位/水铺构成/赛季冲刺）→ Task 9/10/11/12 ✓
- 摘要条 3 卡（去本月高光）→ Task 8 ✓
- Header + 周期切换 → Task 7/8/13 ✓
- 新建后端聚合 + route → Task 2/3/5 ✓
- 周期切换本月/本年，赛季独立 → Task 3（年视图）/ Task 12（赛季不参与切换）✓
- 退役 5 文件 → Task 14 ✓
- 测试（聚合 + route + 组件）→ Task 2/3/4/5/8/9/10/11/12/13 ✓
- 边界（空团队/无赛季/全0/单类型饼图/年视图当前月未补全）→ Task 4/11/12/3 ✓
- 共享 PeriodSwitcher + 牛马日历接入 → Task 7 新建组件；牛马日历接入属于"改进正在工作的代码"，可作为 follow-up，本计划范围聚焦战报中心重做，不强制接入（spec 用词"顺手"）。

**Placeholder scan:** 无 TBD/TODO；每步含完整代码或确切命令。

**Type consistency:** `TeamDashboardSnapshot` 各字段在 Task 1 定义后，Task 2-13 引用一致；`buildTeamDashboardSnapshot(teamId, period, now?)` 签名贯穿 Task 2/3/5；`fetchTeamDashboardState(period)` 贯穿 Task 6/13；组件 props（`points`/`items`/`breakdown`+`trend`/`season`/`metrics`+`period`）命名一致。
