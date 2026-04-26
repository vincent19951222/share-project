# GM-15 Weekly Report / Report Center Integration Design

> 把“牛马补给站”产生的数据接入战报中心，并提供一份可手动发布的游戏化周报。GM-15 只做汇总、展示和发布，不新增抽奖、道具、奖励或任务规则。

## 背景

GM-04 到 GM-13 已经让牛马补给站形成闭环：

```text
四维任务 -> 生活券
健身打卡 -> 健身券
抽奖 -> 银子 / 道具 / 真实福利
背包道具 -> boost / 请假 / 弱社交 / 兑换
高价值事件 -> 团队动态
```

到这一步，数据已经足够支撑复盘：

- 这周大家有没有做四维任务？
- 抽奖券主要来自健身还是四维任务？
- 抽奖消耗和高光奖励有多少？
- boost 有没有真的提高个人银子和赛季贡献？
- 弱社交有没有形成团队互动？
- 哪些高价值事件值得写入周报？

GM-15 的目标不是做一个大型 BI 系统，而是把这些数据变成战报中心里一块可读、可分享、可沉淀的轻量周摘要。

## 上游参考

- `docs/superpowers/specs/2026-04-20-report-center-light-dashboard-design.md`
- `docs/superpowers/specs/2026-04-25-team-dynamics-design.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/specs/2026-04-25-gm-05-fitness-ticket-hook-design.md`
- `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-08-today-effective-item-use-design.md`
- `docs/superpowers/specs/2026-04-26-gm-09-boost-settlement-integration-design.md`
- `docs/superpowers/specs/2026-04-26-gm-10-real-world-redemption-design.md`
- `docs/superpowers/specs/2026-04-26-gm-11-enterprise-wechat-sender-design.md`
- `docs/superpowers/specs/2026-04-26-gm-12-weak-social-invitations-design.md`
- `docs/superpowers/specs/2026-04-26-gm-13-team-dynamics-integration-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 在战报中心展示本周牛马补给站摘要。
2. 统计四维任务、抽奖券、抽奖、道具、boost、弱社交和高价值动态。
3. 提供可读的团队洞察，不展示原始流水表。
4. 管理员可以手动发布本周游戏化周报。
5. 发布周报后写入主线 `TeamDynamic`，方便团队后续回看。
6. 可选通过 GM-11 企业微信 sender 发送周报摘要。
7. 发布失败不能改变游戏化业务数据。
8. 不新增任何经济奖励和用户资产变化。

## 非目标

- 不做自动定时周报。
- 不做日报、月报、季度报。
- 不做图像导出、PDF 导出或长图生成。
- 不做复杂日期范围选择器。
- 不做排行榜页面。
- 不做跨团队汇总。
- 不新增 Prisma 报表表。
- 不修改抽奖券、抽奖、背包、boost、弱社交或兑换状态机。
- 不因为周报发布给任何人发银子、发券或推进赛季。
- 不把普通原始流水逐条展示给用户。

## 依赖与就绪条件

| 依赖 | 来源 | 必须具备的能力 |
| --- | --- | --- |
| Report Center | 主线 | 当前 `战报中心` tab 可展示组件 |
| Daily tasks | GM-04 | `DailyTaskAssignment` 和生活券流水存在 |
| Fitness ticket hook | GM-05 | 健身券流水存在 |
| Lottery | GM-06 | `LotteryDraw` / `LotteryDrawResult` 存在 |
| Item use / boost | GM-08 / GM-09 | `ItemUseRecord` 和 boost 结算快照存在 |
| Weak social | GM-12 | `SocialInvitation` / `SocialInvitationResponse` 存在 |
| Team Dynamics | 主线 + GM-13 | 可写 `WEEKLY_REPORT_CREATED` 或游戏化周报动态 |
| Enterprise WeChat | GM-11 | 可选发送企业微信摘要 |

如果 Team Dynamics 尚未完成，战报中心周摘要可以展示，但“发布周报”按钮不应开放。按当前 story 顺序，GM-15 默认在 GM-13 之后实施。

## 周期规则

GM-15 第一版只支持自然周。

规则：

- 周期按 Asia/Shanghai 计算。
- 周一为一周开始。
- 周日为一周结束。
- 当前周未结束时，统计从周一到今天。
- 查询历史周时，统计完整周一到周日。
- `weekStartDayKey` 使用 `YYYY-MM-DD`，必须是上海日期下的周一。

示例：

```text
2026-04-20 周一 -> weekStartDayKey = 2026-04-20
2026-04-26 周日 -> weekEndDayKey = 2026-04-26
```

## 汇总指标

### 1. 四维任务

统计：

- `expectedTaskCount = teamMemberCount * daysInWindow * 4`
- `completedTaskCount`
- `taskCompletionRate`
- `allFourCompletionDays`
- `lifeTicketsEarned`
- `topTaskMembers`

规则：

- 未创建 `DailyTaskAssignment` 视为未完成。
- `allFourCompletionDays` 表示“某用户某天四维全部完成”的次数。
- `lifeTicketsEarned` 以 `LotteryTicketLedger.reason = DAILY_TASKS_GRANTED` 为准。

### 2. 抽奖券

统计：

- `fitnessTicketsEarned`
- `lifeTicketsEarned`
- `paidTicketsBought`
- `ticketsSpent`
- `netTicketChange`

来源：

- `FITNESS_PUNCH_GRANTED`
- `DAILY_TASKS_GRANTED`
- `COIN_PURCHASE_GRANTED`
- `LOTTERY_DRAW_SPENT`

说明：

- 抽奖券余额是当前资产，不直接作为周报指标。
- 周报看的是本周流入、流出和消耗。

### 3. 抽奖

统计：

- `drawCount`
- `singleDrawCount`
- `tenDrawCount`
- `coinSpent`
- `coinRewarded`
- `rareRewardCount`
- `realWorldRewardCount`
- `highlightRewards`

说明：

- `highlightRewards` 只展示少量高光，不展示所有普通奖励。
- 高光优先级：真实福利 > 稀有暴击 > 其他 `highlightInDynamics` 奖励。

### 4. 道具与 boost

统计：

- `itemUseCount`
- `boostUseCount`
- `boostAssetBonusTotal`
- `boostSeasonBonusTotal`
- `leaveCouponUseCount`
- `pendingItemUseCount`
- `expiredItemUseCount`

说明：

- boost 奖励以 `PunchRecord.boostAssetBonus` 和 `PunchRecord.boostSeasonBonus` 为准。
- 请假券不算健身，不计入 boost。
- 道具统计只用于复盘，不产生补偿。

### 5. 弱社交

统计：

- `socialInvitationCount`
- `directInvitationCount`
- `teamInvitationCount`
- `socialResponseCount`
- `socialResponseRate`
- `topSocialMoments`

规则：

- 弱社交响应不产生奖励。
- 周报只展示互动热度，不评价个人“服从程度”。
- 单人点名不做羞辱式排行。

### 6. 团队动态高光

统计：

- `gameDynamicCount`
- `rarePrizeDynamicCount`
- `boostDynamicCount`
- `socialMomentDynamicCount`
- `highlightDynamics`

来源：

- GM-13 写入的 `GAME_*` TeamDynamic。

用途：

- 给周报提供“这周值得回看”的高光素材。

## 战报中心 UI

在现有 `ReportCenter` 中新增一块：

```text
牛马补给周报
```

建议布局：

1. 周报头部：本周日期范围、生成时间、发布状态。
2. 四个指标卡：
   - 四维完成率
   - 本周发券
   - 抽奖次数
   - 弱社交响应
3. 三个摘要块：
   - `补给站节奏`
   - `抽奖机播报`
   - `办公室互动`
4. 高光列表：
   - 稀有奖励
   - boost 高光
   - 多人响应
5. 管理员操作：
   - `发布到团队动态`
   - `发布并发送企业微信`

普通成员能看摘要，不能发布周报。

## 周报文案

文案应保持轻松，但不能引入压力。

示例：

```text
本周四维任务完成率 68%，补给站还在热机。健身券 12 张，生活券 8 张，抽奖机一共转了 16 次。
```

```text
本周弱社交发起 5 次，收到 3 个响应。可以忽略，但有人响应就说明办公室还没完全冷掉。
```

避免：

- `谁拖后腿`
- `谁不配合`
- `谁浪费了道具`
- `必须完成`

## API 设计

### 读取周报摘要

```text
GET /api/gamification/reports/weekly?weekStart=2026-04-20
```

认证：

- 登录用户可访问。
- 只返回当前用户所在团队数据。

Response:

```ts
interface GamificationWeeklyReportSnapshot {
  teamId: string;
  weekStartDayKey: string;
  weekEndDayKey: string;
  generatedAt: string;
  published: boolean;
  publishedDynamicId: string | null;
  metrics: GamificationWeeklyReportMetrics;
  highlights: GamificationWeeklyReportHighlight[];
  summaryCards: GamificationWeeklyReportCard[];
}
```

如果不传 `weekStart`，默认当前上海自然周。

### 发布周报

```text
POST /api/gamification/reports/weekly/publish
```

Request:

```json
{
  "weekStartDayKey": "2026-04-20",
  "sendEnterpriseWechat": false
}
```

规则：

- 只有管理员可以发布。
- 发布会创建或复用一条 `TeamDynamic`。
- `sourceType = "gamification_weekly_report"`
- `sourceId = "${teamId}:${weekStartDayKey}"`
- 重复发布返回已有动态，不重复创建。
- 如果 `sendEnterpriseWechat = true`，复用 GM-11 sender 发送摘要。
- 企业微信发送失败不回滚 TeamDynamic。
- 发布周报不修改任何游戏化业务数据。

## TeamDynamic 写入

周报发布写入主线 Team Dynamics。

推荐：

```text
type = WEEKLY_REPORT_CREATED
sourceType = gamification_weekly_report
sourceId = ${teamId}:${weekStartDayKey}
importance = high
```

`payloadJson` 保存周报快照：

```json
{
  "version": 1,
  "kind": "gamification_weekly_report",
  "weekStartDayKey": "2026-04-20",
  "weekEndDayKey": "2026-04-26",
  "metrics": {},
  "highlights": [],
  "summaryCards": [],
  "publishedByUserId": "user_123"
}
```

说明：

- TeamDynamic 是归档入口。
- 不新增 `WeeklyReport` 表。
- 重算周报时可以显示最新数据；已发布动态保留发布时快照。

## 企业微信发送

如果管理员选择发送企业微信：

```ts
sendEnterpriseWechatMessage({
  purpose: "GAMIFICATION_WEEKLY_REPORT",
  targetType: "TeamDynamic",
  targetId: teamDynamic.id,
  message,
})
```

规则：

- 未配置 webhook 时返回 `SKIPPED`。
- 发送失败返回 `FAILED`。
- `SKIPPED` 或 `FAILED` 不回滚 TeamDynamic。
- 企业微信消息只发摘要和链接，不发完整长报表。

## 错误处理

| 场景 | 行为 |
| --- | --- |
| 未登录 | `401 UNAUTHORIZED` |
| 非管理员发布 | `403 FORBIDDEN` |
| `weekStartDayKey` 不是有效周一 | `400 INVALID_WEEK_START` |
| TeamDynamic 创建失败 | 发布接口 `500 WEEKLY_REPORT_PUBLISH_FAILED` |
| 企业微信失败 | 发布成功，返回 `wechat.status = FAILED` |

说明：

- 读取周报失败不影响主战报中心其他模块。
- 前端应显示游戏化周报局部错误，不让整个战报中心空白。

## 测试策略

### 服务层测试

覆盖：

- 默认当前周计算正确。
- 历史周开始和结束日期正确。
- 四维任务完成率按 expected task count 计算。
- 生活券、健身券、付费券、消耗券统计正确。
- 单抽、十连、稀有奖励、真实福利奖励统计正确。
- boost 个人银子 bonus 和赛季 bonus 汇总正确。
- 弱社交邀请和响应率统计正确。
- GM-13 高光动态能进入 highlights。
- 无数据时返回安全空状态。

### API 测试

覆盖：

- 未登录读取返回 `401`。
- 登录读取只返回本队数据。
- 非管理员发布返回 `403`。
- 管理员发布创建 `WEEKLY_REPORT_CREATED`。
- 重复发布复用已有 TeamDynamic。
- 企业微信失败不回滚发布。

### UI 测试

覆盖：

- 战报中心展示 `牛马补给周报`。
- 指标卡展示四维完成率、发券、抽奖、弱社交响应。
- 无数据时展示空状态。
- API 失败时展示局部错误。
- 管理员看到发布按钮，普通成员看不到发布按钮。

## Acceptance Criteria

GM-15 完成时应满足：

1. 战报中心能展示本周牛马补给站摘要。
2. 周报统计覆盖四维任务、抽奖券、抽奖、道具、boost、弱社交和游戏化高光动态。
3. 普通成员可读，管理员可发布。
4. 发布周报写入 `TeamDynamic`，并通过 `sourceType + sourceId` 去重。
5. 可选企业微信发送失败不回滚周报发布。
6. 周报不新增任何奖励，不修改任何游戏化业务数据。
7. 无数据、部分数据、API 失败都有可读状态。

## Follow-Up Stories

GM-15 之后可以单独讨论：

- 自动每周定时推送。
- 周报长图或 PDF。
- 更复杂的历史周报归档。
- 多周趋势对比。
- 真实运营活动复盘。
