# Supply Dashboard UI Lab Design

> 基于 `codex/ui-improvement` 切出的 UI 实验分支，先把 `design/ui-assets/dashboard-new.png` 复刻成隔离静态 Dashboard 首页，再按页面族逐步扩展。目标是验证新的牛马补给站信息架构、游戏化视觉语言和组件边界；在静态页面全部稳定前，不接入现有业务 API。

## 背景

当前 `牛马补给站` 已经承载任务、抽奖、背包、兑换、社交邀请和管理员处理队列等大量业务。页面稳定，但内容密度高，继续在单页内叠加 UI 会让业务流程和视觉试验互相牵制。

`design/ui-assets/dashboard-new.png` 不是现有补给站的简单换皮，而是一个新的补给站 Dashboard 首页：它用角色状态、资源栏、今日主线、背包摘要、补给站摘要和任务记录入口，把原本拥挤的功能拆成“首页总览 + 二级功能页”。

因此本轮采用 UI lab 路线：先用静态 scene route 验证视觉与信息架构，再逐页补齐静态页面族，最后再开业务接入分支。

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

## 阶段规划

### 1. 静态 Scene Route

新增隔离实验路由，建议路径：

```text
/ui-lab/supply-dashboard
```

本阶段只复刻 `design/ui-assets/dashboard-new.png` 对应的 Dashboard 首页。

目标：

- 尽量接近原型图的桌面首屏观感。
- 验证顶部游戏资源栏、角色状态、今日主线、背包摘要、补给摘要、任务记录入口的布局关系。
- 建立页面级 scene、背景、props、content 分层。
- 使用本地 mock data，但 mock data 的字段和状态应贴近现有补给站业务快照。
- 保证移动端和窄屏至少有明确降级策略，不出现不可读或严重重叠。

明确不做：

- 不接 API。
- 不实现二级页面跳转。
- 不替换现有 tab。
- 不抽象成最终组件库。

### 2. Dashboard 静态确认

Dashboard 首页完成后先做视觉和结构 review。

确认点：

- 页面是否足够像原型图。
- 新首页是否能承担“补给站总览”的职责。
- 各入口是否表达清楚：背包、补给站、任务记录、团队目标、排行榜等。
- 当前 mock data 是否覆盖已领取、未领取、资源不足、背包数量、任务完成等关键状态。
- 响应式策略是否可接受。

只有 Dashboard 静态页确认后，才进入页面组件化讨论。

### 3. 场景组件化

不急着抽通用 `Button`、`Card` 或过早建立设计系统。先抽业务语义组件，让组件边界对应原型图里的真实区块。

候选组件：

```text
GameTopBar
CharacterStatusPanel
DailyQuestGrid
InventoryDock
SupplyDock
TaskRecordEntry
```

组件化原则：

- 组件名表达业务位置，而不是视觉形状。
- 组件 props 应从真实业务快照推导，而不是只服务静态文案。
- 可复用样式先沉淀为局部 CSS contract，等多个页面验证后再抽全局规则。
- 不为单张图过度抽象。

### 4. 扩展静态页面族

Dashboard 首页确认后，再逐页复刻已有原型图。

候选页面：

- `design/ui-assets/背包-new.png`
- `design/ui-assets/排行榜.png`
- `design/ui-assets/任务记录.png`
- `design/ui-assets/补给商店.png`
- `design/ui-assets/抽卡池.png`
- `design/ui-assets/团队目标.png`

每个页面仍然先走隔离静态 route，不接真实业务。

这一阶段的目标不是立刻抽组件库，而是逼出真正稳定的设计规则：

- 像素卡牌边框。
- 资源栏和道具图标尺寸。
- 任务卡不同状态。
- 背包格子和数量角标。
- 抽卡、兑换、领取、已完成等状态表达。
- 弹窗、抽屉、二级导航和返回路径。

### 5. 静态页面族 Review 与组件化

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

## 第一阶段页面定义

### 页面职责

`/ui-lab/supply-dashboard` 是牛马补给站的新首页原型。

它负责回答：

- 我当前角色状态如何？
- 今天主线任务完成到哪里了？
- 当前有哪些关键资源？
- 背包和补给站有什么可用入口？
- 历史任务和奖励从哪里进入？

它不负责承载：

- 完整背包详情。
- 完整抽卡和奖励揭示流程。
- 完整任务历史列表。
- 管理员兑换队列。
- 真实业务提交动作。

### 页面结构

```text
supply-dashboard-scene
  supply-dashboard-background
  supply-dashboard-content
    GameTopBar
    CharacterStatusPanel
    HeroCharacterStage
    DailyQuestGrid
    DashboardShortcutDock
      InventoryDock
      SupplyDock
      TaskRecordEntry
    TeamAnnouncementBar
```

### Mock Data 约束

mock data 应覆盖这些结构：

- 当前用户：昵称、头像、称号、等级、经验、连续打卡天数。
- 今日效果：经验加成、体力上限、步数加成等，包含剩余时间。
- 资源：金币、体力、券或票据。
- 今日主线：四个任务卡，包含完成状态、维度、难度、标签、奖励。
- 背包摘要：若干道具、数量、容量。
- 补给摘要：剩余次数、推荐道具。
- 团队公告：一条短消息。

mock data 不应只按原型图硬编码文本，后续应能自然替换为真实快照。

## 视觉与响应式要求

桌面优先，但不能只服务 `1536 x 1024`。

桌面：

- 首屏应接近原型图。
- 顶部资源栏稳定，不因数字长度轻易撑破。
- 左侧状态卡、中间角色、右侧任务网格的主关系成立。
- 底部快捷入口保持清晰可点击。

平板和窄屏：

- 可以降低像素级还原优先级。
- 允许角色舞台缩小或改到顶部。
- 任务卡可从 2x2 改为单列或横向滚动。
- 底部 dock 可变成纵向入口列表。
- 装饰背景可以弱化，但业务文字不能重叠。

移动端：

- 第一阶段只要求可读、可滚动、无明显遮挡。
- 不要求完全复刻桌面 HUD。

## 验收标准

第一阶段完成时必须满足：

1. 有隔离静态 route，不影响现有补给站。
2. 页面能在本地 dev server 访问。
3. 桌面截图与 `dashboard-new.png` 的结构和视觉气质接近。
4. 主要区块已经按语义组件拆开，至少文件边界清楚。
5. mock data 结构贴近真实业务，而不是纯展示常量散落在 JSX 中。
6. 浏览器检查桌面和移动端，无严重重叠、不可读或空白画面。
7. 没有 API、数据库、认证或生产导航变更。

## 测试策略

第一阶段以视觉验证为主，自动化测试保持轻量。

建议：

- `npm run lint`
- `npm test`，如果本轮没有改业务逻辑，可接受只跑相关 UI smoke test。
- Playwright 或 in-app browser 截图检查桌面与移动端。

不要求：

- 为静态 mock 页面写复杂业务单测。
- 为尚未接业务的按钮写交互测试。

## 后续决策点

Dashboard 静态页完成后，需要一起决定：

1. 是否继续沿用该视觉方向。
2. 二级页面是否全部采用真路由。
3. 哪些 Dashboard 组件进入正式组件目录。
4. 下一个静态页面优先级：背包、补给商店、抽卡池、任务记录、排行榜或团队目标。
5. 何时从 UI lab 分支合回 `codex/ui-improvement`。
