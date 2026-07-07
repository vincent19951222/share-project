# Data Dashboard Consolidation Design

## 目标

把顶部导航中的 `牛马日历` 和 `战报中心` 合并为一个主入口：`数据看板`。

合并的目标是简化导航和用户心智：用户进入 `数据看板` 后，再通过页面内二级 tab 在个人维度和团队维度之间切换。数据口径继续保持清晰分离：

- `我的日历`：个人维度，按当前登录用户聚合
- `团队战报`：团队维度，按当前用户所在团队聚合

本设计只合并入口和页面壳，不合并后端聚合逻辑，也不把个人指标和团队指标混在同一个长页面里。

## 背景

当前正式主导航包含 `牛马日历` 和 `战报中心` 两个相邻的数据复盘入口。两者的真实职责已经形成对称关系：

- `/calendar` 当前加载 `DashboardBoard`，承载个人指标、训练/饮品分布、热力图和月历
- `/report` 当前加载 `ReportCenter`，承载团队摘要、赛季冲刺、打卡趋势、训练均衡和饮品构成

这两个入口都是只读复盘场景，且都使用同一套时间范围选择器语义。继续把它们放在顶层导航会让导航显得过重，也让“看我自己”和“看团队”这两个相关动作被拆散。

## 产品决策

新增一个合并后的主导航入口：`数据看板`。

`数据看板` 页面内提供两个二级 tab：

1. `我的日历`
   - 默认 tab
   - 展示当前个人看板能力
   - 保留个人指标、训练/饮品统计、活动热力图、月历
2. `团队战报`
   - 展示当前战报中心能力
   - 保留团队摘要、赛季冲刺、趋势图、训练均衡、饮品构成

旧路由继续保留：

- `/calendar` 打开 `数据看板`，默认选中 `我的日历`
- `/report` 打开 `数据看板`，默认选中 `团队战报`

主导航不再同时展示 `牛马日历` 和 `战报中心` 两个按钮，只展示一个 `数据看板` 按钮。

## 非目标

- 不改 Prisma schema。
- 不改个人看板和团队战报的聚合口径。
- 不合并 `/api/dashboard/state` 和 `/api/dashboard/team-state`。
- 不重做个人看板或团队战报的图表样式。
- 不引入新的 UI 库、状态管理库或请求库。
- 不删除 `/calendar` 或 `/report` 路由，避免旧链接失效。
- 不把 `我的日历` 和 `团队战报` 内容堆成一个没有二级切换的长页面。

## 信息架构

合并后的主导航建议为：

- `健身打卡`
- `牛马水铺`
- `共享看板`
- `数据看板`
- `牛马补给站`

`数据看板` 下的二级结构：

```text
数据看板
├── 我的日历
└── 团队战报
```

默认进入 `数据看板` 时选中 `我的日历`，因为个人复盘更接近日常回看路径。用户从旧 `/report` 进入时选中 `团队战报`。

## 交互设计

### 主导航

`数据看板` 在主导航中的位置继承原 `牛马日历` 的位置，位于 `共享看板` 之后、`牛马补给站` 之前。

点击 `数据看板` 默认进入个人视图。导航按钮的 active 状态在 `我的日历` 和 `团队战报` 两个子视图中都保持高亮。

### 页面内二级 tab

页面顶部展示一个稳定的二级 tab 控件：

- `我的日历`
- `团队战报`

控件应使用项目现有 brutalist / segmented control 语言，不能像营销页卡片。移动端需要保持按钮文本不挤压、不换出容器。

切换二级 tab 只切换内容区，不触发业务写入。切换时如果目标组件首次加载，可以使用现有 `BoardTabLoadingShell` 风格的轻量 loading。

### 时间范围

`我的日历` 和 `团队战报` 当前都各自维护 `DashboardScope`。本阶段继续保留各自内部 scope，避免为了共享时间范围引入额外状态耦合。

## 技术设计

### 路由与导航

保留现有正式路由，并新增一个数据看板承载组件：

- `/calendar`：渲染 `BoardApp`，`activeTab="data"`，`initialDataView="personal"`
- `/report`：渲染 `BoardApp`，`activeTab="data"`，`initialDataView="team"`

`lib/types.ts` 中的 `AppTab` 新增 `data` 主 tab，并从导航层移除 `calendar` / `dash` 两个独立主入口。旧路由保留，旧路由只负责决定 `initialDataView`。

`BoardApp` 新增可选 prop `initialDataView?: "personal" | "team"`。当 `activeTab="data"` 且未传入该 prop 时，默认使用 `"personal"`。

### 组件边界

新增一个轻量壳组件：

```text
components/data-dashboard/DataDashboard.tsx
```

职责：

- 接收初始子视图：`personal` 或 `team`
- 渲染页面内二级 tab
- 在 `personal` 时加载现有 `DashboardBoard`
- 在 `team` 时加载现有 `ReportCenter`
- 保持子组件的数据请求和业务逻辑独立

不建议把 `DashboardBoard` 和 `ReportCenter` 的内部图表拆进 `DataDashboard`。这会破坏现有清晰边界，并扩大回归面。

### 动态加载

继续保留当前主 tab 动态拆包策略：

- 默认打卡页保持静态加载
- 数据看板作为主 tab 动态加载
- 数据看板内部可以继续动态加载个人/团队两个重内容

`preloadBoardTabComponent` 需要支持新的 `数据看板` 主 tab。用户 hover/focus `数据看板` 时，应预加载数据看板壳和默认个人视图。

### Provider

`团队战报` 当前需要 `DrinkProvider`，因为 `BoardApp` 对 `dash` 有特殊包裹。合并后，`数据看板` 页面应继续在需要时提供 `DrinkProvider`，避免战报中心饮品相关组件退化。

推荐保守做法：整个 `数据看板` 主 tab 外层包裹 `DrinkProvider`。这会覆盖 `我的日历` 和 `团队战报`，但只在数据看板路由内生效，范围可控。

### 数据流

个人视图继续使用：

- `fetchDashboardState(scope)`
- `/api/dashboard/state`
- `buildDashboardSnapshotForUser(userId, scope, now)`

团队视图继续使用：

- `fetchTeamDashboardState(scope)`
- `/api/dashboard/team-state`
- `buildTeamDashboardSnapshot(teamId, scope, now)`

合并不改变任何 API payload，不需要数据库迁移。

## 错误与空状态

个人视图和团队视图继续使用各自现有错误态：

- 个人看板加载失败时显示 Dashboard 错误文案
- 团队战报加载失败时显示战报错误文案和重试按钮

`DataDashboard` 壳只需要处理组件加载中的 loading，不吞掉子组件错误。

如果用户从未知子视图进入，回退到 `我的日历`。

## 可访问性与响应式要求

- 二级 tab 使用 button 或等价可访问控件。
- active tab 应有明确 `aria-selected` 或稳定文本状态。
- 键盘用户可以 focus 并切换两个子 tab。
- 移动端二级 tab 不应和顶部导航、头像、补给站资产 chip 重叠。
- 旧 `/calendar` 和 `/report` 的页面标题不需要改浏览器标题，但页面内文案必须体现 `数据看板` 的合并结构。

## 测试策略

### 单元/组件测试

更新或新增以下测试：

- `Navbar` 测试：主导航只出现一个 `数据看板`，不再同时出现 `牛马日历` 和 `战报中心`
- `BoardApp` / dynamic tab 测试：数据看板仍通过动态 import 加载，重页面不回到主 bundle
- `DataDashboard` 测试：默认渲染 `我的日历`，点击 `团队战报` 后渲染团队视图
- 路由兼容测试：`/calendar` 初始为 `我的日历`，`/report` 初始为 `团队战报`

### 回归测试

保留现有个人看板与战报中心专项测试：

- `__tests__/dashboard-*.test.tsx`
- `__tests__/report-center-*.test.tsx`
- `__tests__/team-dashboard-state*.test.ts`

这些测试不应因为入口合并而大面积重写。若需要更新，只更新导航入口或外壳相关断言。

### 构建验证

实现完成后运行：

```bash
npm test -- __tests__/board-app-dynamic-tabs.test.ts __tests__/navbar-supply-chrome.test.tsx __tests__/report-center-container.test.tsx __tests__/dashboard-board.test.tsx
npm run build
```

如果实际改动触及更多测试文件，应补跑对应 focused tests。

## 验收标准

- 顶部主导航只展示 `数据看板` 一个复盘入口。
- `数据看板` 页面内有 `我的日历` / `团队战报` 两个二级 tab。
- `/calendar` 仍可访问，并默认打开 `我的日历`。
- `/report` 仍可访问，并默认打开 `团队战报`。
- 个人看板和团队战报的数据、API、图表内容保持现有能力。
- 主 tab 动态加载边界不退化。
- 不发生数据库 schema 或 seed 改动。
- 移动端顶部导航和二级 tab 不重叠、不挤压。
