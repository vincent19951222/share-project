# GM-08 Today-Effective Item Use Design

> 为“牛马补给站”开放第一版道具使用能力：用户可以从背包手动使用今日生效类道具、任务换班券和健身请假券。GM-08 负责创建 `ItemUseRecord`、处理库存预占或扣减、展示今日效果，并为 GM-09 的打卡收益结算提供稳定输入；不在本 story 里真正放大银子或赛季贡献。

## 背景

GM-07 让用户能看见背包，但背包还只是资产展示。GM-08 让一部分道具变成可操作能力。

关键链路：

```text
背包道具 -> POST /api/gamification/items/use -> ItemUseRecord -> 今日效果 -> 后续打卡结算或立即动作
```

这里必须谨慎拆边界。暴击类道具会影响个人资产和赛季贡献，但真实经济结算需要改造现有健身打卡结算。为了避免 GM-08 过大，本 story 只负责“使用、预占、绑定目标、过期”，GM-09 再负责“把增益应用到 PunchRecord / User.coins / SeasonMemberStat”。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/specs/2026-04-25-gm-05-fitness-ticket-hook-design.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 用户可以在背包中手动使用已支持的道具。
2. 今日生效类暴击道具使用后绑定 Asia/Shanghai 当天。
3. 用户当天尚未真实健身时，暴击道具进入 `PENDING`，等待真实健身打卡。
4. 用户当天已经真实健身时，暴击道具绑定今日 `PunchRecord`，等待 GM-09 进行收益补结算。
5. 暴击道具在真正结算成功前不扣库存。
6. 如果当天最终没有真实健身，过期的暴击道具变成 `EXPIRED`，不扣库存。
7. `任务换班券` 使用后立即换同维度任务，成功后扣库存并记为 `SETTLED`。
8. `健身请假券` 使用后保护连续性和下一次真实健身奖励档位，但不创建健身打卡，不发券，不发银子，不推进赛季。
9. 使用后返回最新 `GamificationStateSnapshot`，让供应站页面刷新库存、预占和今日效果。

## 非目标

- 不实现暴击对 `User.coins`、`PunchRecord.assetAwarded` 或 `SeasonMemberStat.seasonIncome` 的真实加成。
- 不实现赛季贡献翻倍结算。
- 不实现真实福利兑换申请。
- 不实现弱社交邀请和企业微信。
- 不实现抽奖保底券和购券折扣券的实际效果。
- 不实现趣味收藏展示装备。
- 不新增独立背包页面。
- 不做管理员后台。

## 支持的道具范围

GM-08 只支持三类效果。

### 1. Fitness Boost

支持以下 `ItemEffect`：

- `fitness_coin_multiplier`
- `fitness_season_multiplier`
- `fitness_coin_and_season_multiplier`

行为：

- 创建 `ItemUseRecord`。
- 状态为 `PENDING`。
- 如果当天已有真实 `PunchRecord`，写入 `targetType = "FITNESS_PUNCH"` 和 `targetId = PunchRecord.id`。
- 如果当天还没有真实健身，`targetType` 和 `targetId` 为空，等待打卡时绑定。
- 不扣库存。
- GM-09 结算成功时再扣库存并改为 `SETTLED`。

### 2. Task Reroll

支持：

- `task_reroll`

行为：

- 请求必须带 `target.dimensionKey`。
- 目标维度当天必须已有任务。
- 已完成任务不能被换掉。
- 换成同维度另一张任务卡。
- 成功后扣减 `InventoryItem.quantity`。
- 创建 `ItemUseRecord`，状态为 `SETTLED`。
- `targetType = "DAILY_TASK_ASSIGNMENT"`，`targetId = DailyTaskAssignment.id`。

说明：

- GM-04 的免费 reroll 仍然存在。
- 道具 reroll 可以作为额外 reroll 使用。
- `DailyTaskAssignment.rerollCount` 可以继续递增，表示当天总换班次数。

### 3. Leave Protection

支持：

- `leave_protection`

行为：

- 当天不能已经真实健身。
- 用户必须存在一个可保护的连续状态：上一天必须是真实健身日。
- 第一版不允许连续使用两天请假券，避免无限保连续；如果上一天也是请假保护，今天不能继续请假保护。
- 成功后扣减 `InventoryItem.quantity`。
- 创建 `ItemUseRecord`，状态为 `SETTLED`。
- `targetType = "LEAVE_PROTECTION"`，`targetId = null`。
- 不创建 `PunchRecord`。
- 不发健身抽奖券。
- 不发银子。
- 不推进赛季。
- 不触发任何暴击。

对下一次真实健身的影响：

- 请假日只保护连续性，不增加 streak。
- 下一次真实健身按“跳过请假日但不涨档”的方式计算奖励。
- 示例：用户昨天真实健身后下一次应得 `40` 银子，今天使用请假券，明天真实健身仍得 `40` 银子，而不是重置为 `10`，也不是涨到 `50`。

## 暂不支持的道具

这些道具如果调用 `items/use`，GM-08 返回 `409` 和明确错误：

| effect type | 原因 |
| --- | --- |
| `social_invitation` | GM-12 接企业微信和弱社交响应 |
| `real_world_redemption` | GM-10 接管理员确认和兑换取消 |
| `lottery_guarantee` | 需要改造抽奖服务 |
| `ticket_discount` | 需要改造十连补券计价 |
| `dimension_coin_bonus` | 四维任务当前没有独立银子结算 |
| `cosmetic` | 需要单独展示装备规则 |

## 库存规则

### 预占库存

暴击类道具使用后进入 `PENDING`，不立即扣库存，但需要预占。

可用数量计算：

```text
availableQuantity = InventoryItem.quantity - same-item active pending reservations
```

active pending reservation 指：

- 同一用户。
- 同一 `itemId`。
- `status = "PENDING"`。
- `dayKey >= todayDayKey` 对第一版来说只会是今天，因为旧记录会被懒过期。

创建 `PENDING` 前必须保证：

```text
availableQuantity >= 1
```

### 立即扣库存

以下道具成功使用后立即扣库存：

- `task_reroll`
- `leave_protection`

原因：

- 它们的效果在 GM-08 内已经完成。
- 不需要等待 GM-09 的经济结算。

### 过期

GM-08 使用懒过期：

- 在 `POST /api/gamification/items/use` 前先过期历史 `PENDING`。
- 在 `GET /api/gamification/state` 读取前也可以过期历史 `PENDING`。
- 过期条件：`dayKey < todayDayKey` 且 `status = "PENDING"`。
- 过期后状态改为 `EXPIRED`。
- 不扣库存。

## 叠加与频率限制

### 同日暴击限制

同一天同一用户只能有一个 fitness boost 处于：

- `PENDING`
- `SETTLED`

这意味着：

- 小暴击和强暴击不能影响同一天。
- 两张强暴击也不能影响同一天。
- 已经有待结算暴击时，不能再用另一张暴击。

### 强暴击周限制

强暴击每人每周最多使用 `1` 次。

强暴击包括：

- `fitness_coin_multiplier` 且 `multiplier = 2`
- `fitness_season_multiplier`
- `fitness_coin_and_season_multiplier`

周定义：

- 使用 Asia/Shanghai 日期。
- 周一到周日。

统计状态：

- `PENDING`
- `SETTLED`

`EXPIRED` 和 `CANCELLED` 不占周限制。

### 道具配置限制

GM-08 还需要读取 `ItemDefinition` 上的：

- `maxUsePerUserPerDay`
- `maxUsePerUserPerWeek`
- `maxUsePerTeamPerDay`
- `stackable`
- `requiresAdminConfirmation`

本 story 只对已支持道具执行这些限制。未支持道具直接拒绝。

## API 设计

新增接口：

```text
POST /api/gamification/items/use
```

Body:

```ts
{
  itemId: string;
  target?: {
    dimensionKey?: "movement" | "hydration" | "social" | "learning";
  };
}
```

成功返回：

```ts
{
  snapshot: GamificationStateSnapshot;
  itemUse: GamificationItemUseResult;
}
```

`GamificationItemUseResult`：

```ts
interface GamificationItemUseResult {
  id: string;
  itemId: string;
  status: "PENDING" | "SETTLED";
  targetType: string | null;
  targetId: string | null;
  inventoryConsumed: boolean;
  message: string;
}
```

错误规则：

| 场景 | HTTP |
| --- | ---: |
| 未登录 | 401 |
| 用户不存在 | 401 |
| 参数错误 | 400 |
| 道具不存在或配置禁用 | 404 |
| 库存不足 | 409 |
| 道具效果暂不支持 | 409 |
| 超过每日或每周限制 | 409 |
| 目标任务无效 | 409 |
| 当天已真实健身却使用请假券 | 409 |

## Snapshot 扩展

GM-08 在 GM-07 背包快照基础上增加可用数量和使用状态。

```ts
interface GamificationBackpackItemSnapshot {
  itemId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  useEnabled: boolean;
  useDisabledReason: string | null;
}
```

说明：

- `quantity` 是永久库存总数。
- `reservedQuantity` 是今日已预占但未结算数量。
- `availableQuantity` 是当前还能使用的数量。
- `useEnabled` 只对 GM-08 支持的道具为 true。
- 未支持道具展示说明，但按钮禁用。

今日效果区继续使用 GM-07 的 `todayEffects`，但 GM-08 需要显示：

- 今日待结算暴击。
- 已完成任务换班。
- 已使用请假保护。
- 过期记录一般不在主界面展示。

## 与健身打卡的衔接

GM-08 需要在真实健身打卡成功后，把当天 `PENDING` fitness boost 绑定到新 `PunchRecord`：

```text
ItemUseRecord.status = PENDING
targetType = FITNESS_PUNCH
targetId = PunchRecord.id
```

GM-08 不把它改为 `SETTLED`，因为真实收益加成由 GM-09 完成。

这能保证：

- 先用道具再健身：道具能找到目标打卡。
- 健身后再用道具：道具能立即绑定今日打卡。
- GM-09 可以统一处理所有已绑定或待绑定的 boost。

## 与请假券的衔接

请假券不创建 `PunchRecord`，但下一次真实打卡计算 streak 时需要识别上一天的 `leave_protection`。

GM-08 建议新增 helper：

```ts
getNextPunchStreakWithLeaveProtection(...)
```

规则：

- 如果昨天是真实健身，按现有逻辑 streak + 1。
- 如果昨天是有效请假保护，且上一次真实健身是前天，按 `currentStreak + 1`。
- 如果昨天是有效请假保护，但前天不是真实健身，则重置为 `1`。
- 第一版不允许连续两天请假保护。

奖励档位与 streak 一致，但请假日不单独增加 streak。

## 前端行为

背包详情区增加使用按钮：

- `availableQuantity <= 0` 时禁用。
- 未支持道具禁用，并显示原因。
- 支持道具点击后调用 `POST /api/gamification/items/use`。
- `task_reroll_coupon` 需要先选择目标维度。
- 使用成功后刷新 snapshot。
- 成功消息展示在背包区。
- 错误消息展示在背包区。

GM-08 不需要复杂弹窗。第一版可以用轻量确认区域：

- 暴击类：按钮文案 `今日使用`。
- 任务换班券：维度选择 + `换这个任务`。
- 请假券：按钮文案 `今天请假，不断联`。

## 测试策略

### 服务层测试

覆盖：

- 使用小暴击创建 `PENDING`，不扣库存。
- 当天已有真实健身时，使用小暴击绑定 `FITNESS_PUNCH`。
- 已有待结算暴击时，不能再使用另一张暴击。
- 强暴击每周只能使用一次。
- 历史 `PENDING` 会变为 `EXPIRED`，不扣库存。
- 任务换班券成功换任务、扣库存、创建 `SETTLED`。
- 已完成任务不能使用任务换班券。
- 请假券成功创建 `SETTLED`，扣库存，不创建 `PunchRecord`。
- 当天已真实健身时不能使用请假券。
- 同一天不能重复使用健身请假券。
- 请假券不发健身券、银子或赛季贡献。

### API 测试

覆盖：

- 未登录 401。
- 参数错误 400。
- 库存不足 409。
- 暂不支持道具 409。
- 小暴击使用成功。
- 任务换班券使用成功。
- 请假券使用成功。

### 前端测试

覆盖：

- 支持道具展示可用按钮。
- 未支持道具按钮禁用并展示原因。
- 使用成功后刷新 snapshot 和今日效果。
- 使用失败展示服务端错误。
- 任务换班券可以选择维度。

## Acceptance Criteria

GM-08 完成时应满足：

1. `POST /api/gamification/items/use` 可用。
2. 支持 fitness boost、任务换班券和健身请假券。
3. fitness boost 使用后创建 `PENDING`，不扣库存。
4. 如果当天已有真实健身，fitness boost 会绑定今日 `PunchRecord`，等待 GM-09 结算。
5. 如果用户先用 boost 后健身，真实健身成功后会绑定当天 `PunchRecord`。
6. 小暴击和强暴击不能同时影响同一天。
7. 强暴击每人每周最多使用 `1` 次。
8. 过期的 `PENDING` boost 变为 `EXPIRED`，不扣库存。
9. 任务换班券成功后扣库存、换任务、记录 `SETTLED`。
10. 健身请假券成功后扣库存、记录 `SETTLED`，但不创建健身打卡、不发券、不发银子、不推进赛季。
11. 背包 UI 展示可用数量、预占数量、使用按钮和今日效果。
12. GM-08 不实现真实福利兑换、弱社交邀请、企业微信或暴击经济结算。

## Follow-Up Stories

GM-08 解锁：

- `GM-09 Boost Settlement Integration`
- `GM-10 Real-World Redemption`
- `GM-12 Weak Social Invitations V1`
