# 牛马补给站第三阶段生产接入 Overall Spec

> 第三阶段目标：用已经验收过的 Supply UI Lab 视觉系统完整替换生产 `SupplyStation`，并把 UI Lab 已承诺的页面状态接入真实业务。第三阶段允许补齐必要的数据库模型和 API，但不新增 UI Lab 之外的新玩法。

## 背景

前两阶段已经完成静态复刻和组件化收口：

- UI Lab 页面族位于 `app/ui-lab/supply-dashboard/*` 与 `components/gamification/ui-lab/*`。
- 生产补给站位于 `components/gamification/SupplyStation.tsx`，目前是旧视觉，但已经接入真实任务、抽奖、背包、弱社交和兑换 API。
- 真实聚合状态位于 `lib/gamification/state.ts`，公共类型位于 `lib/types.ts`。
- 当前 Prisma schema 和本地 `prisma/dev.db` 已经有游戏化主链路表。

第三阶段不是“把静态页面复制进生产”，而是把 UI Lab 的页面结构转成生产 view-model，再把生产 mutation 接到新页面组件上。

## 已确认决策

1. `team-goal` 不进入第三阶段。
2. 数据库继续保留 `User.coins` 字段，不在本阶段改名为 `gp`。
3. UI 文案继续把 `coins` 展示为“银子”。
4. `Lv / EXP / 牛马等级` 在第三阶段做成真实业务数据。
5. 补给商店在第三阶段做真实购买，不停留在纯 catalog/showcase。
6. 背包容量第三阶段先固定展示为 `60`，不新增容量购买或容量模型。
7. UI Lab routes 在第三阶段期间保留为设计和回归参考，不作为生产入口。

## 目标

1. 用 UI Lab 的视觉系统替换生产 `components/gamification/SupplyStation.tsx`。
2. 保留现有生产业务能力：任务生成、任务完成、换班、领券、抽奖、十连补券、背包、道具使用、弱社交、实物兑换、管理员确认。
3. 新增最小 EXP/等级模型，让 Dashboard 中的等级、EXP 和称号不再是静态假数据。
4. 新增最小商店购买模型/API，让补给商店能真实扣银子并增加背包库存。
5. 新增任务记录聚合 view-model，把分散在任务、抽奖、兑换、弱社交、券流水里的记录整合成 UI Lab 的任务记录页。
6. 保证生产数据库发布流程清楚：开发库、生产库、备份、schema push、回滚和验收 SQL 都有明确说明。

## 非目标

- 不实现 `team-goal` 页面或团队目标新玩法。
- 不新增排行榜、帮助中心、意见反馈、设置、背包扩容、体力系统。
- 不把 `coins` 数据库字段改名为 `gp`。
- 不新增独立后端服务；仍使用 Next.js API Routes 和 Prisma。
- 不重写现有抽奖概率、十连保底、道具效果、弱社交规则。
- 不把 UI Lab mock 数据作为生产真相；生产只复用视觉组件和必要静态 catalog 映射。

## UI Lab 与生产能力对照

| UI Lab 页面 | 已有真实能力 | 第三阶段缺口 | 决策 |
| --- | --- | --- | --- |
| Dashboard | 任务、券、背包、今日效果、用户银子已有 | EXP/等级缺真实模型；需要生产 view-model | 接入生产，补 EXP |
| Draw Pool | 单抽、十连、补券、抽奖记录、奖池配置已有 | UI Lab 机器页 view-model 与结果展示适配 | 接入生产 |
| Backpack | 库存、道具使用、今日效果、实物兑换申请已有 | 固定容量展示；分页/详情/操作状态适配 | 接入生产 |
| Shop | 真实 catalog 配置已有，背包和银子已有 | 没有购买模型/API/限购流水 | 新增真实购买 |
| Task Record | 原始数据分散在多表 | 没有统一聚合 API/view-model | 新增聚合层 |
| Task Card Review | UI Lab 设计审查页 | 不是生产用户流程 | 保留实验室，不进生产 |
| Team Goal | 当前 workspace 无 route | 会引入新页面和玩法边界 | 第三阶段不做 |

## 数据库现状

已存在并可复用：

- `User.coins`：生产字段名保留，UI 显示“银子”。
- `User.ticketBalance`：抽奖券余额。
- `LotteryTicketLedger`：抽奖券流水。
- `InventoryItem`：背包库存。
- `ItemUseRecord`：道具使用记录和今日效果。
- `DailyTaskAssignment`：每日四维任务。
- `LotteryDraw` / `LotteryDrawResult`：抽奖和结果。
- `RealWorldRedemption`：实物福利兑换。
- `SocialInvitation` / `SocialInvitationResponse`：弱社交邀请与响应。
- `Season` / `SeasonMemberStat` / `PunchRecord`：健身打卡和赛季主线。

第三阶段需要新增：

### ExperienceLedger

用途：记录 EXP 来源，支撑用户等级、任务记录和后续运营核查。

建议字段：

- `id`
- `userId`
- `teamId`
- `dayKey`
- `delta`
- `balanceAfter`
- `reason`
- `sourceType`
- `sourceId`
- `metadataJson`
- `createdAt`

唯一性建议：

- `@@unique([sourceType, sourceId])`，避免同一来源重复发 EXP。
- `@@index([userId, createdAt])`
- `@@index([teamId, dayKey, createdAt])`

### User.exp

用途：保存用户 EXP 当前余额。等级由 EXP 推导，不单独保存等级。

等级公式：

```text
level = floor(exp / 1000) + 1
currentLevelExp = exp % 1000
nextLevelExp = 1000
```

### ShopPurchase

用途：记录商店购买，支撑限购、审计和任务记录。

建议字段：

- `id`
- `userId`
- `teamId`
- `itemId`
- `quantity`
- `unitPriceCoins`
- `totalPriceCoins`
- `dayKey`
- `weekKey`
- `status`
- `createdAt`
- `metadataJson`

索引建议：

- `@@index([userId, dayKey, itemId])`
- `@@index([userId, weekKey, itemId])`
- `@@index([teamId, createdAt])`

## EXP 规则

第三阶段只做最小真实成长，不新增复杂天赋、称号背包或赛季等级。

初始发放建议：

- 完成每日四维任务：每个任务 `+50 EXP`。
- 真实健身打卡：`+100 EXP`。
- 抽奖、商店购买、弱社交响应默认不发 EXP，除非后续单独设计。

称号规则：

- 不新增称号表。
- Dashboard 展示称号由等级推导：
  - Lv.1-9：自律牛马
  - Lv.10-24：稳定脱脂牛马
  - Lv.25+：卷王预备役

幂等要求：

- 每个任务完成只发一次 EXP。
- 每次真实打卡只发一次 EXP。
- 删除/撤销已有打卡时，本阶段不做 EXP 回滚；如果需要回滚，必须在实施计划中明确额外任务。

## 商店规则

商店商品来源对齐 `content/gamification/item-definitions.ts` 和 UI Lab `supplyUiLabCatalog` 中的 active non-coin items。

购买行为：

1. 用户点击购买。
2. API 校验登录、商品存在、商品启用、价格、库存限制和购买限制。
3. 事务内扣减 `User.coins`。
4. 事务内增加 `InventoryItem.quantity`。
5. 写入 `ShopPurchase`。
6. 返回新的生产补给站 snapshot。

限制：

- 每日限购使用 `ShopPurchase.dayKey` 统计。
- 每周限购使用 `ShopPurchase.weekKey` 统计。
- 真实福利类商品可以买入背包，但兑换仍走 `RealWorldRedemption` 管理员确认流程。
- 不允许购买抽奖券；十连补券继续走现有抽奖流程。
- 不允许购买 disabled item。

## 生产 View-Model 架构

新增一层 `SupplyStationProductionSnapshot`，由真实 `GamificationStateSnapshot`、用户资料、内容配置、EXP、商店购买统计和任务记录聚合生成。

建议分层：

```text
lib/gamification/supply-view-model.ts
  buildSupplyStationViewModelForUser()
  mapDashboardViewModel()
  mapBackpackViewModel()
  mapDrawPoolViewModel()
  mapShopViewModel()
  mapTaskRecordViewModel()

components/gamification/production/
  SupplyStation.tsx
  SupplyDashboardPanel.tsx
  SupplyDrawPoolPanel.tsx
  SupplyBackpackPanel.tsx
  SupplyShopPanel.tsx
  SupplyTaskRecordPanel.tsx
```

旧的 `components/gamification/SupplyStation.tsx` 可以作为入口文件保留名称，内部改为渲染新的 production 组件，避免修改主应用 tab wiring。

## API 规划

现有 API 继续保留：

- `GET /api/gamification/state`
- `POST /api/gamification/tasks/ensure-today`
- `POST /api/gamification/tasks/complete`
- `POST /api/gamification/tasks/reroll`
- `POST /api/gamification/tasks/claim-ticket`
- `POST /api/gamification/lottery/draw`
- `POST /api/gamification/items/use`
- `POST /api/gamification/social/respond`
- `POST /api/gamification/redemptions/request`
- `POST /api/admin/gamification/redemptions/confirm`
- `POST /api/admin/gamification/redemptions/cancel`

第三阶段新增或扩展：

- `GET /api/gamification/supply/state`：返回新生产补给站 view-model。
- `POST /api/gamification/shop/purchase`：商店购买。
- 可选：`GET /api/gamification/task-records`，如果任务记录聚合太大，不放进 supply state 主响应。

接口原则：

- Mutation 后返回新的 supply view-model 或足够刷新局部 view-model 的数据。
- 401、403、409 错误文案必须能直接展示到 UI。
- 所有写操作必须在事务内完成经济扣减和流水记录。

## 任务记录聚合

任务记录页显示最近 7 天：

- 每日四维任务完成记录：来自 `DailyTaskAssignment`。
- 抽奖记录：来自 `LotteryDraw` 和 `LotteryDrawResult`。
- 抽奖券收支：来自 `LotteryTicketLedger`。
- 商店购买：来自 `ShopPurchase`。
- 道具使用和今日效果：来自 `ItemUseRecord`。
- 实物兑换：来自 `RealWorldRedemption`。
- 弱社交发起和响应：来自 `SocialInvitation` 和 `SocialInvitationResponse`。
- EXP 获取：来自 `ExperienceLedger`。

聚合层只读，不做新的业务写入。

## 生产替换策略

1. 先补数据模型和服务，保证旧 UI 仍可用。
2. 再建立 production view-model，不直接改 UI。
3. 按页面逐个替换生产 panel，期间保留旧 API 行为。
4. 最后替换 `SupplyStation` shell 和主交互状态。
5. UI Lab route 保留，作为视觉和交互回归参考。

## 最小任务拆分

### Task 1: 第三阶段契约与生产发布护栏

- 写明 UI Lab 页面、生产能力、DB/API 差异矩阵。
- 更新数据库发布 checklist，覆盖生产 SQLite 备份、schema push、Prisma generate、build、PM2 重启。
- 增加只读验收 SQL：券余额、银子、库存、EXP、购买记录一致性。

### Task 2: EXP 数据模型和服务

- 修改 `prisma/schema.prisma`。
- 新增 `ExperienceLedger` 和 `User.exp`。
- 新增 `lib/gamification/experience.ts`。
- 为任务完成和真实打卡提供幂等发放 helper。

### Task 3: EXP 接入任务和打卡

- 在 `completeDailyTask()` 成功完成新任务时发 EXP。
- 在 `/api/board/punch` 成功创建真实打卡时发 EXP。
- 更新 state/view-model，让 Dashboard 能显示等级和 EXP 进度。

### Task 4: 商店购买模型和服务

- 新增 `ShopPurchase`。
- 新增 `lib/gamification/shop.ts`。
- 支持价格、每日限购、每周限购、银子不足、disabled item、事务扣银子加库存。

### Task 5: 商店购买 API 和客户端 helper

- 新增 `POST /api/gamification/shop/purchase`。
- 新增 `purchaseGamificationShopItem()`。
- 覆盖 401、400、409、成功购买、限购、库存增加。

### Task 6: Supply Production View-Model Foundation

- 新增 `SupplyStationProductionSnapshot` 类型。
- 新增 `buildSupplyStationViewModelForUser()`。
- 映射资源栏、profile、Dashboard、Backpack、Draw Pool、Shop、Task Record 的基础字段。

### Task 7: Dashboard 生产接入

- 把 UI Lab Dashboard 视觉组件改造成可接生产 props。
- 接真实资源、等级、任务、今日效果、快捷入口。
- 接任务完成、换班、领券 mutation。

### Task 8: Draw Pool 生产接入

- 接真实抽奖券、单抽、十连、补券十连。
- 展示概率、保底说明、最近抽奖、本次结果。
- 复用现有 `drawGamificationLottery()`。

### Task 9: Backpack 生产接入

- 接真实库存分组、固定 `60` 容量、分页、选中详情。
- 接道具使用、任务换班、弱社交选择成员、实物兑换申请。
- 展示今日效果和禁用原因。

### Task 10: Shop 生产接入

- 接真实 catalog、用户银子、库存数量、购买限制。
- 接商店购买 mutation。
- 购买成功后刷新资源和背包。

### Task 11: Task Record Aggregator

- 新增任务记录聚合服务。
- 覆盖最近 7 天任务、抽奖、券流水、EXP、购买、道具使用、兑换、社交。
- 输出 UI Lab 任务记录页需要的日期、时间线、抽卡记录、雷达、兑换记录。

### Task 12: Task Record 生产接入

- 把 UI Lab Task Record 改造成生产组件。
- 接日期切换、mode 切换、队友雷达响应、兑换状态展示。
- 不在记录页新增写业务，只复用已有社交响应 API。

### Task 13: Admin 兑换队列接入新 UI

- 管理员视角展示待处理兑换。
- 复用 confirm/cancel API。
- 普通成员不可见管理员操作。

### Task 14: SupplyStation Shell 替换

- 保留 `components/gamification/SupplyStation.tsx` 导出。
- 内部切换为新 production shell。
- 保留 `(board)/page.tsx` 的 lazy mount 逻辑。

### Task 15: UI Lab 与生产隔离回归

- 确认 UI Lab route 不调用真实 API。
- 确认生产 route 不 import mock data。
- 增加测试防止 mock catalog 泄漏为生产经济真相。

### Task 16: 视觉和响应式 QA

- 桌面和移动端检查 Dashboard、Draw Pool、Backpack、Shop、Task Record。
- 检查文字不溢出、按钮可点击、空状态、错误状态、加载状态。

### Task 17: 生产验收和发布

- 跑相关 Vitest。
- 跑 `npm run build`。
- 按生产 release checklist 执行备份、安装、构建、重启。
- 用测试账号验收任务、抽奖、背包、商店、任务记录、兑换。

## 风险和缓解

| 风险 | 缓解 |
| --- | --- |
| UI Lab mock 字段和生产字段差异大 | 先做 view-model，不让页面直接读原始 DB snapshot |
| EXP 新增后和撤销打卡冲突 | 第三阶段先不做 EXP 回滚，文档明确 |
| 商店真实购买改变经济平衡 | 价格和限购走静态配置，购买记录可审计 |
| 生产 SQLite schema 变更风险 | 发布前备份 prod.db，先在 dev.db 验证 |
| 新 UI 页面过大 | 按 Dashboard/DrawPool/Backpack/Shop/TaskRecord 拆组件和测试 |
| UI Lab route 与生产入口混淆 | 测试约束 UI Lab 不调用 API，生产不 import mock |

## 验收标准

1. 生产补给站打开后展示新 UI，而不是旧 brutalist 单页布局。
2. 登录用户看到自己的银子、抽奖券、背包库存、等级和 EXP。
3. 完成任务、换班、领券、抽奖、使用道具、发起社交、申请兑换、管理员确认兑换都能真实生效。
4. 商店购买会真实扣银子、加库存、写购买记录，并受限购约束。
5. 任务记录能看到最近 7 天的任务、抽奖、购买、兑换、社交和 EXP 记录。
6. `team-goal` 不出现在生产补给站主流程中。
7. 数据库字段仍使用 `coins`，UI 文案显示“银子”。
8. `npm run build` 通过。
