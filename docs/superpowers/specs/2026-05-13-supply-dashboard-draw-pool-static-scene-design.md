# Supply Dashboard Draw Pool Static Scene Design

> 按 `design/ui-assets/抽卡池.png` 复刻牛马补给站页面族里的抽卡池二级页。本文档只覆盖抽卡池静态 scene route，不覆盖 Dashboard 首页、团队目标、排行榜、补给商店、背包或任务记录。

## 2026-05-13 Revision: 抽卡机改为原型裁图底图

第一版用 CSS 和散装素材拼中央抽卡机，和原型图差距过大。抽卡机本身是这个页面最强的视觉资产，后续实现改为从 `design/ui-assets/抽卡池.png` 裁出中央抽卡机完整区域作为底图资产。标题「补给抽卡机」、胶囊仓、灯管、旋钮、拉杆、「跳过抽奖动画」等都可以是图片内容，不再要求由代码逐层绘制。

代码层只覆盖两个透明交互热区：

- 「单抽 x1」
- 「十连 x10」

这两个热区需要保留 button 语义和可访问名称。中央抽卡机区域内其他内容只承担静态视觉，不实现交互。

同理，左侧「当前拥有」卡片的旗帜、像素边框、票券图、字体、分隔线和两个按钮视觉也应使用从原型图裁出的底图 `draw-pool-wallet-panel.png`。代码只覆盖「获取更多抽奖券」和「前往任务」两个透明 button 热区，避免用普通 CSS 矩形按钮破坏像素质感。

## 关联文档

- UI lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- 团队目标静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- 补给商店静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- 任务记录静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-task-record-static-scene-design.md`
- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- 旧抽奖业务 spec：`docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- 概率披露 spec：`docs/superpowers/specs/2026-05-02-gm-19-probability-disclosure-design.md`

执行本 spec 前必须先阅读图片原型复刻 workflow、Dashboard 静态复刻 spec 和已完成的补给站二级页 spec。本文只记录抽卡池页的差异、边界和验收标准，不重复 workflow 的通用 scene、资源、响应式和测试规则。

## 输入确认

- 目标原型：`design/ui-assets/抽卡池.png`
- 原型尺寸：`1536 x 1024`
- 页面定位：牛马补给站 Dashboard 页面族的抽卡池二级页
- 实验路由：`/ui-lab/supply-dashboard/draw-pool`
- 上级实验路由：`/ui-lab/supply-dashboard`
- 入口来源：Dashboard 首页底部 dock 的「补给机 / 补给站」入口，静态复刻后对用户展示名统一为「抽卡池」
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前约束：不替换正式补给站，不接真实业务 API，不新增生产导航入口。

## 页面目标

1. 把 `抽卡池.png` 复刻成隔离静态 TSX 页面。
2. 验证补给站页面族里的抽卡体验信息架构：券余额、抽卡机舞台、单抽、十连、跳过动画、保底进度、奖池概率、最近掉落和规则入口。
3. 把 Dashboard 首页里通往补给机的静态入口改成通往 `/ui-lab/supply-dashboard/draw-pool`，并把用户可见名称收敛为「抽卡池」。
4. 使用贴近现有 `GamificationLotterySummary`、`LotteryDrawSnapshot`、概率披露和奖励池配置的 mock data，但不提前接入真实抽奖状态。
5. 为后续业务接入预留抽卡余额、十连补券、保底、最近掉落、概率披露和规则跳转的数据 contract。
6. 保持当前稳定 `SupplyStation`、`/ui-lab/supply-dashboard` 首页、`/team-goal`、`/shop` 和 `/task-record` 完全不受影响。

## 非目标

- 不实现真实单抽、十连、扣券、扣银子、发放奖励、写入抽奖记录或十连保底。
- 不接入 `drawGamificationLottery`、`fetchGamificationState`、`buildGamificationProbabilityDisclosure` 或任何 `/api/gamification/*`。
- 不修改 Prisma schema、`lib/types.ts`、`lib/gamification/lottery.ts`、`lib/gamification/state.ts`、奖励池配置或 API Routes。
- 不让按钮执行真实业务动作；静态页按钮只表达视觉状态。
- 不实现抽卡动画、奖励揭示弹窗、十连结果弹窗或跳过动画真实状态。
- 不新增生产导航入口，不修改 `AppTab`，不改变 `(board)` 页面布局。
- 不把目标原型作为整张页面背景图贴到页面上；允许裁出中央抽卡机作为局部静态底图。
- 不为了像素还原牺牲移动端可读性。

## 原型拆解

### Scene shell

- 整体是补给站内部的抽卡机房，顶部为金属 HUD，左侧品牌「牛马补给站」，右侧资源为抽奖券和银子。
- 主视觉是粉红色大型补给抽卡机，占据页面中心，机器玻璃仓内堆满彩色胶囊球。
- 左侧为当前持有抽奖券和获取提示，底部为奖池预览概率条。
- 右侧为概率公示入口、保底进度和查看规则。
- 底部中间为最近掉落奖励卡，最底部为黄色「返回大厅」按钮。
- 视觉语言比 Dashboard 首页更像游戏机台：金属黑框、粉色机器、发光灯管、像素奖品、粗描边、强阴影和黄色 CTA。

### Main surfaces

- 顶部 `DrawPoolTopBar`：
  - 左侧品牌「牛马补给站」和牛马 logo。
  - 右侧资源 capsule：抽奖券 `18`、银子 `2,450`，均带 `+` 按钮视觉。
  - 最右侧为黄色黑边关闭按钮，链接回 `/ui-lab/supply-dashboard`。
- 左上 `TicketWalletPanel`：
  - 标题「当前拥有」。
  - 抽奖券 icon、抽奖券 `18 张`。
  - 今日获取上限：`18/30 张`。
  - CTA：「获取更多抽奖券」和「前往任务」。
- 左中 `DrawGuidePanel`：
  - 牛马健身吉祥物。
  - 对话气泡：完成任务获取抽奖券，抽取道具、效果或补给券。
  - 黄色按钮：「去完成」。
- 左下 `PoolPreviewPanel`：
  - 标题「奖池预览」。
  - 概率条：SSR `3%`、SR `17%`、R `35%`、N `45%`。
- 中央 `DrawMachineStage`：
  - 使用从原型图裁出的完整抽卡机底图，包含标题牌「补给抽卡机」、机器玻璃仓、彩色胶囊球、牛马标志、左右灯管、拉杆、旋钮、机器底座和「跳过抽奖动画」视觉。
  - 操作区视觉也在底图内：蓝色「单抽 x1」消耗 `x1` 抽奖券；黄色「十连 x10」消耗 `x10` 抽奖券。
  - 十连按钮上方红色标签「必出 SR 或以上」保留在底图内。
  - 代码只覆盖两个透明 button 热区，不再额外渲染机器标题、胶囊图或跳过动画 checkbox。
- 右侧 `DrawInfoRail`：
  - 黑色按钮「概率公示」。
  - `保底进度` 面板：再抽 `22 次` 必得 `SR 或以上`。
  - 粉色奖励箱图标。
  - 进度条 `48/70`。
  - `查看规则` 面板：三条规则说明和黄色「查看规则」按钮。
- 底部中间 `RecentDropsPanel`：
  - 标题「最近掉落」。
  - 右上「全部记录」入口，未来可通往任务记录页的抽卡记录分区。
  - 六张奖励卡：银子 `x200`、运动护腕 `x6`、经验加成券 `x2`、咖啡兑换券 `x1`、疾风跑鞋 `x1`、社交互动券 `x1`。
  - 卡片稀有度：SSR、SR、R、R、SR、R。
- 底部 `BackToLobbyBar`：
  - 黄色「返回大厅」按钮，链接 `/ui-lab/supply-dashboard`。

## Current UI and Media Audit

静态复刻开始前必须先审核当前可用 UI 和媒体资产，不能直接进入 JSX 搭页面。

审核对象：

- 目标原型：`design/ui-assets/抽卡池.png`
- Dashboard 首页原型：`design/ui-assets/dashboard-new.png`
- 当前 Dashboard 静态 route：`app/ui-lab/supply-dashboard/page.tsx`
- 当前 Dashboard UI lab 组件：`components/gamification/ui-lab/supply-dashboard/*`
- 当前任务记录静态 route：`app/ui-lab/supply-dashboard/task-record/page.tsx`
- 当前正式补给站：`components/gamification/SupplyStation.tsx`
- 当前业务与资源资产：
  - `public/logo.png`
  - `public/avatars/*`
  - `public/assets/home-scenes/supply/dashboard/*`
  - `public/assets/home-scenes/supply/shop/*`
  - `public/gamification/rewards/icons/*`
  - `content/gamification/reward-pool.ts`
  - `content/gamification/item-definitions.ts`
  - `lib/gamification/probability-disclosure.ts`

当前初步判断：

- 顶部资源和品牌可以复用 Dashboard UI lab 的 resource pill 视觉规则，但抽卡池原型没有页面族 top tabs，应做 route-local `DrawPoolTopBar`。
- Dashboard dock 的补给入口需要从 `href="#supply"` 改成 `/ui-lab/supply-dashboard/draw-pool`，展示名建议从「补给机」收敛为「抽卡池」。
- 页面背景可复用 `public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp` 并用深色 overlay、blur 和金属边框处理。
- 牛马 logo 复用 `public/logo.png`；顶部头像不出现在目标图，可不显示头像。
- 抽奖券 icon 可复用 `public/gamification/rewards/icons/task_reroll_coupon.png` 的票券视觉，静态页文案仍称「抽奖券」。
- 银子优先复用 `public/gamification/rewards/icons/coins_120.png` 或 `coins_020.png`。
- 咖啡兑换券、社交互动券、经验加成券可优先复用 `luckin_coffee_coupon.png`、`team_broadcast_coupon.png`、`small_boost_coupon.png`。
- 运动护腕、疾风跑鞋和玻璃仓胶囊球需要新增 draw-pool 专属静态资产。
- 机器外壳、粉色面板、标题牌、按钮、灯条、拉杆、旋钮、进度条、概率条和规则卡优先用 CSS 构造，不生成整机大图。

## Media Asset Checklist

所有新增最终资产进入：

```text
public/assets/home-scenes/supply/draw-pool/
```

raw 生成图和中间处理文件不得进入 `public/`。建议放在临时目录，处理后只把最终压缩版入库。

### A. 必需新增资产

| 文件名 | 类型 | 用途 | 来源策略 | 建议尺寸 | 体积预算 |
| --- | --- | --- | --- | --- | --- |
| `draw-pool-machine-panel.png` | machine | 中央抽卡机完整底图 | 从 `design/ui-assets/抽卡池.png` 裁出中央抽卡机区域，保留原型像素细节 | 约 `948 x 590` | `<= 1 MB` |
| `draw-pool-wallet-panel.png` | panel | 左侧当前拥有卡片完整底图 | 从 `design/ui-assets/抽卡池.png` 裁出左侧钱包卡片，保留旗帜、文字和按钮纹理 | 约 `300 x 380` | `<= 220 KB` |
| `draw-pool-capsule-bed.webp` | props | 抽卡机玻璃仓内的彩色胶囊球堆 | imagegen 生成，透明背景或深色透明边缘 | `1000 x 420` | `<= 280 KB` |
| `draw-pool-guide-mascot.webp` | props | 左侧引导区牛马健身吉祥物 | 优先复用 Dashboard 角色，不贴合则 imagegen 生成透明背景 | 高约 `380 px` | `<= 160 KB` |
| `draw-pool-wristband.webp` | 奖励 icon | 最近掉落「运动护腕」 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `draw-pool-running-shoe.webp` | 奖励 icon | 最近掉落「疾风跑鞋」 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |

### B. 优先复用或 CSS 构造的资产

| 内容 | 策略 |
| --- | --- |
| 顶部品牌 logo | 复用 `public/logo.png` |
| 暗色健身房背景 | 复用 Dashboard `dashboard-gym-bg.webp`，CSS 加深和裁切 |
| 抽奖券 icon | 复用 `public/gamification/rewards/icons/task_reroll_coupon.png` |
| 银子 | 复用 `public/gamification/rewards/icons/coins_120.png` 或 `coins_020.png` |
| 经验加成券 | 复用 `public/gamification/rewards/icons/small_boost_coupon.png` |
| 咖啡兑换券 | 复用 `public/gamification/rewards/icons/luckin_coffee_coupon.png` |
| 社交互动券 | 复用 `public/gamification/rewards/icons/team_broadcast_coupon.png` 或 `chat_ping.png` |
| 抽卡机粉色外壳、玻璃仓、拉杆、灯管、旋钮、按钮视觉 | 使用 `draw-pool-machine-panel.png` 局部底图 |
| 保底进度、概率条 | CSS 实现 |
| 最近掉落卡片边框、稀有度标签、数量、规则列表 | CSS 实现 |

### C. 可延后资产

- 真实抽卡动画帧。
- 单抽 / 十连结果揭示弹窗插图。
- SSR 金光、SR 紫光、R 黄光、N 蓝光掉落特效。
- 独立概率公示弹窗插图。
- 抽卡记录详情页专属图标。

## Page Structure

```text
supply-draw-pool-scene
  supply-draw-pool-background
  supply-draw-pool-content
    DrawPoolTopBar
      DrawPoolBrand
      DrawPoolResourceList
      CloseToLobbyButton
    DrawPoolLayout
      DrawPoolLeftRail
        TicketWalletPanel
        DrawGuidePanel
        PoolPreviewPanel
      DrawMachineStage
        DrawMachineHeader
        CapsuleGlass
        DrawMachineControls
        SkipAnimationToggle
      DrawInfoRail
        ProbabilityLink
        PityProgressPanel
        DrawRulesPanel
      RecentDropsPanel
    BackToLobbyBar
```

首轮实现可以放在 `app/ui-lab/supply-dashboard/draw-pool/page.tsx` 和 `components/gamification/ui-lab/supply-draw-pool/` 下。Dashboard 入口链接在 `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx` 中更新，但不要迁移任何 ui-lab 组件到正式 `components/gamification`。

## Mock Data Contract

静态 mock data 应集中定义，避免硬编码散落在 JSX 中。

建议结构：

```text
supplyDrawPoolMock
  topBar
    resources[]
    closeHref
  wallet
    ticketIcon
    ticketBalance
    dailyEarned
    dailyLimit
    helper
    actions[]
  guide
    mascotImage
    message
    actionLabel
  poolRates[]
    rarity
    label
    percent
    tone
  machine
    title
    capsuleBedImage
    emblemImage
    skipAnimation
    actions[]
      id
      label
      drawCount
      costTicket
      tone
      guaranteeLabel?
  pity
    remainingDraws
    guaranteeLabel
    current
    target
    rewardImage
  recentDrops[]
    id
    rarity
    name
    quantityLabel
    image
  rules[]
  backHref
```

Mock data 必须表达这些状态：

- 顶栏资源与原型数值一致：抽奖券 `18`、银子 `2,450`。
- 左侧钱包与原型一致：抽奖券 `18 张`，今日获取上限 `18/30 张`。
- 单抽消耗 `1` 张券，十连消耗 `10` 张券。
- 十连按钮标记 `必出 SR 或以上`。
- 保底进度为 `48/70`，文案为 `再抽 22 次 必得 SR 或以上`。
- 概率条为 SSR `3%`、SR `17%`、R `35%`、N `45%`。
- 最近掉落包含 6 个奖励，稀有度和数量与原型一致。
- 规则列表包含 3 条：随机获得道具/效果/补给券，十连必出 SR 或以上，抽奖券可通过完成任务获得。
- 返回大厅链接为 `/ui-lab/supply-dashboard`。

## Component Style Targets

### Top bar

- 高度、金属灰底和黄色品牌牌与目标图一致。
- 资源 capsule 采用黑色金属面板，数字右对齐，`+` 按钮固定尺寸。
- 关闭按钮必须是黄色方形实体按钮，点击目标链接回 Dashboard；窄屏不遮挡资源。

### Left rail

- 左上钱包面板是米白纸面，黑色粗描边，顶部黄色标签「当前拥有」。
- 抽奖券数字 `18` 的字号必须明显大于说明文案。
- 两个 CTA 上下排列，主按钮黄色，次按钮白底黑边。
- 牛马引导卡使用黄色底、黑色边框、角色图和白色对话气泡。
- 奖池预览是黑色面板，四条概率条颜色区分 SSR、SR、R、N。

### Machine stage

- 中央机器是页面视觉核心，桌面端宽度约占 `58%` 到 `62%`。
- 机器标题牌、粉色边框、左右灯条、玻璃仓和底座必须形成一个整体，不能像散落卡片。
- 玻璃仓内胶囊图必须被机器框裁切，不能溢出边框。
- 单抽和十连按钮尺寸接近，单抽为蓝色，十连为黄色，按钮下方都有抽奖券成本。
- `跳过抽奖动画` 是 checkbox 视觉，不实现真实开关状态。

### Right rail

- 概率公示入口是黑色金属按钮，带黄色统计 icon。
- 保底进度卡是白色内容面，外层黑色金属边框和黄色高亮边。
- `48/70` 进度条必须稳定，不随文字长度撑开。
- 查看规则卡贴近原型右下位置，列表紧凑但可读，按钮黄色。

### Recent drops

- 底部最近掉落面板为横向白色纸面，桌面端展示 6 张卡。
- 奖励卡固定宽高，稀有度标签在左上，数量在右下，名称在底部。
- SSR 金色、SR 紫色、R 黄色/橄榄色，N 蓝灰色；不要用同一种黄色区分所有卡。
- `全部记录` 入口在右上，未来可链接 `/ui-lab/supply-dashboard/task-record` 或抽卡记录分区。

## Responsive Rules

桌面：

- 目标视口 `1536 x 1024` 时应尽量接近原型图的横向机台布局。
- 顶栏、左侧钱包、中央机器、右侧保底/规则、底部最近掉落和返回大厅都在首屏内可见。
- 中央机器为主视觉，左右栏不能抢占机器宽度。

平板和窄屏：

- 主布局可从三栏降级为两栏：中央机器置顶，钱包/保底/规则在下方两列。
- 最近掉落允许横向滚动，但卡片尺寸必须稳定。
- 顶部资源 capsule 允许换行或横向滚动。

移动端：

- 第一阶段只要求可读、可滚动、无明显遮挡。
- 顶部保留品牌、资源和返回入口。
- 中央机器可简化为纵向卡片，操作按钮上下排列。
- 左侧钱包、保底、奖池预览、最近掉落和规则纵向排列。
- 不要求完全复刻桌面 HUD，但核心抽卡信息和返回路径必须完整。

## Route And Isolation Strategy

路由：

```text
/ui-lab/supply-dashboard/draw-pool
```

入口：

```text
/ui-lab/supply-dashboard -> Dashboard dock「抽卡池」 -> /ui-lab/supply-dashboard/draw-pool
```

隔离规则：

- 不加入当前 `Navbar` tab。
- 不改变 `AppTab` 类型。
- 不修改 `app/(board)/page.tsx` 的正式 tab 切换。
- 不修改 `components/gamification/SupplyStation.tsx`。
- 不读取登录 cookie。
- 不调用正式 API。
- 只更新 UI lab Dashboard dock 里的抽卡池 href 和展示名。

如果需要进入页面，直接访问实验 URL 或从 Dashboard UI lab dock 进入。后续是否把该 route 纳入正式补给站路由，留到业务接入分支决定。

## 验收标准

1. `/ui-lab/supply-dashboard/draw-pool` 可在本地 dev server 访问。
2. Dashboard UI lab 底部 dock 的补给入口展示为「抽卡池」并链接到该实验路由。
3. 正式补给站、现有导航、业务 API 和数据库不受影响。
4. 桌面截图与 `抽卡池.png` 的结构和视觉气质接近：顶部 HUD、左侧钱包、中央粉色抽卡机、右侧保底/规则、底部最近掉落和返回大厅全部成立。
5. 核心数值与原型一致：抽奖券 `18`、银子 `2,450`、今日获取 `18/30`、保底 `48/70`、再抽 `22` 次、SSR `3%`、SR `17%`、R `35%`、N `45%`。
6. 页面主要区块按语义组件拆开，文件边界清楚。
7. mock data 集中定义，结构贴近抽奖 summary、概率披露和最近抽奖记录业务。
8. 必需资产在 `public/assets/home-scenes/supply/draw-pool/` 下，且通过资产测试。
9. 桌面和移动端检查无严重重叠、不可读或空白画面。
10. 没有真实业务动作、API、数据库、认证或生产导航变更。

## 测试策略

第一阶段以视觉验证为主，自动化测试保持轻量。

建议：

- `npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts`
- `npm run lint`
- 使用 in-app browser 或 Playwright 检查桌面与移动端截图。

测试覆盖：

- 路由隔离和 Dashboard dock href。
- mock data 的资源、钱包、概率、保底、抽卡动作、最近掉落和规则契约。
- 新增资产存在，复用奖励资产路径存在，没有错误引用目标原型图。
- scene DOM 结构包含三栏机台和核心文本。
- CSS 包含 scene、topbar、left rail、machine、right rail、recent drops、responsive 和 reduced-motion 规则。

不要求：

- 为静态按钮写真实抽卡交互测试。
- 为动画、奖励弹窗或随机结果写 reducer/API 测试。
- 为目标图做截图像素 diff。

## 完成后决策

抽卡池静态页完成后，需要一起决定：

1. 「抽卡池」是否作为 Dashboard dock 的正式名称，替换旧的「补给机 / 补给站」文案。
2. 概率公示是保持跳转 Docs Center，还是在抽卡池内做轻量弹窗。
3. 最近掉落是否只展示本人记录，还是加入团队最近高光。
4. 十连结果揭示和跳过动画是否进入下一轮 UI lab。
5. 抽卡池业务接入时是否复用现有 `SupplyStation` lottery UI 逻辑，还是拆成独立正式组件。
