# Supply Task 10：生产 Dashboard Panel 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 10：Production Dashboard Panel。

## 背景

Task 8 已经提供 `SupplyStationProductionSnapshot`，Task 9 已经通过 `GET /api/gamification/supply/state` 暴露生产补给站 snapshot。Task 10 是生产 UI 替换的第一个面板：把 UI Lab Dashboard 的核心视觉和信息结构转成可接真实 snapshot 的 React 组件。

本任务只做 Dashboard panel，不接入生产 shell，不执行 API mutation。后续 Task 16 会统一负责补给站 shell、tab 切换、mutation pending 状态和刷新 snapshot。

## 目标

- 新增 `components/gamification/production/SupplyDashboardPanel.tsx`。
- 组件输入只依赖 `SupplyStationProductionSnapshot`，不读取 UI Lab mock 数据。
- 展示生产资源栏：`银子 / 抽奖券 / 背包`。
- 展示用户 `Lv`、称号、当前 EXP、升级所需 EXP。
- 展示今日效果列表，空状态时给出生产文案。
- 展示 `snapshot.dashboard.dailyQuests` 中的四维任务卡片。
- 暴露任务动作回调：完成任务、换班、领取抽奖券奖励。

## 范围

本任务修改：

- `components/gamification/production/SupplyDashboardPanel.tsx`
- `__tests__/supply-production-dashboard-panel.test.tsx`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `components/gamification/SupplyStation.tsx`
- `app/api/gamification/*`
- `lib/gamification/supply-view-model.ts`
- `components/gamification/ui-lab/*/mock-data`
- `app/globals.css`

## 组件接口

```ts
type SupplyDashboardAction =
  | "complete-task"
  | "reroll-task"
  | "claim-ticket";

type SupplyDashboardPanelProps = {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyDashboardAction | null;
  onCompleteTask: (dimensionKey: GamificationDimensionSnapshot["key"]) => void;
  onRerollTask: (dimensionKey: GamificationDimensionSnapshot["key"]) => void;
  onClaimTicket: () => void;
  onNavigate: (target: "draw-pool" | "backpack" | "shop" | "task-record") => void;
};
```

动作参数使用 dimension key，例如 `movement`，与现有任务 API 和 view-model 对齐。组件不直接使用 assignment id 调用 API，因为本任务不负责 API wiring。

## 展示规则

### 资源栏

资源来自 `snapshot.resources`：

- `coins` 展示为 `银子`。
- `ticket` 展示为 `抽奖券`。
- `backpack` 展示为 `当前值/60`。

### 角色状态

角色状态来自 `snapshot.profile`：

- 显示 `snapshot.profile.title`。
- 显示 `Lv.{snapshot.profile.level}`。
- 显示 `{currentLevelExp}/{nextLevelExp}`。
- 显示 `距离升级还差 {max(0, nextLevelExp - currentLevelExp)} EXP`。

### 今日效果

今日效果来自 `snapshot.dashboard.todayEffects`：

- 有数据时展示名称、效果摘要、状态和创建时间。
- 无数据时展示 `今天还没有生效中的补给效果`。

### 今日主线任务

任务来自 `snapshot.dashboard.dailyQuests`：

- 每个维度展示维度标题、副标题、任务标题、描述、状态、换班次数。
- `assignment` 为 `null` 时展示 `今日任务还没生成`，并禁用任务按钮。
- 已完成任务禁用完成按钮，按钮文案为 `已完成`。
- 未完成且 `canComplete` 为 true 时允许点击完成按钮。
- `canReroll` 为 false 时禁用换班按钮。
- 按钮需要稳定的 `data-action`：
  - `data-action="complete-task"`
  - `data-action="reroll-task"`
  - `data-action="claim-ticket"`

## 视觉策略

组件使用生产专属 class 前缀 `supply-production-dashboard-*`，避免和 UI Lab mock state 绑定。可以使用已经存在的通用补给站视觉 class，例如 `supply-ui-lab-action`，但不能导入或依赖 UI Lab mock data。

本任务不新增 CSS。先交付语义结构、数据绑定和可测试动作，后续 shell/UI 收口任务可以统一补视觉细节。

## 错误与加载状态

本 panel 不负责错误边界和远程请求。`activeAction` 只用于禁用相关按钮并显示处理中状态：

- `complete-task`：完成按钮显示 `打卡中`
- `reroll-task`：换班按钮显示 `换班中`
- `claim-ticket`：领取按钮显示 `领取中`

## 测试策略

新增 `__tests__/supply-production-dashboard-panel.test.tsx`：

- 先验证组件不存在导致测试失败。
- 渲染 fixture snapshot 后断言资源、等级、EXP、任务标题和今日效果空状态。
- 点击完成按钮时调用 `onCompleteTask("movement")`。
- 点击换班按钮时调用 `onRerollTask("movement")`。
- 点击领取按钮时调用 `onClaimTicket()`。
- 断言测试文件不通过 mock data 构造生产状态。

## 验收标准

- `npm test -- __tests__/supply-production-dashboard-panel.test.tsx` 通过。
- `npm test -- __tests__/supply-production-dashboard-panel.test.tsx __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。
- 新组件不导入 `components/gamification/ui-lab/*/mock-data`。
- 生产入口 `components/gamification/SupplyStation.tsx` 保持不变。

## 后续衔接

Task 11-15 会继续补齐 Draw Pool、Backpack、Shop 和 Task Record panels。Task 16 会把这些 panels 接入 production shell，并统一处理 mutation、刷新和错误提示。
