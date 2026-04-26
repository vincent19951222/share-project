# GM-02 Database Foundation Design

> 为“牛马补给站”建立用户状态和经济流水的数据基础。这个 story 只交付 Prisma 数据模型、基础约束和最小服务校验，不实现页面、抽奖业务、道具结算或企业微信。

## 背景

GM-01 提供本地内容配置：四维定义、任务卡、奖品和道具。GM-02 负责把用户状态落库，为后续每日任务、抽奖券、背包、抽奖记录、道具使用、弱社交邀请和真实福利兑换提供统一数据基础。

当前产品已有：

- `Team`
- `User`
- `PunchRecord`
- `Season`
- `SeasonMemberStat`
- `ActivityEvent`
- `CoffeeRecord`

GM-02 需要在不改变现有业务行为的前提下，新增游戏化相关表。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 为四维任务状态、抽奖券、背包、抽奖记录、道具使用、弱社交和真实福利兑换建立稳定数据模型。
2. 保持内容定义与用户状态分离：`taskCardId`、`itemId`、`rewardId` 引用本地配置 ID，不做数据库外键。
3. 用流水解释抽奖券来源和消耗，避免只存余额导致无法追溯。
4. 让后续 story 可以在服务层中安全更新余额、库存和状态。

## 非目标

- 不实现 `牛马补给站` 页面。
- 不实现 HTTP API。
- 不实现每日任务抽取。
- 不实现抽奖随机逻辑。
- 不实现道具结算。
- 不实现企业微信发送。
- 不实现团队动态集成。

## 数据模型

### User 扩展

新增字段：

```prisma
ticketBalance Int @default(0)
```

用途：

- 快速展示当前抽奖券余额。
- 所有变化必须由 `LotteryTicketLedger` 解释。

新增关系：

- `dailyTaskAssignments`
- `lotteryTicketLedgers`
- `inventoryItems`
- `itemUseRecords`
- `lotteryDraws`
- `sentSocialInvitations`
- `receivedSocialInvitations`
- `realWorldRedemptions`
- `confirmedRedemptions`

### Team 扩展

新增关系：

- `dailyTaskAssignments`
- `lotteryTicketLedgers`
- `inventoryItems`
- `itemUseRecords`
- `lotteryDraws`
- `socialInvitations`
- `realWorldRedemptions`

### DailyTaskAssignment

记录用户某天某维度抽到的任务和完成状态。

字段：

```prisma
model DailyTaskAssignment {
  id                     String    @id @default(cuid())
  userId                 String
  user                   User      @relation(fields: [userId], references: [id])
  teamId                 String
  team                   Team      @relation(fields: [teamId], references: [id])
  dayKey                 String
  dimensionKey           String
  taskCardId             String
  rerollCount            Int       @default(0)
  rerolledFromTaskCardId String?
  completedAt            DateTime?
  completionText         String?
  note                   String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@unique([userId, dayKey, dimensionKey])
  @@index([teamId, dayKey])
}
```

说明：

- `dimensionKey` 引用 GM-01 的稳定维度 key。
- `taskCardId` 引用 GM-01 的本地任务卡 ID。
- 第一版不保存任务文案快照。

### LotteryTicketLedger

记录抽奖券变化流水。

字段：

```prisma
model LotteryTicketLedger {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  teamId       String
  team         Team     @relation(fields: [teamId], references: [id])
  dayKey       String
  delta        Int
  balanceAfter Int
  reason       String
  sourceType   String?
  sourceId     String?
  metadataJson String?
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
  @@index([teamId, dayKey, createdAt])
  @@index([sourceType, sourceId])
}
```

Rules:

- `delta` cannot be `0` at service level.
- `balanceAfter` cannot be negative at service level.
- `User.ticketBalance` and ledger rows must update in one transaction.
- `metadataJson` stores JSON as string in SQLite.

### InventoryItem

聚合背包库存。同一用户同一 `itemId` 一条记录。

字段：

```prisma
model InventoryItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  itemId    String
  quantity  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, itemId])
  @@index([teamId, itemId])
}
```

Rules:

- `quantity` cannot be negative at service level.
- `itemId` references local config, not a database table.

### ItemUseRecord

记录道具使用、待生效、已结算、过期和取消。

字段：

```prisma
model ItemUseRecord {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id])
  teamId             String
  team               Team      @relation(fields: [teamId], references: [id])
  itemId             String
  dayKey             String
  status             String
  targetType         String?
  targetId           String?
  effectSnapshotJson String
  settledAt          DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  socialInvitation   SocialInvitation?

  @@index([userId, dayKey, status])
  @@index([teamId, dayKey, status])
  @@index([targetType, targetId])
}
```

Allowed statuses:

- `PENDING`
- `SETTLED`
- `EXPIRED`
- `CANCELLED`

Statuses are validated at service level.

### LotteryDraw

一次抽奖主记录。

字段：

```prisma
model LotteryDraw {
  id               String              @id @default(cuid())
  userId           String
  user             User                @relation(fields: [userId], references: [id])
  teamId           String
  team             Team                @relation(fields: [teamId], references: [id])
  drawType         String
  ticketSpent      Int
  coinSpent        Int                 @default(0)
  guaranteeApplied Boolean             @default(false)
  createdAt        DateTime            @default(now())
  results          LotteryDrawResult[]

  @@index([userId, createdAt])
  @@index([teamId, createdAt])
}
```

Allowed draw types:

- `SINGLE`
- `TEN`

### LotteryDrawResult

每一抽的结果。

字段：

```prisma
model LotteryDrawResult {
  id                 String      @id @default(cuid())
  drawId             String
  draw               LotteryDraw @relation(fields: [drawId], references: [id])
  position           Int
  rewardId           String
  rewardTier         String
  rewardKind         String
  rewardSnapshotJson String
  createdAt          DateTime    @default(now())

  @@unique([drawId, position])
}
```

说明：

- `rewardId` 引用本地配置 ID。
- `rewardSnapshotJson` 保存抽中时的快照。

### SocialInvitation

弱社交邀请记录。

字段：

```prisma
model SocialInvitation {
  id                  String         @id @default(cuid())
  teamId              String
  team                Team           @relation(fields: [teamId], references: [id])
  senderUserId        String
  senderUser          User           @relation("SocialInvitationSender", fields: [senderUserId], references: [id])
  recipientUserId     String?
  recipientUser       User?          @relation("SocialInvitationRecipient", fields: [recipientUserId], references: [id])
  invitationType      String
  itemUseRecordId     String         @unique
  itemUseRecord       ItemUseRecord  @relation(fields: [itemUseRecordId], references: [id])
  status              String
  dayKey              String
  message             String
  wechatWebhookSentAt DateTime?
  respondedAt         DateTime?
  expiredAt           DateTime?
  rewardSettledAt     DateTime?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  @@index([teamId, dayKey, status])
  @@index([senderUserId, dayKey])
  @@index([recipientUserId, dayKey, status])
}
```

Allowed statuses:

- `PENDING`
- `RESPONDED`
- `EXPIRED`
- `CANCELLED`

### RealWorldRedemption

真实福利兑换记录。

字段：

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
  cancelledAt       DateTime?
  note              String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([teamId, status, requestedAt])
  @@index([userId, status, requestedAt])
}
```

Allowed statuses:

- `REQUESTED`
- `CONFIRMED`
- `CANCELLED`

## Service Foundation

GM-02 should include minimal service helpers for safe state mutation, but not full business features.

Recommended file:

```text
lib/gamification/db.ts
```

Initial helpers:

- `adjustLotteryTickets`
- `adjustInventoryItem`

Purpose:

- Enforce `delta !== 0`.
- Enforce ticket balance cannot go below `0`.
- Enforce inventory quantity cannot go below `0`.
- Update balance / quantity and write ledger in a single transaction where needed.

GM-02 does not implement daily task assignment, lottery draw, item use, or redemption business flows.

## Testing Strategy

Tests should focus on schema existence and service invariants.

Recommended tests:

```text
__tests__/gamification-db.test.ts
```

Coverage:

- Can create a `DailyTaskAssignment` for a user/team/day/dimension.
- `DailyTaskAssignment` unique constraint rejects duplicate user/day/dimension.
- `adjustLotteryTickets` increments `User.ticketBalance` and writes ledger.
- `adjustLotteryTickets` rejects zero delta.
- `adjustLotteryTickets` rejects negative resulting balance.
- `adjustInventoryItem` creates inventory row when missing.
- `adjustInventoryItem` rejects negative resulting quantity.
- Can create `LotteryDraw` with ordered `LotteryDrawResult` rows.
- Can create `SocialInvitation` linked to `ItemUseRecord`.
- Can create `RealWorldRedemption` and link optional confirmer.

## Acceptance Criteria

GM-02 is complete when:

1. Prisma schema contains all GM-02 models and relations.
2. `User.ticketBalance` exists with default `0`.
3. Schema sync and Prisma generate succeed.
4. Basic database tests pass.
5. Ticket balance + ledger updates are transactionally safe.
6. Inventory quantity updates reject negative results.
7. No pages or HTTP APIs are introduced.

## Follow-Up Stories

GM-02 unlocks:

- `GM-03 牛马补给站 Shell`
- `GM-04 Daily Tasks and Life Ticket`
- `GM-05 Fitness Ticket Hook`
- `GM-06 Lottery V1`
