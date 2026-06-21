# Dashboard Historical Periods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让牛马日历（个人看板）和战报中心（团队看板）能翻页查看任意历史月/年数据。

**Architecture:** period 从"粒度"升级为"粒度+锚点"（`DashboardScope`），新增 `lib/dashboard-scope.ts` 纯工具函数算 startKey/endKey（历史完整周期 endKey=月末/年末），共享 `PeriodNavigator` 组件（‹/› 翻页 + 文案复位 + "按月/按年" toggle）。两个聚合函数（team/personal）和两个 API route 改用 scope。

**Tech Stack:** Next.js 15 App Router / TypeScript strict / Prisma SQLite / Vitest + jsdom / 自实现 UI（无外部组件库）/ Tailwind v4 Brutalist

## Global Constraints

- TypeScript strict，禁止 `any`（测试内 `as any` mock 可接受）
- 时区统一 Asia/Shanghai，dayKey 格式 `YYYY-MM-DD`，monthKey 格式 `YYYY-MM-YYYY`
- 历史完整周期 endKey = 月末/年末（不是今天）；当期 endKey = 今天
- 不能查看未来周期（`›` 到当前禁用；route 层未来锚点回退当期）
- 战报赛季冲刺永远显示当前 active 赛季，不随 scope 变
- 牛马日历 12 个月热力图永远滚动 12 个月，不随 scope 变
- Prisma Client import 路径：`@/lib/generated/prisma/client`
- 测试文件约定：`__tests__/*.test.ts`，describe/it/expect 全局可用
- 组件测试用项目模式：`react-dom/client` createRoot + `react` act + `container.textContent`/`querySelectorAll`（项目无 `@testing-library/react`），顶部设 `(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true`
- 部位/饮品常量直接 import：`lib/workouts.ts` 的 `STRENGTH_PARTS`/`CARDIO_ITEMS`、`lib/drinks.ts` 的 `drinkCatalog`/`isDrinkType`
- 饮品聚合排除 `deletedAt != null` 软删除记录

## 澄清决定（spec 歧义，plan 采纳）

- **月历不加翻月按钮**：当前 `MonthCalendar` 无翻月 UI，spec 提"月历翻月同步 scope"指未来能力。本次月历只**跟随** scope 的月显示（scope.monthKey → 后端 buildDashboardMonthSnapshotForUser 用该 monthKey），不为月历新增翻页按钮（避免与顶部 PeriodNavigator 重复导航）。

---

## File Structure

**新增**
- `lib/dashboard-scope.ts` —— scope 纯工具：`currentScope`/`prevScope`/`nextScope`/`isCurrentScope`/`scopeToStartEnd`/`formatScopeLabel`/`scopeToQuery`
- `components/dashboard/PeriodNavigator.tsx` —— 共享导航器（战报+牛马日历共用）
- `__tests__/dashboard-scope.test.ts` —— scope 工具测试
- `__tests__/period-navigator.test.tsx` —— 导航器组件测试

**修改（后端）**
- `lib/types.ts` —— 加 `DashboardScope`（保留 `DashboardPeriod`）
- `lib/team-dashboard-state.ts` —— `buildTeamDashboardSnapshot(teamId, scope, now?)`
- `lib/dashboard-state.ts` —— `buildDashboardSnapshotForUser(userId, scope, now?)`；`buildDashboardMonthSnapshotForUser` 用 scope 的 monthKey
- `app/api/dashboard/team-state/route.ts` —— query → scope
- `app/api/dashboard/state/route.ts` —— query → scope

**修改（前端）**
- `lib/api.ts` —— `fetchTeamDashboardState(scope)` / `fetchDashboardState(scope)`
- `components/report-center/ReportCenter.tsx` —— 持 scope，接 PeriodNavigator
- `components/report-center/TeamHeader.tsx` —— 用 PeriodNavigator，副文案用 formatScopeLabel
- `components/dashboard/DashboardBoard.tsx` —— 持 scope，接 PeriodNavigator
- `components/dashboard/DashboardHeader.tsx` —— 用 PeriodNavigator
- `__tests__/dashboard-state.test.ts` / `__tests__/team-dashboard-state.test.ts` —— 改签名 + 历史月用例
- `__tests__/team-dashboard-state-api.test.ts` / `__tests__/dashboard-state-api.test.ts`（若有）—— 改 query
- `__tests__/report-center-container.test.tsx` —— 改 mock 签名
- `__tests__/dashboard-board.test.tsx` —— 改 mock 签名

**删除**
- `components/report-center/PeriodSwitcher.tsx`（被 PeriodNavigator 取代）

---

## Task 1: DashboardScope 类型

**Files:**
- Modify: `lib/types.ts`（在 `DashboardPeriod` 定义附近追加）

**Interfaces:**
- Produces: `DashboardScope = { type: "month"; monthKey: string } | { type: "year"; year: number }`

- [ ] **Step 1: 追加类型**

在 `lib/types.ts` 的 `DashboardPeriod`（约 line 630 `export type DashboardPeriod = "month" | "year";`）之后追加：

```ts
/** 带锚点的统计周期：粒度 + 具体哪个月/年。支持历史周期翻页。 */
export type DashboardScope =
  | { type: "month"; monthKey: string } // "2026-05"
  | { type: "year"; year: number }; // 2025
```

- [ ] **Step 2: 验证类型编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(dashboard): add DashboardScope type"
```

---

## Task 2: dashboard-scope 纯工具函数（核心）

这是整个改造的数据基础。TDD。

**Files:**
- Create: `lib/dashboard-scope.ts`
- Test: `__tests__/dashboard-scope.test.ts`

**Interfaces:**
- Consumes: `DashboardScope`（Task 1）、`getShanghaiDayKey`（`lib/economy.ts` 已 export）
- Produces:
  - `currentScope(now: Date, type?: "month" | "year"): DashboardScope`
  - `prevScope(scope: DashboardScope): DashboardScope`
  - `nextScope(scope: DashboardScope): DashboardScope`
  - `isCurrentScope(scope: DashboardScope, now: Date): boolean`
  - `scopeToStartEnd(scope, now): { startKey: string; endKey: string; isComplete: boolean }`
  - `formatScopeLabel(scope: DashboardScope): string`（"2026年5月" / "2026年"）
  - `scopeToQuery(scope: DashboardScope): string`（"period=month&monthKey=2026-05"）

- [ ] **Step 1: 写失败测试**

`__tests__/dashboard-scope.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import {
  currentScope,
  prevScope,
  nextScope,
  isCurrentScope,
  scopeToStartEnd,
  formatScopeLabel,
  scopeToQuery,
} from "@/lib/dashboard-scope";

// 固定"今天"为 2026-06-15（上海时区）
const NOW = new Date("2026-06-15T03:00:00Z");

describe("currentScope", () => {
  it("returns current month by default", () => {
    expect(currentScope(NOW)).toEqual({ type: "month", monthKey: "2026-06" });
  });
  it("returns current year when type=year", () => {
    expect(currentScope(NOW, "year")).toEqual({ type: "year", year: 2026 });
  });
});

describe("prevScope / nextScope", () => {
  it("month prev crosses year boundary", () => {
    expect(prevScope({ type: "month", monthKey: "2026-01" })).toEqual({
      type: "month",
      monthKey: "2025-12",
    });
  });
  it("month next increments", () => {
    expect(nextScope({ type: "month", monthKey: "2026-05" })).toEqual({
      type: "month",
      monthKey: "2026-06",
    });
  });
  it("year prev/next", () => {
    expect(prevScope({ type: "year", year: 2026 })).toEqual({ type: "year", year: 2025 });
    expect(nextScope({ type: "year", year: 2025 })).toEqual({ type: "year", year: 2026 });
  });
});

describe("isCurrentScope", () => {
  it("true for current month/year, false for historical", () => {
    expect(isCurrentScope({ type: "month", monthKey: "2026-06" }, NOW)).toBe(true);
    expect(isCurrentScope({ type: "month", monthKey: "2026-05" }, NOW)).toBe(false);
    expect(isCurrentScope({ type: "year", year: 2026 }, NOW)).toBe(true);
    expect(isCurrentScope({ type: "year", year: 2025 }, NOW)).toBe(false);
  });
});

describe("scopeToStartEnd", () => {
  it("historical month: endKey = month end", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2026-05" }, NOW)).toEqual({
      startKey: "2026-05-01",
      endKey: "2026-05-31",
      isComplete: true,
    });
  });
  it("current month: endKey = today", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2026-06" }, NOW)).toEqual({
      startKey: "2026-06-01",
      endKey: "2026-06-15",
      isComplete: false,
    });
  });
  it("february leap year", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2024-02" }, NOW)).toEqual({
      startKey: "2024-02-01",
      endKey: "2024-02-29",
      isComplete: true,
    });
  });
  it("february common year", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2026-02" }, NOW)).toEqual({
      startKey: "2026-02-01",
      endKey: "2026-02-28",
      isComplete: true,
    });
  });
  it("historical year: endKey = year end", () => {
    expect(scopeToStartEnd({ type: "year", year: 2025 }, NOW)).toEqual({
      startKey: "2025-01-01",
      endKey: "2025-12-31",
      isComplete: true,
    });
  });
  it("current year: endKey = today", () => {
    expect(scopeToStartEnd({ type: "year", year: 2026 }, NOW)).toEqual({
      startKey: "2026-01-01",
      endKey: "2026-06-15",
      isComplete: false,
    });
  });
});

describe("formatScopeLabel", () => {
  it("month label", () => {
    expect(formatScopeLabel({ type: "month", monthKey: "2026-05" })).toBe("2026年5月");
  });
  it("year label", () => {
    expect(formatScopeLabel({ type: "year", year: 2025 })).toBe("2025年");
  });
});

describe("scopeToQuery", () => {
  it("month query", () => {
    expect(scopeToQuery({ type: "month", monthKey: "2026-05" })).toBe(
      "period=month&monthKey=2026-05",
    );
  });
  it("year query", () => {
    expect(scopeToQuery({ type: "year", year: 2025 })).toBe("period=year&year=2025");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/dashboard-scope.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

创建 `lib/dashboard-scope.ts`：

```ts
import { getShanghaiDayKey } from "@/lib/economy";
import type { DashboardScope } from "@/lib/types";

/** 当前周期（默认月） */
export function currentScope(now: Date, type: "month" | "year" = "month"): DashboardScope {
  const todayKey = getShanghaiDayKey(now);
  if (type === "year") {
    return { type: "year", year: Number(todayKey.slice(0, 4)) };
  }
  return { type: "month", monthKey: todayKey.slice(0, 7) };
}

/** 上一个周期 */
export function prevScope(scope: DashboardScope): DashboardScope {
  if (scope.type === "year") {
    return { type: "year", year: scope.year - 1 };
  }
  const [year, month] = scope.monthKey.split("-").map(Number);
  const idx = year * 12 + (month - 1) - 1;
  return { type: "month", monthKey: formatMonthKey(Math.floor(idx / 12), (idx % 12) + 1) };
}

/** 下一个周期 */
export function nextScope(scope: DashboardScope): DashboardScope {
  if (scope.type === "year") {
    return { type: "year", year: scope.year + 1 };
  }
  const [year, month] = scope.monthKey.split("-").map(Number);
  const idx = year * 12 + (month - 1) + 1;
  return { type: "month", monthKey: formatMonthKey(Math.floor(idx / 12), (idx % 12) + 1) };
}

/** 是否为当前周期（不允许超过当前） */
export function isCurrentScope(scope: DashboardScope, now: Date): boolean {
  const todayKey = getShanghaiDayKey(now);
  if (scope.type === "year") {
    return scope.year === Number(todayKey.slice(0, 4));
  }
  return scope.monthKey === todayKey.slice(0, 7);
}

/** scope → startKey/endKey/isComplete。历史完整周期 endKey=月末/年末 */
export function scopeToStartEnd(
  scope: DashboardScope,
  now: Date,
): { startKey: string; endKey: string; isComplete: boolean } {
  const todayKey = getShanghaiDayKey(now);
  if (scope.type === "month") {
    const startKey = `${scope.monthKey}-01`;
    const isComplete = scope.monthKey < todayKey.slice(0, 7);
    const [year, month] = scope.monthKey.split("-").map(Number);
    const endKey = isComplete
      ? `${scope.monthKey}-${String(lastDayOfMonth(year, month)).padStart(2, "0")}`
      : todayKey;
    return { startKey, endKey, isComplete };
  }
  const startKey = `${scope.year}-01-01`;
  const isComplete = scope.year < Number(todayKey.slice(0, 4));
  const endKey = isComplete ? `${scope.year}-12-31` : todayKey;
  return { startKey, endKey, isComplete };
}

/** scope → 中文标签 */
export function formatScopeLabel(scope: DashboardScope): string {
  if (scope.type === "year") {
    return `${scope.year}年`;
  }
  const month = Number(scope.monthKey.slice(5, 7));
  return `${scope.monthKey.slice(0, 4)}年${month}月`;
}

/** scope → API query string */
export function scopeToQuery(scope: DashboardScope): string {
  if (scope.type === "year") {
    return `period=year&year=${scope.year}`;
  }
  return `period=month&monthKey=${scope.monthKey}`;
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  // month: 1-12。用下个月第 0 天 = 本月最后一天
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/dashboard-scope.test.ts`
Expected: PASS（全部用例）

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard-scope.ts __tests__/dashboard-scope.test.ts
git commit -m "feat(dashboard): add scope utility functions for historical periods"
```

---

## Task 3: team-dashboard-state 改用 scope

**Files:**
- Modify: `lib/team-dashboard-state.ts`
- Test: `__tests__/team-dashboard-state.test.ts`

**Interfaces:**
- Consumes: `DashboardScope`、`scopeToStartEnd`（Task 2）
- Produces: `buildTeamDashboardSnapshot(teamId: string, scope: DashboardScope, now?: Date): Promise<TeamDashboardSnapshot | null>`

**关键改动**：`buildTeamDashboardSnapshot(teamId, period, now)` → `buildTeamDashboardSnapshot(teamId, scope, now)`。startKey/endKey 由 `scopeToStartEnd(scope, now)` 算（不再恒 today）。年视图聚合：`isComplete=true` 时聚合 1-12 月，否则聚合 1 到当前月。elapsedDays 仍 `countElapsedDays(startKey, endKey)`。

- [ ] **Step 1: 改测试签名（先红）**

`__tests__/team-dashboard-state.test.ts` 把所有 `buildTeamDashboardSnapshot("team-1", "month", NOW)` 改为 `buildTeamDashboardSnapshot("team-1", { type: "month", monthKey: "2026-06" }, NOW)`，`"year"` 改为 `{ type: "year", year: 2026 }`。注意 NOW 固定 2026-06-15，当月 monthKey="2026-06"。

新增历史月用例（追加到文件末尾新 describe 块）：

```ts
describe("buildTeamDashboardSnapshot - historical month", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses month-end as endKey for a complete historical month", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2026-05-10", punched: true },
              { dayKey: "2026-05-31", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot(
      "team-1",
      { type: "month", monthKey: "2026-05" },
      NOW,
    );
    // 历史月 endKey = 05-31，punchTrend 覆盖 05-01..05-31 = 31 天
    expect(snap!.period).toEqual({
      type: "month",
      startKey: "2026-05-01",
      endKey: "2026-05-31",
    });
    expect(snap!.punchTrend.length).toBe(31);
    expect(snap!.metrics.totalPunches).toBe(2);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: FAIL（签名不匹配 / period 参数类型错）

- [ ] **Step 3: 改实现**

修改 `lib/team-dashboard-state.ts`：

顶部 import 改：
```ts
import { scopeToStartEnd } from "@/lib/dashboard-scope";
import type {
  DashboardScope,
  TeamDashboardSnapshot,
  TeamPunchTrendPoint,
  TeamWorkoutBalanceItem,
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";
```
（移除 `DashboardPeriod` import，改 `DashboardScope`）

函数签名与 startKey/endKey 改：
```ts
export async function buildTeamDashboardSnapshot(
  teamId: string,
  scope: DashboardScope,
  now: Date = new Date(),
): Promise<TeamDashboardSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const year = Number(todayDayKey.slice(0, 4));
  const { startKey, endKey, isComplete } = scopeToStartEnd(scope, now);
  // ... prisma 查询用 startKey/endKey 不变
```

年视图聚合分支改（原 `if (period === "month")` 改为 `if (scope.type === "month")`，else 年视图里 currentMonth 改为按 isComplete）：
```ts
  } else {
    // 年视图：历史年聚合 1-12 月，当年聚合 1 到当前月
    const lastMonth = isComplete ? 12 : Number(todayDayKey.slice(5, 7));
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
    for (let m = 1; m <= lastMonth; m++) {
      const monthKey2 = `${scope.year}-${String(m).padStart(2, "0")}`;
      const count = punchByMonth.get(monthKey2) ?? 0;
      punchTrend.push({ dayKey: monthKey2, count, isFullAttendance: false });
      drinkTrend.push({ dayKey: monthKey2, count: drinkByMonth.get(monthKey2) ?? 0 });
    }
  }
```

返回的 period 字段改：
```ts
  return {
    period: { type: scope.type, startKey, endKey },
    // ... 其余不变
```

> 注意：原代码里 `const year = ...`、`const monthKey = todayDayKey.slice(0,7)` 等局部变量若与新逻辑冲突，按需调整。年视图的 `scope.year` 替代原 `year`。仔细通读改动后跑测试。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/team-dashboard-state.test.ts`
Expected: PASS（含历史月用例）

- [ ] **Step 5: Commit**

```bash
git add lib/team-dashboard-state.ts __tests__/team-dashboard-state.test.ts
git commit -m "feat(team-dashboard): accept DashboardScope in aggregator"
```

---

## Task 4: dashboard-state（个人版）改用 scope

**Files:**
- Modify: `lib/dashboard-state.ts`
- Test: `__tests__/dashboard-state.test.ts`

**Interfaces:**
- Consumes: `DashboardScope`、`scopeToStartEnd`（Task 2）
- Produces: `buildDashboardSnapshotForUser(userId: string, scope: DashboardScope, now?: Date): Promise<DashboardSnapshot | null>`

**关键改动**：同 Task 3。额外：`buildDashboardMonthSnapshotForUser(userId, currentMonthKey, now)` 里的 `currentMonthKey` 改为 `scope.type === "month" ? scope.monthKey : currentMonthKey`（年视图时月历仍显示当前月——spec 决定年视图下月历保持不变）。

- [ ] **Step 1: 改测试签名**

`__tests__/dashboard-state.test.ts` 所有 `buildDashboardSnapshotForUser(userId, "month", ...)` 改 `{ type: "month", monthKey: "2026-06" }`，`"year"` 改 `{ type: "year", year: 2026 }`。NOW 对应 2026-06。新增一个历史月用例验证 endKey=月末（参考 Task 3 用例结构）。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/dashboard-state.test.ts`
Expected: FAIL

- [ ] **Step 3: 改实现**

修改 `lib/dashboard-state.ts`：
- import 加 `scopeToStartEnd`、`DashboardScope`，移除/保留 `DashboardPeriod`（route 兼容可能还用，保留 import 无害）
- `buildDashboardSnapshotForUser(userId, scope: DashboardScope, now?)` 内：`const { startKey: summaryStartDayKey, endKey: todayDayKey } = scopeToStartEnd(scope, now)`（替换原 `period === "month" ? ... : ...`）
- `buildDashboardMonthSnapshotForUser` 调用处：`const calendarMonthKey = scope.type === "month" ? scope.monthKey : getShanghaiDayKey(now).slice(0, 7)`，传 `calendarMonthKey`
- 年视图相关逻辑（若有按月聚合）按 `isComplete` 调整，参照 Task 3

仔细通读 `lib/dashboard-state.ts` 全文，确保所有 `period` 引用改为 `scope`，`summaryStartDayKey`/`todayDayKey` 来源正确。heatmap 仍用滚动 12 个月（`getRollingHeatmapStartDayKey`），不受 scope 影响——确认不破坏。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/dashboard-state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard-state.ts __tests__/dashboard-state.test.ts
git commit -m "feat(dashboard): accept DashboardScope in personal aggregator"
```

---

## Task 5: team-state API route 改用 scope

**Files:**
- Modify: `app/api/dashboard/team-state/route.ts`
- Test: `__tests__/team-dashboard-state-api.test.ts`

**Interfaces:**
- Consumes: `scopeToStartEnd`、`currentScope`（Task 2）、`buildTeamDashboardSnapshot`（Task 3）、`DashboardScope`
- Produces: `GET /api/dashboard/team-state?period=month&monthKey=YYYY-MM` / `?period=year&year=YYYY`，缺省锚点=当期，未来锚点回退当期

- [ ] **Step 1: 改测试**

`__tests__/team-dashboard-state-api.test.ts`：现有用例 `toHaveBeenCalledWith("team-1", "month", expect.any(Date))` 改为 `toHaveBeenCalledWith("team-1", expect.objectContaining({ type: "month" }), expect.any(Date))`。新增用例：

```ts
it("passes monthKey from query as scope", async () => {
  (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
  (buildTeamDashboardSnapshot as any).mockResolvedValue({
    period: { type: "month", startKey: "2026-05-01", endKey: "2026-05-31" },
    metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
    punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
  });
  const res = await GET(makeReq("u1", "month", "2026-05"));
  expect(res.status).toBe(200);
  expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
    "team-1",
    { type: "month", monthKey: "2026-05" },
    expect.any(Date),
  );
});

it("falls back to current month for future monthKey", async () => {
  (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
  (buildTeamDashboardSnapshot as any).mockResolvedValue({
    period: { type: "month", startKey: "2026-06-01", endKey: "2026-06-15" },
    metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
    punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
  });
  // monthKey=2026-12 在 NOW(2026-06) 之后 → 回退当月
  const res = await GET(makeReq("u1", "month", "2026-12"));
  expect(res.status).toBe(200);
  expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
    "team-1",
    { type: "month", monthKey: "2026-06" },
    expect.any(Date),
  );
});
```

（`makeReq` 签名可能要加第 3 参 monthKey/year，按现有 helper 调整。`period=year` 类似加 `year` 参数。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/team-dashboard-state-api.test.ts`
Expected: FAIL

- [ ] **Step 3: 改实现**

修改 `app/api/dashboard/team-state/route.ts`，把 query 解析为 scope：

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";
import { currentScope, isCurrentScope } from "@/lib/dashboard-scope";
import type { DashboardScope } from "@/lib/types";

function parseScopeFromQuery(searchParams: URLSearchParams, now: Date): DashboardScope {
  const rawPeriod = searchParams.get("period");
  if (rawPeriod === "year") {
    const rawYear = Number(searchParams.get("year"));
    const currentYear = currentScope(now, "year").year;
    const year = Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= currentYear
      ? rawYear
      : currentYear;
    return { type: "year", year };
  }
  // month（默认）
  const rawMonthKey = searchParams.get("monthKey");
  const currentMonthKey = currentScope(now, "month").monthKey;
  const monthKey =
    rawMonthKey && /^\d{4}-\d{2}$/.test(rawMonthKey) && rawMonthKey <= currentMonthKey
      ? rawMonthKey
      : currentMonthKey;
  return { type: "month", monthKey };
}

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
  const now = new Date();
  const scope = parseScopeFromQuery(new URL(request.url).searchParams, now);
  try {
    const snapshot = await buildTeamDashboardSnapshot(user.teamId, scope, now);
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

> 注意 `isCurrentScope` import 若未用到可移除；上面逻辑用 `<= currentMonthKey` / `<= currentYear` 直接挡未来，`isCurrentScope` 可不引入。按实际用到的 import 清理。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/team-dashboard-state-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/dashboard/team-state/route.ts __tests__/team-dashboard-state-api.test.ts
git commit -m "feat(team-dashboard): parse scope from team-state query"
```

---

## Task 6: state API route（个人版）改用 scope

**Files:**
- Modify: `app/api/dashboard/state/route.ts`
- Test: `__tests__/dashboard-state-api.test.ts`（若存在；先 `ls __tests__ | grep dashboard-state` 确认，若无则新建）

**Interfaces:**
- Consumes: 同 Task 5 模式
- Produces: `GET /api/dashboard/state?period=month&monthKey=YYYY-MM` / `?period=year&year=YYYY`

- [ ] **Step 1: 确认测试文件存在**

Run: `ls __tests__ | grep -i dashboard-state`
若无 api 测试文件，新建 `__tests__/dashboard-state-api.test.ts`，参照 Task 5 的 team-state api 测试结构（mock `@/lib/prisma` 的 user.findUnique + `@/lib/dashboard-state` 的 buildDashboardSnapshotForUser）。若有，改其断言为 scope 形式 + 加历史/未来锚点用例。

- [ ] **Step 2: 写/改测试**

参照 Task 5 Step 1 的用例（替换 `buildTeamDashboardSnapshot` 为 `buildDashboardSnapshotForUser`，route 为 `/api/dashboard/state`）。覆盖：缺省当月、`monthKey=2026-05` 历史、`monthKey=2026-12` 未来回退、`period=year&year=2025`、`period=year&year=2030` 未来回退。

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run __tests__/dashboard-state-api.test.ts`
Expected: FAIL（route 还用旧 period）

- [ ] **Step 4: 改实现**

修改 `app/api/dashboard/state/route.ts`：复用 Task 5 的 `parseScopeFromQuery`（可抽到 `lib/dashboard-scope.ts` 导出，避免重复——见 Step 4a）。调用 `buildDashboardSnapshotForUser(userId, scope, now)`。

**Step 4a（DRY）**：把 `parseScopeFromQuery` 移到 `lib/dashboard-scope.ts` 导出（`export function parseScopeFromQuery(searchParams: URLSearchParams, now: Date): DashboardScope`），两个 route 共用。在 Task 2 的测试文件补 `parseScopeFromQuery` 用例（缺省当月、历史 monthKey、未来回退、year 同理）。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run __tests__/dashboard-state-api.test.ts __tests__/dashboard-scope.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/dashboard/state/route.ts lib/dashboard-scope.ts __tests__/dashboard-state-api.test.ts __tests__/dashboard-scope.test.ts
git commit -m "feat(dashboard): parse scope from state query, share parseScopeFromQuery"
```

---

## Task 7: lib/api.ts client helper 改用 scope

**Files:**
- Modify: `lib/api.ts`（`fetchTeamDashboardState` + `fetchDashboardState`）

**Interfaces:**
- Consumes: `DashboardScope`、`scopeToQuery`（Task 2）
- Produces: `fetchTeamDashboardState(scope): Promise<TeamDashboardSnapshot>`、`fetchDashboardState(scope): Promise<DashboardSnapshot>`

- [ ] **Step 1: 改 helper**

修改 `lib/api.ts`：
```ts
import { scopeToQuery } from "@/lib/dashboard-scope";
// import type 加 DashboardScope

export async function fetchTeamDashboardState(
  scope: DashboardScope,
): Promise<TeamDashboardSnapshot> {
  const response = await fetch(`/api/dashboard/team-state?${scopeToQuery(scope)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{ snapshot: TeamDashboardSnapshot }>(
    response,
    "获取团队战报失败",
  );
  return payload.snapshot;
}

export async function fetchDashboardState(
  scope: DashboardScope,
): Promise<DashboardSnapshot> {
  const response = await fetch(`/api/dashboard/state?${scopeToQuery(scope)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  return readDashboardSnapshot(response);
}
```

- [ ] **Step 2: tsc 确认**

Run: `npx tsc --noEmit`
Expected: 调用方（ReportCenter/DashboardBoard）会报签名不匹配——这是预期的，后续 task 修。本 task 只确认 api.ts 本身编译。若 tsc 因调用方报错，记录调用方位置（ReportCenter、DashboardBoard），后续 task 修。

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat(dashboard): fetch helpers accept DashboardScope"
```

---

## Task 8: PeriodNavigator 共享组件

**Files:**
- Create: `components/dashboard/PeriodNavigator.tsx`
- Test: `__tests__/period-navigator.test.tsx`

**Interfaces:**
- Consumes: `DashboardScope`、`currentScope`/`prevScope`/`nextScope`/`isCurrentScope`/`formatScopeLabel`（Task 2）
- Produces: `PeriodNavigator({ scope, onScopeChange }: { scope: DashboardScope; onScopeChange: (s: DashboardScope) => void })`

**行为**：左侧 `‹`（prevScope，始终可用）+ 中间周期文案（点击=回到当前）+ `›`（nextScope，到当前禁用）；右侧"按月/按年"toggle（切换+重置当期）。`now` 用 `new Date()`（组件内），测试时通过控制 scope 与真实日期断言禁用态——为确定性，组件接受可选 `now?: Date` prop（默认 `new Date()`），测试传入固定 NOW。

- [ ] **Step 1: 写失败测试**

`__tests__/period-navigator.test.tsx`：

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PeriodNavigator } from "@/components/dashboard/PeriodNavigator";
import type { DashboardScope } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date("2026-06-15T03:00:00Z");

describe("PeriodNavigator", () => {
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

  it("renders current period label and disables next at current", () => {
    const scope: DashboardScope = { type: "month", monthKey: "2026-06" };
    act(() => {
      root.render(<PeriodNavigator scope={scope} onScopeChange={() => {}} now={NOW} />);
    });
    expect(container.textContent).toContain("2026年6月");
    // › 在当前周期禁用
    const nextBtn = container.querySelectorAll("button")[1];
    expect(nextBtn.disabled).toBe(true);
    // ‹ 可用
    const prevBtn = container.querySelectorAll("button")[0];
    expect(prevBtn.disabled).toBe(false);
  });

  it("clicking prev calls onScopeChange with previous month", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-06" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    const prevBtn = container.querySelectorAll("button")[0] as HTMLButtonElement;
    act(() => prevBtn.click());
    expect(onChange).toHaveBeenCalledWith({ type: "month", monthKey: "2026-05" });
  });

  it("clicking the label resets to current", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-05" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    // 中间文案按钮（‹ [label] › 中第二个之后的 label 按钮）
    const labelBtn = container.querySelector("button[data-period-label]") as HTMLButtonElement;
    expect(labelBtn).not.toBeNull();
    act(() => labelBtn.click());
    expect(onChange).toHaveBeenCalledWith({ type: "month", monthKey: "2026-06" });
  });

  it("clicking 按年 toggles to current year scope", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-05" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    const yearBtn = container.querySelector("button[data-granularity='year']") as HTMLButtonElement;
    act(() => yearBtn.click());
    expect(onChange).toHaveBeenCalledWith({ type: "year", year: 2026 });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run __tests__/period-navigator.test.tsx`
Expected: FAIL（组件不存在）

- [ ] **Step 3: 实现组件**

创建 `components/dashboard/PeriodNavigator.tsx`：

```tsx
"use client";

import {
  currentScope,
  formatScopeLabel,
  isCurrentScope,
  nextScope,
  prevScope,
} from "@/lib/dashboard-scope";
import type { DashboardScope } from "@/lib/types";

interface PeriodNavigatorProps {
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  now?: Date;
}

export function PeriodNavigator({ scope, onScopeChange, now = new Date() }: PeriodNavigatorProps) {
  const atCurrent = isCurrentScope(scope, now);

  const handleToggle = (type: "month" | "year") => {
    if (scope.type === type) return;
    onScopeChange(currentScope(now, type));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-lg border-2 border-[#1f2937] bg-white p-1">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm font-black text-[#1f2937] hover:bg-[#fde047]/40 disabled:opacity-30"
          onClick={() => onScopeChange(prevScope(scope))}
          aria-label="上一个周期"
        >
          ‹
        </button>
        <button
          type="button"
          data-period-label
          className="rounded-md px-3 py-1 text-sm font-extrabold text-[#1f2937] hover:bg-[#fde047]/40"
          onClick={() => onScopeChange(currentScope(now, scope.type))}
          title="回到当前周期"
        >
          {formatScopeLabel(scope)}
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm font-black text-[#1f2937] hover:bg-[#fde047]/40 disabled:opacity-30"
          onClick={() => onScopeChange(nextScope(scope))}
          disabled={atCurrent}
          aria-label="下一个周期"
        >
          ›
        </button>
      </div>

      <div className="inline-flex gap-1 rounded-lg border-2 border-[#1f2937] bg-white p-1" role="group" aria-label="统计粒度">
        <button
          type="button"
          data-granularity="month"
          className={`rounded-md px-3 py-1 text-sm font-bold transition-colors ${
            scope.type === "month" ? "bg-[#fde047] text-[#1f2937]" : "text-[#1f2937] hover:bg-[#fde047]/40"
          }`}
          onClick={() => handleToggle("month")}
          aria-pressed={scope.type === "month"}
        >
          按月
        </button>
        <button
          type="button"
          data-granularity="year"
          className={`rounded-md px-3 py-1 text-sm font-bold transition-colors ${
            scope.type === "year" ? "bg-[#fde047] text-[#1f2937]" : "text-[#1f2937] hover:bg-[#fde047]/40"
          }`}
          onClick={() => handleToggle("year")}
          aria-pressed={scope.type === "year"}
        >
          按年
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/period-navigator.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/PeriodNavigator.tsx __tests__/period-navigator.test.tsx
git commit -m "feat(dashboard): add shared PeriodNavigator component"
```

---

## Task 9: 战报中心接入 PeriodNavigator

**Files:**
- Modify: `components/report-center/ReportCenter.tsx`
- Modify: `components/report-center/TeamHeader.tsx`
- Modify: `__tests__/report-center-container.test.tsx`
- Delete: `components/report-center/PeriodSwitcher.tsx`

**Interfaces:**
- Consumes: `PeriodNavigator`（Task 8）、`currentScope`/`formatScopeLabel`（Task 2）、`fetchTeamDashboardState(scope)`（Task 7）

- [ ] **Step 1: 改 ReportCenter**

修改 `components/report-center/ReportCenter.tsx`：
- import：`PeriodNavigator`（`@/components/dashboard/PeriodNavigator`）、`currentScope`/`DashboardScope`、移除 `PeriodSwitcher`/`DashboardPeriod`
- state：`const [scope, setScope] = useState<DashboardScope>(() => currentScope(new Date()))`
- effect 依赖 `[scope, retryNonce]`，调 `fetchTeamDashboardState(scope)`
- `TeamHeader` 改传 `scope` + `onScopeChange={setScope}`（替换原 `period`/`onPeriodChange`）
- 赛季冲刺仍 `state.activeSeason`（不变，符合"不随 scope 变"）

- [ ] **Step 2: 改 TeamHeader**

修改 `components/report-center/TeamHeader.tsx`：props 改 `{ scope, onScopeChange }`，用 `PeriodNavigator` 替换 `PeriodSwitcher`，副文案用 `formatScopeLabel(scope)`。

- [ ] **Step 3: 删 PeriodSwitcher**

```bash
git rm components/report-center/PeriodSwitcher.tsx
```

- [ ] **Step 4: 改容器测试**

`__tests__/report-center-container.test.tsx`：mock `fetchTeamDashboardState` 的 `mockResolvedValue` 不变（返回结构不变），但调用方传 scope。若有断言 fetchTeamDashboardState 被某参数调用，改为 scope。确认渲染断言（"战报中心"、各面板标题）仍通过。可能需 mock `@/lib/dashboard-scope` 的 `currentScope` 返回固定 scope 以确定性，或依赖组件内 `new Date()` —— 倾向不 mock，让测试在当前真实日期跑，断言只查结构不查具体月。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run __tests__/report-center-container.test.tsx`
Expected: PASS

- [ ] **Step 6: tsc + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(report-center): wire PeriodNavigator with historical scope"
```

---

## Task 10: 牛马日历接入 PeriodNavigator

**Files:**
- Modify: `components/dashboard/DashboardBoard.tsx`
- Modify: `components/dashboard/DashboardHeader.tsx`
- Modify: `__tests__/dashboard-board.test.tsx`

**Interfaces:**
- Consumes: `PeriodNavigator`（Task 8）、`currentScope`（Task 2）、`fetchDashboardState(scope)`（Task 7）

**关键**：scope 改 month 时，月历自动跟随（后端 `buildDashboardSnapshotForUser` 用 scope.monthKey 算 monthCalendar，Task 4 已改）。热力图不受 scope 影响（后端滚动 12 个月，Task 4 已确认不破坏）。

- [ ] **Step 1: 改 DashboardBoard**

修改 `components/dashboard/DashboardBoard.tsx`：
- import：`PeriodNavigator`、`currentScope`/`DashboardScope`，移除 `DashboardPeriod`
- state：`const [scope, setScope] = useState<DashboardScope>(() => currentScope(new Date()))`
- 两个 useEffect 的依赖 `[period]` 改 `[scope]`，`fetchDashboardState(period)` 改 `fetchDashboardState(scope)`
- `DashboardHeader` 改传 `scope` + `onScopeChange={setScope}`

- [ ] **Step 2: 改 DashboardHeader**

修改 `components/dashboard/DashboardHeader.tsx`：props 改 `{ scope, onScopeChange }`，用 `PeriodNavigator` 替换原 `shared-board-type-toggle` 内联切换。保留标题等其余布局。

- [ ] **Step 3: 改 board 测试**

`__tests__/dashboard-board.test.tsx`：mock `fetchDashboardState` 调用方传 scope；若有 `period` 相关断言改 scope。确认渲染断言通过。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run __tests__/dashboard-board.test.tsx`
Expected: PASS

- [ ] **Step 5: tsc + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dashboard): wire PeriodNavigator in personal board"
```

---

## Task 11: 全量验证

**Files:** 无新增

- [ ] **Step 1: 跑全部测试**

Run: `npm test`
Expected: 全绿

- [ ] **Step 2: lint + build**

Run: `npm run lint && npm run build`
Expected: 全绿

- [ ] **Step 3: 手动冒烟**

Run: `npm run dev`
- 战报中心 `/report`：默认当月；点 ‹ 翻到 5 月，各模块更新；点 › 回当月且 › 禁用；点文案回当月；切"按年"回今年；赛季冲刺不变。
- 牛马日历 `/calendar`：同样翻页；月历跟随 scope 月；热力图不变；切"按年"月历保持。
- 历史月无数据 → 空态文案。

- [ ] **Step 4: Commit（若有格式修正）**

```bash
git add -A && git commit -m "chore(dashboard): final verification pass" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage 核对：**
- DashboardScope 类型 → Task 1 ✓
- scope 工具（current/prev/next/isCurrent/scopeToStartEnd/formatScopeLabel/scopeToQuery/parseScopeFromQuery）→ Task 2 + Task 6 ✓
- team 聚合改 scope → Task 3 ✓
- personal 聚合改 scope → Task 4 ✓
- team-state route → Task 5 ✓
- state route → Task 6 ✓
- client helper → Task 7 ✓
- PeriodNavigator 共享组件 → Task 8 ✓
- 战报中心接入（含删 PeriodSwitcher）→ Task 9 ✓
- 牛马日历接入 → Task 10 ✓
- 月历跟随 scope 月 → Task 4（后端用 scope.monthKey）+ Task 10 ✓
- 赛季冲刺不随 scope → Task 9（仍 activeSeason）✓
- 热力图不随 scope → Task 4（确认不破坏）✓
- endKey 历史月末/年末 → Task 2/3/4 ✓
- 未来锚点回退 → Task 5/6 ✓
- 全量验证 → Task 11 ✓

**Placeholder scan**：无 TBD；每步含完整代码或确切命令。

**Type consistency**：`DashboardScope` 贯穿 Task 1-10；`buildTeamDashboardSnapshot(teamId, scope, now?)` / `buildDashboardSnapshotForUser(userId, scope, now?)` 签名一致；`fetchTeamDashboardState(scope)` / `fetchDashboardState(scope)` 一致；`PeriodNavigator({ scope, onScopeChange, now? })` 一致；`scopeToStartEnd` 返回 `{ startKey, endKey, isComplete }` 在 Task 2/3/4 一致。

**注**：Task 3/4 的实现步骤描述了改动方向与关键代码段，但聚合函数体较大，实现者需通读现有 `lib/team-dashboard-state.ts`/`lib/dashboard-state.ts` 全文确保所有 `period` 引用改为 `scope`、startKey/endKey 来源正确。测试（Step 1）会锁定行为，TDD 保证正确。
