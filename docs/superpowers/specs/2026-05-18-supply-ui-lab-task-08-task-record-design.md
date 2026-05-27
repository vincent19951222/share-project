# Supply UI Lab 任务 08：任务记录设计

> 第二阶段任务级 spec，用于定义任务记录页面的查漏补缺范围。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 8。

## 目标

把任务记录从静态总览页改成单 route 的本地状态机，支持记录、抽卡历史、兑换记录、队友雷达和规则说明的完整视图。

## 用户可见变化

- 左侧侧栏模式可以切换主内容。
- `今日记录` 展示时间线和右侧预览。
- `抽卡记录` 展示抽卡历史、奖励明细、消耗抽奖券和批次保底状态。
- `兑换记录` 展示完整兑换历史。
- `队友雷达` 展示完整邀请状态列表。
- `规则说明` 展示记录、抽卡历史、雷达和兑换状态的静态规则。
- 日期 tab 展示最近 7 天，并切换本地记录。
- 无记录日期展示空状态，而不是展示假数据。
- `生命票` 和 `补给券` 替换为 `抽奖券` 或具体道具名。

## 数据与组件变化

新增：

- `components/gamification/ui-lab/supply-data/records.ts`

修改：

- `components/gamification/ui-lab/supply-task-record/types.ts`
- `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- `__tests__/supply-task-record-mock-data.test.ts`
- `__tests__/supply-task-record-scene.test.tsx`

页面 scene 会变成 client component，并维护本地模式状态和日期状态。

## 非目标

- 不新增多个任务记录 route。
- 不查询真实记录。
- 不响应真实社交邀请。
- 不在本地 mock UI 之外修改兑换状态。

## 验收标准

- 点击侧栏模式会改变主面板标题和内容。
- 选择日期会改变可见记录。
- 抽卡历史包含单抽、十连、消耗抽奖券、奖励和保底状态。
- 队友雷达和兑换记录可以作为完整主视图展示。
- 不再保留 `生命票`、`补给券` 或主流程死锚点。

## 关联计划

具体实现步骤见以下总计划的任务 8：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
