# Home UI 03 Coffee Receipt Counter Design

> 第三份页面级 UI spec：把 `续命咖啡` tab 升级为咖啡小票台。只改 UI、布局、动效和媒体资源，不改变咖啡打卡数据模型、接口、增减杯数语义、实时动态同步或跨页面刷新事件。

## 背景

前置基线：

- `docs/superpowers/plans/2026-05-03-home-ui-01-punch-scene-foundation.md`
- `docs/superpowers/specs/2026-05-03-home-ui-01-punch-scene-foundation-design.md`
- `docs/superpowers/specs/2026-05-04-home-ui-02-shared-board-note-wall-design.md`
- `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

Spec 01 已完成共享视觉底座和 `健身打卡` 样板页。Spec 02 已把 `共享看板` 迁移到办公室便签墙。Spec 03 进入 `续命咖啡` tab，只覆盖：

- `CoffeeCheckin`
- `CoffeeReceipt`
- `CoffeeGrid`
- `CoffeeActivityFeed`
- coffee calendar dialog

目标原型图：

- `design/ui-assets/tab-续命咖啡.png`

核心视觉隐喻：**续命咖啡小票台**。页面应该像一张铺在办公桌上的咖啡记录台：左侧是撕边小票和实时打印日志，右侧是团队续命月历，周围散落外带杯、糖包、咖啡豆、贴纸和纸张夹子。

## 严格范围

### 包含

- 当前 `续命咖啡` UI 审核和与原型差异整理。
- 缺失媒体元素 checklist。
- 每个缺失图片的 `imagegen` 生成要求。
- 图片抠图、压缩、尺寸预算和入库规范。
- `CoffeeCheckin` 页面级 scene shell。
- `CoffeeReceipt` 左侧今日小票、统计卡、杯数控制和实时动态视觉升级。
- `CoffeeGrid` 右侧团队续命月历视觉升级。
- coffee calendar dialog 视觉升级。
- responsive 和 reduced-motion 规则。
- 结构、资源、CSS contract、组件行为和浏览器视觉检查策略。

### 不包含

- 不改 Prisma schema。
- 不改 `/api/coffee/state`、`/api/coffee/cups`、`/api/coffee/cups/latest` contract。
- 不改 `/api/activity-events?kind=coffee` polling 语义。
- 不改 `CoffeeSnapshot` 字段。
- 不改 `CoffeeProvider` 对外方法名或 mutation 流程。
- 不改杯数增减规则。
- 不改 `calendar:refresh` 和 `activity-events:refresh` 事件。
- 不新增咖啡排行榜、咖啡券、积分、惩罚、统计口径或 admin 管理能力。
- 不用假成员、假日期、假杯数填补原型。
- 不为了像原型新增不能工作的按钮。

## 当前 UI 审核

### 现有能力

当前咖啡页已经有完整业务闭环：

- `CoffeeCheckin` 通过 `CoffeeProvider` 加载 snapshot。
- 未加载时显示 loading，认证失败或请求失败时显示可操作错误态。
- `CoffeeReceipt` 展示今日总杯数、今日续命人数、我的今日杯数、今日咖啡王。
- 左侧可以直接 `+1 杯` 和 `-1 杯`。
- `CoffeeGrid` 展示成员、日期、历史杯数、未来日期、今日当前用户可点单元格。
- 点击当前用户今日格子会打开确认/调整 dialog。
- `CoffeeActivityFeed` 每 5 秒拉取咖啡动态，并响应 `activity-events:refresh`。
- add/remove mutation 成功后会触发 `calendar:refresh` 和 `activity-events:refresh`。
- 桌面和移动端已经分成两套 coffee grid 结构，移动端保留横向数据表可用性。

这些行为都必须保留。

### 原型关键特征

原型中的 `续命咖啡` 有这些强视觉信号：

- 黑色顶部导航，当前 tab 是黄色高亮。
- 页面底是浅色纸面/咖啡台纹理。
- 主体左侧是一张白色撕边咖啡小票，粗黑边框和打孔/撕纸感明显。
- 小票顶部有虚线分隔、标题 `今日咖啡小票`、统计格和杯数控制。
- 实时动态是一张独立小票，继续使用撕边底部。
- 右侧是最大主内容面：`团队续命月历`，白色纸面、粗黑边框、顶部标题栏和咖啡杯图标。
- 月历今日列是青绿色竖向高亮，今天 header 写 `今天`。
- 成员列使用头像、名称和当前用户 `我` badge。
- 有杯数的格子像咖啡小票印章：浅黄底、咖啡杯 icon、杯数。
- 空历史格子是虚线框，未来日期是短横线占位。
- 当前用户今日单元格在底部有较大的青绿色操作卡。
- 页面两侧有媒体 props：左侧外带杯、`NO COFFEE NO GAIN` 纸条、糖包、咖啡豆和杯渍；右侧 `BUT FIRST, COFFEE` 纸条、咖啡豆、咖啡印章纸、黑色夹子。

### 当前缺口

当前 UI 与原型相比缺少：

- 页面级 `coffee-scene / background / props / content` 分层。
- 咖啡台纸面/桌面场景背景。
- 左右两侧咖啡 props 媒体元素。
- 左侧小票撕边和纸张纹理。
- 统计卡目前是普通卡片，缺少原型中的小票格子和黑色 icon 层级。
- 杯数控制区目前偏普通控件，缺少大号青绿色主按钮和中间“当前杯数”小票布局。
- 实时动态还像普通 feed panel，缺少打印日志和撕边小票感。
- 右侧月历主面边框较淡，缺少原型中的大纸面比例、标题栏、今日列强高亮和咖啡杯状态语言。
- 当前用户 `我` badge 只在打卡页强化过，咖啡页仍需要对齐。
- coffee dialog 仍是基础弹窗，没有咖啡小票/确认单风格。
- 没有咖啡页专用资源 contract 测试。

## 媒体元素 Checklist

最终图片统一进入：

```text
public/assets/home-scenes/coffee/
```

| 用途 | 文件名 | 类型 | 尺寸上限 | 体积上限 |
| --- | --- | --- | --- | --- |
| 咖啡台纸面背景 | `coffee-counter-bg.webp` | opaque WebP | 2560x1440 | 450 KB |
| 小票纸张纹理 | `receipt-paper-texture.webp` | opaque WebP | 1400x1800 | 320 KB |
| 外带咖啡杯 | `takeaway-cup.webp` | alpha WebP | 720x900 | 180 KB |
| 左侧纸条 | `note-no-coffee-no-gain.webp` | alpha WebP | 720x720 | 160 KB |
| 右上纸条 | `note-but-first-coffee.webp` | alpha WebP | 720x720 | 160 KB |
| 黄色糖包 | `sugar-packet.webp` | alpha WebP | 640x420 | 120 KB |
| 咖啡豆散落组 | `coffee-beans.webp` | alpha WebP | 640x640 | 120 KB |
| 咖啡杯渍 | `coffee-ring-stain.webp` | alpha WebP | 640x640 | 100 KB |
| 咖啡印章纸 | `coffee-stamp-paper.webp` | alpha WebP | 720x820 | 160 KB |
| 黑色票据夹 | `receipt-clip.webp` | alpha WebP | 640x640 | 120 KB |

CSS 负责这些内容，不生成图片：

- 小票底部撕边。
- 虚线分隔线。
- 统计格内 icon 背景。
- 月历单元格边框、虚线框、未来短横线。
- 今日列青绿色高亮。
- 当前用户 `我` badge。
- 动态日志虚线分隔。
- dialog 遮罩、按钮和小票式容器。

## 图片生成与处理规范

### 生成方式

- 使用 `imagegen` skill 的 built-in tool mode。
- 每个 asset 单独生成，不用一个大图切片。
- implementation plan 中每个生图 asset 必须是独立 task。该 task 完成的定义是：图片已生成、已按 opaque/alpha 规则处理、已压缩为 WebP、已保存到 `public/assets/home-scenes/coffee/`、已完成单文件验证，并且对应文件已可被 git 跟踪。
- 背景图可以是不透明图。
- 装饰元素必须生成在纯色 chroma-key 背景上。
- 默认 chroma-key 是 `#00ff00`。
- 如果主体中需要绿色或青绿色，改用 `#ff00ff`。
- 所有 raw 生成图先放在 `/private/tmp/share-project-home-scenes-coffee/raw/`。
- raw 图不进入 `public/`。

### 逐项生图要求

`coffee-counter-bg.webp`：

- Prompt 方向：浅色办公桌/咖啡台纸面背景，带轻微纸纹、咖啡渍、低对比 dotted texture，16:9，中央留白给 UI。
- 禁止：人物、真实品牌 logo、可读大段文字、暗角、渐变球、重设备遮挡。

`receipt-paper-texture.webp`：

- Prompt 方向：干净白色小票纸张纹理，轻微纤维、浅灰边缘、适合叠在 UI surface 内。
- 禁止：预印文字、真实商标、过重污渍。

`takeaway-cup.webp`：

- Prompt 方向：外带咖啡杯，牛皮纸杯套，粗黑描边，贴近原型左侧大杯。
- 文字限制：只允许 `COFFEE` 和 `FUEL YOUR GRIND`。
- 背景：纯色 chroma-key。

`note-no-coffee-no-gain.webp`：

- Prompt 方向：白色撕边纸条、胶带、简单咖啡杯线稿。
- 文字限制：只允许 `NO COFFEE NO GAIN`。
- 背景：纯色 chroma-key。

`note-but-first-coffee.webp`：

- Prompt 方向：白色 taped note，略微旋转，纸张阴影。
- 文字限制：只允许 `BUT FIRST, COFFEE`。
- 背景：纯色 chroma-key。

`sugar-packet.webp`：

- Prompt 方向：黄色糖包，brutalist 黑描边，轻微纸包褶皱。
- 文字限制：只允许 `SUGAR`。
- 背景：纯色 chroma-key。

`coffee-beans.webp`：

- Prompt 方向：几颗咖啡豆散落组，厚描边，轻微高光，可重复摆放。
- 禁止：杯子、文字、品牌。
- 背景：纯色 chroma-key。

`coffee-ring-stain.webp`：

- Prompt 方向：透明感咖啡杯渍环、浅褐色水渍、不抢焦点。
- 禁止：实体杯子、文字。
- 背景：纯色 chroma-key。

`coffee-stamp-paper.webp`：

- Prompt 方向：叠放纸片上的圆形咖啡印章，类似原型右侧 `COFFEE KEEP GOING`。
- 文字限制：只允许 `COFFEE` 和 `KEEP GOING`。
- 背景：纯色 chroma-key。

`receipt-clip.webp`：

- Prompt 方向：黑色票据夹/文件夹夹子，粗描边，适合放在右下角。
- 禁止：文字、品牌。
- 背景：纯色 chroma-key。

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

处理后用 `magick identify` 确认 alpha channel。若没有 alpha、边缘有明显色边、生成文本错字或出现额外文字，只重生成对应 asset。

### 压缩方式

- 背景图 resize 后用 `cwebp -q 82`。
- 小票纸纹 resize 后用 `cwebp -q 84`。
- 装饰图 resize 后用 `cwebp -q 86`。
- 咖啡豆、杯渍、夹子等小图用 `cwebp -q 88`。
- 最终只提交 `.webp`。
- 页面代码只能引用 `/assets/home-scenes/coffee/<filename>`。

## 目标设计

### 页面结构

`CoffeeCheckin` 的视觉结构：

```text
coffee-scene
  coffee-scene-background
  coffee-scene-props
    takeaway cup / notes / sugar packet / beans / stain / stamp paper / clip
  coffee-scene-content
    coffee-counter-layout
      coffee-receipt-stack
        CoffeeReceipt
          today receipt
          realtime receipt
      coffee-calendar-paper
        CoffeeGrid
          desktop grid
          mobile grid
      coffee dialog
```

`coffee-scene-content` 是内容安全区。桌面主布局保持左窄右宽，接近原型：左侧约 30%，右侧约 70%。右侧月历是主视觉中心，左侧小票作为操作入口和动态输出。

### CoffeeCheckin

- 新增 `coffee-scene` 外层，继承首页 scene shell 规则。
- loading 和 error 状态也放在 coffee scene 中，不能退回旧橙色空白卡片。
- 桌面使用两列布局：左侧 receipt stack，右侧 calendar paper。
- 大屏显示左右 props；小屏隐藏大部分 props，只保留背景纸纹。
- 内容层要有 safe area，避免 props 压住按钮、表格和 dialog。

### CoffeeReceipt

左侧小票从普通卡片改成撕边票据：

- 顶部标题保留 `今日咖啡小票`。
- 英文 eyebrow 可以保留，但视觉降级为小票印刷行。
- 统计卡变成 2x2 小票格子，保留现有四个值：
  - 今日总杯数
  - 今日续命人数
  - 我的今日杯数
  - 今日咖啡王
- 统计格中使用现有 icon 或 CSS icon 语言，不新增统计语义。
- `-1 杯`、当前杯数、`+1 杯` 保持三段式；`+1 杯` 是青绿色主按钮，`-1 杯` 是白色/浅灰次按钮。
- `CupStack` 可继续存在，但视觉要更像小票上的杯子印章；如果空间不足，移动端隐藏杯堆只保留数字。
- error 文案继续显示在控制区下方。

### CoffeeActivityFeed

实时动态改成独立打印日志小票：

- 标题保留 `实时动态`。
- 同步状态保留三态：`已同步`、`同步中`、`同步失败`。
- `aria-label="咖啡实时动态"` 保留。
- 空状态文案继续是 `今天还没有咖啡打卡`。
- event 行保留时间、头像、文本。
- 行间用虚线分隔，形成打印机流水日志。
- feed 最大高度要稳定，不能因为事件数量变化挤压上方杯数控制。

### CoffeeGrid

右侧月历从普通白卡改成主纸面：

- desktop shell 变为 `coffee-calendar-paper`，粗黑边框，轻微纸纹背景。
- header 左侧保留 `团队续命月历`，右侧使用咖啡杯图形或 CSS/现有 `AssetIcon`。
- legend 从文字列表改成小状态 chip：已续命、空杯、今天。
- members 列宽稳定，头像更接近原型尺寸。
- 当前用户行在头像旁显示黄色 `我` badge。
- 日期 header 显示日期和星期；当前实现只有 day number，implementation plan 需要用已有 `today/totalDays` 加本地日期计算显示 `05-16 / 今天` 这种视觉，不新增数据字段。
- 今日列使用青绿色竖向高亮，header 写 `今天`。
- 有杯数单元格使用咖啡杯 icon + 杯数，浅黄小票底。
- 空历史单元格使用浅灰虚线框。
- 未来单元格使用短横线，降低视觉重量。
- 当前用户今日单元格可点击时要比其他格更明确；当已有杯数时，可呈现原型底部大号青绿色状态卡，但仍只触发现有 dialog。
- mobile shell 继续保留横向表格，不强行压成不可读卡片。

### Coffee Dialog

coffee calendar dialog 改成小票确认单：

- `role="dialog"`、`aria-modal="true"`、`aria-labelledby` 保留。
- 标题文案保留当前两种状态：
  - `确认今天喝咖啡？`
  - `调整今天的杯数`
- 描述文案保留当前语义。
- 按钮保留：取消、`-1 杯`、`确认 1 杯` / `+1 杯`。
- 容器改成白色小票纸，粗黑边框，底部撕边或虚线。
- 不新增关闭图标；点击取消仍是唯一显式取消入口。

## 响应式规则

- 桌面优先还原原型，两列布局和右侧大月历必须稳定。
- `max-width: 980px` 下改为单列：先显示 `CoffeeReceipt`，再显示 `CoffeeGrid`。
- 移动端隐藏 `takeaway-cup`、两张纸条、糖包、夹子等大 props，保留轻纸纹背景。
- 移动端 receipt 不允许文字溢出按钮；`coffee-today-controls` 可从三列降为紧凑三列或两行。
- 移动端 `CoffeeGrid` 继续横向滚动，因为这是固定格式数据表；成员列 sticky 保留。
- 小屏边框厚度可以从 4-6px 降到 2-3px，但主内容面不能退回直角。
- 所有按钮在触屏上必须保持可见，不依赖 hover。

## Motion 和 Reduced Motion

允许：

- 页面进入的轻量 opacity / translate。
- 按钮 hover / press 反馈。
- 同步状态点轻微 pulse。
- 今日列轻微 highlight transition。

禁止：

- 背景咖啡杯或 props 长时间漂浮。
- 月历单元格循环动画。
- feed 行自动闪烁抢焦点。
- dialog 弹出时大幅 bounce。

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  .coffee-scene *,
  .coffee-scene *::before,
  .coffee-scene *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    scroll-behavior: auto;
    transition-duration: 0.01ms;
  }
}
```

## 测试策略

### 资源测试

新增 `__tests__/home-ui-coffee-assets.test.ts`：

- 验证 `public/assets/home-scenes/coffee/` 下所有必需 `.webp` 存在。
- 验证每个资源不超过 checklist 中的体积预算。

### 结构测试

新增 `__tests__/home-ui-coffee-scene.test.tsx` 或扩展 `__tests__/coffee-checkin.test.tsx`：

- `CoffeeCheckin` 渲染 `coffee-scene`。
- `coffee-scene-background`、`coffee-scene-props`、`coffee-scene-content` 存在。
- 页面引用 `/assets/home-scenes/coffee/takeaway-cup.webp` 等关键 props。
- loading 和 error 状态仍在 coffee scene 内展示。
- `CoffeeReceipt` 仍显示四个现有统计值。
- `CoffeeActivityFeed` 仍保留 `aria-label="咖啡实时动态"`。
- `CoffeeGrid` 当前用户今日格子仍可打开 dialog。

### CSS Contract 测试

新增 `__tests__/home-ui-coffee-scene-css.test.ts`：

- `.coffee-scene` 有大圆角、`isolation: isolate`。
- `.coffee-scene-background` 和 `.coffee-scene-props` 继承圆角。
- `.coffee-scene-props` 有 `pointer-events: none`。
- `.coffee-calendar-paper` 或等价主面有粗黑边框。
- `.coffee-receipt` 保留票据式边框和撕边 pseudo-element。
- reduced motion 规则覆盖 `.coffee-scene`。

### 行为回归测试

保留并必要时更新现有 `__tests__/coffee-checkin.test.tsx`：

- 加杯和减杯仍调用原 API。
- mutation 成功后仍 dispatch `calendar:refresh` 和 `activity-events:refresh`。
- 未授权初始加载仍显示重新登录和刷新重试。
- 从月历确认第一杯仍先打开 dialog，不直接调用 add API。

### 浏览器检查

实现阶段每次明显 UI 改动必须检查：

- desktop 1672x941 或接近原型比例。
- desktop 1280x800。
- mobile 390x844。
- 当前 active tab 仍为黄色。
- 左侧小票、实时动态和右侧月历比例接近原型。
- props 不遮挡表格、按钮、feed、dialog。
- 文本不溢出统计格、按钮和月历单元格。

自动测试负责防回归；浏览器检查负责判断“是否像原型”和“是否可用”。

## 验收 Checklist

### 结构验收

- 页面有 `coffee-scene`。
- 背景层、装饰层、内容层顺序正确。
- 装饰元素不放进业务组件内部。
- 内容层有 safe area。
- 背景层和装饰层继承 scene 圆角。

### 媒体验收

- 所有必需资源已生成、处理、压缩并进入 `public/assets/home-scenes/coffee/`。
- raw 生成图没有进入 `public/`。
- alpha asset 无明显 chroma-key 色边。
- 生成文字没有错字或额外文字。
- 页面代码只引用 `/assets/home-scenes/coffee/<filename>`。

### 视觉验收

- 整体接近原型的小票台场景。
- 左侧小票和右侧月历比例接近原型。
- 右侧月历是主视觉，不被左侧或装饰抢焦点。
- 今日列青绿色高亮清楚。
- 当前用户 `我` badge 清楚但不遮挡姓名。
- 小票撕边、虚线、统计格和动态日志形成一致纸张语言。
- 页面继承黑色导航、黄色 active tab、粗边框和实体阴影。

### 业务验收

- 现有 API contract 不变。
- 现有状态语义不变。
- 现有失败态仍可见。
- 现有可访问名称和 dialog 行为保留。
- 现有跨页面刷新事件保留。

### 响应式验收

- 桌面视口下与原型主结构接近。
- 移动视口下核心操作可完成。
- 文本不溢出。
- 大装饰隐藏后页面仍成立。
- 月历横向滚动可用，成员列不遮挡单元格。

## 实现顺序建议

1. 先写资源 contract 测试。
2. 按 checklist 逐个使用 `imagegen` 生成 asset。
3. 对每个 alpha asset 做 chroma-key 抠图。
4. 压缩并保存到 `public/assets/home-scenes/coffee/`。
5. 建立 `CoffeeCheckin` scene shell。
6. 改造 `CoffeeReceipt` 小票和 `CoffeeActivityFeed` 打印日志。
7. 改造 `CoffeeGrid` 月历纸面、今日列、成员列和单元格状态。
8. 改造 coffee dialog。
9. 补结构、CSS contract、行为回归测试。
10. 跑浏览器视觉检查，对照 `design/ui-assets/tab-续命咖啡.png` 做最后校准。
