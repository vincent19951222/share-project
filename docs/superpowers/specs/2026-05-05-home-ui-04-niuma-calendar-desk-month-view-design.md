# Home UI 04 Niuma Calendar Desk Month View Design

> 第四份页面级 UI spec：把 `牛马日历` tab 升级为桌面活页本月历。只改 UI、布局、动效和媒体资源，不改变日历数据来源、API contract、认证、月份导航规则或只读语义。

## 背景

前置基线：

- `docs/superpowers/plans/2026-05-03-home-ui-01-punch-scene-foundation.md`
- `docs/superpowers/specs/2026-05-03-home-ui-01-punch-scene-foundation-design.md`
- `docs/superpowers/specs/2026-05-05-home-ui-03-coffee-receipt-counter-design.md`
- `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- `docs/superpowers/specs/2026-04-23-niuma-calendar-design.md`

Spec 01 已完成共享视觉底座和 `健身打卡` 样板页。Spec 02/03 已证明后续 tab 应该先建立页面级 scene，再把真实业务组件放进内容层。Spec 04 进入 `牛马日历`，只覆盖：

- `CalendarBoard`
- `CalendarHeader`
- summary chips
- `CalendarGrid`
- `CalendarDayCell`

目标原型图：

- `design/ui-assets/tab-牛马日历.png`

核心视觉隐喻：**桌面活页本月历**。页面应该像一本摊开的训练记录月历：白色纸面、左侧装订环、桌面文具、右侧贴纸和咖啡小票，主体是可扫读的月份表格。

## 方案选择

### 推荐方案：日历专属媒体 + CSS 纸面表格

用独立生成的桌面 props 和纸面纹理建立 `calendar-scene`，月历表格、今日高亮、统计 chip、按钮和状态全部由 CSS/组件结构实现。

优点：

- 还原原型里的活页本、夹子、贴纸、荧光笔等强视觉信号。
- 日历单元格仍由真实数据渲染，不依赖截图切片。
- 响应式可以隐藏或弱化 props，不破坏业务阅读。

取舍：

- 需要生成和处理多张 alpha WebP。
- CSS 需要比当前 soft-card 更精细，尤其是纸面表格线和今日单元格。

### 备选方案：纯 CSS 纸面，不生成 props

只用 CSS 做纸面、边框、表格和简单贴纸。

优点：实现快、资源少。

问题：无法达到原型中的桌面实物感，和已经完成的 Punch/Coffee scene 资产标准不一致。

### 不采用方案：整张原型当背景

把截图或大背景铺到底层，再叠真实月历。

问题：不可维护、不可响应、容易和真实日期/数据错位，也违反 image prototype workflow 的分层还原原则。

## 严格范围

### 包含

- 当前 `牛马日历` UI 审核和与原型差异整理。
- 缺失媒体元素 checklist。
- 每个缺失图片的 `imagegen` 生成要求。
- 图片抠图、压缩、尺寸预算和入库规范。
- `CalendarBoard` 页面级 scene shell。
- `CalendarHeader` 桌面月历标题区、月份标记和导航按钮视觉升级。
- summary chips 的图标、数字层级和边框样式升级。
- `CalendarGrid` 纸面表格布局、星期行、邻月占位日期和边框线升级。
- `CalendarDayCell` 训练章、咖啡计数、空日短横线和今日高亮升级。
- responsive 和 reduced-motion 规则。
- 结构、资源、CSS contract、组件行为和浏览器视觉检查策略。

### 不包含

- 不改 Prisma schema。
- 不改 `/api/calendar/state` contract。
- 不改 `CalendarMonthSnapshot` 的业务含义。
- 不新增日详情弹窗、编辑、补录、删除或打卡入口。
- 不新增未来月份导航。
- 不新增不存在的统计口径。
- 不把邻月日期当作可查询业务数据；邻月日期只作为视觉占位。
- 不把装饰图放进业务组件内部充当状态来源。
- 不用假成员、假日期记录或假杯数填补原型。

## 当前 UI 审核

### 现有能力

当前 `牛马日历` 已经完成基础产品能力：

- `CalendarBoard` 初始加载当前月份 snapshot。
- 支持查看上个月，并在非本月时回到当前月份。
- 请求失败时显示错误态。
- `CalendarHeader` 展示标题、月份和月份导航。
- summary row 展示 `本月练了 X 天` 和 `本月喝了 X 杯`。
- `CalendarGrid` 使用七列星期布局。
- `CalendarDayCell` 展示日期、训练状态和咖啡杯数。
- 页面只读，点击 day cell 没有行为。
- 通过 `calendar:refresh` 响应其他 tab 的打卡/咖啡刷新。

这些行为都必须保留。

### 原型关键特征

原型中的 `牛马日历` 有这些强视觉信号：

- 黑色顶部导航，当前 tab 是黄色高亮。
- 页面背景是浅灰纸面/桌面，带低对比噪点纹理。
- 主体是一张大白色活页本纸面，粗黑边框、圆角和厚阴影。
- 左侧有棕色本脊、金属装订环、黑色长尾夹、白色 `JUST LIFT.` 贴纸和黄色荧光笔。
- 右侧有紫色 `KEEP GOING` 便签、咖啡印章纸、胶带和咖啡杯渍。
- 顶部标题区是 `Monthly Record View` 小标签、`牛马日历` 大标题、竖线分隔和 `2026年5月` 月份标题，月份下有紫色荧光笔划线。
- 右上角有两个按钮：`上个月` 和 `回到本月`，按钮保持 brutalist 形态。
- summary chips 是横向大卡：左侧圆形图标，中间文案，右侧大数字和单位。
- 月历是纸面表格，不是卡片网格；列与行之间是浅灰表格线。
- 星期行是表格 header，文案为 `周一` 到 `周日`。
- 邻月日期以灰色数字出现在月初空位中。
- 有记录的日期右上显示绿色圆形 `练` 章，右下显示橙色咖啡 icon 和数字。
- 无记录日期显示一条短横线。
- 今天的 day cell 是浅黄色底、粗黑双边框和投影，日期数字有黄色小底。

### 当前缺口

当前 UI 与原型相比缺少：

- 页面级 `calendar-scene / background / props / content` 分层。
- 活页本/桌面纸面背景。
- 左侧装订环、本脊、长尾夹、荧光笔、`JUST LIFT.` 贴纸。
- 右侧紫色 `KEEP GOING` 便签、咖啡印章纸、杯渍。
- `CalendarBoard` 仍是基础 `soft-card`，没有活页本大纸面比例和边缘层次。
- Header 里的月份在标题下方，而原型是标题同一行右侧展示。
- `回到本月` 当前只在非本月时出现；原型中固定占位，需要始终渲染，当前月时可 disabled 或 no-op。
- summary chip 目前是普通文字胶囊，没有图标圆牌、大数字和单位层级。
- 当前 grid 是有 gap 的 rounded card grid，不是连续纸面表格。
- 当前 leading blanks 是空白格；原型需要灰色邻月日期数字。
- 当前 coffee 状态使用重复图标；原型需要紧凑的 `咖啡 icon + 数字`。
- 当前空日只保留空白；原型需要居中的短横线。
- 当前今日高亮存在，但没有原型中的浅黄色填充、内层黑边和日期底色。
- CSS 中已有两段 `calendar-*` 样式，需要在实现时收敛为单一日历 scene 样式，避免后续覆盖不稳定。

## 媒体元素 Checklist

最终图片统一进入：

```text
public/assets/home-scenes/calendar/
```

### 新增必需资源

| 用途 | 文件名 | 类型 | 尺寸上限 | 体积上限 |
| --- | --- | --- | --- | --- |
| 桌面纸面背景 | `calendar-desk-bg.webp` | opaque WebP | 2560x1440 | 450 KB |
| 活页本纸张纹理 | `binder-paper-texture.webp` | opaque WebP | 1800x1200 | 260 KB |
| 左侧金属装订环 | `binder-rings-left.webp` | alpha WebP | 420x1200 | 120 KB |
| 黑色长尾夹 | `binder-clip.webp` | alpha WebP | 560x560 | 120 KB |
| 黄色荧光笔 | `highlighter-focus-progress.webp` | alpha WebP | 560x920 | 160 KB |
| 白色训练贴纸 | `sticker-just-lift.webp` | alpha WebP | 560x560 | 120 KB |
| 紫色训练便签 | `note-keep-going-purple.webp` | alpha WebP | 560x660 | 140 KB |
| 咖啡印章纸 | `calendar-coffee-stamp-paper.webp` | alpha WebP | 680x720 | 140 KB |
| 右下咖啡杯渍 | `calendar-coffee-ring-stain.webp` | alpha WebP | 620x620 | 100 KB |

### 复用现有资源

- `/assets/icons/calendar-pixel.svg`
  - 用途：顶部导航 tab icon，已由 Spec 01 处理。
- `/assets/icons/workout-pixel.svg`
  - 用途：summary 训练圆形图标，可通过 CSS 着色和圆形底座处理。
- `/assets/icons/coffee-pixel.svg`
  - 用途：summary 咖啡圆形图标。
- `/assets/calendar/coffee-pixel-16bit-v1.png`
  - 用途：day cell 内咖啡 icon。若视觉不贴近原型，可在实现计划中改用 `/assets/icons/coffee-pixel.svg`，但不生成新的咖啡业务 icon。

### CSS 负责，不生成图片

- 主纸面边框、圆角和外投影。
- 左右本脊/厚纸边的基础色块。
- 月份下方紫色荧光笔划线。
- summary chip 的图标圆底、数字排版和阴影。
- 月历表格线。
- 邻月日期灰色状态。
- 空日短横线。
- 今日 cell 的浅黄色底、内层边框、日期数字底。
- 按钮、badge 和 disabled 状态。

## 图片生成与处理规范

### 生成方式

- 使用 `imagegen` skill 的 built-in tool mode。
- 每个 asset 单独生成，不用一张大图切片。
- implementation plan 中每个生图 asset 必须是独立 task。该 task 完成的定义是：图片已生成、已按 opaque/alpha 规则处理、已压缩为 WebP、已保存到 `public/assets/home-scenes/calendar/`、已完成单文件验证，并且对应文件已可被 git 跟踪。
- 背景图可以是不透明图。
- 装饰元素必须生成在纯色 chroma-key 背景上。
- 默认 chroma-key 是 `#00ff00`。
- 如果主体中需要绿色，改用 `#ff00ff`。
- 所有 raw 生成图先放在 `/private/tmp/share-project-home-scenes-calendar/raw/`。
- raw 图不进入 `public/`。
- 项目代码只能引用 `/assets/home-scenes/calendar/<filename>`。

### 逐项生图要求

`calendar-desk-bg.webp`：

- Prompt 方向：浅灰白桌面/纸面背景，低对比 speckle 和轻微纸纹，16:9，中央留白给活页本。
- 禁止：人物、真实品牌 logo、可读文字、暗角、渐变球、重设备遮挡。

```text
Use case: stylized-concept
Asset type: web app scene background for the 牛马日历 tab
Primary request: a clean light desk paper background for a playful brutalist Chinese fitness calendar web app
Scene/backdrop: warm off-white desk surface with subtle paper grain, tiny speckled texture, faint coffee marks near edges, quiet center area for a large calendar notebook
Style/medium: polished 2D raster illustration, flat-shaded, crisp edges, light texture, not photorealistic
Composition/framing: 16:9 wide background, no centered object, no people, no UI, no logos
Lighting/mood: bright indoor ambient light, tidy desk
Color palette: warm white, pale gray, muted beige, tiny slate marks
Constraints: no readable text, no watermarks, no large equipment, no dark vignette, no gradient orb decoration
```

`binder-paper-texture.webp`：

- Prompt 方向：干净白色活页本纸张纹理，轻微纤维、边缘磨损和纸张阴影，适合作为主 surface 背景。
- 禁止：预印文字、表格线、真实商标、过重污渍。

```text
Use case: stylized-concept
Asset type: paper texture for a monthly calendar notebook surface
Primary request: a clean white binder notebook paper texture for a web app calendar panel
Scene/backdrop: isolated flat paper texture with slight fibers, soft edge wear, very subtle paper shadow, no printed content
Style/medium: polished 2D raster texture, crisp but quiet, suitable under real UI text
Composition/framing: landscape rectangle, uniform usable center, no objects
Lighting/mood: bright and clean
Color palette: white, warm off-white, pale gray
Constraints: no readable text, no pre-drawn calendar grid, no logos, no stains that reduce readability, no watermark
```

`binder-rings-left.webp`：

- Prompt 方向：左侧三到四个银色活页金属环，带一点棕色本脊边缘，厚描边，适合贴在主纸面左边。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay for the left edge of a calendar notebook scene
Primary request: silver binder rings along the left side of a playful brutalist notebook calendar
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: three or four silver metal binder rings connected to a thin warm brown notebook spine edge, thick black outline, clean highlights
Style/medium: polished 2D raster illustration, crisp edges, playful brutalist line work
Composition/framing: tall vertical strip, rings aligned on the left edge, usable as page-edge decoration
Color palette: silver gray, dark slate outline, warm brown spine
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the object; do not use #00ff00 anywhere in the subject; no text; no people; no watermark
```

`binder-clip.webp`：

- Prompt 方向：黑色长尾夹，粗黑/灰描边，像原型左上角夹子。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay desk prop for a calendar scene
Primary request: a black binder clip for a playful brutalist desk calendar
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: black metal binder clip with silver handles, thick outline, slight paper-shadow style but no actual cast shadow
Style/medium: polished 2D raster illustration, crisp edges, subtle texture
Composition/framing: square object, slightly angled, centered
Color palette: black, charcoal, silver gray
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the clip; do not use #00ff00 anywhere in the subject; no text; no watermark
```

`highlighter-focus-progress.webp`：

- Prompt 方向：左下黄色荧光笔，黑色笔盖，原型文案 `FOCUS ON PROGRESS`。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay desk prop for a calendar scene
Primary request: a yellow highlighter marker for a fitness calendar web app
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: yellow highlighter marker with black cap, thick black outline, slightly worn plastic texture
Style/medium: playful brutalist 2D illustration, crisp edge, flat shaded
Composition/framing: tall vertical marker, slightly tilted, usable on the left side of a desktop scene
Text (verbatim): "FOCUS ON PROGRESS"
Color palette: yellow, black, warm gray
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the marker; do not use #00ff00 anywhere in the subject; only the exact text "FOCUS ON PROGRESS"; no other readable text; no people; no watermark
```

`sticker-just-lift.webp`：

- Prompt 方向：白色爆炸形健身贴纸，短文案 `JUST LIFT.`，左侧小哑铃图形。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay sticker for a fitness calendar scene
Primary request: a white comic burst sticker for a playful brutalist fitness calendar
Scene/backdrop: isolated sticker on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: white burst-shaped sticker with thick black outline, small black dumbbell icon, slight paper texture
Style/medium: playful brutalist 2D illustration, crisp edges
Composition/framing: square sticker, centered, clean edge for cropping
Text (verbatim): "JUST LIFT."
Color palette: white, black, tiny muted yellow accent
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the sticker; do not use #00ff00 anywhere in the sticker; only the exact text "JUST LIFT."; no other readable text; no watermark
```

`note-keep-going-purple.webp`：

- Prompt 方向：右侧紫色便签，用胶带固定，文案 `KEEP GOING`，小闪电图形。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay taped note for a calendar scene
Primary request: a purple taped motivational note for a playful brutalist fitness calendar
Scene/backdrop: isolated note on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: purple paper note with beige tape across the top, thick black outline, small lightning bolt icon, slight paper wrinkle texture
Style/medium: polished 2D raster illustration, crisp edge, playful brutalist
Composition/framing: portrait note, slightly rotated, centered
Text (verbatim): "KEEP GOING"
Color palette: soft purple, beige tape, black ink
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the note; do not use #00ff00 anywhere in the note or tape; only the exact text "KEEP GOING"; no other readable text; no watermark
```

`calendar-coffee-stamp-paper.webp`：

- Prompt 方向：右下白色咖啡印章纸，类似原型 `COFFEE FUEL YOUR DAY` 圆章。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay paper stamp for a calendar scene
Primary request: a white torn paper with a circular coffee stamp for a desk calendar scene
Scene/backdrop: isolated paper on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: off-white torn paper square with tape marks and a circular coffee stamp, coffee cup line icon in the center, thick ink texture
Style/medium: polished 2D raster illustration, crisp paper edge, subtle vintage stamp
Composition/framing: square paper, slightly rotated, centered
Text (verbatim): "COFFEE" and "FUEL YOUR DAY"
Color palette: warm white paper, brown stamp ink, beige tape
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the paper; do not use #00ff00 anywhere in the subject; only the exact text "COFFEE" and "FUEL YOUR DAY"; no other readable text; no watermark
```

`calendar-coffee-ring-stain.webp`：

- Prompt 方向：右下浅咖啡杯渍环，作为低对比背景 prop。
- 背景：纯色 chroma-key。

```text
Use case: stylized-concept
Asset type: alpha overlay subtle coffee stain for a calendar desk scene
Primary request: a light coffee cup ring stain for a paper desk background
Scene/backdrop: isolated stain on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: translucent coffee ring stain and a few tiny droplets, no cup, no paper
Style/medium: polished 2D raster illustration, soft but clean edge
Composition/framing: square object, centered
Color palette: pale brown, warm beige
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the stain; do not use #00ff00 anywhere in the stain; no text; no logos; no watermark
```

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

处理后用 `magick identify -verbose <alpha.png>` 确认 alpha channel。若没有 alpha、边缘有明显色边、生成文本错字或出现额外文字，只重生成对应 asset。

### 压缩方式

建议 staging 目录：

```bash
mkdir -p /private/tmp/share-project-home-scenes-calendar/raw \
  /private/tmp/share-project-home-scenes-calendar/alpha \
  /private/tmp/share-project-home-scenes-calendar/resized \
  public/assets/home-scenes/calendar
```

处理目标：

- 背景图在桌面大屏下不糊。
- 小装饰图不能过大。
- 保持边缘清晰，避免透明边缘毛边。
- 不把大图直接以原始生成尺寸放进项目。

压缩规则：

- `calendar-desk-bg.webp`：最大宽度 2560px，`cwebp -q 82`，目标小于 450 KB。
- `binder-paper-texture.webp`：最大宽度 1800px，`cwebp -q 84`，目标小于 260 KB。
- 大装饰图：最大边 720px，`cwebp -q 86`，目标小于 160 KB。
- 小装饰图：最大边 620px，`cwebp -q 88`，目标小于 120 KB。
- 最终只提交 `.webp`。

示例命令：

```bash
magick /private/tmp/share-project-home-scenes-calendar/raw/calendar-desk-bg.png \
  -resize 2560x1440\> \
  /private/tmp/share-project-home-scenes-calendar/resized/calendar-desk-bg.png

cwebp -q 82 \
  /private/tmp/share-project-home-scenes-calendar/resized/calendar-desk-bg.png \
  -o public/assets/home-scenes/calendar/calendar-desk-bg.webp
```

## 目标设计

### 页面结构

`CalendarBoard` 的视觉结构：

```text
calendar-scene
  calendar-scene-background
    calendar-desk-bg
  calendar-scene-props
    binder clip / highlighter / just lift sticker / purple note / coffee stamp / coffee stain / rings
  calendar-scene-content
    calendar-binder-shell
      calendar-paper-surface
        CalendarHeader
        calendar-summary-row
        CalendarGrid
```

规则：

- `calendar-scene` 负责页面边界、背景裁切和 props 安全区。
- `calendar-scene-background` 只放桌面底图。
- `calendar-scene-props` 只放装饰图，`pointer-events: none`。
- `calendar-scene-content` 承载真实日历组件。
- `calendar-binder-shell` 负责活页本厚纸边、本脊和阴影。
- `calendar-paper-surface` 负责白色纸面、纸纹、主边框和内容 padding。

最低 CSS contract：

```css
.calendar-scene {
  position: relative;
  isolation: isolate;
  min-height: 100%;
  overflow: hidden;
  border-radius: 1.65rem;
}

.calendar-scene-background,
.calendar-scene-props {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

.calendar-scene-background {
  z-index: 0;
}

.calendar-scene-props {
  z-index: 1;
}

.calendar-scene-content {
  position: relative;
  z-index: 2;
}
```

### CalendarBoard

目标：

- 替换当前基础 `soft-card calendar-board-shell` 的视觉职责。
- 保留 `busy`、`error`、`snapshotCache`、`viewedMonthKey`、`loadMonth` 和 `calendar:refresh` 行为。
- 只新增 scene wrappers 和装饰图片。
- 主纸面在桌面居中，最大宽度接近原型，宽屏时左右 props 仍可见。
- 主纸面高度适配内容，不能因为装饰图造成滚动遮挡。

桌面布局：

- `calendar-board-viewport` 仍可作为滚动容器。
- `calendar-scene` 填满可视 tab stage。
- `calendar-paper-surface` 使用 2.2rem 到 3rem padding。
- 左侧本脊/rings 靠近纸面左边缘，但不覆盖标题和表格。

### CalendarHeader

目标结构：

```text
header
  left cluster
    eyebrow: Monthly Record View
    title row
      h1: 牛马日历
      divider
      month label with purple highlight stroke
  right actions
    上个月
    回到本月
```

规则：

- `Monthly Record View` 保留英文，但改成紫色小标签，前面可用 CSS 小星点。
- `牛马日历` 与月份 label 在桌面同一行。
- 月份 label 使用大号粗体，如 `2026年5月`。
- 月份下方紫色笔划由 CSS pseudo-element 实现。
- `上个月` 是白底按钮。
- `回到本月` 是黄底按钮。
- `回到本月` 在当前月也固定渲染；当前月时 disabled 或 no-op，但视觉位置不消失。
- `busy` 时两个按钮 disabled，保持可见。

### Summary Chips

目标：

- 两个横向统计 chip 位于 header 下方。
- 左 chip：绿色圆形训练图标，文案 `本月练了`，大数字，单位 `天`。
- 右 chip：橙色圆形咖啡图标，文案 `本月喝了`，大数字，单位 `杯`。
- chip 是浅绿色/浅橙色纸面底，粗黑边框和实体阴影。
- 数字使用更大字号，颜色分别偏绿和橙。

规则：

- 不新增统计。
- 不改变 `snapshot.workoutDays` 和 `snapshot.coffeeCupTotal`。
- 数字和单位是文本，不烘焙进图片。

### CalendarGrid

目标：

- 从有 gap 的 card grid 改为连续纸面表格。
- 星期 header 与 day grid 共用表格宽度。
- 表格外框为浅灰线，内部行列线为浅灰线。
- 每个 day cell 是表格单元，不再单独大圆角。
- 当前月日期清晰，邻月日期灰色。

数据与视觉规则：

- 当前 `buildCalendarGrid` 已支持 leading blanks；实现时把 blank 视觉升级为邻月日期 `neighbor-day` cell。
- `neighbor-day` cell 只显示灰色数字，不显示训练/咖啡记录。
- 月末 trailing `neighbor-day` cell 可按 7 列补齐到完整周，必要时显示下月灰色数字。
- `neighbor-day` cell 不触发任何请求，不参与 totals。
- 仍不允许 future month navigation。

### CalendarDayCell

目标状态：

- 普通当前月日期：
  - 左上角显示日期数字。
  - 有训练时右上角显示绿色圆形 `练` 章。
  - 有咖啡时右下角显示橙色咖啡 icon + 数字。
  - 无训练且无咖啡时居中显示灰色短横线。
- 今天：
  - 浅黄色背景。
  - 粗黑外框和内层黑边。
  - 实体阴影。
  - 日期数字带黄色小底。
- 邻月日期：
  - 只有灰色日期数字。
  - 背景不抢眼。

规则：

- 咖啡从“重复图标”改成“单个 icon + 数字”，这是视觉表达变化，不改变 `coffeeCups` 语义。
- `coffeeCups === 0` 不显示咖啡 icon。
- `workedOut === false` 不显示 `练` 章。
- 空日短横线只表示无记录，不是可点击控件。
- day cell 保持只读，不添加 click handler。

## Responsive 规则

桌面宽度大于 1024px：

- 展示完整左右 props。
- 主纸面左右有足够空间，优先还原原型比例。
- Header 标题、月份、按钮同一行。
- Summary chips 两列。
- 月历表格正常铺满纸面。

宽度 761px 到 1024px：

- 弱化或缩小左右 props。
- 主纸面 padding 降低。
- Header 可允许按钮换到下一行右侧。
- 月历保持七列，不横向滚动。

宽度小于 760px：

- 隐藏大型 props：长尾夹、荧光笔、右侧便签、咖啡印章纸。
- 保留轻量纸面背景和活页本主 surface。
- Header 改为纵向：标题/月分先读，按钮下一行。
- Summary chips 仍两列；如果最窄宽度文本拥挤，改为单列。
- Day cell 使用固定最小高度和较小字体，保证 `练` 章、咖啡数字和短横线不重叠。
- 不隐藏真实日期和记录状态。

## Motion 与 reduced motion

允许：

- scene 入场时主纸面轻微 `translateY` + opacity。
- props 入场轻微 stagger。
- 今日 cell 可有极轻微 hover 抬起，但只在 pointer fine 设备启用。

禁止：

- 装订环、夹子、便签持续摇晃。
- 表格线或 day cell layout 属性动画。
- 影响阅读的背景漂移。

`prefers-reduced-motion: reduce` 下：

- 关闭 scene/props 入场 stagger。
- 关闭 hover transform。
- 保留颜色和 disabled 状态变化。

## 测试策略

### Asset Contract Test

新增：

```text
__tests__/home-ui-calendar-assets.test.ts
```

断言：

- `public/assets/home-scenes/calendar/` 下所有必需 `.webp` 存在。
- 每个文件小于对应体积预算。
- 背景资源不是误放到 `$CODEX_HOME/generated_images` 或 `/private/tmp`。

### Component/CSS Contract Test

新增：

```text
__tests__/home-ui-calendar-scene.test.tsx
```

断言：

- `CalendarBoard` 渲染 `calendar-scene`、`calendar-scene-background`、`calendar-scene-props`、`calendar-scene-content`。
- props 图片路径全部来自 `/assets/home-scenes/calendar/`。
- Header 固定渲染 `上个月` 和 `回到本月`。
- Summary chips 包含 `本月练了`、`本月喝了`、数字和单位。
- day cell 有 `calendar-workout-chip`、`calendar-coffee-count`、`calendar-empty-mark`、`calendar-day-cell-today`。
- 邻月 `neighbor-day` cell 使用独立 class，不参与业务状态渲染。

### Existing Tests To Update

- `__tests__/calendar-board.test.tsx`
  - 更新咖啡显示断言：从重复 icon 改为 compact count。
  - 更新 `回到本月` 固定渲染行为。
- `__tests__/calendar-data.test.ts`
  - 如果 helper 增加邻月 `neighbor-day` cell，补充首周/末周 `neighbor-day` 测试。
- `__tests__/coffee-tab.test.tsx`
  - 如果导航或 icon class 受到 scene CSS 影响，只更新视觉 class 断言，不改 tab 顺序。

### Manual Visual Verification

实现完成后必须检查：

- 桌面 viewport：`1440x900`。
- 宽桌面 viewport：`1728x1117`。
- 平板窄屏：`900x900`。
- 手机 viewport：`390x844`。

检查点：

- 原型中的主纸面比例、标题关系、summary chips 和月历表格优先对齐。
- 左右 props 不遮挡真实文字、按钮或日期。
- `2026年5月` 这类长月份标题不和按钮重叠。
- `coffeeCups >= 10` 时数字仍在 day cell 内可读。
- 当前月、历史月、加载态、错误态都在同一 scene 中显示。
- reduced motion 下没有持续动画。

## 验收标准

- `牛马日历` 在桌面上第一眼接近 `design/ui-assets/tab-牛马日历.png` 的桌面活页本月历结构。
- 所有新图片经过生成、抠图、压缩，并保存到 `public/assets/home-scenes/calendar/`。
- 应用代码不引用 raw 生成路径。
- 所有日历业务行为保持不变：只读、可回看上月、可回到本月、不进入未来月份。
- summary totals 继续来自 `CalendarMonthSnapshot`。
- day cell 只改变视觉表达，不改变记录含义。
- 移动端不因追求桌面原型而损失可读性或操作可达性。
- `npm test` 中新增/更新的日历 UI tests 通过。
- `npm run lint` 和 `npm run build` 通过。
