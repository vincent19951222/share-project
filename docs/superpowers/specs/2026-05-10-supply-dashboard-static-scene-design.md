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

### Current UI and Media Audit

静态复刻开始前必须先审核当前可用 UI 和媒体资产，不能直接进入 JSX 搭页面。

审核对象：

- 目标原型：`design/ui-assets/dashboard-new.png`
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前全局视觉资产：
  - `public/logo.png`
  - `public/avatars/*`
  - `public/assets/icons/*`
  - `public/assets/home-scenes/punch/*`
  - `public/assets/task-cards/raw/*`
  - `public/gamification/rewards/icons/*`

审核问题：

- 哪些内容能用 CSS/HTML 直接复刻。
- 哪些内容可以复用现有项目资产。
- 哪些内容必须生成新的位图资产。
- 哪些内容先用占位资产也不影响第一阶段判断。
- 哪些图片是背景类，哪些是 props，哪些是业务图标或任务卡主体。

当前初步判断：

- 健身房背景。
  - 可先评估复用 `public/assets/home-scenes/punch/gym-wall-bg.webp`、`gym-floor-strip.webp`，但 Dashboard 原型里的背景更完整，可能需要新生成一张 dashboard 背景。
- 牛马角色图。
  - 当前 `public/logo.png` 和头像不能替代主角色。需要新生成角色主体图。
- 任务卡插图。
  - 本 spec 不新增任务卡图片，不使用 imagegen 生成任务卡。
  - 直接从 `public/assets/task-cards/raw/*` 选择已有 movement、hydration、social、learning 预设图作为静态复刻素材。
  - task-card 的固定格式和统一生成规则留到后续专项处理，本阶段只保证 Dashboard 任务区结构成立。
- 道具图标：金币、体力、券、水瓶、鞋、心、经验。
  - 金币和部分奖励可复用 `public/gamification/rewards/icons/*`。
  - 体力、券、水瓶、鞋、心、EXP 徽章需要逐项确认是否已有可用素材，不足时生成或用 CSS 临时绘制。
- 背包、补给机、任务记录等入口图标。
  - 当前没有完整 Dashboard dock 图标体系。背包、补给机、任务记录入口需要生成或先用 CSS/现有 SVG 占位。

## Media Asset Checklist

所有新增最终资产进入：

```text
public/assets/home-scenes/supply/dashboard/
```

raw 生成图和中间处理文件不得进入 `public/`。建议放在临时目录，处理后只把最终压缩版入库。

### A. 必需资产

| 文件名 | 类型 | 用途 | 来源策略 | 建议尺寸 | 体积预算 |
| --- | --- | --- | --- | --- | --- |
| `dashboard-gym-bg.webp` | 背景 | 主场景健身房背景 | 先审核 punch 背景，若不贴合则用 imagegen 生成 | `1920 x 1080` 或更低可用尺寸 | `<= 450 KB` |
| `niuma-hero.webp` | 主体 props | 中央牛马健身角色 | 用 imagegen 生成，透明或可抠图背景 | 高约 `720 px` | `<= 260 KB` |
| `dock-backpack.webp` | props/icon | 背包入口 | 用 imagegen 生成或复用后续背包页资产 | `220 x 220` | `<= 90 KB` |
| `dock-supply-machine.webp` | props/icon | 补给机入口 | 用 imagegen 生成 | `260 x 220` | `<= 120 KB` |
| `dock-task-record.webp` | props/icon | 任务记录入口 | 用 imagegen 生成或 CSS 图标占位 | `220 x 220` | `<= 90 KB` |

### B. 优先复用或 CSS 构造的资产

| 内容 | 策略 |
| --- | --- |
| 顶部首页、团队目标、排行榜、补给商店、任务记录 icon | 优先使用 lucide 或现有 SVG，避免为简单 UI 符号生成位图 |
| 金币、奖励券、补给券 | 优先复用 `public/gamification/rewards/icons/*` |
| 头像 | 复用 `public/avatars/*` |
| 任务卡图片 | 只复用 `public/assets/task-cards/raw/*`；本 spec 不生成、不压缩、不重做 task-card 资产 |
| 经验、心、鞋、水瓶等小图标 | 如果现有素材不适配，可先用 CSS/emoji 占位，再决定是否生成 |
| 面板边框、像素卡框、进度条、勾选章、按钮 | CSS 实现，不生图 |
| 对话气泡、标签、倒计时、奖励栏 | CSS 实现，不生图 |

### C. 可延后资产

这些不阻塞第一阶段 Dashboard 判断，可以在后续静态页面族阶段补齐：

- 完整抽卡动画或奖励揭示图。
- 背包页完整道具格子图。
- 排行榜奖杯和成员徽章体系。
- 团队目标页专属场景 props。
- 任务记录页完整票据、夹板、历史勋章资产。
- task-card 固定格式和统一生成素材。

## Media Production Workflow

新增媒体必须遵循以下顺序：

1. **审核缺口**
   - 先对照当前 `public/` 和 `design/ui-assets/`，确认是否已有可复用资产。
   - 可复用资产优先，不重复生成。
   - 简单 UI 符号优先用 SVG、lucide 或 CSS，不用位图。

2. **按 checklist 逐个生成**
   - 需要新位图时，使用 `imagegen` skill。
   - 一次只生成一个明确资产，避免一张图里混多个用途。
   - 对透明 props，优先按 imagegen skill 的 chroma-key 流程生成，再本地去背景。
   - 每个生成任务必须记录最终 prompt、用途、文件名和是否为占位版。

3. **本地处理**
   - 背景图压缩为不透明 WebP。
   - props 和角色图优先保存为支持 alpha 的 WebP；如果边缘质量不稳定，可以保留 PNG，但必须说明原因。
   - 按实际最大展示尺寸的 1.5x 到 2x 输出，不把超大原图直接入库。
   - 处理后检查清晰度、边缘、透明背景、颜色污染和文字可读性。

4. **入库**
   - 只有最终压缩文件进入 `public/assets/home-scenes/supply/dashboard/`。
   - 文件名描述用途，不使用随机名。
   - 不覆盖已有文件；如果替换，使用明确版本名或在 review 中说明。
   - 代码只能引用最终 public 路径，不引用 raw 或临时路径。

5. **验证**
   - 资源文件存在。
   - 文件大小不超过 checklist 预算。
   - 页面引用路径正确。
   - 浏览器中图片无拉伸、模糊、黑边、白边或透明残留。
   - 桌面和移动端都检查一次。

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
