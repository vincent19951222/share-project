# Supply Task 07：商店购买 API 与客户端 helper 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 7：Shop Purchase API And Client Helper。

## 背景

Task 5 已经固定生产商店 catalog，Task 6 已经实现 `purchaseShopItem()` 服务：它会在事务内校验商品、限购和银子余额，并完成扣银子、加背包库存、写 `ShopPurchase` 流水。

Task 7 负责把这个服务接到生产 API 边界，让后续生产补给站 UI 能通过统一 client helper 发起购买。由于 Task 8/9 才会新增生产补给站专用 view-model 和 `/api/gamification/supply/state`，本任务成功响应先返回现有 `GamificationStateSnapshot`。这样购买后客户端已经能拿到刷新后的银子、背包和现有游戏化状态，同时不提前实现 Task 8 的聚合模型。

## 目标

- 新增 `POST /api/gamification/shop/purchase`。
- API 使用 httpOnly `userId` cookie 鉴权。
- API 校验 payload 中必须有非空 `itemId`。
- API 调用 `purchaseShopItem({ userId, itemId })` 完成真实购买。
- API 成功后调用 `buildGamificationStateForUser(userId)`，返回 `{ purchase, snapshot }`。
- API 捕获 `ShopPurchaseError`，返回稳定 `error/code/status`。
- 在 `lib/api.ts` 新增 `purchaseGamificationShopItem(itemId)` client helper。
- 用 API 测试覆盖未登录、非法 payload、成功购买并刷新 snapshot、余额不足错误映射。

## 范围

本任务修改：

- `app/api/gamification/shop/purchase/route.ts`
- `lib/api.ts`
- `__tests__/gamification-shop-api.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `lib/gamification/shop.ts`
- `content/gamification/shop-catalog.ts`
- `lib/gamification/supply-view-model.ts`
- `/api/gamification/supply/state`
- 生产 `SupplyStation` UI

## API 设计

### Route

`POST /api/gamification/shop/purchase`

请求 body：

```json
{
  "itemId": "task_reroll_coupon"
}
```

成功响应：

```ts
{
  purchase: {
    id: string;
    itemId: string;
    quantity: number;
    unitPriceCoins: number;
    totalPriceCoins: number;
    dayKey: string;
    weekKey: string;
    status: string;
    createdAt: Date;
  };
  snapshot: GamificationStateSnapshot;
}
```

说明：

- `purchase` 直接来自 Prisma `ShopPurchase` 记录，NextResponse 会把 `Date` 序列化成 ISO 字符串。
- `snapshot` 使用现有 `buildGamificationStateForUser()`，其中 `snapshot.backpack` 会包含购买后新增的道具库存。
- 如果购买成功但 snapshot 构建返回 `null`，API 返回 `401 { error: "用户不存在" }`。在正常流程里用户已由购买服务验证存在，这只是防御性分支。

### 错误响应

| 场景 | status | body |
| --- | ---: | --- |
| 未登录 | 401 | `{ "error": "未登录" }` |
| 缺少或传入空 `itemId` | 400 | `{ "error": "缺少商品 ID" }` |
| `ShopPurchaseError` | `error.status` | `{ "error": error.message, "code": error.code }` |
| 未预期异常 | 500 | `{ "error": "服务器错误" }` |

业务错误码沿用 Task 6：

- `ITEM_NOT_BUYABLE`
- `UNAUTHORIZED`
- `DAILY_LIMIT_REACHED`
- `WEEKLY_LIMIT_REACHED`
- `INSUFFICIENT_COINS`

## Client Helper 设计

在 `lib/api.ts` 新增：

```ts
export async function purchaseGamificationShopItem(itemId: string): Promise<{
  purchase: {
    id: string;
    itemId: string;
    totalPriceCoins: number;
  };
  snapshot: GamificationStateSnapshot;
}>
```

行为：

- `POST /api/gamification/shop/purchase`
- `credentials: "same-origin"`
- `Content-Type: application/json`
- body 为 `{ itemId }`
- 用现有 `readApiResult()` 解析成功或抛 `ApiError`

## 测试策略

新增 `__tests__/gamification-shop-api.test.ts`：

- 每个测试前运行 `seedDatabase()`，读取 `li` 用户并把银子设为 `1000`。
- 未登录：
  - 不带 cookie。
  - 请求 `task_reroll_coupon`。
  - 返回 `401`。
- 非法 payload：
  - 已登录但 body 为空或 `itemId` 为空字符串。
  - 返回 `400`。
- 成功购买：
  - 请求 `task_reroll_coupon`。
  - 返回 `200`。
  - `purchase.itemId === "task_reroll_coupon"`。
  - `purchase.totalPriceCoins === 150`。
  - `snapshot.currentUserId` 是当前用户。
  - `snapshot.backpack.totalQuantity === 1`。
  - 数据库中的用户银子扣到 `850`。
- 余额不足：
  - 把用户银子设为 `10`。
  - 请求 `task_reroll_coupon`。
  - 返回 `409`。
  - body 包含 `code: "INSUFFICIENT_COINS"`。

## 验收标准

- `POST /api/gamification/shop/purchase` 能完成真实购买并返回刷新后的 snapshot。
- 未登录和非法 payload 在进入服务层前被拒绝。
- `ShopPurchaseError` 的 status/code/message 能稳定传到 API 响应。
- `purchaseGamificationShopItem()` 与现有 `lib/api.ts` helper 风格一致。
- `npm test -- __tests__/gamification-shop-api.test.ts` 通过。
- `npm run lint` 通过。

## 后续衔接

Task 8 会建立生产补给站 view-model。届时可以让购买 API 继续返回现有 `{ purchase, snapshot }`，或在 Task 9 接入 `/api/gamification/supply/state` 后改由页面统一刷新专用 supply snapshot。Task 7 不提前定义这个专用 snapshot，避免重复建模。
