# Home UI 02 Shared Board Note Wall Design

> 第二份页面级 UI spec：把 `共享看板` tab 升级为办公室便签墙。只改 UI、布局、动效和媒体资源，不改变便签数据模型、接口、权限、同步或发布/删除语义。

## 背景

前置计划：

- `docs/superpowers/plans/2026-05-03-home-ui-01-punch-scene-foundation.md`
- `docs/superpowers/specs/2026-05-03-home-ui-01-punch-scene-foundation-design.md`

Spec 01 已完成共享视觉底座和 `健身打卡` 样板页。Spec 02 进入第二个首页 tab，只覆盖共享看板页面：

- `SharedBoard`
- `NoteComposer`
- `NoteMasonry`
- `NoteCard`
- `SyncStatus`

目标原型图：

- `design/ui-assets/tab-共享看板.png`

核心视觉隐喻：**办公室便签墙**。页面应该像一块贴在办公室墙上的共享软木板：上方是正在书写的夹板发布区，下方是贴满便签、图钉、胶带和团队通告的公告墙。

## 严格范围

### 包含

- 当前共享看板 UI 审核和与原型差异整理。
- 缺失媒体元素 checklist。
- 每个缺失图片的 `imagegen` 生成要求。
- 图片抠图、压缩、尺寸预算和入库规范。
- `SharedBoard` 场景 shell。
- `NoteComposer` 夹板式发布区。
- `SyncStatus` 自动同步胶囊。
- `BoardMessage` 发布成功/失败状态行。
- `NoteMasonry` 软木板便签墙布局。
- `NoteCard` 便签纸、图钉、胶带、折角和通告样式。
- responsive 和 reduced-motion 规则。

### 不包含

- 不改 Prisma schema。
- 不改 `/api/board-notes` contract。
- 不改 `BoardNote` 字段。
- 不改认证、团队隔离、删除权限或软删除逻辑。
- 不改 30 秒 polling 机制。
- 不新增评论、点赞、反应、频道、未读数、成员在线列表。
- 不新增置顶管理、公告管理台或 admin-only 区域。
- 不新增任务、日程、排行榜、奖励或战报入口。
- 不改变 `BOARD_NOTE_MAX_LENGTH`、`BoardNoteType`、`BoardNoteColor`。

## 当前 UI 审核

### 现有能力

当前共享看板已经有完整的基础业务闭环：

- `SharedBoard` 只在 active tab 为 `board` 时拉取数据。
- 进入页面后调用 `GET /api/board-notes`。
- 每 30 秒自动同步。
- 用户资料更新后重新拉取便签。
- 发布便签时调用 `POST /api/board-notes`。
- 删除便签时调用 `DELETE /api/board-notes/[id]`。
- 发布成功后显示 `已发布到共享看板`。
- 发布/删除失败时显示可读错误 copy。
- 便签卡片已经区分自由笔记和团队通告。
- 触屏设备上删除按钮保持可见。

这些行为都必须保留。

### 原型关键特征

原型中的 `共享看板` 有这些强视觉信号：

- 黑色顶部导航，当前 tab 是黄色高亮。
- 页面底是一张浅色带点纹的办公室墙。
- 主体是一块大软木板，边缘有黑色粗线和纸板污渍。
- 发布区像一张被金属夹夹住的白色表单纸。
- 自动同步状态在右上角，像贴在夹板边上的状态章。
- 发布成功状态是一条贴在表单底部的绿色确认行。
- 便签不是普通 card，而是带图钉、胶带、折角和轻微旋转的纸张。
- `团队通告` 不是普通 badge，而是黑色丝带标题。
- 页面两侧有办公室/健身混合装饰：海报、哑铃边缘、马克笔、回形针、胶带。

### 当前缺口

当前 UI 与原型相比缺少：

- 办公室墙面场景。
- 软木板背景。
- 金属夹板视觉。
- 侧边海报、马克笔、哑铃、回形针等媒体元素。
- 方形纸片式颜色 swatch。
- 二段式 `自由笔记 / 团队通告` 控制。
- 纸张质感、图钉、胶带和折角。
- 团队通告黑色 ribbon。
- 便签之间的自然错落和轻微旋转。
- 移动端的一列便签墙适配规则。

## 媒体元素 Checklist

最终图片统一进入：

```text
public/assets/home-scenes/shared-board/
```

| 用途 | 文件名 | 类型 | 尺寸上限 | 体积上限 |
| --- | --- | --- | --- | --- |
| 办公室墙面背景 | `office-wall-bg.webp` | opaque WebP | 2560x1440 | 420 KB |
| 软木板纹理 | `cork-board-bg.webp` | opaque WebP | 2200x1200 | 520 KB |
| 金属夹板夹子 | `clipboard-clip.webp` | alpha WebP | 640x360 | 140 KB |
| 左侧激励海报 | `poster-no-excuses.webp` | alpha WebP | 720x720 | 180 KB |
| 右侧黄色训练海报 | `poster-focus-train-win.webp` | alpha WebP | 720x720 | 180 KB |
| 左下小纸条 | `discipline-note.webp` | alpha WebP | 720x720 | 160 KB |
| 左侧哑铃边缘 | `dumbbell-edge.webp` | alpha WebP | 720x720 | 160 KB |
| 右侧马克笔 | `marker-pen.webp` | alpha WebP | 720x720 | 160 KB |
| 红色图钉 | `pushpin-red.webp` | alpha WebP | 256x256 | 48 KB |
| 蓝色图钉 | `pushpin-blue.webp` | alpha WebP | 256x256 | 48 KB |
| 黄色图钉 | `pushpin-yellow.webp` | alpha WebP | 256x256 | 48 KB |
| 胶带条 | `paper-tape.webp` | alpha WebP | 512x256 | 80 KB |
| 银色回形针 | `paperclip.webp` | alpha WebP | 512x512 | 80 KB |

CSS 负责这些内容，不生成图片：

- 便签纸颜色。
- 便签折角。
- 便签阴影。
- 便签轻微旋转。
- swatch 选中勾。
- 通告 ribbon 的基础形状。
- composer 的分割线和边框。

## 图片生成与处理规范

### 生成方式

- 使用 `imagegen` skill 的 built-in tool mode。
- 每个 asset 单独生成，不用一个大图切片。
- implementation plan 中每个生图 asset 必须是独立 task。该 task 完成的定义是：图片已生成、已按 opaque/alpha 规则处理、已压缩为 WebP、已保存到 `public/assets/home-scenes/shared-board/`、已完成单文件验证，并且对应文件已可被 git 跟踪。
- 背景图可以是不透明图。
- 装饰元素必须生成在纯色 chroma-key 背景上。
- 默认 chroma-key 是 `#00ff00`。
- 如果主体里出现绿色，改用 `#ff00ff`。
- 所有 raw 生成图先放在 `/private/tmp/share-project-home-scenes-shared-board/raw/`。
- raw 图不进入 `public/`。

### 抠图方式

所有 alpha asset 先用 `remove_chroma_key.py` 处理：

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input <raw.png> \
  --out <alpha.png> \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill \
  --edge-contract 1
```

处理后用 `magick identify` 确认 alpha channel。若没有 alpha 或边缘有明显色边，只重生成对应 asset。

### 压缩方式

- 背景图 resize 后用 `cwebp -q 82`。
- 装饰图 resize 后用 `cwebp -q 86`。
- 小图钉、胶带、回形针用 `cwebp -q 88`。
- 最终只提交 `.webp`。
- 页面代码只能引用 `/assets/home-scenes/shared-board/<filename>`。

## 目标设计

### 页面结构

`SharedBoard` 的视觉结构：

```text
shared-board-scene
  shared-board-wall-bg
  shared-board-props
    posters / dumbbell / marker / paperclip
  shared-board-content
    shared-board-cork
      shared-board-composer-wrap
        sync status
        clipboard clip
        NoteComposer
        BoardMessage
      NoteMasonry
```

页面主体宽度在桌面居中，接近原型中的大软木板占比。侧边装饰在大屏出现，小屏隐藏。

### NoteComposer

发布区从普通 `soft-card` 改成夹板表单：

- 左侧保留当前用户头像。
- textarea 保留现有字数上限和 `Ctrl + Enter` 发布。
- placeholder 改短，接近原型：`说点什么吧...`
- 类型选择改为二段式按钮：`自由笔记` / `团队通告`。
- 颜色选择改为四个方形纸片 swatch。
- `团队通告` 时颜色 swatch 降级不可用，提交仍传 `color: null`。
- 发布按钮保留中文 `发布`，视觉上增加纸飞机符号或图标感。
- 字数计数保留。

### SyncStatus

同步状态仍然只有三种：

- `idle`: `自动同步`
- `syncing`: `同步中`
- `error`: `同步异常`

视觉改为右上角胶囊状态章：

- idle 显示 check 符号。
- syncing 显示旋转/同步符号。
- error 显示警示符号。
- 继续保留 `aria-live="polite"`。

### BoardMessage

`BoardMessage` 不新增组件文件，继续由 `SharedBoard` 渲染。

成功态：

- 放在 composer 底部。
- 使用绿色 check。
- 文案继续使用 `已发布到共享看板`。

失败态：

- 同位置显示红色警示。
- 保留现有错误文案。

### NoteMasonry

桌面是软木板上的错落便签墙：

- 使用 masonry/columns 保持现有列表渲染简单。
- 卡片宽度接近原型中的 sticky note。
- 不做拖拽。
- 不做瀑布流库。

移动端：

- 单列。
- 取消大幅旋转。
- 保留纸张、图钉、删除按钮和类型层级。

### NoteCard

自由笔记：

- 使用当前 `color` 映射纸张颜色。
- 顶部有图钉。
- 部分卡片有胶带。
- 右下或右上有折角。
- 保留作者头像、作者名、类型 badge、时间、正文。
- 删除按钮继续使用 `aria-label="删除便签"`。

团队通告：

- 固定黄色纸张。
- 顶部有黑色 `团队通告` ribbon。
- 内容区域更强层级。
- 加一条黑色分隔线。
- 保留作者和时间。

旋转规则必须 deterministic，不能依赖随机数，避免 hydration mismatch。

## Responsive 规则

### Desktop

- 以 `1672x941` 原型比例做主要对齐。
- 软木板大面积居中。
- composer 位于软木板顶部。
- note wall 位于 composer 下方。
- 侧边媒体元素不遮挡内容。

### Tablet

- 软木板宽度收窄。
- 侧边媒体缩小或隐藏。
- composer 控制区允许换行。
- note masonry 从 4 列降到 2-3 列。

### Mobile

- 不强行复刻桌面软木板比例。
- composer 单列。
- note wall 单列。
- sync status 进入正常流，避免绝对定位挤压。
- 删除按钮始终可见。
- 文本不能溢出按钮、swatch、卡片或状态胶囊。

## 动效规则

允许：

- tab 进入时轻微 fade/translate。
- 便签 hover lift。
- 发布成功状态轻微出现。
- syncing 状态符号轻微旋转或 pulse。

不允许：

- 大幅弹跳。
- 影响阅读的持续漂浮。
- layout 抖动。
- hover 后改变卡片尺寸。

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  .shared-board-scene *,
  .shared-board-scene *::before,
  .shared-board-scene *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 测试与验收

### 自动化测试

新增：

- `__tests__/home-ui-shared-board-assets.test.ts`
  - 检查 13 个 WebP 资源存在。
  - 检查体积预算。

- `__tests__/home-ui-shared-board-scene.test.tsx`
  - 检查 scene shell。
  - 检查 composer 结构。
  - 检查 sync status symbol。
  - 检查媒体元素引用。
  - 检查 note pin/fold/tape/ribbon hooks。
  - 检查删除按钮可访问标签仍存在。

更新：

- `__tests__/shared-board-css.test.ts`
  - 保留触屏删除按钮可见测试。
  - 增加 soft cork board、note pin、fold、ribbon、wall background 的 CSS contract。

回归：

- `__tests__/shared-board-polling.test.tsx`
- `__tests__/shared-board-errors.test.tsx`
- `__tests__/board-note-copy.test.ts`
- `__tests__/board-notes-api.test.ts`

### 视觉验收

桌面 `1672x941`：

- 页面第一眼应接近 `tab-共享看板.png`。
- 顶部导航黑底黄 active。
- 主体是大软木板。
- composer 像夹板纸。
- 便签有图钉、胶带、折角、纸张阴影。
- 团队通告有黑色 ribbon。
- 侧边有海报、哑铃、马克笔、回形针。

Tablet：

- 内容不被装饰图遮挡。
- 便签不会压住 composer。

Mobile：

- 单列可用。
- 文本不溢出。
- 删除按钮可触达。
- 发布、类型切换、颜色选择都能正常点击。

## 后续实施计划

详细 task-by-task implementation plan 见：

- `docs/superpowers/plans/2026-05-04-home-ui-02-shared-board-note-wall.md`

实施顺序：

1. 先加 asset contract test。
2. 建立 asset staging/public 目录。
3. 按 checklist 逐个执行 asset task；每个 task 独立完成生成、处理、压缩、入库和验证。
4. 跑一次总 asset contract test。
5. 加 shared-board scene shell。
6. 改 composer 和 sync status。
7. 改 note wall 和 note card。
8. 做 responsive 与视觉验收。
