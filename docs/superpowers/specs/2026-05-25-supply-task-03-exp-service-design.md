# Supply Task 03：EXP Service 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 3：EXP Service。

## 背景

Task 2 已经新增 `User.exp` 和 `ExperienceLedger`，并让 seed 能稳定清理这些数据。Task 3 在 schema 之上补一层小而稳定的 EXP 服务，供后续任务完成、真实打卡、生产 view-model 和任务记录聚合复用。

本任务只实现服务，不接入任务完成、打卡 API 或生产 UI。任务完成和打卡发 EXP 放到后续 Task 4。

## 目标

- 新增 `lib/gamification/experience.ts`。
- 提供固定 EXP 规则常量：
  - 每个每日四维任务完成：`50 EXP`
  - 每次真实健身打卡：`100 EXP`
  - 每级 EXP 容量：`1000 EXP`
- 提供等级快照推导函数，让后续 Dashboard 和 state/view-model 复用同一套公式。
- 提供通用 `adjustExperience()`，在事务内更新 `User.exp` 并写入 `ExperienceLedger`。
- 提供 `grantTaskCompletionExperience()` 和 `grantFitnessPunchExperience()` 两个业务 helper。
- 使用 `ExperienceLedger` 的 `@@unique([sourceType, sourceId])` 保证幂等，同一来源重复调用不重复加 EXP。

## 范围

本任务修改：

- `lib/gamification/experience.ts`
- `__tests__/gamification-experience.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `lib/gamification/tasks.ts`
- `app/api/board/punch/route.ts`
- `lib/gamification/state.ts`
- `lib/types.ts`
- 任何 UI Lab 或生产 UI 组件

## 服务 API

### 常量

```ts
export const TASK_COMPLETION_EXP = 50;
export const FITNESS_PUNCH_EXP = 100;
export const LEVEL_EXP_SIZE = 1000;
```

### `getUserLevelSnapshot(totalExp)`

规则：

```text
normalizedExp = max(0, floor(totalExp))
level = floor(normalizedExp / 1000) + 1
currentLevelExp = normalizedExp % 1000
nextLevelExp = 1000
```

称号：

- Lv.1-9：`自律牛马`
- Lv.10-24：`稳定脱脂牛马`
- Lv.25+：`卷王预备役`

返回字段：

- `totalExp`
- `level`
- `currentLevelExp`
- `nextLevelExp`
- `title`

### `adjustExperience(input)`

输入：

- `userId`
- `teamId`
- `dayKey`
- `delta`
- `reason`
- `sourceType`
- `sourceId`
- `metadata?`
- `db?`

行为：

1. 拒绝 `delta <= 0`，抛出 `ExperienceError`。
2. 默认使用全局 `prisma`，也支持传入 `Prisma.TransactionClient`。
3. 在事务内读取当前 `User.exp`。
4. 将 `User.exp` 增加 `delta`。
5. 创建 `ExperienceLedger`，记录 `balanceAfter`、来源和可选 metadata。
6. 如果因为 `sourceType + sourceId` 唯一键冲突，则读取既有 ledger，返回 `{ applied: false }`，且不再次增加 `User.exp`。

幂等冲突只处理 Prisma `P2002`。其他错误原样抛出。

### 业务 helper

`grantTaskCompletionExperience()`：

- `delta`: `TASK_COMPLETION_EXP`
- `reason`: `DAILY_TASK_COMPLETION_EXP`
- `sourceType`: `daily_task_assignment`
- `sourceId`: `assignmentId`

`grantFitnessPunchExperience()`：

- `delta`: `FITNESS_PUNCH_EXP`
- `reason`: `FITNESS_PUNCH_EXP`
- `sourceType`: `fitness_punch`
- `sourceId`: `punchRecordId`

## 幂等与事务边界

如果调用方没有传 `db`，服务自己开启事务，保证用户 EXP 和 ledger 同步写入。

如果调用方传入事务 client，服务在调用方事务内执行，不额外开启嵌套事务。这样 Task 4 可以在任务完成或打卡写入的同一事务里发 EXP。

重复来源调用的预期结果：

- 第一次调用：`applied: true`，用户 EXP 增加，写入 ledger。
- 第二次调用：`applied: false`，用户 EXP 不变，返回第一次创建的 ledger。

## 测试策略

新增 `__tests__/gamification-experience.test.ts`：

- 验证等级快照：
  - `0 EXP -> Lv.1 / 自律牛马`
  - `10240 EXP -> Lv.11 / 稳定脱脂牛马`
  - `25000 EXP -> Lv.26 / 卷王预备役`
- 验证 `adjustExperience()` 能增加 `User.exp` 并写入一条 ledger。
- 验证相同 `sourceType + sourceId` 重复调用只发一次 EXP。
- 验证每日任务 helper 使用正确的 `reason/sourceType/sourceId`。
- 验证 `delta <= 0` 会抛出可识别错误。

## 验收标准

- `lib/gamification/experience.ts` 导出约定常量、等级快照函数和三个发放函数。
- EXP 调整写入 `User.exp` 和 `ExperienceLedger.balanceAfter`。
- 来源幂等不重复增加 `User.exp`。
- 服务支持全局 Prisma client 和外部事务 client。
- `npm test -- __tests__/gamification-experience.test.ts` 通过。

## 后续衔接

Task 4 将在 `completeDailyTask()` 成功完成新任务时调用 `grantTaskCompletionExperience()`，并在 `/api/board/punch` 成功创建真实打卡时调用 `grantFitnessPunchExperience()`。Task 4 还会把等级快照接入 `GamificationStateSnapshot.profile`，供后续生产 Dashboard view-model 使用。
