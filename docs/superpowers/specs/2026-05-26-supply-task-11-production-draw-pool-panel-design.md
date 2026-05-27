# Supply Task 11：生产 Draw Pool Panel 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 11：Production Draw Pool Panel。

## 背景

Task 8 已经在 `SupplyStationProductionSnapshot` 中提供 `drawPool.wallet` 和 `drawPool.lottery`。Task 9 已经提供 production supply state API。Task 10 已经以纯 panel 方式建立 Dashboard 生产面板。

Task 11 负责建立 Draw Pool 生产面板：把真实抽奖券余额、单抽/十连/补券十连状态、十连保底说明、最近抽奖和最新抽奖结果渲染出来，并通过回调把抽奖动作交给后续 shell。

## 目标

- 新增 `components/gamification/production/SupplyDrawPoolPanel.tsx`。
- 组件输入只依赖 `SupplyStationProductionSnapshot`、`latestDraw` 和 callback props。
- 展示抽奖券余额、今日获取、今日花费和抽奖机状态文案。
- 展示单抽按钮。
- 展示十连按钮；当 `tenDrawTopUpRequired > 0` 时文案为 `补券十连`。
- 展示十连补券成本和十连保底说明。
- 展示最新抽奖结果；没有最新结果时展示最近抽奖记录摘要或空状态。
- 暴露抽奖动作回调：`onDraw("SINGLE", false)` 和 `onDraw("TEN", useCoinTopUp)`。

## 范围

本任务修改：

- `components/gamification/production/SupplyDrawPoolPanel.tsx`
- `__tests__/supply-production-draw-pool-panel.test.tsx`
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
type SupplyDrawPoolAction = "draw-single" | "draw-ten";

type SupplyDrawPoolPanelProps = {
  snapshot: SupplyStationProductionSnapshot;
  latestDraw: GamificationLotteryDrawSnapshot | null;
  activeAction: SupplyDrawPoolAction | string | null;
  onDraw: (drawType: "SINGLE" | "TEN", useCoinTopUp: boolean) => void;
};
```

`activeAction` 允许 string，是为了后续 Task 16 shell 可以复用全局 action key。panel 只识别 `draw-single` 和 `draw-ten` 两个值来控制按钮文案。

## 展示规则

### 钱包与状态

数据来自 `snapshot.drawPool.wallet` 和 `snapshot.drawPool.lottery`：

- 抽奖券余额显示 `抽奖券` 和 `{ticketBalance} 张`。
- 今日获取显示 `todayEarned/maxFreeTicketsToday`。
- 今日花费显示 `todaySpent`。
- 状态文案显示 `lottery.message`。

### 抽奖按钮

- 单抽按钮：
  - `data-action="draw-single"`
  - 禁用条件：`!lottery.singleDrawEnabled || activeAction !== null`
  - 点击：`onDraw("SINGLE", false)`
  - loading 文案：`单抽中`
- 十连按钮：
  - `data-action="draw-ten"`
  - 禁用条件：`!lottery.tenDrawEnabled || activeAction !== null`
  - `tenDrawTopUpRequired > 0` 时显示 `补券十连`
  - 否则显示 `十连 x10`
  - 点击：`onDraw("TEN", tenDrawTopUpRequired > 0)`
  - loading 文案：`十连中`

### 十连补券和保底

- 固定展示 `十连保底` 文案，说明十连批次可触发保底。
- 当 `tenDrawTopUpRequired > 0` 时展示：
  - `十连还差 {tenDrawTopUpRequired} 张券`
  - `需要 {tenDrawTopUpCoinCost} 银子补齐`

### 抽奖结果

- `latestDraw` 有值时展示：
  - 本次抽奖类型：`SINGLE` 显示 `单抽结果`，`TEN` 显示 `十连结果`
  - 奖励数量
  - `guaranteeApplied` 为 true 时显示 `触发十连保底`
  - 每个奖励的名称、层级和效果摘要
- `latestDraw` 为空且 `lottery.recentDraws.length > 0` 时展示最近记录数量。
- `latestDraw` 为空且没有最近记录时展示 `暂时没有抽奖记录`。

## 视觉策略

组件使用生产专属 class 前缀 `supply-production-draw-pool-*`。本任务不新增 CSS，先交付语义结构、真实数据绑定和稳定按钮契约。

可以使用普通 HTML 和现有文案，不导入 UI Lab Draw Pool mock data，不复用 UI Lab 本地状态机。

## 错误与加载状态

本 panel 不负责错误边界和远程请求。错误展示、pending action 生命周期和刷新 snapshot 由后续 production shell 统一处理。

## 测试策略

新增 `__tests__/supply-production-draw-pool-panel.test.tsx`：

- 先验证组件不存在导致测试失败。
- fixture 中设置 `drawPool.wallet.ticketBalance = 8`、`tenDrawTopUpRequired = 2`、`tenDrawTopUpCoinCost = 80`。
- 渲染后断言包含 `抽奖券`、`单抽`、`补券十连`、`十连保底`。
- 点击单抽按钮断言 `onDraw("SINGLE", false)`。
- 点击十连按钮断言 `onDraw("TEN", true)`。
- 渲染 `latestDraw` 时断言奖励名称和 `触发十连保底`。
- 断言生产组件和测试不导入 UI Lab `mock-data`。

## 验收标准

- `npm test -- __tests__/supply-production-draw-pool-panel.test.tsx` 通过。
- `npm test -- __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-dashboard-panel.test.tsx __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。
- 新组件不导入 `components/gamification/ui-lab/*/mock-data`。
- 生产入口 `components/gamification/SupplyStation.tsx` 保持不变。

## 后续衔接

Task 12-15 会继续补齐 Backpack、Shop 和 Task Record panels。Task 16 会把 Draw Pool panel 接入 production shell，并把 `onDraw` 连接到 `drawGamificationLottery()`、错误提示和 snapshot 刷新。
