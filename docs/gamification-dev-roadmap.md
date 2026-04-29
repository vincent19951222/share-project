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
| GM-06 | Lottery V1 | 待开始 | 是 |
| GM-07 | Backpack V1 | 待开始 | 是 |
| GM-08 | Today-Effective Item Use | 待开始 | 是 |
| GM-09 | Boost Settlement Integration | 待开始 | 少量提示 |
| GM-10 | Real-World Redemption | 待开始 | 是 |
| GM-11 | Enterprise WeChat Sender Foundation | 待开始 | 否 |
| GM-12 | Weak Social Invitations V1 | 待开始 | 是 |
| GM-13 | Team Dynamics Integration | 待开始 | 基本否 |
| GM-14 | Docs Center Rule Pages | 待开始 | 是 |
| GM-15 | Weekly Report / Report Center Integration | 待开始 | 是 |

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

## 后续推荐顺序

### 下一步：GM-06 Lottery V1

目标：让抽奖券真正可以消耗，并产出银子、道具或后续可兑换奖励。

GM-06 应该交付：

- 单抽消耗 1 张抽奖券
- 写入抽奖主记录和结果记录
- 根据奖池配置产出奖励
- 保持抽奖和奖励入账事务一致

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

## 更新记录

- 2026-04-29: GM-05 完成，新增健身打卡自动发券、撤销安全扣券、券已消费时阻止撤销、前端轻量提示和测试覆盖。
- 2026-04-29: GM-04 完成，新增每日四维任务生成、完成、免费换任务、生活券领取、任务 API、补给站交互和测试覆盖。
- 2026-04-29: GM-03 完成，新增牛马补给站导航入口、只读聚合状态接口、页面壳、占位区域和测试覆盖。
- 2026-04-29: 新增本文档，记录 GM-01 和 GM-02 已完成内容，并明确 GM-03 到 GM-05 的下一步顺序。
