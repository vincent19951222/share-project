# Home UI Image Prototype Workflow Design

> 从图片格式原型图出发，统一首页各 tab 的 UI 优化 workflow。目标不是机械贴图，而是把原型拆成可维护、可响应、可测试的页面级 scene 和组件规范。本文档是跨页面规则；单页 spec 只记录该页的场景隐喻、资源清单和差异实现。

## 背景

已有总纲：

- `docs/superpowers/specs/2026-05-02-home-ui-scene-refresh-design.md`

已有样板页：

- `docs/superpowers/specs/2026-05-03-home-ui-01-punch-scene-foundation-design.md`
- `docs/superpowers/specs/2026-05-04-home-ui-02-shared-board-note-wall-design.md`

`健身打卡` 已经证明了一个更稳定的方向：先建立页面级 scene，再把业务组件放进内容层。后续 `共享看板` 的调整也暴露出一个问题：只还原大结构不够，圆角、边框、阴影、内容安全区、装饰层归属这些小规则也必须统一，否则会出现“整体像了，但细节不像同一套产品”的问题。

## 目标

1. 建立从图片原型图到代码实现的标准 workflow。
2. 确保后续 UI 优化优先复用已建立的产品级视觉规范。
3. 避免每个页面重复讨论 scene 分层、圆角、资源入库、测试方式。
4. 让“像素级还原”转化为可维护的布局、资源和 CSS contract。
5. 保证 UI 优化不改变业务数据、接口、权限、同步机制或状态语义。

## 非目标

- 不要求所有页面使用同一张背景或同一种场景隐喻。
- 不要求完全逐像素硬编码图片坐标。
- 不新增业务功能、统计口径、入口、按钮或管理能力。
- 不用截图测试替代人工视觉判断。
- 不把装饰图当作业务状态来源。
- 不为了还原图片而牺牲移动端可用性。

## 核心原则

### 先建 Scene，再调元素

页面优化的第一步必须是建立页面级 scene，而不是逐个移动装饰元素。

标准结构：

```text
<feature>-scene
  <feature>-scene-background
  <feature>-scene-props
  <feature>-scene-content
    existing business components
```

规则：

- `scene` 是页面视觉边界。
- `background` 只放墙面、地面、纸面、纹理等底图。
- `props` 只放海报、哑铃、马克笔、贴纸、回形针等装饰元素。
- `content` 承载真实业务组件和交互。
- 业务组件不得依赖装饰图的位置才能正常可用。
- 装饰元素不得放进业务组件内部，除非它是该组件真实结构的一部分。

### 圆角、边框、阴影是系统规则

这些不是单页随手调的数值。每个页面必须沿用同一套层级语义：

| 层级 | 用途 | 默认规则 |
| --- | --- | --- |
| Scene shell | 整个 tab 的场景容器 | 大圆角，负责页面级裁切 |
| Main surface | 主业务内容面，如打卡墙、软木板、报表纸 | 接近 `soft-card` 的圆角和粗边框 |
| Sub surface | 内部表单、面板、日志条 | 中等圆角，保持 brutalist 边框 |
| Object card | 便签、票据、单个小卡 | 可小圆角或纸张直角，但必须符合场景隐喻 |
| Control | 按钮、chip、swatch、toggle | 按控件类型统一，不跟随装饰图临时变化 |

当前参考值：

- Scene shell: `1.65rem`
- Main surface: `1.25rem` 到 `1.5rem`
- Sub surface: `0.75rem` 到 `1.15rem`
- Paper / note object: `0.25rem` 到 `0.5rem`，除非原型明确是圆角纸片
- Pill / avatar / badge: `9999px`

如果某个页面需要偏直角，必须在单页 spec 中说明原因，例如“便签纸张、票据撕边、像素卡牌”。

### 像素级还原是分层还原

“像素级”不等于把每个元素写成独立绝对坐标。正确顺序是：

1. 还原页面场景边界。
2. 还原主内容面的位置、比例、留白。
3. 还原内容层内的业务组件关系。
4. 还原装饰层大致位置和遮挡关系。
5. 还原小控件样式和状态。
6. 做响应式降级。

当原型图和真实业务内容冲突时，优先保证真实业务内容可读、可操作、可扩展。

### 设计系统优先于单张原型

原型图用于表达目标方向，但不能覆盖已建立的产品规范。

必须继承：

- 黑色顶部导航 + 黄色 active tab。
- brutalist 粗边框和实体阴影。
- `Quicksand` + `Noto Sans SC` 字体系统。
- 场景化背景 + 内容安全区。
- reduced motion 降级。
- 已有业务组件和数据流。

允许变化：

- 每个 tab 的场景隐喻。
- 背景纹理和装饰图。
- 主内容面的材质，比如打卡墙、软木板、小票、月历、报纸。
- 局部纸张、图钉、胶带、票据等场景物件。

### 首页 Tab 密度统一

首页各 tab 必须共享同一套视觉密度，不允许每个页面按原型图各自放大或缩小。当前密度基线以 `健身打卡` 为准：桌面 100% 浏览器缩放下，页面应优先呈现完整 scene、主内容面和核心操作，而不是让用户先滚动才能理解全局。

统一方式应通过 CSS contract 和语义 class 控制，而不是使用 `zoom`、`transform: scale(...)` 或浏览器缩放假装对齐。

规则：

- `scene` / `scene-content` / 主布局容器优先使用一屏舞台模型：`height: 100%`、`min-height: 0`、稳定的 safe area。
- 多 tab 的内容安全区应尽量沿用同一档位，例如桌面 `padding-inline: clamp(7.5rem, 10vw, 12.5rem)`，除非单页 spec 明确说明差异。
- 共享看板、咖啡月历、日历等内容密集页面，应缩小局部卡片、行高、按钮和内部间距来贴合舞台，而不是扩大外层容器。
- 内容确实超过一屏时，只允许在主内容面或列表区域内部滚动；不要让整个 scene 因业务内容撑破背景和装饰关系。
- 背景层和 props 层必须继承或等价匹配 scene 的圆角裁切，避免内容层调整后露出直角背景。
- 组件里原本写死的 `h-*`、`w-*`、`text-*` 如果会影响跨 tab 密度，应抽成页面语义 class，由 `app/globals.css` 统一调控。

验收口径：

- `健身打卡` 不应因为对齐而明显放大网格，只允许补足过小文字。
- `共享看板` 不应像独立大画布，便签墙和发布区应收进同一个 scene。
- `续命咖啡` 不应在 100% 缩放下丢失全局，小票、统计块、按钮和月历行高必须与一屏舞台匹配。
- `牛马日历` 的主内容面和背景图都必须保留圆角关系，不能只有内容圆角、背景直角。

## 标准 Workflow

### 1. 收集输入

每次 UI 优化开始前，必须确认：

- 目标原型图路径。
- 当前项目预览截图或浏览器画面。
- 关联页面组件。
- 是否已有前置样板页或总纲 spec。
- 本次是否只改 UI，是否排除业务行为变更。

输出：

```text
目标原型：design/ui-assets/<name>.png
当前页面：localhost preview / screenshot
页面组件：components/<feature>/*
约束：不改 API / 数据 / 状态语义
```

### 2. 拆解原型图

必须先做结构分析，再动代码。

拆解维度：

- Scene shell：页面外框、圆角、背景色、裁切。
- Background：墙面、地面、纸纹、渐变、光影。
- Props：海报、贴纸、器械、笔、夹子、胶带等装饰。
- Main surface：主业务面板的位置、宽高、比例。
- Content hierarchy：真实信息的阅读顺序。
- Controls：按钮、toggle、swatch、input、状态 badge。
- Motion：哪些状态适合动效，哪些必须静态。
- Responsive：小屏隐藏哪些装饰，内容如何重排。

禁止直接从“红框里某个元素不对”开始改局部 CSS，除非页面已经满足 scene shell 和主内容面规范。

### 3. 对照样板页

优先对照已完成的 `健身打卡` 样板页：

- 是否已有 `scene / background / props / content` 分层。
- 主内容面的圆角、边框、阴影是否一致。
- 内容安全区是否有足够内边距。
- 装饰元素是否在 props 层。
- 背景和 props 是否继承 scene 裁切。
- 移动端是否隐藏或弱化装饰。

如果目标页面偏离样板页，必须判断是合理差异还是规范遗漏。

### 4. 写页面级 UI Spec

每个页面仍然需要单独 spec，但只写页面差异：

- 场景隐喻。
- 真实组件清单。
- 原型关键特征。
- 当前缺口。
- 媒体资源清单。
- 页面结构。
- 组件级样式目标。
- responsive 规则。
- 测试策略。

单页 spec 不重复本 workflow 的通用规则，只引用本文档。

### 5. 准备媒体资源

图片资源必须按用途拆开，不使用一张大图切片覆盖页面。

规则：

- 背景图可以是不透明 WebP。
- 装饰图应为 alpha WebP。
- raw 生成图放临时目录，不进 `public/`。
- 最终资源进入 `public/assets/home-scenes/<feature>/`。
- 文件名描述用途，不使用随机名称。
- 每个资源有尺寸和体积预算。

推荐目录：

```text
public/assets/home-scenes/punch/
public/assets/home-scenes/shared-board/
public/assets/home-scenes/coffee/
public/assets/home-scenes/calendar/
public/assets/home-scenes/report/
public/assets/home-scenes/supply/
```

### 6. 实现 Scene Shell

先建立页面结构，再调内容。

最低 CSS contract：

```css
.<feature>-scene {
  position: relative;
  isolation: isolate;
  min-height: 100%;
  border-radius: 1.65rem;
}

.<feature>-scene-background,
.<feature>-scene-props {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

.<feature>-scene-background {
  z-index: 0;
}

.<feature>-scene-props {
  z-index: 1;
}

.<feature>-scene-content {
  position: relative;
  z-index: 2;
}
```

页面若需要内部滚动，必须检查圆角裁切和滚动行为不会互相破坏。

### 7. 适配业务组件

业务组件只能做视觉和布局适配：

- 可以调整组件容器 class。
- 可以调整布局结构以匹配视觉层级。
- 可以增加纯装饰元素。
- 可以把 controls 重排为更符合原型的布局。

禁止：

- 改 API 请求路径或请求语义。
- 改 reducer action。
- 改数据字段含义。
- 改权限判断。
- 用假数据填补原型中不存在的真实模块。
- 为了视觉增加不能工作的按钮。

### 8. 响应式降级

桌面优先还原原型，但移动端必须可用。

规则：

- 小屏优先保留业务操作和文本可读性。
- 装饰 props 可以隐藏。
- 主内容面可以减少阴影和边框厚度，但不退回直角体系。
- 表格、日历、打卡墙等固定格式 UI 必须有稳定尺寸约束。
- 文字不得溢出按钮或卡片。
- 不能靠横向滚动隐藏主要操作，除非原组件已经是横向滚动数据表。

### 9. Motion 和 Reduced Motion

允许：

- 页面进入的轻量 opacity / translate。
- hover / press 反馈。
- 成功发布、打卡完成、同步状态的短反馈。

禁止：

- 长时间循环抢焦点。
- 背景或 props 大幅移动。
- 影响阅读表格、便签、报表的动效。

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  .<feature>-scene *,
  .<feature>-scene *::before,
  .<feature>-scene *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    scroll-behavior: auto;
    transition-duration: 0.01ms;
  }
}
```

## 验收 Checklist

### 结构验收

- 页面有 `*-scene`。
- 背景层、装饰层、内容层顺序正确。
- 装饰元素不在业务组件内部乱放。
- 内容层有 safe area。
- 背景层和装饰层继承 scene 圆角。

### 视觉验收

- 与原型图的主内容比例接近。
- 主内容面位置、宽度、上下留白接近原型。
- 小 UI 规范继承样板页，包括圆角、边框、阴影。
- 装饰元素不遮挡内容和操作。
- 当前 active tab、主操作按钮、状态 badge 保持产品一致性。
- 页面不像营销 hero，不出现无关大卡片堆叠。

### 业务验收

- 现有 API contract 不变。
- 现有状态语义不变。
- 现有权限不变。
- 现有失败态仍可见。
- 现有可访问名称和输入行为保留。

### 响应式验收

- 桌面视口下与原型接近。
- 移动视口下核心操作可完成。
- 文本不溢出。
- 装饰隐藏后页面仍成立。
- 主内容面不会退回不一致的直角样式。

## 测试策略

### 结构测试

适合用组件测试固定：

- `*-scene` 存在。
- `*-scene-background` 存在。
- `*-scene-props` 存在。
- `*-scene-content` 存在。
- 关键媒体资源路径出现。
- 业务组件仍渲染。

### CSS Contract 测试

适合用 CSS 文本测试固定：

- scene 有大圆角。
- background / props 有 `border-radius: inherit`。
- props 有 `pointer-events: none`。
- 主内容面圆角符合 token。
- 首页 tab 密度遵循一屏舞台 contract，避免共享看板、咖啡等页面再次漂移到过大布局。
- 移动端不会把主内容面改回近似直角。
- touch 设备上的必要操作仍可见。

### 资源测试

适合用文件测试固定：

- 必需资源存在。
- 文件大小不超过预算。
- 页面 CSS 引用了正确路径。

### 浏览器检查

每次明显 UI 改动必须检查：

- 当前 tab 桌面视口。
- 至少一个移动宽度。
- 和原型图的主结构对比。
- 无明显遮挡、裁切、错位、溢出。

自动测试不能替代视觉检查。测试负责防回归，视觉检查负责判断“像不像”和“是否舒服”。

## 反例

### 逐个装饰元素硬调

问题：

- 每个装饰元素独立绝对定位。
- 没有统一 props 层。
- 内容区域缩放后装饰压住业务组件。

修正：

- 先建立 scene shell。
- props 全部放进 props 层。
- 内容层用 safe area 控制主内容位置。

### 只还原大图，不继承小规范

问题：

- 背景和主体比例接近原型。
- 主内容面仍是直角或旧卡片语言。
- 页面看起来像两个设计系统拼接。

修正：

- 把圆角、边框、阴影纳入 CSS contract。
- 用样板页 token 校准主内容面和子面板。

### 原型里有，但产品没有

问题：

- 为了像原型，新增不可用按钮、假统计、假模块。

修正：

- 只使用现有业务数据和已有能力。
- 原型中的新信息若没有真实数据，改为装饰或省略。

## 后续页面使用方式

新页面 UI 优化时，先在单页 spec 中写：

```md
本页面遵循：

- `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`

本页面差异：

- 场景隐喻：...
- 原型图：...
- 真实组件：...
- 媒体资源：...
- 允许变化：...
- 禁止新增：...
```

实现计划中必须包含：

- scene shell task。
- media assets task。
- content layout task。
- responsive task。
- contract tests task。
- browser verification task。

## 当前基线

`健身打卡` 是第一版样板页，确定了：

- 页面级 scene shell。
- 背景层、装饰层、内容层。
- scene 圆角裁切。
- 主内容面粗边框和实体阴影。
- 内容安全区。
- 首页 tab 的桌面 100% 密度基线。
- reduced motion 降级。

`共享看板` 是第二页，补充确认了：

- 不能只迁移 scene shell，还要迁移主内容面圆角规范。
- 发布夹板和软木板属于 main/sub surface，不应保留旧直角卡片语言。
- 装饰元素应作为 scene props，而不是局部贴在业务组件中。

`续命咖啡` 和 `牛马日历` 继续补充确认了：

- 图片原型可能自带更大的视觉尺度，但落地时必须向 `健身打卡` 的一屏舞台密度收敛。
- 内容密集型 surface 应优先压缩内部 spacing、行高和卡片尺寸。
- background image 和 props 必须与 scene 圆角保持一致裁切，不能只让业务内容面有圆角。

后续页面应以这些页面作为 UI workflow 的初始基线。
