# GM-05 Fitness Ticket Hook Design

> 把真实健身打卡接入抽奖券经济：用户当天完成真实健身打卡后获得 `1` 张健身券；撤销打卡时，如果还能安全扣回这张券，则同步回滚；如果券余额已经不足以扣回，则阻止撤销并提示用户。

## 背景

GM-04 已经让四维任务可以产出 `1` 张生活券。GM-05 负责把主线健身打卡接入同一套抽奖券流水，形成每日最多 `2` 张免费券的闭环：

```text
真实健身打卡 -> 健身券 +1
四维任务全成 -> 生活券 +1
```

这个 story 只改造现有健身打卡与撤销流程，不实现抽奖、不实现背包、不实现请假券。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-03-supply-station-shell-design.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 真实健身打卡成功后，用户获得 `1` 张抽奖券。
2. 发券必须写入 `LotteryTicketLedger`，并更新 `User.ticketBalance`。
3. 同一天真实健身打卡最多产生 `1` 张健身券。
4. 撤销当天健身打卡时，如果券还能扣回，则同步写入撤销流水。
5. 如果券已经花到无法扣回，则阻止撤销，不补偿、不负债、不回滚抽奖。
6. 打卡和发券、撤销和扣券必须保持事务一致。

## 非目标

- 不实现抽奖。
- 不实现十连抽补券。
- 不实现背包页面。
- 不实现道具使用。
- 不实现健身请假券。
- 不改变四维任务生活券逻辑。
- 不发放额外银子。
- 不改变赛季贡献规则。
- 不发送企业微信。
- 不写团队动态。

## 核心规则

### 发券条件

只有真实健身打卡发券。

GM-05 的真实健身打卡定义：

- `PunchRecord.punched === true`
- `PunchRecord.punchType === "default"`
- 当天打卡 API 成功创建 `PunchRecord`

未来 `健身请假券` 不应发健身券。GM-05 不实现请假券，但要在规则中明确：只有 `punchType === "default"` 的真实打卡发券。

### 发券流水

健身券发放使用：

```text
reason: FITNESS_PUNCH_GRANTED
sourceType: fitness_punch
sourceId: <punchRecord.id>
delta: +1
```

`metadataJson` 建议保存：

```json
{
  "punchRecordId": "<punchRecord.id>",
  "dayKey": "2026-04-25",
  "punchType": "default"
}
```

### 撤销流水

健身券撤销使用：

```text
reason: FITNESS_PUNCH_REVOKED
sourceType: fitness_punch_reversal
sourceId: <punchRecord.id>
delta: -1
```

`metadataJson` 建议保存：

```json
{
  "punchRecordId": "<punchRecord.id>",
  "grantLedgerId": "<FITNESS_PUNCH_GRANTED ledger id>",
  "dayKey": "2026-04-25"
}
```

### 撤销判定

抽奖券第一版不做“单张券实体”，只做余额和流水。因此 GM-05 使用余额池规则：

- 如果当前存在该 `PunchRecord` 对应的 `FITNESS_PUNCH_GRANTED` 流水，并且尚无对应 `FITNESS_PUNCH_REVOKED` 流水：
- 如果 `User.ticketBalance >= 1`，允许撤销，扣回 `1` 张券。
- 如果 `User.ticketBalance < 1`，视为健身券已经无法安全扣回，阻止撤销。

阻止撤销时：

- `PunchRecord` 保留。
- 个人银子不回滚。
- 连签不回滚。
- 赛季进度不回滚。
- 不新增负数抽奖券。
- 不产生补偿。
- 不回滚已经完成的抽奖结果。

用户提示：

```text
今天打卡送出的健身券已经花掉了，不能撤销打卡。
```

### 历史兼容

如果存在历史 `PunchRecord`，但没有 `FITNESS_PUNCH_GRANTED` 流水：

- 允许按旧逻辑撤销。
- 不扣抽奖券。
- 不补建历史发券流水。

原因：

- 避免上线 GM-05 后旧数据被强行解释。
- 保持 story 独立，不引入迁移补偿逻辑。

## 数据一致性

### 打卡事务

`POST /api/board/punch` 中，以下操作必须在同一事务内完成：

1. 创建 `PunchRecord`。
2. 增加用户银子、连签、`lastPunchDayKey`。
3. 推进赛季统计。
4. 增加 `User.ticketBalance`。
5. 创建 `FITNESS_PUNCH_GRANTED` ledger。
6. 创建现有打卡动态。

如果发券失败，整次打卡失败并回滚。

### 撤销事务

`DELETE /api/board/punch` 中，以下操作必须在同一事务内完成：

1. 找到当天 `PunchRecord`。
2. 检查是否存在对应健身券 grant ledger。
3. 如果需要扣券，先确认 `User.ticketBalance >= 1`。
4. 创建 `FITNESS_PUNCH_REVOKED` ledger。
5. 扣减 `User.ticketBalance`。
6. 删除 `PunchRecord`。
7. 回滚用户银子、连签、赛季统计。
8. 创建现有撤销动态。

如果第 3 步失败，事务终止，打卡记录保持不变。

## API 行为

GM-05 不新增 HTTP endpoint。

改造现有接口：

```text
POST /api/board/punch
DELETE /api/board/punch
```

成功响应仍返回现有 board snapshot。

撤销失败新增业务错误：

```http
409
```

```json
{
  "error": "今天打卡送出的健身券已经花掉了，不能撤销打卡。"
}
```

## 前端行为

GM-05 只做轻量文案更新，不新增页面。

打卡确认弹窗 helper 文案建议：

```text
确认后会记为今日健身打卡，并获得 1 张健身券。
```

撤销确认弹窗 helper 文案建议：

```text
撤销后会回滚今天获得的银子、连签、赛季进度和未使用的健身券。
```

打卡成功日志建议：

```text
你已完成今日健身打卡，健身券 +1，服务器状态已同步。
```

如果撤销被阻止，复用现有错误展示即可，显示服务端返回的提示。

## Snapshot 关系

GM-05 不要求主面板展示抽奖券余额。

原因：

- `牛马补给站` 已通过 GM-03 / GM-04 的 `GET /api/gamification/state` 展示 `ticketBalance`。
- 主面板仍专注健身打卡、银子和赛季进度。
- 避免在 GM-05 把主面板和补给站状态强耦合。

后续如果需要主面板展示券余额，可以在独立 UI story 中扩展 `BoardSnapshot.currentUser`。

## 测试策略

### API 测试

覆盖：

- 成功打卡后 `User.ticketBalance +1`。
- 成功打卡后创建 `FITNESS_PUNCH_GRANTED` ledger。
- 重复打卡不会重复发券。
- 撤销未消费健身券时，`User.ticketBalance -1`。
- 撤销未消费健身券时，创建 `FITNESS_PUNCH_REVOKED` ledger。
- 撤销已消费健身券时返回 `409`，且 `PunchRecord` 保留。
- 撤销已消费健身券时，用户银子、连签、赛季统计不变化。
- 历史无 grant ledger 的 punch 仍可撤销。

### 前端测试

覆盖：

- 打卡确认弹窗文案包含 `健身券`。
- 撤销确认弹窗文案包含 `未使用的健身券`。
- 服务端返回券已花错误时，弹窗展示该错误。

## Acceptance Criteria

GM-05 完成时应满足：

1. 真实健身打卡成功后获得 `1` 张健身券。
2. 健身券发放写入 `LotteryTicketLedger`。
3. 每个 `PunchRecord` 最多对应一个 `FITNESS_PUNCH_GRANTED`。
4. 撤销未消费健身券会扣回 `1` 张券并写入撤销流水。
5. 当前券余额不足 `1` 时阻止撤销，并保留打卡记录。
6. 被阻止撤销时不补偿、不负债、不回滚抽奖。
7. GM-05 不改变四维任务、抽奖、背包、道具和企业微信逻辑。
8. 目标 API 和前端文案测试通过。

## Follow-Up Stories

GM-05 解锁：

- `GM-06 Lottery V1`
- `GM-09 Boost Settlement Integration`
- `GM-15 Weekly Report / Report Center Integration`
