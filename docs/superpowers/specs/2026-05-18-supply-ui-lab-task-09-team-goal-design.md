# Supply UI Lab 任务 09：团队目标设计

> 第二阶段任务级 spec，用于定义团队目标页面的查漏补缺范围。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 9。

## 目标

让团队目标页面用第二阶段统一术语和本地 mock 状态，解释赛季奖励、里程碑奖励和今日团队任务指标。

## 用户可见变化

- 页面展示赛季完成奖励。
- 页面展示里程碑奖励列表。
- 今日团队任务说明每个指标统计什么。
- `补给券` 替换为 `抽奖券`。
- 移除帮助中心、意见反馈和设置入口。
- 奖励领取按钮展示本地反馈。

## 奖励规则

赛季完成奖励：

- 每名成员 mock 获得 `银子 x100`。
- 每名成员 mock 获得 `抽奖券 x3`。
- 团队获得 `团队称号 30天`。
- 周报获得 `赛季达成高光`。

里程碑奖励：

- 20%：团队公告高光。
- 40%：每人获得 `抽奖券 x1`。
- 65%：团队称号预览。
- 85%：每人获得 `银子 x50`。
- 100%：触发赛季完成奖励。

## 数据与组件变化

修改：

- `components/gamification/ui-lab/supply-team-goal/types.ts`
- `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
- `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
- `__tests__/supply-team-goal-mock-data.test.ts`
- `__tests__/supply-team-goal-scene.test.tsx`

新增任务指标来源文案：

- `今日有效健身打卡人数`
- `今日四维任务完成份数`
- `今日弱社交已回应次数`
- `今日全队抽卡次数`

## 非目标

- 不发放真实赛季奖励。
- 不接入真实 season service。
- 不写入团队动态。
- 不新增设置或帮助入口。

## 验收标准

- 团队目标 mock data 包含完成奖励和里程碑奖励。
- 渲染页面展示 `赛季达成奖励`、`银子 x100` 和 `抽奖券 x3`。
- 渲染页面解释今日团队任务的指标来源。
- 不再出现 `补给券`、`帮助中心`、`意见反馈` 或 `设置`。

## 关联计划

具体实现步骤见以下总计划的任务 9：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
