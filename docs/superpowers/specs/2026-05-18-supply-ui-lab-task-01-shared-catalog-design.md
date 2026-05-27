# Supply UI Lab 任务 01：共享目录设计

> 第二阶段任务级 spec，用于定义共享 mock catalog、共享资源 fixture 和共享今日效果。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 1。

## 目标

建立一层仅供 UI Lab 使用的共享数据，让 Dashboard、补给商店、背包、补给抽卡机和任务记录不再各自定义互相冲突的 mock 资源、道具、奖励和今日效果。

## 用户可见变化

- UI Lab 各页面顶部资源栏可以统一展示 `银子 / 抽奖券 / 背包`。
- 补给商店、背包、补给抽卡机和任务记录可以引用同一套道具名称和说明。
- Dashboard 和背包可以展示同一份 `今日效果` 列表。
- 用户不会再看到不同页面给同一个道具编出不同名字。

## 数据与组件变化

新增：

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/catalog.ts`
- `components/gamification/ui-lab/supply-data/effects.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `__tests__/supply-ui-lab-catalog.test.ts`

共享 catalog 需要包含所有 active 的非银子抽奖奖励：

- `task_reroll_coupon`
- `small_boost_coupon`
- `fitness_leave_coupon`
- `drink_water_ping`
- `walk_ping`
- `team_standup_ping`
- `chat_ping`
- `share_info_ping`
- `team_broadcast_coupon`
- `double_niuma_coupon`
- `season_sprint_coupon`
- `luckin_coffee_coupon`

银子奖励只保留为抽奖奖励，不进入商店商品，也不占用背包格子。

## 非目标

- 不引入 Prisma、API Routes 或 session 状态。
- 不替换生产游戏化配置。
- 不把 catalog 做成后台可配置能力。
- 本任务除新增共享 fixture 外，不改页面 UI。

## 验收标准

- 共享 catalog 测试能验证所有 active 非银子抽奖奖励都可展示、可购买、可进入背包。
- 共享资源只包含 `银子 / 抽奖券 / 背包`，不包含 `补给券` 或 `体力`。
- 共享今日效果只包含有清晰业务来源的效果。
- 所有新增共享数据都放在 `components/gamification/ui-lab/supply-data/` 下。

## 关联计划

具体实现步骤见以下总计划的任务 1：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
