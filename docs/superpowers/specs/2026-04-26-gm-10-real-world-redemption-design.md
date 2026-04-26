# GM-10 Real-World Redemption Design

> 让“瑞幸咖啡券”从背包库存变成可申请、可确认、可取消、可追踪状态的真实福利兑换流程。GM-10 只做系统内申请和管理员处理，不发送企业微信，不生成兑换码，不自动写入咖啡打卡。

## 背景

GM-06 可以通过抽奖发放真实福利类道具，GM-07 可以在背包里展示 `luckin_coffee_coupon`。但在 GM-07 之后，用户只能看到自己拥有瑞幸券，不能把它变成一次可追踪的线下兑换。

GM-10 补上这个闭环：

```text
抽中瑞幸咖啡券 -> 背包库存 +1 -> 用户申请兑换 -> 库存 -1 -> 管理员线下履约 -> 管理员确认
                                                     -> 管理员取消 -> 库存 +1
```

这个 story 的重点不是做完整商城，而是把真实福利的状态和库存扣减规则落清楚。真实福利会带来真实成本，所以必须比普通道具更重视审计、权限和状态机。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 用户可以从背包里对 `瑞幸咖啡券` 发起兑换申请。
2. 发起申请时立即扣减 `InventoryItem.quantity`，避免同一张券被重复申请。
3. 每次申请创建一条 `RealWorldRedemption`，状态为 `REQUESTED`。
4. 管理员可以确认 `REQUESTED` 兑换，状态变为 `CONFIRMED`。
5. 管理员可以取消 `REQUESTED` 兑换，状态变为 `CANCELLED`，并返还用户库存。
6. `CONFIRMED` 兑换不能取消，避免线下已履约后系统返还库存。
7. 用户可以在供应站看到自己的兑换状态。
8. 管理员可以在供应站看到本队待处理兑换。
9. 真实福利兑换不自动创建 `CoffeeRecord`。

## 非目标

- 不生成瑞幸兑换码。
- 不接瑞幸开放平台。
- 不发送企业微信通知。
- 不做用户自助取消。
- 不做管理员补发、赔付或库存手动调整。
- 不做独立商城页。
- 不做兑换记录搜索后台。
- 不把兑换结果写入团队动态；GM-13 再决定哪些高价值事件沉淀。
- 不把兑换自动计入 `续命咖啡`；用户实际喝了咖啡后仍按咖啡页正常打卡。

## 兑换对象

GM-10 第一版只支持一个真实福利道具：

| itemId | 名称 | effect | 说明 |
| --- | --- | --- | --- |
| `luckin_coffee_coupon` | 瑞幸咖啡券 | `real_world_redemption / luckin_coffee` | 找管理员线下兑换一杯瑞幸咖啡 |

服务端必须校验本地 `ItemDefinition`：

- `enabled = true`
- `useTiming = "manual_redemption"`
- `category = "real_world"`
- `requiresAdminConfirmation = true`
- `effect.type = "real_world_redemption"`

如果未来新增其他真实福利，也必须先通过同一组校验，不允许前端传任意 `itemId` 后直接扣库存。

## 状态机

`RealWorldRedemption.status` 只允许三种状态：

```text
REQUESTED -> CONFIRMED
REQUESTED -> CANCELLED
```

状态含义：

| status | 库存状态 | 说明 |
| --- | --- | --- |
| `REQUESTED` | 已扣减 | 用户已经申请，等待管理员线下处理 |
| `CONFIRMED` | 不返还 | 管理员确认已履约，流程结束 |
| `CANCELLED` | 已返还 | 管理员取消申请，系统返还库存 |

禁止状态流转：

- `CONFIRMED -> CANCELLED`
- `CANCELLED -> CONFIRMED`
- `CANCELLED -> REQUESTED`
- `CONFIRMED -> REQUESTED`

GM-10 不做用户自助取消，原因是第一版真实福利需要管理员判断线下是否已经履约。用户误点时可以找管理员取消。

## 数据模型

GM-02 已规划 `RealWorldRedemption`。GM-10 需要确认模型可支撑管理员取消审计。

推荐模型：

```prisma
model RealWorldRedemption {
  id                String    @id @default(cuid())
  teamId            String
  team              Team      @relation(fields: [teamId], references: [id])
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  itemId            String
  status            String
  requestedAt       DateTime  @default(now())
  confirmedByUserId String?
  confirmedByUser   User?     @relation("RedemptionConfirmer", fields: [confirmedByUserId], references: [id])
  confirmedAt       DateTime?
  cancelledByUserId String?
  cancelledByUser   User?     @relation("RedemptionCanceller", fields: [cancelledByUserId], references: [id])
  cancelledAt       DateTime?
  note              String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([teamId, status, requestedAt])
  @@index([userId, status, requestedAt])
}
```

说明：

- `itemId` 引用本地配置 ID，不做数据库外键。
- `requestedAt` 记录用户申请时间。
- `confirmedByUserId` 记录确认兑换的管理员。
- `cancelledByUserId` 记录取消兑换的管理员。
- `note` 存管理员备注，例如“已线下发券”“用户误点，已取消”。
- 不需要给每一张券建独立实体；申请时从聚合库存扣 `1` 并创建一条兑换记录即可解释这张券的去向。

## API 设计

### 用户申请兑换

```text
POST /api/gamification/redemptions/request
```

Request:

```json
{
  "itemId": "luckin_coffee_coupon"
}
```

Response:

```json
{
  "redemption": {
    "id": "redemption_id",
    "itemId": "luckin_coffee_coupon",
    "itemName": "瑞幸咖啡券",
    "status": "REQUESTED",
    "statusLabel": "待管理员确认",
    "requestedAt": "2026-04-26T01:30:00.000Z",
    "confirmedAt": null,
    "cancelledAt": null,
    "confirmedByUsername": null,
    "cancelledByUsername": null,
    "note": null
  },
  "inventory": {
    "itemId": "luckin_coffee_coupon",
    "quantity": 0
  }
}
```

错误：

| status | code | 场景 |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | 未登录 |
| `400` | `INVALID_REQUEST` | body 无效 |
| `400` | `ITEM_NOT_REDEEMABLE` | 不是可兑换真实福利 |
| `409` | `INSUFFICIENT_INVENTORY` | 没有可用库存 |

### 管理员确认兑换

```text
POST /api/admin/gamification/redemptions/confirm
```

Request:

```json
{
  "redemptionId": "redemption_id",
  "note": "已线下发券"
}
```

规则：

- 只有管理员可以调用。
- 只能处理当前管理员所在团队的兑换。
- 只能确认 `REQUESTED`。
- 确认后不返还库存。

### 管理员取消兑换

```text
POST /api/admin/gamification/redemptions/cancel
```

Request:

```json
{
  "redemptionId": "redemption_id",
  "note": "用户误点，已取消"
}
```

规则：

- 只有管理员可以调用。
- 只能处理当前管理员所在团队的兑换。
- 只能取消 `REQUESTED`。
- 取消成功后返还 `InventoryItem.quantity + 1`。
- `CONFIRMED` 不能取消。
- `CANCELLED` 不能再次取消，避免重复返还库存。

## 并发与幂等边界

### 申请并发

用户如果只有 `1` 张瑞幸券，同时点击两次申请：

- 只能有一次扣减库存成功。
- 只能创建一条 `REQUESTED` 记录。
- 另一次返回 `409 INSUFFICIENT_INVENTORY`。

实现上必须使用原子扣减：

```text
UPDATE InventoryItem
SET quantity = quantity - 1
WHERE userId = ? AND itemId = ? AND quantity > 0
```

不能先读数量再扣减。

### 管理员并发

两个管理员同时确认或取消同一条兑换：

- 只能有一个状态流转成功。
- 失败方返回当前状态冲突。
- 取消返还库存只能发生一次。

实现上必须用 `WHERE id = ? AND teamId = ? AND status = "REQUESTED"` 做状态更新。

## 供应站展示

GM-10 扩展 `GET /api/gamification/state`：

```ts
interface GamificationRedemptionSectionSnapshot {
  mine: GamificationRedemptionSnapshot[];
  adminQueue: GamificationRedemptionSnapshot[];
}
```

`mine`：

- 当前用户最近的兑换记录。
- 展示 `REQUESTED / CONFIRMED / CANCELLED`。
- 默认取最近 `10` 条。

`adminQueue`：

- 仅管理员可见。
- 展示当前团队所有 `REQUESTED` 兑换。
- 普通成员返回空数组。

用户 UI：

- 背包中真实福利道具展示“申请兑换”按钮。
- 没有库存时按钮禁用。
- 申请成功后刷新供应站状态。
- “我的兑换”展示状态、申请时间、管理员备注。

管理员 UI：

- 在供应站显示“待处理兑换”区域。
- 每条待处理记录展示申请人、道具名、申请时间。
- 提供“确认已兑换”和“取消并返还”按钮。

## 文案

用户申请成功：

```text
兑换申请已提交，瑞幸券已从背包扣除。管理员确认前不会自动生成咖啡记录。
```

库存不足：

```text
背包里没有可兑换的瑞幸券，先去抽奖机薅一张。
```

管理员确认成功：

```text
已确认兑换，请在线下把咖啡债还上。
```

管理员取消成功：

```text
已取消兑换，瑞幸券已返还到对方背包。
```

确认后尝试取消：

```text
这张券已经确认兑换，不能再取消返还。
```

## 测试策略

### 服务层测试

覆盖：

- 可兑换 item 申请成功时库存 `-1`，创建 `REQUESTED`。
- 非真实福利 item 不能申请兑换。
- 未知 item 不能申请兑换。
- 库存为 `0` 时不能申请兑换。
- 并发申请同一张券只成功一次。
- 管理员确认 `REQUESTED` 成功。
- 管理员取消 `REQUESTED` 成功并返还库存。
- `CONFIRMED` 不能取消。
- `CANCELLED` 不能再次取消。

### API 测试

覆盖：

- 用户申请兑换鉴权。
- 管理员确认鉴权。
- 非管理员确认返回 `403`。
- 管理员不能确认其他团队兑换。
- 管理员取消后库存返还。
- malformed body 返回 `400`。

### State/UI 测试

覆盖：

- `GET /api/gamification/state` 返回当前用户兑换记录。
- 管理员 state 返回 `adminQueue`。
- 普通成员看不到 `adminQueue`。
- 背包真实福利卡片显示申请兑换按钮。
- 申请成功后页面刷新并展示 `待管理员确认`。
- 管理员可以在供应站触发确认和取消动作。

## Acceptance Criteria

GM-10 完成时应满足：

1. 用户只能对持有库存的 `luckin_coffee_coupon` 发起兑换申请。
2. 申请兑换时库存原子扣减 `1`。
3. 申请兑换后创建 `REQUESTED` 的 `RealWorldRedemption`。
4. 管理员可以确认 `REQUESTED`，状态变为 `CONFIRMED`。
5. 管理员可以取消 `REQUESTED`，状态变为 `CANCELLED` 并返还库存。
6. `CONFIRMED` 不能取消。
7. 同一条兑换不会被重复确认或重复取消。
8. 管理员只能处理自己团队的兑换。
9. 用户能看到自己的兑换状态。
10. 管理员能看到本队待处理兑换。
11. 兑换不会自动创建 `CoffeeRecord`。
12. GM-10 不发送企业微信，不写团队动态。

## Follow-Up Stories

GM-10 解锁：

- `GM-14 Docs Center Rule Pages`
- `GM-15 Weekly Report / Report Center Integration`

GM-10 不阻塞：

- `GM-11 Enterprise WeChat Sender Foundation`
- `GM-12 Weak Social Invitations V1`
