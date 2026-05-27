# Supply Task 02：EXP 与商店购买 Schema 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 2：Prisma Schema For EXP And Shop Purchases。

## 背景

Task 1 已经把牛马补给站第三阶段的发布护栏和验收 SQL 写入文档。Task 2 开始进入真实数据库结构，但仍然只做 schema 层：为后续 EXP 服务、商店购买服务、任务记录聚合和生产 view-model 提供稳定的数据表与 Prisma Client 类型。

当前生产代码已经有 `User.coins`、`User.ticketBalance`、`InventoryItem`、`DailyTaskAssignment`、`LotteryTicketLedger`、`LotteryDraw`、`ItemUseRecord`、`RealWorldRedemption` 和弱社交表。第三阶段需要补齐的是真实等级/EXP 的最小模型，以及商店购买审计流水。

## 目标

- 在 `User` 上新增 `exp Int @default(0)`，等级后续由 EXP 推导，不新增等级字段。
- 新增 `ExperienceLedger`，记录 EXP 来源、变动值、变动后余额和来源幂等键。
- 新增 `ShopPurchase`，记录商店购买商品、数量、单价、总价、日期/周限购统计键和状态。
- 在 `Team` 与 `User` 上补齐 Prisma relation，方便后续服务查询。
- 更新 seed 清理逻辑，保证本地 fixture 每次重置后 EXP、EXP ledger 和购买流水都是确定状态。
- 新增 schema 级 Vitest，验证 Prisma Client 能读写新字段/新表，并验证 `ExperienceLedger` 来源幂等唯一约束。

## 范围

本任务只修改：

- `prisma/schema.prisma`
- `lib/db-seed.ts`
- `__tests__/seed.test.ts`
- `__tests__/gamification-experience-schema.test.ts`
- `__tests__/gamification-shop-schema.test.ts`
- Prisma generate 产物 `lib/generated/prisma/*`，本仓库通过 `.gitignore` 忽略，只做本地刷新
- 本地开发 SQLite schema，通过 `npx prisma db push` 更新；`*.db` 文件不进 git

本任务不实现 EXP 发放服务、任务完成发 EXP、真实打卡发 EXP、商店购买业务 API、限购规则、任务记录聚合或生产 UI。

## 数据模型

### User.exp

`User.exp` 保存用户当前 EXP 余额，默认值为 `0`。本阶段不保存 `level`，后续服务使用固定公式推导：

```text
level = floor(exp / 1000) + 1
currentLevelExp = exp % 1000
nextLevelExp = 1000
```

### ExperienceLedger

`ExperienceLedger` 是 EXP 变动流水。它必须能支持：

- 用户维度查询：`@@index([userId, createdAt])`
- 团队当天运营核查：`@@index([teamId, dayKey, createdAt])`
- 来源幂等：`@@unique([sourceType, sourceId])`

字段：

- `id String @id @default(cuid())`
- `userId String`
- `teamId String`
- `dayKey String`
- `delta Int`
- `balanceAfter Int`
- `reason String`
- `sourceType String`
- `sourceId String`
- `metadataJson String?`
- `createdAt DateTime @default(now())`

### ShopPurchase

`ShopPurchase` 是商店购买审计流水。它必须能支持：

- 每日限购统计：`@@index([userId, dayKey, itemId])`
- 每周限购统计：`@@index([userId, weekKey, itemId])`
- 团队运营核查：`@@index([teamId, createdAt])`

字段：

- `id String @id @default(cuid())`
- `userId String`
- `teamId String`
- `itemId String`
- `quantity Int`
- `unitPriceCoins Int`
- `totalPriceCoins Int`
- `dayKey String`
- `weekKey String`
- `status String`
- `metadataJson String?`
- `createdAt DateTime @default(now())`

## Seed 约定

`seedDatabase()` 继续拥有固定本地 roster。每次运行时：

- 删除 seeded team 的 `ShopPurchase`。
- 删除 seeded team 的 `ExperienceLedger`。
- upsert seeded users 时把 `exp` 重置为 `0`。
- 最后的 seeded user 批量重置也把 `exp` 重置为 `0`。
- 删除 extra users 前先删除这些用户关联的 `ShopPurchase` 和 `ExperienceLedger`。
- `__tests__/seed.test.ts` 的 fixture 清理也先删除 `ShopPurchase` 和 `ExperienceLedger`，再删除用户和团队。

这样后续服务测试可以自由创建 EXP ledger 和购买流水，不会被上一次测试运行污染。

## 测试策略

新增两个 focused schema tests：

- `__tests__/gamification-experience-schema.test.ts`
  - 调用 `seedDatabase()`。
  - 更新 seeded user 的 `exp`。
  - 创建一条 `ExperienceLedger`。
  - 再用相同 `sourceType + sourceId` 创建第二条，断言抛错。
- `__tests__/gamification-shop-schema.test.ts`
  - 调用 `seedDatabase()`。
  - 创建一条 `ShopPurchase`。
  - 断言 `itemId`、`quantity`、`unitPriceCoins` 和 `totalPriceCoins` 可读。

执行顺序：

1. 先写测试并运行，确认在 schema 变更前失败。
2. 修改 Prisma schema 和 seed。
3. 运行 `npx prisma generate`。
4. 运行 `npx prisma db push` 更新本地开发库。
5. 跑 focused tests 和 `__tests__/seed.test.ts`。

## 验收标准

- `prisma/schema.prisma` 包含 `User.exp`、`ExperienceLedger`、`ShopPurchase` 及必要 relation/index/unique。
- `lib/db-seed.ts` 会清理新表，并把 seeded users 的 `exp` 重置为 `0`。
- `__tests__/seed.test.ts` 的测试级 fixture cleanup 会清理新表，避免新外键阻止删除测试用户。
- `npx prisma generate` 成功，生成的 Prisma Client 暴露 `experienceLedger` 和 `shopPurchase` delegate。
- `npx prisma db push` 成功更新本地开发 SQLite schema。
- `lib/generated/prisma/*` 和 SQLite `*.db` 按仓库约定保持 ignored，不强制加入 git。
- `npm test -- __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts __tests__/seed.test.ts` 通过。

## 后续衔接

Task 2 完成后，Task 3 才开始实现 `lib/gamification/experience.ts`。Task 2 不直接发放 EXP，也不直接购买商品，只提供后续服务所需的持久化结构。
