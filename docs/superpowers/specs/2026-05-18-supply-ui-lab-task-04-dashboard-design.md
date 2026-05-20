# Supply UI Lab 任务 04：Dashboard 设计

> 第二阶段任务级 spec，用于定义 `我的状态` Dashboard 页面的查漏补缺范围。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 4。

## 目标

让 Dashboard 页面符合第二阶段统一业务术语，并成为 UI Lab 页面族干净、稳定的入口。

## 用户可见变化

- 顶部资源栏展示 `银子 / 抽奖券 / 背包`。
- 顶部资源栏和今日效果里移除 `体力`。
- `补给券` 和 `生命票` 统一替换为 `抽奖券`。
- 移除帮助中心、意见反馈和设置入口。
- 角色状态区解释 `牛马等级`。
- 今日效果展示道具来源、效果摘要、状态和结束时间。
- 任务换班和奖励领取按钮提供本地 mock 反馈。

## 数据与组件变化

修改：

- `components/gamification/ui-lab/supply-dashboard/types.ts`
- `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- `__tests__/supply-dashboard-mock-data.test.ts`
- `__tests__/supply-dashboard-scene.test.tsx`

Dashboard 使用：

- `supplyUiLabResources.dashboard`
- `supplyUiLabActiveEffects`

等级公式仅用于 mock 展示：

```text
level = floor(totalExp / 1000) + 1
currentLevelExp = totalExp % 1000
nextLevelExp = 1000
```

## 非目标

- 不持久化等级或 EXP。
- 不把任务按钮接到真实任务 API。
- 不重新引入帮助、反馈或设置入口。
- 不新增生产导航入口。

## 验收标准

- Dashboard 测试确认顶部资源为 `银子 / 抽奖券 / 背包`。
- 渲染后的 Dashboard 包含 `牛马等级`。
- 渲染后的 Dashboard 不包含旧的禁用术语。
- 背包预览容量使用 `60`。
- Dashboard 和背包共用同一份 active effects fixture。

## 关联计划

具体实现步骤见以下总计划的任务 4：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
