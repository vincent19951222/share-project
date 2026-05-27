# Supply Task 04：EXP 接入任务、打卡和 State 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 4：EXP Integration In Tasks, Punch, And State。

## 背景

Task 3 已经新增 `lib/gamification/experience.ts`，提供等级快照、幂等 EXP 发放和两个业务 helper。Task 4 把这层服务接入真实业务入口，让完成每日任务和真实健身打卡开始产生 EXP，并让补给站 state API 返回等级/EXP profile。

本任务仍然不替换生产 UI，也不新增 supply production view-model。生产 Dashboard 的视觉接入放到后续任务；本任务只让现有 state snapshot 带上真实 profile 数据。

## 目标

- 每次首次完成每日四维任务时发放 `50 EXP`。
- 重复提交已完成任务不重写完成内容，也不重复发 EXP。
- 每次成功创建真实健身打卡时发放 `100 EXP`。
- 撤销打卡不回滚 EXP，并在代码中明确注释这个第三阶段规则。
- `GamificationStateSnapshot` 新增 `profile`，由 `User.exp` 通过 `getUserLevelSnapshot()` 推导。
- 更新相关测试 fixture，使生产补给站 shell 继续满足新的 snapshot 类型契约。

## 范围

本任务修改：

- `lib/types.ts`
- `lib/gamification/state.ts`
- `lib/gamification/tasks.ts`
- `app/api/board/punch/route.ts`
- `__tests__/gamification-tasks.test.ts`
- `__tests__/board-punch-api.test.ts`
- `__tests__/gamification-state-api.test.ts`
- `__tests__/supply-station-shell.test.tsx`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `lib/gamification/experience.ts` 的 public API
- 商店 catalog、购买服务或购买 API
- Supply UI Lab 页面
- 生产 `SupplyStation` 视觉结构
- 打卡撤销的 EXP 回滚逻辑

## 设计

### 任务完成 EXP

`completeDailyTask()` 当前行为是：

1. 确保今日任务存在。
2. 查询指定维度 assignment。
3. 如果 `completedAt` 为空，则更新 `completedAt` 和 `completionText`。
4. 返回最新 gamification snapshot。

Task 4 保留这个结构，但把首次完成更新和 EXP 发放放进同一个 Prisma transaction：

- 当 `assignment.completedAt` 为空：
  - 更新 assignment。
  - 调用 `grantTaskCompletionExperience({ db: tx })`。
- 当 assignment 已完成：
  - 不更新 assignment。
  - 不调用 EXP helper。

幂等由两层保护：

- 业务层只在 `completedAt` 为空时调用。
- EXP 层用 `sourceType=daily_task_assignment` 和 `sourceId=assignment.id` 防止重复发放。

### 真实打卡 EXP

`POST /api/board/punch` 已经在事务内创建 `PunchRecord`、结算 boost、发券、写 activity 和 season stats。Task 4 在 `punch` 创建后、事务内调用：

```ts
await grantFitnessPunchExperience({
  userId: user.id,
  teamId: user.teamId,
  dayKey: todayDayKey,
  punchRecordId: punch.id,
  db: tx,
});
```

这样 EXP ledger 与真实打卡记录一起提交。重复打卡仍由现有 `PunchRecord` 唯一约束和冲突处理负责。

### 撤销打卡

第三阶段明确不做 EXP 回滚。`DELETE /api/board/punch` 保持现有撤销打卡、券撤销、资产撤销和赛季回滚逻辑，但不删除或反向写入 `ExperienceLedger`。

在 DELETE 的 punch rollback transaction 前加入注释：

```ts
// Phase 3 records EXP as an achievement ledger; undoing a punch does not revoke EXP.
```

### State Profile

`GamificationStateSnapshot` 新增：

```ts
export interface GamificationProfileSnapshot {
  totalExp: number;
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  title: string;
}
```

`buildGamificationStateForUser()` 查询 `User.exp`，并返回：

```ts
profile: getUserLevelSnapshot(user.exp)
```

profile 是只读派生数据，不新增 `level` 字段，也不写入数据库。

## 测试策略

- `__tests__/gamification-tasks.test.ts`
  - 首次完成任务后用户 `exp` 增加 `50`。
  - 写入 `ExperienceLedger`，来源为 `daily_task_assignment + assignment.id`。
  - 重复完成同一任务不增加第二条 ledger，用户 `exp` 保持 `50`。
- `__tests__/board-punch-api.test.ts`
  - POST 创建真实打卡后用户 `exp` 增加 `100`。
  - 写入 `ExperienceLedger`，来源为 `fitness_punch + punch.id`。
  - 测试 reset 清理 `ExperienceLedger` 并重置 `User.exp`。
- `__tests__/gamification-state-api.test.ts`
  - 空 state 返回 Lv.1 profile。
  - 用户 `exp` 更新后 state profile 映射到对应等级、进度和称号。
- `__tests__/supply-station-shell.test.tsx`
  - 本地 `buildSnapshot()` fixture 增加 `profile`，保持类型契约。

## 验收标准

- `completeDailyTask()` 首次完成任务会发 `50 EXP`，重复完成不重复发。
- `POST /api/board/punch` 成功创建真实打卡会发 `100 EXP`。
- `DELETE /api/board/punch` 不回滚 EXP，并有注释说明。
- `/api/gamification/state` 返回 `snapshot.profile`。
- `GamificationStateSnapshot` 类型包含 `profile`。
- focused tests 通过：

```bash
npm test -- __tests__/gamification-experience.test.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
```

## 后续衔接

Task 5 进入商店 catalog，Task 6 进入商店购买服务。后续 Supply Production View-Model 可以直接读取 `GamificationStateSnapshot.profile`，不需要重复实现等级公式。
