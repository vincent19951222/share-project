# Supply Task 12：生产 Backpack Panel 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 12：Production Backpack Panel。

## 背景

Task 8 已经在 `SupplyStationProductionSnapshot` 中提供 `backpack.groups`、`backpack.todayEffects` 和固定容量 `backpack.capacity.totalSlots = 60`。Task 9 已经提供 production supply state API。Task 10 和 Task 11 已经用纯 panel 方式建立 Dashboard 与 Draw Pool 生产面板。

Task 12 负责建立 Backpack 生产面板：把真实库存分组、固定容量、今日效果和选中道具详情渲染出来，并通过回调把道具使用和实物兑换申请交给后续 shell。

## 目标

- 新增 `components/gamification/production/SupplyBackpackPanel.tsx`。
- 组件输入只依赖 `SupplyStationProductionSnapshot`、选中态、active action 和 callback props。
- 展示固定背包容量 `{usedSlots}/60`。
- 展示 `snapshot.backpack.groups` 中的库存分组和道具。
- 点击道具后调用 `onSelectItem(itemId)`。
- 选中道具后展示描述、使用时机、效果、使用限制和可用数量。
- 普通道具点击使用按钮时调用 `onUseItem(itemId, target?)`。
- `category === "real_world"` 或 `requiresAdminConfirmation === true` 的道具点击兑换按钮时调用 `onRequestRedemption(itemId)`。
- 展示 `snapshot.backpack.todayEffects`；为空时展示空状态文案。

## 范围

本任务修改：

- `components/gamification/production/SupplyBackpackPanel.tsx`
- `__tests__/supply-production-backpack-panel.test.tsx`
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
type SupplyBackpackAction = "use-item" | "request-redemption";

type SupplyBackpackUseTarget = {
  dimensionKey?: string;
  recipientUserId?: string;
  message?: string;
};

type SupplyBackpackPanelProps = {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyBackpackAction | string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUseItem: (itemId: string, target?: SupplyBackpackUseTarget) => void;
  onRequestRedemption: (itemId: string) => void;
};
```

`activeAction` 允许 string，是为了后续 Task 16 shell 可以复用全局 action key。panel 只识别 `use-item` 和 `request-redemption` 两个值来控制按钮文案和禁用状态。

## 展示规则

### 容量与分组

- 容量来自 `snapshot.backpack.capacity`，显示 `{usedSlots}/{totalSlots}`。
- `totalSlots` 在生产快照中固定为 `60`。
- 分组来自 `snapshot.backpack.groups`。
- 分组标题显示 `group.label` 和 `group.totalQuantity`。
- 每个道具渲染为按钮，带 `data-testid="supply-backpack-item"`。
- 道具按钮展示名称、分类、数量和可用数量。
- 当前选中道具设置 `aria-selected="true"`。
- 没有库存时展示 `snapshot.backpack.emptyMessage`。

### 选中详情

选中道具优先使用 `selectedItemId`，如果为空或找不到，则使用第一个库存道具。详情展示：

- `name`
- `description`
- `useTimingLabel`
- `effectSummary`
- `usageLimitSummary`
- `availableQuantity`
- `useDisabledReason`，仅当不可用且有禁用原因时展示

### 操作按钮

普通道具：

- 按钮 `data-action="use-item"`。
- 点击调用 `onUseItem(itemId)`。
- 禁用条件：`!item.useEnabled || activeAction !== null`。
- `activeAction === "use-item"` 时文案为 `使用中`。
- 可用时文案为 `今日使用`。

实物福利或需要管理员确认的道具：

- 按钮 `data-action="request-redemption"`。
- 点击调用 `onRequestRedemption(itemId)`。
- 禁用条件：`item.availableQuantity <= 0 || activeAction !== null`。
- `activeAction === "request-redemption"` 时文案为 `申请中`。
- 默认文案为 `申请兑换`。

本任务不提供维度选择、接收人选择和留言输入。后续如果某类道具需要 target，Task 16 shell 可以在调用 `onUseItem` 前补充 target。

### 今日效果

- `snapshot.backpack.todayEffects` 有值时展示效果名称、状态文案和效果摘要。
- 为空时展示 `今天还没有生效中的补给效果`。

## 视觉策略

组件使用生产专属 class 前缀 `supply-production-backpack-*`。本任务不新增 CSS，先交付语义结构、真实数据绑定和稳定按钮契约。

不导入 UI Lab `supplyBackpackMock`，也不依赖 UI Lab 本地分页或模拟状态。UI Lab 的布局只作为信息组织参考。

## 错误与加载状态

本 panel 不负责错误边界和远程请求。错误展示、pending action 生命周期、道具使用后的 snapshot 刷新和兑换申请后的刷新由后续 production shell 统一处理。

## 测试策略

新增 `__tests__/supply-production-backpack-panel.test.tsx`：

- 先验证组件不存在导致测试失败。
- fixture 中设置 `backpack.capacity.usedSlots = 2`、`totalSlots = 60`。
- fixture 中设置普通道具 `small_boost_coupon` 和实物道具 `luckin_coffee_coupon`。
- 渲染后断言包含 `2/60`、分组标题、两个库存道具和空今日效果文案。
- 点击道具按钮断言 `onSelectItem(itemId)`。
- 选中普通道具后断言详情包含描述、使用时机、效果和使用限制。
- 点击普通道具使用按钮断言 `onUseItem("small_boost_coupon", undefined)`。
- 选中实物道具后点击兑换按钮断言 `onRequestRedemption("luckin_coffee_coupon")`。
- 断言生产组件和测试不导入 UI Lab `mock-data`。

## 验收标准

- `npm test -- __tests__/supply-production-backpack-panel.test.tsx` 通过。
- `npm test -- __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-dashboard-panel.test.tsx __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。
- 新组件不导入 `components/gamification/ui-lab/*/mock-data`。
- 生产入口 `components/gamification/SupplyStation.tsx` 保持不变。

## 后续衔接

Task 13-15 会继续补齐 Shop 和 Task Record panels 以及 isolation 检查。Task 16 会把 Backpack panel 接入 production shell，并把 `onUseItem`、`onRequestRedemption` 连接到真实 API、错误提示和 snapshot 刷新。
