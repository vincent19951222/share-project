# Supply Dashboard Team Goal Static Scene Design

> 按 `design/ui-assets/团队目标.png` 复刻牛马补给站页面族里的团队目标二级页。本文档只覆盖团队目标静态 scene route，不覆盖 Dashboard 首页、背包、抽卡池、补给商店、排行榜或任务记录。

## 关联文档

- UI lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

执行本 spec 前必须先阅读图片原型复刻 workflow 和 Dashboard 静态复刻 spec。本文只记录团队目标页的差异、边界和验收标准，不重复 workflow 的通用 scene、资源、响应式和测试规则。

## 输入确认

- 目标原型：`design/ui-assets/团队目标.png`
- 原型尺寸：`1536 x 1024`
- 页面定位：牛马补给站 Dashboard 页面族的团队目标二级页
- 实验路由：`/ui-lab/supply-dashboard/team-goal`
- 上级实验路由：`/ui-lab/supply-dashboard`
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前约束：不替换正式补给站，不接真实业务 API，不新增生产导航入口。

## 页面目标

1. 把 `团队目标.png` 复刻成隔离静态 TSX 页面。
2. 验证补给站页面族里的团队目标信息架构：团队副本、赛季目标、团队金库、里程碑轨道、今日团队任务、奖励预览和底部公告。
3. 沿用 Dashboard 首页的游戏 HUD 顶栏、资源栏、像素风 brutalist 边框和黄色高亮体系。
4. 使用贴近现有业务形状的 mock data，尤其是 `ActiveSeasonSnapshot`、团队金库、团队任务和补给奖励。
5. 为后续团队目标业务接入预留清晰的静态数据 contract，但不提前实现真实计算或接口。
6. 保持当前稳定 `SupplyStation` 和 `/ui-lab/supply-dashboard` 首页完全不受影响。

## 非目标

- 不实现真实团队目标 API。
- 不修改 Prisma schema、`lib/types.ts`、`lib/gamification/state.ts` 或任何 API Route。
- 不接入 `fetchGamificationState`、`SeasonService`、`createSeasonForTeam`、`endActiveSeasonForTeam` 或真实团队任务统计。
- 不让按钮执行真实跳转、领取奖励、打开宝库或查看成员操作。
- 不新增生产导航入口，不修改 `AppTab`，不改变 `(board)` 页面布局。
- 不把目标原型作为整张背景图贴到页面上。
- 不为了像素还原牺牲移动端可读性。

## 原型拆解

### Scene shell

- 整体是补给站内部的团队目标页面，顶部仍是黄色游戏 HUD 导航。
- 主内容是白色纸面/看板式大容器，黑色粗边框和阴影分隔页面层级。
- 页面主题比 Dashboard 首页更偏团队赛季进度和奖励路线，内容密度高但分区明确。
- 视觉语言延续像素游戏、brutalist 粗边框、硬阴影、黄色 active tab、绿色进度条和金色奖励。

### Main surfaces

- 顶部导航 `GameTopBar`：
  - 左侧品牌「牛马补给站」。
  - 页面族导航：我的状态、团队目标、排行榜、补给商店、任务记录。
  - 团队目标处于 active 状态。
  - 右侧资源：银子、补给券、背包容量、头像入口。
- 返回与标题区：
  - 左上返回按钮「返回大厅」。
  - 中央标题「团队目标」，两侧星星装饰。
- `本周团队副本` 面板：
  - 左侧团队徽章和团队名「牛马不加班」。
  - 团队等级、成员数、查看成员按钮。
  - 中间赛季目标卡：赛季目标名称、日期范围、剩余天数、团队进度数值和进度条。
  - 中间偏右团队金库卡：宝箱、累计银子、获取说明和「宝库商店」按钮。
  - 右侧赛季目标奖励清单：经验、补给券、团队称号、头像框。
- `MilestoneRoad` 里程碑轨道：
  - 横向草地/天空背景。
  - 五个节点：20,000、50,000、80,000、100,000、120,000。
  - 1、2 已完成，3 当前阶段，4 进行中，5 未解锁。
  - 轨道已完成段为绿色，当前推进段为黄色，未完成段为深色。
- 底部左侧 `今日团队任务`：
  - 四条任务：全队运动打卡、四维任务完成、社交互动响应、补给券活跃使用。
  - 每条包含 icon、标题、说明、当前进度、进度条、奖励和状态按钮。
  - 右上显示刷新倒计时。
- 底部右侧 `奖励预览`：
  - 四张奖励卡：团队宝箱、团队加成、团队称号、周报高光。
  - 下方主 CTA「领取团队奖励」。
  - 右侧说明「当前阶段：3/5」。
- 底部公告栏：
  - 团队公告。
  - 帮助中心、意见反馈、设置等视觉入口。

## Current UI and Media Audit

静态复刻开始前必须先审核当前可用 UI 和媒体资产，不能直接进入 JSX 搭页面。

审核对象：

- 目标原型：`design/ui-assets/团队目标.png`
- Dashboard 首页原型：`design/ui-assets/dashboard-new.png`
- 当前 Dashboard 静态 route：`app/ui-lab/supply-dashboard/page.tsx`
- 当前 Dashboard UI lab 组件：`components/gamification/ui-lab/supply-dashboard/*`
- 当前正式补给站：`components/gamification/SupplyStation.tsx`
- 当前全局视觉资产：
  - `public/logo.png`
  - `public/avatars/*`
  - `public/assets/icons/*`
  - `public/assets/home-scenes/punch/*`
  - `public/assets/home-scenes/supply/dashboard/*`
  - `public/gamification/rewards/icons/*`

当前初步判断：

- 顶栏、资源栏、底部公告栏应优先复用 Dashboard 静态页的视觉规则，必要时抽出 `SupplyDashboardTopBar` 级别的 ui-lab 内部组件。
- 团队徽章可以先用新生成 `team-goal-crest.webp`，也可以临时复用 `public/logo.png`，但最终静态复刻应有接近原型的徽章资产。
- 里程碑草地背景需要新背景图或复用现有 punch gym 背景不合适；建议生成 `team-goal-road-bg.webp`。
- 宝箱可以评估复用 `public/assets/home-scenes/report/vault-safe-yellow.webp` 或 Dashboard 的补给机/金库资产；若比例不贴合，生成 `team-goal-vault-chest.webp`。
- 奖励小图标优先复用 `public/gamification/rewards/icons/*` 和 CSS badge。
- 任务 icon 可复用奖励图标、`public/assets/icons/*` 或 CSS/emoji 占位，第一阶段不为每条任务生成独立插画。
- 面板边框、进度条、节点盾牌、按钮、标签、倒计时和公告栏均用 CSS 实现。

## Media Asset Checklist

所有新增最终资产进入：

```text
public/assets/home-scenes/supply/team-goal/
```

raw 生成图和中间处理文件不得进入 `public/`。建议放在临时目录，处理后只把最终压缩版入库。

### A. 必需资产

| 文件名 | 类型 | 用途 | 来源策略 | 建议尺寸 | 体积预算 |
| --- | --- | --- | --- | --- | --- |
| `team-goal-road-bg.webp` | 背景 | 横向里程碑草地/天空轨道背景 | imagegen 生成或人工绘制后压缩 | `1536 x 260` | `<= 260 KB` |
| `team-goal-crest.webp` | props/icon | 左侧团队徽章 | imagegen 生成，透明背景 | `360 x 360` | `<= 140 KB` |
| `team-goal-vault-chest.webp` | props/icon | 团队金库和最终里程碑宝箱 | 优先复用已有金库资产，不贴合再生成 | `360 x 280` | `<= 140 KB` |

### B. 优先复用或 CSS 构造的资产

| 内容 | 策略 |
| --- | --- |
| 顶部导航 icon | 优先复用 Dashboard 静态页已有策略或 lucide/CSS，不新增位图 |
| 银子、补给券、加成券 | 优先复用 `public/gamification/rewards/icons/*` |
| 背包容量图标 | 优先复用 Dashboard 静态页资源栏样式 |
| 用户头像 | 复用 `public/avatars/*` |
| 团队任务 icon | 优先复用奖励图标和 CSS badge |
| 里程碑盾牌、锁、序号圆点 | CSS 实现，必要时用内联文本符号，不生成独立图片 |
| 奖励预览卡片边框、按钮、进度条 | CSS 实现 |

### C. 可延后资产

- 更细致的团队称号牌匾。
- 专属头像框图标。
- 每个里程碑节点的独立徽章图。
- 领取奖励后的特效、弹窗和动画。
- 真实宝库商店图标或二级页入口动效。

## Page Structure

```text
supply-team-goal-scene
  supply-team-goal-background
  supply-team-goal-content
    SupplyDashboardTopBar
    TeamGoalHeader
      BackToLobbyButton
      PageTitle
    WeeklyTeamRaidPanel
      TeamIdentityCard
      SeasonProgressSummary
      TeamVaultSummary
      SeasonRewardList
    MilestoneRoad
      MilestoneNode[]
    TeamGoalLowerGrid
      TodayTeamTasksPanel
        TeamTaskRow[]
      RewardPreviewPanel
        RewardPreviewCard[]
        ClaimTeamRewardBar
    TeamAnnouncementBar
```

首轮实现可以放在 `app/ui-lab/supply-dashboard/team-goal/page.tsx` 和 `components/gamification/ui-lab/supply-team-goal/` 下。若 Dashboard 首页已经沉淀了可复用顶栏或资源栏，可以在 `components/gamification/ui-lab/supply-dashboard/` 内部复用，但不要迁移到正式 `components/gamification`。

## Mock Data Contract

静态 mock data 应集中定义，避免硬编码散落在 JSX 中。

建议结构：

```text
teamGoalMock
  topBar
    resources[]
    profile
  team
    name
    level
    memberCount
    memberLimit
    crestImage
  season
    label
    goalName
    dateRange
    remainingDays
    currentPoints
    targetPoints
    progressPercent
    currentStage
    totalStages
  vault
    amount
    image
    helper
  seasonRewards[]
    id
    icon
    label
    value
  milestones[]
    id
    order
    title
    targetPoints
    status
    rewardLabel
  tasks[]
    id
    icon
    title
    subtitle
    current
    target
    unit
    reward
    status
  rewardPreview[]
    id
    title
    subtitle
    imageOrIcon
    tone
  announcement
```

Mock data 必须表达这些状态：

- 当前阶段为 `3 / 5`。
- 总进度为 `78,560 / 120,000`，进度 `65%`。
- 里程碑包含 `completed`、`current`、`active`、`locked` 四类状态。
- 今日团队任务包含四条，其中都处于「进行中」但进度不同。
- 奖励预览包含宝箱、团队加成、团队称号、周报高光四类。
- 资源栏数值与原型保持一致：银子 `2,450`、补给券 `18`、背包 `68/120`。

## Component Style Targets

### Top bar

- 与 Dashboard 静态页顶部高度、黄色底色、黑色描边和 active tab 形态一致。
- Active tab 为「团队目标」，呈带黑色下沿阴影的凸起按钮。
- 资源 capsule 固定高度，避免数字变化时撑开顶栏。

### Weekly raid panel

- 顶层卡片必须是一个完整 main surface，而不是四个散落卡片。
- 左侧团队身份卡约占面板 `24%`，中间赛季进度和金库约占 `50%`，右侧奖励清单约占 `26%`。
- 内部分隔线为浅棕色或灰色细线，外框仍使用粗黑边。
- 进度条使用绿色主段，背景为浅米色，右侧显示百分比。

### Milestone road

- 横向道路必须是页面视觉焦点，背景图只承担草地/天空氛围，不承载真实文本。
- 节点文本、状态和进度轨道都用 HTML/CSS 渲染。
- 桌面端五个节点均在一行；平板可压缩间距；移动端改为可读的纵向阶段列表。
- 已完成节点有绿色盾牌和「已完成」，当前节点有黄色描边和「当前阶段」，锁定节点有灰色锁和「未解锁」。

### Lower grid

- 桌面为左右两栏，左侧任务约 `46%`，右侧奖励约 `54%`。
- 今日团队任务行高稳定，icon、标题、进度、奖励、状态按钮不互相挤压。
- 奖励预览卡保持 4 列，窄屏降为 2 列，移动端降为 1 列或横向可扫卡片。
- CTA 使用黄色 brutalist 按钮，按下态沿用 `.quest-btn` 的物理反馈。

## Responsive Rules

- 桌面 `1536 x 1024` 是主还原口径，首屏应看到完整顶栏、团队副本、里程碑、底部两栏和公告栏。
- `1024px` 左右宽度下，顶部团队副本可从四列压成两行，但里程碑仍优先保持横向。
- `768px` 以下：
  - 顶栏导航允许横向滚动。
  - 团队副本改为单列堆叠。
  - 里程碑改为纵向 timeline。
  - 底部任务和奖励改为单列。
  - 装饰背景弱化，文本和按钮优先可读可点。
- 移动端不要求像素复刻桌面原型，但必须保留页面层级、当前阶段和任务/奖励信息。

## Test Strategy

### Unit and contract tests

- Route isolation：确认 `/ui-lab/supply-dashboard/team-goal` 存在，且没有修改生产 tab、正式 `SupplyStation` 或 `AppTab`。
- Mock data：确认团队、赛季、里程碑、任务、奖励预览和资源栏数据完整。
- Asset contract：确认必需最终资产存在并满足体积预算。
- Scene DOM：确认核心 landmark、标题、active nav、五个里程碑、四条任务、四张奖励卡和公告栏存在。
- CSS contract：确认 `supply-team-goal-*` 分层、粗边框、进度条、responsive 和 reduced-motion 规则存在。

### Visual QA

- 用浏览器打开 `http://127.0.0.1:3000/ui-lab/supply-dashboard/team-goal`。
- 桌面检查 `1536 x 1024`：页面与原型的区块比例、留白、顶部导航、里程碑轨道和底部面板应高度接近。
- 移动检查 `390 x 844`：不出现文本重叠、按钮溢出、主信息被背景遮挡或横向页面溢出。
- 检查图片边缘：徽章和宝箱不应有白边、黑边、透明残留或明显拉伸。

## Acceptance Criteria

1. 新增 route 只在 `/ui-lab/supply-dashboard/team-goal` 可访问。
2. 页面桌面首屏结构与 `团队目标.png` 一致：顶栏、返回标题、团队副本、里程碑、今日任务、奖励预览、公告栏全部出现。
3. 核心数值与原型一致：`78,560 / 120,000`、`65%`、`5,680`、阶段 `3/5`、资源栏 `2,450`、`18`、`68/120`。
4. mock data 集中在 ui-lab 数据文件中，JSX 不散落业务常量。
5. 页面不调用 API、不读取 auth/cookie、不写数据库。
6. `SupplyStation`、`AppTab`、正式导航和现有 Dashboard 静态页不被替换。
7. 必需资产在 `public/assets/home-scenes/supply/team-goal/` 下，且通过资产测试。
8. Vitest contract tests 通过。
9. 浏览器桌面和移动视觉 QA 通过。

