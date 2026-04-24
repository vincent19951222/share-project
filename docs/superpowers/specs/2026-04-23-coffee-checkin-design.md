# Coffee Check-in Design

> 为“脱脂牛马”新增一个和健身打卡平行的生活化咖啡打卡页：不做复杂饮品日记，只记录今天有没有靠咖啡续命，以及续了几杯。

## Goal

新增一个平行主导航 Tab：`续命咖啡`。

这个页面服务一个很轻的团队场景：大家每天喝咖啡时顺手点一下，团队可以看到今天谁续命了、续了几杯、本月大概的咖啡节奏。它应该像健身打卡一样容易操作，但视觉上更生活化，带一点咖啡店小票、纸杯贴纸和团队月历的感觉。

第一版的目标不是做咖啡因管理、饮品偏好分析或健康建议，而是把“喝咖啡”这件小事变成团队里的轻量共享仪式。

## Product Scope

Included:

- 新增与 `健身打卡 / 共享看板 / 战报中心` 平行的 `续命咖啡` Tab
- 展示团队成员 30 天咖啡记录网格
- 当前用户只能操作今天
- 点击 `+1 杯` 新增一条今日咖啡记录
- 点击 `-1 杯` 撤销今天最近一条自己的咖啡记录
- 历史日期和其他成员记录只读
- 数据持久化到 SQLite
- 页面展示时按 `userId + dayKey` 汇总杯数
- 通过轻量轮询或复用现有 board sync 思路，让多个客户端最终一致

Not included:

- 咖啡类型选择
- 备注、图片、价格、店铺
- 咖啡因 mg 计算
- 健康提醒或晚间限制
- 咖啡 streak 奖励
- 银子、赛季收入、牛马冲刺条联动
- 补记昨天或编辑历史日期
- 咖啡排行榜长期统计页

## Core Decisions

| 维度 | 决策 | 说明 |
|------|------|------|
| 页面定位 | 平行 Tab | 和健身打卡并列，不塞进共享看板 |
| 第一版名称 | 续命咖啡 | 比“咖啡打卡”更贴合品牌语气 |
| 操作范围 | 只允许改今天 | 保持像打卡一样轻，避免补记复杂度 |
| 数据粒度 | 每杯一条记录 | 当天可有多条记录，未来可扩展时间、类型、备注 |
| 展示粒度 | 按天汇总杯数 | 网格只展示 `☕ 1`、`☕ 2` 这类结果 |
| 减杯行为 | 撤销最近一杯 | `-1` 删除当前用户今天最新的一条咖啡记录 |
| 经济系统关系 | 完全解耦 | 不增加银子，不影响赛季，不影响健身 streak，不作为任何经济奖励来源 |
| UI 气质 | 生活化 | 保留粗边框，但颜色、文案和布局更像咖啡小票 |

## Economy Boundary

`续命咖啡` 是一个独立的生活化记录页面，不参与经济系统。

V1 明确不做：

- 不增加“我的银子”
- 不增加“赛季收入”
- 不推进“牛马冲刺条”
- 不影响健身打卡 streak
- 不参与 Quest / GP / Rank 结算
- 不提供任何可兑换、可消费、可排行结算的经济奖励

咖啡页可以保留轻量荣誉展示，例如 `今日咖啡王`、`今日续命人数`、`本月总杯数`。这些统计只用于氛围和回顾，不作为奖励依据。

这样设计的原因是：健身打卡是希望被鼓励更多发生的行为，咖啡记录则更像生活状态分享。产品不应该用经济奖励暗示“喝越多越好”。

## User Experience

### Navigation

主导航新增一个 Tab：

- `健身打卡`
- `共享看板`
- `续命咖啡`
- `战报中心`

`续命咖啡` 是独立页面，不改变健身打卡的交互，也不和共享看板混合。

### Main Layout

页面分为两块：

1. 顶部今日咖啡小票
2. 团队 30 天咖啡月历

顶部小票展示推荐四个统计：

- `今日总杯数`
- `今日续命人数`
- `我的今日杯数`
- `今日咖啡王`

下方团队月历复用健身打卡的成员行 + 日期列心智，但视觉更轻松。格子状态建议：

- 未来日期：浅色空格
- 历史无记录：空白或淡色点
- 历史有记录：`☕ 1`、`☕ 2`
- 今天当前用户无记录：显示 `+`
- 今天当前用户有记录：显示 `☕ N`，旁边或弹层提供 `+1 杯` / `-1 杯`
- 今天其他用户：只读展示 `☕ N`

### Add Cup Flow

当前用户点击今天自己的咖啡格：

1. 打开小弹层或内联操作条
2. 点击 `+1 杯`
3. 客户端调用服务端 API
4. 服务端新增一条 `CoffeeRecord`
5. 返回最新咖啡看板快照
6. 客户端用服务端快照刷新格子和顶部统计

如果今天已经喝了多杯，继续点击 `+1 杯` 会继续新增记录，而不是覆盖旧记录。

### Remove Cup Flow

当前用户点击今天自己的咖啡格并选择 `-1 杯`：

1. 客户端调用服务端撤销 API
2. 服务端找到当前用户今天最新的一条未撤销咖啡记录
3. 删除它或标记撤销
4. 返回最新咖啡看板快照
5. 如果删到 0 杯，今天格子回到 `+` 状态

当今天已经是 0 杯时，`-1 杯` 不可用。

## Data Model

推荐新增模型：`CoffeeRecord`。

```prisma
model CoffeeRecord {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  dayKey    String
  createdAt DateTime @default(now())
  deletedAt DateTime?

  @@index([teamId, dayKey, createdAt])
  @@index([userId, dayKey, createdAt])
}
```

Design notes:

- `dayKey` 使用 `Asia/Shanghai` 的 `YYYY-MM-DD`
- 每条记录代表一杯咖啡
- `teamId` 冗余存储，方便团队范围查询，避免每次通过 User join 才能过滤团队
- `deletedAt` 用于撤销最近一杯；第一版也可以物理删除，但软删除更利于未来审计
- 第一版不需要 `type`、`note`、`caffeineMg`，但该模型后续可以自然扩展

需要在 `User` 和 `Team` 上补 relation：

```prisma
coffeeRecords CoffeeRecord[]
```

## Snapshot Contract

咖啡页不复用健身 `BoardSnapshot`，避免把 punch 和 coffee 混成一个状态。

推荐新增独立 DTO：

```typescript
export interface CoffeeMemberSnapshot {
  id: string;
  name: string;
  avatarKey: string;
}

export interface CoffeeDayCell {
  cups: number;
}

export interface CoffeeSnapshot {
  members: CoffeeMemberSnapshot[];
  gridData: CoffeeDayCell[][];
  today: number;
  totalDays: number;
  currentUserId: string;
  stats: {
    todayTotalCups: number;
    todayDrinkers: number;
    currentUserTodayCups: number;
    coffeeKing: {
      userId: string;
      name: string;
      cups: number;
    } | null;
  };
}
```

`gridData[rowIndex][dayIndex]` 表示某成员某天的汇总杯数。未来日期可以统一返回 `{ cups: 0 }`，由 UI 根据 `day > today` 判断未来态。

## API Design

### GET `/api/coffee/state`

返回当前用户所在团队的咖啡快照。

Requirements:

- 使用现有 `userId` cookie 鉴权
- 只能读取当前用户团队
- 只返回当前 30 天窗口
- 忽略 `deletedAt` 不为空的记录

### POST `/api/coffee/cups`

新增当前用户今天的一杯咖啡。

Server behavior:

- 通过 cookie 获取当前用户
- 生成上海时区 `dayKey`
- 创建一条 `CoffeeRecord`
- 返回最新 `CoffeeSnapshot`

### DELETE `/api/coffee/cups/latest`

撤销当前用户今天最近一杯咖啡。

Server behavior:

- 通过 cookie 获取当前用户
- 生成上海时区 `dayKey`
- 查找当前用户今天最新一条 `deletedAt = null` 的记录
- 找不到时返回 409 或返回当前快照并提示无可撤销记录
- 找到时设置 `deletedAt`
- 返回最新 `CoffeeSnapshot`

## State And Sync

咖啡页建议使用独立的 `CoffeeProvider` 或页面局部 reducer，而不是塞进现有 `BoardProvider`。

原因：

- 健身打卡正在接经济系统和赛季语义，状态会继续变复杂
- 咖啡页不参与银子、赛季、streak
- 独立状态能避免 Tab 之间互相污染

同步策略保持克制：

- 用户点击 `+1 / -1` 后立即使用 API 返回的快照刷新
- 停留在 `续命咖啡` Tab 时每 5 秒或 10 秒轮询 `/api/coffee/state`
- 离开 Tab 后停止或暂停轮询

如果实现成本需要进一步压低，也可以先在 Coffee 页面组件内部用 `useEffect` 管理轮询，不必第一版抽象成全局 provider。

## Visual Direction

咖啡页应比健身打卡更生活化，但仍属于同一个产品。

### Relationship To Fitness Check-in

`续命咖啡` 需要和健身打卡有明确区分度，但不能像另一个 App。

设计原则：

- 交互心智保持一致：都是团队成员 + 30 天记录 + 今天自己的格子可操作
- 信息结构保持相近：顶部统计，下方月历网格
- 视觉气质明显区分：健身打卡偏训练、冲刺、硬朗；咖啡打卡偏生活、小票、贴纸、松弛
- 不要只把健身格子换成咖啡图标；顶部、格子、色彩、文案都应该体现咖啡页自己的性格
- 保留产品统一性：继续使用粗边框、实体阴影、中文幽默文案和现有字体系统

换句话说，咖啡页复用健身打卡的团队月历心智，但视觉语言必须生活化。

Visual keywords:

- 咖啡店小票
- 纸杯贴纸
- 奶泡色块
- 手写标签感
- 粗边框和实体阴影保留

Recommended palette:

- Espresso: `#3f2a1d`
- Cream: `#fff7ed`
- Latte: `#fed7aa`
- Roast: `#b45309`
- Mint accent: `#99f6e4`
- Slate text: 继续沿用现有 `text-main / text-sub`

注意：不要让页面变成单一棕色主题。咖啡色只做主语义，搭配奶油色、薄荷色和现有黄色点缀，保持轻松。

## Copywriting

推荐文案：

- Tab: `续命咖啡`
- Header title: `今日咖啡小票`
- Empty state: `今天还没续命`
- Add action: `+1 杯`
- Remove action: `-1 杯`
- Today total: `今日总杯数`
- Drinkers: `今日续命人数`
- Current user stat: `我的今日杯数`
- King stat: `今日咖啡王`

Activity copy examples:

- `li 刚刚续命 1 杯`
- `luo 今日已续命 3 杯`
- `wu 撤回一杯，理智回归`

## Error Handling

Expected cases:

- 未登录：返回 401，前端跳转或提示重新登录
- 用户不存在：返回 401
- 无可撤销咖啡记录：返回 409，前端提示 `今天还没有可撤销的咖啡`
- 数据库写入失败：返回 500，前端保留当前快照
- 轮询失败：不清空页面，可轻量展示同步失败状态

## Testing Suggestions

Recommended coverage:

1. `CoffeeRecord` seed / schema relation can be generated by Prisma
2. `GET /api/coffee/state` unauthenticated returns 401
3. `GET /api/coffee/state` returns only current user's team
4. `POST /api/coffee/cups` creates one record for today
5. Multiple `POST` calls create multiple records and snapshot cups increase
6. `DELETE /api/coffee/cups/latest` soft-deletes only the latest current-user record for today
7. Deleting at zero cups returns a safe error
8. Snapshot aggregation ignores deleted records
9. UI renders `+` at 0 cups and `☕ N` after adding cups
10. UI only allows operating today's current-user cell

## Follow-up Ideas

These are intentionally out of V1, but the data model leaves room for them:

- 可选咖啡类型：美式 / 拿铁 / 手冲 / 其他
- 下午咖啡提醒
- 本周咖啡趋势
- 团队咖啡王周榜
- 咖啡和睡眠/健身表现的轻量关联
- 咖啡小票分享图
