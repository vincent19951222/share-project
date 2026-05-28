# Main Tab Performance Optimization Design

## 背景

当前主应用已经把 `健身打卡 / 共享看板 / 续命咖啡 / 牛马日历 / 战报中心 / 牛马补给站` 接入统一顶部导航。用户反馈主页面切换时体感还不够丝滑。

从现有代码和构建结果看，卡顿更像是多种成本叠加，而不是单个 bug：

- 主 tab 切换使用 `router.push()` 进入不同 App Router 页面，点击后需要等待路由切换和 React 更新完成。
- `components/board/BoardApp.tsx` 静态 import 所有主 tab 内容，导致打卡、看板、咖啡、日历、战报、补给站都进入同一客户端依赖图。
- 构建结果显示正式主页面的 First Load JS 基本都是 `170 kB`，说明主 tab 之间没有形成足够清晰的按需拆包。
- `BoardProvider` 使用大 Context 保存整份看板状态，路由切换后的 `SET_TAB` 更新会让所有 `useBoard()` 消费者感知到状态变化。
- 补给站和部分视觉页面包含较多图片和较大的场景组件，首次进入对应页面时会有下载、解码、布局、绘制成本。

本设计覆盖第一档和第二档优化：先改善点击反馈和明显的重复渲染，再拆分大 tab bundle 和重资源。第三档架构改造另行设计。

## 目标

1. 主 tab 点击后立即给用户明确反馈，减少“点了没反应”的等待感。
2. 减少路由切换时的额外全局状态更新和无关重渲染。
3. 将重页面从 `BoardApp` 主客户端包里拆出去，按需加载。
4. 对可能被用户马上访问的 tab 做预加载，让常见路径更接近即时切换。
5. 优化补给站首屏和抽奖池等重图片，降低首次进入时的网络和解码成本。
6. 保持现有业务行为、认证方式、生产路由和 UI Lab 独立路由不变。

## 非目标

- 不把主导航改成纯客户端 tab shell。
- 不重写 App Router 路由结构。
- 不拆分 `BoardProvider` 的完整状态模型，只做当前优化需要的轻量调整。
- 不修改 Prisma schema、API Routes 或补给站业务 mutation。
- 不重做补给站内部页面 chrome 和三列布局。
- 不引入新的状态管理库、请求库或外部 UI 库。
- 不以 Lighthouse 分数作为唯一验收标准；本阶段重点是主 tab 切换体感和构建体积变化。

## 用户体验要求

### 即时反馈

用户点击主 tab 或补给站二级 tab 后，导航按钮应立即进入 pending 或 pressed 状态。这个状态不能依赖目标页面已经完成加载。

建议表现：

- 当前点击的 tab 保持按下或高亮等待态。
- 目标内容区可以显示轻量占位，不使用大面积闪烁。
- 如果目标页面已在客户端加载过，应尽量直接显示。

### 稳定布局

切换过程中顶部导航高度、资产 chip、头像、主内容容器尺寸不应跳动。补给站资产加载失败时继续使用现有 skeleton，不阻塞主页面切换。

### 渐进加载

首次进入重页面时，可以出现轻量 loading shell；但用户不应看到空白主区域。重页面加载完成后再显示完整内容。

### 保持路由语义

正式路由保持不变：

- `/`
- `/board`
- `/drink`
- `/calendar`
- `/report`
- `/dashboard/status`
- `/dashboard/store`
- `/dashboard/quest`
- `/dashboard/backpack`
- `/dashboard/cards`

## 技术设计

### 1. 消除路由切换后的重复 tab 状态写入

当前 `BoardApp` 根据服务端页面 prop `activeTab` 再 dispatch `SET_TAB` 到 `BoardProvider`。这会在路由切换后制造一次额外的全局 context 更新。

优化方向：

- `Navbar` 的 active 状态优先使用 `activeTabOverride`，也就是当前路由传入的 tab。
- 如果没有业务组件真正依赖 `state.activeTab`，移除 `BoardApp` 中的 `SET_TAB` effect。
- 如果仍有组件依赖 `state.activeTab`，改成更窄的 props 或派生布尔值，避免为了导航高亮更新整份 `BoardState`。

验收重点：

- 主 tab 高亮仍正确。
- `SharedBoard` 等依赖 active 状态的组件行为不退化。
- 切换路由不再触发无意义的全局 `SET_TAB` 更新。

### 2. 导航 pending 状态

`Navbar` 已经使用 `startTransition()` 包裹 `router.push()`，但没有把 transition 状态反馈到界面。

优化方向：

- 保存 `pendingTab` 和 `pendingSupplyPanel`。
- 点击 tab 时立即设置 pending key。
- 当 `activeTabOverride` 或 `activeSupplyPanel` 与 pending key 匹配后清空 pending。
- `TabBtn` 支持 `pending` 样式，或者由 `Navbar` 追加稳定 class。
- pending 只改变导航视觉，不提前修改业务内容。

验收重点：

- 点击任意主 tab 后，对应按钮立即出现等待态。
- 目标路由完成后等待态清除。
- 点击当前 tab 不进入 pending。
- 快速连续点击时以后一次点击为准。

### 3. 主 tab 动态拆包

当前 `BoardApp` 静态 import 所有内容组件，会让每个页面共享同一批重依赖。

优化方向：

- 使用 `next/dynamic` 延迟加载重页面组件。
- 首批建议拆分：
  - `SupplyStation`
  - `ReportCenter`
  - `CalendarBoard`
  - `CoffeeCheckin`
  - `SharedBoard`
- `PunchBoard` 是默认首页，可先保持静态 import，避免首页首屏变慢。
- 每个动态组件提供轻量 loading shell，复用项目 brutalist 风格，不引入额外 UI 库。

拆分原则：

- 不改变组件 props 和业务逻辑。
- 不把动态 import 放在 render 函数内部。
- loading shell 尺寸稳定，避免 CLS。
- 对已经需要 polling 的 `CoffeeProvider` 保持原有挂载条件。

验收重点：

- `next build` 后主 tab 页面 First Load JS 下降，或者重页面代码从初始主 chunk 中分离。
- 所有正式路由仍能打开。
- UI Lab 独立页面不受影响。

### 4. hover/focus 预加载

动态拆包后，首次点击重页面可能出现组件加载等待。需要用预加载把等待提前到用户意图出现时。

优化方向：

- 主 tab hover/focus 时预加载对应 route。
- 对动态组件暴露或封装 `preload` 方法，hover/focus 时触发对应组件 chunk 预加载。
- 补给站一级 tab hover/focus 时预加载 `/dashboard/status` 和 `SupplyStation`。
- 补给站二级 tab hover/focus 时预加载对应 route。

验收重点：

- hover/focus 不触发业务 API mutation。
- hover/focus 不改变当前 tab。
- 重复 hover 不重复创建大量请求。
- 键盘 focus 也能获得同等预加载。

### 5. 图片和重资源优化

补给站资源目录约 `5.7M`。其中抽奖池存在超过 `1M` 的 PNG，首次进入抽奖池会有明显的下载和解码成本。

优化方向：

- 优先处理 `public/assets/home-scenes/supply/draw-pool/draw-pool-machine.png`。
- 对静态大 PNG 生成 WebP 或 AVIF 版本，并替换生产引用。
- 保留原图文件，除非确认没有任何页面或文档引用。
- 对非首屏图片使用 `loading="lazy"` 或 Next Image 的默认懒加载。
- 对首屏关键图保留明确尺寸或容器比例，避免布局跳动。

验收重点：

- 替换后的图片视觉不明显劣化。
- 构建通过，正式页面引用路径有效。
- 抽奖池首屏下载体积下降。

### 6. 基线和对比

实现前后都要记录以下信息：

- `npm run build` 的 route size / First Load JS。
- `.next/app-build-manifest.json` 中主 tab 页面的 chunk 列表。
- `public/assets/home-scenes/supply` 中大资源体积。
- 可选：用浏览器 Performance 录制 `/` 到 `/dashboard/status`、`/dashboard/status` 到 `/dashboard/cards` 的切换。

本阶段不要求建立复杂性能监控系统，但计划中应包含可重复执行的本地对比命令。

## 测试策略

### 单元/组件测试

需要覆盖：

- `Navbar` pending 状态在点击后出现，在 active route 更新后清除。
- 点击当前 tab 不触发 pending。
- 主 tab hover/focus 会调用 route prefetch。
- 补给站二级 tab hover/focus 会调用对应 route prefetch。
- `BoardApp` 移除或收窄 `SET_TAB` 后，现有 route 渲染仍正确。
- 动态 loading shell 在组件未加载时渲染稳定占位。

### 回归测试

继续运行：

- `npm test`
- `npm run lint`
- `npm run build`

### 手动验收

至少检查以下路径：

- `/` -> `/board`
- `/` -> `/dashboard/status`
- `/dashboard/status` -> `/dashboard/store`
- `/dashboard/status` -> `/dashboard/cards`
- `/calendar` -> `/report`

每条路径检查：

- 导航点击后立即反馈。
- 顶部导航不跳动。
- 内容区没有长时间空白。
- 目标页面功能可用。

## 风险与缓解

### 动态拆包可能让首次点击出现 loading

缓解：提供 hover/focus 预加载和稳定 loading shell。首页 `PunchBoard` 暂不拆，避免默认入口变慢。

### 移除 `SET_TAB` 可能影响依赖 `state.activeTab` 的组件

缓解：计划中先搜索和测试所有 `state.activeTab` 使用点。只在确认可替代后移除；否则改成局部 props 或更窄状态。

### 图片格式替换可能造成视觉变化

缓解：只先替换大图，保留原资源；用本地页面检查抽奖池和补给站首屏。

### 预加载可能造成无意义请求

缓解：只对导航意图强的 hover/focus 触发，内部加 once guard；不预取业务 mutation，不提前拉取可变状态。

## 验收标准

1. `npm test` 通过。
2. `npm run lint` 通过。
3. `npm run build` 通过。
4. 主 tab 点击后导航即时显示 pending 反馈。
5. 正式主路由和补给站二级路由均可正常切换。
6. `BoardApp` 初始客户端依赖图减少，重页面组件从默认主包中拆出。
7. 至少一个补给站大图资源完成体积优化并替换生产引用。
8. 记录优化前后的构建体积和资源体积对比。

## 后续工作

如果第一档和第二档优化后体感仍不理想，再单独设计第三档：

- 主应用客户端 tab shell。
- URL 与本地 tab 状态双向同步。
- 更细粒度的 context 拆分。
- 内容区 Suspense/parallel route 架构。

第三档会改变主站交互架构，不纳入本 spec。
