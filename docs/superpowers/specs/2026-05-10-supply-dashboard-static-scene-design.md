# Supply Dashboard Static Scene Design

> 按 `design/ui-assets/dashboard-new.png` 复刻牛马补给站 Dashboard 首页的隔离静态 scene route。本文档只覆盖 Dashboard 首页，不覆盖背包、抽卡池、任务记录、排行榜、团队目标等二级页面。

## 关联文档

- UI lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

执行本 spec 前必须先阅读图片原型复刻 workflow。本文只记录 Dashboard 页面的差异、边界和验收标准，不重复 workflow 的通用 scene、资源、响应式和测试规则。

## 输入确认

- 目标原型：`design/ui-assets/dashboard-new.png`
- 原型尺寸：`1536 x 1024`
- 页面定位：牛马补给站 Dashboard 首页
- 实验路由：`/ui-lab/supply-dashboard`
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前约束：不替换正式补给站，不接真实业务 API，不新增生产导航入口。

## 页面目标

1. 把 `dashboard-new.png` 复刻成隔离静态 TSX 页面。
2. 验证补给站新首页的信息架构：状态总览、角色舞台、今日主线、资源栏、背包摘要、补给入口、任务记录入口。
3. 使用贴近真实业务快照的 mock data，而不是散落在 JSX 中的展示常量。
4. 为后续 Dashboard 局部组件化提供清晰边界。
5. 保持当前稳定 `SupplyStation` 完全不受影响。

## 非目标

- 不实现完整背包页。
- 不实现完整抽卡池或补给商店。
- 不实现任务记录列表。
- 不实现排行榜或团队目标页。
- 不接入 `fetchGamificationState`、`ensureTodayGamificationTasks` 或任何 API action。
- 不新增 Prisma schema、API Routes、认证逻辑或真实状态写入。
- 不把目标原型作为整张背景图贴到页面上。

## 原型拆解

### Scene shell

- 整体是游戏 HUD 风格的补给站首页。
- 页面顶部是一条黄色导航和资源栏。
- 主背景是健身房场景，中央有角色站台。
- 内容区分为左侧角色状态、中间角色舞台、右侧今日主线、底部快捷入口、底部公告栏。
- 视觉语言偏像素游戏、brutalist 粗边框、黑色描边、黄色高亮。

### Main surfaces

- 左侧 `角色状态` 面板：
  - 称号。
  - 今日效果列表。
  - 连续打卡天数。
- 中央角色舞台：
  - 健身房背景。
  - 角色形象。
  - 对话气泡。
  - 等级和经验条。
- 右侧 `今日主线` 面板：
  - 进度条。
  - 四张任务卡，2x2 布局。
  - 完成奖励栏。
  - 领取按钮。
- 底部快捷入口：
  - 首页入口。
  - 背包摘要。
  - 补给站摘要。
  - 任务记录入口。
- 最底部公告栏：
  - 团队公告。
  - 帮助中心、意见反馈、设置等视觉入口。

### Props 与图像

第一阶段允许优先使用现有原型图中的视觉方向来做 CSS/HTML 近似，但代码实现不能依赖一张整图背景完成页面。

需要评估的资源类型：

- 健身房背景。
- 牛马角色图。
- 任务卡插图。
- 道具图标：金币、体力、券、水瓶、鞋、心、经验。
- 背包、补给机、任务记录等入口图标。

如果没有拆分素材，第一阶段可以用 CSS、emoji 或现有资产占位，但必须在实现记录中标明哪些是占位资源，后续静态页面族阶段再统一资源治理。

## 页面结构

```text
supply-dashboard-scene
  supply-dashboard-background
  supply-dashboard-content
    GameTopBar
    SupplyDashboardMain
      CharacterStatusPanel
      HeroCharacterStage
      DailyQuestPanel
        DailyQuestGrid
        QuestRewardBar
    DashboardShortcutDock
      HomeShortcut
      InventoryDock
      SupplyDock
      TaskRecordEntry
    TeamAnnouncementBar
```

首轮实现可以放在 `app/ui-lab/supply-dashboard/page.tsx` 和同目录或 `components/gamification/ui-lab/` 下的静态组件中。组件边界应服务页面可读性，不要求一次抽成最终共享组件。

## Mock Data Contract

静态 mock data 应集中定义，避免硬编码散落在 JSX 中。

建议结构：

```text
dashboardProfile
  username
  avatarKey
  title
  level
  exp
  nextLevelExp
  streakDays

activeEffects[]
  id
  icon
  label
  value
  expiresIn

resources[]
  id
  icon
  label
  value
  maxValue?

dailyQuests[]
  id
  dimension
  title
  subtitle
  image
  difficulty
  tags[]
  durationLabel
  completed
  reward

inventoryPreview
  usedSlots
  totalSlots
  items[]

supplyPreview
  remainingDraws
  maxDraws
  featuredRewards[]

announcement
  message
```

需要覆盖的状态：

- 至少两张已完成任务卡。
- 至少一张未完成任务卡。
- 至少一个资源带上限，例如体力 `18 / 100`。
- 背包容量，例如 `18 / 40`。
- 补给站剩余次数，例如 `999 / 999`。
- 今日效果包含倒计时。

## 路由与隔离策略

路由：

```text
/ui-lab/supply-dashboard
```

隔离规则：

- 不加入当前 `Navbar` tab。
- 不改变 `AppTab` 类型。
- 不修改 `app/(board)/page.tsx` 的正式 tab 切换。
- 不读取登录 cookie。
- 不调用正式 API。

如果需要进入页面，直接访问实验 URL。后续是否把该 route 纳入受保护页面或正式导航，留到业务接入分支决定。

## 视觉与响应式要求

桌面优先，但不能只服务 `1536 x 1024`。

桌面：

- 首屏应接近原型图。
- 左侧状态卡、中间角色、右侧任务网格三栏关系成立。
- 顶部资源栏数字增长时不撑破。
- 底部快捷入口清晰可点击。
- 主面板和底部公告栏保持稳定的游戏 HUD 观感。

平板和窄屏：

- 可以降低像素级还原优先级。
- 角色舞台可缩小或移动到顶部。
- 任务卡可从 2x2 改为单列或横向滚动。
- 底部 dock 可改为纵向入口列表。
- 装饰背景可以弱化，但文字不能重叠。

移动端：

- 第一阶段只要求可读、可滚动、无明显遮挡。
- 不要求完全复刻桌面 HUD。

## 组件化边界

第一阶段允许拆出页面内部语义组件，但不做最终组件库。

候选组件：

- `GameTopBar`
- `CharacterStatusPanel`
- `HeroCharacterStage`
- `DailyQuestPanel`
- `DailyQuestGrid`
- `InventoryDock`
- `SupplyDock`
- `TaskRecordEntry`
- `TeamAnnouncementBar`

组件 props 应从 mock data contract 推导，避免组件只接受原型图里的固定文案。

## 验收标准

1. `/ui-lab/supply-dashboard` 可在本地 dev server 访问。
2. 正式补给站和现有导航不受影响。
3. 桌面截图与 `dashboard-new.png` 的结构和视觉气质接近。
4. 页面主要区块按语义组件拆开，文件边界清楚。
5. mock data 集中定义，结构贴近真实补给站业务。
6. 桌面和移动端检查无严重重叠、不可读或空白画面。
7. 没有 API、数据库、认证或生产导航变更。

## 测试策略

第一阶段以视觉验证为主，自动化测试保持轻量。

建议：

- `npm run lint`
- `npm test`，如果本轮没有改业务逻辑，可接受只跑相关 UI smoke test。
- 使用 in-app browser 或 Playwright 检查桌面与移动端截图。

不要求：

- 为静态 mock 页面写复杂业务单测。
- 为尚未接业务的按钮写交互测试。

## 完成后决策

Dashboard 静态页完成后，需要一起决定：

1. 是否继续沿用该视觉方向。
2. 是否进入 Dashboard 局部组件化。
3. 下一个静态页面优先级。
4. 哪些资源占位需要替换成正式拆分素材。
