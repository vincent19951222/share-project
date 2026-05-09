# Home UI 05 Report Center Scene Design

> 在 `spec-01` 已建立的首页共享视觉底座上，把 `战报中心` 重做为接近 [tab-战报中心.png](../../../design/ui-assets/tab-%E6%88%98%E6%8A%A5%E4%B8%AD%E5%BF%83.png) 的“月度战报编辑台”。本 spec 只覆盖 `战报中心` tab，不改其他 tab 的结构、数据和交互语义。

## 关联文档

- 总纲：`docs/superpowers/specs/2026-05-02-home-ui-scene-refresh-design.md`
- 共享 workflow：`docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- 已完成样板页：`docs/superpowers/specs/2026-05-03-home-ui-01-punch-scene-foundation-design.md`

## 目标

1. 把当前 `ReportCenter` 从“组件堆叠式 dashboard”升级为“月度战报编辑台”场景。
2. 在不改变任何业务数据、接口、权限和状态语义的前提下，尽量像素级贴近原型图。
3. 为 `ReportHeader`、`Milestones`、`TrendChart`、`CoffeeReportPanel`、`GamificationWeeklyReportPanel`、`WeeklyReportAdminPanel` 建立统一的 scene、材质和装饰规则。
4. 补齐 `战报中心` 所需媒体资源，并把资源生成、抠图、压缩、入库流程明确下来。

## 严格非目标

- 不改 `Navbar`、其他 tab 的布局或共享样式 contract。
- 不改 Prisma schema、API contract、状态管理、权限规则、周报发布逻辑或咖啡统计口径。
- 不新增日期范围选择、筛选器、导出 PDF、AI 总结、成员画像、预测、目标管理或新指标卡。
- 不用整张大海报平铺页面替代 scene 分层。
- 不让装饰素材承担业务状态表达。

## 输入确认

- 目标原型：`design/ui-assets/tab-战报中心.png`
- 原型尺寸：`1672 x 941`
- 当前页面组件：
  - `components/report-center/ReportCenter.tsx`
  - `components/report-center/ReportHeader.tsx`
  - `components/report-center/Milestones.tsx`
  - `components/report-center/TrendChart.tsx`
  - `components/report-center/CoffeeReportPanel.tsx`
  - `components/report-center/GamificationWeeklyReportPanel.tsx`
  - `components/report-center/WeeklyReportAdminPanel.tsx`
- 当前现状：
  - 页面没有 `report-scene / background / props / content` 分层。
  - 当前只存在 `public/assets/report-center/coffee-cup-label.png` 和 `coffee-receipt.png` 两张旧素材。
  - 页面仍是通用圆角卡片堆叠，不是原型中的月报编辑台。

## 原型拆解

### Scene shell

- 整个 tab 是一张白色月报台面，带细点纹理、粗黑边、圆角裁切和偏硬的投影。
- scene 外侧挂有 desk props：长尾夹、便签纸、圆章、记号笔、数据纸片。
- 场景不靠单张背景图表达，必须拆成背景层、props 层和内容层。

### Main surfaces

- 顶部报头是双栏长条纸面：
  - 左栏：红色“本月战况”标签、主标题、总结语、`KEEP GOING!` 印章、图表纸片。
  - 右栏：保险柜插画、金库数值、口号文案。
- 第二排是四张横向指标卡，每张都有独立色条和 icon。
- 第三排：
  - 左侧大面：`活跃趋势` 图表，是主分析区。
  - 右侧小面：`咖啡能量站`，是附属状态面板。
- 第四排：
  - 左侧宽面：`牛马补给周报` 附刊。
  - 右侧窄面：三张“本周高光”便签。
- 管理员面板不在原型里出现，但必须保留并纳入同一视觉体系。

### Props

- 左上：黑色长尾夹。
- 左侧：黄色 `DISCIPLINE BEATS MOTIVATION` 便签，半透明胶带。
- 左下：`STRONGER TOGETHER` 圆章。
- 右上：`NO EXCUSES JUST RESULTS` 圆章纸片。
- 右中：迷你柱状图纸片。
- 右下：白底黑帽记号笔。
- 主内容内部还有小 props：`KEEP GOING!` 印章、迷你图表纸、保险柜插画、咖啡杯与小票。

## 当前 UI 审计

### 已有可复用部分

- `ReportCenter` 已正确聚合主线战报、咖啡周边和补给周报数据。
- `TrendChart` 已具备峰值、低谷、今日点位等真实数据表达。
- `CoffeeReportPanel` 已经有“咖啡杯 + 小票 + 波形柱图”的方向。
- `GamificationWeeklyReportPanel` 和 `WeeklyReportAdminPanel` 已具备数据闭环，不需要改业务逻辑。

### 与原型的主要差距

1. 缺少 scene shell。当前 `.report-board` 仍是单层卡片容器，没有背景层和 props 层。
2. 顶部报头结构不对。当前 `ReportHeader` 是左右两块普通 soft card，不是原型的双栏长条报头。
3. 指标卡不对。当前四张卡只有常规渐变与圆角，没有原型里的左侧色条、图标、横向数字比例和强阴影。
4. 图表区不对。当前 `TrendChart` 是现代化组件卡，缺少编辑台纸面、图表标签、今日黄框、角标和更明显的横向阅读布局。
5. 咖啡区不对。虽然已有咖啡杯和小票，但整体材质、外框比例和原型中的“右侧附刊”关系还不够接近。
6. 周报区不对。当前 `GamificationWeeklyReportPanel` 是黄底 brutalist 卡片，不是底部附刊纸面，也没有与“本周高光”并排的版面关系。
7. 管理员区不对。当前 `WeeklyReportAdminPanel` 还是通用操作卡，未纳入编辑台场景。
8. 装饰资源严重不足。现有素材无法支撑长尾夹、印章纸、保险柜、图表纸片、记号笔等视觉。

## 页面级设计决策

### 场景隐喻

`战报中心` 是“桌上的月度战报编辑台”，不是大屏 BI，不是传统 SaaS 数据板，也不是纯贴纸拼贴墙。

### 页面结构

```text
report-scene
  report-scene-background
  report-scene-props
  report-scene-content
    report-scene-header
      ReportHeader
    report-scene-metrics
      Milestones
    report-scene-analysis
      TrendChart
      CoffeeReportPanel
    report-scene-bottom
      GamificationWeeklyReportPanel
      report-highlights-rail
    report-scene-admin (admin only)
      WeeklyReportAdminPanel
```

### 组件映射规则

- `ReportHeader`
  - 改为一张双栏报头长纸，不再渲染成两张独立卡。
  - 左栏保留 `title` 和 `summary`，增加 `本月战况` 红色 pill、`KEEP GOING!` 印章和图表纸片占位。
  - 右栏保留 `teamVault.current` 和 `teamVault.helper`，增加保险柜插画和右侧标语。
- `Milestones`
  - 保持四张卡和原有数据不变。
  - 每张卡改为横向结构：左色条 + icon + 文本值。
  - 颜色固定对应原型：绿 / 蓝 / 黄 / 红。
- `TrendChart`
  - 仍是主图表，不改数据表达。
  - 外观改成编辑台纸面：顶部标题与 badge、图表纸底、峰值/低谷圆角胶囊、右侧今日黄条。
- `CoffeeReportPanel`
  - 保留“咖啡杯 + 小票 + 近 7 天柱图”的信息结构。
  - 改成右侧附刊卡，不再像独立大模块抢主区。
  - 保留当前已存在的像素杯子和小票素材，作为咖啡模块的视觉主体；本轮只调整它们在右侧附刊中的壳层、比例和周边纸面关系，不重生成替换图。
- `GamificationWeeklyReportPanel`
  - 改为底部左侧附刊纸面。
  - 顶部是中英混排标题，左侧状态 badge，内部四项指标横排，摘要卡和高光改为更像“剪报摘要”。
- `WeeklyReportAdminPanel`
  - 管理员可见时追加在 scene 底部，作为“校对区 / 发布区”副面。
  - 必须沿用同一纸面与批注视觉，不得退回通用 `soft-card`。
  - 它不是原型主舞台的一部分，但必须看起来属于同一张编辑台。

## 媒体资源策略

### 入库目录

最终资源统一放入：

```text
public/assets/home-scenes/report/
```

旧的：

```text
public/assets/report-center/
```

本轮不再扩充。`CoffeeReportPanel` 当前已存在的两张像素素材：

- `public/assets/report-center/coffee-cup-label.png`
- `public/assets/report-center/coffee-receipt.png`

作为这个咖啡模块的既有视觉资产保留，不要求迁移、不要求替换；其余新增编辑台 props 统一进入 `public/assets/home-scenes/report/`。

### 资源命名与格式规则

- 背景类：不透明 `webp`
- 装饰类：alpha `webp`
- 不把 raw 生图放进 `public/`
- 文件名只描述用途，不使用随机名
- 所有业务代码只能引用 `/assets/home-scenes/report/<file>`

## 缺少媒体与内容 checklist

### A. 必须生成的图片资产

| 文件名 | 类型 | 用途 | 格式 | 预算 |
| --- | --- | --- | --- | --- |
| `editor-desk-bg.webp` | 背景 | scene 的浅白点纹月报台面 | opaque webp | `<= 420 KB` |
| `binder-clip-left.webp` | props | 左上黑色长尾夹 | alpha webp | `<= 90 KB` |
| `keep-going-stamp.webp` | props | 报头内红色印章 | alpha webp | `<= 80 KB` |
| `mini-chart-slip.webp` | props | 报头内小图表纸片 | alpha webp | `<= 120 KB` |
| `vault-safe-yellow.webp` | props | 金库区保险柜插画 | alpha webp | `<= 140 KB` |
| `discipline-note.webp` | props | 左侧黄色便签 | alpha webp | `<= 120 KB` |
| `no-excuses-note.webp` | props | 右上圆章纸片 | alpha webp | `<= 120 KB` |
| `bar-chart-note.webp` | props | 右中柱状图纸片 | alpha webp | `<= 120 KB` |
| `stronger-stamp.webp` | props | 左下圆章印记 | alpha webp | `<= 90 KB` |
| `focus-marker.webp` | props | 右下记号笔 | alpha webp | `<= 140 KB` |

### A-1. 保留的现有咖啡模块素材

这两张图继续保留并直接复用，不走本轮生图流程：

| 文件名 | 当前路径 | 用途 |
| --- | --- | --- |
| `coffee-cup-label.png` | `public/assets/report-center/coffee-cup-label.png` | 咖啡区本周咖啡王杯身主体 |
| `coffee-receipt.png` | `public/assets/report-center/coffee-receipt.png` | 咖啡区统计小票主体 |

### B. 可用 CSS 直接构造的非图片元素

- 红色 `本月战况` pill
- 四张指标卡左侧色条
- `本周高光` 小标题旗标
- 便签阴影、曲边和折角
- 图钉、胶带、虚线分隔线
- 今日黄框、峰值和低谷 badge

这些元素不需要走生图流程，优先用 CSS 保持响应式和清晰度。

### C. 文案与内容映射 checklist

- `ReportHeader` 标题继续读取真实 `report.title`
- `summary` 继续读取真实摘要，不为贴图改文案
- 金库区继续读取真实 `teamVault.current` 与 `teamVault.helper`
- 四张 `Milestones` 继续使用当前四项真实指标
- `TrendChart` 的峰值、低谷、今日点位继续读取真实计算结果
- `CoffeeReportPanel` 继续使用真实咖啡统计
- `CoffeeReportPanel` 继续引用当前两张像素素材，不替换业务模块主体插画
- `GamificationWeeklyReportPanel` 继续使用真实周报 API 返回结构
- `WeeklyReportAdminPanel` 继续使用当前生成与发布接口，不新加操作

## 生图与处理 workflow 要求

### 1. 先做资产 contract

实现前先建立 `report` 资产 contract test，至少约束：

- 必需文件存在
- 体积低于预算
- 新增 scene props 的引用路径全部位于 `public/assets/home-scenes/report/`
- `CoffeeReportPanel` 保留的两张既有素材允许继续位于 `public/assets/report-center/`

### 2. 生图顺序

必须按 checklist 一张一张生成，不允许一次性做成整幅海报。

建议顺序：

1. `editor-desk-bg`
2. `vault-safe-yellow`
3. `keep-going-stamp`
4. `mini-chart-slip`
5. `binder-clip-left`
6. `discipline-note`
7. `no-excuses-note`
8. `bar-chart-note`
9. `stronger-stamp`
10. `focus-marker`

### 3. 生图要求

- 背景图直接生成宽画幅无人物场景。
- 装饰图统一在纯色 chroma-key 背景上生成，再本地抠成 alpha。
- 贴纸、纸片、章、夹子、记号笔都必须是独立对象，不带大块背景。
- 文案型素材只允许包含原型里已有的英文短句，不新写宣传语。
- 风格统一为轻微纸质纹理的 2D brutalist raster，不做写实照片拼贴。

### 4. 图片处理要求

- raw 文件进入临时目录，不进 git。
- 先按实际展示尺寸裁切与缩放，再压成 `webp`。
- 小图优先压到 1x 或接近 1.5x 的展示尺寸，避免无意义大图。
- 保险柜、夹子、记号笔、咖啡杯等边缘要保清晰，不可糊边。
- 对纸片和章类素材，允许轻微颗粒和粗糙边，但不能有明显 AI 伪影。

### 5. 最终入库要求

- 最终文件全部写入 `public/assets/home-scenes/report/`
- 业务代码不得继续引用 `public/assets/report-center/*`
- 如果旧素材完全被新素材替换，后续实现阶段可以移除旧引用

## 布局与视觉规范

### 桌面端目标

以原型尺寸为主参考，在 100% 浏览器缩放下：

- scene 应一屏内完整呈现主舞台
- 报头、指标卡、图表、咖啡附刊、周报附刊与高光区同时可见
- 整体安全区、卡片高度和横向比例优先对齐原型，不让用户先滚动才理解结构

### 响应式降级

- 小屏保留 scene shell，但外侧 props 可按优先级隐藏：
  - 先隐藏右侧记号笔和边缘纸片
  - 再弱化左侧长尾夹和圆章
- 主内容顺序保持：
  1. 报头
  2. 指标卡
  3. 图表
  4. 咖啡附刊
  5. 补给周报
  6. 本周高光
  7. 管理员校对区
- 管理员面板在移动端可单独成行，但材质与边框语义不变

### 动效

- 只允许轻量进入动效、便签 hover、badge 微反馈
- `prefers-reduced-motion: reduce` 下关闭非必要动效
- 不对图表数据点增加抢焦点循环动画

## 测试与验收

### 测试重点

- `report` 资源 contract test
- `ReportCenter` 结构测试：
  - 存在 `report-scene` 分层
  - 报头、指标卡、图表区、咖啡区、周报区、管理员区都挂在预期 scene 区块
- `CoffeeReportPanel` 与 `GamificationWeeklyReportPanel` 保留已有真实数据渲染测试
- 管理员态测试继续覆盖 `WeeklyReportAdminPanel`
- CSS contract test 覆盖：
  - scene shell
  - props 层裁切
  - 图表区和周报区响应式栈叠

### 验收标准

1. 桌面端整体结构明显接近 `tab-战报中心.png`，不是通用 dashboard 卡片堆叠。
2. 页面具备 `scene / background / props / content` 分层。
3. 关键装饰素材全部来自 `public/assets/home-scenes/report/`。
4. `ReportHeader`、`Milestones`、`TrendChart`、`CoffeeReportPanel`、`GamificationWeeklyReportPanel`、`WeeklyReportAdminPanel` 都纳入同一视觉体系。
5. 未新增任何业务入口、统计口径或管理能力。
6. 移动端不遮挡、不溢出，管理员区仍可用。
7. 咖啡能量站继续保留当前像素杯子和小票素材，只调整外层编辑台壳层与排版关系。

## 实施边界结论

- 本轮 `spec-05` 只服务 `战报中心` tab。
- 共享规则只复用既有 `spec-01` 与 `2026-05-05` workflow，不在本 spec 内重新定义跨 tab contract。
- 管理员周报面板必须保留，并作为“编辑台校对区”并入同一 scene。
