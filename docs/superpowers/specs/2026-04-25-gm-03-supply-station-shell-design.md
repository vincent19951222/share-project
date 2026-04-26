# GM-03 Supply Station Shell Design

> 为“牛马补给站”建立第一个可见入口：导航 tab、只读聚合状态接口和页面壳。这个 story 不实现任务完成、抽奖、背包使用、道具结算或企业微信，只让用户能进入页面并理解后续游戏化模块的位置。

## 背景

GM-01 提供本地内容配置，GM-02 提供数据库基础。GM-03 是“牛马补给站”的第一个用户可见 story，需要把后续功能放进现有产品导航和页面结构中，但不能提前把 GM-04 之后的业务逻辑塞进来。

当前应用是 `app/(board)/page.tsx` 内的单页 tab 面板，不是多页面路由。因此 GM-03 应该延续现有模式：在主导航中增加一个 `supply` tab，在主面板中渲染 `SupplyStation` 组件。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 登录用户可以从主导航进入 `牛马补给站`。
2. 页面能展示四个维度，即使当天还没有任务分配记录。
3. 页面能展示抽奖券余额、今日奖励状态、背包摘要、抽奖占位和弱社交占位。
4. `GET /api/gamification/state` 提供一个稳定聚合快照，供后续 GM-04 到 GM-12 逐步扩展。
5. 页面明确提示哪些能力尚未开放，避免用户误以为按钮坏了。

## 非目标

- 不实现任务抽取。
- 不实现任务完成。
- 不实现任务重抽。
- 不发放四维任务抽奖券。
- 不接入健身打卡发券。
- 不实现抽奖。
- 不实现背包详情页或道具使用。
- 不实现弱社交邀请发送。
- 不实现真实福利兑换。
- 不接企业微信。
- 不写团队动态。

## 产品形态

### 导航入口

新增主导航 tab：

```text
牛马补给站
```

内部 tab key：

```ts
"supply"
```

原因：

- 比 `gamification` 更短，适合当前 `AppTab` 语义。
- 和用户可见名称 `牛马补给站` 对齐。
- 后续如果从 tab 独立成路由，也可以继续保留 `supply` 作为内部 feature key。

### 页面信息架构

`SupplyStation` 页面壳包含五个区域。

#### 1. 顶部状态区

展示：

- 标题：`牛马补给站`
- 副标题：`今日补给单已生成，先把身体照顾好，再来薅一点运气。`
- 当前抽奖券余额。
- 今日已获得抽奖券数量。
- 背包道具总数。
- 今日待响应弱社交数量。

#### 2. 今日四维任务预览

固定展示四个维度：

- `movement` / `把电充绿`
- `hydration` / `把尿喝白`
- `social` / `把事办黄`
- `learning` / `把股看红`

如果当天没有 `DailyTaskAssignment`：

- 展示维度标题、副标题和说明。
- 展示占位文案：`今日任务抽取将在 GM-04 开放。`
- 不出现可点击完成按钮。

如果当天已有 `DailyTaskAssignment`：

- 展示任务卡标题和描述。
- 展示完成状态。
- 完成按钮仍禁用，文案为 `任务打卡 GM-04 开放`。

这让 GM-03 页面可以兼容后续 GM-04 的任务记录，不需要重做接口形态。

#### 3. 今日奖励状态

展示当天最多可获得的免费券：

- `健身打卡券`：GM-05 开放。
- `四维任务券`：GM-04 开放。

GM-03 只读取当日 `LotteryTicketLedger`，用于展示今天已经获得和消耗的券。GM-03 不创建流水。

#### 4. 抽奖占位

展示：

- 当前券余额。
- 单抽按钮，禁用。
- 十连抽按钮，禁用。
- 占位文案：`抽奖机正在搬进办公室，GM-06 开放。`
- 最近抽奖记录摘要。如果没有记录，显示空状态。

#### 5. 背包与弱社交占位

背包摘要：

- 展示库存总数。
- 展示最多 4 个已有道具。
- 如果没有库存，显示：`背包空空，等抽奖机上线后再来进货。`
- 不提供道具使用入口。

弱社交摘要：

- 展示今日发出的待响应邀请数量。
- 展示今日收到的待响应邀请数量。
- 展示占位文案：`点名喝水、出门溜达等弱社交道具将在 GM-12 开放。`

## API 设计

新增接口：

```text
GET /api/gamification/state
```

认证：

- 读取 `userId` httpOnly cookie。
- 未登录返回 `401 { error: "未登录" }`。
- 用户不存在返回 `401 { error: "用户不存在" }`。
- 服务异常返回 `500 { error: "服务器错误" }`。

返回结构：

```ts
interface GamificationStateSnapshot {
  currentUserId: string;
  teamId: string;
  dayKey: string;
  ticketBalance: number;
  dimensions: GamificationDimensionSnapshot[];
  ticketSummary: GamificationTicketSummary;
  lottery: GamificationLotterySummary;
  backpack: GamificationBackpackSummary;
  social: GamificationSocialSummary;
}
```

维度结构：

```ts
interface GamificationDimensionSnapshot {
  key: "movement" | "hydration" | "social" | "learning";
  title: string;
  subtitle: string;
  description: string;
  assignment: null | {
    id: string;
    taskCardId: string;
    title: string;
    description: string;
    status: "pending" | "completed";
    completedAt: string | null;
  };
}
```

奖励状态：

```ts
interface GamificationTicketSummary {
  maxFreeTicketsToday: 2;
  todayEarned: number;
  todaySpent: number;
  lifeTicketEarned: boolean;
  fitnessTicketEarned: boolean;
}
```

抽奖状态：

```ts
interface GamificationLotterySummary {
  status: "placeholder";
  singleDrawEnabled: false;
  tenDrawEnabled: false;
  message: string;
  recentDraws: {
    id: string;
    drawType: string;
    ticketSpent: number;
    coinSpent: number;
    createdAt: string;
    rewards: {
      rewardId: string;
      rewardTier: string;
      rewardKind: string;
    }[];
  }[];
}
```

背包状态：

```ts
interface GamificationBackpackSummary {
  totalQuantity: number;
  previewItems: {
    itemId: string;
    name: string;
    quantity: number;
    category: string;
  }[];
  emptyMessage: string;
}
```

弱社交状态：

```ts
interface GamificationSocialSummary {
  status: "placeholder";
  pendingSentCount: number;
  pendingReceivedCount: number;
  message: string;
}
```

## 数据规则

GM-03 的聚合接口只读，不创建任何用户状态。

读取来源：

- 维度定义来自 GM-01 本地配置。
- 任务文案来自 GM-01 本地任务卡配置。
- 当日任务状态来自 GM-02 `DailyTaskAssignment`。
- 抽奖券余额来自 `User.ticketBalance`。
- 今日券统计来自 `LotteryTicketLedger`。
- 背包摘要来自 `InventoryItem`。
- 最近抽奖来自 `LotteryDraw` 和 `LotteryDrawResult`。
- 弱社交计数来自 `SocialInvitation`。

GM-03 不处理以下状态变化：

- 不分配任务。
- 不改变任务完成状态。
- 不增减抽奖券。
- 不增减库存。
- 不创建抽奖记录。
- 不创建邀请。

## 前端行为

加载策略：

- `SupplyStation` 只在用户第一次打开 `supply` tab 后挂载。
- 组件挂载后请求一次 `/api/gamification/state`。
- GM-03 不做轮询；后续有 mutation 后再按需刷新。

错误处理：

- `401` 展示登录过期提示和返回登录按钮。
- 其他错误展示刷新重试按钮。
- 没有快照时展示“正在搬运补给箱...”加载态。

响应式：

- 桌面：顶部状态区 + 双列内容。
- 移动端：所有卡片单列堆叠，页面内部滚动。
- 沿用现有 Brutalist 视觉语言：粗边框、强阴影、黄色重点按钮、中文搞笑文案。

## 测试策略

### API 测试

覆盖：

- 未登录返回 401。
- 登录后返回四个维度。
- 没有任务分配时，四个维度的 `assignment` 都是 `null`。
- 已有任务分配时，接口能返回任务标题、描述和完成状态。
- 已有库存、抽奖、弱社交记录时，摘要计数正确。

### 前端测试

覆盖：

- Navbar 桌面端显示 `牛马补给站`。
- 点击 tab dispatch `SET_TAB` with `supply`。
- 移动端导航展开后也能进入 `牛马补给站`。
- `SupplyStation` 加载成功后展示四个维度。
- 没有任务时展示 GM-04 占位。
- 抽奖按钮禁用并展示 GM-06 占位。
- API 错误时展示刷新/登录提示。

## Acceptance Criteria

GM-03 完成时应满足：

1. `AppTab` 支持 `supply`。
2. 主导航桌面端和移动端都有 `牛马补给站`。
3. 已登录用户可以打开 `SupplyStation` 页面壳。
4. `GET /api/gamification/state` 可以返回稳定快照。
5. 页面至少展示四个维度、抽奖券余额、今日奖励状态、抽奖占位、背包摘要、弱社交占位。
6. 所有 GM-04 之后的业务按钮都是禁用或占位态。
7. GM-03 不创建任务、不发券、不抽奖、不使用道具。
8. 目标 API、组件和导航测试通过。

## Follow-Up Stories

GM-03 解锁：

- `GM-04 Daily Tasks and Life Ticket`
- `GM-05 Fitness Ticket Hook`
- `GM-06 Lottery V1`
- `GM-07 Backpack V1`
