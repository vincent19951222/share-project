# Supply Dashboard Backpack Static Scene Design

> 按 `design/ui-assets/背包.png` 复刻牛马补给站页面族里的背包二级页。本文档只覆盖背包静态 scene route，不覆盖 Dashboard 首页、补给商店、抽卡池、排行榜、团队目标或任务记录。

## 关联文档

- UI lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- 补给商店静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- 背包 V1 业务设计：`docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

执行本 spec 前必须先阅读图片原型复刻 workflow、Dashboard 静态复刻 spec 和背包 V1 业务设计。本文只记录背包静态页的页面差异、边界和验收标准，不重复 workflow 的通用 scene、资源、响应式和测试规则。

## 输入确认

- 目标原型：`design/ui-assets/背包.png`
- 原型尺寸：`1536 x 1024`
- 页面定位：牛马补给站 Dashboard 页面族的背包二级页
- 实验路由：`/ui-lab/supply-dashboard/backpack`
- 上级实验路由：`/ui-lab/supply-dashboard`
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前业务参考：`snapshot.backpack`、`ITEM_DEFINITIONS`、`RewardTile`
- 当前约束：不替换正式补给站，不接真实业务 API，不新增生产导航入口。

## 页面目标

1. 把 `背包.png` 复刻成隔离静态 TSX 页面。
2. 验证补给站页面族里的背包信息架构：分类侧栏、今日效果、库存格子、锁定格、分页、道具详情和使用/兑换 CTA。
3. 沿用 Dashboard 首页和补给商店的游戏 HUD、像素风 brutalist 边框、黄色 active 状态和黑色底部提示条。
4. 使用贴近现有 `GamificationBackpackSummary` 的 mock data，而不是把视觉常量散落在 JSX 中。
5. 为后续业务接入预留库存数量、可用数量、锁定槽位、今日效果、使用时机、使用限制和管理员确认的数据 contract。
6. 保持当前稳定 `SupplyStation`、`/ui-lab/supply-dashboard` 首页和 `/ui-lab/supply-dashboard/shop` 完全不受影响。

## 非目标

- 不实现真实道具使用、库存扣减、任务刷新、社交邀请、真实福利兑换申请或管理员确认。
- 不接入 `useInventoryItem`、`requestRealWorldRedemption`、`fetchGamificationState` 或任何 `/api/gamification/*`。
- 不修改 Prisma schema、`lib/types.ts`、`lib/gamification/*`、奖励池配置或 API Routes。
- 不实现背包扩容购买、格子解锁、分页切换、排序切换或分类筛选的真实交互。
- 不让「今日使用」「申请兑换」「去商店」「返回大厅」执行真实 mutation。
- 不新增生产导航入口，不修改 `AppTab`，不改变 `(board)` 页面布局。
- 不把目标原型作为整张背景图贴到页面上。
- 不为了像素还原牺牲移动端可读性。

## 原型拆解

### Scene shell

- 整体是补给站内部的库存管理页，白色纸面主容器外包黑色粗边和黄色顶部 HUD。
- 顶部不是 Dashboard 的完整 tab 导航，而是面包屑式标题：`牛马补给站 / 背包`。
- 顶栏右侧显示银子 `2,450`、补给券 `18`、背包容量 `18/40` 和关闭按钮。
- 主内容是三列布局：左侧分类与今日效果，中间库存格子，右侧选中道具详情。
- 底部是黑色提示栏，左侧灯泡提示，右侧帮助中心入口。
- 视觉语言延续像素游戏、brutalist 粗边框、硬阴影、黄色 active 状态和稀有度描边。

### Main surfaces

- 顶部 `BackpackHeaderBar`：
  - 左侧牛马 logo 与「牛马补给站」。
  - 面包屑分隔符 `/` 和当前页「背包」。
  - 右侧资源 capsule：银子 `2,450`、补给券 `18`、背包 `18/40`。
  - 右上角关闭按钮为黑底黄叉视觉，只做静态链接或无动作按钮。
- 左侧 `BackpackSidebar`：
  - 标题「背包」和背包 icon。
  - 容量 `18/40` 与黄色加号按钮。
  - 分类列表：全部、增益、任务、社交、真实福利。
  - `全部` 处于 active 状态，黄色背景、黑色描边、右箭头。
  - 下半区 `今日效果` 展示四条效果：经验获取、体力上限、步数加成、饮水加成。
  - 底部黄色「返回大厅」按钮。
- 中间 `BackpackInventoryPanel`：
  - 白色/米白内容面，左上没有额外标题，右上有排序 select「按稀有度」。
  - 桌面端库存格为 5 列 x 4 行。
  - 前 16 个可见格为道具，后 4 个为锁定格。
  - 当前选中「咖啡兑换券」，卡片有更粗黄色描边和内侧高亮。
  - 每个道具卡展示稀有度、像素图、数量和名称。
  - 稀有度色彩：`N` 蓝、`R` 金、`SR` 紫、`SSR` 橙红。
  - 锁定格展示锁 icon 和 `20级解锁`、`25级解锁`、`30级解锁`、`35级解锁`。
  - 底部分页：上一页 disabled、页码 `1 / 2`、下一页黄色 active。
- 右侧 `BackpackItemDetailPanel`：
  - 选中道具为「咖啡兑换券」，稀有度 `R`，标签「真实福利」，持有 `8`。
  - 顶部大图展示咖啡券像素图。
  - 描述：`可在补给商店兑换指定咖啡饮品。`
  - 信息区块：效果、使用时机、使用限制。
  - 效果：`兑换指定咖啡饮品（价值约￥20）`。
  - 使用时机：`随时可用（需前往补给商店兑换）`。
  - 使用限制：`每日最多兑换 1 次`、`仅限在补给商店可用`。
  - 主按钮：`今日使用`；次按钮：`申请兑换`。
  - 底部提示：`前往补给商店兑换真实福利`，右侧按钮 `去商店`。
- 底部 `BackpackHintBar`：
  - 左侧灯泡 icon 和黄色「小提示：」。
  - 文案：`部分真实福利需管理员确认后发放，请耐心等待通知~`
  - 右侧帮助中心入口。

## Current UI and Media Audit

静态复刻开始前必须先审核当前可用 UI 和媒体资产，不能直接进入 JSX 搭页面。

审核对象：

- 目标原型：`design/ui-assets/背包.png`
- 备选原型：`design/ui-assets/背包-new.png`，只作方向参考，不作为本轮目标图
- Dashboard 首页原型：`design/ui-assets/dashboard-new.png`
- 当前 Dashboard 静态 route：`app/ui-lab/supply-dashboard/page.tsx`
- 当前补给商店静态 route：`app/ui-lab/supply-dashboard/shop/page.tsx`
- 当前 UI lab 组件：`components/gamification/ui-lab/supply-dashboard/*`、`components/gamification/ui-lab/supply-shop/*`
- 当前正式补给站背包区：`components/gamification/SupplyStation.tsx`
- 当前背包业务 state：`lib/gamification/state.ts`
- 当前道具定义：`content/gamification/item-definitions.ts`
- 当前奖励资产：
  - `public/gamification/rewards/icons/*`
  - `content/gamification/reward-assets.ts`
  - `components/gamification/RewardTile.tsx`
- 当前商店静态资产：
  - `public/assets/home-scenes/supply/shop/*`

当前初步判断：

- 顶部资源 capsule 和底部提示栏应沿用 Dashboard/Shop 静态页视觉规则，但背包页需要新增面包屑顶栏，而不是复用完整 `SupplyDashboardTopTabs`。
- 咖啡兑换券可复用 `public/gamification/rewards/icons/luckin_coffee_coupon.png`。
- 经验徽章、补给券、牛马币可优先复用 `public/gamification/rewards/icons/*`。
- 能量药剂、训练记录本、健身装扮类资产可复用 shop 静态资产。
- 原型中的运动饮料、饭团、疾风跑鞋、体力护环、哑铃、香蕉、学习指南、爱心、社交券、赛季勋章没有完全对应的最终像素图，建议生成 backpack 专属静态图标。
- 分类 icon、加号按钮、锁 icon、排序 select、分页、分隔虚线、底部提示栏均用 HTML/CSS 实现。

## Media Asset Checklist

所有新增最终资产进入：

```text
public/assets/home-scenes/supply/backpack/
```

raw 生成图和中间处理文件不得进入 `public/`。建议放在临时目录，处理后只把最终压缩版入库。

### A. 必需新增资产

| 文件名 | 类型 | 用途 | 来源策略 | 建议尺寸 | 体积预算 |
| --- | --- | --- | --- | --- | --- |
| `backpack-sports-drink.webp` | 道具 icon | 运动饮料 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `backpack-rice-ball.webp` | 道具 icon | 饭团 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `backpack-speed-shoes.webp` | 道具 icon | 疾风跑鞋 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |
| `backpack-stamina-ring.webp` | 道具 icon | 体力护环 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |
| `backpack-dumbbell.webp` | 道具 icon | 哑铃 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `backpack-banana.webp` | 道具 icon | 香蕉 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `backpack-study-guide.webp` | 道具 icon | 学习指南 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |
| `backpack-heart.webp` | 道具 icon | 爱心 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `backpack-social-ticket.webp` | 道具 icon | 社交券 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `backpack-season-medal.webp` | 道具 icon | 赛季勋章 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |

### B. 优先复用或 CSS 构造的资产

| 内容 | 策略 |
| --- | --- |
| 牛马 logo | 复用 `public/logo.png` |
| 咖啡兑换券 | 复用 `public/gamification/rewards/icons/luckin_coffee_coupon.png` |
| 补给券 | 复用 `public/gamification/rewards/icons/task_reroll_coupon.png` 或已有商店 coupon 资产 |
| 牛马币 | 复用 `public/gamification/rewards/icons/coins_020.png` |
| 经验徽章 | 优先复用 `public/assets/home-scenes/supply/shop/shop-title-badge.webp` 或生成 CSS 徽章；不单独生成，除非视觉明显不成立 |
| 能量药剂 | 可复用 `public/assets/home-scenes/supply/shop/shop-energy-bottle.webp` |
| 训练记录本 | 可复用 `public/assets/home-scenes/supply/shop/shop-training-log.webp` |
| 背包、分类、加号、关闭、锁、分页、帮助中心 icon | CSS 或字符 icon 实现 |
| 稀有度描边、卡片底色、排序 select、分隔虚线、按钮、提示栏 | CSS 实现 |

### C. 可延后资产

- 格子 hover/press 动效。
- 使用道具成功、申请兑换成功和管理员确认状态图。
- 背包扩容购买或升级动画。
- 多页库存切换动画。
- 业务接入后的未知道具、下架道具和空背包插图。

## Page Structure

```text
supply-backpack-scene
  supply-backpack-shell
    BackpackHeaderBar
      BrandCrumb
      BackpackResourceStrip
      CloseButton
    BackpackMainLayout
      BackpackSidebar
        BackpackCategoryList
        TodayEffectsList
        BackToLobbyButton
      BackpackInventoryPanel
        InventoryToolbar
        InventoryGrid
          InventoryItemCard[]
          LockedSlotCard[]
        InventoryPagination
      BackpackItemDetailPanel
        DetailHero
        DetailDescription
        DetailRuleBlocks
        DetailActions
        DetailShopCta
    BackpackHintBar
```

首轮实现可以放在 `app/ui-lab/supply-dashboard/backpack/page.tsx` 和 `components/gamification/ui-lab/supply-backpack/` 下。背包页不要复用补给商店的三列商品组件；可复用顶部资源 capsule 的样式规则，但组件命名应表达背包语义。

## Mock Data Contract

静态 mock data 应集中定义，避免硬编码散落在 JSX 中。

建议结构：

```text
supplyBackpackMock
  topBar
    breadcrumb[]
    resources[]
    capacity
  sidebar
    title
    capacity
    categories[]
    todayEffects[]
  sortOptions[]
  selectedSort
  inventory
    page
    totalPages
    slots[]
      type: "item" | "locked"
      item? / unlockLevel?
  selectedItemDetail
    itemId
    rarity
    name
    tag
    ownedQuantity
    image
    description
    effect
    useTiming
    restrictions[]
    actions[]
    shopCta
  hint
```

Mock data 必须表达这些状态：

- 顶栏资源与原型一致：银子 `2,450`、补给券 `18`、背包 `18/40`。
- 左侧容量与原型一致：`18/40`。
- 分类包含五类，`全部` active。
- 今日效果包含四条，倒计时均为 `02:35:18`。
- 库存格桌面端显示 20 个槽位：16 个道具格 + 4 个锁定格。
- 选中道具为 `coffee-coupon`，名称「咖啡兑换券」，数量 `8`，稀有度 `R`，标签「真实福利」。
- 库存道具覆盖 `N`、`R`、`SR`、`SSR` 四种稀有度。
- 库存道具数量覆盖单个、个位数、两位数和三十枚左右的堆叠数量。
- 锁定格包含 `20级解锁`、`25级解锁`、`30级解锁`、`35级解锁`。
- 分页显示当前 `1 / 2`，上一页 disabled，下一页 active。
- 详情区同时展示今日使用和申请兑换两个 CTA，但都不执行真实 mutation。

## Component Style Targets

### Header bar

- 高度接近原型顶部黄色 HUD，桌面端约占页面高度 `8%`。
- 外框为黑色粗边，内部黄色渐变或纯黄色，右上关闭按钮黑底黄叉。
- 资源 capsule 为黑底、黄色描边或阴影，数字必须垂直居中。
- 面包屑里的 `/` 保持明显间隔，不使用 Dashboard tab active 样式。

### Sidebar

- 桌面端宽度约 `22%`，包含上下两块白色卡面。
- 分类项高度稳定，active 分类黄色背景、黑色描边、右箭头靠右。
- 今日效果行使用左 icon、中文 label、绿色增益值、绿色倒计时四列压缩排版。
- `返回大厅` 按钮固定在左侧底部卡片内，按钮高度和按下阴影沿用 `.quest-btn` 气质。

### Inventory panel

- 中间库存面板宽度约 `45%`，内边距比商店目录更紧。
- Grid 使用固定列数和稳定卡片比例；桌面为 5 列，卡片接近竖向道具卡。
- 道具图必须居中，不被数量遮挡；数量位于右下或图下右侧。
- 名称区域固定高度，长名称应换行或收紧字号，不撑高卡片。
- 选中态使用双层金色描边，必须比普通 `R` 稀有度边框更明显。
- 锁定格为深灰渐变或纯深灰，锁 icon 和解锁等级居中。
- 分页控件不改变布局高度，disabled/active 状态清楚。

### Detail panel

- 右侧宽度约 `30%`，浅蓝底或蓝色细描边，和原型右侧详情面一致。
- 顶部图标卡为白底金色描边，左上角显示稀有度。
- 标题、标签、持有数量排版必须支持中文长文案。
- 三个信息区块之间使用虚线分隔，保持清晰的阅读顺序。
- 底部 CTA 采用黄色主按钮和白色次按钮，并保留黑色硬阴影。
- 最底部 shop CTA 是浅蓝脚注条，不应和主 CTA 混成同一层级。

### Bottom hint bar

- 黑色横条贴近 scene 底部，左侧提示文字黄色强调，右侧帮助中心黄色图标。
- 移动端可以折行，但不能遮住主内容或导致整页横向滚动。

## Responsive Rules

- `>= 1180px`：保持原型三列布局，主内容尽量一屏内完整呈现。
- `900px - 1179px`：三列仍可保留，但库存卡片缩小，左侧今日效果和右侧详情压缩字号。
- `< 900px`：改为单列滚动：
  - 顶栏资源允许换行。
  - 左侧分类变为横向 chips 或紧凑列表。
  - 库存 grid 改为 4 列或 3 列，保持卡片比例。
  - 详情面板移到库存 grid 下方。
  - 底部提示栏保留在内容流末尾，不 fixed。
- `< 520px`：资源 capsule 和按钮文字必须换行或收紧，不能溢出容器；库存 grid 最少 3 列。

## Accessibility And Interaction Contract

- 静态 CTA 使用 `button type="button"`，不执行 mutation。
- 当前分类、当前选中道具、当前页码必须通过 `aria-current` 或 `aria-selected` 表达。
- 道具图使用有意义的 `alt`，纯装饰 icon 使用 `aria-hidden`。
- 关闭、返回大厅、去商店可使用 `Link` 指向 UI lab 页面，但不得进入生产 route。
- 颜色不能作为唯一状态来源：稀有度和锁定状态必须有文字。
- reduced motion 下不启用闪烁、漂浮或背景动效。

## Testing Strategy

新增测试只覆盖静态 scene contract，不做截图像素测试。

- Route isolation：
  - `/ui-lab/supply-dashboard/backpack` route 存在。
  - 不修改生产 `SupplyStation`、`Navbar`、`AppTab`。
  - Dashboard 首页的背包入口可链接到 `/ui-lab/supply-dashboard/backpack`。
- Mock data：
  - 顶栏资源、容量、分类、今日效果、库存格、锁定格、选中详情符合 contract。
  - 稀有度覆盖 `N/R/SR/SSR`。
  - 真实福利选中项有 `requiresAdminConfirmation` 或等价字段。
- Asset contract：
  - 必需新增 backpack 资产存在且体积在预算内。
  - 复用 reward/shop 资产存在。
  - 不引用 `design/ui-assets/背包.png` 作为页面背景。
- Scene structure：
  - 渲染后存在 header/sidebar/grid/detail/hint bar。
  - 20 个 slot 渲染为 16 个 item + 4 个 locked。
  - 选中卡和详情面板指向同一 item。
  - CTA 文案存在但没有真实 API 调用。
- CSS contract：
  - `app/globals.css` 中所有新规则使用 `supply-backpack-*` 前缀。
  - 存在桌面三列 grid、移动端单列降级、库存 grid 断点、locked slot、selected slot、reduced-motion 规则。

## Acceptance Criteria

1. 访问 `/ui-lab/supply-dashboard/backpack` 可以看到接近 `背包.png` 的静态背包页。
2. 桌面端首屏能同时看到顶部 HUD、左侧分类/今日效果、中间库存格、右侧详情和底部提示栏。
3. 中间库存格为 5 列 x 4 行视觉，选中「咖啡兑换券」和右侧详情一致。
4. 左侧分类和今日效果信息密度接近原型，不出现明显溢出或挤压。
5. 右侧详情面板信息完整，主/次 CTA 层级清楚。
6. 页面不调用 API、不读取 cookies、不修改真实状态。
7. 生产补给站和已完成 UI lab 页面不受影响。
8. 测试覆盖 route、mock data、assets、scene DOM 和 CSS contract。
9. 新增资产只进入 `public/assets/home-scenes/supply/backpack/`，raw 文件不入库。
10. 移动端可读可滚动，无横向滚动和文字重叠。

## Open Decisions For Implementation Review

- 背包页顶部是否长期保留面包屑 HUD，还是后续统一回 Dashboard 页面族 tab。
- `今日使用` 与 `申请兑换` 在业务接入时是否需要按道具类型互斥展示。
- 背包容量 `18/40` 的真实来源应使用库存总量、槽位占用，还是两者分离。
- 是否把背包 grid 卡片抽成未来商店、抽卡结果和背包共用的 inventory tile。
