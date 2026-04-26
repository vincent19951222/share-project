# Gamification Content Schema

> 记录“牛马补给站”相关内容配置的字段规范。本文档用于约束任务卡片库、抽奖奖池和道具配置，方便后续从表格、Markdown 或本地配置文件稳定导入。

## 参考材料

当前可参考的内容草案：

- `design/game-card-design.md`

这份材料适合作为任务卡文案和维度表达的内容来源，但不直接作为最终数据规范。

原因：

- 文案可以变化，字段结构应稳定。
- 中文标题不适合做数据库主键或逻辑 key。
- 任务卡、抽奖奖品、背包道具需要共用一套可校验的配置结构。
- 后续如果从表格导入，必须提前定义列名和枚举值。

## 存储策略

第一版建议：

- 任务卡片库使用本地配置文件维护，不进入数据库后台。
- 抽奖奖池和道具定义使用本地配置文件维护，不进入数据库后台。
- 用户每天抽到的任务、完成状态、抽奖券、背包库存、抽奖记录和社交邀请进入数据库。

推荐后续代码位置：

```text
content/gamification/dimensions.ts
content/gamification/task-cards.ts
content/gamification/reward-pool.ts
content/gamification/item-definitions.ts
```

本地配置适合承接“内容定义”；数据库适合承接“用户状态与流水”。

## 数据库边界

当前已确认：

- 四维定义、任务卡片库、抽奖奖池定义、道具定义、概率配置不进数据库，第一版放本地配置。
- 用户每天抽到的任务、完成状态、抽奖券、背包库存、抽奖记录、道具使用记录、社交邀请和真实福利兑换记录进数据库。
- 抽奖券采用“余额 + 流水”双层模型。
- 用户表可冗余 `ticketBalance` 用于快速展示。
- `LotteryTicketLedger` 记录抽奖券获得和消耗流水，用于解释来源、消费和管理员调整。

建议进入数据库的模型概念：

- `DailyTaskAssignment`
- `LotteryTicketLedger`
- `InventoryItem`
- `ItemUseRecord`
- `LotteryDraw`
- `SocialInvitation`
- `RealWorldRedemption`

## API 边界

API 按页面动作拆分，不直接暴露数据库表 CRUD。

第一版建议优先实现：

```text
GET /api/gamification/state
POST /api/gamification/tasks/complete
POST /api/gamification/tasks/reroll
POST /api/gamification/tasks/claim-ticket
POST /api/gamification/lottery/draw
POST /api/gamification/items/use
POST /api/gamification/social/respond
POST /api/gamification/redemptions/request
POST /api/admin/gamification/redemptions/confirm
```

接口职责：

- `state` 返回 `牛马补给站` 首屏需要的聚合状态。
- `tasks/*` 负责四维任务完成、换卡和生活券领取。
- `lottery/draw` 负责单抽、十连、十连补券、扣券、扣银子、发奖和抽奖记录。
- `items/use` 负责今日增益、弱社交、请假券、真实福利等道具使用入口。
- `social/respond` 负责响应弱社交邀请并结算奖励。
- `redemptions/request` 和管理员确认接口负责真实福利兑换。

所有经济规则必须由服务端校验，前端只负责发起动作和展示结果。

第一版不提供独立购券接口。银子购券只作为十连抽补齐逻辑存在。

## 维度定义

四个维度应使用稳定英文 key，展示文案单独配置。

| key | 主标题 | 副标题 | 定位 |
| --- | --- | --- | --- |
| `movement` | 把电充绿 | 站一站，不然屁股长根 | 起身、走动、拉伸、短暂恢复 |
| `hydration` | 把尿喝白 | 喝白白，别把自己腌入味 | 补水、接水、无糖饮品 |
| `social` | 把事办黄 | 聊两句，让班味散一散 | 闲聊、吐槽、夸夸、情绪释放 |
| `learning` | 把股看红 | 看一点，给脑子补仓 | 信息输入、学习、看新闻 / 文章 / 工具 |

## 任务卡字段

任务卡建议使用 `TaskCardDefinition`。

```ts
type TaskDimensionKey = "movement" | "hydration" | "social" | "learning";
type TaskEffort = "light" | "medium";
type TaskScene = "office" | "home" | "general";

type TaskCardDefinition = {
  id: string;
  dimensionKey: TaskDimensionKey;
  title: string;
  description: string;
  completionTextOptions: string[];
  effort: TaskEffort;
  scene: TaskScene;
  repeatCooldownDays: number;
  isWeekendOnly: boolean;
  tags: string[];
  weight: number;
  enabled: boolean;
};
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定唯一 ID，不使用中文，例如 `movement_001` |
| `dimensionKey` | 所属维度，使用稳定英文 key |
| `title` | 卡片标题，例如 `工位重启` |
| `description` | 卡片描述和完成标准 |
| `completionTextOptions` | 完成后的状态词，可随机展示 |
| `effort` | 任务强度，第一版只保留 `light / medium` |
| `scene` | 适用场景，第一版保留 `office / home / general` |
| `repeatCooldownDays` | 抽取冷却天数 |
| `isWeekendOnly` | 是否仅周末抽取 |
| `tags` | 内容标签，例如 `stretch / water / chat / article` |
| `weight` | 抽取权重，第一版可统一为 `1` |
| `enabled` | 是否启用，方便临时下线卡片 |

示例：

```ts
{
  id: "movement_001",
  dimensionKey: "movement",
  title: "工位重启",
  description: "离开椅子站起来 2 分钟，让身体退出省电模式。",
  completionTextOptions: ["电量+1", "屁股离线", "已复活"],
  effort: "light",
  scene: "general",
  repeatCooldownDays: 3,
  isWeekendOnly: false,
  tags: ["stand", "break"],
  weight: 1,
  enabled: true,
}
```

## 每日任务分配状态

任务卡定义不记录用户状态。用户每天抽到什么、是否完成，应进入数据库。

建议模型概念：

```ts
type DailyTaskAssignment = {
  id: string;
  userId: string;
  teamId: string;
  dayKey: string;
  dimensionKey: TaskDimensionKey;
  taskCardId: string;
  rerollCount: number;
  rerolledFromTaskCardId?: string;
  completedAt?: Date;
  completionText?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

约束建议：

- 同一用户、同一天、同一维度只能有一张当前任务。
- 每个维度当天最多免费换一次任务。
- 完成状态以 Asia/Shanghai 的 `dayKey` 为准。
- `taskCardId` 引用本地配置中的任务卡 ID，不做数据库外键。
- 第一版不保存任务文案快照，历史展示使用当前配置文案。

推荐唯一约束：

```text
@@unique([userId, dayKey, dimensionKey])
```

## 抽奖券流水

抽奖券采用“余额 + 流水”双层模型。

`User.ticketBalance` 用于页面快速展示，`LotteryTicketLedger` 用于解释每一次券的获得和消耗。

建议模型概念：

```ts
type LotteryTicketLedger = {
  id: string;
  userId: string;
  teamId: string;
  dayKey: string;
  delta: number;
  balanceAfter: number;
  reason: LotteryTicketLedgerReason;
  sourceType?: string;
  sourceId?: string;
  metadataJson?: unknown;
  createdAt: Date;
};

type LotteryTicketLedgerReason =
  | "FITNESS_PUNCH_GRANTED"
  | "DAILY_TASKS_GRANTED"
  | "COIN_PURCHASE_GRANTED"
  | "LOTTERY_DRAW_SPENT"
  | "FITNESS_PUNCH_REVOKED"
  | "ADMIN_ADJUSTMENT"
  | "SYSTEM_COMPENSATION";
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `delta` | 券变化数量，正数为获得，负数为消耗，不能为 `0` |
| `balanceAfter` | 流水发生后的券余额 |
| `reason` | 变化原因 |
| `sourceType` | 来源类型，例如 `fitness_punch / daily_tasks / coin_purchase / lottery_draw / admin_adjustment` |
| `sourceId` | 来源对象 ID |
| `metadataJson` | 补充信息，例如十连补了几张券、花了多少银子 |

核心规则：

- 所有抽奖券变化必须走同一个服务函数。
- `User.ticketBalance` 和 `LotteryTicketLedger` 必须在同一事务内更新。
- 扣券后余额不能小于 `0`。
- 一张抽奖券不需要单独建一行实体，余额和流水足够支撑第一版。
- 撤销当天健身打卡时，如果该打卡授予的健身券尚未被消费，则写入 `FITNESS_PUNCH_REVOKED` 流水并扣回券。
- 如果该打卡授予的健身券已经被消费，则阻止撤销并提示用户；不做补偿、不产生负债、不回滚已完成抽奖。

十连补齐流程建议：

1. 计算当前抽奖券余额。
2. 如果不足 `10` 张，按 `40` 银子 / 张补齐，最多补 `3` 张。
3. 写入 `COIN_PURCHASE_GRANTED` 流水。
4. 增加 `User.ticketBalance`。
5. 写入 `LOTTERY_DRAW_SPENT` 的 `-10` 流水。
6. 扣减 `User.ticketBalance`。
7. 创建 `LotteryDraw`。

## 背包库存

背包库存建议使用聚合模型。同一个用户、同一种道具只保留一条记录，通过 `quantity` 表示数量。

建议模型概念：

```ts
type InventoryItem = {
  id: string;
  userId: string;
  teamId: string;
  itemId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `itemId` | 引用本地配置里的道具 ID，不做数据库外键 |
| `quantity` | 当前持有数量，不能小于 `0` |
| `teamId` | 冗余团队 ID，方便团队统计和迁移 |

推荐唯一约束：

```text
@@unique([userId, itemId])
```

核心规则：

- `InventoryItem` 只负责当前库存数量。
- 道具名称、描述、效果从本地配置读取。
- 道具来源由 `LotteryDraw` 或后续奖励流水解释。
- 道具使用由 `ItemUseRecord` 解释。
- 真实福利兑换由 `RealWorldRedemption` 解释。

`瑞幸咖啡券` 的库存和兑换应拆开：

- `InventoryItem` 记录当前还有几张可用。
- `RealWorldRedemption` 记录每一次兑换申请和管理员确认。

## 道具使用记录

`ItemUseRecord` 用于记录道具使用、待生效、已结算、过期和回滚状态。

这张表尤其重要，因为收益类道具是“今日生效”：用户可以先使用再健身，也可以健身后再使用并对当天打卡补结算。

建议模型概念：

```ts
type ItemUseRecord = {
  id: string;
  userId: string;
  teamId: string;
  itemId: string;
  dayKey: string;
  status: ItemUseStatus;
  targetType?: ItemUseTargetType;
  targetId?: string;
  effectSnapshotJson: unknown;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type ItemUseStatus = "PENDING" | "SETTLED" | "EXPIRED" | "CANCELLED";
type ItemUseTargetType = "FITNESS_PUNCH" | "SOCIAL_INVITATION" | "REAL_WORLD_REDEMPTION";
```

状态语义：

| 状态 | 说明 |
| --- | --- |
| `PENDING` | 今天已使用，等待真实健身打卡或目标事件触发 |
| `SETTLED` | 已经完成结算 |
| `EXPIRED` | 当天结束仍未触发目标事件，不生效 |
| `CANCELLED` | 用户撤销或系统回滚 |

字段说明：

| 字段 | 说明 |
| --- | --- |
| `targetType` | 道具最终作用对象类型 |
| `targetId` | 作用对象 ID，例如 `PunchRecord.id`、`SocialInvitation.id`、`RealWorldRedemption.id` |
| `effectSnapshotJson` | 使用时的效果快照，避免未来配置变化导致历史结算不可解释 |
| `settledAt` | 完成结算时间 |

核心规则：

- 使用收益类道具时先创建 `PENDING`。
- 当天已完成真实健身打卡时，可以立即补结算并转为 `SETTLED`。
- 当天尚未完成真实健身打卡时，保持 `PENDING`，等待当天打卡触发。
- 当天结束仍没有真实健身打卡，则转为 `EXPIRED`。
- `SETTLED` 时才真正扣减 `InventoryItem.quantity`。
- `PENDING` 阶段视为预占库存，创建前需要检查库存数量大于当天待生效数量。
- 同一天同类型暴击只能有一个 `PENDING` 或 `SETTLED`。
- 健身请假券不能触发收益类暴击结算。

## 抽奖记录

抽奖记录建议拆成两层：

- `LotteryDraw`：一次抽奖主记录
- `LotteryDrawResult`：每一抽的结果记录

这样单抽和十连可以统一处理。

建议模型概念：

```ts
type LotteryDraw = {
  id: string;
  userId: string;
  teamId: string;
  drawType: LotteryDrawType;
  ticketSpent: number;
  coinSpent: number;
  guaranteeApplied: boolean;
  createdAt: Date;
};

type LotteryDrawResult = {
  id: string;
  drawId: string;
  position: number;
  rewardId: string;
  rewardTier: RewardTier;
  rewardKind: RewardKind;
  rewardSnapshotJson: unknown;
  createdAt: Date;
};

type LotteryDrawType = "SINGLE" | "TEN";
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `drawType` | `SINGLE` 或 `TEN` |
| `ticketSpent` | 消耗的抽奖券数量，单抽为 `1`，十连为 `10` |
| `coinSpent` | 补券消耗的银子，没有补券则为 `0` |
| `guaranteeApplied` | 是否触发十连保底 |
| `position` | 第几抽，十连为 `1-10` |
| `rewardId` | 引用本地配置中的奖品 ID |
| `rewardSnapshotJson` | 抽中时的奖品快照，避免配置变化影响历史展示 |

核心规则：

- 单抽创建 `1` 条 `LotteryDrawResult`。
- 十连创建 `10` 条 `LotteryDrawResult`。
- 扣券、扣银子、创建抽奖记录、创建结果记录和发放奖励必须在同一事务内完成。
- 抽到银子时增加 `User.coins`。
- 抽到道具时增加 `InventoryItem.quantity`。
- 抽到真实福利时增加对应 `InventoryItem.quantity`，后续由 `RealWorldRedemption` 处理兑换。
- `LotteryDraw` 不直接记录业务效果，业务效果从 `RewardEffect` 执行，并在 `rewardSnapshotJson` 中保留快照。

## 弱社交邀请

`SocialInvitation` 用于记录弱社交道具发起的邀请、企业微信推送、响应和过期状态。

第一版建议只使用一张核心表，不拆响应明细表。后续如果全队类邀请需要统计每个成员的响应，再增加 `SocialInvitationResponse`。

建议模型概念：

```ts
type SocialInvitation = {
  id: string;
  teamId: string;
  senderUserId: string;
  recipientUserId?: string;
  invitationType: SocialInvitationType;
  itemUseRecordId: string;
  status: SocialInvitationStatus;
  dayKey: string;
  message: string;
  wechatWebhookSentAt?: Date;
  respondedAt?: Date;
  expiredAt?: Date;
  rewardSettledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type SocialInvitationType =
  | "DRINK_WATER"
  | "WALK_AROUND"
  | "CHAT"
  | "SHARE_INFO"
  | "TEAM_STANDUP"
  | "TEAM_BROADCAST";

type SocialInvitationStatus = "PENDING" | "RESPONDED" | "EXPIRED" | "CANCELLED";
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `recipientUserId` | 接收人，允许为空；为空表示全队邀请或广播 |
| `invitationType` | 邀请类型 |
| `itemUseRecordId` | 对应本次道具使用记录 |
| `dayKey` | 邀请所属日期，以 Asia/Shanghai 为准 |
| `message` | 发到企业微信和站内展示的文案快照 |
| `wechatWebhookSentAt` | 企业微信消息发送时间 |
| `respondedAt` | 对方确认响应时间 |
| `rewardSettledAt` | 响应记录或展示记录结算时间；v1 弱社交不发银子 |
| `expiredAt` | 过期时间 |

核心规则：

- 弱社交道具使用后创建 `SocialInvitation`。
- 创建邀请后尝试发送企业微信机器人消息。
- 企业微信发送失败不影响站内邀请创建。
- 邀请当天有效。
- 对方可以响应，也可以忽略。
- 第一版弱社交响应不发银子，只结算响应记录、展示素材和后续周报 / 动态素材。
- 只有状态变为 `RESPONDED` 后才生成响应记录或展示记录。
- 未响应邀请过了当天转为 `EXPIRED`。
- 全队类邀请第一版可简化为只发广播，不记录每个成员响应明细。

## 真实福利兑换

`RealWorldRedemption` 用于记录瑞幸咖啡券等真实福利的兑换申请、管理员确认和取消。

真实福利兑换不应塞进 `InventoryItem`。`InventoryItem` 只负责当前库存数量，兑换状态需要独立追踪。

建议模型概念：

```ts
type RealWorldRedemption = {
  id: string;
  teamId: string;
  userId: string;
  itemId: string;
  status: RealWorldRedemptionStatus;
  requestedAt: Date;
  confirmedByUserId?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

type RealWorldRedemptionStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED";
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `itemId` | 真实福利道具 ID，例如 `luckin_coffee_coupon` |
| `requestedAt` | 用户申请兑换时间 |
| `confirmedByUserId` | 确认兑换的管理员用户 ID |
| `confirmedAt` | 管理员确认时间 |
| `cancelledAt` | 取消时间 |
| `note` | 可选备注，例如“已线下发券”或“已请咖啡” |

核心规则：

- 用户申请兑换时，扣减 `InventoryItem.quantity` 并创建 `REQUESTED` 记录。
- 管理员确认后，状态变为 `CONFIRMED`。
- 取消兑换后，状态变为 `CANCELLED`，并返还 `InventoryItem.quantity`。
- 第一版必须支持管理员取消兑换。
- 只有 `REQUESTED` 状态可以取消。
- `CONFIRMED` 状态不能取消。
- 同一张真实福利券不能重复兑换。
- 真实福利兑换不自动写入咖啡打卡记录。

## 抽奖奖品字段

抽奖奖品建议使用 `RewardDefinition`。

```ts
type RewardTier = "coin" | "utility" | "social" | "cosmetic" | "rare";
type RewardKind = "coins" | "inventory_item" | "title" | "real_world_redemption";
type RewardRarity = "common" | "uncommon" | "rare" | "epic";

type RewardDefinition = {
  id: string;
  tier: RewardTier;
  kind: RewardKind;
  rarity: RewardRarity;
  name: string;
  description: string;
  weight: number;
  effect: RewardEffect;
  enabled: boolean;
};
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定唯一 ID，例如 `coins_005`、`item_double_niuma` |
| `tier` | 奖池分层，对应普通银子、实用、弱社交、趣味收藏、稀有 |
| `kind` | 奖励结果类型 |
| `rarity` | 稀有度，用于展示和排序 |
| `name` | 奖品展示名 |
| `description` | 奖品说明 |
| `weight` | 当前 tier 内的抽取权重 |
| `effect` | 结构化效果配置 |
| `enabled` | 是否启用 |

## RewardEffect

奖励效果需要结构化，避免把规则写死在文案里。

```ts
type RewardEffect =
  | { type: "grant_coins"; amount: number }
  | { type: "grant_item"; itemId: string; quantity: number }
  | { type: "grant_title"; titleId: string }
  | { type: "grant_real_world_redemption"; itemId: string; quantity: number };
```

示例：

```ts
{
  id: "coins_020",
  tier: "coin",
  kind: "coins",
  rarity: "common",
  name: "今日没白来",
  description: "获得 20 银子。",
  weight: 10,
  effect: { type: "grant_coins", amount: 20 },
  enabled: true,
}
```

```ts
{
  id: "reward_luckin_coffee",
  tier: "rare",
  kind: "real_world_redemption",
  rarity: "epic",
  name: "瑞幸咖啡券",
  description: "可找管理员线下兑换一杯瑞幸咖啡。",
  weight: 1,
  effect: {
    type: "grant_real_world_redemption",
    itemId: "luckin_coffee_coupon",
    quantity: 1,
  },
  enabled: true,
}
```

## 道具定义字段

抽到道具后进入背包。道具本身建议使用 `ItemDefinition`。

```ts
type ItemCategory = "boost" | "protection" | "social" | "lottery" | "cosmetic" | "real_world";
type ItemUseTiming = "today" | "instant" | "manual_redemption";

type ItemDefinition = {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  useTiming: ItemUseTiming;
  effect: ItemEffect;
  stackable: boolean;
  maxUsePerUserPerDay?: number;
  maxUsePerUserPerWeek?: number;
  maxUsePerTeamPerDay?: number;
  requiresAdminConfirmation: boolean;
  enabled: boolean;
};
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定唯一 ID，例如 `small_boost_150` |
| `category` | 道具分类 |
| `name` | 道具展示名 |
| `description` | 道具说明 |
| `useTiming` | 使用时机，收益类通常为 `today` |
| `effect` | 结构化效果 |
| `stackable` | 是否允许叠加 |
| `maxUsePerUserPerDay` | 单人每日使用上限 |
| `maxUsePerUserPerWeek` | 单人每周使用上限 |
| `maxUsePerTeamPerDay` | 团队每日触发上限 |
| `requiresAdminConfirmation` | 是否需要管理员确认，例如真实福利券 |
| `enabled` | 是否启用 |

## ItemEffect

```ts
type ItemEffect =
  | { type: "fitness_coin_multiplier"; multiplier: 1.5 | 2 }
  | { type: "fitness_season_multiplier"; multiplier: 2 }
  | { type: "fitness_coin_and_season_multiplier"; multiplier: 2 }
  | { type: "task_reroll"; scope: "same_dimension" }
  | { type: "lottery_guarantee"; minTier: RewardTier; appliesTo: "single" | "ten_draw" }
  | { type: "ticket_discount"; discountRate: number }
  | { type: "social_invitation"; invitationType: string }
  | { type: "leave_protection"; protectsStreak: true; freezesNextFitnessRewardTier: true }
  | { type: "real_world_redemption"; redemptionType: "luckin_coffee" };
```

示例：

```ts
{
  id: "double_niuma_coupon",
  category: "boost",
  name: "双倍牛马券",
  description: "当日真实健身打卡个人资产 2x，赛季贡献 2x。",
  useTiming: "today",
  effect: { type: "fitness_coin_and_season_multiplier", multiplier: 2 },
  stackable: false,
  maxUsePerUserPerWeek: 1,
  requiresAdminConfirmation: false,
  enabled: true,
}
```

```ts
{
  id: "fitness_leave_coupon",
  category: "protection",
  name: "健身请假券",
  description: "当天无法健身时保护连续记录不断联，并冻结下一次真实健身奖励档位。",
  useTiming: "today",
  effect: {
    type: "leave_protection",
    protectsStreak: true,
    freezesNextFitnessRewardTier: true,
  },
  stackable: false,
  maxUsePerUserPerDay: 1,
  requiresAdminConfirmation: false,
  enabled: true,
}
```

## 后续表格列建议

如果后续用表格维护任务卡，建议列名如下：

```text
id
dimensionKey
title
description
completionTextOptions
effort
scene
repeatCooldownDays
isWeekendOnly
tags
weight
enabled
```

如果后续用表格维护抽奖奖池，建议列名如下：

```text
id
tier
kind
rarity
name
description
weight
effectType
effectPayload
enabled
```

如果后续用表格维护道具定义，建议列名如下：

```text
id
category
name
description
useTiming
effectType
effectPayload
stackable
maxUsePerUserPerDay
maxUsePerUserPerWeek
maxUsePerTeamPerDay
requiresAdminConfirmation
enabled
```

## 待确认

- `completionTextOptions` 是否允许用户自定义补充备注。
- 任务卡是否需要 `minAppVersion` 或 `seasonTheme` 字段。
- 奖池概率最终使用 tier 百分比 + tier 内权重，还是所有奖品统一权重。
- 真实福利券是否需要管理员兑换码或兑换记录备注字段。
