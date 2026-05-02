# Home UI 01 Punch Scene Foundation Design

> 第一份页面级 UI spec：以“共享视觉底座最小集 + 健身打卡样板页”为目标，把主页视觉升级跑通到可复用标准。只改 UI、布局、动效和媒体资源，不改变数据、接口、业务逻辑或状态语义。

## 背景

总纲见：

- `docs/superpowers/specs/2026-05-02-home-ui-scene-refresh-design.md`

Spec 01 负责把总纲落到第一个可验收页面。共享视觉底座不能脱离实际页面单独设计，因此先绑定最高频的 `健身打卡` tab 做样板页。

目标原型图：

- 用户提供的 `tab-健身打卡.png`
- 关键特征：黑色顶部导航、健身房墙面场景、顶部金库/赛季/个人摘要、中心热力打卡墙、底部活动动态与每人独立催促按钮。

## 严格范围

### 包含

- 顶部 `Navbar` 的桌面视觉与 tab 顺序整理。
- `board-tab-stage` 的共享 scene shell 和轻量 tab transition。
- `PunchBoard` 的外层健身房场景。
- `TeamHeader` 的卡片结构视觉升级。
- `HeatmapGrid` 的今日列、成员头像、格子状态视觉升级。
- `ActivityStream` 的底部实时动态与催促按钮 UI 升级。
- 本页所需媒体资源的生成、压缩和入库规范。
- reduced motion 规则。

### 不包含

- 不改 Prisma schema。
- 不改 API contract。
- 不改 `BoardState`、reducer action 或打卡同步逻辑。
- 不改打卡奖励、健身券、连签、赛季进度或金库算法。
- 不新增独立今日完成率卡片。
- 不新增排行榜、战力条、任务面板、额外奖励面板。
- 不新增不存在的统计口径。
- 不移除现有催促能力。

## 当前 UI 审核

### 主页底座

当前 `app/(board)/page.tsx` 已经使用单页 tab stage：

- 所有 tab panel 都是 `absolute inset-0`。
- 激活态通过 opacity 和 pointer-events 切换。
- 移动端通过 CSS 将 active panel 改回 relative。

缺口：

- 没有统一 scene shell 概念。
- tab transition 只有 opacity，缺少轻微层次感。
- 不同页面背景语言还未统一。
- 还没有 `prefers-reduced-motion` 的场景化动效降级约束。

### 顶部导航

当前 `Navbar` 已有：

- 产品 logo / 名称。
- 6 个 tab。
- 通知铃铛 `TeamDynamicsBell`。
- profile/avatar 按钮。
- 移动端折叠菜单。

缺口：

- 桌面 tab 顺序当前是 `健身打卡 / 共享看板 / 续命咖啡 / 牛马补给站 / 牛马日历 / 战报中心`。
- 原型与总纲目标顺序是 `健身打卡 / 共享看板 / 续命咖啡 / 牛马日历 / 战报中心 / 牛马补给站`。
- 当前导航是浅色胶囊条；原型需要黑色顶部 bar + 黄色 active tab。
- 移动端仍需保留可用，不照搬桌面黑色 bar 造成拥挤。

### 健身打卡顶部摘要

当前 `TeamHeader` 展示：

- 牛马金库。
- 赛季进度 `SeasonProgressBar`。
- 我的银子。
- 连签。
- 下次奖励。
- 今日打卡。

缺口：

- 视觉上仍是基础 `soft-card`，缺少“健身房 notice board / 金库面板”感。
- 原型中的金库保险柜、金币、票券、日历小 icon 需要媒体或现有 icon 加强。
- 今日打卡只能展示一次，必须继续在现有 KPI 中表达。

### 热力打卡墙

当前 `HeatmapGrid` 展示：

- desktop 与 mobile 两套结构。
- 左侧 MEMBERS。
- 成员头像和名字。
- 日期 header。
- 过去成功/缺失、未来、今日当前用户可点格子。
- 今日列自动滚动到中间。

缺口：

- 现有格子偏基础，原型希望更像健身房打卡墙。
- 今日列需要更强的黄色高亮。
- 当前用户头像需要更明显的“我”标识。
- 成功/缺失/future 状态需要更清晰的图形层级。

### 活动动态与催促

当前 `ActivityStream` 展示：

- 实时活动日志。
- 同步状态。
- 本地日志。
- `Toast`。
- 未打卡成员的催促按钮区。

已确认设计：

- 不移除催促功能。
- 不做独立右下角“今日未打卡成员”大区。
- 催促入口融入底部 `活动动态（实时）` panel。
- 每个成员块包含头像、姓名、状态、独立按钮。
- 每个头像下方一个按钮，文案为 `催促` 或 `已催促`。
- 催促区视觉上低于主热力打卡墙。

缺口：

- 当前催促按钮是一个独立的小块列表，不符合原型。
- 需要改成与活动日志并排/同 panel 的四列成员块样式。
- 需要保留现有 `pokedMembers` 本地状态语义。

## 设计目标

### 共享视觉底座最小集

建立可复用但不过度抽象的底座：

- `board-tab-stage` 支持场景化背景和 active panel transition。
- 每个页面可拥有自己的 `*-scene` 外层 class。
- 新增全局 motion token 或 CSS custom properties，仅用于 transform/opacity。
- reduced motion 下关闭 stagger、浮层动效、背景微动，只保留必要状态变化。
- 桌面导航确定黑色 bar + 黄色 active tab 语言。
- 移动端导航继续优先可用性，必要时保留折叠菜单形式。

### 健身打卡样板页

将页面升级为“健身房打卡墙”：

- 主视觉是热力打卡墙，不是装饰背景。
- 顶部摘要像健身房公告板上的战况面板。
- 左右装饰强化场景，但不能遮挡内容。
- 活动动态像训练日志 ticker。
- 催促按钮像训练提醒按钮，按成员独立展示。

## 媒体资源 Checklist

所有资源先生成或确认，再压缩处理，最终进入：

```text
public/assets/home-scenes/punch/
```

### 必需资源

- `gym-wall-bg.webp`
  - 用途：健身打卡页外层背景。
  - 内容：浅色墙面、轻微纸纹/水泥纹、低对比 dotted texture。
  - 建议尺寸：2560x1440 或 1920x1080。
  - 格式：WebP。

- `gym-floor-strip.webp`
  - 用途：底部地面/阴影装饰，可选为背景的一部分。
  - 内容：灰色健身房地面或墙脚线。
  - 建议尺寸：2560x360 或 1920x280。
  - 格式：WebP。

- `poster-no-pain.webp`
  - 用途：左侧贴纸海报。
  - 内容：黄色纸张、胶带、短文案风格接近原型。
  - 建议尺寸：420x520。
  - 格式：WebP/PNG。

- `stopwatch-keep-going.webp`
  - 用途：左侧秒表装饰。
  - 内容：圆形秒表，文案或图形表达 “KEEP GOING”。
  - 建议尺寸：360x360。
  - 格式：WebP/PNG。

- `dumbbell-corner.webp`
  - 用途：左下角哑铃装饰。
  - 内容：黑色哑铃/杠铃片，贴近原型。
  - 建议尺寸：520x420。
  - 格式：WebP/PNG。

- `poster-believe.webp`
  - 用途：右侧白色训练贴纸。
  - 内容：白纸、胶带、哑铃图形。
  - 建议尺寸：420x520。
  - 格式：WebP/PNG。

- `towel-bar.webp`
  - 用途：右侧横杆和黄色毛巾装饰。
  - 内容：黑色横杆、黄色毛巾、短标签。
  - 建议尺寸：560x620。
  - 格式：WebP/PNG。

- `vault-safe.webp`
  - 用途：`TeamHeader` 牛马金库视觉。
  - 内容：黄色保险柜，粗黑描边，贴合现有 brutalist 风格。
  - 建议尺寸：320x320。
  - 格式：WebP/PNG。

### 可选资源

- `coin-badge.webp`
  - 如果现有 icon 不够统一，用于金库数字旁。

- `ticket-badge.webp`
  - 用于下次奖励视觉，不新增奖励语义。

- `training-tape.webp`
  - 用于角落胶带，避免每处都用 CSS 模拟。

## 图片生成流程

1. 根据 checklist 逐个使用 `imagegen` 生成原始图。
2. 每个资源单独 prompt，避免一张图里切割多个对象导致边缘不干净。
3. 装饰类对象优先生成在干净背景上，再根据需要做裁切或背景处理。
4. 不使用生成工具输出路径作为项目引用路径。
5. 原始生成图保留在默认生成目录，项目只引用处理后的文件。

## 图片处理与压缩

处理目标：

- 背景图在桌面大屏下不糊。
- 小装饰图不能过大。
- 保持边缘清晰，避免透明边缘毛边。
- 不把大图直接以原始生成尺寸放进项目。

建议处理规则：

- 背景：
  - 最大宽度 2560px。
  - WebP quality 75-85。
  - 目标单文件尽量小于 450KB。

- 大装饰：
  - 最大边 720px。
  - WebP quality 80-88。
  - 目标单文件尽量小于 180KB。

- 小 icon / badge：
  - 最大边 256-384px。
  - PNG 或 WebP。
  - 目标单文件尽量小于 80KB。

可使用工具：

- `sips` / `magick` / `sharp` / `cwebp`，以本机可用工具为准。
- 最终必须人工检查图片没有明显模糊、错字、边缘脏色。

## 资源落地规范

最终目录：

```text
public/assets/home-scenes/punch/
  gym-wall-bg.webp
  gym-floor-strip.webp
  poster-no-pain.webp
  stopwatch-keep-going.webp
  dumbbell-corner.webp
  poster-believe.webp
  towel-bar.webp
  vault-safe.webp
```

命名规则：

- 全小写。
- 使用 kebab-case。
- 不包含中文和空格。
- 不覆盖已有资源，除非明确确认替换。

代码引用必须使用 `/assets/home-scenes/punch/<filename>`。

## 页面结构设计

### Navbar

桌面端：

- 顶部改为黑色横条。
- 左侧 logo 与 `脱脂牛马` 更接近原型。
- tab 使用 icon + 中文标签。
- active `健身打卡` 使用黄色按钮块。
- tab 顺序调整为：

```text
健身打卡 / 共享看板 / 续命咖啡 / 牛马日历 / 战报中心 / 牛马补给站
```

右侧：

- 铃铛在 profile 左边。
- profile 保留头像和下拉行为。

移动端：

- 不强行照搬桌面横条。
- 保留折叠菜单。
- active tab 和按钮视觉要与桌面同源。

### Tab Stage

- `board-tab-stage` 增加共享 scene 语义。
- active panel 进入时可轻微 `translateY` + opacity。
- inactive panel 不参与交互。
- reduced motion 下只切换 opacity。

### Punch Scene Shell

新增健身打卡外层 shell：

- 背景层：墙面、左右装饰、底部地面。
- 内容层：顶部摘要、热力打卡墙、活动动态。
- 装饰层 `pointer-events: none`。
- 内容层始终优先于装饰层。

桌面布局接近原型：

- 主内容宽度居中，左右留给装饰。
- 三段纵向结构：
  - 顶部摘要。
  - 中央热力墙。
  - 底部活动动态。

移动端：

- 装饰隐藏或大幅弱化。
- 内容改为自然纵向滚动。
- 不使用固定高度导致热力表被压缩到不可读。

## 组件设计

### TeamHeader

保持现有数据：

- 牛马金库。
- 赛季冲刺。
- 我的银子。
- 连签。
- 下次奖励。
- 今日打卡。

设计：

- 外框使用粗黑描边和强阴影。
- 金库区域增加 `vault-safe` 图片或 fallback icon。
- 赛季冲刺保留 `SeasonProgressBar` 数据语义。
- 个人摘要保持三个 KPI。
- 今日打卡保持单独黄色高亮卡片，只展示一次人数。

禁止：

- 不新增“今日完成率”独立卡片。
- 不重复展示 `todayPunchedCount/state.members.length`。

### HeatmapGrid

保持现有数据与交互：

- 当前用户今日未打卡时仍打开 `PunchPopup`。
- 当前用户今日已打卡时仍可撤销。
- 过去缺失仍显示 missed。
- 未来仍显示 future。

设计：

- MEMBERS header 改为原型中的黑底白字。
- 当前用户头像有黄色 ring 和 `我` 标识。
- 今日列整列黄色高亮。
- 今日格子增加圆形光环或短暂 pulse。
- 成功格子保持绿色勾。
- 缺失格子保持红色叉。
- future 格子保持灰色短横。

禁止：

- 不改变格子点击条件。
- 不新增其他成员今日操作。
- 不把未打卡成员从热力表里抽成独立统计卡。

### ActivityStream

保持现有数据与交互：

- `/api/activity-events?kind=punch` 轮询。
- 本地 `state.logs`。
- 同步状态。
- `pokedMembers` 本地已催促状态。
- 点击催促仍写入本地 log。

设计：

- 底部 panel 保持 `活动动态（实时）` header。
- 右上保留 `已同步 / 同步中 / 同步失败`。
- panel 内容区改为成员块布局：
  - 头像。
  - 成员名。
  - 状态文本，如 `打卡成功`。
  - 每个头像下方一个按钮。
- 未催促按钮：`催促`，黄色 brutalist 小按钮。
- 已催促按钮：`已催促`，灰色 disabled 样式。
- 每个成员块之间用轻分隔线。

注意：

- 如果当天未打卡成员少于 4 个，则按实际成员数展示。
- 如果没有可催促成员，则只展示活动日志/空状态，不造假按钮。
- 原型图里的 4 个成员块是视觉目标，不代表代码必须固定 4 个。

## 动效设计

允许：

- 页面首次显示时，顶部摘要、热力墙、活动面板轻微 stagger。
- 今日列低频高亮，不影响阅读。
- 打卡成功后当前用户今日格子出现短暂成功 ring。
- 催促按钮点击后短暂按压反馈并切到 `已催促`。

禁止：

- 循环闪烁。
- 动画改变布局尺寸。
- 长时间移动的背景装饰。

reduced motion：

- 关闭 stagger。
- 关闭今日格子 pulse。
- 保留颜色/状态变化。

## 测试策略

组件/单元测试：

- `Navbar` 桌面 tab 顺序包含 `健身打卡 / 共享看板 / 续命咖啡 / 牛马日历 / 战报中心 / 牛马补给站`。
- `ActivityStream` 未打卡成员仍渲染独立催促按钮。
- 点击催促后按钮进入 `已催促` 或 disabled 状态。
- `TeamHeader` 今日打卡只出现一次 KPI。

CSS/结构测试：

- 存在 punch scene shell class。
- 存在 reduced motion override。
- 装饰资源路径指向 `public/assets/home-scenes/punch/`。

手工验收：

- 桌面宽度检查接近原型图。
- 手机宽度检查不溢出、不遮挡、不丢关键操作。
- 打卡、撤销、催促、活动同步仍能正常工作。

最终验收命令：

```bash
npm test
npm run lint
```

如涉及浏览器布局：

```bash
npm run dev
```

并检查桌面与移动视口。

## 验收标准

- 页面视觉接近用户提供的健身打卡原型。
- 顶部导航符合新顺序和黑色 bar 风格。
- 健身打卡页形成可复用的 scene foundation。
- 所有新媒体资源已生成、压缩、存入 `public/assets/home-scenes/punch/`。
- 代码不引用 `$CODEX_HOME/generated_images`。
- 今日打卡人数只展示一次。
- 催促功能保留，并按头像下方独立按钮呈现。
- 所有业务数据与接口语义保持不变。
- reduced motion 可正常降级。
- 测试和 lint 通过。

## 后续衔接

Spec 01 完成后，后续页面可以复用：

- 顶部导航视觉语言。
- scene shell 结构。
- 媒体资源生成与压缩流程。
- reduced motion 策略。
- 桌面优先、移动降级的验收方式。

后续 specs 不应重新定义这些底座，只在各自页面继承并扩展场景差异。
