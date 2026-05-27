# Supply Task 15：生产 Task Record Panel 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 15：Production Task Record Panel。

## 背景

Task 14 已经新增 `buildSupplyTaskRecordSnapshot()`，并把真实任务记录聚合接入 `SupplyStationProductionSnapshot.taskRecord`。Task 15 负责把 UI Lab Task Record 的信息结构转成生产纯 panel，让后续 shell 可以直接挂载。

本任务只做生产组件，不新增 API，不改聚合器，不接真实 mutation。队友雷达响应通过 callback 交给后续 shell。

## 目标

- 新增 `components/gamification/production/SupplyTaskRecordPanel.tsx`。
- 组件输入只依赖 `SupplyStationProductionSnapshot`、`activeAction` 和 `onRespondSocialInvitation`。
- 展示最近 7 天日期 tabs，来源为 `snapshot.taskRecord.dates`。
- `today` 模式按选中日期展示 `snapshot.taskRecord.timeline`。
- 支持模式切换：`today`、`draws`、`redemptions`、`radar`、`rules`。
- `draws` 模式展示 category 为 `draw` 的 timeline rows。
- `redemptions` 模式展示 `snapshot.redemptions.mine`。
- `radar` 模式展示 `snapshot.social.received` 和 `snapshot.social.teamWide`，pending 邀请展示响应按钮。
- 点击响应按钮调用 `onRespondSocialInvitation(invitationId)`。
- 不展示或引用 `team-goal`。

## 范围

本任务修改：

- `components/gamification/production/SupplyTaskRecordPanel.tsx`
- `__tests__/supply-production-task-record-panel.test.tsx`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `components/gamification/SupplyStation.tsx`
- `app/api/gamification/*`
- `lib/gamification/task-records.ts`
- `lib/gamification/supply-view-model.ts`
- `components/gamification/ui-lab/*/mock-data`
- `app/globals.css`

## 组件接口

```ts
type SupplyTaskRecordMode = "today" | "draws" | "redemptions" | "radar" | "rules";

type SupplyTaskRecordPanelProps = {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: string | null;
  onRespondSocialInvitation: (invitationId: string) => void;
};
```

`activeAction` 允许后续 shell 传入全局 action key。本 panel 只用它禁用 radar pending 响应按钮。

## 展示规则

### 顶部和模式

- 顶部展示标题 `任务记录`、用户等级和当前资源摘要。
- 模式按钮用本地 state 切换。
- 默认模式为 `today`。

### Today 模式

- 日期 tabs 来自 `snapshot.taskRecord.dates`。
- 每个日期按钮带 `data-testid="supply-task-record-date"`。
- 默认选中第一个日期。
- Timeline rows 过滤条件：`row.dayKey === selectedDateKey`。
- 每条记录带 `data-testid="supply-task-record-row"`。
- 空状态展示 `这一天还没有任务记录`。

### Draws 模式

- 展示 `snapshot.taskRecord.timeline` 中 `category === "draw"` 的记录。
- 仍使用 `data-testid="supply-task-record-row"`，方便后续统一测试。
- 空状态展示 `暂时没有抽卡记录`。

### Redemptions 模式

- 展示 `snapshot.redemptions.mine`。
- 每条记录展示 itemName、statusLabel 和 requestedAt。
- 空状态展示 `暂时没有兑换记录`。

### Radar 模式

- 展示 `snapshot.social.received` 和 `snapshot.social.teamWide`。
- pending 邀请展示按钮：
  - `data-action="respond-social-invitation"`
  - disabled 条件：`activeAction !== null`
  - 点击调用 `onRespondSocialInvitation(invitation.id)`
- 非 pending 邀请只展示状态。
- 空状态展示 `暂时没有队友雷达邀请`。

### Rules 模式

展示生产规则说明：

- 最近 7 天记录来自真实业务流水。
- 抽奖、购买、兑换、道具和队友雷达会在操作成功后进入记录。
- 管理员确认类福利以兑换状态为准。

不得展示 `team-goal`。

## 视觉策略

组件使用生产专属 class 前缀 `supply-production-task-record-*`。本任务不新增 CSS，先交付语义结构、真实数据绑定和稳定交互契约。

不导入 UI Lab `supplyTaskRecordMock`，也不依赖 UI Lab 本地 records mock。UI Lab 只作为信息组织参考。

## 错误与加载状态

本 panel 不负责远程错误或加载状态。后续 shell 负责 pending action 生命周期、响应成功后的 snapshot 刷新和错误提示。

## 测试策略

新增 `__tests__/supply-production-task-record-panel.test.tsx`：

- 先验证组件不存在导致测试失败。
- fixture 提供 7 个日期、多个 timeline rows、兑换记录、received/teamWide pending radar 邀请。
- 断言渲染 7 个日期 tabs。
- 默认 `today` 模式只展示选中日期的 timeline rows。
- 点击其他日期后展示对应日期记录。
- 依次切换 `draws`、`redemptions`、`radar`、`rules`。
- radar pending 邀请响应按钮调用 `onRespondSocialInvitation(invitationId)`。
- 断言页面文本不包含 `team-goal`。
- 断言生产组件和测试不导入 UI Lab mock 数据。

## 验收标准

- `npm test -- __tests__/supply-production-task-record-panel.test.tsx` 通过。
- `npm test -- __tests__/supply-production-task-record-panel.test.tsx __tests__/gamification-task-records.test.ts __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。
- 新组件不导入 `components/gamification/ui-lab/*/mock-data`。
- 生产入口 `components/gamification/SupplyStation.tsx` 保持不变。

## 后续衔接

Task 16 会把 `SupplyTaskRecordPanel` 接入 production shell，并把 `onRespondSocialInvitation` 连接到现有 social response API、错误提示和 snapshot 刷新。
