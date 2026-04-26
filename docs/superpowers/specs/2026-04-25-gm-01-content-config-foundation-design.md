# GM-01 Content Config Foundation Design

> 为“牛马补给站”建立第一层本地内容配置基础：四维定义、任务卡、抽奖奖池、道具定义和配置校验。这个 story 只交付内容定义能力，不建数据库、不做页面、不接 API。

## 背景

“牛马补给站”后续会包含四维任务、抽奖、背包、道具、真实福利兑换和弱社交邀请。为了避免这些内容散落在页面、API 或数据库里，第一步需要先建立稳定的本地配置层。

这个 story 对应 `GM-01 Content Config Foundation`，是后续所有游戏化 story 的基础。

## 上游参考

本 story 依赖以下 master documents：

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`
- `design/game-card-design.md`

其中 `design/game-card-design.md` 只作为任务卡文案和内容风格参考，不作为最终字段规范。

## 产品目标

1. 为四维任务、奖池和道具提供统一配置来源。
2. 用稳定英文 key 承接业务逻辑，避免中文文案成为逻辑主键。
3. 提供配置校验能力，确保重复 ID、无效枚举、无效引用在开发阶段尽早暴露。
4. 让后续 story 可以直接消费配置，不需要重新定义字段结构。

## 非目标

- 不新增 Prisma 模型。
- 不写入数据库。
- 不创建 `牛马补给站` 页面。
- 不实现每日任务抽取。
- 不实现抽奖逻辑。
- 不实现背包库存。
- 不实现道具使用。
- 不接企业微信。

## 范围

本 story 只创建本地内容配置和校验 helper。

建议代码位置：

```text
content/gamification/dimensions.ts
content/gamification/task-cards.ts
content/gamification/reward-pool.ts
content/gamification/item-definitions.ts
lib/gamification/content.ts
__tests__/gamification-content.test.ts
```

## 内容模型

### 维度定义

四个维度使用稳定 key：

| key | 主标题 | 副标题 | 定位 |
| --- | --- | --- | --- |
| `movement` | 把电充绿 | 站一站，不然屁股长根 | 起身、走动、拉伸、短暂恢复 |
| `hydration` | 把尿喝白 | 喝白白，别把自己腌入味 | 补水、接水、无糖饮品 |
| `social` | 把事办黄 | 聊两句，让班味散一散 | 闲聊、吐槽、夸夸、情绪释放 |
| `learning` | 把股看红 | 看一点，给脑子补仓 | 信息输入、学习、看新闻 / 文章 / 工具 |

### 任务卡定义

任务卡使用 `TaskCardDefinition`：

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

第一版内容要求：

- 每个维度至少 `5` 张启用任务卡。
- ID 使用稳定英文格式，例如 `movement_001`。
- 不使用中文标题作为 ID。
- 每张卡至少有 `1` 个完成状态词。
- `weight` 第一版可以全部为 `1`。

### 抽奖奖品定义

抽奖奖品使用 `RewardDefinition`：

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

奖池分层沿用 master 规则：

| 分层 | 概率 |
| --- | ---: |
| 普通银子 | 45% |
| 实用道具 | 27% |
| 弱社交道具 | 18% |
| 趣味收藏 | 6% |
| 稀有暴击 | 4% |

GM-01 只负责定义奖品和权重，不实现随机抽取。

### 道具定义

道具使用 `ItemDefinition`：

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

GM-01 应至少定义后续 MVP 需要的道具：

- `任务换班券`
- `小暴击券`
- `保底升级券`
- `九折购券卡`
- `补水加班费`
- `站立补贴`
- `双倍牛马券`
- `赛季冲刺券`
- `银子暴富券`
- `健身请假券`
- `瑞幸咖啡券`
- `点名喝水令`
- `出门溜达令`
- `全员起立令`
- `今日闲聊令`
- `红盘情报令`
- `团队小喇叭`

## 校验规则

`lib/gamification/content.ts` 应提供配置读取和校验 helper。

最低校验要求：

- 维度 key 唯一。
- 任务卡 ID 唯一。
- 任务卡 `dimensionKey` 必须存在。
- 任务卡 `weight` 必须大于 `0`。
- 任务卡 `repeatCooldownDays` 必须大于等于 `0`。
- 任务卡 `completionTextOptions` 不能为空。
- 奖品 ID 唯一。
- 奖品 `weight` 必须大于 `0`。
- 奖品如果发放道具，则 `itemId` 必须存在于道具定义。
- 道具 ID 唯一。
- 道具 `maxUse*` 字段如果存在，必须大于 `0`。
- 禁止启用配置引用不存在的维度或道具。

## API 形态

GM-01 不提供 HTTP API。

本 story 只提供 TypeScript 内部 API，例如：

```ts
getGamificationDimensions()
getTaskCards()
getRewardDefinitions()
getItemDefinitions()
getItemDefinition(itemId)
validateGamificationContent()
```

这些 helper 后续会被 GM-02 以后 stories 使用。

## 测试策略

GM-01 应以纯单元测试为主，不需要 jsdom。

测试应覆盖：

- 四个维度存在，且 key 正确。
- 每个维度至少有 `5` 张启用任务卡。
- 配置校验通过当前内容。
- 重复任务卡 ID 会报错。
- 无效 `dimensionKey` 会报错。
- 发放不存在道具的奖品会报错。
- 道具使用上限为 `0` 或负数会报错。

## 验收标准

GM-01 完成后应满足：

1. 后续 story 可以通过稳定 helper 获取维度、任务卡、奖品和道具定义。
2. 当前配置通过校验。
3. 常见错误配置有测试覆盖。
4. 没有数据库迁移。
5. 没有页面或 API 变更。
6. `ROADMAP.md` 不需要因为 GM-01 单独变更，除非后续新增实施状态记录。

## 后续衔接

GM-01 完成后进入：

- `GM-02 Database Foundation`：使用这里的 config ID 设计数据库字段和服务约束。
- `GM-03 牛马补给站 Shell`：读取维度定义渲染页面骨架。
- `GM-04 Daily Tasks and Life Ticket`：读取任务卡进行每日分配。
- `GM-06 Lottery V1`：读取奖池和道具定义执行抽奖。
