# Supply Dashboard Task Record Static Scene Design

> 按 `design/ui-assets/任务记录.png` 复刻牛马补给站页面族里的任务记录二级页。本文档只覆盖任务记录静态 scene route，不覆盖 Dashboard 首页、团队目标、排行榜、补给商店、背包或抽卡池。

## 关联文档

- UI lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- 团队目标静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- 补给商店静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

执行本 spec 前必须先阅读图片原型复刻 workflow、Dashboard 静态复刻 spec 和已完成的补给站二级页 spec。本文只记录任务记录页的差异、边界和验收标准，不重复 workflow 的通用 scene、资源、响应式和测试规则。

## 输入确认

- 目标原型：`design/ui-assets/任务记录.png`
- 原型尺寸：`1536 x 1024`
- 页面定位：牛马补给站 Dashboard 页面族的任务记录二级页
- 实验路由：`/ui-lab/supply-dashboard/task-record`
- 上级实验路由：`/ui-lab/supply-dashboard`
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前约束：不替换正式补给站，不接真实业务 API，不新增生产导航入口。

## 页面目标

1. 把 `任务记录.png` 复刻成隔离静态 TSX 页面。
2. 验证补给站页面族里的任务记录信息架构：记录分类侧栏、今日时间线、任务完成记录、奖励领取记录、队友雷达和兑换状态。
3. 沿用 Dashboard 首页、团队目标页和补给商店页的游戏 HUD 顶栏、资源栏、像素风 brutalist 边框和黄色 active tab 体系。
4. 使用贴近现有每日任务、抽卡奖励、弱社交邀请和真实福利兑换业务形状的 mock data，但不提前接入真实状态。
5. 为后续业务接入预留记录聚合、筛选、分页、邀请响应和兑换状态列表的数据 contract。
6. 保持当前稳定 `SupplyStation`、`/ui-lab/supply-dashboard` 首页、`/team-goal` 和 `/shop` 完全不受影响。

## 非目标

- 不实现真实任务记录查询、分页加载或日期切换。
- 不实现真实队友互动回应、忽略、全部已读或跳转详情。
- 不实现真实兑换状态查询、管理员确认、取消、返还库存或状态机。
- 不接入 `fetchGamificationState`、`ensureTodayGamificationTasks`、`respondToSocialInvitation`、`requestRealWorldRedemption` 或任何 `/api/gamification/*`。
- 不修改 Prisma schema、`lib/types.ts`、`lib/gamification/*`、`lib/social-invitations.ts`、API Routes 或正式状态模型。
- 不让按钮执行真实业务动作；静态页按钮只表达视觉状态。
- 不新增生产导航入口，不修改 `AppTab`，不改变 `(board)` 页面布局。
- 不把目标原型作为整张背景图贴到页面上。
- 不为了像素还原牺牲移动端可读性。

## 原型拆解

### Scene shell

- 整体是补给站内部的任务记录台账页，顶部仍是黄色游戏 HUD 导航。
- 主内容外层是深色描边框，内部采用左侧黑色菜单、中间米白记录纸、右侧米白辅助面板三栏结构。
- 页面视觉比 Dashboard 首页更偏“任务日志”和“操作收件箱”，信息密度高但阅读顺序明确。
- 视觉语言延续像素游戏、brutalist 粗边框、硬阴影、黄色 active 状态、绿色完成章、橙色待响应标签和蓝色兑换中状态。

### Main surfaces

- 顶部导航 `SupplyDashboardTopTabs`：
  - 左侧品牌「牛马补给站」。
  - 页面族导航：我的状态、团队目标、排行榜、补给商店、任务记录。
  - 任务记录处于 active 状态。
  - 右侧资源：银子 `2,450`、补给券 `18`、头像入口。
- 左侧 `TaskRecordSidebar`：
  - 黑色竖向侧栏，active 项为「今日记录」。
  - 菜单项：今日记录、抽卡记录、兑换记录、队友雷达、规则说明。
  - 中部黄色「返回大厅」按钮。
  - 底部是健身房裁切窗口，展示牛马角色和健身道具。
- 中间 `TaskTimelinePanel`：
  - 标题「任务记录」。
  - 筛选 tabs：全部、主线任务、社交互动、奖励领取、系统通知。
  - 日期行：今天、`05月24日`、星期六。
  - 竖向时间轴，左侧为时间点和圆点状态，中间为记录卡。
  - 四条已完成主线任务：运动任务、喝水任务、社交任务、学习任务，均带绿色「已完成」印章。
  - 三条已领取奖励记录：完成全部主线任务、在补给抽卡机中抽取、连续打卡 18 天奖励，均带黄色「已领取」按钮状态。
  - 底部「加载更多记录」按钮。
- 右上 `TeammateRadarPanel`：
  - 标题「队友雷达」和「全部已读」按钮。
  - 状态 tabs：待响应 (3)、已回应、已过期。
  - 三条待响应邀请：大力水手、小鹿同学、跑步阿斌。
  - 每条包含头像、邀请互动文案、时间、橙色「待响应」标签、黄色「回应」按钮、灰色「忽略」按钮。
  - 底部「查看全部」入口。
- 右下 `RedemptionStatusPanel`：
  - 标题「兑换状态」。
  - 三条咖啡兑换券记录：兑换中、已完成、已失效。
  - 每条包含咖啡券图标、申请时间、预计完成/完成时间/失效时间和状态文案。
  - 底部「查看全部」入口。

## Current UI and Media Audit

静态复刻开始前必须先审核当前可用 UI 和媒体资产，不能直接进入 JSX 搭页面。

审核对象：

- 目标原型：`design/ui-assets/任务记录.png`
- Dashboard 首页原型：`design/ui-assets/dashboard-new.png`
- 当前 Dashboard 静态 route：`app/ui-lab/supply-dashboard/page.tsx`
- 当前团队目标静态 route：`app/ui-lab/supply-dashboard/team-goal/page.tsx`
- 当前补给商店静态 route：`app/ui-lab/supply-dashboard/shop/page.tsx`
- 当前 Dashboard UI lab 顶栏：`components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
- 当前正式补给站：`components/gamification/SupplyStation.tsx`
- 当前业务与资源资产：
  - `public/logo.png`
  - `public/avatars/*`
  - `public/assets/home-scenes/supply/dashboard/*`
  - `public/gamification/rewards/icons/*`
  - `public/assets/task-cards/raw/*`
  - `content/gamification/item-definitions.ts`
  - `content/gamification/reward-pool.ts`

当前初步判断：

- 顶栏、资源栏和页面族 tab 应复用 Dashboard 静态页已有 `SupplyDashboardTopTabs` 视觉规则；实现任务记录时需要把「任务记录」链接从 `#` 更新到 `/ui-lab/supply-dashboard/task-record`。
- 顶部资源只显示银子和补给券，保持目标图与 Dashboard 首页一致；不额外显示背包容量。
- 左侧健身房裁切窗口优先复用 `dashboard-gym-bg.webp` 和 `niuma-hero-clean.webp`。如果视觉 QA 后角色姿态不贴近目标图，再生成任务记录专属左栏角色资产。
- 兑换状态咖啡券图标复用 `public/gamification/rewards/icons/luckin_coffee_coupon.png`。
- 补给券、任务换班券、银子 icon 优先复用 `public/gamification/rewards/icons/*`。
- 运动、喝水、社交、学习记录 icon 可以先用 CSS 像素 badge、字符 icon 或已有任务卡 raw 图的局部缩略。第一阶段不为每条记录生成新插图。
- 队友头像复用 `public/avatars/*`。
- 时间轴、筛选 tabs、状态章、按钮、分隔线、侧栏菜单、读状态和兑换状态均用 HTML/CSS 实现。

## Media Asset Checklist

任务记录页第一阶段不要求新增必需位图资产。所有视觉素材优先复用 Dashboard、奖励图标、头像和 CSS 构造。

如视觉 QA 后确认现有牛马角色无法支撑左侧裁切窗口，可新增最终资产进入：

```text
public/assets/home-scenes/supply/task-record/
```

raw 生成图和中间处理文件不得进入 `public/`。建议放在临时目录，处理后只把最终压缩版入库。

### A. 优先复用资产

| 文件名 | 用途 | 策略 |
| --- | --- | --- |
| `public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp` | 左侧健身房窗口背景 | 复用并用 CSS 裁切 |
| `public/assets/home-scenes/supply/dashboard/niuma-hero-clean.webp` | 左侧牛马角色 | 复用并缩放定位 |
| `public/gamification/rewards/icons/luckin_coffee_coupon.png` | 咖啡兑换券图标 | 复用 |
| `public/gamification/rewards/icons/task_reroll_coupon.png` | 抽卡/任务券记录图标 | 复用 |
| `public/gamification/rewards/icons/coins_020.png` | 银子奖励记录图标 | 复用 |
| `public/avatars/male1.png`、`female1.png`、`male2.png` | 队友雷达头像 | 复用 |

### B. 可选新增资产

| 文件名 | 类型 | 用途 | 来源策略 | 建议尺寸 | 体积预算 |
| --- | --- | --- | --- | --- | --- |
| `task-record-sidebar-mascot.webp` | props | 左侧健身牛马角色和局部器械 | 仅当 Dashboard 角色复用效果不贴近目标图时用 imagegen 生成 | 高约 `520 px`，透明背景 | `<= 160 KB` |

### C. CSS 构造内容

| 内容 | 策略 |
| --- | --- |
| 顶部导航 icon | 复用 Dashboard 静态页策略，不新增位图 |
| 左侧菜单 icon | CSS、字符 icon 或现有基础图标，不新增位图 |
| 时间轴线、圆点、已完成勾 | CSS 实现 |
| 主线任务、奖励领取、抽卡奖励、系统奖励标签 | CSS badge 实现 |
| 已完成绿色印章、已领取黄色按钮、待响应橙色标签、兑换中蓝色状态 | CSS 实现 |
| 记录卡边框、纸面纹理、面板分隔线、加载更多按钮 | CSS 实现 |

## Page Structure

```text
supply-task-record-scene
  supply-task-record-background
  supply-task-record-content
    SupplyDashboardTopBar
    TaskRecordLayout
      TaskRecordSidebar
        TaskRecordMenu
        BackToLobbyButton
        SidebarMascotWindow
      TaskTimelinePanel
        TaskRecordFilterBar
        TaskRecordDayHeader
        TaskRecordTimeline
          TaskRecordTimelineItem[]
        LoadMoreRecordsButton
      TaskRecordAside
        TeammateRadarPanel
          RadarStatusTabs
          RadarInviteCard[]
          ViewAllRadarLink
        RedemptionStatusPanel
          RedemptionStatusCard[]
          ViewAllRedemptionsLink
```

首轮实现可以放在 `app/ui-lab/supply-dashboard/task-record/page.tsx` 和 `components/gamification/ui-lab/supply-task-record/` 下。顶栏继续复用 `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`，但不要迁移到正式 `components/gamification`。

## Mock Data Contract

静态 mock data 应集中定义，避免硬编码散落在 JSX 中。

建议结构：

```text
supplyTaskRecordMock
  topBar
    resources[]
    profile
  sidebar
    menuItems[]
    backHref
    mascot
      background
      hero
  filters[]
  day
    label
    dateLabel
    weekday
  timelineRecords[]
    id
    time
    title
    subtitle
    category
    categoryLabel
    categoryTone
    icon
      type
      value
      alt
    reward
      icon
      label
      amount
    status
    statusLabel
  radar
    actions
    tabs[]
    invites[]
      id
      avatar
      name
      message
      timeLabel
      statusLabel
  redemptions
    items[]
      id
      icon
      title
      requestedAt
      secondaryLabel
      status
      statusLabel
```

Mock data 必须表达这些状态：

- 顶栏资源与原型一致：银子 `2,450`、补给券 `18`。
- 顶栏 active tab 为「任务记录」。
- 左侧菜单包含五项，`今日记录` active。
- 中间筛选包含五项，`全部` active。
- 日期为 `今天 05月24日 星期六`。
- 时间线包含 7 条记录，按 `08:21`、`09:03`、`10:15`、`11:40`、`12:02`、`12:05`、`12:06` 展示。
- 前 4 条为主线任务完成记录，全部为 `已完成`。
- 后 3 条为奖励领取记录，全部为 `已领取`。
- 奖励包含生命票、补给券、运动饮料（R）和牛马币。
- 队友雷达包含 `待响应 (3)`、`已回应`、`已过期` 三个 tab，`待响应 (3)` active。
- 队友雷达包含 3 条待响应邀请，均有回应和忽略按钮的视觉状态。
- 兑换状态包含 3 条咖啡兑换券，分别为 `兑换中`、`已完成`、`已失效`。

## Component Style Targets

### Top bar

- 与 Dashboard、团队目标和补给商店静态页顶部高度、黄色底色、黑色描边和 active tab 形态一致。
- Active tab 为「任务记录」，呈带黑色下沿阴影的凸起按钮。
- 资源 capsule 固定高度，避免 `2,450` 和 `18` 撑破顶栏。
- 顶栏在窄屏可以横向滚动或换行，但不得遮挡主内容。

### Sidebar

- 桌面端固定在左侧，宽度约 `18%`。
- 黑色材质、粗描边、内阴影和目标图一致。
- 菜单项高度稳定，active 项为黄色背景和黑色描边。
- 「返回大厅」按钮为黄色实体按钮，带左箭头。
- 底部健身房窗口应有独立边框和裁切，不把背景图直接铺满整个侧栏。

### Timeline panel

- 中间为主阅读区，宽度约 `50%` 到 `52%`。
- 面板为米白纸面，黑色/灰色边框，内边距充足。
- 筛选 tabs 为直角或小圆角按钮，active tab 黄色填充。
- 时间轴左列固定宽度，记录卡右侧对齐形成稳定列表。
- 已完成主线任务卡使用绿色印章，不用普通绿色 pill 替代。
- 奖励领取记录的操作状态是黄色按钮态，和主线任务的完成章区分。
- 「加载更多记录」按钮居中，保持静态 disabled/visual 状态即可。

### Teammate radar panel

- 右上卡片宽度约 `30%` 到 `32%`，与兑换状态面板同宽。
- 标题区包含绿色雷达/罗盘感 icon、标题和「全部已读」按钮。
- `待响应 (3)` tab 黄色 active，其他 tab 白底描边。
- 邀请卡按三行排列，头像为像素头像方框。
- 「回应」按钮为黄色，「忽略」按钮为灰色。
- 卡片之间用细线分隔，底部「查看全部」居中。

### Redemption panel

- 右下面板与队友雷达保持同一宽度和边框规则。
- 咖啡券图标左对齐，状态右对齐。
- `兑换中` 使用蓝色状态，`已完成` 使用绿色状态，`已失效` 使用灰黑状态。
- 日期文案比标题小，颜色偏灰，但在移动端仍可读。

## Responsive Rules

桌面：

- 目标视口 `1536 x 1024` 时应尽量接近原型图的三栏比例。
- 顶栏、左侧菜单、中间时间线、右侧双面板都在首屏内可见。
- 中间时间线可以内部滚动，但默认 7 条记录应接近一屏展示。

平板和窄屏：

- 三栏可以降级为两栏：左侧菜单横向化或置顶，中间时间线在左，右侧面板堆叠在下方。
- 左侧健身房窗口可以缩小或隐藏，只保留菜单和返回按钮。
- 时间线记录卡可减少图标尺寸，但时间、标题、奖励和状态必须保留。

移动端：

- 第一阶段只要求可读、可滚动、无明显遮挡。
- 顶栏可以横向滚动。
- 侧栏菜单改为横向 segmented list。
- 右侧队友雷达和兑换状态在时间线后纵向排列。
- 不要求完全复刻桌面 HUD。

## Route And Isolation Strategy

路由：

```text
/ui-lab/supply-dashboard/task-record
```

隔离规则：

- 不加入当前 `Navbar` tab。
- 不改变 `AppTab` 类型。
- 不修改 `app/(board)/page.tsx` 的正式 tab 切换。
- 不修改 `components/gamification/SupplyStation.tsx`。
- 不读取登录 cookie。
- 不调用正式 API。
- 只更新 UI lab 顶栏里的任务记录 href，方便页面族内部跳转。

如果需要进入页面，直接访问实验 URL。后续是否把该 route 纳入受保护页面或正式导航，留到业务接入分支决定。

## 验收标准

1. `/ui-lab/supply-dashboard/task-record` 可在本地 dev server 访问。
2. 顶部任务记录 tab active，且 Dashboard 页面族内部可跳转到该实验路由。
3. 正式补给站、现有导航、业务 API 和数据库不受影响。
4. 桌面截图与 `任务记录.png` 的结构和视觉气质接近：左侧菜单、中间时间线、右侧队友雷达和兑换状态四个核心区域成立。
5. 页面主要区块按语义组件拆开，文件边界清楚。
6. mock data 集中定义，结构贴近每日任务、奖励领取、弱社交邀请和真实福利兑换业务。
7. 桌面和移动端检查无严重重叠、不可读或空白画面。
8. 没有真实业务动作、API、数据库、认证或生产导航变更。

## 测试策略

第一阶段以视觉验证为主，自动化测试保持轻量。

建议：

- `npm test -- __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts`
- `npm run lint`
- 使用 in-app browser 或 Playwright 检查桌面与移动端截图。

测试覆盖：

- 路由隔离和 UI lab 顶栏 href。
- mock data 的记录数量、分类、状态、资源和侧栏契约。
- 复用资产存在，且没有错误引用目标原型图。
- scene DOM 结构包含三栏和核心文本。
- CSS 包含 scene、sidebar、timeline、radar、redemption、responsive 和 reduced-motion 规则。

不要求：

- 为静态按钮写真实交互测试。
- 为尚未接业务的数据分页写 reducer 或 API 测试。
- 为目标图做截图像素 diff。

## 完成后决策

任务记录静态页完成后，需要一起决定：

1. 是否继续沿用“记录台账 + 操作收件箱”的信息架构。
2. 队友雷达是否未来保留在任务记录页，还是迁移到独立社交页。
3. 兑换状态是否只展示本人记录，还是也展示管理员队列入口。
4. 哪些时间线记录类型需要进入正式业务聚合 contract。
5. 下一个静态页面优先级：排行榜、背包、抽卡池或继续细化任务记录。
