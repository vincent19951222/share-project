# Gamification Dev Roadmap

> 本文记录“脱脂牛马”游戏化主线，也就是“牛马补给站”的开发进展、故事边界和后续顺序。
>
> 规则：GM story 要保持可独立测试、可独立上线。配置、数据库、服务层、API、页面可以分阶段交付，不把所有玩法塞进一次大改。

## 当前状态

| Story | 名称 | 状态 | 是否有用户可见玩法 |
| --- | --- | --- | --- |
| GM-01 | Content Config Foundation | 已完成 | 否 |
| GM-02 | Database Foundation | 已完成 | 否 |
| GM-03 | Supply Station Shell | 已完成 | 是 |
| GM-04 | Daily Tasks and Life Ticket | 已完成 | 是 |
| GM-05 | Fitness Ticket Hook | 已完成 | 少量提示 |
| GM-06 | Lottery V1 | 已完成 | 是 |
| GM-07 | Backpack V1 | 已完成 | 是 |
| GM-08 | Today-Effective Item Use | 已完成 | 是 |
| GM-09 | Boost Settlement Integration | 已完成 | 少量提示 |
| GM-10 | Real-World Redemption | 已完成 | 是 |
| GM-11 | Enterprise WeChat Sender Foundation | 已完成 | 否 |
| GM-12 | Weak Social Invitations V1 | 已完成 | 是 |
| GM-13 | Team Dynamics Integration | 已完成 | 是 |
| GM-14 | Docs Center Rule Pages | 已完成 | 是 |
| GM-15 | Weekly Report / Report Center Integration | 已完成 | 是 |

## GM-01: Content Config Foundation

GM-01 做的是“先把游戏化世界里的字典和规则表准备好”，还没有真正上线玩法。

可以把它理解成：先把补给站未来要用的内容写成一套稳定配置，后面 GM-02 到 GM-15 都来查这套配置，不要每个地方自己硬编码。

### 已完成内容

1. 定义四个每日任务维度

现在有四个固定维度：

| Key | 展示文案 |
| --- | --- |
| `movement` | 把电充绿 |
| `hydration` | 把尿喝白 |
| `social` | 把事办黄 |
| `learning` | 把股看红 |

后续每日任务、补给站页面、文档中心都会使用这些稳定英文 key。中文只作为展示文案，不作为逻辑 ID。

2. 写了第一批任务卡

每个维度至少 5 张任务卡，例如：

- 工位重启
- 屁股离线
- 首杯投币
- 废话 KPI
- 三分钟扫盘

这些目前只是本地配置，还不会分配给用户。等 GM-04 才会真正做“今天抽到哪几张任务卡”。

3. 定义道具

加了一批未来会用的道具定义，例如：

- 任务换班券
- 小暴击券
- 保底升级券
- 健身请假券
- 瑞幸咖啡券
- 点名喝水令
- 全员起立令

这里也只是定义“这个道具叫什么、属于哪类、效果类型是什么、每天/每周限制是什么”。真正的背包、使用、扣库存，会在 GM-07、GM-08、GM-10、GM-12 继续实现。

4. 定义抽奖奖池

加了第一版奖励池，例如：

- 获得 5 / 10 / 20 银子
- 抽到任务换班券
- 抽到小暴击券
- 抽到点名喝水令
- 抽到瑞幸咖啡券

GM-01 不做抽奖逻辑，只是先列出“奖池里有哪些东西”。真正抽奖是 GM-06。

5. 加了统一读取和校验工具

新增 `lib/gamification/content.ts`，后续代码可以通过这些函数读取配置：

- `getGamificationDimensions()`
- `getTaskCards()`
- `getRewardDefinitions()`
- `getItemDefinitions()`
- `getItemDefinition(itemId)`
- `validateGamificationContent()`

校验会检查：

- 任务卡 ID 不能重复
- 任务卡不能引用不存在的维度
- 奖励不能发不存在的道具
- 道具每日使用上限不能是 0 或负数

6. 修复测试清理问题

完整测试时发现 `seed.test.ts` 在清理测试数据时，没有处理新主线已有的周报、弱社交、企业微信相关表，导致外键报错。这个不是 GM-01 业务的一部分，但会影响以后跑全量测试，所以补了清理逻辑。

### GM-01 总结

GM-01 是给游戏化系统打地基：先把“四维任务、任务卡、道具、奖池、配置校验”这套内容层建好。

现在还没有页面、数据库表、抽奖、背包、发券，只是给后面的 GM-02 到 GM-15 提供一套稳定的“规则字典”。

## GM-02: Database Foundation

GM-02 做的是“把游戏化玩法要落到数据库里的地基搭好”。

一句话概括：GM-01 定义了规则字典，GM-02 则让用户以后真的可以拥有任务、抽奖券、背包道具、抽奖记录、道具使用记录和福利兑换记录。

### 已完成内容

1. 给用户加了抽奖券余额

`User` 新增：

```prisma
ticketBalance Int @default(0)
```

以后用户完成任务、打卡、抽奖消耗券，都会围绕这个余额变化。

2. 新增每日任务分配表

新增 `DailyTaskAssignment`。

它记录：

- 谁
- 哪一天
- 哪个任务维度
- 抽到了哪张任务卡
- 有没有完成
- 有没有重抽过

并且限制同一个用户、同一天、同一个维度只能有一条任务。

3. 新增抽奖券流水表

新增 `LotteryTicketLedger`。

这个表用于追溯：

- 为什么加券
- 为什么扣券
- 扣完或加完后的余额是多少
- 来源是什么

后面 GM-04、GM-05、GM-06 都会用它。

4. 新增背包库存表

新增 `InventoryItem`。

以后用户抽到道具，比如任务换班券、小暴击券、瑞幸咖啡券，都会落到这个表里。

同一个用户同一个道具只保留一条库存记录。

5. 新增道具使用记录表

新增 `ItemUseRecord`。

它记录某个道具被谁用了、哪天用的、状态是什么、效果快照是什么。

GM-07、GM-08、GM-09、GM-12 会继续基于它做背包、使用、结算和弱社交玩法。

6. 新增抽奖记录表

新增：

- `LotteryDraw`
- `LotteryDrawResult`

也就是一次抽奖主记录，加上每一抽的结果。

GM-06 真正做抽奖时，就会往这里写数据。

7. 新增真实福利兑换表

新增 `RealWorldRedemption`。

以后像“瑞幸咖啡券”这种真实福利，可以记录：

- 谁申请兑换
- 状态是 `REQUESTED` / `CONFIRMED` / `CANCELLED`
- 谁确认了
- 什么时候确认

8. 兼容扩展现有弱社交邀请

项目里已经有 `SocialInvitation`，所以 GM-02 没有粗暴新建同名模型，而是在现有模型上扩展：

- 可选关联 `ItemUseRecord`
- 增加 `rewardSettledAt`

这样以后“点名喝水令”“全员起立令”这类道具可以挂到弱社交邀请上，同时不破坏现有弱社交和企业微信相关逻辑。

9. 加了最小数据库服务层

新增 `lib/gamification/db.ts`。

里面有两个 helper：

- `adjustLotteryTickets()`
- `adjustInventoryItem()`

它们负责：

- 抽奖券不能加减 0
- 抽奖券余额不能变负
- 背包库存不能变负
- 抽奖券余额变化必须同时写流水
- 操作放在事务里，避免只改一半

10. 补了测试和 seed 清理

新增 `__tests__/gamification-db.test.ts`，覆盖 GM-02 的核心数据库约束。

也更新了 `seedDatabase()` 和 `seed.test.ts`，让测试数据重置时会清理新加的游戏化表，避免外键残留影响后续测试。

### GM-02 没有做的事

- 没有页面
- 没有 API
- 没有每日任务抽取逻辑
- 没有抽奖随机逻辑
- 没有背包页面
- 没有道具真正结算
- 没有企业微信发送逻辑

### GM-02 总结

GM-02 本质上是把“牛马补给站”未来要用的用户状态和经济流水先安全落库，给 GM-03 到 GM-15 铺路。

## GM-03: Supply Station Shell

GM-03 做的是“先把牛马补给站开门营业”，也就是让用户第一次在主界面里看见游戏化主线的位置。

一句话概括：GM-01 准备了规则字典，GM-02 准备了数据库地基，GM-03 则把这些东西聚合成一个只读页面壳，让用户能进入“牛马补给站”，看到四维任务、抽奖券、抽奖机、背包和弱社交的未来入口。

### 已完成内容

1. 新增主导航入口

主导航桌面端和移动端都新增了：

```text
牛马补给站
```

内部 tab key 是：

```ts
"supply"
```

这个入口沿用现有单页 tab 架构，没有新建独立路由。用户第一次打开 `supply` tab 后才会挂载补给站页面，避免影响现有打卡、共享看板、咖啡、日历和战报中心。

2. 新增补给站像素图标

新增 `public/assets/icons/supply-pixel.svg`，并在 `components/ui/AssetIcon.tsx` 注册为：

```ts
supply: "/assets/icons/supply-pixel.svg"
```

这样导航图标继续走现有受控资产体系，不在组件里硬编码图片路径。

3. 新增只读聚合接口

新增接口：

```text
GET /api/gamification/state
```

它读取当前登录用户的 `userId` cookie，返回一个稳定的 `GamificationStateSnapshot`。接口只读，不创建任务、不发券、不抽奖、不改库存、不发弱社交邀请。

当前快照包含：

- 当前用户和团队
- 当天 `dayKey`
- 抽奖券余额
- 四个任务维度
- 今日抽奖券获得/消耗摘要
- 抽奖机占位状态和最近抽奖记录摘要
- 背包库存摘要
- 弱社交待响应数量

4. 新增服务端聚合器

新增 `lib/gamification/state.ts`，负责把 GM-01 和 GM-02 的数据聚合到同一个只读快照里。

读取来源包括：

- `getGamificationDimensions()`
- `getTaskCards()`
- `getItemDefinition(itemId)`
- `User.ticketBalance`
- `DailyTaskAssignment`
- `LotteryTicketLedger`
- `InventoryItem`
- `LotteryDraw` / `LotteryDrawResult`
- `SocialInvitation`

这层只做读取和格式化，给 GM-04 到 GM-12 留出扩展点。

5. 新增补给站页面壳

新增 `components/gamification/SupplyStation.tsx`。

页面包含这些区域：

- 顶部状态区：抽奖券、今日进账、背包库存、待响应弱社交
- 今日四维：固定展示 `movement`、`hydration`、`social`、`learning`
- 今日券路：展示健身打卡券和四维任务券的后续开放状态
- 抽奖机：禁用单抽和十连按钮，提示 GM-06 开放
- 背包：展示库存摘要，没有库存时显示空状态
- 弱社交雷达：展示发出/收到的待响应邀请数量，提示 GM-12 开放

6. 明确保留后续 story 边界

GM-03 里的所有未来能力都是占位或禁用按钮：

- `任务打卡 GM-04 开放`
- `单抽 GM-06`
- `十连 GM-06`
- `背包详情 GM-07`
- `响应 GM-12`

这能让用户知道功能位置，同时不会误以为当前按钮坏了。

7. 加了测试覆盖

新增：

- `__tests__/gamification-state-api.test.ts`
- `__tests__/supply-station-shell.test.tsx`

并更新：

- `__tests__/coffee-tab.test.tsx`

覆盖内容包括：

- 未登录访问聚合接口返回 401
- 登录后返回四个维度
- 没有任务分配时四维 assignment 都是 `null`
- 已有任务、库存、抽奖、弱社交记录时摘要正确
- 补给站页面能展示四维、抽奖机占位、背包空状态
- 401 时展示重新登录入口
- Navbar 能 dispatch `SET_TAB` with `supply`
- 导航图标列表包含 supply 图标

### GM-03 没有做的事

- 没有抽取每日任务
- 没有完成任务
- 没有重抽任务
- 没有发放生活抽奖券
- 没有接入健身打卡发券
- 没有实现抽奖
- 没有实现背包详情或道具使用
- 没有发送弱社交邀请
- 没有真实福利兑换
- 没有企业微信发送
- 没有写团队动态

### GM-03 总结

GM-03 是“牛马补给站”的第一个用户可见版本：它不是完整玩法，而是入口、页面骨架和只读状态聚合层。

现在用户已经能从主导航进入补给站，看到四维任务、抽奖券、抽奖机、背包和弱社交区域。后续 GM-04、GM-05、GM-06、GM-07 可以在这个壳上逐步把真实玩法接进来。

## GM-04: Daily Tasks and Life Ticket

GM-04 做的是“让牛马补给站的四维任务真正闭环”。

一句话概括：用户进入补给站后会生成当天四个维度任务，可以自报完成、每个维度免费换一次任务，四项全部完成后手动领取 1 张生活抽奖券。

### 已完成内容

1. 新增每日任务服务层

新增 `lib/gamification/tasks.ts`，集中处理四维任务的写操作：

- `ensureTodayTaskAssignments()`
- `completeDailyTask()`
- `rerollDailyTask()`
- `claimDailyTasksTicket()`

`GET /api/gamification/state` 仍然保持只读，不负责生成任务或发券。

2. 支持今日任务生成

新增接口：

```text
POST /api/gamification/tasks/ensure-today
```

它会为当前用户当天补齐四个维度的任务分配。重复调用不会重复生成，因为 `DailyTaskAssignment` 仍然使用 `@@unique([userId, dayKey, dimensionKey])` 保证同一用户同一天同一维度只有一条任务。

任务抽取基于 GM-01 的本地任务卡配置，并支持：

- 按维度筛选
- 排除禁用任务卡
- 非周末排除 weekend-only 任务卡
- 按 `repeatCooldownDays` 优先避开近期抽过的任务卡
- 按 `weight` 加权随机

3. 支持自报完成任务

新增接口：

```text
POST /api/gamification/tasks/complete
```

用户点击“我完成了”后会写入：

- `completedAt`
- 可选 `completionText`

完成是信任制，不上传证明、不审核、不发银子、不推进赛季。重复完成不会改写第一次的完成时间和状态词。

4. 支持每个维度每日免费换一次任务

新增接口：

```text
POST /api/gamification/tasks/reroll
```

规则：

- 已完成任务不能再换
- 每个维度每天最多换一次
- 换任务必须换成同维度另一张任务卡
- 不消耗背包里的“任务换班券”

5. 支持领取生活抽奖券

新增接口：

```text
POST /api/gamification/tasks/claim-ticket
```

四个维度全部完成后，用户可以手动领取 1 张生活抽奖券。

发券会：

- 增加 `User.ticketBalance`
- 写入 `LotteryTicketLedger`
- 使用 `reason: "DAILY_TASKS_GRANTED"`
- 使用 `sourceType: "daily_tasks"`
- 使用 `sourceId: <userId>:<dayKey>`

重复领取不会重复加券，也不会新增第二条流水。

6. 升级票据流水去重约束

`LotteryTicketLedger` 的来源索引升级为：

```prisma
@@unique([sourceType, sourceId])
```

这样即使后续出现并发请求，也能用数据库约束兜住同一来源重复发券的问题。

7. 扩展补给站快照

`GamificationStateSnapshot` 新增可操作状态：

- 任务完成状态词
- 任务换卡次数
- `canComplete`
- `canReroll`
- `taskCompletedCount`
- `lifeTicketClaimable`

前端不需要自己猜按钮状态，直接使用快照里的服务端判断。

8. 升级补给站页面

`SupplyStation` 从 GM-03 的占位壳升级为可交互任务区：

- 首次加载调用 `ensure-today`
- 每张任务卡有“我完成了”和“换一个”
- 完成后展示完成状态
- 四项完成后显示“领取生活券”
- 领取后显示“今日生活券已到账”

抽奖机、背包详情、弱社交响应仍然保持 GM-06、GM-07、GM-12 的占位边界。

9. 加了测试覆盖

新增：

- `__tests__/gamification-tasks.test.ts`
- `__tests__/gamification-tasks-api.test.ts`

并更新：

- `__tests__/supply-station-shell.test.tsx`
- `__tests__/gamification-state-api.test.ts` 的回归期望通过扩展快照继续保持兼容

覆盖内容包括：

- 任务生成幂等
- 完成任务写入状态
- 已完成任务不被重复改写
- 每维度每日只能换一次
- 已完成任务不能换
- 未完成四项不能领券
- 四项完成后发 1 张生活券
- 重复领取不重复发券
- API 鉴权和快照返回
- 前端完成、换任务、领券交互

### GM-04 没有做的事

- 没有接入健身打卡发券
- 没有修改 `POST /api/board/punch`
- 没有实现抽奖
- 没有实现背包道具消耗
- 没有发银子
- 没有推进赛季
- 没有写团队动态
- 没有发送企业微信消息

### GM-04 总结

GM-04 让“牛马补给站”从只读壳进入第一个真实玩法闭环：每日四维任务可以生成、完成、换任务，并在完成后领取生活抽奖券。

这个版本仍然刻意保持边界很窄：生活券来自四维任务，健身券、抽奖、背包和弱社交继续留给后续 GM story。

## GM-05: Fitness Ticket Hook

GM-05 做的是“把真实健身打卡接入抽奖券经济”：用户完成当天真实健身打卡后，自动获得 1 张健身券；如果撤销打卡，系统会在同一个事务里尝试扣回这张券。

### 已完成内容

1. 健身打卡自动发券

`POST /api/board/punch` 在成功创建 `PunchRecord` 后，会同步增加 `User.ticketBalance`，并写入 `LotteryTicketLedger`：

- `reason: "FITNESS_PUNCH_GRANTED"`
- `sourceType: "fitness_punch"`
- `sourceId: <punchRecord.id>`

同一天重复打卡仍然会被现有唯一约束拦住，不会重复发券。

2. 撤销打卡时安全扣券

`DELETE /api/board/punch` 会先查找当天 punch 对应的发券流水。若存在且还没撤销过：

- 当前 `ticketBalance >= 1` 时，写入 `FITNESS_PUNCH_REVOKED` 流水并扣回 1 张券
- 当前 `ticketBalance < 1` 时，返回 `409`，保留 punch、银子、连签和赛季进度不变

历史 punch 如果没有 `FITNESS_PUNCH_GRANTED` 流水，仍按旧逻辑允许撤销，不补建也不强扣券。

3. 更新轻量前端提示

健身打卡确认弹窗提示会获得 1 张健身券；撤销弹窗说明会回滚未使用的健身券。若撤销被阻止，沿用现有错误展示显示服务端返回的原因。

4. 加了测试覆盖

新增：

- `__tests__/board-punch-fitness-ticket.test.ts`

并更新：

- `__tests__/heatmap-grid-punch.test.tsx`

覆盖内容包括：

- 真实健身打卡发 1 张券并写流水
- 重复打卡不重复发券
- 撤销未消费健身券时扣回并写撤销流水
- 健身券已消费时阻止撤销，并保持 punch 状态不变
- 没有发券流水的历史 punch 仍可撤销
- 前端展示发券、撤销和阻止撤销文案

### GM-05 没有做的事

- 没有实现抽奖
- 没有实现背包
- 没有实现健身请假券
- 没有改动四维任务生活券逻辑
- 没有改动赛季槽位或银子奖励规则
- 没有新增团队动态或企业微信消息

### GM-05 总结

GM-05 把主线健身打卡和“牛马补给站”的抽奖券余额接了起来，同时保持边界很窄：只负责健身券的获得、撤销和安全保护，不提前实现抽奖或背包。

## GM-06: Lottery V1

GM-06 把“牛马补给站”的抽奖入口从占位升级成第一版可用闭环：用户可以消耗抽奖券单抽或十连，十连在已有 7-9 张券时可以用银子补齐，奖励会在同一事务里结算到银子或背包库存。

### 已完成内容

1. 新增抽奖服务层

新增 `lib/gamification/lottery.ts`，集中处理：

- 单抽 / 十连参数校验
- 十连补券规则：40 银子 / 张，每人每天最多补 3 张
- 十连保底：至少 1 个 utility / social / rare 结果
- 抽奖主记录、结果记录、券流水、扣银子、发银子和背包入库的事务一致性
- `rewardSnapshotJson` 历史快照，避免后续配置文案变化影响旧记录展示

2. 新增抽奖 API

新增：

```text
POST /api/gamification/lottery/draw
```

接口读取 `userId` cookie，支持 `SINGLE` 和 `TEN`，成功返回最新 `GamificationStateSnapshot` 和本次 `draw`。

3. 升级补给站抽奖区

`SupplyStation` 的抽奖机从 GM-06 占位按钮升级为可操作按钮：

- 单抽按钮基于 `singleDrawEnabled` 启用
- 十连 / 补券十连按钮基于 `tenDrawEnabled` 启用
- 展示十连补券所需券数和银子成本
- 抽奖成功后展示本次奖励列表和保底状态

4. 扩展状态快照

`buildGamificationStateForUser` 现在返回 active lottery summary，包括单抽 / 十连可用状态、补券成本、每日补券用量和最近 3 次抽奖记录。

5. 加强测试覆盖

新增并更新：

- `__tests__/gamification-lottery.test.ts`
- `__tests__/gamification-lottery-api.test.ts`
- `__tests__/supply-station-shell.test.tsx`
- `__tests__/gamification-state-api.test.ts`

覆盖单抽、十连、补券上限、十连保底、奖励结算、API 校验和前端抽奖展示。

### GM-06 没有做的事

- 没有新增独立购券接口
- 没有允许单抽银子补券
- 没有实现道具使用
- 没有实现背包详情页
- 没有创建真实福利兑换记录
- 没有写团队动态或发送企业微信

### GM-06 总结

GM-06 完成了抽奖券的第一段消费闭环：GM-04 / GM-05 产出的券现在可以被真实消耗，并产出银子或背包库存。后续 GM-07 可以在此基础上把背包详情与库存管理补齐。

## GM-07: Backpack V1

GM-07 做的是“把抽奖产出的库存真正展示出来”：用户现在可以在补给站里看到自己持有的道具、分类、数量、效果说明、使用时机、使用限制和是否需要管理员确认。

### 已完成内容

1. 扩展背包快照

`GET /api/gamification/state` 里的 `snapshot.backpack` 已从旧的 preview 摘要升级为 active 结构，包含：

- `totalQuantity`
- `ownedItemCount`
- `previewItems`
- `groups`
- `todayEffects`
- `emptyMessage`

`previewItems` 继续保留，兼容 GM-03 / GM-06 的摘要展示习惯。

2. 新增道具展示 helper

新增 `lib/gamification/item-display.ts`，统一处理：

- 背包分类顺序和分类文案
- 使用时机文案
- 道具效果摘要
- 使用限制摘要
- 今日道具效果状态文案

3. 背包库存分组展示

`buildGamificationStateForUser()` 现在读取 `InventoryItem`，只把 `quantity > 0` 的库存放进可见背包，并按 `boost`、`protection`、`social`、`lottery`、`task`、`cosmetic`、`real_world`、`unknown` 分组。

未知 `itemId` 不会被隐藏，会进入 `unknown` 分组，并显示配置缺失提示。

4. 今日效果与永久库存分离

`ItemUseRecord` 中当天 `PENDING` 和 `SETTLED` 的记录会进入 `todayEffects`，用于展示“今日待生效 / 今日已结算”的道具效果。

`EXPIRED` 和 `CANCELLED` 不进入补给站主界面，避免噪音。

5. 升级补给站背包 UI

`SupplyStation` 的背包区现在支持：

- 按分类展示库存
- 点击道具切换详情
- 展示描述、效果、使用时机、限制和管理员确认要求
- 展示未知配置 / 已下架提醒
- 展示 GM-08 才会开放的使用入口提示
- 单独展示今日效果区

### GM-07 没有做的事

- 没有新增 `/bag` 路由
- 没有新增 `POST /api/gamification/items/use`
- 没有扣减 `InventoryItem.quantity`
- 没有创建新的 `ItemUseRecord`
- 没有创建 `SocialInvitation`
- 没有创建 `RealWorldRedemption`
- 没有发送企业微信消息

### GM-07 总结

GM-07 把 GM-06 产出的背包库存补成了可理解的资产视图。用户能看清“我抽到了什么、有什么用、还有几张”，但仍然不能使用道具；真正的使用、扣库存和结算留给 GM-08 / GM-09 / GM-10 / GM-12。

## GM-08: Today-Effective Item Use

GM-08 把 GM-07 的“可见背包”推进成“可操作背包”：用户现在可以在补给站里主动使用今日生效暴击、任务换班券和健身请假券。

### 已完成内容

1. 新增 `POST /api/gamification/items/use`

接口会验证登录态、校验 payload，调用统一的道具使用服务，并返回刷新后的 `GamificationStateSnapshot` 和本次 `itemUse` 结果。

2. 新增道具使用服务层

新增 `lib/gamification/item-use.ts`，集中处理库存可用量、历史 `PENDING` 懒过期、每日 / 每周 / 全队限制、今日 fitness boost 互斥和强暴击每上海周一次限制。

3. 支持 fitness boost 今日预占

健身暴击道具使用后会创建 `PENDING` 的 `ItemUseRecord`。如果当天已有真实健身打卡，会立即绑定到 `PunchRecord`；如果先用道具后健身，打卡成功时再绑定。

GM-08 不做真实经济结算，不增加银子 / 赛季收益，不扣 boost 库存，也不把 boost 标记为 `SETTLED`，这些留给 GM-09。

4. 支持任务换班券

`task_reroll_coupon` 可以选择任务维度，替换当天同维度未完成任务，递增 `rerollCount`，扣减库存，并写入 `SETTLED` 使用记录。

5. 支持健身请假券

`fitness_leave_coupon` 会扣减库存并写入 `SETTLED` 使用记录，但不创建健身打卡、不发抽奖券、不发银子、不推进赛季。下一次真实健身会通过请假保护接上 streak 档位。

6. 扩展背包快照和补给站交互

`GamificationBackpackItemSnapshot` 新增 `reservedQuantity`、`availableQuantity`、`useEnabled` 和 `useDisabledReason`。`SupplyStation` 现在会显示使用按钮、任务换班维度选择、禁用原因、今日预占量和使用成功消息。

### GM-08 没有做的事

- 没有实现暴击真实经济结算
- 没有扣减 fitness boost 库存
- 没有把 fitness boost 标记为 `SETTLED`
- 没有实现真实福利兑换
- 没有实现弱社交邀请道具
- 没有实现抽奖保底券、购券折扣券或趣味装饰
- 没有发送企业微信消息

### GM-08 总结

GM-08 让第一批背包道具真正可用，系统已经能记录、预占、扣库存或绑定目标；暴击带来的银子 / 赛季收益放大仍然留给 GM-09 统一结算。

## 后续推荐顺序

## GM-09: Boost Settlement Integration

GM-09 把 GM-08 产生的 `PENDING` fitness boost 接入真实健身打卡结算：boost 会影响个人银子、赛季收入或两者，结算成功后扣库存并把 `ItemUseRecord` 标记为 `SETTLED`。

### 已完成内容

1. 拆分打卡结算字段

`PunchRecord` 现在持久化基础银子、boost 银子加成、基础赛季收入、boost 赛季收入加成和实际赛季收入。这样个人银子和赛季收入可以安全分开回滚。

2. 新增 boost settlement 服务

`lib/gamification/boost-settlement.ts` 统一负责 boost 效果计算、库存扣减、`ItemUseRecord.SETTLED`、`PunchRecord` 快照写入和幂等保护。

3. 接入真实健身打卡

先用 boost 后健身时，打卡事务会直接结算 boost，并按结算后的金额增加 `User.coins` 与 `SeasonMemberStat.seasonIncome`。赛季 slot 仍然每次真实打卡最多推进 1 格。

4. 接入打卡后补结算

先健身后用 boost 时，`POST /api/gamification/items/use` 会立即对当天真实打卡补发差额，只补增 boost bonus，不重复发基础奖励。

5. 修正撤销回滚

撤销打卡时，个人银子按 `assetAwarded` 回滚，赛季收入按 `seasonContributionAwarded` 回滚；已经消耗的 boost 库存不返还，`ItemUseRecord` 保持 `SETTLED`。

6. 补充用户可见反馈

打卡动态会显示 boost 生效文案；撤销动态会提示已消耗 boost 不返还。

### GM-09 总结

GM-09 完成了 fitness boost 从“今日待生效记录”到“真实经济结算”的闭环。后续真实福利、弱社交和战报统计可以直接读取 `PunchRecord` 的拆分结算字段。

## GM-10: Real-World Redemption

GM-10 把“瑞幸咖啡券”从只会出现在背包里的真实福利，推进成完整的线下兑换流程：用户可以申请兑换，系统立刻扣减背包库存；管理员可以确认已兑换，也可以取消并返还库存。

### 已完成内容

1. 新增真实福利兑换服务层

新增 `lib/gamification/redemptions.ts`，集中处理真实福利兑换的核心规则：

- 只有 `real_world_redemption` 类型道具可以申请兑换
- 当前版本实际支持 `luckin_coffee_coupon`
- 申请兑换时原子扣减 `InventoryItem.quantity`
- 扣减成功后创建 `RealWorldRedemption`
- 确认和取消都只能处理 `REQUESTED` 状态
- 取消时只返还 1 张库存，确认时不返还
- `CONFIRMED` 和 `CANCELLED` 都是终态，不能重复处理

2. 扩展真实福利兑换数据模型

`RealWorldRedemption` 补充了取消审计字段：

```prisma
cancelledByUserId String?
cancelledByUser   User?
cancelledAt       DateTime?
```

这样确认和取消都能追踪“是谁处理的、什么时候处理的”。

3. 新增用户申请兑换 API

新增：

```text
POST /api/gamification/redemptions/request
```

用户从背包里点击“申请兑换”后，会校验登录、校验道具、扣减 1 张瑞幸券、创建 `REQUESTED` 兑换记录，并返回剩余库存。

4. 新增管理员确认 / 取消 API

新增：

```text
POST /api/admin/gamification/redemptions/confirm
POST /api/admin/gamification/redemptions/cancel
```

管理员 API 必须是 `ADMIN` 才能调用，并且只能处理自己团队里的兑换记录。确认成功后状态变成 `CONFIRMED`；取消成功后状态变成 `CANCELLED`，并把券返还到用户背包。

5. 扩展补给站状态快照

`GamificationStateSnapshot` 新增：

```ts
currentUserRole
redemptions: {
  mine
  adminQueue
}
```

`mine` 是当前用户自己的最近兑换记录；`adminQueue` 只给管理员返回本队待处理兑换，普通成员看到空数组。

6. 升级补给站 UI

`SupplyStation` 现在新增了：

- 瑞幸券详情里的“申请兑换”按钮
- “我的兑换”列表
- 管理员可见的“待处理兑换”队列
- “确认已兑换”按钮
- “取消并返还”按钮
- 申请 / 确认 / 取消后的状态刷新和提示

7. 保持真实福利兑换边界清晰

GM-10 刻意没有做这些事：

- 没有创建 `CoffeeRecord`
- 没有自动给用户记咖啡
- 没有发送企业微信消息
- 没有写团队动态
- 没有生成兑换码
- 没有做独立商城后台

8. 加强测试覆盖

新增并更新：

- `__tests__/gamification-redemptions.test.ts`
- `__tests__/gamification-redemption-api.test.ts`
- `__tests__/gamification-state-api.test.ts`
- `__tests__/supply-station-shell.test.tsx`

覆盖了申请扣库存、并发只成功一次、非真实福利不可兑换、管理员权限、团队隔离、确认、取消返还、重复取消保护、状态快照和前端交互。

### GM-10 总结

GM-10 完成了真实福利兑换的第一版闭环：瑞幸券现在不只是“抽到了能看见”，而是可以从背包申请兑换、由管理员线下处理、在系统里确认或取消，并且库存不会被重复消费或重复返还。

## GM-11: Enterprise WeChat Sender Foundation

GM-11 做的是“先把企业微信发送通道打稳”：提供一个可复用的服务端 sender、formatter、环境变量配置、发送日志和管理员测试 API，给后续 GM-12 弱社交邀请和 GM-15 周报推送复用。

### 已完成内容

1. 新增统一企业微信 sender

核心实现集中在 `lib/integrations/enterprise-wechat.ts`，对外提供：

- `formatEnterpriseWechatText()`
- `formatEnterpriseWechatMarkdown()`
- `sendEnterpriseWechatMessage()`
- `recordEnterpriseWechatPushEvent()`

业务代码以后不需要自己拼企业微信 payload，也不需要自己处理 webhook 成功 / 失败分支，统一通过这个 sender 返回结构化结果。

2. 支持 text 和 markdown 两类消息

formatter 现在会：

- 清理空行
- 给 text 消息生成标题行
- 给 markdown 消息生成标题、引用、列表和 footer
- 对过长内容做安全截断

发送 payload 会分别映射到企业微信机器人要求的 `text.content` 和 `markdown.content` 结构。

3. 使用服务端环境变量配置 webhook

配置统一读取：

```text
ENTERPRISE_WECHAT_WEBHOOK_URL
```

`.env.example` 里只记录变量名和说明，不包含真实 key，也不使用 `NEXT_PUBLIC_` 前缀。

4. 明确外部通道失败语义

sender 不把可预期的外部通知失败直接抛给业务调用方，而是返回结构化结果：

- 缺少 webhook：`SKIPPED / MISSING_WEBHOOK_CONFIG`
- 空消息：`FAILED / INVALID_MESSAGE`
- 网络异常：`FAILED / NETWORK_ERROR`
- HTTP 非 2xx：`FAILED / HTTP_ERROR`
- 企业微信 `errcode !== 0` 或缺失成功码：`FAILED / WECHAT_ERROR`
- HTTP 2xx 且 `errcode === 0`：`SENT`

这样后续 GM-12 / GM-15 可以先完成本地业务，再把企业微信发送作为外部通知结果记录下来，不因为群机器人短暂失败而回滚本地业务。

5. 写入发送日志

`EnterpriseWechatSendLog` 记录每一次 `SENT`、`SKIPPED` 和 `FAILED` 尝试，包括：

- team / purpose
- targetType / targetId
- messageType / content preview
- status / failureReason
- HTTP 状态码
- 企业微信 errcode / errmsg
- 错误摘要和响应片段

日志不会保存 webhook URL 或 webhook key；网络错误和响应片段也会做脱敏。`EnterpriseWechatSendLog` 补充了按目标对象和状态查询的索引。

6. 新增管理员测试 API

新增接口：

```text
POST /api/admin/integrations/enterprise-wechat/test
```

规则：

- 未登录返回 `401`
- 非管理员返回 `403`
- malformed / 空消息返回 `400`
- 管理员以自己的 teamId 发送 `MANUAL_TEST`
- 返回 sender 的结构化 result
- 不在响应里暴露 webhook URL 或 key

GM-11 没有新增可见 UI；这个接口只是给后续管理入口或手动验证 webhook 配置使用。

7. 保持 GM-11 边界清晰

GM-11 刻意没有做这些事：

- 没有创建弱社交邀请
- 没有生成周报
- 没有创建团队动态
- 没有写游戏经济流水
- 没有实现企业微信 OAuth / 回调
- 没有做团队级 webhook 配置后台
- 没有新增前端页面或按钮

8. 加强测试覆盖

新增并更新：

- `__tests__/enterprise-wechat-sender.test.ts`
- `__tests__/enterprise-wechat-admin-api.test.ts`
- `__tests__/wework-webhook.test.ts`
- `__tests__/weekly-report-api.test.ts`
- `__tests__/social-invitations-api.test.ts`

覆盖了 formatter、缺配置跳过、成功发送、HTTP / 企业微信 / 网络失败、日志脱敏、push event 去重，以及管理员测试接口的认证、权限、坏请求和成功发送。

### GM-11 总结

GM-11 完成了企业微信发送基础设施：后续业务只需要构造消息、调用统一 sender，并根据结构化结果记录发送状态。GM-12 可以直接复用它发送弱社交提醒，GM-15 可以复用它发送周报推送。

## GM-12: Weak Social Invitations V1

GM-12 把弱社交道具从“背包里可见”推进到“真正可以使用”：用户可以消耗社交道具发起点名或全队邀请，系统创建 `ItemUseRecord.SETTLED` 和 `SocialInvitation.PENDING`，再复用 GM-11 sender 发送企业微信提醒。

### 已完成内容

1. 新增 gamification 社交邀请服务

`lib/gamification/social-invitations.ts` 统一负责：

- 校验 `social_invitation` 道具定义
- 校验直接邀请 recipient、同队限制和不能邀请自己
- 校验同日重复直接邀请
- 扣减库存
- 写入 `ItemUseRecord.SETTLED`
- 写入 `SocialInvitation.PENDING`
- 本地事务成功后发送企业微信
- 企业微信失败不回滚本地邀请
- 响应邀请并写入 `SocialInvitationResponse`
- 懒过期跨天 `PENDING` 邀请

2. 升级社交响应数据模型

`SocialInvitationResponse` 补充了 `displayPayloadJson` 和 responder/day 查询索引，用于后续 GM-13 / GM-15 复用响应素材。

3. 接入道具使用 API

`POST /api/gamification/items/use` 现在支持 6 个弱社交道具：

- `drink_water_ping`
- `walk_ping`
- `chat_ping`
- `share_info_ping`
- `team_standup_ping`
- `team_broadcast_coupon`

单人邀请需要 `recipientUserId`；全队邀请不需要 recipient。

4. 新增响应 API

新增：

```text
POST /api/gamification/social/respond
```

它会校验登录、同队、过期状态、直接邀请 recipient、全队邀请不能响应自己、以及同一用户不能重复响应同一邀请。

5. 升级补给站社交摘要

`GET /api/gamification/state` 的 `social` 从 placeholder 升级为 active，返回：

- 我发出的邀请
- 我收到的邀请
- 全队邀请
- 最近响应
- 可选收件人列表
- 待响应计数

6. 补给站新增弱社交 UI

`SupplyStation` 现在展示 active 社交面板，支持查看收到、全队、发出的邀请，并能从界面响应邀请。背包里的社交道具也新增了收件人选择和可选留言输入。

### GM-12 总结

GM-12 完成了弱社交邀请闭环：社交道具可以被使用、库存会扣减、邀请会落库、企业微信会提醒、成员可以响应，且响应不产生银子、抽奖券、赛季推进、团队动态或周报输出。GM-13 可以继续把高价值弱社交事件接入团队动态。

## GM-13: Team Dynamics Integration

GM-13 把补给站里的少量高价值游戏化事件沉淀到主线 Team Dynamics，复用既有 `TeamDynamic` 模型、`createOrReuseTeamDynamic` 去重服务、喇叭面板和 `/dynamics` 时间线，不新增独立动态基础设施。

### 已完成内容

1. 扩展 Team Dynamics 类型注册

新增 5 个游戏化动态类型：

- `GAME_RARE_PRIZE`
- `GAME_TASK_STREAK_MILESTONE`
- `GAME_BOOST_MILESTONE`
- `GAME_TEAM_BROADCAST`
- `GAME_SOCIAL_MOMENT`

并补充对应卡片 label 和 tone，让喇叭面板与 `/dynamics` 页面可以识别这些事件。

2. 新增游戏化动态桥接服务

新增 `lib/gamification/team-dynamics.ts`，集中处理高光判定、payload 构造、稳定 `sourceType + sourceId` 和失败隔离。

业务模块不直接写 `prisma.teamDynamic.create`，统一通过 `safeCreateGameTeamDynamic()` 调用主线 `createOrReuseTeamDynamic()`。

3. 接入抽奖高光

`drawLottery()` 在抽奖事务成功后检查每个 `LotteryDrawResult`：

- rare 奖励、真实福利奖励或显式高光奖励写入 `GAME_RARE_PRIZE`
- 普通金币和普通小奖励不写入团队动态
- 动态写入失败不会回滚抽奖结果

4. 接入四维任务里程碑

`claimDailyTasksTicket()` 在生活券领取成功后统计连续四维全完成天数，只在 `3 / 7 / 14 / 30` 天写入 `GAME_TASK_STREAK_MILESTONE`。

5. 接入 boost 高光

`settleBoostForPunch()` 在 boost 结算成功后判断是否至少翻倍个人银子或赛季贡献，符合条件时写入 `GAME_BOOST_MILESTONE`；小暴击等非高光 boost 不写。

6. 接入弱社交高光

`team_broadcast_coupon` 创建全队广播后写入 `GAME_TEAM_BROADCAST`。

全队邀请达到 2 个响应后写入 1 条 `GAME_SOCIAL_MOMENT`，后续第 3、第 4 个响应不重复写同一条动态。

7. 补充失败隔离测试

覆盖 Team Dynamics 写入失败时，抽奖、生活券领取、boost 结算和社交响应仍然完成主流程。

### GM-13 总结

GM-13 完成了游戏化高价值事件到团队动态时间线的桥接：普通玩法继续留在补给站自己的模块里，只有值得回看的少量事件进入团队动态；所有写入都使用稳定来源去重，并且 Team Dynamics 失败不会拖垮游戏化主流程。

## GM-14: Docs Center Rule Pages

GM-14 把已经稳定下来的补给站规则沉淀到文档中心，提供可维护的本地内容模块、可深链访问的规则页面，以及从补给站回到规则说明的入口。

### 已完成内容

1. 新增补给站文档内容模块

新增 `content/docs-center/gamification.ts`，集中维护：

- changelog
- 玩法规则
- 使用说明
- FAQ
- 稳定 anchors
- 必须覆盖的经济和行为规则 facts
- `validateGamificationDocs()` 本地校验函数

规则覆盖每日免费券、四维任务、抽奖与十连、背包与消耗、boost、健身请假券、弱社交、瑞幸咖啡券兑换和团队动态边界。

2. 新增 Docs Center 渲染组件

新增 `components/docs-center/GamificationDocsSection.tsx`，把补给站 changelog、规则、帮助和 FAQ 渲染成同一个可深链的文档区块。

稳定入口包括：

- `/docs?tab=rules#supply-station-rules`
- `/docs?tab=rules#supply-station-help`
- `/docs?tab=rules#supply-station-faq`
- `/docs?tab=rules#supply-station-changelog`

3. 接入主线 Docs Center

`DocsCenter` 在规则 tab 下挂载补给站文档区块，并把 `supply-station-rules` 加入目录链接，让规则页可以从侧栏直达。

4. 补给站新增规则入口

`SupplyStation` 页头新增“玩法规则”入口，指向 `/docs?tab=rules#supply-station-rules`。

抽奖、背包、真实福利兑换区域也新增轻量规则链接，分别指向对应规则锚点，不打断主流程。

5. 补充测试覆盖

新增和扩展测试覆盖：

- 内容 anchors 和 required facts
- FAQ 关键主题
- `GamificationDocsSection` 渲染和锚点
- Docs Center 规则 tab 集成
- Supply Station 规则入口链接

### GM-14 总结

GM-14 完成了补给站规则的“长期说明书”：规则内容集中在本地内容模块，Docs Center 负责展示和深链，Supply Station 只提供入口；没有新增数据库、API、CMS，也没有修改抽奖概率、道具效果、兑换状态机或经济规则。

## GM-15: Weekly Report / Report Center Integration

GM-15 把 GM-04 到 GM-13 已经沉淀下来的补给站数据接入战报中心，生成一份团队内可读、管理员可发布、可选企业微信发送的游戏化周报。

### 已完成内容

1. 新增牛马补给周报服务层

新增 `lib/gamification/weekly-report.ts`，集中处理：

- Asia/Shanghai 自然周归一化，周一为一周开始
- 四维任务完成率、全清天数和预期任务数
- 健身券、生活券、补券、抽奖消耗和净变化
- 单抽 / 十连、银子消耗、银子奖励、稀有奖励和真实福利
- 道具使用、boost bonus、请假券、待结算 / 过期道具
- 弱社交邀请、直接 / 全队邀请、响应数和响应率
- GM-13 `GAME_*` 团队动态高光

读取周报只做聚合，不修改任何游戏化业务数据。

2. 新增周报快照类型

`lib/types.ts` 新增 `GamificationWeeklyReportSnapshot`、metrics、metric cards、summary cards、highlights 和 publish result 类型，前后端共享同一份结构。

3. 新增周报读取 API

新增：

```text
GET /api/gamification/reports/weekly?weekStart=2026-04-20
```

登录成员都可以读取自己团队的周报；不传 `weekStart` 时读取当前上海自然周。

4. 新增周报发布 API

新增：

```text
POST /api/gamification/reports/weekly/publish
```

规则：

- 仅管理员可发布
- 发布创建或复用 `TeamDynamic`
- `sourceType = gamification_weekly_report`
- `sourceId = ${teamId}:${weekStartDayKey}`
- 同一团队同一周重复发布只复用已有动态
- 可选发送企业微信摘要
- 企业微信失败不会回滚 TeamDynamic
- 发布不会发银子、发券、发道具、改 streak 或推进赛季

5. 新增战报中心周报面板

新增 `components/report-center/GamificationWeeklyReportPanel.tsx` 并挂载到 `ReportCenter` 趋势 / 咖啡区域下方。

普通成员可查看：

- 周报日期范围
- 四个指标卡：四维完成率、本周发券、抽奖次数、弱社交响应
- 三个摘要块
- 本周高光列表

管理员额外可见：

- `发布到团队动态`
- `发布并发送企业微信`

6. 新增客户端 API helper 和样式

`lib/api.ts` 新增：

- `fetchGamificationWeeklyReport()`
- `publishGamificationWeeklyReportRequest()`

`app/globals.css` 新增 brutalist 风格周报面板、指标卡、高光、状态和发布按钮样式。

7. 补充测试覆盖

新增并更新：

- `__tests__/gamification-weekly-report.test.ts`
- `__tests__/gamification-weekly-report-api.test.ts`
- `__tests__/gamification-weekly-report-panel.test.tsx`
- `__tests__/report-center-component.test.tsx`

覆盖周边界、空状态、核心聚合、消息文案、发布幂等、认证 / 权限、面板加载 / 错误 / 管理员状态和 Report Center 集成。

### GM-15 总结

GM-15 完成了补给站周报的第一版闭环：服务层按团队聚合数据，API 提供成员读取和管理员发布，战报中心展示可读摘要，并且发布结果沉淀为 Team Dynamics。它没有新增数据库模型，没有改动抽奖 / 道具 / boost / 弱社交经济规则，也不会因为周报发布改变任何用户资产。

## 相关文档

- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`
- `docs/superpowers/specs/2026-04-25-gm-01-content-config-foundation-design.md`
- `docs/superpowers/plans/2026-04-25-gm-01-content-config-foundation.md`
- `docs/superpowers/specs/2026-04-25-gm-02-database-foundation-design.md`
- `docs/superpowers/plans/2026-04-25-gm-02-database-foundation.md`
- `docs/superpowers/specs/2026-04-25-gm-03-supply-station-shell-design.md`
- `docs/superpowers/plans/2026-04-25-gm-03-supply-station-shell.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/plans/2026-04-25-gm-04-daily-tasks-life-ticket.md`
- `docs/superpowers/specs/2026-04-25-gm-05-fitness-ticket-hook-design.md`
- `docs/superpowers/plans/2026-04-25-gm-05-fitness-ticket-hook.md`
- `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- `docs/superpowers/plans/2026-04-25-gm-06-lottery-v1.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/plans/2026-04-26-gm-07-backpack-v1.md`
- `docs/superpowers/specs/2026-04-26-gm-08-today-effective-item-use-design.md`
- `docs/superpowers/plans/2026-04-26-gm-08-today-effective-item-use.md`
- `docs/superpowers/specs/2026-04-26-gm-09-boost-settlement-integration-design.md`
- `docs/superpowers/plans/2026-04-26-gm-09-boost-settlement-integration.md`
- `docs/superpowers/specs/2026-04-26-gm-10-real-world-redemption-design.md`
- `docs/superpowers/plans/2026-04-26-gm-10-real-world-redemption.md`
- `docs/superpowers/specs/2026-04-26-gm-11-enterprise-wechat-sender-design.md`
- `docs/superpowers/plans/2026-04-26-gm-11-enterprise-wechat-sender.md`
- `docs/superpowers/specs/2026-04-26-gm-12-weak-social-invitations-design.md`
- `docs/superpowers/plans/2026-04-26-gm-12-weak-social-invitations.md`
- `docs/superpowers/specs/2026-04-26-gm-13-team-dynamics-integration-design.md`
- `docs/superpowers/plans/2026-04-26-gm-13-team-dynamics-integration.md`
- `docs/superpowers/specs/2026-04-26-gm-14-docs-center-rule-pages-design.md`
- `docs/superpowers/plans/2026-04-26-gm-14-docs-center-rule-pages.md`
- `docs/superpowers/specs/2026-04-26-gm-15-weekly-report-report-center-integration-design.md`
- `docs/superpowers/plans/2026-04-26-gm-15-weekly-report-report-center-integration.md`

## 更新记录

- 2026-04-30: GM-15 完成，新增牛马补给周报服务层、共享快照类型、读取 / 发布 API、战报中心周报面板、管理员发布到 Team Dynamics、可选企业微信发送和对应测试覆盖；未新增数据库模型，未改变抽奖、道具、boost、弱社交或资产经济规则。
- 2026-04-30: GM-14 完成，新增补给站文档内容模块、规则 facts 校验、Docs Center 补给站规则区块、规则 tab 深链目录、Supply Station 规则入口和对应测试覆盖；未新增数据库、API、CMS 或经济规则变更。
- 2026-04-30: GM-13 完成，新增游戏化 Team Dynamics 桥接服务、五类 GAME_* 动态类型、rare 抽奖高光、四维任务里程碑、boost 高光、团队小喇叭、多人响应社交时刻，以及下游动态写入失败不回滚主流程的测试覆盖。
- 2026-04-30: GM-12 完成，新增弱社交邀请服务、道具使用接入、社交响应 API、active social snapshot、补给站邀请面板、企业微信发送失败不回滚语义和测试覆盖。
- 2026-04-30: GM-11 完成，新增统一企业微信 sender、text / markdown formatter、服务端 webhook 配置、发送结果结构化处理、发送日志脱敏、管理员测试 API 和测试覆盖。
- 2026-04-30: GM-10 完成，新增真实福利兑换服务、用户申请兑换、管理员确认 / 取消、取消返还库存、兑换状态快照、补给站兑换 UI 和测试覆盖。

- 2026-04-29: GM-09 完成，新增 boost 真实结算、打卡收益拆分字段、打卡/道具使用双入口结算、撤销独立回滚和 boost 动态文案。
- 2026-04-29: GM-08 完成，新增道具使用 API、item-use 服务、fitness boost 预占与打卡绑定、任务换班券、健身请假券、背包可用量和补给站使用按钮。
- 2026-04-29: GM-07 完成，新增 active 背包快照、库存分组、道具详情、今日效果区、未知配置展示和补给站背包交互。
- 2026-04-29: GM-06 完成，新增单抽、十连、十连补券、保底、抽奖记录、奖励结算、抽奖 API 和补给站抽奖交互。
- 2026-04-29: GM-05 完成，新增健身打卡自动发券、撤销安全扣券、券已消费时阻止撤销、前端轻量提示和测试覆盖。
- 2026-04-29: GM-04 完成，新增每日四维任务生成、完成、免费换任务、生活券领取、任务 API、补给站交互和测试覆盖。
- 2026-04-29: GM-03 完成，新增牛马补给站导航入口、只读聚合状态接口、页面壳、占位区域和测试覆盖。
- 2026-04-29: 新增本文档，记录 GM-01 和 GM-02 已完成内容，并明确 GM-03 到 GM-05 的下一步顺序。
