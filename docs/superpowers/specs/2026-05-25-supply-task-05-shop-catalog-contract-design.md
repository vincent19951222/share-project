# Supply Task 05：商店 Catalog 契约设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 5：Shop Catalog Contract。

## 背景

Task 2 已经新增 `ShopPurchase` 表，后续 Task 6 会实现真实商店购买服务。Task 5 先补一层生产商店 catalog，把“哪些补给可以买、价格是多少、每日/每周限购是多少”固定成一个可测试的生产配置。

UI Lab 已经有 `components/gamification/ui-lab/supply-data/catalog.ts`，但它服务于视觉和静态业务闭环，包含图片、抽奖展示、库存示例和选中状态。生产购买服务不应该直接依赖 UI Lab mock 或 UI Lab 展示结构。Task 5 会新建一个最小生产 catalog，后续购买服务只读取这个 catalog，并继续用 `content/gamification/item-definitions.ts` 作为道具是否启用和真实效果的来源。

## 目标

- 新增 `content/gamification/shop-catalog.ts`。
- 固定第三阶段允许购买的 12 个 active non-coin item。
- 为每个商品配置 `priceCoins`，以及每日或每周限购。
- 提供 `getShopCatalogItems()` 和 `getShopCatalogItem(itemId)`。
- 新增契约测试，确保 catalog 的商品顺序、价格、限购和 enabled item definition 对齐。

## 范围

本任务修改：

- `content/gamification/shop-catalog.ts`
- `__tests__/gamification-shop-catalog.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `components/gamification/ui-lab/*`
- `content/gamification/item-definitions.ts`
- `lib/gamification/shop.ts`
- `app/api/gamification/shop/purchase/route.ts`
- `lib/gamification/supply-view-model.ts`
- 生产 `SupplyStation` UI

## Catalog 契约

第三阶段生产商店只允许购买下列道具，顺序固定，供后续 UI view-model 稳定展示：

1. `task_reroll_coupon`
2. `small_boost_coupon`
3. `fitness_leave_coupon`
4. `drink_water_ping`
5. `walk_ping`
6. `team_standup_ping`
7. `chat_ping`
8. `share_info_ping`
9. `team_broadcast_coupon`
10. `double_niuma_coupon`
11. `season_sprint_coupon`
12. `luckin_coffee_coupon`

价格和限购：

| itemId | priceCoins | dailyLimit | weeklyLimit |
| --- | ---: | ---: | ---: |
| `task_reroll_coupon` | 150 | 1 |  |
| `small_boost_coupon` | 220 | 1 |  |
| `fitness_leave_coupon` | 260 | 1 |  |
| `drink_water_ping` | 80 | 2 |  |
| `walk_ping` | 80 | 2 |  |
| `team_standup_ping` | 180 | 1 |  |
| `chat_ping` | 90 | 2 |  |
| `share_info_ping` | 90 | 2 |  |
| `team_broadcast_coupon` | 200 | 1 |  |
| `double_niuma_coupon` | 600 |  | 1 |
| `season_sprint_coupon` | 520 |  | 1 |
| `luckin_coffee_coupon` | 500 | 1 |  |

不允许购买：

- 银子奖励类 reward。
- 抽奖券或十连补券；补券继续由现有抽奖流程处理。
- disabled item。
- UI Lab 中仅用于展示、库存示例或抽奖权重的字段。

## API 形状

`content/gamification/shop-catalog.ts` 导出：

```ts
export interface ShopCatalogItem {
  itemId: string;
  priceCoins: number;
  dailyLimit?: number;
  weeklyLimit?: number;
}

export function getShopCatalogItems(): readonly ShopCatalogItem[];
export function getShopCatalogItem(itemId: string): ShopCatalogItem | null;
```

Catalog 不包含商品名称、描述、图片或效果。后续 view-model 和购买服务需要这些展示/效果信息时，从 `getItemDefinition(itemId)` 读取。

## 测试策略

新增 `__tests__/gamification-shop-catalog.test.ts`：

- 验证 `getShopCatalogItems().map(item => item.itemId)` 等于上面的 12 个 approved item ids。
- 验证关键价格与限购：
  - `task_reroll_coupon`: `priceCoins=150`, `dailyLimit=1`
  - `double_niuma_coupon`: `priceCoins=600`, `weeklyLimit=1`
  - `luckin_coffee_coupon`: `priceCoins=500`, `dailyLimit=1`
- 遍历 catalog，使用 `getItemDefinition(item.itemId)` 验证每个商品都存在且 `enabled === true`。
- 验证每个 `priceCoins > 0`。
- 验证未知商品返回 `null`。

## 验收标准

- `content/gamification/shop-catalog.ts` 存在并导出约定接口和两个 helper。
- Catalog 只包含第三阶段 approved 12 个 active non-coin items。
- 每个 catalog item 都引用已启用的 `ItemDefinition`。
- `single_draw_guarantee_coupon` 等非 approved item 不会出现在商店 catalog。
- `npm test -- __tests__/gamification-shop-catalog.test.ts` 通过。

## 后续衔接

Task 6 的 `purchaseShopItem()` 将读取 `getShopCatalogItem()`，用 catalog 的价格和限购统计 `ShopPurchase.dayKey/weekKey`，再用 `getItemDefinition()` 写入库存 metadata。Task 5 不直接扣银子、不写库存、不创建购买流水。
