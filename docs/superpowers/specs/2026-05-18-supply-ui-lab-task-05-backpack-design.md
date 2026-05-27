# Supply UI Lab 任务 05：背包设计

> 第二阶段任务级 spec，用于定义背包页面的查漏补缺范围。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 5。

## 目标

把背包改成一个静态但业务自洽的库存界面：数据来自共享 catalog，容量固定 60 格，并支持本地道具交互。

## 用户可见变化

- 顶部资源栏展示 `银子 / 抽奖券 / 背包 18/60`。
- 背包容量固定为 60。
- 移除扩容控件。
- 移除锁定格，改为空格。
- 底部提示栏移除帮助中心入口。
- 点击道具后，本地切换详情面板。
- 分页按钮可以在静态页之间本地切换。
- `今日使用` 和 `申请兑换` 按钮展示本地反馈。
- 今日效果与 Dashboard 保持一致。

## 数据与组件变化

修改：

- `components/gamification/ui-lab/supply-backpack/types.ts`
- `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- `__tests__/supply-backpack-mock-data.test.ts`
- `__tests__/supply-backpack-scene.test.tsx`
- `__tests__/supply-backpack-assets.test.ts`

背包使用：

- 共享 catalog 中的数量和道具详情字段；
- 共享 active effects；
- 共享 resources。

## 非目标

- 不实现真实库存 mutation。
- 不实现背包扩容。
- 不按等级锁定格子。
- 不把兑换接到真实管理员流程。

## 验收标准

- 背包每页渲染 20 个可见格子。
- 空格渲染为空库存格，而不是锁定格。
- 容量展示为 `/60`。
- 页面不出现 `扩容`、`帮助中心`、`体力`、`补给券` 或 `生命票`。
- 使用、兑换、去商店操作要么更新本地 mock 状态，要么跳转到 UI Lab 商店。

## 关联计划

具体实现步骤见以下总计划的任务 5：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
