# GM-20 Lottery Reward Media Assets Design

> 为 GM-16 active 抽奖奖池补齐第一版媒体元素：用 image generation skill 生成透明背景像素图标，卡片外框由前端组件统一渲染。

## 背景

GM-16 已经把 live draw pool 收口成 `18` 个 active reward。当前奖励可以抽、可以入库或结算，但缺少统一的视觉资产。前面试过完整卡片图后，结论是：完整卡片不适合直接作为背包或抽奖 UI 资产，因为稀有度、数量、名称、选中态和禁用态都需要动态渲染。

GM-20 只做抽奖奖励的媒体资产规范和接入设计：

- 中间物品图标由 image generation skill 生成。
- 图标必须是透明背景的像素风 PNG。
- 背包格子、抽奖结果卡、边框、稀有度、数量和文字都由前端组件绘制。
- 第一张样板图标是 `task_reroll_coupon`，验证规格后再批量扩展到全部 `18` 个 active reward。

## 上游参考

- `docs/superpowers/specs/2026-05-02-gm-16-card-pool-tuning-design.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `content/gamification/reward-pool.ts`
- `content/gamification/item-definitions.ts`
- 用户提供的背包原型图：像素风 1:1 背包格子，左上角稀有度，彩色边框，中心像素图标，右下角数量，底部名称条。

## 产品目标

1. 为 GM-16 active pool 的 `18` 个 reward 建立完整媒体资产清单。
2. 用透明图标替代完整卡面图片，让同一套资产能复用在背包、抽奖结果、奖励详情和概率说明中。
3. 通过前端组件统一绘制 1:1 tile 外框，保证不同奖励层级视觉一致。
4. 第一批只生产并接入 `task_reroll_coupon` 的透明像素图标，作为后续资产生产基准。
5. 记录 image generation prompt、源图、透明处理和人工验收规则，避免后续批量生成风格漂移。

## 非目标

- 不修改 GM-16 奖池权重、抽奖算法或奖励结算逻辑。
- 不新增道具效果或未入池 reward。
- 不把稀有度、数量、名称条烘焙进图标 PNG。
- 不用完整卡片截图替代组件。
- 不要求第一期一次性生成所有 `18` 个最终图标；第一期先跑通样板和规范。
- 不实现后台资产管理系统。
- 不做动态 Spine、Lottie、视频或 3D 模型资产。

## 核心设计决策

### 1. 图标和卡片框分离

每个 reward 只需要一张透明背景图标。UI 层根据 reward metadata 绘制：

- 1:1 背包 tile 外框。
- 左上角稀有度：`N` / `R` / `SR` / `SSR`。
- 边框颜色：普通白、实用蓝、弱社交紫、稀有金。
- 右下角数量。
- 底部名称条。
- 选中态、hover 态、禁用态、锁定态。

这样做的好处是：图标可以复用，文字保持清晰，运行时状态不会被图片限制。

### 2. 图标必须透明背景

image generation 的中间稿可以使用纯色 chroma key 背景，但最终提交到项目里的资产必须是带 alpha 的 PNG。

最终图标不得包含：

- 白底或绿色底。
- 外部投影。
- 稀有度文字。
- 数量。
- 道具名称。
- 卡片边框。

图标内部可以保留 1-2px 像素暗边，让它在浅色 tile 上可读。

### 3. Tile 由代码统一绘制

抽奖结果页和背包页共用同一套视觉骨架。抽奖结果可以放大 tile，但不改变结构。

推荐组件边界：

```text
RewardTile
- rewardTier
- rarity
- name
- iconSrc
- quantity
- selected
- disabled
- size: "inventory" | "draw-result" | "detail"
```

组件负责画框，图标只负责表达物品。

## 资产规格

### 图标源文件

| 字段 | 规格 |
| --- | --- |
| 文件格式 | PNG with alpha |
| 画布比例 | 1:1 |
| 推荐尺寸 | `512x512` |
| 最小可用尺寸 | `256x256` |
| 背景 | 完全透明 |
| 主体占比 | 画布宽度 `58% - 70%` |
| 风格 | 像素风 / web game inventory icon |
| 边缘 | 清晰硬边，允许少量像素暗边 |
| 外部阴影 | 不放在图标里 |
| 文本 | 图标内不放文本 |

### 项目路径

建议保存到：

```text
public/gamification/rewards/icons/
```

命名规则：

```text
<assetId>.png
```

其中 `assetId` 优先使用 `itemId`。银子 reward 没有 itemId，使用 reward id。

示例：

```text
public/gamification/rewards/icons/task_reroll_coupon.png
public/gamification/rewards/icons/coins_005.png
```

### 生成中间稿

image generation built-in tool 默认输出保留在 Codex 生成目录。项目最终只引用复制后的 workspace 资产，不引用 Codex 默认生成路径。

透明图标生成建议流程：

1. 用 imagegen 生成像素图标，背景使用纯色 chroma key。
2. 把选中的源图复制到 workspace 的临时目录。
3. 用 imagegen skill 的 `remove_chroma_key.py` 生成透明 PNG。
4. 验证四角透明、主体完整、没有明显绿色边。
5. 把最终 PNG 放入 `public/gamification/rewards/icons/`。
6. 记录 prompt 和源图路径到资产 manifest。

## 第一批样板资产

第一批只做 `task_reroll_coupon`。

| rewardId | itemId | 名称 | tier | rarity | 边框色 | 图标目标 |
| --- | --- | --- | --- | --- | --- | --- |
| `reward_task_reroll` | `task_reroll_coupon` | 任务换班券 | `utility` | `R` | 蓝色 | 蓝色换班券 / reroll 箭头 / 小任务清单 |

验收标准：

- 图标为透明 PNG。
- 缩小到背包格子尺寸时仍能看出是“任务换班券”。
- 没有内嵌文字、数量、稀有度或边框。
- 放进蓝色 utility tile 后风格接近用户提供的背包原型。
- 抽奖结果页放大展示时不显得空。

## GM-16 全量资产清单

### 普通银子 `coin`

| rewardId | assetId | 名称 | 图标方向 |
| --- | --- | --- | --- |
| `coins_005` | `coins_005` | 摸鱼津贴 | 小金币一枚或少量金币 |
| `coins_010` | `coins_010` | 工位补贴 | 两三枚金币 |
| `coins_020` | `coins_020` | 今日没白来 | 小金币堆 |
| `coins_040` | `coins_040` | 老板没发现 | 中等金币堆 |
| `coins_080` | `coins_080` | 小发一笔 | 金币袋或更高金币堆 |
| `coins_120` | `coins_120` | 牛马暴富 | 大金币袋，不使用稀有金边 |

### 实用道具 `utility`

| rewardId | assetId | 名称 | 图标方向 |
| --- | --- | --- | --- |
| `reward_task_reroll` | `task_reroll_coupon` | 任务换班券 | 蓝色换班券，reroll 箭头 |
| `reward_small_boost` | `small_boost_coupon` | 小暴击券 | 绿色或黄色 boost 药剂 |
| `reward_fitness_leave` | `fitness_leave_coupon` | 健身请假券 | 请假纸条或保护盾 |

### 弱社交 `social`

| rewardId | assetId | 名称 | 图标方向 |
| --- | --- | --- | --- |
| `reward_drink_water_ping` | `drink_water_ping` | 点名喝水令 | 水瓶 / 提醒气泡 |
| `reward_walk_ping` | `walk_ping` | 出门溜达令 | 小鞋 / 脚步 |
| `reward_team_standup_ping` | `team_standup_ping` | 全员起立令 | 多人提示 / 站立符号 |
| `reward_chat_ping` | `chat_ping` | 今日闲聊令 | 双气泡 |
| `reward_share_info_ping` | `share_info_ping` | 红盘情报令 | 红色情报卡 / 资讯纸条 |
| `reward_team_broadcast` | `team_broadcast_coupon` | 团队小喇叭 | 小喇叭 |

### 稀有 `rare`

| rewardId | assetId | 名称 | 图标方向 |
| --- | --- | --- | --- |
| `reward_double_niuma` | `double_niuma_coupon` | 双倍牛马券 | 双倍券 / 2x 标识 |
| `reward_season_sprint` | `season_sprint_coupon` | 赛季冲刺券 | 冲刺鞋 / 赛季旗帜 |
| `reward_luckin_coffee` | `luckin_coffee_coupon` | 瑞幸咖啡券 | 咖啡兑换券，不使用真实品牌 logo |

## 稀有度与边框规则

GM-20 不重新定义经济稀有度，只定义视觉映射。

| tier | 边框 | 用途 |
| --- | --- | --- |
| `coin` | 普通白 / 浅灰 | 银子奖励 |
| `utility` | 蓝色 | 个人实用道具 |
| `social` | 紫色 | 弱社交道具 |
| `rare` | 金色 | 强 boost / 真实福利 |
| `cosmetic` | 暂不启用 | 后续收藏系统 |

`rarity` badge 由 reward 或 item metadata 决定。第一期 UI 可先映射为：

| content rarity | badge |
| --- | --- |
| `common` | `N` |
| `uncommon` | `R` |
| `rare` | `SR` |
| `epic` | `SSR` |

如果具体 reward 需要覆盖 badge，应在内容配置中显式扩展，不靠图片内文字解决。

## Image Generation Prompt 模板

第一批 `task_reroll_coupon` 使用这个模板：

```text
Use case: background-extraction
Asset type: transparent pixel-art inventory icon for 脱脂牛马 / 牛马补给站
Primary request: Create a square pixel-art icon for 任务换班券. The object is a blue utility coupon ticket with a reroll arrow and tiny checklist marks, designed for a web game backpack item grid.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one standalone coupon ticket icon only.
Style/medium: crisp pixel-art UI asset, black pixel outline, simple highlights, readable at small inventory size.
Composition/framing: icon centered, 1:1 canvas, subject uses 60-70% of the canvas, generous padding.
Color palette: blue utility accent, off-white ticket paper, black outline, small yellow highlight. Do not use #00ff00 anywhere in the subject.
Text: no text.
Constraints: no card frame, no rarity label, no quantity, no item name, no shadow, no watermark.
Avoid: gradients, realistic paper texture, cinematic lighting, background objects, green inside the icon.
```

For other icons, keep all constraints the same and only change the `Primary request` and icon subject.

## Data Model Impact

No Prisma schema change is required.

Two lightweight content-level additions are recommended during implementation:

1. Add an asset manifest, for example:

```text
content/gamification/reward-assets.ts
```

2. Add an optional `iconAssetId` or lookup helper that maps reward/item ids to asset paths.

The manifest should not replace existing reward definitions. It should only map media:

```ts
{
  assetId: "task_reroll_coupon",
  src: "/gamification/rewards/icons/task_reroll_coupon.png",
  alt: "任务换班券",
  promptVersion: "gm20-v1"
}
```

## UI Impact

Implementation should update or create a reusable `RewardTile` component.

The component should be usable in:

- Backpack grid.
- Selected backpack item preview.
- Lottery draw result.
- Probability disclosure page.
- Future docs center reward tables.

The component should render a fallback if an asset is missing:

- Use a simple icon placeholder.
- Keep the correct tier border and text.
- Do not break draw or backpack UI.

## Testing Strategy

### Asset Manifest Tests

Add tests that verify:

- Every GM-16 active reward resolves to an asset entry.
- Every asset file exists under `public/gamification/rewards/icons/`.
- Every asset path is a PNG.
- Asset ids are unique.

### Image Validation Script

Add a small validation script or test helper that checks:

- PNG has alpha channel.
- Corner pixels are transparent.
- Canvas is square.
- Dimensions are at least `256x256`.

This can be a Node script using image metadata tooling already available in the project, or a small dev-only validation if adding a dependency is justified.

### Component Tests

Cover:

- Tier border class mapping.
- Rarity badge mapping.
- Missing icon fallback.
- Quantity rendering.
- Draw-result size variant.

## Rollout Plan

1. Create and validate `task_reroll_coupon.png` as the first transparent icon.
2. Add the asset directory and manifest.
3. Build `RewardTile` using the manifest and existing reward metadata.
4. Replace duplicated backpack/draw reward visuals with `RewardTile`.
5. Generate the remaining `17` active reward icons in small batches.
6. Run visual QA against the real backpack and lottery result views.

## Acceptance Criteria

GM-20 is complete when:

- `task_reroll_coupon` has a transparent PNG icon saved in the project.
- The icon is displayed through a component-rendered blue utility tile.
- No reward UI depends on a full card bitmap for border, label, rarity, or quantity.
- The spec lists all `18` GM-16 active reward media assets.
- The implementation plan includes validation for transparent PNG shape and manifest coverage.

