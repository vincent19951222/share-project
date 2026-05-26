# Supply Task 14：Task Record Aggregator 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 14：Task Record Aggregator。

## 背景

Task 8 已经在 `SupplyStationProductionSnapshot` 中预留 `taskRecord` 字段，但当前 `lib/gamification/supply-view-model.ts` 只返回最近 7 天日期和空 timeline。Task 10-13 已经补齐 Dashboard、Draw Pool、Backpack 和 Shop 生产面板，后续 Task Record panel 需要真实记录数据。

Task 14 负责新增只读任务记录聚合服务：从现有业务表读取最近 7 天事件，统一映射成 `SupplyTaskRecordSnapshot.timeline`。本任务不新增写业务、不新增 API、不做 UI panel。

## 目标

- 新增 `lib/gamification/task-records.ts`。
- 导出 `buildSupplyTaskRecordSnapshot({ userId, teamId, now })`。
- 生成最近 7 天日期 tabs，第一项为 `getShanghaiDayKey(now)`。
- 聚合最近 7 天真实事件：
  - `DailyTaskAssignment` 完成记录
  - `LotteryDraw`
  - `LotteryTicketLedger`
  - `ExperienceLedger`
  - `ShopPurchase`
  - `ItemUseRecord`
  - `RealWorldRedemption`
  - `SocialInvitation`
  - `SocialInvitationResponse`
- 将聚合结果按 `occurredAt` 倒序排序。
- 在 `buildSupplyStationViewModelForUser()` 中用真实聚合器替换空 timeline placeholder。

## 范围

本任务修改：

- `lib/gamification/task-records.ts`
- `lib/gamification/supply-view-model.ts`
- `__tests__/gamification-task-records.test.ts`
- `__tests__/supply-production-view-model.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `components/gamification/*`
- `app/api/gamification/*`
- `prisma/schema.prisma`
- `components/gamification/ui-lab/*`

## 聚合接口

```ts
export async function buildSupplyTaskRecordSnapshot(input: {
  userId: string;
  teamId: string;
  now?: Date;
}): Promise<SupplyTaskRecordSnapshot>
```

`now` 默认为 `new Date()`。所有日期归属以 `getShanghaiDayKey()` 为准。

## 日期规则

- 输出 7 个日期项。
- 第 1 项为今天：
  - `key`: `getShanghaiDayKey(now)`
  - `label`: `今天`
- 第 2 项为昨天：
  - `label`: `昨天`
- 第 3-7 项：
  - `label`: `{index} 天前`
- `dateLabel` 使用 `MM/DD`。
- `weekday` 使用 `周日` 到 `周六`。

## Timeline 映射规则

每条 timeline 统一输出：

```ts
{
  id: string;
  dayKey: string;
  occurredAt: string;
  title: string;
  subtitle: string;
  category: "task" | "draw" | "ticket" | "exp" | "shop" | "item" | "redemption" | "social";
  statusLabel: string;
}
```

### DailyTaskAssignment

- 只收 `completedAt !== null` 的记录。
- `occurredAt`: `completedAt`
- `title`: `完成任务`
- `subtitle`: 任务卡标题和维度 key。
- `category`: `task`
- `statusLabel`: `已完成`

### LotteryDraw

- 通过 `createdAt` 换算 dayKey，并过滤最近 7 天。
- `title`: `补给抽卡`
- `subtitle`: 单抽/十连、消耗券数、补券银子和奖励数量。
- `category`: `draw`
- `statusLabel`: `已归档`

### LotteryTicketLedger

- 通过 `dayKey` 过滤。
- `title`: `抽奖券收入` 或 `抽奖券支出`
- `subtitle`: `delta`、`balanceAfter` 和 `reason`。
- `category`: `ticket`
- `statusLabel`: `已入账`

### ExperienceLedger

- 通过 `dayKey` 过滤。
- `title`: `获得 EXP`
- `subtitle`: `delta`、`balanceAfter` 和 `reason`。
- `category`: `exp`
- `statusLabel`: `已入账`

### ShopPurchase

- 通过 `dayKey` 过滤。
- `title`: `购买补给`
- `subtitle`: 商品名、数量和总价。
- `category`: `shop`
- `statusLabel`: `status`

### ItemUseRecord

- 通过 `dayKey` 过滤。
- `title`: `使用补给`
- `subtitle`: 道具名和状态。
- `category`: `item`
- `statusLabel`: `status`

### RealWorldRedemption

- 通过 `requestedAt` 换算 dayKey，并过滤最近 7 天。
- `title`: `真实福利兑换`
- `subtitle`: 道具名和状态。
- `category`: `redemption`
- `statusLabel`: `status`

### SocialInvitation / SocialInvitationResponse

- `SocialInvitation` 通过 `dayKey` 过滤，包含当前用户发起、指定给当前用户、或队伍广播的邀请。
- `SocialInvitationResponse` 通过 `dayKey` 过滤，包含当前用户响应的记录，以及当前用户发起邀请收到的响应。
- `title`: `队友雷达`
- `subtitle`: 邀请或响应摘要。
- `category`: `social`
- `statusLabel`: 邀请状态或 `已回应`

## 数据安全和边界

- 聚合器只读数据库，不写入任何业务状态。
- 未知任务卡或未知道具必须有兜底名称，不抛出业务错误。
- 抽奖、兑换等没有 `dayKey` 的表必须先按宽时间范围查询，再用 `getShanghaiDayKey(createdAt/requestedAt)` 精确过滤最近 7 天。
- 当前任务不扩展 `SupplyTaskRecordSnapshot` 类型结构，后续 Task Record panel 先基于 timeline 渲染。

## 测试策略

新增 `__tests__/gamification-task-records.test.ts`：

- 先验证 `lib/gamification/task-records.ts` 不存在导致测试失败。
- seed 后创建 EXP、商店购买、已完成任务、券流水、抽奖、道具使用、真实福利兑换、社交邀请和社交响应记录。
- 调用 `buildSupplyTaskRecordSnapshot({ userId, teamId, now })`。
- 断言输出 7 个日期项，今天为 `2026-05-25`。
- 断言 timeline 包含 `task`、`draw`、`ticket`、`exp`、`shop`、`item`、`redemption`、`social` 类别。
- 断言 timeline 按 `occurredAt` 倒序排列。

更新 `__tests__/supply-production-view-model.test.ts`：

- 在 view-model fixture 中创建一条 EXP 记录。
- 断言 `snapshot.taskRecord.timeline` 包含 `获得 EXP`，证明 view-model 已接入真实聚合器。

## 验收标准

- `npm test -- __tests__/gamification-task-records.test.ts` 通过。
- `npm test -- __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。
- 聚合器不导入 UI Lab mock 数据。
- 生产 UI 入口保持不变。

## 后续衔接

Task 15 会用 `snapshot.taskRecord.dates` 和 `snapshot.taskRecord.timeline` 建立 Production Task Record panel。更细的抽卡记录、兑换记录和队友雷达专用视图如果需要结构化字段，应在 Task 15 的 spec 中单独扩展类型。
