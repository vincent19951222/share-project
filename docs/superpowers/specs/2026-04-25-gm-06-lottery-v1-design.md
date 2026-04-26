# GM-06 Lottery V1 Design

> 为“牛马补给站”补上第一个抽奖闭环：用户可以消耗抽奖券进行单抽或十连抽；十连抽允许在已有 `7-9` 张券时用银子补齐；抽奖结果会落库并发放银子或库存奖励。这个 story 不实现背包详情、道具使用、弱社交触发或真实福利兑换确认。

## 背景

GM-04 让四维任务可以产出生活券，GM-05 让真实健身打卡可以产出健身券。GM-06 把这些券变成可消费的期待感入口：

```text
健身 / 四维任务 -> 抽奖券 -> 单抽 / 十连 -> 银子 / 道具 / 趣味奖励
```

GM-06 是经济系统的第一段消费闭环，必须保证事务一致、概率保守、不能形成银子套利。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-03-supply-station-shell-design.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/specs/2026-04-25-gm-05-fitness-ticket-hook-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 用户可以用 `1` 张券进行单抽。
2. 用户可以用 `10` 张券进行十连抽。
3. 十连抽在已有 `7-9` 张券时，可以用银子补齐，最多补 `3` 张。
4. 补券价格为 `40` 银子 / 张，每人每天最多补 `3` 张。
5. 单抽没有保底。
6. 十连抽至少产出 `1` 个实用或更高价值结果。
7. 抽奖扣券、扣银子、创建抽奖记录、创建结果、发放奖励必须在同一事务内完成。
8. 抽奖历史可以在配置文案变化后仍展示当时抽中的结果。

## 非目标

- 不提供独立购券接口。
- 不允许单抽用银子补券。
- 不实现背包详情页。
- 不实现道具使用。
- 不触发弱社交邀请。
- 不处理真实福利兑换确认。
- 不实现管理员补偿或后台调奖。
- 不写团队动态。
- 不发送企业微信。

## 核心规则

### 抽奖类型

GM-06 支持两种 draw type：

```ts
type LotteryDrawType = "SINGLE" | "TEN";
```

规则：

- `SINGLE`：消耗 `1` 张抽奖券，创建 `1` 条结果。
- `TEN`：消耗 `10` 张抽奖券，创建 `10` 条结果。
- `SINGLE` 不允许银子补券。
- `TEN` 可以补券，但必须满足补券规则。

### 十连补券

十连抽补券规则：

- 当前券数 `>= 10`：不需要补券。
- 当前券数 `7-9`：允许用银子补齐到 `10`。
- 当前券数 `< 7`：不能十连。
- 每张补券价格 `40` 银子。
- 每人每天最多补 `3` 张。
- 补券只发生在 `TEN` draw 内。
- 不提供 `POST /api/gamification/tickets/buy` 之类的独立购券接口。

补券流水：

```text
reason: COIN_PURCHASE_GRANTED
sourceType: lottery_topup
sourceId: <LotteryDraw.id>
delta: +N
```

扣券流水：

```text
reason: LOTTERY_DRAW_SPENT
sourceType: lottery_draw
sourceId: <LotteryDraw.id>
delta: -1 或 -10
```

### 奖池概率

GM-06 使用 GM-01 的 `RewardDefinition.weight` 做加权抽取。

奖池目标分布沿用 master 规则：

| 分层 | 目标概率 |
| --- | ---: |
| 普通银子 | 45% |
| 实用道具 | 27% |
| 弱社交道具 | 18% |
| 趣味收藏 | 6% |
| 稀有暴击 | 4% |

实现规则：

- 以启用的 `RewardDefinition` 为准。
- `weight <= 0` 的奖励不进入抽取。
- GM-06 不在运行时硬编码中文奖品文案。
- 抽中时把完整 reward snapshot 写入 `LotteryDrawResult.rewardSnapshotJson`。

### 银子回报边界

银子购券成本为 `40` 银子 / 张。普通银子奖池的期望值必须显著低于 `40`，避免形成“抽银子买券再抽”的套利闭环。

GM-06 的验收测试应计算启用奖池中的直接银子期望值，并要求：

```text
direct coin expected value < 40
```

推荐目标仍是 master 文档里的约 `8.75` 银子 / 抽。

### 十连保底

十连保底规则：

- 单抽没有保底。
- 十连至少出现 `1` 个 guarantee-eligible 奖励。
- guarantee-eligible tiers：
  - `utility`
  - `social`
  - `rare`
- `cosmetic` 不计入保底，因为它不一定提供可用资源。
- 保底不保证稀有暴击。

如果十连自然结果没有 guarantee-eligible 奖励：

1. 从结果中选择一个最低价值位置替换。
2. 优先替换最低银子奖。
3. 如果没有银子奖，则替换第 `10` 个结果。
4. 替换奖励从启用的 `utility` 奖励中按权重抽取。
5. `LotteryDraw.guaranteeApplied = true`。

## 奖励发放

GM-06 支持以下 reward effect：

### grant_coins

行为：

- 增加 `User.coins`。
- 写入 `LotteryDrawResult`。
- 不写 `ActivityEvent`，团队动态放到 GM-13。

### grant_item

行为：

- 增加 `InventoryItem.quantity`。
- 同一用户同一 `itemId` 聚合。
- 道具不在 GM-06 中使用，只进入库存。

### grant_real_world_redemption

行为：

- 增加对应 `InventoryItem.quantity`。
- 不创建 `RealWorldRedemption`。
- 真实福利兑换请求放到 GM-10。

### grant_title

行为：

- 只写入抽奖结果 snapshot。
- GM-06 不新增称号库存模型。
- 后续如果要长期展示称号，可在 cosmetic story 中扩展。

## 数据写入顺序

抽奖必须在一个事务内完成。

推荐顺序：

1. 锁定并读取用户余额：`ticketBalance`、`coins`、`teamId`。
2. 计算 draw count、补券数量和补券银子成本。
3. 校验券数、银子余额、每日补券上限。
4. 预抽奖励结果，应用十连保底。
5. 创建 `LotteryDraw`。
6. 如需补券：扣减 `User.coins`，增加 `User.ticketBalance`，写 `COIN_PURCHASE_GRANTED` ledger。
7. 扣减抽奖券，写 `LOTTERY_DRAW_SPENT` ledger。
8. 创建 `LotteryDrawResult` rows。
9. 发放奖励：银子加到 `User.coins`，道具加到 `InventoryItem.quantity`。
10. 返回最新 gamification snapshot。

注意：

- `LotteryDraw.sourceId` 需要 draw id，因此 draw record 应在 ledger 前创建。
- `LotteryDraw.coinSpent` 记录补券实际消耗的银子。
- `LotteryDraw.ticketSpent` 始终是 `1` 或 `10`。
- `balanceAfter` 必须反映每条 ledger 发生后的券余额。

## API 设计

新增接口：

```text
POST /api/gamification/lottery/draw
```

Body:

```ts
{
  drawType: "SINGLE" | "TEN";
  useCoinTopUp?: boolean;
}
```

规则：

- 未登录返回 `401 { error: "未登录" }`。
- 用户不存在返回 `401 { error: "用户不存在" }`。
- 参数错误返回 `400`。
- 券不足、银子不足、补券超限返回 `409`。
- 成功返回：

```ts
{
  snapshot: GamificationStateSnapshot;
  draw: LotteryDrawSnapshot;
}
```

其中 `draw` 也应出现在 snapshot 的 `lottery.recentDraws[0]`。

## Snapshot 扩展

GM-06 把 GM-03 的 lottery placeholder 升级为 active。

```ts
interface GamificationLotterySummary {
  status: "active";
  singleDrawEnabled: boolean;
  tenDrawEnabled: boolean;
  tenDrawTopUpRequired: number;
  tenDrawTopUpCoinCost: number;
  dailyTopUpPurchased: number;
  dailyTopUpLimit: 3;
  ticketPrice: 40;
  message: string;
  recentDraws: LotteryDrawSnapshot[];
}
```

`LotteryDrawSnapshot`：

```ts
interface LotteryDrawSnapshot {
  id: string;
  drawType: "SINGLE" | "TEN";
  ticketSpent: number;
  coinSpent: number;
  guaranteeApplied: boolean;
  createdAt: string;
  rewards: LotteryRewardSnapshot[];
}
```

`LotteryRewardSnapshot`：

```ts
interface LotteryRewardSnapshot {
  rewardId: string;
  rewardTier: string;
  rewardKind: string;
  name: string;
  description: string;
  effectSummary: string;
}
```

## 前端行为

`SupplyStation` 抽奖区从占位升级为可操作：

- 展示当前券余额。
- 单抽按钮：有 `>=1` 张券时启用。
- 十连按钮：有 `>=10` 张券时启用。
- 十连补券按钮 / 文案：有 `7-9` 张券且银子足够时提示需要补几张、花多少银子。
- 抽奖过程中禁用按钮。
- 成功后展示本次抽奖结果。
- 失败时展示服务端错误。
- 最近抽奖记录展示 `recentDraws`。

GM-06 不需要实现完整背包页，但抽到道具后，现有背包摘要应能通过 snapshot 看到数量变化。

## 测试策略

### 服务层测试

覆盖：

- 单抽扣 `1` 张券并创建 `1` 条结果。
- 单抽券不足时返回业务错误。
- 十连扣 `10` 张券并创建 `10` 条结果。
- 十连在 `7-9` 张券时可以补券。
- 十连少于 `7` 张券时被拒绝。
- 每日补券最多 `3` 张。
- 银子不足时不能补券。
- 十连保底能把全银子结果替换成 utility 奖励。
- 抽到银子增加 `User.coins`。
- 抽到道具增加 `InventoryItem.quantity`。
- 抽到真实福利增加对应 `InventoryItem.quantity`。
- 抽奖历史保存 reward snapshot。

### API 测试

覆盖：

- 未登录 401。
- 参数错误 400。
- 单抽成功。
- 十连成功。
- 十连补券成功。
- 券不足 / 银子不足 / 补券超限 409。

### 前端测试

覆盖：

- 单抽按钮基于券余额启用 / 禁用。
- 十连补券文案正确展示。
- 点击单抽调用 `POST /api/gamification/lottery/draw`。
- 点击十连调用同一 endpoint。
- 成功后展示本次抽奖结果。
- API 错误展示在抽奖区。

## Acceptance Criteria

GM-06 完成时应满足：

1. `POST /api/gamification/lottery/draw` 支持 `SINGLE` 和 `TEN`。
2. 单抽消耗 `1` 张券，没有保底。
3. 十连消耗 `10` 张券，并至少有 `1` 个 guarantee-eligible 奖励。
4. 十连可以在已有 `7-9` 张券时用银子补齐。
5. 补券价格为 `40` 银子 / 张，每人每天最多补 `3` 张。
6. 抽奖扣券、扣银子、发奖和记录结果在同一事务内完成。
7. 抽到银子会增加 `User.coins`。
8. 抽到道具或真实福利会增加 `InventoryItem.quantity`。
9. 抽奖历史可展示 reward snapshot。
10. GM-06 不实现背包详情、道具使用、真实福利兑换确认、团队动态或企业微信。

## Follow-Up Stories

GM-06 解锁：

- `GM-07 Backpack V1`
- `GM-13 Team Dynamics Integration`
- `GM-15 Weekly Report / Report Center Integration`
