# Supply Task 01：发布护栏与第三阶段契约设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 1：Release Guardrails And Phase-3 Contracts。

## 背景

牛马补给站第三阶段会把已经完成静态复刻和组件化收口的 Supply UI Lab 接入生产业务。这个阶段会新增真实 EXP、等级、商店购买和任务记录聚合，也会触碰生产 SQLite schema。

Task 1 不是开始改 schema，也不是开始替换 UI。它的作用是先把发布护栏、阶段决策和验收 SQL 固化成文档和契约测试，避免后续任务在数据库字段、生产发布顺序、seed 使用和验收口径上各做各的。

## 目标

为第三阶段建立可执行、可测试的发布与验收契约：

- 明确第三阶段产品决策：`team-goal` 不做，保留 `User.coins`，UI 展示“银子”，EXP/等级和商店购买做真实业务。
- 明确第三阶段数据库发布护栏：生产库先备份，再执行 Prisma generate、schema sync、build 和 PM2 重启。
- 明确第三阶段验收 SQL：覆盖 EXP、EXP ledger、商店购买流水，以及现有银子、券、抽奖、兑换检查。
- 用一个文档契约测试保护这些关键字符串，防止后续改文档时把发布护栏删掉。

## 范围

Task 1 的执行范围只包含下面文件：

- `docs/database-workflow.md`
- `docs/production-release-checklist.md`
- `docs/gamification-acceptance-checklist.md`
- `__tests__/supply-production-plan-contract.test.ts`

本任务允许修改文档和新增契约测试，不允许修改生产业务代码、Prisma schema、seed 脚本、API Routes 或生产 UI。

## 已锁定决策

- `team-goal` 不进入第三阶段。
- 数据库字段继续使用 `User.coins`，本阶段不重命名为 `gp`。
- UI 文案继续把 `coins` 展示为“银子”。
- `User.exp` 和 `ExperienceLedger` 是第三阶段真实等级和 EXP 的最小模型。
- `ShopPurchase` 是第三阶段真实商店购买和限购审计的最小模型。
- 背包容量第三阶段固定展示为 `60`，不新增容量模型。
- UI Lab routes 保留为设计和回归参考，不作为生产入口。

## 需要建立的契约

### 1. 数据库流程文档契约

`docs/database-workflow.md` 需要补充第三阶段专项说明：

- 第三阶段会新增 `User.exp`、`ExperienceLedger`、`ShopPurchase`。
- 生产 SQLite 在 schema sync 前必须备份。
- 当前项目生产发布约定使用 `npx prisma db push` 同步 SQLite schema。
- 仍需执行 `npx prisma generate`，确保 Prisma Client 与 schema 对齐。
- 生产环境不要执行 `npx tsx prisma/seed.ts`。
- 生产环境不要执行 `npx tsx scripts/fill-gamification-test-data.ts`。

这个文档当前有较早的 migration 叙述。Task 1 不需要重写整篇数据库方法论，但必须在第三阶段专项段落中明确当前项目实际发布口径，以免后续任务误按旧叙述发布。

### 2. 生产发布清单契约

`docs/production-release-checklist.md` 需要补充第三阶段专项 checklist：

- 生产代码目录：`E:\Projects\share-project`
- 生产数据库：`E:\data\share-project\prod.db`
- 生产环境变量：`DATABASE_URL="file:/E:/data/share-project/prod.db"`
- 发布前备份 `prod.db`。
- schema 变更发布顺序包含：
  - `npm install`
  - `npx prisma generate`
  - `npx prisma db push`
  - `npm run build`
  - `pm2 restart share-project --update-env`
- 生产不运行 seed 和验收填充脚本。
- 发布后 smoke 需要覆盖补给站加载、等级/EXP、商店购买、背包库存、兑换队列和管理员处理。

### 3. 验收清单契约

`docs/gamification-acceptance-checklist.md` 需要补充第三阶段验收点：

- 用户能看到真实等级、EXP 和“银子”。
- 完成任务或真实打卡后，`User.exp` 与 `ExperienceLedger.delta` 汇总一致。
- 商店购买会扣 `User.coins`、增加 `InventoryItem.quantity`、写入 `ShopPurchase`。
- SQL 检查需要出现 `userExp`、`ledgerExp`、`shopPurchases` 这三个别名。

建议新增只读 SQL：

```sql
select
  u.username,
  u.exp as userExp,
  coalesce((select sum(delta) from ExperienceLedger e where e.userId = u.id), 0) as ledgerExp,
  coalesce((select count(*) from ShopPurchase s where s.userId = u.id), 0) as shopPurchases
from User u
order by u.createdAt;
```

通过口径：

- `userExp = ledgerExp`。
- 发生商店购买后，`shopPurchases` 增加。
- 购买后的银子减少和库存增加能从 `ShopPurchase` 与 `InventoryItem` 解释。

### 4. 契约测试

新增 `__tests__/supply-production-plan-contract.test.ts`。测试只读取文档，不连接数据库，不改动数据。

测试至少覆盖：

- 总 spec 中的阶段决策没有被删除。
- 数据库流程文档包含 `User.exp`、`ExperienceLedger`、`ShopPurchase`、备份生产 SQLite 和 `npx prisma db push`。
- 发布清单包含 Windows 生产路径、`npx prisma generate`、`npx prisma db push`、`pm2 restart share-project --update-env` 和生产 seed 禁令。
- 验收清单包含 `ExperienceLedger`、`ShopPurchase`、`userExp`、`ledgerExp`、`shopPurchases`。

## 非目标

- 不修改 `prisma/schema.prisma`。
- 不生成或推送数据库 schema。
- 不运行生产数据库命令。
- 不新增 EXP 或商店服务。
- 不接入 API Routes。
- 不替换 `components/gamification/SupplyStation.tsx`。
- 不更新 seed 数据。

## 验收标准

- Task 1 执行后，契约测试 `npm test -- __tests__/supply-production-plan-contract.test.ts` 通过。
- 三份目标文档都明确第三阶段新增的 `User.exp`、`ExperienceLedger`、`ShopPurchase`。
- 生产发布清单明确 Windows 生产路径、生产库备份、`npx prisma db push`、`npx prisma generate`、`npm run build` 和 `pm2 restart share-project --update-env`。
- 验收清单包含 EXP 与商店购买只读 SQL。
- 文档没有把 `coins` 改名为 `gp`，且明确 UI 使用“银子”。
- 文档没有把 `team-goal` 纳入第三阶段执行范围。

## 后续衔接

Task 1 完成后，Task 2 才开始修改 Prisma schema，引入 `User.exp`、`ExperienceLedger` 和 `ShopPurchase`。Task 1 的契约测试会继续保护第三阶段发布护栏，避免后续 schema/API/UI 任务漏掉生产发布和验收要求。
