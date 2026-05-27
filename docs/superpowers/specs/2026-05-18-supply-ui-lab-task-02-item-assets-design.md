# Supply UI Lab 任务 02：道具素材设计

> 第二阶段任务级 spec，用于定义共享 catalog 使用的原子道具素材。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 2。

## 目标

为每一个可见 catalog 道具补齐真实的原子媒体素材，让补给商店、背包、补给抽卡机和任务记录可以渲染同一套道具图，不再依赖原型裁图面板或不匹配的临时图标。

## 用户可见变化

- 每个商店商品都有独立、可识别的道具图片。
- 背包格子使用和商店一致的道具图片。
- 补给抽卡机的奖池预览和最近掉落可以复用同一套 catalog 素材。
- 原本只有文字或借用无关图片的道具，会变成视觉上能区分的道具。

## 素材变化

在以下目录新增透明背景 WebP 道具图标：

`public/assets/home-scenes/supply/items/`

需要生成的素材：

- `fitness-leave-coupon.webp`
- `drink-water-ping.webp`
- `walk-ping.webp`
- `team-standup-ping.webp`
- `chat-ping.webp`
- `share-info-ping.webp`
- `double-niuma-coupon.webp`
- `season-sprint-coupon.webp`

以下已有素材可以继续复用：

- `task_reroll_coupon`
- `small_boost_coupon`
- `team_broadcast_coupon`
- `luckin_coffee_coupon`
- 银子奖励

## 非目标

- 不生成完整 UI 面板。
- 不从原型截图里裁道具图。
- 不重做页面布局。
- 不新增动画 sprites。

## 验收标准

- 每个 `assetStatus: "needs_generated"` 的 catalog item 都有对应已提交文件。
- 每个生成素材都符合约定体积预算。
- 素材测试能验证文件存在，并确认没有使用面板截图素材。
- 道具素材有透明背景或足够独立，能同时用于背包格子、商品卡和奖励展示。

## 关联计划

具体实现步骤见以下总计划的任务 2：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
