# Supply Task 16：Production Shell And Mutation Wiring 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 16：Production Shell And Mutation Wiring。

## 背景

Task 10-15 已经建立生产专用的 Dashboard、Draw Pool、Backpack、Shop 和 Task Record panels。这些 panel 都是纯组件：读取 `SupplyStationProductionSnapshot`，通过回调把写操作交给外层，但不自己请求 API。

当前 `components/gamification/SupplyStation.tsx` 仍是旧生产 UI，直接读取旧 `GamificationStateSnapshot`。Task 16 要把旧入口替换为新的 production shell，并把所有 mutation 串到现有 API helper。

## 范围

本任务新增 `components/gamification/production/SupplyStationShell.tsx`，并把 `components/gamification/SupplyStation.tsx` 改成导出新 shell。

Shell 负责：

- 首屏读取 `fetchSupplyStationState()`。
- 管理 active panel：`dashboard`、`drawPool`、`backpack`、`shop`、`taskRecord`。
- 管理 mutation pending 状态、错误文案和成功文案。
- 管理 `latestDraw`、选中背包道具、选中商店商品。
- 把 panel 回调连接到现有 API helper。
- mutation 成功后刷新 production snapshot，确保 UI 使用 `SupplyStationProductionSnapshot`。

本任务不新增数据库、API route、view-model 字段、UI Lab route，也不做视觉 QA 的 CSS 大修。

## 数据流

首屏：

1. Shell render loading state。
2. 调用 `GET /api/gamification/supply/state`。
3. 成功后保存 `snapshot`，默认显示 Dashboard。
4. 401 显示登录恢复入口，其他错误显示重试按钮。

Mutation：

1. 设置 `activeAction`。
2. 调用对应 API helper。
3. 如果返回抽奖结果，保存到 `latestDraw` 并跳到 Draw Pool。
4. 调用 `fetchSupplyStationState()` 刷新 production snapshot。
5. 清理 `activeAction`，展示成功或错误文案。

统一刷新比混合使用旧 mutation snapshot 更稳：现有 mutation 多数返回 `GamificationStateSnapshot`，而新 panel 只消费 `SupplyStationProductionSnapshot`。

## 操作映射

- Dashboard complete：`completeGamificationTask({ dimensionKey })`
- Dashboard reroll：`rerollGamificationTask({ dimensionKey })`
- Dashboard claim ticket：`claimGamificationLifeTicket()`
- Draw Pool：`drawGamificationLottery({ drawType, useCoinTopUp })`
- Backpack use item：`useGamificationItem({ itemId, target })`
- Backpack redemption：`requestRealWorldRedemption(itemId)`
- Shop purchase：`purchaseGamificationShopItem(itemId)`
- Task Record radar response：`respondToSocialInvitation({ invitationId })`

管理员确认/取消兑换 helper 保留在 `lib/api.ts`，但本 shell 暂不新增管理员队列 UI，因为当前 Task Record panel 只展示兑换记录和队友雷达响应入口。

## UI 结构

Shell 顶层使用 production 专属 class 前缀 `supply-production-shell`，避免和旧 `.supply-station-shell` 混用。

顶层包含：

- header：产品名、等级、银子、抽奖券、背包容量、规则链接、概率链接。
- panel nav：五个 production panel 切换按钮。
- status region：加载、错误、成功消息。
- main：按 active panel 渲染对应 panel。

`components/gamification/SupplyStation.tsx` 保留原导出名：

```tsx
"use client";

export { SupplyStationShell as SupplyStation } from "@/components/gamification/production/SupplyStationShell";
```

## 错误处理

- `ApiError` 401：显示“登录状态已过期，请重新登录。”并提供 `/login` 链接。
- 其他 `ApiError`：展示 API 返回文案。
- 未知错误：展示“牛马补给站加载失败，稍后再试。”
- mutation 失败不清空旧 snapshot，用户仍可看到当前页面并重试。

## 测试

新增 `__tests__/supply-production-shell.test.tsx`：

- 首屏调用 `/api/gamification/supply/state`。
- Dashboard 完成任务调用 `/api/gamification/tasks/complete`，随后刷新 supply state。
- Draw Pool 单抽调用 `/api/gamification/lottery/draw`，保存最新抽奖结果并刷新。
- Shop 购买调用 `/api/gamification/shop/purchase`，随后刷新 supply state。
- `components/gamification/SupplyStation.tsx` 旧入口渲染 production shell。
- 401 显示登录恢复入口。

更新 `__tests__/supply-station-shell.test.tsx` 为轻量入口兼容测试，避免继续固定旧 UI DOM。

## 验收

- `npm test -- __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx` 通过。
- `components/gamification/SupplyStation.tsx` 不再包含旧 UI 实现。
- production shell 不 import UI Lab mock data。
- 初始加载、mutation 刷新、401 恢复、规则/概率链接都有测试覆盖。
