# Supply Task 17：UI Lab 与生产隔离回归设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 17：UI Lab And Production Isolation Regression。

## 背景

Task 16 已经把 `components/gamification/SupplyStation.tsx` 切到新的 production shell。此时第三阶段的主要风险从“功能没接上”变成“边界被不小心打穿”：

- production shell 或 production panel import UI Lab mock data，把静态样例当成生产真相。
- UI Lab route 误调用真实 API，破坏它作为设计和视觉回归参考的隔离属性。
- `team-goal` 在第三阶段被意外带进生产补给站。

Task 17 用静态源码测试建立回归护栏。本任务不新增业务功能、不新增页面、不修改数据库。

## 范围

新增 `__tests__/supply-production-isolation.test.ts`，检查两组文件：

1. 生产补给站路径：
   - `components/gamification/SupplyStation.tsx`
   - `components/gamification/production/SupplyStationShell.tsx`
   - `components/gamification/production/SupplyDashboardPanel.tsx`
   - `components/gamification/production/SupplyDrawPoolPanel.tsx`
   - `components/gamification/production/SupplyBackpackPanel.tsx`
   - `components/gamification/production/SupplyShopPanel.tsx`
   - `components/gamification/production/SupplyTaskRecordPanel.tsx`
   - `lib/gamification/supply-view-model.ts`

2. UI Lab route 路径：
   - `app/ui-lab/supply-dashboard/page.tsx`
   - `app/ui-lab/supply-dashboard/draw-pool/page.tsx`
   - `app/ui-lab/supply-dashboard/backpack/page.tsx`
   - `app/ui-lab/supply-dashboard/shop/page.tsx`
   - `app/ui-lab/supply-dashboard/task-record/page.tsx`
   - `app/ui-lab/supply-dashboard/task-card-review/page.tsx`

## 隔离规则

生产路径必须满足：

- 不包含 `mock-data`。
- 不包含 `supplyDashboardMock`、`supplyShopMock`、`supplyBackpackMock`、`supplyTaskRecordMock`、`supplyDrawPoolMock`。
- 不 import `components/gamification/ui-lab`。
- 不包含 `team-goal` 或 `团队目标`。

UI Lab route 必须满足：

- 不 import `@/lib/api`。
- 不直接出现 `/api/gamification`。
- 不调用 `fetch(`。
- 仍然可以 import UI Lab scene 和 mock data。

## 与现有测试的关系

`__tests__/supply-ui-lab-static-business-closure.test.tsx` 已经渲染 UI Lab 静态页面，保护第二阶段词汇和死链接。本任务新增的是源码级隔离检查，两者互补：

- 现有测试看渲染结果。
- 新测试看 import/API 边界。

## 非目标

- 不删除 UI Lab 的 mock data。
- 不删除 UI Lab routes。
- 不对 production shell 做视觉 QA。
- 不检查全仓所有 `team-goal` 字符串，因为历史 UI Lab 和文档仍允许存在团队目标内容；本任务只检查生产补给站文件。

## 验收

- `npm test -- __tests__/supply-production-isolation.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx` 通过。
- `npm test -- __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx` 通过。
- `npm run build` 通过，确认源码测试没有影响生产构建。
