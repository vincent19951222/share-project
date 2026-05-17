# Supply UI Lab Componentized Static Pages Design

> 将当前牛马补给站 UI Lab 的 6 个静态页面，从“原型 panel 裁图 + 透明热点”收拢为“可维护 TSX/CSS 组件 + 原子 media 素材”的静态页面族。本文档延续 `2026-05-10-supply-dashboard-ui-lab-design.md` 的 UI Lab 路线，不进入真实业务接入。

## Context

当前分支 `codex/ui-lab-supply-dashboard` 已经完成 6 个隔离静态页面：

- `/ui-lab/supply-dashboard`
- `/ui-lab/supply-dashboard/team-goal`
- `/ui-lab/supply-dashboard/shop`
- `/ui-lab/supply-dashboard/task-record`
- `/ui-lab/supply-dashboard/draw-pool`
- `/ui-lab/supply-dashboard/backpack`

这些页面已经有 route、mock data、静态 assets、scene 测试、CSS contract 测试和 handoff 记录。当前主要问题不是能不能打开页面，而是二级页大量使用裁切后的原型 panel 图片作为页面 UI 元素。这种方式适合快速验证视觉方向，但不适合作为后续业务接入和组件复用的基础。

本轮采用方案 A：原型图只作为像素参考，不再作为 UI panel 本体。页面结构、按钮、筛选、列表、网格、资源条、进度条、状态卡和详情面板应回到 TSX/CSS 组件。图片资源只保留为原子 media：角色、道具、抽卡机、背景、装饰物和必要的透明插画。

## Goals

1. 保留当前 UI Lab 的 6 页范围，并让页面之间导航完整可用。
2. 从顶部 tab 中移除「排行榜」，本轮不实现排行榜 route，也不保留 `href="#"` 假入口。
3. 把共享视觉语言沉淀成可复用组件和 CSS contract。
4. 将原型裁图 panel 逐步替换为语义化 TSX/CSS UI。
5. 缺少角色、道具、机器、背景或装饰物素材时，使用生成的透明/背景素材补齐，而不是裁整块 UI 面板。
6. 尽量贴近 1536x1024 原型图的布局比例、视觉密度、留白、边框、阴影和状态表达。
7. 在完成后通过 focused tests、lint、build 和浏览器视觉检查，再按页面族清理提交。

## Non-Goals

- 不接入 Prisma、API Routes、真实登录用户、真实库存、抽卡、兑换、任务状态或排行榜数据。
- 不替换生产 `components/gamification/SupplyStation.tsx`。
- 不新增生产导航入口。
- 不做排行榜静态页面。
- 不把整张原型图或整块 panel 裁图当作最终页面 UI。
- 不为了逐像素复刻牺牲中文文本可读性、键盘可访问性或移动端可用性。

## Source Prototypes

所有原型图尺寸均为 1536x1024：

- Dashboard：首页参考 `design/ui-assets/dashboard-new.png`
- 团队目标：`design/ui-assets/团队目标.png`
- 补给商店：`design/ui-assets/补给商店.png`
- 任务记录：`design/ui-assets/任务记录.png`
- 抽卡池：`design/ui-assets/抽卡池.png`
- 背包：当前 route 参考 `design/ui-assets/背包.png`；`design/ui-assets/背包-new.png` 作为可选视觉参考，只在不扩大范围的前提下吸收更合理的细节

## Architecture

### Route Boundary

UI Lab 继续保持隔离 route，不影响正式补给站：

```text
app/ui-lab/supply-dashboard/page.tsx
app/ui-lab/supply-dashboard/team-goal/page.tsx
app/ui-lab/supply-dashboard/shop/page.tsx
app/ui-lab/supply-dashboard/task-record/page.tsx
app/ui-lab/supply-dashboard/draw-pool/page.tsx
app/ui-lab/supply-dashboard/backpack/page.tsx
```

每个 route 只加载对应 mock data 和 scene component。页面互跳使用真实 `Link`，不存在 `href="#"` 的主导航入口。

### Component Layers

组件分三层：

```text
components/gamification/ui-lab/supply-dashboard/
  SupplyUiLabTopBar.tsx
  shared scene/topbar primitives

components/gamification/ui-lab/supply-<page>/
  Supply<Page>Scene.tsx
  mock-data.ts
  types.ts

app/globals.css
  shared UI Lab rules
  per-page scene rules
```

共享组件优先表达业务语义，而不是裁图名称：

- `SupplyUiLabTopBar`
- `SupplyUiLabResourcePill`
- `SupplyUiLabPixelPanel`
- `SupplyUiLabTabs`
- `SupplyUiLabFilterBar`
- `SupplyUiLabProgress`
- `SupplyUiLabStatusBadge`
- `SupplyUiLabActionButton`

页面级组件保留在对应页面目录内，直到确认能真实复用：

- Dashboard：角色状态、主视觉、今日任务、快捷入口、公告
- 团队目标：团队副本、里程碑路、团队任务、奖励预览、公告
- 补给商店：商店侧栏、商品筛选、商品网格、商品详情
- 任务记录：记录侧栏、时间线、队友雷达、兑换状态
- 抽卡池：券包、引导、奖池概率、抽卡机、保底、规则、最近掉落
- 背包：背包侧栏、库存网格、道具详情、提示栏

### CSS Organization

当前 [app/globals.css](/Users/vincent/Projects/share-project/app/globals.css) 中存在多轮历史 UI Lab CSS 定义。实施时需要把 Supply UI Lab 相关 CSS 收拢为单一有效版本：

```text
/* Supply UI Lab shared primitives */
/* Supply Dashboard UI Lab */
/* Supply Team Goal UI Lab */
/* Supply Shop UI Lab */
/* Supply Task Record UI Lab */
/* Supply Draw Pool UI Lab */
/* Supply Backpack UI Lab */
```

收拢规则：

- 删除不再被 JSX 使用的旧选择器。
- 保留 reduced-motion、responsive、focus-visible 规则。
- 使用固定舞台比例和 responsive constraints，而不是浏览器缩放或整页截图。
- 面板、按钮、状态、网格和列表使用 CSS 绘制，不依赖 panel crop。

## Media Strategy

允许保留或生成的图片类型：

- 背景环境图，例如健身房、抽卡池背景。
- 角色或 mascot，例如牛马角色。
- 道具 icon，例如饮料、券、训练装备。
- 机器或大型物件，例如抽卡机。
- 透明装饰物，例如徽章、宝箱、贴纸。

不允许作为最终 UI 的图片类型：

- 顶栏整块截图。
- 商品列表整块截图。
- 背包库存整块截图。
- 详情面板整块截图。
- 任务时间线整块截图。
- 团队任务/奖励/公告整块截图。

如果原型中的某个局部质感无法用 CSS 快速复刻，优先生成小型透明装饰素材，并把真实文字、按钮、列表和状态留在组件里。

最终资源继续放在：

```text
public/assets/home-scenes/supply/<page>/
public/assets/home-scenes/supply/shared/
```

临时生成图和视觉 QA 输出不进入 `public/`，除非它们被命名、压缩并接入组件。

## Interaction Design

本轮仍是静态 UI Lab，但页面级交互必须完整表达：

- Dashboard 快捷入口跳转到背包、抽卡池、任务记录等 UI Lab route。
- 顶部 tab 只包含：我的状态、团队目标、补给商店、任务记录。
- 背包使用 breadcrumb 顶栏并可返回大厅。
- 商店商品、背包格、任务筛选、抽卡按钮、奖励领取等控件保留静态状态和可访问标签。
- 不触发真实业务 mutation；按钮保持静态或 mock 状态。
- 不使用不可达的 `#` 作为主流程入口。纯说明型辅助链接可以保留为锚点，但不应出现在主导航。

## Page Requirements

### Dashboard

Dashboard 已经更接近目标方式：主要使用 TSX/CSS 构建，而不是 panel 裁图。后续应作为二级页组件化的样板。

要求：

- 保持角色状态、主视觉、今日主线、快捷入口、公告的布局比例。
- 移除未使用的 dashboard panel crop 依赖。
- 保留原子素材：背景、牛马角色、dock 图标、任务卡 raw 图。
- 顶栏删除排行榜 tab。

### Team Goal

当前团队目标页面大量依赖 `team-goal-*-panel.png`。后续需要把团队副本、里程碑、任务、奖励和公告重建为组件。

要求：

- 团队副本区域用 TSX 表达团队名、等级、成员、赛季目标、金库和奖励。
- 里程碑路可使用背景/装饰素材，但节点、进度和奖励文字由组件渲染。
- 团队任务和奖励卡使用可复用 progress/card/status 组件。
- 公告栏用真实文本和链接组件。

### Shop

当前补给商店的侧栏、catalog 和 detail 基本是 panel 图片。后续需要还原为真实三栏 UI。

要求：

- 侧栏分类和资源用真实 nav/list。
- 商品筛选、排序、商品网格、库存/价格/限制状态用组件渲染。
- 商品 icon 使用原子 media。
- 详情面板渲染标题、说明、效果、限制、价格和兑换按钮。
- `disabled` 兑换状态应由 mock data 明确驱动。

### Task Record

当前任务记录的 sidebar、timeline、radar、redemptions 使用 panel 图片。后续应把时间线和侧栏状态组件化。

要求：

- 侧栏分类用真实按钮。
- 时间线记录用真实 list/article，包含时间、类别、标题、奖励和状态。
- 队友雷达、兑换状态使用可复用 side panel 结构。
- 头像和奖励 icon 可使用原子 media。

### Draw Pool

抽卡池视觉复杂度最高，可以保留抽卡机和背景作为图片素材，但 UI panel、资源、概率、保底、规则、最近掉落必须组件化。

要求：

- 顶栏不使用整块截图，复用共享 TopBar 或抽卡池专用语义顶栏。
- 抽卡机本体可作为原子 media，但单抽/十连按钮由组件覆盖或重建为真实按钮。
- 钱包、引导、概率、保底、规则、最近掉落全部用真实文本和组件。
- 奖品 icon 和机器装饰可使用透明素材。

### Backpack

当前背包侧栏、库存和详情是 panel 图片，部分库存格已经组件化。后续应把背包作为“真实网格组件”的重点样板。

要求：

- 侧栏分类、容量、今日效果用真实组件。
- 库存 16 个 item slot 和 4 个 locked slot 保持真实 grid。
- item image、rarity、quantity、selected state 都由 mock data 驱动。
- 详情面板渲染道具名、稀有度、持有数、描述、规则和操作按钮。
- Shop CTA 继续跳转 `/ui-lab/supply-dashboard/shop`。

## Data Contracts

每页继续使用 `mock-data.ts` 和 `types.ts`。实施时要逐步移除 `panelImage` / `panelImages` 字段，替换为结构化字段：

- `sections`
- `resources`
- `items`
- `filters`
- `actions`
- `status`
- `progress`
- `media`

字段命名应描述业务含义，不描述截图用途。测试应断言 mock data 覆盖真实 UI 状态，而不是断言存在某个 panel crop。

## Testing Strategy

实施完成后至少运行：

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
npm run lint
npm run build
```

测试更新方向：

- Route tests：确认 6 个 route 隔离存在，正式 `SupplyStation` 不受影响。
- Topbar tests：确认排行榜 tab 被移除，页面间链接完整。
- Scene tests：确认核心 UI 由真实元素渲染，不依赖 panel crop。
- Mock data tests：确认结构化字段覆盖状态、进度、筛选、按钮和详情。
- Asset tests：确认只依赖原子 media，且文件在预算内。
- CSS tests：确认 shared primitives、responsive、focus-visible、reduced-motion 和页面舞台约束存在。

视觉 QA：

- 启动 UI Lab dev server。
- 对 1536x1024 桌面视口逐页截图，与原型图检查布局比例。
- 对移动宽度检查可读性、滚动边界和无重叠。
- 对页面跳转检查 Dashboard → 二级页 → 返回大厅路径。

## Completion Criteria

完成本轮时应满足：

- 顶部 tab 不再出现排行榜。
- 6 个 UI Lab 页面可打开、可互跳、可返回 Dashboard。
- 页面 UI 面板不再依赖原型 panel 裁图作为主要视觉结构。
- 必要图片均为 atomic media，路径命名清晰，体积受控。
- CSS 中 Supply UI Lab 相关规则被收拢，旧版重复规则不再干扰。
- Focus、reduced motion、移动端布局和中文文本溢出都有测试或浏览器检查覆盖。
- Focused tests、lint、build 通过。
- 提交按页面族或清理阶段分组，避免把所有历史 dirty 变化盲目打成一个提交。
