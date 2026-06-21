# Dashboard Historical Periods Design

## Goal

让牛马日历（个人看板）和战报中心（团队看板）能查看**任意历史月/年**的数据，而不只是"本月/本年"。

当前两个看板的周期只能锚定到今天（startKey = 当月1日/今年1月1日，endKey = 今天），无法回看上月、去年的战报。本次改造把"周期"从"粒度"升级为"粒度 + 锚点"，并加翻页导航。

## Problem Statement

1. **period 只表达粒度，不表达"哪个月"**：`DashboardPeriod = "month" | "year"`，锚点恒为今天。要看 5 月数据无从下手。
2. **历史周期的 endKey 错误**：当前实现 endKey 恒为今天。若能查 5 月，会变成"5/1 ~ 6/21"跨月，数据全错。历史完整周期（5 月）的 endKey 应是 5/31，不是今天。
3. **无历史导航 UI**：两个页面只有"本月/本年"两个 toggle，没有翻页能力。

## Product Decision

采用方案 A（翻页导航）。`PeriodSwitcher` 升级为共享 `PeriodNavigator`：左侧 `‹` `›` 翻页 + 当前周期文案，右侧"按月/按年"粒度 toggle。两个页面各自独立持 `scope` state，**不联动**。

### 交互规则
- `‹` 翻上一个周期（月→上月，年→上年），始终可用（太早查无数据由各图表空态兜底）
- `›` 翻下一个周期，**到达当前周期时禁用**（不允许看未来）
- **点击中间周期文案 = 回到当前周期**（从历史快速复位）
- **点粒度 toggle**：切换 月↔年，**同时重置到该粒度的当前周期**（切"按年"回到今年，不停在当前查看的月份的年份）
- toggle 标签从"本月/本年"改为"**按月/按年**"——能翻历史后，"本月"高亮却显示 5 月会矛盾；"按月/按年"表达粒度，与位置无关

### 两个页面的独立决定
- **不联动**：两个路由各自独立 scope，切页面不保持
- **战报中心赛季冲刺**：永远显示当前 active 赛季，不随历史变
- **牛马日历 12 个月活跃热力图**：永远滚动 12 个月，不随历史变（长期趋势锚点）
- **牛马日历当月日历**：跟随 scope 的月（翻到 5 月看 5 月日历）；月历自身翻月操作同步更新父级 scope（与 navigator 同源，不两套导航打架）；年视图下月历保持不变（月历是独立导航器，年视图只改汇总不改月历）

### 模块跟随矩阵

| 模块 | 战报中心 | 牛马日历 |
|---|---|---|
| 摘要/指标卡 | ✅ 跟 scope | ✅ 跟 scope |
| 打卡趋势/训练部位/水铺构成 | ✅ 跟 scope | — |
| 训练平衡/饮品构成 | — | ✅ 跟 scope |
| 赛季冲刺 | ❌ 永远当前 active 赛季 | — |
| 12 个月活跃热力图 | — | ❌ 滚动 12 个月，独立 |
| 当月日历 | — | ✅ 跟 scope 的月 |

### 范围边界（不做什么）
- ❌ 两个页面不联动
- ❌ 不做日期 picker（只翻页）
- ❌ 战报赛季冲刺不随历史变
- ❌ 牛马日历热力图不随历史变
- ❌ 不做"对比上月"等衍生分析

## Architecture

### period 模型：粒度 + 锚点

```ts
export type DashboardScope =
  | { type: "month"; monthKey: string }   // "2026-05"
  | { type: "year"; year: number };       // 2025
```

保留 `DashboardPeriod` 类型名给 route 参数兼容（`period=month|year`）。

### 锚点 → startKey / endKey 规则（核心）

```
月 { monthKey: "2026-05" }:
  startKey = "2026-05-01"
  isComplete = monthKey < 当月key
  endKey = isComplete ? 月末 : 今天       ← 历史月=月末，当月=今天
  monthKey > 当月 → 拒绝（未来）

年 { year: 2025 }:
  startKey = "2025-01-01"
  isComplete = year < 当前年
  endKey = isComplete ? 年末 : 今天        ← 历史年=年末，当年=今天
  year > 当前年 → 拒绝（未来）
```

历史完整周期的 endKey 用月末/年末，不是今天——否则跨周期查错数据。

### 后端函数签名

```ts
// lib/team-dashboard-state.ts
buildTeamDashboardSnapshot(teamId, scope: DashboardScope, now?): Promise<TeamDashboardSnapshot | null>
// lib/dashboard-state.ts
buildDashboardSnapshotForUser(userId, scope: DashboardScope, now?): Promise<DashboardSnapshot | null>
```

返回 snapshot 的 `period` 字段（type + startKey + endKey）含义不变，前端据此显示周期文案。

### 年视图聚合调整
- 当年：punchTrend/drinkTrend 按"1 月到当前月"聚合成 N 根
- 历史年：按"1 月到 12 月"聚合成 12 根（完整）
- 由 `isComplete` 决定

### API route 参数

```
GET /api/dashboard/team-state?period=month&monthKey=2026-05
GET /api/dashboard/team-state?period=year&year=2025
GET /api/dashboard/team-state?period=month          ← 缺省锚点=当月
GET /api/dashboard/team-state?period=year           ← 缺省锚点=当年
```

route 解析 query 为 `DashboardScope`；非法/未来锚点回退当期。

### 共享组件 PeriodNavigator

```
[‹]   2026年5月   [›]        [ 按月 | 按年 ]
```

牛马日历和战报中心共用（顺带完成原战报中心 spec 里"共享切换器、牛马日历一并接入"的延后目标）。

## File Structure

**新增**
- `lib/dashboard-scope.ts` —— scope 纯工具：`currentScope`/`prevScope`/`nextScope`/`isCurrentScope`/`scopeToStartEnd`/`formatScopeLabel`
- `components/dashboard/PeriodNavigator.tsx` —— 共享导航器

**修改（后端）**
- `lib/types.ts` —— 加 `DashboardScope`
- `lib/team-dashboard-state.ts` —— 聚合改 scope
- `lib/dashboard-state.ts` —— 聚合改 scope
- `app/api/dashboard/team-state/route.ts` —— query → scope
- `app/api/dashboard/state/route.ts` —— query → scope

**修改（前端）**
- `lib/api.ts` —— `fetchTeamDashboardState(scope)` / `fetchDashboardState(scope)`
- `components/report-center/ReportCenter.tsx` —— 持 scope，接 PeriodNavigator
- `components/report-center/TeamHeader.tsx` —— 用 PeriodNavigator，副文案用 formatScopeLabel
- `components/dashboard/DashboardBoard.tsx` —— 持 scope，接 PeriodNavigator
- `components/dashboard/DashboardHeader.tsx` —— 用 PeriodNavigator
- `components/dashboard/MonthCalendar.tsx` —— 翻月同步父级 scope

**删除**
- `components/report-center/PeriodSwitcher.tsx`（被 PeriodNavigator 取代）

## Key Algorithm: scopeToStartEnd

```ts
function scopeToStartEnd(scope: DashboardScope, now: Date): {
  startKey: string; endKey: string; isComplete: boolean;
} {
  const todayKey = getShanghaiDayKey(now);
  if (scope.type === "month") {
    const startKey = `${scope.monthKey}-01`;
    const isComplete = scope.monthKey < todayKey.slice(0, 7);
    const monthEnd = lastDayOfMonth(scope.monthKey);
    const endKey = isComplete ? `${scope.monthKey}-${monthEnd}` : todayKey;
    return { startKey, endKey, isComplete };
  }
  const startKey = `${scope.year}-01-01`;
  const isComplete = scope.year < Number(todayKey.slice(0, 4));
  const endKey = isComplete ? `${scope.year}-12-31` : todayKey;
  return { startKey, endKey, isComplete };
}
```

`lastDayOfMonth` 处理 28/29/30/31（含闰年）。`isComplete` 驱动年视图聚合根数。

## Testing

### `lib/dashboard-scope.ts`（重点，纯函数）
- `currentScope`：当月/当年
- `prevScope`：月→上月跨年（2026-01 → 2025-12）、年→上年
- `nextScope`：同上
- `isCurrentScope`：当期 true、历史 false
- `scopeToStartEnd`：历史月 endKey=月末、当月 endKey=今天、历史年 endKey=年末、当年 endKey=今天、2 月闰年（2024-02 → 29）、平年（2026-02 → 28）
- 未来锚点：route 层回退（`prevScope` 不会产生未来）

### 聚合函数（改签名）
- `team-dashboard-state.test.ts`：`buildTeamDashboardSnapshot(teamId, {type:"month", monthKey:"2026-06"}, NOW)`；新增历史月用例（endKey=月末，完整周期数据）
- `dashboard-state.test.ts`：同样改签名 + 历史月用例
- 年视图历史年聚合 12 根

### API route
- `team-state?period=month&monthKey=2026-05` → 传 scope
- `team-state?period=month`（缺省）→ 当月
- `team-state?period=year&year=2025` → 历史年
- 未来锚点 `monthKey=2026-12`（当 2026-06）→ 回退当期
- `state` route 同样用例

### 前端组件
- `PeriodNavigator`：‹/› 翻页、文案复位回当前、toggle 切粒度重置当期、› 到当前禁用
- `ReportCenter`：scope 变触发重请求；赛季冲刺不随 scope 变
- `DashboardBoard`：scope 变触发重请求；热力图不随 scope 变；月历跟 scope 月

## Migration & Compatibility

- `DashboardPeriod` 类型保留，route 仍用 `period=month|year` query 参数（只加锚点参数），向后兼容
- 现有 mock snapshot 字段（period.type/startKey/endKey）不变，只改传参签名
- 一次 PR 完成（scope 改造一体，不分阶段）

## Success Criteria

- 两个页面顶部 `PeriodNavigator` 可翻到任意历史月/年，‹/› + 文案复位 + 粒度 toggle 均可用
- 历史月/年查询的是该完整周期数据（endKey=月末/年末），不跨周期
- `›` 到当前周期禁用；不能看未来
- 战报赛季冲刺始终显示当前 active 赛季；牛马日历热力图始终滚动 12 个月
- 牛马日历月历跟随 scope 月，月历翻月与 navigator 同源
- 后端聚合 + route + scope 工具 + 组件均有测试，test/lint/build 全绿
