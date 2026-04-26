# GM-13 Team Dynamics Integration Design

> 在主线 Team Dynamics v1 完成之后，把“牛马补给站”里的高价值游戏化事件沉淀到团队动态。GM-13 是桥接 story，不创建团队动态基础设施，也不改变游戏化主流程的成功条件。

## 背景

游戏化和主线团队动态是两条路线：

```text
主线 Team Dynamics
-> TeamDynamic 数据模型
-> createOrReuseTeamDynamic 服务
-> Navbar 喇叭入口
-> /dynamics 时间线页面

Gamification
-> 每日四维任务
-> 健身券 / 生活券
-> 抽奖 / 背包 / 道具
-> boost / 真实福利 / 弱社交
```

这两条线不应该互相重做对方的基础设施。主线先把团队动态的事件模型、展示页、未读状态和写入入口做好；GM-13 再把游戏化里“值得回看”的少量事件按主线约定写入团队动态。

## 上游参考

- `docs/superpowers/specs/2026-04-25-team-dynamics-design.md`
- `docs/superpowers/plans/2026-04-25-team-dynamics.md`
- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-09-boost-settlement-integration-design.md`
- `docs/superpowers/specs/2026-04-26-gm-12-weak-social-invitations-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 明确 GM-13 依赖主线 Team Dynamics v1，不能在游戏化线内重复创建 `TeamDynamic` 基础设施。
2. 将高价值游戏化事件写入团队动态，让团队成员能在喇叭和 `/dynamics` 回看。
3. 保持事件密度克制，只沉淀对团队有回看价值的事件。
4. 写入团队动态必须幂等，不能因为接口重试产生重复动态。
5. 团队动态写入失败不回滚抽奖、任务、boost 或弱社交主流程。
6. 普通游戏化动作仍留在各自模块展示，不污染团队动态。

## 非目标

- 不新增 `TeamDynamic` 或 `TeamDynamicReadState` Prisma 模型。
- 不新增 Navbar 喇叭入口。
- 不新增 `/dynamics` 页面。
- 不改变 Team Dynamics 主线已有筛选、未读和卡片结构。
- 不把每次四维任务完成写入团队动态。
- 不把每次普通抽奖小奖励写入团队动态。
- 不把每次普通弱社交点名写入团队动态。
- 不把企业微信推送结果写入团队动态。
- 不生成周报；GM-15 负责报表和周报整合。

## 依赖与就绪条件

GM-13 只能在以下能力存在后实施：

| 依赖 | 来源 | 必须具备的能力 |
| --- | --- | --- |
| Team Dynamics v1 | 主线 | `TeamDynamic` / `TeamDynamicReadState` 表已存在 |
| Team Dynamics service | 主线 | `createOrReuseTeamDynamic` 支持 `sourceType + sourceId` 去重 |
| Team Dynamics UI | 主线 | 喇叭面板和 `/dynamics` 可展示事件 |
| Lottery V1 | GM-06 | `LotteryDraw` 和 `LotteryDrawResult` 可持久化 |
| Daily Tasks | GM-04 | 能查询用户每日四维任务全完成状态 |
| Boost Settlement | GM-09 | `PunchRecord` 保存 boost 结算快照 |
| Weak Social | GM-12 | `SocialInvitation` 和 `SocialInvitationResponse` 可查询 |

如果主线 Team Dynamics 尚未完成，GM-13 不进入实现；游戏化线继续运行，不阻塞 GM-04 到 GM-12。

## 值得进入团队动态的事件

团队动态只沉淀少量高价值事件。

| 事件 | TeamDynamic type | 触发条件 | 价值判断 |
| --- | --- | --- | --- |
| 稀有抽奖奖励 | `GAME_RARE_PRIZE` | 抽中 `rare` 档、`real_world` 档，或配置标记为 `highlightInDynamics` 的奖励 | 团队可围观，适合增加游戏感 |
| 四维全完成连续里程碑 | `GAME_TASK_STREAK_MILESTONE` | 用户连续完成四维任务达到 `3 / 7 / 14 / 30` 天 | 鼓励健康办公习惯，不是普通每日流水 |
| boost 高光打卡 | `GAME_BOOST_MILESTONE` | 健身打卡结算时 boost 让个人银子或赛季收入至少翻倍 | 与赛季和个人收益相关，值得沉淀 |
| 团队小喇叭 | `GAME_TEAM_BROADCAST` | 使用 `team_broadcast_coupon` 创建全队广播 | 道具本身就是公开表达，适合进入团队动态 |
| 弱社交多人响应 | `GAME_SOCIAL_MOMENT` | 全队邀请当天响应人数达到 `2` 人 | 小团队规模下，2 人响应已经构成团队时刻 |

## 不进入团队动态的事件

- 普通四维任务单项完成。
- 普通健身券或生活券领取。
- 普通抽奖获得金币、小道具或常见 boost。
- 单人点名类弱社交邀请创建。
- 单人点名类弱社交响应。
- 全队邀请只有 1 人响应。
- boost 只提供 `1.5x` 个人银子且没有赛季贡献高光。
- 道具使用失败、企业微信发送失败、抽奖券不足等错误事件。

## TeamDynamic 类型扩展

GM-13 需要扩展主线 `TEAM_DYNAMIC_TYPES`：

```ts
export const TEAM_DYNAMIC_TYPES = {
  WEEKLY_REPORT_CREATED: "WEEKLY_REPORT_CREATED",
  SEASON_STARTED: "SEASON_STARTED",
  SEASON_TARGET_REACHED: "SEASON_TARGET_REACHED",
  SEASON_ENDED: "SEASON_ENDED",
  TEAM_FULL_ATTENDANCE: "TEAM_FULL_ATTENDANCE",
  STREAK_MILESTONE: "STREAK_MILESTONE",
  COFFEE_SUMMARY: "COFFEE_SUMMARY",
  BOARD_NOTICE_REFERENCE: "BOARD_NOTICE_REFERENCE",
  GAME_RARE_PRIZE: "GAME_RARE_PRIZE",
  GAME_TASK_STREAK_MILESTONE: "GAME_TASK_STREAK_MILESTONE",
  GAME_BOOST_MILESTONE: "GAME_BOOST_MILESTONE",
  GAME_TEAM_BROADCAST: "GAME_TEAM_BROADCAST",
  GAME_SOCIAL_MOMENT: "GAME_SOCIAL_MOMENT",
} as const;
```

这些类型仍然写入同一张 `TeamDynamic` 表，不新增游戏化专属动态表。

## 事件来源与去重

GM-13 统一通过主线 `createOrReuseTeamDynamic` 写入事件，并使用稳定 `sourceType + sourceId` 去重。

| TeamDynamic type | sourceType | sourceId |
| --- | --- | --- |
| `GAME_RARE_PRIZE` | `lottery_draw_result` | `LotteryDrawResult.id` |
| `GAME_TASK_STREAK_MILESTONE` | `daily_task_streak` | `${userId}:${milestone}:${dayKey}` |
| `GAME_BOOST_MILESTONE` | `punch_record_boost` | `PunchRecord.id` |
| `GAME_TEAM_BROADCAST` | `social_invitation_broadcast` | `SocialInvitation.id` |
| `GAME_SOCIAL_MOMENT` | `social_invitation_moment` | `SocialInvitation.id` |

说明：

- `GAME_TEAM_BROADCAST` 和 `GAME_SOCIAL_MOMENT` 使用不同 `sourceType`，允许同一个全队邀请先成为广播动态，后续达到多人响应时再生成社交时刻动态。
- `GAME_TASK_STREAK_MILESTONE` 的 `sourceId` 包含 `dayKey`，同一里程碑在不同周期重新达成时可以再次沉淀。

## Payload 快照

动态 payload 保存渲染所需的快照，不在展示时重新拼接关键业务语义。

### GAME_RARE_PRIZE

```json
{
  "userId": "user_123",
  "username": "li",
  "displayName": "李牛马",
  "drawId": "draw_123",
  "resultId": "result_123",
  "rewardId": "luckin_coffee_coupon",
  "rewardName": "瑞幸咖啡券",
  "rewardTier": "rare",
  "dayKey": "2026-04-26"
}
```

### GAME_TASK_STREAK_MILESTONE

```json
{
  "userId": "user_123",
  "username": "li",
  "displayName": "李牛马",
  "milestone": 7,
  "dayKey": "2026-04-26",
  "dimensions": ["movement", "hydration", "social", "learning"]
}
```

### GAME_BOOST_MILESTONE

```json
{
  "userId": "user_123",
  "username": "li",
  "displayName": "李牛马",
  "punchRecordId": "punch_123",
  "itemUseRecordId": "use_123",
  "itemId": "double_niuma_coupon",
  "itemName": "双倍牛马券",
  "baseAssetAwarded": 40,
  "boostAssetBonus": 40,
  "baseSeasonContribution": 40,
  "boostSeasonBonus": 40,
  "dayKey": "2026-04-26"
}
```

### GAME_TEAM_BROADCAST

```json
{
  "senderUserId": "user_123",
  "senderName": "李牛马",
  "invitationId": "invitation_123",
  "itemId": "team_broadcast_coupon",
  "message": "今天都站起来，别让椅子以为自己赢了。",
  "dayKey": "2026-04-26"
}
```

### GAME_SOCIAL_MOMENT

```json
{
  "invitationId": "invitation_123",
  "invitationType": "TEAM_STANDUP",
  "senderUserId": "user_123",
  "senderName": "李牛马",
  "responseCount": 2,
  "responders": [
    { "userId": "user_456", "displayName": "罗牛马" },
    { "userId": "user_789", "displayName": "刘牛马" }
  ],
  "dayKey": "2026-04-26"
}
```

## 写入时机

### 抽奖

GM-06 抽奖事务完成后，检查每个 `LotteryDrawResult`：

- 命中高光奖励则写 `GAME_RARE_PRIZE`。
- 普通金币、普通券、普通道具不写。
- 团队动态写入失败不影响抽奖响应。

### 四维任务

GM-04 生活券领取成功后，检查用户四维全完成连续天数：

- 达到 `3 / 7 / 14 / 30` 天才写 `GAME_TASK_STREAK_MILESTONE`。
- 单日完成四维但未达到里程碑不写。
- 同一天重复领取被 GM-04 拒绝，因此不会重复写；额外依赖 `sourceType + sourceId` 去重。

### boost

GM-09 boost 结算成功后，检查 `PunchRecord.boostSummaryJson`：

- `boostAssetBonus >= baseAssetAwarded` 或 `boostSeasonBonus >= baseSeasonContribution` 时写 `GAME_BOOST_MILESTONE`。
- `double_niuma_coupon` 必定满足高光条件。
- `small_boost_coupon` 通常不写，除非配置显式标记高光。

### 团队小喇叭

GM-12 使用 `team_broadcast_coupon` 创建 `TEAM_BROADCAST` 全队邀请后，写 `GAME_TEAM_BROADCAST`。

### 弱社交多人响应

GM-12 全队邀请响应成功后，统计当天响应人数：

- 响应人数达到 `2` 时写 `GAME_SOCIAL_MOMENT`。
- 第 3 人、第 4 人继续响应不重复写同一个 `GAME_SOCIAL_MOMENT`。
- 单人点名邀请不写。

## 失败处理

团队动态是下游沉淀，不是游戏化事务的成功条件。

规则：

- 游戏化主事务先完成，再尝试写团队动态。
- 团队动态写入失败时，主 API 仍返回游戏化成功结果。
- 失败只记录服务端 warning，不补偿、不重试、不返还资源。
- `createOrReuseTeamDynamic` 自身的去重失败应作为服务错误暴露给测试，但生产调用由 `safeCreateGameTeamDynamic` 捕获。

这样避免“抽中了奖却因为动态写入失败导致抽奖失败”的反直觉体验。

## UI 表现

GM-13 不新增独立页面，只让主线团队动态卡片能识别游戏化事件。

建议标签：

| Type | 标签 | Tone |
| --- | --- | --- |
| `GAME_RARE_PRIZE` | 补给高光 | `highlight` |
| `GAME_TASK_STREAK_MILESTONE` | 摸鱼自律 | `success` |
| `GAME_BOOST_MILESTONE` | 暴击打卡 | `highlight` |
| `GAME_TEAM_BROADCAST` | 团队小喇叭 | `default` |
| `GAME_SOCIAL_MOMENT` | 牛马互动 | `success` |

标题示例：

- `li 抽中了瑞幸咖啡券`
- `li 连续 7 天完成四维摸鱼任务`
- `li 的双倍牛马券生效，今日收益翻倍`
- `li 发了一条团队小喇叭`
- `全员起立令收到 2 个响应`

## API 影响

GM-13 不新增公开 API。

它只扩展以下既有业务写入点：

- `POST /api/gamification/lottery/draw`
- `POST /api/gamification/tasks/claim-life-ticket`
- `POST /api/board/punch`
- `POST /api/gamification/items/use`
- `POST /api/gamification/social/respond`

所有 API 的核心响应结构保持兼容，可以在响应中附带可选字段：

```ts
teamDynamic?: {
  status: "CREATED" | "EXISTING" | "SKIPPED" | "FAILED";
  type?: string;
}
```

前端不依赖这个字段才能展示主结果。

## 测试策略

### Helper 测试

覆盖：

- 游戏化 TeamDynamic 类型被主线 helper 接受。
- 游戏化事件 meta 返回正确标签和 tone。
- 高光奖励判断只放行稀有和显式高光奖励。
- boost 高光判断只放行翻倍收益或显式高光 item。
- 四维里程碑只认可 `3 / 7 / 14 / 30`。

### Service 测试

覆盖：

- `emitRarePrizeDynamic` 使用 `LotteryDrawResult.id` 幂等写入。
- `emitTaskStreakDynamic` 使用 `userId:milestone:dayKey` 幂等写入。
- `emitBoostDynamic` 使用 `PunchRecord.id` 幂等写入。
- `emitTeamBroadcastDynamic` 和 `emitSocialMomentDynamic` 可对同一 `SocialInvitation.id` 生成不同动态。
- `safeCreateGameTeamDynamic` 捕获错误并返回 `FAILED`。

### Integration 测试

覆盖：

- 十连抽中稀有奖励后写入一条 `GAME_RARE_PRIZE`。
- 连续 3 天四维全完成并领取生活券后写入 `GAME_TASK_STREAK_MILESTONE`。
- `double_niuma_coupon` 结算后写入 `GAME_BOOST_MILESTONE`。
- 使用 `team_broadcast_coupon` 后写入 `GAME_TEAM_BROADCAST`。
- 全队邀请第 2 个成员响应后写入 `GAME_SOCIAL_MOMENT`。
- 团队动态写入失败时，原游戏化 API 仍成功。

## Acceptance Criteria

GM-13 完成时应满足：

1. 游戏化不会创建或维护独立团队动态基础设施。
2. 五类高价值游戏化事件可以写入主线 `TeamDynamic`。
3. 普通游戏化动作不会污染团队动态。
4. 所有游戏化动态写入都通过 `sourceType + sourceId` 幂等去重。
5. 同一全队邀请可以同时拥有 `GAME_TEAM_BROADCAST` 和 `GAME_SOCIAL_MOMENT` 两类动态。
6. 团队动态写入失败不回滚抽奖、任务、boost、道具使用或弱社交响应。
7. 喇叭面板和 `/dynamics` 能显示游戏化事件标签、标题、摘要和时间。
8. GM-13 不新增公开页面，也不改变 Team Dynamics 主线入口结构。

## Follow-Up Stories

GM-13 解锁：

- `GM-15 Weekly Report / Report Center Integration`
- 后续企业微信周报可以复用这些 TeamDynamic 事件作为素材源
