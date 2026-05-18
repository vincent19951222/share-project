# Supply UI Lab Static Business Closure Design

> 第二阶段查漏补缺 spec：限定在牛马补给站 UI Lab 静态 mock 页面族内完成业务口径、mock state、按钮可点击和组件边界闭环。真实 API、Prisma、生产补给站替换和真实 mutation 全部留到第三阶段。

## Related Documents

- UI Lab 总规划：`docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard 静态页：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- 团队目标静态页：`docs/superpowers/specs/2026-05-13-supply-dashboard-team-goal-static-scene-design.md`
- 补给商店静态页：`docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- 任务记录静态页：`docs/superpowers/specs/2026-05-13-supply-dashboard-task-record-static-scene-design.md`
- 抽卡池静态页：`docs/superpowers/specs/2026-05-13-supply-dashboard-draw-pool-static-scene-design.md`
- 背包静态页：`docs/superpowers/specs/2026-05-13-supply-dashboard-backpack-static-scene-design.md`
- 组件化静态页面族：`docs/superpowers/specs/2026-05-17-supply-ui-lab-componentized-static-pages-design.md`
- 当前奖池与道具配置：`content/gamification/reward-pool.ts`、`content/gamification/item-definitions.ts`
- 概率说明口径：`lib/gamification/probability-disclosure.ts`

## Context

当前 UI Lab 已完成 6 个隔离静态 route：

- `/ui-lab/supply-dashboard`
- `/ui-lab/supply-dashboard/team-goal`
- `/ui-lab/supply-dashboard/shop`
- `/ui-lab/supply-dashboard/task-record`
- `/ui-lab/supply-dashboard/draw-pool`
- `/ui-lab/supply-dashboard/backpack`

第一阶段已经解决“页面族是否能复刻出来”和“是否能从裁图面板转向 TSX/CSS 组件”的问题。第二阶段要解决的是：在不接真实业务的前提下，让这些页面的 mock 数据、术语、道具、奖池、按钮、筛选、日期、详情切换和页面互跳变得自洽。

本阶段完成后，UI Lab 应该像一套可试玩的静态产品原型：所有主要按钮都有本地反馈或明确跳转，所有展示数据能追溯到同一份 mock catalog，所有页面使用同一套业务词汇。第三阶段才能把这些 mock contract 映射到真实 `SupplyStation`、API Routes、Prisma 和登录用户状态。

## Goals

1. 统一 6 个 UI Lab 页面里的业务术语、资源栏、等级、今日效果、奖池、商店商品和背包道具。
2. 建立一份 UI Lab 专用 mock catalog，让商店、背包、抽卡池、Dashboard 预览和任务记录共用同一批道具定义。
3. 保证所有主流程按钮可点击：页面跳转、本地 tab/filter/selection/date 状态、禁用态、说明弹层或静态结果反馈都必须成立。
4. 删除第二阶段不做的入口：帮助中心、意见反馈、设置、背包扩容、排行榜。
5. 把静态页面组件边界整理到后续能接真实业务的形状，避免页面各自维护冲突的 mock 数据。
6. 保留 UI Lab 隔离性，不影响生产 `components/gamification/SupplyStation.tsx`。

## Non-Goals

- 不接入 Prisma、API Routes、真实登录用户、真实库存、真实抽奖、真实兑换或真实任务记录。
- 不替换生产补给站，不新增生产导航入口。
- 不实现排行榜 route。
- 不做真实经济结算、库存扣减、管理员确认、企业微信发送或团队动态写入。
- 不新增后台配置能力。
- 不把长期累计保底、背包扩容、体力系统作为本阶段玩法。

## Phase Boundary

第二阶段只允许修改 UI Lab route、UI Lab 组件、UI Lab mock data、UI Lab 测试、UI Lab 专用素材和必要的共享 CSS。

允许的本地交互：

- 点击 tab/filter/date/product/item 后切换当前静态视图。
- 点击抽卡按钮后展示预置结果并更新页面内临时券余额。
- 点击兑换、使用、领取、回应、忽略后切换为 mock 状态。
- 点击说明按钮后展开本页内说明区域或 mock modal。
- 点击页面入口后跳转到另一个 UI Lab route。

禁止的行为：

- 写数据库。
- 调用真实 API。
- 读取真实 session。
- 修改生产补给站行为。
- 用 `href="#"` 伪装主流程按钮。

## Global Terminology

### 银子

`银子` 是静态原型中的个人可消费货币。UI Lab 只展示余额、价格和 mock 状态，不做真实扣减持久化。

### 抽奖券

统一使用 `抽奖券` 表示抽卡机消耗的券。第二阶段删除 `补给券`、`生命票` 这两个混用名称。

规则：

- 顶部资源栏显示 `抽奖券`。
- 抽卡池钱包显示 `抽奖券`。
- 商店可出售 `抽奖券` 相关道具时仍使用具体道具名，不把 `任务换班券` 图标误标成抽奖券。
- 任务奖励如果发券，文案写 `抽奖券 x1`。

### 背包

背包容量第二阶段固定为 `18/60` 或当前 mock 占用数 `/60`。不展示扩容按钮，不展示锁定格，不设计付费扩容。

桌面端可分页展示背包格子。推荐 mock 为 60 个 slot、每页 20 个 slot、3 页；未占用 slot 显示为空格。

### 牛马等级

`牛马等级` 是 UI Lab 静态成长展示，不参与真实经济结算。

等级公式用于 mock 数据：

```text
level = floor(totalExp / 1000) + 1
currentLevelExp = totalExp % 1000
nextLevelExp = 1000
```

Dashboard 只展示 `Lv.{level}`、`currentLevelExp / nextLevelExp` 和“距离升级还差”。任务完成、连续打卡和赛季奖励可以在静态文案里发放 EXP，但本阶段不保存真实 EXP。

### 今日效果

`今日效果` 只展示来源清晰的当日生效道具。第二阶段删除没有业务来源的体力上限、体力恢复、步数加成泛化 buff。

允许展示的今日效果来自这些道具类型：

- `small_boost_coupon`：今日真实健身打卡个人资产 1.5x。
- `double_niuma_coupon`：今日真实健身打卡个人资产和赛季贡献 2x。
- `season_sprint_coupon`：今日真实健身打卡赛季贡献 2x。
- `coin_rich_coupon`：今日真实健身打卡个人资产 2x。
- `hydration_bonus`：今日完成喝水任务后额外获得银子。
- `movement_bonus`：今日完成运动任务后额外获得银子。

显示规则：

- Dashboard 和背包使用同一份 `activeEffects` mock。
- 每条效果必须显示来源道具、效果摘要、状态和当天结束时间。
- 状态只允许 `今日待生效`、`今日已生效`、`已过期` 三类静态 mock。
- 到期时间统一显示到 Asia/Shanghai 当天 `23:59`。
- 如果 mock 没有 active effect，则显示空状态：`今天还没有生效道具`。

## Unified Mock Catalog

第二阶段新增 UI Lab 专用 mock catalog。建议位置：

```text
components/gamification/ui-lab/supply-data/catalog.ts
components/gamification/ui-lab/supply-data/types.ts
```

Catalog 不直接 import 真实业务服务，但命名、id 和效果摘要要对齐 `content/gamification/item-definitions.ts` 与 `content/gamification/reward-pool.ts`。

### Catalog Item Shape

每个可见商品、背包道具或抽卡奖品使用同一类字段：

```typescript
type SupplyUiLabCatalogItem = {
  id: string;
  sourceItemId: string;
  name: string;
  category: "boost" | "protection" | "social" | "task" | "real_world" | "lottery";
  rarity: "N" | "R" | "SR" | "SSR";
  description: string;
  effectSummary: string;
  useTiming: "today" | "instant" | "manual_redemption";
  obtainSources: Array<"draw_pool" | "shop" | "task_reward" | "season_reward">;
  shop: {
    buyable: boolean;
    priceCoins: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    requiresAdminConfirmation: boolean;
  };
  drawPool: {
    drawable: boolean;
    rewardId?: string;
    tier?: "utility" | "social" | "rare";
    probabilityLabel?: string;
  };
  inventory: {
    quantity: number;
    selected?: boolean;
  };
  media: {
    image: string;
    assetStatus: "existing" | "needs_generated";
  };
};
```

### Catalog Content

All active non-coin draw rewards must appear in the shop and backpack catalog.

Canonical visible items:

- `task_reroll_coupon` / 任务换班券
- `small_boost_coupon` / 小暴击券
- `fitness_leave_coupon` / 健身请假券
- `drink_water_ping` / 点名喝水令
- `walk_ping` / 出门溜达令
- `team_standup_ping` / 全员起立令
- `chat_ping` / 今日闲聊令
- `share_info_ping` / 红盘情报令
- `team_broadcast_coupon` / 团队小喇叭
- `double_niuma_coupon` / 双倍牛马券
- `season_sprint_coupon` / 赛季冲刺券
- `luckin_coffee_coupon` / 瑞幸咖啡券

Coin rewards stay in the draw pool preview and recent drops, but they are not shop products and do not occupy backpack item slots.

Configured but not active draw rewards can appear only in a hidden `futureItems` fixture or a non-clickable design appendix, not in the main shop grid.

### Asset Rules

Every visible catalog item needs atomic media.

Existing assets can be reused for:

- 银子 icon
- 任务换班券
- 小暴击券
- 团队小喇叭
- 瑞幸咖啡券

Missing assets should be generated as transparent item icons, not cropped panel screenshots. Asset names should use source item ids, for example:

```text
public/assets/home-scenes/supply/items/fitness-leave-coupon.webp
public/assets/home-scenes/supply/items/drink-water-ping.webp
public/assets/home-scenes/supply/items/double-niuma-coupon.webp
```

## Draw Pool Rules

第二阶段抽卡页面展示规则必须对齐当前真实抽奖口径：

- active reward total weight is `100`。
- tier weights are `coin 45 / utility 27 / social 24 / rare 4`。
- 单抽无保底。
- 十连有批次保底：如果十连结果里没有 `utility`、`social` 或 `rare`，则替换一个最低银子奖为 `utility` 奖励。
- 不展示跨多次抽奖累计的长期保底进度。
- 如果原型位置需要保底面板，改成 `十连保底说明`，显示“本次十连至少 1 个实用、社交或稀有奖励”。
- 奖池预览从 unified catalog 和 coin rewards 生成，不手写另一套奖品。
- 概率说明页内展示 tier 概率、代表奖励、银子期望和 disabled reward 说明。

Draw buttons use local mock state:

- `单抽` 消耗页面内 `1` 张抽奖券，展示预置单抽结果。
- `十连` 消耗页面内 `10` 张抽奖券，展示预置十连结果，并标记是否触发批次保底。
- 券不足时按钮 disabled，并显示 `抽奖券不足`。
- `获取更多抽奖券` 跳到任务记录或 Dashboard 今日主线区域，不触发真实购买。

## Shop Rules

补给商店第二阶段只展示 unified catalog 中 `shop.buyable = true` 的道具。

规则：

- 所有 active non-coin draw rewards 都可以买到。
- 真实福利类商品显示 `需要管理员确认`，点击兑换后进入本地 mock 的 `兑换中` 状态。
- 稀有道具可以买，但必须有高价格和每日或每周限购，避免静态口径看起来像无限套利。
- 商品详情必须显示：来源、效果、使用时机、限制、价格、库存或限购、按钮状态。
- 分类、筛选、排序、商品选中都使用本地 state。
- `了解更多规则` 不使用 `href="#rules"`，改为本页内可展开规则面板或跳转 UI Lab 抽卡规则区。

## Backpack Rules

背包第二阶段展示用户当前 mock 库存，不做扩容。

规则：

- 顶部资源为 `银子 / 抽奖券 / 背包 18/60`。
- 左侧删除扩容入口。
- 库存 grid 使用 60 slot mock，当前页展示 20 slot。
- 空 slot 是普通空格，不是锁定格。
- 分类、排序、分页、选中 item 使用本地 state。
- 道具详情来自 unified catalog。
- `今日使用` 对 today/instant 道具切换本地状态；不扣真实库存。
- `申请兑换` 仅真实福利道具可用，点击后把本地状态切成 `兑换中`。
- `去商店` 跳转 `/ui-lab/supply-dashboard/shop`。
- 底部帮助中心入口删除，保留简短提示文本即可。

## Task Record Rules

任务记录第二阶段使用单 route + 本地状态机，不新增多个二级 route。

Left sidebar modes:

- `today`：今日记录总览，展示时间线，并在右侧预览队友雷达和兑换状态。
- `draws`：抽卡记录全量视图，中心区域展示单抽/十连历史、奖励明细和保底触发标记。
- `redemptions`：兑换记录全量视图，中心区域展示 `兑换中 / 已完成 / 已失效`。
- `radar`：队友雷达全量视图，中心区域展示 `待响应 / 已回应 / 已过期`。
- `rules`：静态规则说明，覆盖任务记录、抽卡记录、弱社交响应和真实福利兑换状态。

Date filters:

- 提供最近 7 天 mock 日期。
- 默认选中今天。
- 选择日期后切换对应 mock records。
- 下一天按钮在今天 disabled。
- 空日期显示空状态，不显示假数据。

Record vocabulary:

- 四维任务奖励统一写 `抽奖券 x1` 或具体道具，不再写 `生命票`。
- 抽卡记录里的奖励名称来自 unified catalog 或 coin reward。
- 弱社交记录使用 `待响应 / 已回应 / 已过期`。
- 兑换记录使用 `兑换中 / 已完成 / 已失效`。

## Dashboard Rules

Dashboard 第二阶段作为页面族入口，需要做这些口径调整：

- 顶部资源栏改为 `银子 / 抽奖券 / 背包`。
- 删除 `体力` 资源。
- 删除帮助中心、意见反馈、设置入口。
- 角色状态展示 `称号 / 牛马等级 / 今日效果 / 连续打卡`。
- 牛马等级使用全局等级公式。
- 今日效果使用 shared `activeEffects`。
- 今日主线任务奖励统一为 `EXP / 银子 / 抽奖券`，不再出现 `补给券` 或 `生命票`。
- 任务换班按钮点击后在同维度 mock 任务里循环切换，并显示本地反馈。
- 领取按钮点击后切换为 `已领取` disabled 状态。
- 快捷入口只保留：首页、背包、抽卡机、任务记录。

## Team Goal Rules

团队目标第二阶段补齐赛季奖励和团队任务口径。

Season completion reward:

- 达成赛季目标后，每名成员 mock 获得 `银子 x100`、`抽奖券 x3`。
- 团队获得 `团队称号 30天`。
- 周报获得 `赛季达成高光` 展示素材。
- Dashboard 和任务记录只展示结果，不做真实发放。

Milestone rewards:

- 20%：团队公告高光。
- 40%：每人 `抽奖券 x1`。
- 65%：解锁团队称号预览。
- 85%：每人 `银子 x50`。
- 100%：触发赛季完成奖励。

Today team tasks:

- 全队运动打卡：统计今日有效健身打卡人数。
- 四维任务完成：统计今日四维任务完成份数。
- 社交互动响应：统计今日弱社交已回应次数。
- 抽奖活跃使用：统计今日全队抽卡次数。

UI behavior:

- 删除帮助中心、意见反馈、设置入口。
- `领取奖励`、`查看成员`、`展开里程碑` 等按钮使用本地 state 或静态展开，不触发真实业务。
- 赛季奖励卡必须说明奖励来源和达成条件。

## Interaction And Component Architecture

第二阶段建议把 6 页的交互状态限制在 UI Lab client components 内。不要把静态 state 混入生产 store。

Recommended shared units:

```text
components/gamification/ui-lab/supply-data/
  catalog.ts
  effects.ts
  records.ts
  resources.ts
  types.ts

components/gamification/ui-lab/supply-dashboard/
  SupplyUiLabTopBar.tsx
  SupplyUiLabPrimitives.tsx
  shared navigation/resource/panel/button/filter/progress pieces
```

Rules:

- Shared components should describe business semantics, not screenshot layer names.
- Page-specific layout stays under `components/gamification/ui-lab/supply-<page>/`.
- Main process controls use real `button` or `Link`.
- No visible main process control uses `href="#"`.
- Disabled buttons include disabled state and explanatory text.
- Tests assert behavior and data contract, not just text presence.

## Page Acceptance Checklist

### Dashboard

- Top bar shows `银子 / 抽奖券 / 背包`.
- No `体力`, `补给券`, `生命票`, `帮助中心`, `意见反馈`, or `设置`.
- Level and today's effects use the global mock rules.
- Quest reroll and reward claim have local feedback.
- Shortcut cards route to UI Lab pages.

### Team Goal

- Season completion reward and milestone rewards are visible.
- Today team tasks have clear metric sources.
- Auxiliary help/feedback/settings links are gone.
- Reward buttons use local mock state.

### Shop

- Product grid comes from unified catalog.
- Every active drawable non-coin item is buyable.
- Every visible item has atomic media or a tracked generated asset.
- Category/filter/sort/selection/redeem interactions work locally.
- Product detail explains source, effect, timing, limit and price.

### Task Record

- Left sidebar modes switch full content, not just preview labels.
- Date filter supports recent 7 days and disabled future navigation.
- Timeline, draw history, radar and redemption records use unified vocabulary.
- No `生命票` remains.

### Backpack

- Capacity is fixed at 60.
- No expansion, locked slot, or help center entry.
- Inventory, selected detail and today effects come from shared mock data.
- Use/redeem/shop actions have local feedback or route.

### Draw Pool

- Ticket naming is `抽奖券`.
- Pool preview and recent drops use unified catalog.
- Single draw and ten draw have local result feedback.
- Ten draw guarantee is described as batch guarantee.
- No long-term pity progress is shown.
- Rules and probability content are visible from the page.

## Testing Strategy

Focused tests should cover:

- Route isolation for all 6 UI Lab pages.
- No production `SupplyStation` imports UI Lab scenes.
- Banned terms absent from UI Lab rendered output: `补给券`, `生命票`, `体力`, `扩容背包`, `帮助中心`, `意见反馈`, `设置`.
- Shared catalog contains every active non-coin draw reward.
- Shop products are generated from catalog buyable items.
- Backpack inventory references catalog ids and capacity is 60.
- Draw pool probabilities match `coin45_utility27_social24_rare4`.
- Draw pool explains single draw no guarantee and ten draw batch guarantee.
- Dashboard and Backpack share identical active effects fixture.
- Task record mode/date/filter state changes visible content.
- Buttons that are not real links use local state or disabled explanation.
- CSS keeps responsive, focus-visible and reduced-motion rules.

Verification commands after implementation:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-team-goal-ui-lab-route.test.ts __tests__/supply-team-goal-mock-data.test.ts __tests__/supply-team-goal-assets.test.ts __tests__/supply-team-goal-scene.test.tsx __tests__/supply-team-goal-scene-css.test.ts __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-backpack-ui-lab-route.test.ts __tests__/supply-backpack-mock-data.test.ts __tests__/supply-backpack-assets.test.ts __tests__/supply-backpack-scene.test.tsx __tests__/supply-backpack-scene-css.test.ts __tests__/supply-ui-lab-primitives.test.tsx
npm run lint
npm run build
```

Browser QA:

- Open each route at `1536 x 1024`.
- Open each route at mobile width around `390 x 844`.
- Click every visible main-process button once.
- Verify no text overlap, no horizontal overflow, no dead main navigation links, and no console errors.

## Completion Criteria

Phase 2 is complete when:

1. Six UI Lab pages are still isolated and routable.
2. Terminology is consistent: `银子 / 抽奖券 / 背包 / 今日效果 / 牛马等级`.
3. Removed concepts are gone from UI Lab UI: `体力`, `补给券`, `生命票`, help/feedback/settings, backpack expansion, long-term pity.
4. Unified catalog powers shop, backpack, draw pool preview, draw results and related records.
5. Every active drawable non-coin reward can be bought in the shop mock.
6. Every visible item has an atomic media asset or an explicit generated asset committed under `public/assets/home-scenes/supply/items/`.
7. All primary buttons either route, update local mock state, open local explanation, or show a disabled reason.
8. Focused tests, lint, build and browser QA pass.
9. No production business code behavior changes.

## Phase 3 Handoff

After Phase 2, the next spec should cover real business integration:

- map unified UI Lab catalog to real item and reward definitions;
- connect draw pool to real lottery API;
- connect backpack to real inventory and item-use APIs;
- connect shop to real purchase and redemption flow;
- connect task record to real records, social invitations and redemption status;
- decide whether UI Lab routes graduate into production routes or replace the current `SupplyStation` surface.

Those items are deliberately outside this second-stage spec.
