# Supply UI Lab 任务 07：补给抽卡机设计

> 第二阶段任务级 spec，用于定义补给抽卡机页面的查漏补缺范围。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 7。

## 目标

让补给抽卡机用共享 catalog 奖品、本地抽奖券余额和本地抽卡结果反馈，解释并模拟当前抽奖规则。

## 用户可见变化

- 券名称统一为 `抽奖券`。
- 移除长期累计保底进度。
- 右侧保底面板改为 `十连保底说明`。
- 页面说明单抽没有保底。
- 页面说明十连批次保底：如果自然十连没有实用、社交或稀有奖励，则补 1 个合格奖励。
- 单抽和十连按钮会更新本地抽奖券余额，并展示静态结果。
- 奖池预览和最近掉落使用共享 catalog 道具和银子奖励行。

## 数据与组件变化

修改：

- `components/gamification/ui-lab/supply-draw-pool/types.ts`
- `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- `__tests__/supply-draw-pool-mock-data.test.ts`
- `__tests__/supply-draw-pool-scene.test.tsx`

补给抽卡机使用：

- 共享 resources；
- 共享 catalog；
- 银子奖励行；
- 本地结果状态。

## 非目标

- 不调用真实抽奖 API。
- 不持久化抽奖券余额。
- 不实现长期累计保底。
- 不制作抽奖动画或揭示流程。

## 验收标准

- 奖池概率为 `coin 45 / utility 27 / social 24 / rare 4`。
- 不再出现 `保底进度` 或 `48/70` 这类长期保底展示。
- 点击单抽后展示结果，并让本地余额减少 1。
- 点击十连后展示十连结果，并让本地余额减少 10。
- 抽奖券不足时按钮禁用或展示解释。
- 不再出现 `补给券`。

## 关联计划

具体实现步骤见以下总计划的任务 7：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
