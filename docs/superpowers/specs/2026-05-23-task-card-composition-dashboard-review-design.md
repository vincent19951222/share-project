# Task Card Composition Dashboard Review Design

> 以 4 张今日主线任务卡为第一轮 demo，验证 3:4 标准卡牌、混合渲染管线和 `/ui-lab/supply-dashboard` 今日主线落位。本文只定义设计方向和验收边界，不直接实现代码或生成最终资产。

## 关联文档

- 完整任务内容池：`design/game-card-design.md`
- 早期 20 张 MVP 资产 spec：`docs/superpowers/specs/2026-05-03-task-card-png-assets-design.md`
- 四卡 composition demo spec：`docs/superpowers/specs/2026-05-03-task-card-composition-demo-design.md`
- Dashboard 静态复刻 spec：`docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- Dashboard 二阶段任务 spec：`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-04-dashboard-design.md`

## 背景

当前 `public/assets/task-cards/raw/` 里已有早期 AI 直接生成的任务卡图。它们能临时撑住 Dashboard 结构，但问题明显：文字、边框、元素位置和任务语义不可控，不适合作为长期生产方向。

后续方向应改成可组合的游戏卡牌管线：共享边框和底板控制卡牌体系，插图只负责画面，中文文字、状态和交互由代码渲染。这样既保留游戏卡牌质感，也避免 AI 生成整张卡时造成错字、错位和风格漂移。

## 已确认决策

1. **卡牌比例使用硬标准 `3:4`。**
   - 任务卡组件必须在 CSS/模板层锁定 `aspect-ratio: 3 / 4`。
   - Dashboard 今日主线区域需要适配卡牌，不能为了旧坑位压扁或拉伸卡牌。

2. **第一轮 demo 使用混合方式。**
   - Frame layer：共享边框、底板、角块、纸纹和维度色，可由 CSS 或少量位图资产实现。
   - Illustration layer：每张任务只提供中间插图。
   - Dynamic UI/Text layer：标题、维度 slogan、标签、状态、换任务按钮由 React/CSS 渲染。

3. **第一轮 review 同时看两件事。**
   - 4 张标准卡 contact sheet。
   - 4 张卡放入 `/ui-lab/supply-dashboard` 今日主线后的 2x2 落位预览。

4. **先验证结构，再决定是否替换为开源边框素材。**
   - 第一轮用可调的 CSS/模板边框跑通比例、信息层级和 Dashboard 密度。
   - 如果结构成立但质感不足，再专项寻找可商用、可改造、许可清晰的开源边框素材替换 frame layer。

## Demo 范围

本轮只覆盖四个维度各 1 张卡：

| Card ID | Dimension | Slogan | Title |
| --- | --- | --- | --- |
| `movement_004` | movement | 把电充绿 | 窗边回血 |
| `hydration_003` | hydration | 把尿喝白 | 杯子见底 |
| `social_001` | social | 把事办黄 | 废话 KPI |
| `learning_005` | learning | 把股看红 | 一句话笔记 |

不扩展到 20 张 MVP 批量资产，不处理 `design/game-card-design.md` 里的 60 张长期内容池。

## 非目标

- 不把 AI 生成的完整卡图直接作为最终卡牌。
- 不在本轮接入真实任务 API、抽奖 API 或持久化状态。
- 不替换正式 `components/gamification/SupplyStation.tsx`。
- 不一次性建设完整卡牌设计系统。
- 不决定最终生产卡牌必须导出 PNG，还是完全运行时渲染。

## 卡牌结构

单张卡按从上到下的结构组织：

1. **Top Dimension Band**
   - 展示维度 slogan。
   - 四个维度使用同一布局，只更换主题色和少量装饰。

2. **Title Area**
   - 展示任务标题。
   - 标题必须是文字层，不进入插图。

3. **Art Window**
   - 中间插图窗口占卡牌最大面积。
   - 插图按 `cover` 裁切，不拉伸。
   - 插图不包含最终边框、标题、slogan、标签、状态或按钮。

4. **Meta Tag Row**
   - 展示难度、场景、冷却，例如 `轻 / 通用 / 4天`。
   - 标签必须由文字层渲染。

5. **Status And Reroll Controls**
   - 状态徽章固定在卡面右上或右侧稳定槽位。
   - `换一个` 按钮固定在底部或右下稳定槽位。
   - Demo 阶段先用 React/CSS 绘制；位置稳定后再判断是否资产化。

6. **Frame Decoration**
   - 使用统一外框、内边框、角块和纸张/像素质感。
   - 第一轮优先 CSS 实现，允许少量可替换位图纹理。

## 尺寸规范

卡牌标准：

```css
aspect-ratio: 3 / 4;
```

Review 尺寸建议：

- Contact sheet 单卡：`300 x 400`。
- 未来高清导出候选：`900 x 1200`。

坐标、间距和字体大小应使用可等比放大的 token，避免只为 `300 x 400` 写死。

## Dashboard 今日主线适配

当前 `/ui-lab/supply-dashboard` 今日主线面板是右侧 2x2 grid 自动填坑，单张卡没有 3:4 约束。本轮应把 Dashboard 适配作为 review 的一部分。

Dashboard 预览至少包含两个方向：

1. **Compact 2x2**
   - 保持右侧今日主线面板大体位置。
   - 压缩标题区、进度区和奖励 footer。
   - 卡牌保持 3:4，不拉伸。

2. **Card-first 2x2**
   - 今日主线区域更像卡牌展柜。
   - 必要时扩大右侧区域或减少其他区域占比。
   - 优先保证卡牌可读性、插图可见性和操作按钮清楚。

推荐先做 **Card-first 2x2**，因为今日主线是 Dashboard 的核心可操作模块，不应为了旧面板比例牺牲卡牌识别度。

## 数据修正

当前 `components/gamification/ui-lab/supply-dashboard/mock-data.ts` 中 `hydration` 和 `movement` 的部分 `id / dimension / title / image` 语义存在交叉。实现本 demo 时应修正为四张卡各自维度、标题和图片一致：

- movement 使用 `movement_004` 窗边回血。
- hydration 使用 `hydration_003` 杯子见底。
- social 使用 `social_001` 废话 KPI。
- learning 使用 `learning_005` 一句话笔记。

## Review 产物

第一轮实现后需要能 review：

1. **四卡 contact sheet**
   - 同屏展示四张 `3:4` 标准卡。
   - 用于评估边框、文字层级、插图窗口、维度色和整体一致性。

2. **Dashboard 今日主线预览**
   - 在 `/ui-lab/supply-dashboard` 或隔离 preview route 中展示四张标准卡放入今日主线。
   - 用于评估 2x2 密度、面板比例、奖励 footer 和 CTA 是否合理。

3. **视觉 companion 页面**
   - 如果需要比较 `Compact 2x2` 和 `Card-first 2x2`，可以用 Superpowers visual companion 做并排预览。

## 验收标准

- 四张任务卡本体均保持 `3:4`，无拉伸变形。
- 四张卡的 frame geometry 一致，维度差异只体现在主题色和少量装饰。
- 插图不包含 AI 生成的中文标题、slogan、标签、状态或按钮。
- 中文标题、slogan 和标签在 `300 x 400` review 尺寸下可读。
- 状态徽章和 `换一个` 按钮位置稳定，不遮挡标题和插图主体。
- Dashboard 今日主线 2x2 中每张卡仍保持 `3:4`。
- Dashboard 中顶部进度、四张卡、底部奖励栏和领取按钮不互相遮挡。
- 实现不修改正式 `SupplyStation`，只影响 UI lab 或隔离 review 页面。
- 实现不把旧 raw 卡图当成最终整卡继续扩散；旧图只能作为插图或临时素材来源。

## 后续实现顺序

1. 定义 task-card demo 数据和维度 token。
2. 创建 `3:4` 标准卡组件或 review-only 组件。
3. 用现有四张 raw 图或裁剪图作为插图输入，先保证结构成立。
4. 生成四卡 contact sheet 页面或 review route。
5. 修改或新增 Dashboard 今日主线预览，让 2x2 使用标准卡。
6. 进行视觉 review，决定边框质感是否需要升级为开源素材或专门生成的 frame assets。

