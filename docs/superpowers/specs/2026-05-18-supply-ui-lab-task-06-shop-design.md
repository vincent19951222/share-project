# Supply UI Lab 任务 06：补给商店设计

> 第二阶段任务级 spec，用于定义补给商店页面的查漏补缺范围。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 6。

## 目标

把补给商店改成 catalog 驱动的静态店面，让每个 active 的非银子抽奖奖励都能被购买、查看、筛选和 mock 兑换。

## 用户可见变化

- 商店商品与抽卡池可出现的道具保持一致。
- 商品图片、名称、效果、价格、限制和持有数量都来自共享 catalog。
- 点击商品会切换右侧详情面板。
- 分类和筛选按钮会切换本地状态。
- 兑换按钮会更新本地反馈，例如 `已加入背包` 或 `兑换中`。
- 移除 `了解更多规则` 死锚点，改成本页规则展开区。
- `补给券` 替换为 `抽奖券`。

## 数据与组件变化

修改：

- `components/gamification/ui-lab/supply-shop/types.ts`
- `components/gamification/ui-lab/supply-shop/mock-data.ts`
- `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- `__tests__/supply-shop-mock-data.test.ts`
- `__tests__/supply-shop-scene.test.tsx`

商店商品来自：

- `supplyUiLabCatalog.filter((item) => item.shop.buyable)`

## 非目标

- 不执行真实购买或库存 mutation。
- 不调用兑换 API。
- 不把银子奖励作为商品出售。
- 不新增超出本地 mock 状态的管理员确认流程。

## 验收标准

- 商品列表包含所有 active 非银子抽奖奖励 item id。
- 每个商品都有来源、效果、使用时机、价格和限制信息。
- 点击商品能切换选中详情。
- 真实福利类商品展示管理员确认文案，并提供本地 `兑换中` 反馈。
- 不再保留 `href="#rules"` 死锚点。

## 关联计划

具体实现步骤见以下总计划的任务 6：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
