# GM-07 Backpack V1 Design

> 为“牛马补给站”补上第一个完整背包视图：用户可以看到自己通过抽奖获得的道具库存、分类、数量、效果说明、使用限制和是否需要管理员确认。这个 story 只做可见资产层，不实现道具使用、库存扣减、真实福利兑换申请、弱社交触发或企业微信。

## 背景

GM-06 让抽奖结果可以发放 `InventoryItem`。如果用户抽到道具后只能看到一个库存总数，奖励反馈会变弱，也不利于后续 GM-08 做道具使用。

GM-07 的目标是把“抽到了什么、有什么用、还能用几张”讲清楚：

```text
抽奖 -> InventoryItem -> 背包分类展示 -> 道具详情 -> 后续 GM-08 使用
```

背包第一版仍然放在 `牛马补给站` 内，不拆独立 `/bag` 页面。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-03-supply-station-shell-design.md`
- `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 用户可以在 `牛马补给站` 看到所有持有数量大于 `0` 的道具。
2. 背包按道具分类展示，避免一长串列表难以理解。
3. 每个道具能查看名称、描述、数量、效果、使用时机、使用限制和管理员确认要求。
4. 背包能区分“永久库存”和“今日待生效 / 已结算效果”。
5. 如果用户持有的 `itemId` 已不在本地配置中，也能显示成“未知补给”，不直接隐藏资产。
6. 零库存道具不出现在可用库存列表。
7. 背包详情不引入独立路由，仍在供应站页面内完成。

## 非目标

- 不实现 `POST /api/gamification/items/use`。
- 不扣减 `InventoryItem.quantity`。
- 不创建 `ItemUseRecord`。
- 不结算暴击、请假保护、任务刷新、抽奖保底或折扣。
- 不创建 `SocialInvitation`。
- 不创建 `RealWorldRedemption`。
- 不发送企业微信。
- 不新增独立 `/bag` 页面。
- 不做管理员后台。

## 信息架构

### 背包入口

背包仍位于 `牛马补给站` 右侧信息区或页面下半区。

第一屏应包含：

- 背包总库存数量。
- 已持有道具数量。
- 分类摘要。
- 今日待生效效果数量。

### 分类

GM-07 识别 GM-01 的 `ItemCategory`。

产品展示分组：

| category | 展示名 | 说明 |
| --- | --- | --- |
| `boost` | 暴击增益 | 影响个人资产、赛季贡献或维度收益的道具 |
| `protection` | 请假保护 | 保护连续性但不伪造健身收益的道具 |
| `social` | 弱社交 | 点名、邀请、团队互动类道具 |
| `lottery` | 抽奖辅助 | 保底、折扣等影响抽奖体验的道具 |
| `task` | 任务辅助 | 任务刷新、任务换班等四维任务相关道具 |
| `cosmetic` | 趣味收藏 | 称号、贴纸、展示类奖励 |
| `real_world` | 真实福利 | 瑞幸咖啡券等线下兑换类道具 |

说明：

- Roadmap 里最早列的是六类，但 GM-01 已经定义了 `task` 分类。
- GM-07 必须展示 `task_reroll_coupon`，因此保留 `task` 作为独立展示分组。
- 如果后续产品希望减少分组，可以把 `task` 合并进 `boost` 或 `lottery`，但 GM-07 不做合并。

### 道具卡片

每个道具卡片展示：

- 道具名。
- 持有数量。
- 分类标签。
- 简短效果。
- 是否需要管理员确认。
- 是否已下架或配置缺失。

卡片点击后展示详情面板。

### 详情面板

详情面板展示：

- `itemId`。
- 名称。
- 分类。
- 描述。
- 当前数量。
- 使用时机：今日生效、立即生效、手动兑换。
- 结构化效果的人类可读说明。
- 使用限制：每日、每周、团队每日、是否可叠加。
- 管理员确认要求。
- 后续使用入口提示。

GM-07 不显示可执行“使用”按钮。按钮会让用户误以为道具已经可用，应等 GM-08 实现真实使用接口后再开放。

## 数据设计

GM-07 不新增数据库模型。

读取数据：

- `InventoryItem`：当前库存数量。
- `ItemUseRecord`：今日待生效或已结算效果，用于展示“今日效果”区域。
- 本地 `ItemDefinition`：道具名称、描述、分类、效果、限制和管理员确认要求。

背包库存仍使用聚合模型：

```text
InventoryItem(userId, itemId, quantity)
```

核心规则：

- `quantity > 0` 的库存进入背包。
- `quantity <= 0` 的库存不进入背包。
- 未知 `itemId` 仍展示，但标记为“配置缺失”。
- 已禁用的道具如果用户仍持有，也展示，但标记为“已下架，不可使用”。
- `InventoryItem` 只表示永久库存。
- 今日待生效效果来自 `ItemUseRecord`，不与库存数量混在一起。

## Snapshot 扩展

GM-03 已有 `GamificationBackpackSummary` 摘要。GM-07 将它升级为 active 详情。

```ts
interface GamificationBackpackSummary {
  status: "active";
  totalQuantity: number;
  ownedItemCount: number;
  previewItems: GamificationBackpackItemSnapshot[];
  groups: GamificationBackpackGroupSnapshot[];
  todayEffects: GamificationTodayEffectSnapshot[];
  emptyMessage: string;
}
```

`previewItems` 继续保留，避免破坏 GM-03 供应站头部和摘要逻辑。

```ts
interface GamificationBackpackGroupSnapshot {
  category: ItemCategory | "unknown";
  label: string;
  totalQuantity: number;
  items: GamificationBackpackItemSnapshot[];
}
```

```ts
interface GamificationBackpackItemSnapshot {
  itemId: string;
  category: ItemCategory | "unknown";
  categoryLabel: string;
  name: string;
  description: string;
  quantity: number;
  useTiming: ItemUseTiming | "unknown";
  useTimingLabel: string;
  effectSummary: string;
  usageLimitSummary: string;
  stackable: boolean;
  requiresAdminConfirmation: boolean;
  enabled: boolean;
  knownDefinition: boolean;
}
```

```ts
interface GamificationTodayEffectSnapshot {
  id: string;
  itemId: string;
  name: string;
  status: "PENDING" | "SETTLED" | "EXPIRED" | "CANCELLED";
  statusLabel: string;
  effectSummary: string;
  createdAt: string;
  settledAt: string | null;
}
```

## 今日效果区

GM-07 不创建 `ItemUseRecord`，但可以读取今日已有记录。

第一版展示：

- `PENDING`：今日待生效。
- `SETTLED`：今日已结算。

`EXPIRED` 和 `CANCELLED` 默认不展示在供应站主界面，避免噪音。后续如果需要历史审计，可以放到独立背包页或管理员视图。

如果没有今日效果，展示：

```text
今天还没有待生效道具。GM-08 后可以先用道具，再去健身触发结算。
```

## API 设计

GM-07 不新增 API route。

继续使用：

```text
GET /api/gamification/state
```

该接口返回扩展后的 `snapshot.backpack`。

这样做的原因：

- 背包第一版只服务供应站页面。
- 页面已有统一 snapshot，不需要额外请求。
- GM-08 的 `items/use` 才需要独立 mutation API。

## 前端行为

`SupplyStation` 背包区从摘要列表升级为详情展示：

- 空背包展示明确空状态。
- 非空背包按分组展示道具。
- 默认选中第一个道具。
- 点击道具卡片切换详情。
- 详情面板展示效果和限制。
- 真实福利道具显示“需要管理员确认”。
- 已下架或未知配置道具显示风险提示。
- 今日效果区域与库存列表分开。

## 错误与边界

### 未知道具

如果 `InventoryItem.itemId` 找不到本地配置：

- 显示名称：`未知补给`。
- 描述：`这个道具配置已经不存在，请联系管理员确认。`
- 分类：`unknown`。
- 效果：`配置缺失，暂不可使用。`
- `knownDefinition = false`。
- 不隐藏该库存。

### 已下架道具

如果道具定义存在但 `enabled = false`：

- 仍显示库存。
- 标记为“已下架”。
- GM-08 不应允许使用，GM-07 只展示状态。

### 零库存

`quantity <= 0` 不进入 `groups` 和 `previewItems`。

### 抽奖券

抽奖券仍使用 `User.ticketBalance` 和 `LotteryTicketLedger`，不作为 `InventoryItem` 展示。

`lottery` 分类指“影响抽奖的道具”，例如保底升级券和九折购券卡，不是抽奖券本身。

## 测试策略

### 状态聚合测试

覆盖：

- 背包返回 active 状态。
- 持有多个分类道具时按分类分组。
- `quantity = 0` 的库存不展示。
- 未知 `itemId` 不被隐藏。
- 已禁用道具仍展示但 `enabled = false`。
- 今日 `PENDING` 和 `SETTLED` 使用记录进入 `todayEffects`。
- `EXPIRED` 和 `CANCELLED` 不进入供应站今日效果区。

### API 测试

覆盖：

- `GET /api/gamification/state` 返回扩展后的背包结构。
- 未登录仍返回 `401`。
- 空背包返回空分组和空状态文案。

### 前端测试

覆盖：

- 空背包展示空状态。
- 非空背包展示分类、数量和道具名。
- 点击道具后详情面板切换。
- 真实福利显示管理员确认。
- 今日待生效效果与永久库存分开展示。

## Acceptance Criteria

GM-07 完成时应满足：

1. `牛马补给站` 内有可用的背包详情区。
2. 用户能看到所有 `quantity > 0` 的库存道具和数量。
3. 库存按 `boost`、`protection`、`social`、`lottery`、`task`、`cosmetic`、`real_world`、`unknown` 分组展示。
4. 零库存道具不出现在可用库存列表。
5. 道具详情展示效果、使用时机、限制和管理员确认要求。
6. 永久库存与今日待生效 / 已结算效果分开展示。
7. 未知道具不被隐藏，并显示配置缺失提示。
8. GM-07 不新增独立 `/bag` 路由。
9. GM-07 不实现道具使用、库存扣减、兑换申请、弱社交触发、团队动态或企业微信。

## Follow-Up Stories

GM-07 解锁：

- `GM-08 Today-Effective Item Use`
- `GM-10 Real-World Redemption`
- `GM-12 Weak Social Invitations V1`
