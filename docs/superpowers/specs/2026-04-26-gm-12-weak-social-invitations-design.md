# GM-12 Weak Social Invitations V1 Design

> 让弱社交道具真正可用：用户可以消耗社交道具发起点名或全队邀请，系统内创建 `SocialInvitation`，通过企业微信机器人发送提醒；对方可以当天响应，也可以忽略。V1 不发银子、不强制完成、不写团队动态。

## 背景

GM-07 让用户能看到社交道具库存。GM-08 明确把 `social_invitation` 留给 GM-12。GM-11 已经提供可复用的企业微信 sender。

GM-12 负责把“弱社交道具”从库存资产变成团队互动：

```text
背包社交道具 -> 使用道具 -> 创建 ItemUseRecord + SocialInvitation
                         -> 企业微信提醒
                         -> 对方当天响应 / 忽略
                         -> 系统保留响应素材
```

这个 story 的重点是轻量互动，不是考核系统。被邀请的人可以忽略，不扣分；响应只产生记录和展示素材，不产生经济收益。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-08-today-effective-item-use-design.md`
- `docs/superpowers/specs/2026-04-26-gm-11-enterprise-wechat-sender-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 支持从背包使用弱社交道具。
2. 使用社交道具后立即扣减库存。
3. 使用社交道具后创建 `ItemUseRecord.SETTLED`。
4. 使用社交道具后创建 `SocialInvitation`。
5. 个人点名类道具需要选择同队成员。
6. 全队类道具不需要选择单个成员。
7. 使用成功后通过 GM-11 sender 发送企业微信提醒。
8. 企业微信发送失败不回滚本地邀请。
9. 被邀请成员可以当天响应。
10. 未响应邀请过当天自动失效。
11. V1 弱社交响应不发银子、不发抽奖券、不推进赛季。
12. 供应站展示我发出的、我收到的、全队邀请和响应状态。

## 非目标

- 不实现企业微信成员 @ 或手机号映射。
- 不实现企业微信回调。
- 不实现企业微信按钮响应。
- 不给弱社交响应发银子或抽奖券。
- 不把普通点名写入团队动态。
- 不生成周报，只保存 GM-15 可复用的数据。
- 不做用户免打扰牌。
- 不做弱社交撤销。
- 不做图片、语音、附件或复杂富文本。
- 不做多群或团队级 webhook 配置；继续使用 GM-11 的全局 webhook。

## 支持的道具

GM-12 第一版支持 GM-01 已定义的 6 个社交道具。

| itemId | 名称 | invitationType | 目标 | 规则 |
| --- | --- | --- | --- | --- |
| `drink_water_ping` | 点名喝水令 | `DRINK_WATER` | 单个成员 | 每人每天最多发起 2 次 |
| `walk_ping` | 出门溜达令 | `WALK_AROUND` | 单个成员 | 每人每天最多发起 2 次 |
| `chat_ping` | 今日闲聊令 | `CHAT` | 单个成员 | 每人每天最多发起 2 次 |
| `share_info_ping` | 红盘情报令 | `SHARE_INFO` | 单个成员 | 每人每天最多发起 2 次 |
| `team_standup_ping` | 全员起立令 | `TEAM_STANDUP` | 全队 | 每队每天最多 1 次 |
| `team_broadcast_coupon` | 团队小喇叭 | `TEAM_BROADCAST` | 全队 | 每队每天最多 1 次 |

服务端通过本地 `ItemDefinition` 校验：

- `enabled = true`
- `category = "social"`
- `useTiming = "instant"`
- `effect.type = "social_invitation"`

未知、下架、非社交类道具不能进入 GM-12 流程。

## 目标规则

### 单人邀请

适用于：

- `DRINK_WATER`
- `WALK_AROUND`
- `CHAT`
- `SHARE_INFO`

规则：

- 请求必须提供 `recipientUserId`。
- recipient 必须属于同一团队。
- sender 不能邀请自己。
- 同一 sender、同一天、同一 invitationType、同一 recipient 最多发起一次。
- 被邀请人可以响应，也可以忽略。
- 只有 recipient 可以响应。

### 全队邀请

适用于：

- `TEAM_STANDUP`
- `TEAM_BROADCAST`

规则：

- `recipientUserId = null`。
- 同队成员都能在供应站看到。
- sender 不能响应自己发起的全队邀请。
- 同一成员对同一全队邀请最多响应一次。
- 全队邀请允许多人响应，因此需要独立响应记录。
- 全队邀请达到首个响应后可以标记为 `RESPONDED`，但当天内仍允许其他成员继续响应。

## 数据模型

GM-02 已有 `SocialInvitation`。GM-12 为了支持全队邀请的多成员响应，需要新增响应表。

### SocialInvitation

沿用 GM-02：

```prisma
model SocialInvitation {
  id                  String        @id @default(cuid())
  teamId              String
  team                Team          @relation(fields: [teamId], references: [id])
  senderUserId        String
  senderUser          User          @relation("SocialInvitationSender", fields: [senderUserId], references: [id])
  recipientUserId     String?
  recipientUser       User?         @relation("SocialInvitationRecipient", fields: [recipientUserId], references: [id])
  invitationType      String
  itemUseRecordId     String        @unique
  itemUseRecord       ItemUseRecord @relation(fields: [itemUseRecordId], references: [id])
  status              String
  dayKey              String
  message             String
  wechatWebhookSentAt DateTime?
  respondedAt         DateTime?
  expiredAt           DateTime?
  rewardSettledAt     DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([teamId, dayKey, status])
  @@index([senderUserId, dayKey])
  @@index([recipientUserId, dayKey, status])
}
```

状态：

- `PENDING`
- `RESPONDED`
- `EXPIRED`
- `CANCELLED`

GM-12 不实现用户主动取消，因此 `CANCELLED` 只是保留状态，不提供 API。

### SocialInvitationResponse

新增：

```prisma
model SocialInvitationResponse {
  id                String           @id @default(cuid())
  invitationId      String
  invitation        SocialInvitation @relation(fields: [invitationId], references: [id])
  teamId            String
  team              Team             @relation(fields: [teamId], references: [id])
  responderUserId   String
  responderUser     User             @relation("SocialInvitationResponder", fields: [responderUserId], references: [id])
  dayKey            String
  responseText      String?
  displayPayloadJson String?
  createdAt         DateTime         @default(now())

  @@unique([invitationId, responderUserId])
  @@index([teamId, dayKey, createdAt])
  @@index([responderUserId, dayKey])
}
```

说明：

- 单人邀请通常只有一条 response。
- 全队邀请可以有多条 response。
- `displayPayloadJson` 保存后续周报/动态可用素材，不在 GM-12 写团队动态。
- 不保存经济奖励字段，因为 V1 不发奖励。

## ItemUseRecord 规则

社交道具是立即消耗型道具：

```text
InventoryItem.quantity -1
ItemUseRecord.status = SETTLED
ItemUseRecord.targetType = SOCIAL_INVITATION
ItemUseRecord.targetId = SocialInvitation.id
SocialInvitation.status = PENDING
```

说明：

- 使用成功即扣库存。
- 企业微信发送失败也不返还库存。
- 社交邀请创建失败则整个事务回滚，不扣库存。
- `effectSnapshotJson` 保存使用时的 item effect。

## 企业微信发送

GM-12 使用 GM-11：

```ts
sendEnterpriseWechatMessage({
  teamId,
  purpose: "WEAK_SOCIAL_INVITATION",
  targetType: "SocialInvitation",
  targetId: invitation.id,
  message,
})
```

发送成功：

- `SocialInvitation.wechatWebhookSentAt = now`
- GM-11 写 `EnterpriseWechatSendLog.SENT`

发送失败或跳过：

- `SocialInvitation.wechatWebhookSentAt = null`
- GM-11 写 `EnterpriseWechatSendLog.FAILED` 或 `SKIPPED`
- 邀请仍然存在
- API 返回成功，同时带上 `wechat.status`

企业微信文案示例：

```text
【牛马补给站】
luo 使用了点名喝水令，点名 li 喝水。
今天的尿色 KPI 靠你守住了。
```

```text
【牛马补给站】
li 发起了全员起立令。
请站起来走一圈，让工位以为你离职了。
```

GM-12 不做精准 @，因为 GM-11 没有企业微信用户映射。

## API 设计

### 使用社交道具

继续复用 GM-08：

```text
POST /api/gamification/items/use
```

Request：

```json
{
  "itemId": "drink_water_ping",
  "target": {
    "recipientUserId": "user_id",
    "message": "喝白白，别把自己腌入味"
  }
}
```

全队邀请：

```json
{
  "itemId": "team_standup_ping",
  "target": {
    "message": "全员起立，屁股离线两分钟"
  }
}
```

Response 增加：

```json
{
  "itemUse": {
    "itemId": "drink_water_ping",
    "status": "SETTLED",
    "targetType": "SOCIAL_INVITATION",
    "targetId": "invitation_id",
    "inventoryConsumed": true,
    "message": "点名已发出，对方可以选择响应或忽略。"
  },
  "socialInvitation": {
    "id": "invitation_id",
    "status": "PENDING",
    "wechatStatus": "SENT"
  },
  "snapshot": {}
}
```

### 响应邀请

新增：

```text
POST /api/gamification/social/respond
```

Request：

```json
{
  "invitationId": "invitation_id",
  "responseText": "已喝水"
}
```

规则：

- 未登录返回 `401`。
- 找不到邀请或跨团队返回 `404`。
- 已过当天返回 `409`。
- 已 `EXPIRED` / `CANCELLED` 返回 `409`。
- 单人邀请只能由 recipient 响应。
- 全队邀请可由同队非 sender 响应。
- 同一用户不能重复响应同一邀请。

Response：

```json
{
  "response": {
    "id": "response_id",
    "invitationId": "invitation_id",
    "status": "RESPONDED"
  },
  "snapshot": {}
}
```

## 过期规则

弱社交邀请当天有效，以 Asia/Shanghai `dayKey` 为准。

GM-12 不做定时任务，采用懒过期：

- 打开供应站时过期当前用户相关的旧 `PENDING` 邀请。
- 使用社交道具前过期当前用户相关的旧 `PENDING` 邀请。
- 响应邀请前检查 `invitation.dayKey === todayDayKey`。

过期后：

- `status = EXPIRED`
- `expiredAt = now`
- 不能响应
- 不结算响应素材

已 `RESPONDED` 的邀请不改成 `EXPIRED`，因为已经形成有效互动记录。全队邀请在当天内可以继续收集更多 response；跨天后不再允许新增 response。

## 供应站展示

GM-12 将 GM-03 的 `GamificationSocialSummary.status` 从 `placeholder` 升级为 `active`。

建议 snapshot：

```ts
interface GamificationSocialSummary {
  status: "active";
  pendingSentCount: number;
  pendingReceivedCount: number;
  teamWidePendingCount: number;
  sent: SocialInvitationSnapshot[];
  received: SocialInvitationSnapshot[];
  teamWide: SocialInvitationSnapshot[];
  recentResponses: SocialInvitationResponseSnapshot[];
  availableRecipients: SocialRecipientSnapshot[];
  message: string;
}
```

展示区域：

- 我收到的邀请：可响应。
- 我发出的邀请：看状态。
- 全队邀请：可响应。
- 最近响应：展示谁响应了什么。
- 社交道具使用入口：对单人道具选择成员，对全队道具直接发起。

## 测试策略

### 服务层测试

覆盖：

- 单人社交道具创建 invitation、扣库存、创建 `ItemUseRecord.SETTLED`。
- 全队社交道具创建 recipient 为空的 invitation。
- 不能邀请自己。
- 不能邀请其他团队成员。
- 同一 sender / day / type / recipient 不能重复点名。
- 企业微信失败不回滚 invitation。
- 成功发送时写 `wechatWebhookSentAt`。
- 过期旧 `PENDING` 邀请。
- 单人邀请只有 recipient 能响应。
- 全队邀请允许多个同队成员响应。
- 同一用户不能重复响应同一邀请。
- 响应不增加 `User.coins` 或 `User.ticketBalance`。

### API 测试

覆盖：

- `POST /api/gamification/items/use` 支持 `social_invitation`。
- 缺少 recipient 的单人邀请返回 `400`。
- 全队邀请不要求 recipient。
- 企业微信失败时 API 仍返回 `200`。
- `POST /api/gamification/social/respond` 鉴权、跨团队、重复响应、过期响应。

### State/UI 测试

覆盖：

- `GET /api/gamification/state` 返回 active social summary。
- 用户看到自己收到的邀请和全队邀请。
- 用户可以从供应站响应邀请。
- 用户可以选择成员发起单人邀请。
- 全队邀请显示在全队区域。

## Acceptance Criteria

GM-12 完成时应满足：

1. 6 个弱社交道具可以从背包使用。
2. 使用社交道具会扣减库存。
3. 使用社交道具会创建 `ItemUseRecord.SETTLED`。
4. 使用社交道具会创建 `SocialInvitation.PENDING`。
5. 单人邀请必须指定同队成员，且不能邀请自己。
6. 全队邀请不需要指定 recipient。
7. 企业微信提醒由 GM-11 sender 发送。
8. 企业微信发送失败不回滚本地邀请。
9. 响应邀请会创建 `SocialInvitationResponse`。
10. 单人邀请只有 recipient 能响应。
11. 全队邀请允许多个同队成员各响应一次。
12. 过期邀请不能响应。
13. 弱社交响应不发银子、不发券、不推进赛季。
14. 供应站能展示我发出的、我收到的、全队邀请和最近响应。
15. GM-12 不写团队动态、不生成周报。

## Follow-Up Stories

GM-12 解锁：

- `GM-13 Team Dynamics Integration`
- `GM-15 Weekly Report / Report Center Integration`

后续可选：

- 企业微信成员映射与精准 @。
- 用户免打扰牌。
- 弱社交响应奖励。
- 团队邀请多人响应统计面板。
- 高价值弱社交事件进入团队动态。
