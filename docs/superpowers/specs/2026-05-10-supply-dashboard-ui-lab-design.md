# Supply Dashboard UI Lab Plan

> 基于 `codex/ui-improvement` 切出的 UI 实验分支，规划牛马补给站从图片原型到静态页面族、组件化、业务接入的分阶段路线。本文档只定义整体流程和阶段边界；具体页面复刻必须各自编写页面级 spec。

## 关联文档

- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`

## 背景

当前 `牛马补给站` 已经承载任务、抽奖、背包、兑换、社交邀请和管理员处理队列等大量业务。页面稳定，但内容密度高，继续在单页内叠加 UI 会让业务流程和视觉试验互相牵制。

`design/ui-assets/dashboard-new.png` 不是现有补给站的简单换皮，而是一个新的补给站 Dashboard 首页：它用角色状态、资源栏、今日主线、背包摘要、补给站摘要和任务记录入口，把原本拥挤的功能拆成“首页总览 + 二级功能页”。

因此本轮采用 UI lab 路线：先用静态 scene route 验证视觉与信息架构，再逐页补齐静态页面族，最后再开业务接入分支。所有页面级实现必须遵循图片原型复刻 workflow；总规划只记录“先做什么、后做什么、什么时候才能进入下一阶段”。

## 总体目标

1. 为牛马补给站建立新的 Dashboard 首页方向。
2. 先完成静态 UI 验证，不影响当前稳定业务页面。
3. 用真实业务形状约束 mock data，避免静态页后续难以接入。
4. 在多个静态页面完成后，再统一 review 组件化边界。
5. 最终用独立业务接入分支把新组件映射到现有 `SupplyStation` 数据和 actions。

## 非目标

- 第一阶段不替换现有 `SupplyStation`。
- 第一阶段不接入 API Routes、Prisma、真实登录用户或真实状态。
- 第一阶段不新增生产导航入口。
- 第一阶段不实现背包、抽奖、任务记录、排行榜、团队目标等二级页面。
- 不把原型图作为整张背景贴图覆盖页面。
- 不为了 1:1 复刻牺牲中文文本、长数据、空状态和小屏可用性。

## 分支策略

当前工作从 `codex/ui-improvement` 切出实验分支：

```text
codex/ui-lab-supply-dashboard
```

分支层级：

```text
main
  codex/ui-improvement
    codex/ui-lab-supply-dashboard
```

使用实验分支的原因：

- 静态复刻可能被推翻、重排或拆分，不应污染 UI 主线。
- 当前业务已稳定，实验分支不能影响正式补给站。
- 静态效果确认后，再把可保留的页面和组件整理合回 `codex/ui-improvement`。

## Spec 分层

本轮 UI lab 使用三层文档：

1. **通用 workflow**：`2026-05-05-home-ui-image-prototype-workflow-design.md`，定义所有图片原型复刻的通用方法。
2. **UI lab 总规划**：本文档，定义阶段、分支、进入和退出条件。
3. **页面级 spec**：每个静态页面单独一份，只记录该页面的目标图、场景隐喻、资源清单、结构差异、mock data 和验收标准。

页面级 spec 不复制 workflow 的通用规则，只通过“关联文档”引用它，并写清本页差异。这样可以降低文档重复，也能让后续 AI 或开发者在执行页面任务时明确先读哪个上游规范。

## 阶段规划

### 1. Dashboard 静态 Scene Route

先实现 `design/ui-assets/dashboard-new.png` 对应的隔离静态 Dashboard 首页。

页面级 spec：

```text
docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md
```

本阶段只验证首页视觉和信息架构，不接 API、不替换现有 `SupplyStation`、不实现二级页面。

### 2. Dashboard 静态确认

Dashboard 首页完成后先做视觉和结构 review。确认通过后，才进入 Dashboard 局部组件化讨论。

确认重点：

- 新首页是否能承担“补给站总览”的职责。
- 原型中的核心区块是否成立。
- mock data 是否贴近真实业务结构。
- 桌面与移动端是否达到页面级 spec 的验收标准。

### 3. Dashboard 局部组件化

Dashboard 首页确认后，只对该页面做局部组件化。组件名优先表达业务语义，而不是视觉形状。

候选边界由 Dashboard 页面级 spec 维护，例如：

```text
GameTopBar
CharacterStatusPanel
DailyQuestGrid
InventoryDock
SupplyDock
TaskRecordEntry
```

此时仍不抽全局设计系统。等多个静态页面完成后，再判断哪些组件和样式值得上升到共享层。

### 4. 扩展静态页面族

Dashboard 首页确认后，再逐页复刻已有原型图。每个页面都必须新增页面级 spec。

候选页面：

- `design/ui-assets/背包-new.png`
- `design/ui-assets/排行榜.png`
- `design/ui-assets/任务记录.png`
- `design/ui-assets/补给商店.png`
- `design/ui-assets/抽卡池.png`
- `design/ui-assets/团队目标.png`

每个页面仍然先走隔离静态 route，不接真实业务。该阶段的目标是沉淀稳定的游戏化 UI 规则，而不是提前完成最终组件库。

### 5. 静态页面族 Review 与统一组件化

所有核心静态页面完成后，再一起 review 组件化。

Review 重点：

- 哪些组件是真复用，哪些只是单页结构。
- 哪些样式应进入 `app/globals.css` 或共享 UI 层。
- 哪些组件应保留在 `components/gamification/ui-lab`，哪些能迁移到正式 `components/gamification`。
- 哪些 mock data 形状应成为业务接入适配层的输入 contract。

### 6. 业务接入分支

静态页面族和组件边界稳定后，再开独立业务接入分支。

业务接入阶段的职责：

- 把现有 `SupplyStation` 的数据、actions 和错误处理映射到新 UI。
- 逐个替换页面或入口，而不是一次性重写所有流程。
- 保留当前稳定业务作为回退参照。
- 用测试覆盖关键交互：任务完成、换任务、抽卡、使用道具、申请兑换、响应社交邀请。

业务接入阶段不应该继续大改视觉方向。视觉方向应在 UI lab 阶段先完成决策。

## 后续决策点

Dashboard 静态页完成后，需要一起决定：

1. 是否继续沿用该视觉方向。
2. 二级页面是否全部采用真路由。
3. 哪些 Dashboard 组件进入正式组件目录。
4. 下一个静态页面优先级：背包、补给商店、抽卡池、任务记录、排行榜或团队目标。
5. 何时从 UI lab 分支合回 `codex/ui-improvement`。
