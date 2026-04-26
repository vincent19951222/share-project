# GM-04 Daily Tasks and Life Ticket Design

> 让“牛马补给站”从页面壳进入第一个可用闭环：每天生成四个维度任务，用户自报完成，四项全成后手动领取 `1` 张生活券。这个 story 不接健身打卡发券、不实现抽奖、不使用道具、不发企业微信。

## 背景

GM-03 已经建立 `牛马补给站` 的导航入口、页面壳和 `GET /api/gamification/state` 只读聚合接口。GM-04 要让这个页面的“四维任务”真正可用。

本 story 对应最轻的日常参与闭环：

```text
进入牛马补给站 -> 生成今日四维任务 -> 自报完成四项 -> 手动领取生活券
```

这个闭环服务于“提高每天打开和打卡动力”，但不替代健身打卡本身。健身打卡发券放到 GM-05。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-03-supply-station-shell-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 每个用户每天有四张当前任务卡，每个维度一张。
2. 用户可以基于信任机制自报完成，不需要上传证明。
3. 用户可以在每个维度每天免费换一次同维度任务。
4. 四个维度全部完成后，用户可以显式领取 `1` 张生活券。
5. 生活券进入 `User.ticketBalance`，并由 `LotteryTicketLedger` 记录来源。
6. 重复请求、刷新页面和快速点击不能导致重复发券。

## 非目标

- 不接入健身打卡发券。
- 不改变 `POST /api/board/punch`。
- 不实现抽奖。
- 不实现道具使用。
- 不消耗 `任务换班券`。
- 不发放银子。
- 不推进赛季进度。
- 不写团队动态。
- 不发送企业微信。
- 不做任务证明、审核或反作弊。

## 核心决策

### 1. 任务生成不放在 GET

GM-03 的 `GET /api/gamification/state` 保持只读。GM-04 新增幂等接口：

```text
POST /api/gamification/tasks/ensure-today
```

原因：

- 避免 GET 请求产生数据库写入。
- 页面可以在首次进入时显式生成当天任务。
- 重复调用不会产生重复任务，因为 `DailyTaskAssignment` 有 `@@unique([userId, dayKey, dimensionKey])`。

### 2. 自报完成

第一版不要求证明、打卡图片或管理员审核。

规则：

- 用户点击完成即可算完成。
- 可以选择或填写一个简短完成状态词。
- 完成后不可撤销。
- 完成后不可换任务。

### 3. 生活券手动领取

完成第四个任务时不自动发券。用户必须点击 `领取生活券`。

原因：

- 奖励动作更明确。
- 后续可以在领取按钮旁展示券余额、抽奖入口和提示文案。
- 避免任务完成接口同时承担经济结算职责。

### 4. 生活券只发一次

领取生活券使用 `LotteryTicketLedger` 的唯一来源去重：

```text
reason: DAILY_TASKS_GRANTED
sourceType: daily_tasks
sourceId: <userId>:<dayKey>
delta: +1
```

如果 GM-02 只创建了普通索引，GM-04 应把 `LotteryTicketLedger` 的 `[sourceType, sourceId]` 升级为唯一约束，确保并发请求下也不会重复发券。

## 用户流程

### 首次进入当天任务

1. 用户打开 `牛马补给站`。
2. 页面调用 `POST /api/gamification/tasks/ensure-today`。
3. 服务端为四个维度补齐当天任务。
4. 页面刷新 `GET /api/gamification/state` 或直接使用返回快照。
5. 四张任务卡展示为 `待完成`。

### 完成任务

1. 用户点击某个维度任务的 `我完成了`。
2. 前端提交 `dimensionKey` 和可选 `completionText`。
3. 服务端写入 `completedAt` 和 `completionText`。
4. 返回最新 gamification snapshot。
5. 页面更新该维度状态。

### 换任务

1. 用户点击某个维度任务的 `换一个`。
2. 如果该任务已完成，返回 `409`。
3. 如果当天该维度已经换过一次，返回 `409`。
4. 服务端从同维度可用卡片中选出另一张任务卡。
5. 更新 `taskCardId`、`rerollCount` 和 `rerolledFromTaskCardId`。
6. 返回最新 gamification snapshot。

GM-04 的换任务是免费的一次基础能力，不消耗背包里的 `任务换班券`。背包道具版换任务放到 GM-08 或后续道具 story。

### 领取生活券

1. 用户完成四个维度任务。
2. 页面显示 `领取生活券` 按钮。
3. 用户点击领取。
4. 服务端检查四项是否都完成。
5. 服务端在同一事务内增加 `User.ticketBalance` 并创建 `LotteryTicketLedger`。
6. 返回最新 gamification snapshot。

如果用户已经领取过：

- 不新增流水。
- 不增加券余额。
- 返回当前 snapshot，让前端展示 `今日生活券已领取`。

## 任务抽取规则

任务来源：GM-01 的 `getTaskCards()`。

每个维度抽取一张任务卡。

候选条件：

- `enabled === true`
- `dimensionKey` 等于当前维度。
- 如果不是周末，排除 `isWeekendOnly === true` 的卡片。
- 优先排除用户在冷却窗口内已经抽到过的卡片。

冷却规则：

- 读取该用户该维度最近若干天的 `DailyTaskAssignment`。
- 如果某张卡设置了 `repeatCooldownDays = 3`，则最近 3 天内抽到过时优先排除。
- 如果排除后没有候选卡，放宽冷却限制，但仍然不能在 reroll 时选回当前卡。

权重规则：

- 按 `weight` 加权随机。
- 第一版 `weight` 可以全是 `1`，但算法要支持后续调权。

测试策略：

- 抽卡 helper 支持注入 `rng`，测试中用固定随机函数避免不稳定。

## API 设计

所有接口：

- 使用 cookie 中的 `userId` 鉴权。
- 未登录返回 `401 { error: "未登录" }`。
- 用户不存在返回 `401 { error: "用户不存在" }`。
- 请求参数错误返回 `400`。
- 业务状态冲突返回 `409`。
- 成功返回 `{ snapshot }`，snapshot 使用 GM-03 的 `GamificationStateSnapshot` 扩展结构。

### POST /api/gamification/tasks/ensure-today

Body:

```json
{}
```

行为：

- 为当前用户当前上海自然日补齐四个维度任务。
- 已存在的维度不重抽。
- 返回最新 snapshot。

### POST /api/gamification/tasks/complete

Body:

```ts
{
  dimensionKey: "movement" | "hydration" | "social" | "learning";
  completionText?: string;
}
```

规则：

- 如果今日任务不存在，先执行 ensure。
- 如果该维度任务已完成，返回当前 snapshot，不重复写入。
- `completionText` 最长 `80` 个字符。
- 空字符串按未提供处理。
- 不校验用户是否真的完成，保持信任机制。

### POST /api/gamification/tasks/reroll

Body:

```ts
{
  dimensionKey: "movement" | "hydration" | "social" | "learning";
}
```

规则：

- 如果今日任务不存在，先执行 ensure。
- 已完成任务不能 reroll。
- 每个维度每天最多 reroll `1` 次。
- reroll 必须换成同维度另一张卡。
- 没有可替换卡片时返回 `409`。

### POST /api/gamification/tasks/claim-ticket

Body:

```json
{}
```

规则：

- 必须四个维度都已完成。
- 每人每天最多发 `1` 张生活券。
- 使用 `adjustLotteryTickets` 或同等事务 helper 发券。
- ledger 使用 `DAILY_TASKS_GRANTED`。
- 已领取时返回当前 snapshot，不重复发券。

## Snapshot 扩展

GM-04 需要在 GM-03 的 snapshot 上增加可操作状态。

`GamificationDimensionSnapshot.assignment` 增加：

```ts
{
  id: string;
  taskCardId: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  completedAt: string | null;
  completionText: string | null;
  rerollCount: number;
  rerollLimit: 1;
  canComplete: boolean;
  canReroll: boolean;
}
```

`GamificationTicketSummary` 增加：

```ts
{
  taskCompletedCount: number;
  lifeTicketClaimable: boolean;
}
```

兼容规则：

- 保留 GM-03 已有字段。
- 后续 GM-05 会继续填充 `fitnessTicketEarned`。

## 前端行为

`SupplyStation` 从占位态升级为可操作任务区：

- 首次挂载调用 `ensure-today`，拿到四张任务卡。
- 每张任务卡展示 `完成` 和 `换一个`。
- 完成后展示状态词和完成时间。
- 任务完成后禁用换任务。
- 四项全部完成且未领取时展示醒目的 `领取生活券`。
- 领取后展示 `今日生活券已到账`。

按钮状态：

- 请求处理中禁用相关按钮。
- 业务 `409` 展示服务端提示并刷新 snapshot。
- `401` 保持 GM-03 的重新登录提示。

## 数据一致性

任务生成：

- 使用事务创建缺失维度。
- 依赖 `@@unique([userId, dayKey, dimensionKey])` 防止重复。
- 遇到并发唯一冲突时重新读取当天任务并返回。

生活券领取：

- 必须在事务内重新检查四项完成状态。
- 必须在事务内检查 `DAILY_TASKS_GRANTED` 是否已存在。
- 发券和 ledger 创建必须在同一事务内。
- 如果添加了 `[sourceType, sourceId]` 唯一约束，并发重复创建应被捕获并转为“已领取”状态。

## 测试策略

### 服务层测试

覆盖：

- `ensureTodayTaskAssignments` 创建四个维度任务。
- 重复 ensure 不创建重复任务。
- 非周末不抽 weekend-only 卡片。
- reroll 换成同维度另一张任务。
- reroll 每个维度每天最多一次。
- 已完成任务不能 reroll。
- complete 写入 `completedAt` 和 `completionText`。
- 完成四项后 claim 增加 `ticketBalance` 和 ledger。
- 重复 claim 不重复发券。
- 未完成四项时 claim 返回业务错误。

### API 测试

覆盖：

- 未登录 401。
- ensure 返回四个任务。
- complete 返回完成后的 snapshot。
- reroll 返回新 taskCardId。
- claim 成功发生活券。
- claim 重复不重复发券。

### 前端测试

覆盖：

- `SupplyStation` 初次加载调用 ensure。
- 展示四张真实任务卡。
- 点击完成调用 complete。
- 点击换一个调用 reroll。
- 四项完成后显示 `领取生活券`。
- 领取成功后显示已到账状态。

## Acceptance Criteria

GM-04 完成时应满足：

1. 每个用户每天每个维度最多存在一个当前任务。
2. 打开 `牛马补给站` 后可以看到四张今日任务卡。
3. 用户可以自报完成任务。
4. 用户每个维度每天最多免费换一次任务。
5. 四项全成后可以手动领取 `1` 张生活券。
6. 重复领取不会重复增加 `ticketBalance`。
7. 生活券发放有 `LotteryTicketLedger` 流水。
8. GM-04 不创建健身打卡、不推进赛季、不发银子、不抽奖。
9. 目标服务、API、组件测试通过。

## Follow-Up Stories

GM-04 解锁：

- `GM-05 Fitness Ticket Hook`
- `GM-06 Lottery V1`
- `GM-14 Docs Center Rule Pages`
- `GM-15 Weekly Report / Report Center Integration`
