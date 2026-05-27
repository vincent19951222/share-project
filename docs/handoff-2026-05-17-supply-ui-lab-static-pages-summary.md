# Handoff: Supply UI Lab Static Pages Summary

## Focus

总结 `codex/ui-lab-supply-dashboard` 分支近期做的牛马补给站 UI Lab 测试：复刻了哪些静态页面、用什么方法还原原型图、当前还原结果如何，以及下个会话继续处理时需要注意什么。

## Current State

Project root: `/Users/vincent/Projects/share-project`

Current branch: `codex/ui-lab-supply-dashboard`

当前工作树是 dirty 状态，且很多 UI Lab 文件尚未提交。不要把这些未提交内容当作可随意丢弃的临时文件，也不要回滚 unrelated changes。

当前已落地 6 个隔离静态页面：

| 页面 | 原型图 | UI Lab route | 主要实现 |
| --- | --- | --- | --- |
| 补给站 Dashboard 首页 | `design/ui-assets/dashboard-new.png` | `/ui-lab/supply-dashboard` | `app/ui-lab/supply-dashboard/page.tsx`, `components/gamification/ui-lab/supply-dashboard/` |
| 团队目标 | `design/ui-assets/团队目标.png` | `/ui-lab/supply-dashboard/team-goal` | `app/ui-lab/supply-dashboard/team-goal/page.tsx`, `components/gamification/ui-lab/supply-team-goal/` |
| 补给商店 | `design/ui-assets/补给商店.png` | `/ui-lab/supply-dashboard/shop` | `app/ui-lab/supply-dashboard/shop/page.tsx`, `components/gamification/ui-lab/supply-shop/` |
| 任务记录 | `design/ui-assets/任务记录.png` | `/ui-lab/supply-dashboard/task-record` | `app/ui-lab/supply-dashboard/task-record/page.tsx`, `components/gamification/ui-lab/supply-task-record/` |
| 抽卡池 | `design/ui-assets/抽卡池.png` | `/ui-lab/supply-dashboard/draw-pool` | `app/ui-lab/supply-dashboard/draw-pool/page.tsx`, `components/gamification/ui-lab/supply-draw-pool/` |
| 背包 | `design/ui-assets/背包.png` | `/ui-lab/supply-dashboard/backpack` | `app/ui-lab/supply-dashboard/backpack/page.tsx`, `components/gamification/ui-lab/supply-backpack/` |

排行榜还没有独立 route。共享顶栏里有「排行榜」tab，但 href 仍是 `#`。

## How The Restoration Was Done

这条分支采用的是 UI Lab 路线，不直接替换正式补给站：

1. 先按 `design/ui-assets/*.png` 写页面级 spec 和 plan。
2. 每个原型图单独开 `/ui-lab/supply-dashboard/*` 静态 route。
3. 页面数据集中在对应 `mock-data.ts`，类型在 `types.ts`，避免把展示常量散落在 JSX。
4. 最终图片资产放在 `public/assets/home-scenes/supply/<page>/`。
5. 页面只验证信息架构和视觉方向，不接 Prisma、API routes、auth、真实抽卡/兑换/背包/任务状态。
6. 每页配套 route、mock data、asset、scene、CSS contract 测试。

还原方式分成两类：

- Dashboard 首页：主要用语义 TSX + CSS 复刻布局，配合新生成/复用的局部图片资产，例如 `dashboard-gym-bg.webp`, `niuma-hero.webp`, dock 入口图，以及已有任务卡 raw 图。它不是整张截图贴底图。
- 二级页：大量采用「原型裁图 panel + 透明热点 + sr-only 语义内容」的方式。视觉上尽量保留原型图像素质感，交互层只覆盖 button/link 热区，辅助技术仍能读到内容。

关键共享组件：

- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
  - Dashboard, 团队目标, 补给商店, 任务记录共用 tab 顶栏。
  - 背包使用同一个组件的 `variant="breadcrumb"` 面包屑顶栏。
  - 当前 tab 状态由 `activeLabel` 控制。

关键资产策略：

- `public/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png` 用作 UI Lab 顶栏 logo。
- 抽卡池从 `抽卡池.png` 裁出 topbar、wallet、machine、rates、probability、pity、rules、recent 等 panel，再用透明热点覆盖按钮。
- 补给商店从 `补给商店.png` 裁出 sidebar、catalog、detail panel，并补充商品 icon。
- 任务记录从 `任务记录.png` 裁出 sidebar、timeline、radar、redemptions panel。
- 背包从 `背包.png` 裁出 sidebar、inventory、detail panel，并补充背包道具 icon。
- 团队目标从 `团队目标.png` 裁出 raid、road、tasks、rewards、announcement panel，同时保留团队/赛季/任务/奖励 mock data。

## Restoration Results

整体结果：6 个静态页面都能以隔离 UI Lab route 渲染，主要目标是「把图片原型复刻成可打开、可测试、可继续调像素的 Next.js 页面族」。目前不属于生产可用业务页面。

页面级结果：

- Dashboard 首页：已验证新补给站首页的信息架构，包括角色状态、角色舞台、今日主线、快捷入口和公告栏。后续二级页入口已指向背包、抽卡池、任务记录等 UI Lab routes。
- 团队目标：已形成高保真 panel-layer 页面，团队副本、里程碑、团队任务、奖励预览、公告区域都有静态数据和可访问摘要。
- 补给商店：已形成三栏静态页面，左侧分类/资源、中间商品网格、右侧详情均使用原型 panel，还统一到共享顶栏。
- 任务记录：已形成三栏静态页面，记录侧栏、时间线、队友雷达、兑换状态均使用原型 panel，还统一到共享顶栏。
- 抽卡池：还原度最高的一页之一，中央抽卡机、钱包、概率/规则/最近掉落等重点区域改用原型裁图，按钮用透明热点保留语义。
- 背包：已形成背包专用三栏页面，使用面包屑顶栏、分类/今日效果、库存格、详情和底部提示栏。

视觉/交互取舍：

- 原型复杂像素面板优先用裁图还原，避免 CSS 重画导致质感偏差。
- 可交互位置多为透明 button/link 热点，当前只表达视觉和语义，不做真实业务动作。
- `sr-only` 内容补足图片面板里的标题、列表、数值、按钮和状态，避免页面变成不可读的纯图片。
- 响应式主要靠固定舞台比例、viewport 宽度约束和移动端 CSS contract。部分页面仍应继续做实际浏览器截图 review。

## Verification

本次整理时已重新跑过：

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts
npm run lint
```

Observed results:

- Supply UI Lab focused tests: 30 files passed, 74 tests passed.
- `npm run lint`: passed, `tsc --noEmit` clean.
- Both commands ran Prisma generate first and completed successfully.

Existing historical visual QA evidence in the workspace:

- `tmp/visual-qa/supply-shop-desktop.png`
- `tmp/visual-qa/supply-shop-mobile.png`
- `tmp/visual-qa/team-goal-chrome-1536x1024.png`
- `tmp/visual-qa/dashboard-crops-v2/*.webp`
- `tmp/visual-qa/draw-pool-*.png`

Existing handoffs also record prior browser checks:

- `docs/superpowers/session-handoffs/2026-05-14-supply-draw-pool-ui-lab-final-handoff.md`
- `docs/handoff-2026-05-16-supply-shop-task-record-shared-topbar.md`
- `docs/handoff-AlQIAG.md`

Not refreshed in this handoff turn:

- Full `npm test`.
- `npm run build`.
- New browser screenshot comparison for all 6 pages.

## Decisions And Constraints

- Keep all work under `/ui-lab/supply-dashboard/*` until the visual direction is accepted.
- Do not modify production `components/gamification/SupplyStation.tsx` for these static prototypes.
- Do not wire these pages to real gamification APIs, Prisma models, auth state, inventory, lottery, redemption, or social-invitation actions.
- Do not use a full-page screenshot as the only UI. Cropped panel images are acceptable when paired with semantic hotspots and mock data.
- Maintain Chinese UI copy and the pixel/brutalist yellow-black visual language.
- Worktree is intentionally dirty. Separate page families carefully before staging or committing.

## Suggested Skills

- `handoff` for future continuation notes.
- `frontend-design` or `polish` for visual refinement sessions.
- `browser:browser` for local visual QA.
- `verification-before-completion` before claiming another page or cleanup pass is complete.

## Next Steps

1. Open all 6 routes in the browser and do a fresh visual pass against `design/ui-assets/*.png`, especially mobile and wide desktop.
2. Decide whether to keep the panel-image approach for all second-level pages, or refactor some panels back into reusable TSX/CSS components.
3. Decide what to do with Dashboard panel crop assets currently present under `public/assets/home-scenes/supply/dashboard/`; the current Dashboard component still mainly uses semantic TSX/CSS rather than those panel crops.
4. Implement or explicitly defer the missing Ranking UI Lab page.
5. Clean and stage by page family: dashboard/team-goal/shop/task-record/draw-pool/backpack, not as one blind bulk commit.
6. Before merging or PR, run focused tests, `npm run lint`, `npm run build`, and ideally full `npm test`.
