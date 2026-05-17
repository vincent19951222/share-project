# Supply Dashboard Shop Static Scene Design

> 按 `design/ui-assets/补给商店.png` 复刻牛马补给站页面族里的补给商店二级页。本文档只覆盖补给商店静态 scene route，不覆盖 Dashboard 首页、团队目标、背包、抽卡池、排行榜或任务记录。

## 关联文档

- UI lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- 团队目标静态复刻 spec：`docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- 图片原型复刻 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

执行本 spec 前必须先阅读图片原型复刻 workflow 和 Dashboard 静态复刻 spec。本文只记录补给商店页的差异、边界和验收标准，不重复 workflow 的通用 scene、资源、响应式和测试规则。

## 输入确认

- 目标原型：`design/ui-assets/补给商店.png`
- 原型尺寸：`1536 x 1024`
- 页面定位：牛马补给站 Dashboard 页面族的补给商店二级页
- 实验路由：`/ui-lab/supply-dashboard/shop`
- 上级实验路由：`/ui-lab/supply-dashboard`
- 当前正式页面：`components/gamification/SupplyStation.tsx`
- 当前约束：不替换正式补给站，不接真实业务 API，不新增生产导航入口。

## 页面目标

1. 把 `补给商店.png` 复刻成隔离静态 TSX 页面。
2. 验证补给站页面族里的商店信息架构：分类侧栏、资源余额、商品筛选、商品网格、商品详情和兑换 CTA。
3. 沿用 Dashboard 首页的游戏 HUD 顶栏、资源栏、像素风 brutalist 边框和黄色 active tab 体系。
4. 使用贴近现有奖励池、背包和兑换业务形状的 mock data，但不提前接入真实状态。
5. 为后续业务接入预留商品、库存、每日限购、管理员确认和详情面板的数据 contract。
6. 保持当前稳定 `SupplyStation`、`/ui-lab/supply-dashboard` 首页和 `/ui-lab/supply-dashboard/team-goal` 完全不受影响。

## 非目标

- 不实现真实商品购买、兑换、扣银子、扣补给券或发放背包道具。
- 不接入 `requestRealWorldRedemption`、`useGamificationItem`、`fetchGamificationState` 或任何 `/api/gamification/*`。
- 不修改 Prisma schema、`lib/types.ts`、`lib/gamification/*`、奖励池配置或 API Routes。
- 不实现商店后台配置、上下架管理、真实库存计算或管理员确认流程。
- 不让按钮执行真实购买、跳转背包、打开详情弹窗或二次确认。
- 不新增生产导航入口，不修改 `AppTab`，不改变 `(board)` 页面布局。
- 不把目标原型作为整张背景图贴到页面上。
- 不为了像素还原牺牲移动端可读性。

## 原型拆解

### Scene shell

- 整体是补给站内部的商品目录页，顶部仍是黄色游戏 HUD 导航。
- 页面分为三列：左侧黑色分类和余额侧栏、中间商品网格、右侧商品详情。
- 中间主区是米白纸面，商品卡有粗边框、浅阴影、稀有度和限购标签。
- 右侧详情面板固定展示当前选中商品，包含大图、描述、效果、使用时机、购买限制、花费和兑换按钮。
- 视觉语言延续像素游戏、brutalist 粗边框、硬阴影、黄色 active 状态、红色限量标签和绿色限购标签。

### Main surfaces

- 顶部导航 `SupplyDashboardTopTabs`：
  - 左侧品牌「牛马补给站」。
  - 页面族导航：我的状态、团队目标、排行榜、补给商店、任务记录。
  - 补给商店处于 active 状态。
  - 右侧资源：银子 `3,850`、补给券 `18`、背包 `68/120`、头像入口。
- 左侧 `ShopSidebar`：
  - 标题「补给商店」和购物车 icon。
  - 分类列表：今日推荐、增益道具、任务道具、社交道具、真实福利、装饰称号。
  - 今日推荐处于 active 状态。
  - 底部 `我的资源` 显示银子 `3,850`、补给券 `18`。
  - 底部黄色「返回大厅」按钮。
- 中间 `ShopCatalogPanel`：
  - 顶部筛选 tabs：全部、可兑换、已拥有。
  - 右上排序 select：默认排序。
  - 商品网格桌面端为 4 列。
  - 第一行商品：任务重置券、小幅加成券、社交互动券、咖啡兑换券（中杯）。
  - 第二行商品：学习时长券、体力恢复剂、训练记录本、轻食便当兑换券。
  - 第三行商品：头像框·奋斗牛、称号·自律牛马、健身牛马装扮。
  - 底部提示条：「真实福利」类商品需管理员确认后发放，请耐心等待通知。
- 右侧 `ShopItemDetailPanel`：
  - 当前选中商品为「任务重置券」。
  - 顶部显示每日限购 `1/1`。
  - 大图复用任务重置券图标。
  - 说明：可以重置 1 个未完成的主线任务进度，重置后该任务可重新完成以获取奖励。
  - 信息区块：效果、使用时机、购买限制。
  - 花费：银子 `150`。
  - 主 CTA：「兑换」。
  - 底部提示：该商品为虚拟道具，兑换后将直接发放至背包。

## Current UI and Media Audit

静态复刻开始前必须先审核当前可用 UI 和媒体资产，不能直接进入 JSX 搭页面。

审核对象：

- 目标原型：`design/ui-assets/补给商店.png`
- Dashboard 首页原型：`design/ui-assets/dashboard-new.png`
- 当前 Dashboard 静态 route：`app/ui-lab/supply-dashboard/page.tsx`
- 当前团队目标静态 route：`app/ui-lab/supply-dashboard/team-goal/page.tsx`
- 当前 Dashboard UI lab 组件：`components/gamification/ui-lab/supply-dashboard/*`
- 当前正式补给站：`components/gamification/SupplyStation.tsx`
- 当前奖励资产：
  - `public/gamification/rewards/icons/*`
  - `content/gamification/reward-assets.ts`
  - `content/gamification/reward-pool.ts`
- 当前全局视觉资产：
  - `public/logo.png`
  - `public/avatars/*`
  - `public/assets/icons/*`
  - `public/assets/home-scenes/supply/dashboard/*`

当前初步判断：

- 顶栏、资源栏和页面族 tab 应复用 Dashboard 静态页已有 `SupplyDashboardTopTabs` 视觉规则；实现补给商店时需要把「补给商店」链接从 `#` 更新到 `/ui-lab/supply-dashboard/shop`。
- 银子、补给券和头像优先复用现有奖励图标与头像资产。
- `任务重置券`、`小幅加成券`、`咖啡兑换券` 可以复用 `public/gamification/rewards/icons/task_reroll_coupon.png`、`small_boost_coupon.png`、`luckin_coffee_coupon.png`。
- `社交互动券` 可先复用 `team_broadcast_coupon.png` 或 `chat_ping.png`，后续业务接入再映射真实定义。
- `学习时长券`、`体力恢复剂`、`训练记录本`、`轻食便当兑换券`、`头像框·奋斗牛`、`称号·自律牛马`、`健身牛马装扮` 当前没有完全对应的最终像素商品图，建议生成 shop 专属静态图标。
- 分类 icon、筛选 tab、排序 select、限购标签、价格栏、分隔线、右侧说明区块和按钮均用 HTML/CSS 实现。

## Media Asset Checklist

所有新增最终资产进入：

```text
public/assets/home-scenes/supply/shop/
```

raw 生成图和中间处理文件不得进入 `public/`。建议放在临时目录，处理后只把最终压缩版入库。

### A. 必需新增资产

| 文件名 | 类型 | 用途 | 来源策略 | 建议尺寸 | 体积预算 |
| --- | --- | --- | --- | --- | --- |
| `shop-learning-pass.webp` | 商品 icon | 学习时长券 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `shop-energy-bottle.webp` | 商品 icon | 体力恢复剂 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `shop-training-log.webp` | 商品 icon | 训练记录本 | imagegen 生成，透明背景 | `320 x 320` | `<= 90 KB` |
| `shop-light-meal.webp` | 商品 icon | 轻食便当兑换券 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |
| `shop-avatar-frame.webp` | 商品 icon | 头像框·奋斗牛 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |
| `shop-title-badge.webp` | 商品 icon | 称号·自律牛马 | imagegen 生成，透明背景 | `420 x 220` | `<= 100 KB` |
| `shop-fitness-outfit.webp` | 商品 icon | 健身牛马装扮 | imagegen 生成，透明背景 | `320 x 320` | `<= 100 KB` |

### B. 优先复用或 CSS 构造的资产

| 内容 | 策略 |
| --- | --- |
| 顶部导航 icon | 复用 Dashboard 静态页策略，不新增位图 |
| 银子、补给券、增益券、任务重置券、咖啡券 | 复用 `public/gamification/rewards/icons/*` |
| 背包容量图标 | 复用 Dashboard 静态页资源栏样式 |
| 用户头像 | 复用 `public/avatars/*` |
| 购物车、分类 icon、返回箭头、星星装饰 | CSS 或字符 icon 实现 |
| 商品卡边框、稀有度、限购、库存、价格栏、筛选 tab、排序 select | CSS 实现 |
| 右侧详情面板分隔线、效果 icon、使用时机 icon、购买限制 icon | CSS 或字符 icon 实现 |

### C. 可延后资产

- 更细致的每个商品 hover/selected 动画。
- 商品购买成功弹窗和发放动效。
- 真实福利管理员确认状态插图。
- 完整商店分类页空状态插图。
- 业务接入后的商品上下架状态图标。

## Page Structure

```text
supply-shop-scene
  supply-shop-background
  supply-shop-content
    SupplyDashboardTopBar
    SupplyShopLayout
      ShopSidebar
        ShopCategoryList
        ShopResourceCard
        BackToLobbyButton
      ShopCatalogPanel
        ShopFilterBar
        ShopProductGrid
          ShopProductCard[]
        ShopNoticeBar
      ShopItemDetailPanel
        DetailHero
        DetailDescription
        DetailRules
        DetailCost
        RedeemButton
        DetailFootnote
```

首轮实现可以放在 `app/ui-lab/supply-dashboard/shop/page.tsx` 和 `components/gamification/ui-lab/supply-shop/` 下。顶栏继续复用 `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`，但不要迁移到正式 `components/gamification`。

## Mock Data Contract

静态 mock data 应集中定义，避免硬编码散落在 JSX 中。

建议结构：

```text
supplyShopMock
  topBar
    resources[]
    profile
  sidebar
    categories[]
    resources[]
  filters[]
  sortOptions[]
  selectedFilter
  selectedSort
  products[]
    id
    name
    subtitle
    categoryId
    image
    rarity
    tags[]
    price
      currency
      amount
    ownedQuantity
    stock
      label
      remaining
      total
    dailyLimit
      label
      used
      total
    requiresAdminConfirmation
    selected
  selectedProductDetail
    productId
    description
    effect
    useTiming
    purchaseLimit
    cost
    footnote
  notice
```

Mock data 必须表达这些状态：

- 顶栏资源与原型一致：银子 `3,850`、补给券 `18`、背包 `68/120`。
- 左侧资源与原型一致：银子 `3,850`、补给券 `18`。
- 分类包含六类，`今日推荐` active。
- 筛选包含 `全部`、`可兑换`、`已拥有`，`全部` active。
- 商品总数为 11 个，桌面端呈 4 + 4 + 3 的网格形态。
- 选中商品为 `任务重置券`，价格为银子 `150`，每日限购 `1/1`。
- 至少包含这些标签状态：`推荐`、`限量`、`剩余 5`、`剩余 3`、`剩余 2`、`需要管理员确认`、`SR`、`SSR`。
- 至少 1 个真实福利商品需要管理员确认。
- 至少 3 个商品为装饰/称号类，并使用紫色或金色稀有度边框。

## Component Style Targets

### Top bar

- 与 Dashboard 和团队目标静态页顶部高度、黄色底色、黑色描边和 active tab 形态一致。
- Active tab 为「补给商店」，呈带黑色下沿阴影的凸起按钮。
- 资源 capsule 固定高度，避免 `3,850`、`68/120` 等数字撑破顶栏。

### Sidebar

- 桌面端固定在左侧，宽度约 `17%` 到 `18%`，黑色面板贯穿主内容高度。
- 分类项高度稳定，active 分类为黄色背景和黑色描边。
- 非 active 分类使用深灰背景、浅边框和右侧箭头。
- 底部资源卡和返回按钮应贴近原型，不随商品网格高度漂移。

### Catalog grid

- 桌面端中间主区约占页面 `54%`，右侧详情约占 `27%`。
- 商品卡固定宽高，图标区、标题区、说明区、价格栏不得互相挤压。
- 商品卡状态标签贴近卡片上沿：左侧推荐/稀有度/库存，右侧每日限购。
- 选中商品使用黄色描边；限量真实福利商品使用红色或橙色强调；SR/SSR 使用紫色和金色边框。
- 底部提示条必须位于商品网格下方，不遮挡第三行商品。

### Detail panel

- 桌面端固定在右侧，面板高度与中间主面板接近。
- 商品大图居中，标题、持有数量和描述层级清晰。
- `效果`、`使用时机`、`购买限制` 三块使用稳定的 icon + 标题 + 文案结构。
- 花费区和兑换按钮靠下，黄色主按钮沿用 `.quest-btn` 的 physical feedback。
- 底部说明用浅米色提示条，不能看起来像可点击 CTA。

## Responsive Rules

- 桌面 `1536 x 1024` 是主还原口径，首屏应看到完整顶栏、左侧分类、中间 11 个商品、右侧详情和底部提示。
- `1200px` 左右宽度下，中间商品网格可从 4 列降为 3 列，右侧详情仍保留在同一行。
- `1024px` 左右宽度下，页面可改为两列：左侧侧栏压缩，中间商品和右侧详情上下或左右排列。
- `768px` 以下：
  - 顶栏导航允许横向滚动。
  - 左侧分类改为横向 category rail 或顶部折行区域。
  - 商品网格改为 2 列。
  - 详情面板移到商品网格下方。
  - 返回大厅按钮保留可见或移到顶部。
- 移动端不要求像素复刻桌面原型，但必须保留商品筛选、商品列表、选中详情、价格和兑换 CTA 的阅读顺序。

## Test Strategy

### Unit and contract tests

- Route isolation：确认 `/ui-lab/supply-dashboard/shop` 存在，且没有修改生产 tab、正式 `SupplyStation` 或 `AppTab`。
- Top tab wiring：确认 `SupplyDashboardTopTabs` 中「补给商店」链接到 `/ui-lab/supply-dashboard/shop`。
- Mock data：确认分类、筛选、排序、11 个商品、选中详情、资源栏和标签状态完整。
- Asset contract：确认必需新增商品资产存在并满足体积预算；确认可复用奖励资产路径存在。
- Scene DOM：确认核心 landmark、active nav、六个分类、三个筛选 tab、11 张商品卡、右侧详情和公告提示存在。
- CSS contract：确认 `supply-shop-*` 分层、粗边框、三列布局、商品网格、详情面板、responsive 和 reduced-motion 规则存在。

### Visual QA

- 用浏览器打开 `http://127.0.0.1:3000/ui-lab/supply-dashboard/shop`。
- 桌面检查 `1536 x 1024`：页面与原型的区块比例、商品网格、左侧分类、右侧详情、顶部资源栏应高度接近。
- 移动检查 `390 x 844`：不出现文本重叠、按钮溢出、详情面板遮挡商品、横向页面溢出或商品价格不可读。
- 检查商品图标边缘：不应有白边、黑边、透明残留、明显拉伸或低清晰度。

## Acceptance Criteria

1. 新增 route 只在 `/ui-lab/supply-dashboard/shop` 可访问。
2. 页面桌面首屏结构与 `补给商店.png` 一致：顶栏、左侧分类、资源卡、商品筛选、11 个商品、右侧详情、兑换按钮和底部提示全部出现。
3. 核心数值与原型一致：银子 `3,850`、补给券 `18`、背包 `68/120`、任务重置券价格 `150`、每日限购 `1/1`。
4. mock data 集中在 ui-lab 数据文件中，JSX 不散落业务常量。
5. 页面不调用 API、不读取 auth/cookie、不写数据库。
6. `SupplyStation`、`AppTab`、正式导航、Dashboard 静态首页和团队目标静态页不被替换。
7. 必需资产在 `public/assets/home-scenes/supply/shop/` 下，且通过资产测试。
8. Vitest contract tests 通过。
9. 浏览器桌面和移动视觉 QA 通过。
