# Supply Task 06：商店购买服务设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 6：Shop Purchase Service。

## 背景

Task 5 已经新增生产商店 catalog：`content/gamification/shop-catalog.ts`。它固定了第三阶段可以买的 12 个道具、价格和每日/每周购买限制。Task 6 在这个 catalog 和 Task 2 的 `ShopPurchase` schema 之上实现真实购买服务。

本任务只做服务层，不暴露 API Route，不接生产 UI，也不返回补给站 view-model。后续 Task 7 会把服务包成 `POST /api/gamification/shop/purchase`，Task 8 之后才会把商店状态映射进生产补给站页面。

## 目标

- 新增 `lib/gamification/shop.ts`。
- 提供 `ShopPurchaseError`，让后续 API 能把业务失败映射成稳定 HTTP 状态和中文错误文案。
- 提供 `purchaseShopItem({ userId, itemId, now })`。
- 购买成功时在同一个 Prisma transaction 内：
  - 校验用户存在。
  - 校验 item 在生产商店 catalog 中，且对应 `ItemDefinition.enabled === true`。
  - 按 `ShopPurchase.dayKey/weekKey` 校验每日/每周购买限制。
  - 校验 `User.coins` 足够。
  - 扣减 `User.coins`。
  - 增加或创建 `InventoryItem.quantity`。
  - 写入一条 `ShopPurchase` 审计流水。
- 用 focused service tests 覆盖成功购买、余额不足、日限购、周限购和非商店商品。

## 范围

本任务修改：

- `lib/gamification/shop.ts`
- `__tests__/gamification-shop.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `content/gamification/shop-catalog.ts`
- `content/gamification/item-definitions.ts`
- `app/api/gamification/shop/purchase/route.ts`
- `lib/api.ts`
- `lib/gamification/supply-view-model.ts`
- 生产 `SupplyStation` UI

## 服务设计

### `ShopPurchaseError`

错误类包含：

- `message`：可直接展示给用户的中文文案。
- `code`：稳定业务错误码，后续 API 和测试使用。
- `status`：建议 HTTP 状态，默认 `409`。

错误码：

| code | status | message |
| --- | ---: | --- |
| `ITEM_NOT_BUYABLE` | 404 | `这个商品不存在或已下架。` |
| `UNAUTHORIZED` | 401 | `用户不存在。` |
| `DAILY_LIMIT_REACHED` | 409 | `今天这个商品已经买到上限。` |
| `WEEKLY_LIMIT_REACHED` | 409 | `本周这个商品已经买到上限。` |
| `INSUFFICIENT_COINS` | 409 | `银子不足。` |

### `purchaseShopItem(input)`

输入：

```ts
{
  userId: string;
  itemId: string;
  now?: Date;
}
```

行为：

1. 用 `now ?? new Date()` 推导上海日键和周键：
   - `dayKey = getShanghaiDayKey(now)`
   - `weekKey = getShanghaiWeekKey(dayKey)`
2. 读取 `getShopCatalogItem(itemId)`。
3. 读取 `getItemDefinition(itemId)`。
4. 如果 catalog 或 enabled definition 不存在，抛 `ITEM_NOT_BUYABLE`。
5. 开启 Prisma transaction。
6. 查询用户 `id/teamId/coins`；不存在时抛 `UNAUTHORIZED`。
7. 如果 catalog 有 `dailyLimit`，统计同用户、同商品、同 dayKey、`status="SETTLED"` 的 `ShopPurchase` 数量。
8. 如果 catalog 有 `weeklyLimit`，统计同用户、同商品、同 weekKey、`status="SETTLED"` 的 `ShopPurchase` 数量。
9. 如果银子不足，抛 `INSUFFICIENT_COINS`。
10. 扣减用户银子。
11. `InventoryItem.upsert()`：
    - 不存在则创建 `quantity=1`。
    - 已存在则 `quantity += 1`。
12. 创建 `ShopPurchase`：
    - `quantity=1`
    - `unitPriceCoins=priceCoins`
    - `totalPriceCoins=priceCoins`
    - `status="SETTLED"`
    - `metadataJson` 保存 item name、category、`requiresAdminConfirmation`。
13. 返回 `{ purchase }`。

## 业务边界

- 购买限制和使用限制分开：
  - 购买限制只看 `ShopPurchase`。
  - 使用限制仍由 `ItemUseRecord` 和现有道具使用服务控制。
- 真实福利类商品可以买入背包，但兑换仍走现有 `RealWorldRedemption` 管理员确认流程。
- 不允许购买抽奖券或 `single_draw_guarantee_coupon` 这类非 approved catalog item。
- 本任务不做并发库存上限或商品总库存；第三阶段 catalog 没有商品总库存字段。
- 本任务不做数量参数；每次购买固定 `quantity=1`。

## 测试策略

新增 `__tests__/gamification-shop.test.ts`：

- 每个测试前运行 `seedDatabase()`，把用户 `li` 的 `coins` 设置为 `1000`。
- 成功购买 `task_reroll_coupon`：
  - 用户银子从 `1000` 变为 `850`。
  - `InventoryItem.quantity` 变为 `1`。
  - `ShopPurchase` 写入 `itemId/quantity/unitPriceCoins/totalPriceCoins/dayKey/weekKey/status`。
  - `metadataJson` 包含 `itemName` 和 `requiresAdminConfirmation`。
- 余额不足：
  - 抛 `INSUFFICIENT_COINS`。
  - 不新增库存。
  - 不新增购买流水。
- 日限购：
  - 同一天第二次购买 `task_reroll_coupon` 抛 `DAILY_LIMIT_REACHED`。
- 周限购：
  - 同一上海周第二次购买 `double_niuma_coupon` 抛 `WEEKLY_LIMIT_REACHED`。
- 非商店商品：
  - `single_draw_guarantee_coupon` 抛 `ShopPurchaseError`，code 为 `ITEM_NOT_BUYABLE`。

## 验收标准

- `lib/gamification/shop.ts` 导出 `ShopPurchaseError` 和 `purchaseShopItem()`。
- 购买成功会在同一事务内扣银子、加背包库存、写 `ShopPurchase`。
- 每日/每周购买限制基于 `ShopPurchase.dayKey/weekKey` 生效。
- 余额不足、限购、非商店商品不会产生库存或购买流水副作用。
- `metadataJson` 记录商品名称、分类和是否需要管理员确认，方便后续任务记录聚合展示。
- `npm test -- __tests__/gamification-shop.test.ts` 通过。

## 后续衔接

Task 7 会新增购买 API 和 client helper。API 层应捕获 `ShopPurchaseError`，用 `error.status` 作为响应状态，并在成功购买后返回 purchase 与新的 production supply snapshot。
