# Supply Task 13：生产 Shop Panel 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 13：Production Shop Panel。

## 背景

Task 8 已经在 `SupplyStationProductionSnapshot` 中提供 `shop.products`。Task 9 已经提供 production supply state API。Task 10-12 已经用纯 panel 方式建立 Dashboard、Draw Pool 和 Backpack 生产面板。

Task 13 负责建立 Shop 生产面板：把真实商品 catalog、价格、持有数量、限购信息和购买禁用原因渲染出来，并通过回调把购买动作交给后续 shell。

## 目标

- 新增 `components/gamification/production/SupplyShopPanel.tsx`。
- 组件输入只依赖 `SupplyStationProductionSnapshot`、选中态、active action 和 callback props。
- 展示 `snapshot.shop.products` 中的商品。
- 商品价格显示为 `银子 {priceCoins}`。
- 展示当前持有数量、每日限购、每周限购和管理员确认标记。
- 点击商品后调用 `onSelectItem(itemId)`。
- 点击可购买商品的购买按钮后调用 `onPurchase(itemId)`。
- 禁用商品展示 `purchaseDisabledReason`，禁用按钮不触发购买。
- 商品列表为空时展示空状态文案。

## 范围

本任务修改：

- `components/gamification/production/SupplyShopPanel.tsx`
- `__tests__/supply-production-shop-panel.test.tsx`
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
type SupplyShopAction = "purchase-shop-item";

type SupplyShopPanelProps = {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyShopAction | string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onPurchase: (itemId: string) => void;
};
```

`activeAction` 允许 string，是为了后续 shell 可以复用全局 action key。panel 只识别 `purchase-shop-item` 来控制按钮文案和禁用状态。

## 展示规则

### 资源与分类

- 顶部展示用户当前银子：`snapshot.resources.coins.value`。
- 商品来源为 `snapshot.shop.products`。
- 本任务允许组件内部维护轻量分类状态。
- 分类选项从商品数据推导，始终包含 `全部`。
- 每个商品渲染为按钮卡片，带 `data-testid="supply-shop-product"`。
- 当前选中商品设置 `aria-selected="true"`。
- 没有商品时展示 `补给商店暂时没有可购买商品`。

### 商品卡片

每个商品展示：

- `name`
- `description`
- `category`
- `银子 {priceCoins}`
- `持有 {ownedQuantity}`
- `每日限购 {dailyLimit}`，仅存在时展示
- `每周限购 {weeklyLimit}`，仅存在时展示
- `管理员确认`，仅 `requiresAdminConfirmation === true` 时展示

### 选中详情

选中商品优先使用 `selectedItemId`，如果为空或找不到，则使用当前筛选后的第一个商品。详情展示：

- 名称、描述和价格。
- 持有数量。
- 每日限购、每周限购。
- 管理员确认说明。
- 禁用原因。

### 购买按钮

- 按钮 `data-action="purchase-shop-item"`。
- 点击调用 `onPurchase(itemId)`。
- 禁用条件：`!product.purchaseEnabled || activeAction !== null`。
- `activeAction === "purchase-shop-item"` 时文案为 `购买中`。
- 可用时文案为 `购买`。
- 不可用时优先展示 `purchaseDisabledReason`，按钮文案为 `暂不可买`。

## 视觉策略

组件使用生产专属 class 前缀 `supply-production-shop-*`。本任务不新增 CSS，先交付语义结构、真实数据绑定和稳定按钮契约。

不导入 UI Lab `supplyShopMock`，也不依赖 UI Lab 本地模拟筛选、稀有度或图片资源。UI Lab 的布局只作为信息组织参考。

## 错误与加载状态

本 panel 不负责错误边界和远程请求。错误展示、pending action 生命周期、购买成功后的 snapshot 刷新和购买失败提示由后续 production shell 统一处理。

## 测试策略

新增 `__tests__/supply-production-shop-panel.test.tsx`：

- 先验证组件不存在导致测试失败。
- fixture 中设置两个商品：可购买商品 `small_boost_coupon` 和禁用商品 `disabled_reward_coupon`。
- 渲染后断言包含用户银子、商品名称、价格、持有数量、限购标签和管理员确认标签。
- 点击商品卡片断言 `onSelectItem(itemId)`。
- 选中可购买商品后点击购买按钮断言 `onPurchase("small_boost_coupon")`。
- 选中禁用商品后断言按钮 disabled，展示禁用原因，且不会调用 `onPurchase`。
- 断言生产组件和测试不导入 UI Lab `mock-data`。

## 验收标准

- `npm test -- __tests__/supply-production-shop-panel.test.tsx` 通过。
- `npm test -- __tests__/supply-production-shop-panel.test.tsx __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-dashboard-panel.test.tsx` 通过。
- `npm run lint` 通过。
- 新组件不导入 `components/gamification/ui-lab/*/mock-data`。
- 生产入口 `components/gamification/SupplyStation.tsx` 保持不变。

## 后续衔接

Task 14-15 会继续补齐 Task Record panel 和 UI Lab/production isolation 检查。后续 shell 任务会把 `onPurchase` 连接到 `POST /api/gamification/shop/purchase`，并处理错误提示和 snapshot 刷新。
