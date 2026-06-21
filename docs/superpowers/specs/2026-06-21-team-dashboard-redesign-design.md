# Team Dashboard Redesign (战报中心) Design

## Goal

把"战报中心"从一份汇总报表重做为**团队体检看板**：以团队整体健康度为叙事主调，让团队成员一打开就知道"咱团这个月练得咋样、喝得咋样、赛季冲到哪了"。

个人维度的统计已经迁移到"牛马日历"（个人看板，详见 `2026-06-19-personal-dashboard-design.md`）。战报中心此后只承载团队维度，和个人看板形成对称：

- `牛马日历`（`/calendar`）→ 个人看板，按 `userId` 聚合
- `战报中心`（`/report`）→ 团队看板，按 `teamId` 聚合

## Problem Statement

当前战报中心存在三个问题：

1. **团队维度被浪费**。`WorkoutRecord` / `DrinkRecord` 都带 `teamId` 索引，但战报中心完全没用——团队训练部位分布、团队饮品构成这些维度都没做。战报中心目前只能算"每天有多少人打卡"，更深的团队画像缺失。
2. **聚合逻辑全在前端**。`components/report-center/report-data.ts` 的 `buildReportData` 在浏览器里从 `BoardState.gridData` 派生所有指标。`gridData` 只含打卡状态（`CellStatus`），不含训练类型 / 饮品类型明细，所以**根本算不出部位均衡和饮品构成**。这是技术上做不出来的根因。
3. **点名个人的高光项与基调冲突**。`Milestones` 的"本月高光（最长连续打卡成员）"和 `DrinkReportPanel` 的"本周水王"点名个人，和"团队体检、不走竞技"的基调冲突。此外 `CoffeeReportPanel.tsx` 是死代码，周报已在 `2ae74c5` 移除。

## Product Decision

重做战报中心，内容范围锁定为 **4 个模块 + 1 个摘要条**（外加 Header），周期切换支持**本月 / 本年**（和个人看板对称）。4 个模块即第二题确认的：每日打卡趋势、水铺饮品构成、赛季冲刺、团队训练部位均衡。其中赛季冲刺以横向通栏形式独占一行，其余三个模块在下方 3 列网格并排。

### 页面结构

```
┌─ Header（标题 + 本月/本年 周期切换）
├─ 摘要条：完成率 / 总打卡 / 全勤日（3 张卡）
├─ 赛季冲刺通栏：进度条 + 贡献占比饼图（独立维度，不随周期切换）
└─ 3 列网格：每日打卡趋势(柱) │ 团队训练部位均衡(A1) │ 水铺饮品构成
```

### 模块清单

- **Header + 周期切换** —— 标题"战报中心"，副标题随周期动态（"2026年6月战报" / "2026年度战报"），右侧本月/本年切换器。
- **摘要条（3 张卡）** —— 完成率 / 总打卡次数 / 全勤日。去掉原 Milestones 的"本月高光"。
- **赛季冲刺通栏** —— 进度条 + 贡献占比饼图。**独立维度，不随周期切换**（赛季有自己的时间窗）。
- **每日打卡趋势（柱状图）** —— 替换原折线图。X 轴每天打卡人数，全勤日柱体强调色，标注峰值日。
- **团队训练部位均衡（A1）** —— 水平条形图，7 个力量部位 + 4 个有氧项，最长高亮、最短标灰。
- **水铺饮品构成** —— 左侧类型分布饼图（主角）+ 右侧每日总量趋势柱状图（辅助）。去掉"本周水王"。

### 周期切换

- **本月**：聚合当月 1 日至今天的数据
- **本年**：聚合当年 1 月 1 日至今天的数据；趋势图（打卡/饮品）按月聚合成 12 根
- **赛季冲刺**不受周期切换影响，始终展示当前 active 赛季

### 范围边界（不做什么）

- ❌ 不做实时轮询 —— 战报是只读快照，进入页面 / 切换周期时请求一次即可
- ❌ 不做成员级 drill-down（点击柱子看是谁）—— YAGNI
- ❌ 不恢复周报
- ❌ 不做团队金库流水、不做时间线 / feed

## Architecture

采用**方案 B：新建团队聚合后端**。镜像个人看板的 `lib/dashboard-state.ts`，新建按 `teamId` 聚合的后端层。理由：

1. 和个人看板对称：`dashboard-state`（个人，按 userId）↔ `team-dashboard-state`（团队，按 teamId），命名 / 结构 / 测试模式镜像。
2. 职责清晰：战报中心是只读快照，不需要复用 `board-state` 的 15s 轮询；"进入页面请求一次 + 周期切换重请求"更合理。
3. 年视图聚合在后端一次算清，前端零负担。
4. payload 可控：只返回聚合结果（数字 + 分布数组），不返回明细。

### 新增后端层

```
lib/team-dashboard-state.ts              # 纯聚合函数，按 teamId
app/api/dashboard/team-state/route.ts    # GET ?period=month|year
__tests__/team-dashboard-state.test.ts   # 聚合函数单测
```

### 数据结构（`lib/types.ts` 新增）

```ts
export type TeamDashboardSnapshot = {
  period: { type: "month" | "year"; startKey: string; endKey: string };
  metrics: {
    completionRate: number;      // totalPunches / (memberCount * elapsedDays)
    totalPunches: number;        // 周期内全队累计打卡数
    fullAttendanceDays: number;  // 周期内当天全员打卡的天数
  };
  punchTrend: {
    dayKey: string;              // 月视图=日期；年视图=月份（YYYY-MM）
    count: number;
    isFullAttendance: boolean;
  }[];
  workoutBalance: { label: string; count: number }[];   // 7 力量部位 + 4 有氧项
  drinkBreakdown: { type: DrinkType; label: string; count: number }[];
  drinkTrend: { dayKey: string; count: number }[];       // 每日（月）/ 每月（年）总杯数
};
```

### 前端层

```
components/report-center/ReportCenter.tsx           # 重写容器：按 period 请求 team-state
components/report-center/TeamHeader.tsx             # Header + 周期切换
components/report-center/MetricSummary.tsx          # 摘要条 3 张卡
components/report-center/SeasonSprintPanel.tsx      # 赛季冲刺通栏（从 BoardState.activeSeason 取）
components/report-center/PunchTrendChart.tsx        # 柱状图（替换原 TrendChart 折线）
components/report-center/WorkoutBalancePanel.tsx    # 团队训练部位均衡（A1，新）
components/report-center/DrinkCompositionPanel.tsx  # 水铺饮品构成（替换 DrinkReportPanel）
components/report-center/PeriodSwitcher.tsx         # 共享周期切换组件（牛马日历一并接入）
```

### 数据流

- 进入 `/report` → `ReportCenter` 调 `fetchTeamDashboardState(period)` → 渲染摘要 + 4 模块
- 赛季冲刺单独从 `BoardState.activeSeason` / `seasons.memberStats` 取（数据已在 board-state，无需新查询）
- 周期切换 → 重新请求（带 loading 态，旧数据淡出避免闪烁）
- `BoardProvider` 仍挂载（赛季冲刺复用），趋势 / 训练 / 饮品数据走新 team-state API

### 退役清单

- `components/report-center/report-data.ts`（前端聚合层废弃，逻辑下沉后端）
- `components/report-center/CoffeeReportPanel.tsx`（死代码，删）
- `components/report-center/TrendChart.tsx`（折线图，被 `PunchTrendChart` 柱状图替换）
- `components/report-center/DrinkReportPanel.tsx`（被 `DrinkCompositionPanel` 替换）
- `components/report-center/Milestones.tsx`（被 `MetricSummary` 替换，去掉"本月高光"）

## Module Details

### 模块 0 · Header + 周期切换（`TeamHeader`）

- 标题"战报中心"，副标题随周期：本月 → "2026年6月战报"；本年 → "2026年度战报"
- 右侧 `PeriodSwitcher`：本月 / 本年 两个 toggle，样式与牛马日历 `DashboardHeader` 切换器一致
- 切换触发 `setPeriod` → 容器重新请求

### 模块 1 · 摘要条（`MetricSummary`）

3 张指标卡横排（移动端叠纵向），数据来自 `snapshot.metrics`：

- **完成率**：`totalPunches / (memberCount × elapsedDays)`，显示百分比
- **总打卡次数**：周期内全队累计
- **全勤日**：周期内当天全员打卡的天数

### 模块 2 · 赛季冲刺通栏（`SeasonSprintPanel`，独立维度）

横向通栏，左右两区：

- **左区 · 进度条**：全队已完成贡献 / 赛季目标槽位总和。粗边框进度条 + 百分比，下方"已 X / 目标 Y"
- **右区 · 贡献占比饼图**：按成员 `SeasonMemberStat.slotContribution` 算占比，SVG 饼图。扇区用成员 `colorIndex` 配色，hover 显示成员名 + 贡献值 + 占比

数据源：`BoardState.activeSeason`（含已排序的 `contributions`）。不随周期切换。

边界：无 active 赛季 → 通栏显示"休赛期，暂无冲刺目标"占位。

### 模块 3 · 每日打卡趋势（`PunchTrendChart`，柱状图）

- X 轴：周期内每天（月视图 ~30 根；年视图 12 根，按月聚合）
- Y 轴：当天打卡人数
- 柱体：默认 Brutalist 黄；全勤日柱体用强调色
- 标注：峰值日（最高柱）标"🔥峰值 N人"，不标低谷（保持克制）
- 数据来自 `snapshot.punchTrend`（已含 `isFullAttendance`）

### 模块 4 · 团队训练部位均衡（`WorkoutBalancePanel`，A1）

- 水平条形图，每部位一行：7 个力量部位（`STRENGTH_PARTS`：chest/back/shoulder/arms/glutes/legs/abs）+ 4 个有氧项（`CARDIO_ITEMS`：treadmill/elliptical/walk/swim）
- 每行：部位名 + 条形（宽度 = 该部位 count / 最大部位 count）+ 次数
- 最长部位高亮；最短部位标灰提示"团队最薄弱项"
- 常量直接 import `lib/workouts.ts`，保证和个人看板口径一致

### 模块 5 · 水铺饮品构成（`DrinkCompositionPanel`，A 型）

主体两区：

- **左 · 类型分布饼图（主角）**：5 种饮品类型（`DrinkType`：water/milkTea/americano/latte/other），每扇区不同色，hover 显示类型名 + 杯数 + 占比。回答"咱团是咖啡帮还是奶茶帮"
- **右 · 每日总量趋势柱状图（辅助）**：`snapshot.drinkTrend`，X 轴每日（月）/ 每月（年），Y 轴总杯数

数据来自 `snapshot.drinkBreakdown` + `snapshot.drinkTrend`。去掉"本周水王"。

## Aggregation Contract

`buildTeamDashboardSnapshot({ teamId, period, now })` 的聚合口径：

- **dayKey 范围**：月视图 = 当月 1 日至今天（不含未来）；年视图 = 当年 1 月 1 日至今天
- **时区**：统一 Asia/Shanghai（项目既定）
- **打卡计数**：`PunchRecord.punched = true` 且 dayKey 在范围内
- **完成率**：`totalPunches / (memberCount × elapsedDays)`，`elapsedDays` = 范围内已过天数（含今天）
- **全勤日**：当天所有成员都 `punched = true` 的天数
- **训练部位**：遍历范围内 `WorkoutRecord` → `WorkoutEntry`，按 `category` 分桶（strength 的 part / cardio 的 code），累加 count
- **饮品构成**：范围内 `DrinkRecord`（排除 `deletedAt` 软删除）按 `drinkType` 累加
- **年视图聚合**：`punchTrend` / `drinkTrend` 按月聚合成 12 根（dayKey = `YYYY-MM`）；`workoutBalance` / `drinkBreakdown` 全年累计；`metrics` 全年累计

## Testing

### 后端聚合（`lib/team-dashboard-state.ts`）—— 重点测

`__tests__/team-dashboard-state.test.ts`：

- 月视图：给定若干成员 + PunchRecord/WorkoutRecord/DrinkRecord，断言 `punchTrend` 每日 count 正确、`isFullAttendance` 标记正确
- 年视图：`punchTrend` / `drinkTrend` 正确按月聚合成 12 根
- `workoutBalance`：多成员多部位频次累加正确；有氧项与力量部位分桶正确
- `drinkBreakdown`：按 `drinkType` 分桶正确；软删除记录排除
- `metrics`：完成率 / 总打卡 / 全勤日 计算正确
- 边界：空团队、范围内无任何记录、未来日期不计入

### API route（`app/api/dashboard/team-state/route.ts`）

- 鉴权：未登录返回 401
- 参数：`?period=month|year`，非法值回退 month
- 复用 `__tests__/dashboard-state.test.ts` 的测试模式

### 前端组件

- `PunchTrendChart`：渲染 N 根柱、全勤柱强调色、峰值标注
- `WorkoutBalancePanel`：行数 = 部位数、最长高亮、最短标灰
- `DrinkCompositionPanel`：饼图扇区数 = 类型数、辅助趋势柱数
- `SeasonSprintPanel`：有 active 赛季渲染进度 + 饼图；无 active 渲染占位
- `MetricSummary`：3 张卡数值正确

## Edge Cases & Error Handling

| 场景 | 处理 |
|---|---|
| 无 active 赛季 | `SeasonSprintPanel` 显示"休赛期，暂无冲刺目标"占位，其余模块正常 |
| 团队无任何打卡/训练/饮水记录 | 各图表显示空状态文案，不报错；摘要卡显示 0 |
| 某成员赛季贡献为 0 | 不显示该成员扇区，避免零贡献占位 |
| 训练部位全为 0 | 条形图全空条 + "暂无训练数据"提示 |
| 饮品构成只有 1 种类型 | 饼图退化为整圆，仍显示该类型标签 |
| 年视图当前月未结束 | `punchTrend` 第 12 根（当前月）只算到今天，不补全月 |
| API 请求失败 | 容器显示错误态 + 重试按钮（复用 dashboard 的 loading/error 模式） |
| 周期切换中 | 显示骨架屏 / loading，旧数据淡出避免闪烁 |

## Reuse & Consistency

- **图表渲染**：均自实现 SVG（项目"无外部 UI 库"原则），样式复用 `globals.css` 的 Brutalist 卡片类（`.soft-card`）和黄/灰主色
- **部位/饮品常量**：直接 import `lib/workouts.ts` 的 `STRENGTH_PARTS`/`CARDIO_ITEMS` 和 `@/lib/drinks` 的 `DrinkType`，保证和个人看板口径完全一致
- **成员配色**：赛季饼图用 `SeasonMemberStat.colorIndex`，和打卡看板成员配色统一
- **周期切换组件**：抽共享 `PeriodSwitcher`，牛马日历和战报中心共用（顺手把牛马日历的内联切换换成共享组件——改进正在工作的代码）

## Success Criteria

重做成功的判定：

- 战报中心仍是 navbar 的"战报中心"tab，路由 `/report`
- 页面顶部有本月/本年周期切换，切换后摘要、打卡趋势、训练部位、饮品构成随之更新
- 摘要条显示完成率 / 总打卡 / 全勤日 3 张卡（无"本月高光"）
- 赛季冲刺通栏显示进度条 + 贡献占比饼图；无 active 赛季时显示休赛期占位
- 每日打卡趋势为柱状图，全勤日强调色，标注峰值日
- 团队训练部位均衡展示 7 力量部位 + 4 有氧项的条形图
- 水铺饮品构成展示类型分布饼图 + 每日总量趋势柱状图（无"本周水王"）
- 新增 `lib/team-dashboard-state.ts` 纯聚合函数 + `app/api/dashboard/team-state/route.ts`，均有测试
- `report-data.ts` / `CoffeeReportPanel.tsx` / `TrendChart.tsx` / `DrinkReportPanel.tsx` / `Milestones.tsx` 已删除
- `npm test` / `npm run lint` / `npm run build` 全绿
