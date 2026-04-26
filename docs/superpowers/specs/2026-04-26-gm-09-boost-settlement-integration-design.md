# GM-09 Boost Settlement Integration Design

> 把 GM-08 已经记录的今日 boost 真正接入健身打卡结算：暴击道具可以放大个人银子、赛季收入或两者；结算成功后扣减库存并把 `ItemUseRecord` 标记为 `SETTLED`。本 story 不新增道具类型，不处理弱社交、真实福利、抽奖辅助或企业微信。

## 背景

GM-08 让用户可以使用 boost，并创建 `PENDING` 的 `ItemUseRecord`。但 GM-08 明确不修改 `User.coins`、`PunchRecord.assetAwarded` 或 `SeasonMemberStat.seasonIncome`。

GM-09 负责补上真实结算：

```text
PENDING boost -> 真实健身打卡 -> 计算个人银子 / 赛季收入 -> 扣 boost 库存 -> ItemUseRecord.SETTLED
```

这个 story 必须解决一个现有模型问题：当前 `PunchRecord.assetAwarded` 同时被用于回滚个人银子和赛季收入。boost 后二者可能不同，例如 `银子暴富券` 只影响个人银子，不影响赛季收入。因此 GM-09 需要把个人银子和赛季收入分别持久化。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-05-fitness-ticket-hook-design.md`
- `docs/superpowers/specs/2026-04-26-gm-08-today-effective-item-use-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. `小暴击券`：当日真实健身打卡个人银子 `1.5x`，赛季收入不变。
2. `银子暴富券`：当日真实健身打卡个人银子 `2x`，赛季收入不变。
3. `赛季冲刺券`：当日真实健身打卡赛季收入 `2x`，个人银子不变。
4. `双倍牛马券`：当日真实健身打卡个人银子 `2x`，赛季收入 `2x`。
5. boost 结算成功后扣减对应 `InventoryItem.quantity`。
6. boost 结算成功后将 `ItemUseRecord.status` 从 `PENDING` 改为 `SETTLED`。
7. 同一个 boost 不能重复结算。
8. 撤销打卡时，个人银子和赛季收入按各自实际发放值回滚。
9. 撤销打卡不返还已结算 boost 道具。
10. 用户能在动态或反馈文案里看到本次是否触发了 boost。

## 非目标

- 不新增 `POST /api/gamification/items/use` 行为范围；入口已由 GM-08 提供。
- 不允许多个 boost 叠加；限制已由 GM-08 负责。
- 不实现弱社交道具。
- 不实现真实福利兑换。
- 不实现抽奖保底券或购券折扣。
- 不实现管理员补偿。
- 不发送企业微信。

## Boost 效果表

| itemId | 道具 | effect type | 个人银子 | 赛季收入 |
| --- | --- | --- | ---: | ---: |
| `small_boost_coupon` | 小暴击券 | `fitness_coin_multiplier` `1.5` | `base * 1.5` | `base` |
| `coin_rich_coupon` | 银子暴富券 | `fitness_coin_multiplier` `2` | `base * 2` | `base` |
| `season_sprint_coupon` | 赛季冲刺券 | `fitness_season_multiplier` `2` | `base` | `base * 2` |
| `double_niuma_coupon` | 双倍牛马券 | `fitness_coin_and_season_multiplier` `2` | `base * 2` | `base * 2` |

说明：

- `base` 是当前连续打卡档位对应的基础奖励。
- 没有 active season 时，赛季收入始终为 `0`，即使使用赛季类 boost 也不会创建赛季贡献。
- `1.5x` 使用四舍五入到整数。当前基础奖励都是 `10` 的倍数，因此不会出现小数争议。

## 数据模型调整

GM-09 需要扩展 `PunchRecord`，让个人银子和赛季收入可以分开回滚。

新增字段：

```prisma
baseAssetAwarded             Int     @default(0)
boostAssetBonus              Int     @default(0)
baseSeasonContribution       Int     @default(0)
boostSeasonBonus             Int     @default(0)
seasonContributionAwarded    Int     @default(0)
boostItemUseRecordId         String?
boostSummaryJson             String?
```

字段语义：

| 字段 | 说明 |
| --- | --- |
| `assetAwarded` | 实际发给个人的银子总额，保留现有语义 |
| `baseAssetAwarded` | 未使用 boost 时本应发给个人的基础银子 |
| `boostAssetBonus` | boost 额外增加的个人银子 |
| `baseSeasonContribution` | 未使用 boost 时本应计入赛季收入的基础值 |
| `boostSeasonBonus` | boost 额外增加的赛季收入 |
| `seasonContributionAwarded` | 实际计入赛季收入的总额 |
| `boostItemUseRecordId` | 本次结算使用的 `ItemUseRecord.id` |
| `boostSummaryJson` | 结算快照，用于 UI 和审计 |

兼容规则：

- 老数据的 `assetAwarded` 仍然有效。
- 如果旧 `PunchRecord.seasonContributionAwarded = 0` 但 `seasonId != null`，撤销时可以回退使用 `assetAwarded` 作为旧数据的赛季收入回滚值。

## 结算时机

### 先用 boost，再健身

1. GM-08 创建 `PENDING` boost，`targetId = null`。
2. 用户真实健身打卡。
3. GM-09 在打卡事务内找到当天 `PENDING` boost。
4. 计算 boost 后个人银子和赛季收入。
5. 创建 `PunchRecord`。
6. 扣减 boost 库存。
7. 更新 `ItemUseRecord` 为 `SETTLED` 并绑定 `PunchRecord.id`。
8. 更新 `User.coins`、`SeasonMemberStat.seasonIncome` 和活动动态。

### 先健身，再用 boost

1. 用户已完成当天真实健身，基础奖励已结算。
2. GM-08 创建 `PENDING` boost 并绑定当天 `PunchRecord.id`。
3. GM-09 立即对当天 `PunchRecord` 做补结算。
4. 只补发差额：个人银子 bonus 和 / 或赛季收入 bonus。
5. 扣减 boost 库存。
6. 更新 `ItemUseRecord` 为 `SETTLED`。

## Idempotency

boost 结算必须幂等。

规则：

- 如果 `PunchRecord.boostItemUseRecordId` 已经存在，不能再次结算另一个 boost。
- 如果同一个 `ItemUseRecord` 已经是 `SETTLED` 且 target 指向该 punch，重复调用应返回已有结算摘要，不重复扣库存，不重复加银子或赛季收入。
- 如果 `ItemUseRecord.status != PENDING` 且不是上述已结算同一目标，拒绝结算。

## 撤销规则

撤销今日真实健身时：

- 删除 `PunchRecord`。
- `User.coins` 回滚 `PunchRecord.assetAwarded`。
- `SeasonMemberStat.seasonIncome` 回滚 `PunchRecord.seasonContributionAwarded`。
- `Season.filledSlots` 仍然只按 `countedForSeasonSlot` 回滚 `1` 格。
- 已结算 boost 不返还库存。
- `ItemUseRecord` 保持 `SETTLED`，用于解释“这张道具已经花掉”。
- 撤销提示需要说明：如果本次打卡消耗了 boost，道具不会返还。

这样符合已确认原则：已花掉的资源不撤销、不补偿，只做提示。

## 赛季进度边界

boost 只影响 `SeasonMemberStat.seasonIncome`，不额外增加 `slotContribution` 或 `Season.filledSlots`。

因此：

- 一个真实健身打卡最多推进 `1` 个 season slot。
- 赛季进度条不会因为 boost 超过 `targetSlots`。
- 赛季已满时，`filledSlots` 不再增加，但 `seasonIncome` 仍可以继续累计，包括 boost 后的收入。

## 用户反馈

GM-09 至少需要在活动动态中体现 boost：

示例：

- `li 刚刚打卡，拿下 60 银子，小暴击券生效`
- `li 刚刚打卡，拿下 40 银子，赛季冲刺券让赛季收入 x2`
- `li 刚刚打卡，拿下 80 银子，双倍牛马券生效`

撤销时：

- `li 撤销了今天的打卡，已消耗的暴击道具不返还`

## 测试策略

### 服务层测试

覆盖：

- 无 boost 时返回基础个人银子和基础赛季收入。
- `小暴击券` 只增加个人银子。
- `银子暴富券` 只增加个人银子。
- `赛季冲刺券` 只增加赛季收入。
- `双倍牛马券` 同时增加个人银子和赛季收入。
- 没有 active season 时，赛季 boost 不创建赛季收入。
- 同一 boost 重复结算不会重复扣库存或重复加收益。

### API / punch 测试

覆盖：

- 先用 boost 后打卡，打卡响应结算 boost。
- 先打卡后用 boost，`items/use` 立即补结算差额。
- boost 结算后 `ItemUseRecord.status = SETTLED`。
- boost 结算后库存扣 `1`。
- 撤销打卡回滚个人银子和赛季收入。
- 撤销打卡不返还 boost 库存。
- `filledSlots` 不因 boost 多加格。

### UI 测试

覆盖：

- 活动动态展示 boost 文案。
- 撤销文案包含道具不返还提示。
- 供应站今日效果从待结算变成已结算。

## Acceptance Criteria

GM-09 完成时应满足：

1. 四种 boost 道具按效果表正确影响个人银子和 / 或赛季收入。
2. boost 结算成功后扣减 `InventoryItem.quantity`。
3. boost 结算成功后 `ItemUseRecord.status = SETTLED`。
4. 先用 boost 后健身可以在打卡事务内结算。
5. 先健身后用 boost 可以立即补发差额。
6. 同一个 boost 不能重复结算。
7. 个人银子和赛季收入分别持久化，撤销时按各自实际值回滚。
8. boost 不会额外推进 season slot，不会让 `filledSlots` 超过 `targetSlots`。
9. 撤销打卡不返还已消耗 boost。
10. 用户能看到 boost 生效文案。

## Follow-Up Stories

GM-09 解锁：

- `GM-13 Team Dynamics Integration`
- `GM-15 Weekly Report / Report Center Integration`
