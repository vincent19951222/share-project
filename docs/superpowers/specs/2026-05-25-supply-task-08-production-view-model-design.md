# Supply Task 08：生产补给站 View-Model Foundation 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 8：Production Supply View-Model Foundation。

## 背景

Task 1-7 已经补齐第三阶段生产接入所需的发布护栏、EXP/等级模型、商店 catalog、真实购买服务，以及 `POST /api/gamification/shop/purchase`。生产旧补给站目前仍直接使用 `GamificationStateSnapshot`，而 UI Lab 页面族使用自己的 mock/view 数据。

Task 8 负责新增一层生产专用 view-model，把真实 `GamificationStateSnapshot`、用户资料、资源栏、商店 catalog 和临时任务记录占位聚合成 UI Lab 后续 panel 能消费的 `SupplyStationProductionSnapshot`。这一步只建立数据边界，不替换生产 UI，不新增 API。

## 目标

- 在 `lib/types.ts` 新增 `SupplyStationProductionSnapshot` 及相关子类型。
- 新增 `lib/gamification/supply-view-model.ts`。
- 暴露 `buildSupplyStationViewModelForUser(userId, now?)`。
- 复用 `buildGamificationStateForUser(userId, now)` 获取真实任务、抽奖、背包、社交、兑换和 EXP/等级状态。
- 补齐 UI Lab 所需的生产资源栏：
  - 银子：来自 `User.coins`。
  - 抽奖券：来自 `User.ticketBalance`。
  - 背包：来自 `snapshot.backpack.totalQuantity`，容量固定 `60`。
- 把 `User.username/avatarKey` 合并进 profile。
- 把生产商店 catalog 映射为可展示、可购买判断的 `shop.products`。
- 先生成最近 7 天日期列表和空 timeline，给后续 Task 14 的任务记录聚合预留稳定类型。

## 范围

本任务修改：

- `lib/types.ts`
- `lib/gamification/supply-view-model.ts`
- `__tests__/supply-production-view-model.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `app/api/gamification/supply/state/route.ts`
- `app/api/gamification/shop/purchase/route.ts`
- `lib/api.ts`
- `components/gamification/SupplyStation.tsx`
- `components/gamification/production/*`
- UI Lab mock 或 UI Lab routes

## Snapshot 结构

`SupplyStationProductionSnapshot` 是生产补给站唯一面向 UI 的聚合数据形状。它不暴露 Prisma row，也不让 production panel import UI Lab mock。

关键字段：

```ts
export interface SupplyStationProductionSnapshot {
  currentUserId: string;
  currentUserRole: string;
  teamId: string;
  dayKey: string;
  resources: {
    coins: { label: "银子"; value: number };
    ticket: { label: "抽奖券"; value: number };
    backpack: { label: "背包"; value: number; maxValue: 60 };
  };
  profile: GamificationProfileSnapshot & {
    username: string;
    avatarKey: string;
  };
  dashboard: {
    dailyQuests: GamificationDimensionSnapshot[];
    todayEffects: GamificationTodayEffectSnapshot[];
  };
  drawPool: {
    wallet: GamificationTicketSummary & { ticketBalance: number };
    lottery: GamificationLotterySummary;
  };
  backpack: GamificationBackpackSummary & {
    capacity: { usedSlots: number; totalSlots: 60 };
  };
  shop: {
    products: SupplyShopProductSnapshot[];
  };
  taskRecord: SupplyTaskRecordSnapshot;
  social: GamificationSocialSummary;
  redemptions: GamificationRedemptionSectionSnapshot;
}
```

## 商店 Product 映射

`shop.products` 来自 `getShopCatalogItems()` 的固定顺序，再通过 `getItemDefinition(itemId)` 补展示字段：

- `itemId`
- `name`
- `description`
- `category`
- `priceCoins`
- `ownedQuantity`
- `dailyLimit`
- `weeklyLimit`
- `purchaseEnabled`
- `purchaseDisabledReason`
- `requiresAdminConfirmation`

购买可用性：

- catalog item 和 enabled definition 都存在时：`purchaseEnabled=true`。
- definition 缺失或 disabled 时：`purchaseEnabled=false`，`purchaseDisabledReason="商品配置不可用"`。
- Task 8 不统计已购买次数，不在 view-model 中提前禁用日/周限购；真实限购仍由 `purchaseShopItem()` 服务保证。

## 任务记录占位

Task 8 只建立类型和日期结构：

- `taskRecord.dates` 固定包含以 `now` 为基准的最近 7 天，按今天到前 6 天排序。
- 日期字段包含 `key/label/dateLabel/weekday`。
- `taskRecord.timeline` 暂时为空数组。

完整记录聚合属于后续 Task 14，不在本任务提前查询 `ExperienceLedger`、`ShopPurchase`、`LotteryDraw` 等多表。

## 错误和空状态

- 用户不存在时返回 `null`。
- `buildGamificationStateForUser()` 返回 `null` 时返回 `null`。
- 如果 catalog 中出现缺失 definition 的商品，mapper 不抛错，而是返回不可购买 product，便于页面显示配置异常。
- 背包容量固定 `60`，`usedSlots` 使用 `snapshot.backpack.totalQuantity`，不新增容量模型。

## 测试策略

新增 `__tests__/supply-production-view-model.test.ts`：

- 每个测试前运行 `seedDatabase()`。
- 对用户 `li`：
  - 调用 `ensureTodayTaskAssignments()` 生成四维任务。
  - 设置 `coins=2450`、`ticketBalance=18`、`exp=2720`。
  - 写入 `InventoryItem(task_reroll_coupon, quantity=2)`。
- 断言 snapshot：
  - 包含 `currentUserId/teamId/dayKey/currentUserRole`。
  - `resources.coins.value === 2450`。
  - `resources.ticket.value === 18`。
  - `resources.backpack.value === 2` 且 `maxValue === 60`。
  - profile 合并等级、EXP、username 和 avatarKey。
  - dashboard 有 4 个 daily quests。
  - draw pool wallet 带 `ticketBalance=18`。
  - backpack capacity 为 `{ usedSlots: 2, totalSlots: 60 }`。
  - shop products 包含 `task_reroll_coupon`，价格、拥有数量、日限购和可购买状态正确。
  - task record 有 7 个日期且 timeline 为空。
- 未知用户返回 `null`。

## 验收标准

- `SupplyStationProductionSnapshot` 类型能表达后续 Dashboard、Draw Pool、Backpack、Shop、Task Record panel 的基础数据。
- `buildSupplyStationViewModelForUser()` 不依赖 UI Lab mock。
- 生产资源栏、profile、dashboard、drawPool、backpack、shop、taskRecord/social/redemptions 都来自真实生产状态或生产 catalog。
- `taskRecord` 只做日期和空 timeline，占位边界清楚。
- `npm test -- __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。

## 后续衔接

Task 9 会把本 view-model 包装成 `GET /api/gamification/supply/state` 和客户端 helper。后续 production shell 只读取这个 snapshot；mutation 成功后统一刷新 supply state。
