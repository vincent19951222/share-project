# 脱脂牛马 - 项目路线图

> 一个面向健身团队的打卡、战报与轻量协作应用。目标不是把大家管得更严，而是把团队节奏记录得更真实、更有趣。

## 项目愿景

脱脂牛马希望把“健身打卡”做成一件更容易坚持的事：

- 用团队看板放大陪伴感和节奏感
- 用轻量数据战报帮助大家回看趋势
- 用生活化记录补全真实状态，而不只记录训练本身
- 用积分、赛季和冲刺条，逐步建立更清晰的游戏化反馈
- 逐步接入外部团队工具，让记录结果自然回到团队沟通场景

---

## 已完成

### P1：基础平台能力

#### 1. 用户头像系统
- 已完成时间：2026-04-18
- 支持头像选择、头像映射和种子数据接入
- 关键文件：
  `lib/avatars.ts`
  `components/profile/EditProfileModal.tsx`
  `prisma/seed.ts`

#### 2. 登录 / 注册系统
- 已完成时间：2026-04-18
- 支持统一登录注册入口、自动注册、头像选择和基础表单校验
- 关键文件：
  `components/login/LoginForm.tsx`
  `app/api/auth/login/route.ts`
  `app/(auth)/login/page.tsx`

#### 3. 核心打卡看板
- 已完成时间：2026-04-18
- 支持团队打卡热力图、活动流、团队头部信息和基础战报入口
- 关键文件：
  `components/punch-board/PunchBoard.tsx`
  `components/punch-board/HeatmapGrid.tsx`
  `components/punch-board/ActivityStream.tsx`
  `components/report-center/ReportCenter.tsx`

#### 4. 品牌与本土化
- 已完成时间：2026-04-19
- 完成“脱脂牛马 / 牛马金库 / 银子”等核心文案替换
- 页面主语言切换为中文语境，保留技术实现的英文日志与结构

---

### P2：共享打卡与生活化记录

#### 1. 战报中心轻量数据化
- 已完成时间：2026-04-20
- 战报中心从静态占位升级为由 `BoardState` 驱动的真实数据看板
- 已移除假月份、假分数、假成员等占位内容
- 保留 Brutalist 视觉语言，聚焦完成率、总打卡、全勤日和高光成员

#### 2. 共享看板
- 已完成时间：2026-04-19
- 新增团队内部便签 / 公告型共享看板
- 支持发布、删除、软删除和同步展示

#### 3. 打卡持久化与轻量同步
- 已完成时间：2026-04-22
- 健身打卡已从前端本地 state 迁移到数据库
- 新增 `GET /api/board/state` 与 `POST /api/board/punch`
- 通过轮询保持多端状态同步

#### 4. 咖啡打卡（续命咖啡）
- 已完成时间：2026-04-23
- 新增独立咖啡打卡页，和健身打卡并行存在
- 每杯咖啡持久化为 `CoffeeRecord`
- 支持当天 `+1 杯` 与撤回最近一杯
- 展示“咖啡小票”和团队 30 天续命月历
- 咖啡记录不参与银子、赛季、streak 结算，定位为生活化补充记录
- 关键文件：
  `components/coffee-checkin/CoffeeCheckin.tsx`
  `components/coffee-checkin/CoffeeGrid.tsx`
  `app/api/coffee/state/route.ts`
  `app/api/coffee/cups/route.ts`
  `app/api/coffee/cups/latest/route.ts`

#### 5. 牛马日历
- 已完成时间：2026-04-23
- 新增按月查看的个人日历页
- 合并展示健身打卡状态与咖啡杯数
- 支持切换历史月份、回到当前月份、跨 Tab 刷新同步
- 关键文件：
  `components/calendar/CalendarBoard.tsx`
  `components/calendar/CalendarGrid.tsx`
  `app/api/calendar/state/route.ts`

#### 6. 咖啡战报面板
- 已完成时间：2026-04-24
- 战报中心已从原先的 `Highlights` 三张占位卡升级为“咖啡能量站”
- 展示今日全队咖啡杯数、续命人数、本月累计、本周咖啡王和近 7 天咖啡因波形
- 咖啡页与战报页共享同一份 `CoffeeProvider` 状态，避免重复拉取和状态漂移
- 已补回归测试，确保 `0 杯` 天数在波形里显示为空柱而不是伪高柱
- 关键文件：
  `lib/coffee-store.tsx`
  `components/report-center/CoffeeReportPanel.tsx`
  `components/report-center/ReportCenter.tsx`
  `components/report-center/report-data.ts`
  `__tests__/coffee-report-panel.test.tsx`

---

### P3：经济系统与赛季冲刺

#### 1. 经济规则与赛季主题基础
- 已完成
- `lib/economy.ts` 已处理 Shanghai day key、streak、奖励和赛季档位规则
- `lib/season-theme.ts` 已提供赛季主题和成员贡献色映射
- 对应规则已补单元测试

#### 2. 数据模型与种子数据
- 已完成
- `User`、`Season`、`SeasonMemberStat`、`PunchRecord` 已具备赛季结算需要的关键字段
- 管理员角色和种子数据已接入

#### 3. 服务端打卡结算闭环
- 已完成基础闭环
- `POST /api/board/punch` 已按 streak 发放奖励，并同步更新个人银子、当前 streak、活动事件
- 有 active season 时会累计 `seasonIncome`、推进 `slotContribution` 和 `filledSlots`
- 赛季目标满格后继续累计个人银子和赛季收入，但不再推进额外格子
- `DELETE /api/board/punch` 已支持撤回当天打卡，并回滚个人资产、streak、赛季收入和冲刺条
- 已覆盖重复打卡、并发打卡、赛季满格、撤销回滚等测试
- 关键文件：
  `app/api/board/punch/route.ts`
  `__tests__/board-punch-api.test.ts`

#### 4. 管理员赛季管理
- 已完成 MVP
- 已有 `/admin` 赛季配置页
- 已有 `GET /api/admin/seasons`、`POST /api/admin/seasons`、`PATCH /api/admin/seasons/current`
- 支持创建赛季、结束当前赛季、查看历史赛季
- 仅管理员可进入和操作
- 已完成中文文案、移动端体验、表单交互和异常提示的一轮打磨
- 关键文件：
  `app/(board)/admin/page.tsx`
  `components/admin/SeasonAdminPanel.tsx`
  `app/api/admin/seasons/route.ts`
  `app/api/admin/seasons/current/route.ts`
  `__tests__/admin-seasons-api.test.ts`
  `__tests__/season-admin-panel.test.tsx`

#### 5. 看板与 Profile 经济语义
- 已完成基础接入
- 团队头部已展示牛马金库、我的银子、streak、下次奖励和赛季进度条
- Profile 下拉已展示个人银子、连签、下次奖励和管理员赛季入口
- 已完成中文文案、视觉密度、移动端适配和赛季贡献说明的一轮打磨
- 关键文件：
  `components/punch-board/TeamHeader.tsx`
  `components/punch-board/SeasonProgressBar.tsx`
  `components/navbar/ProfileDropdown.tsx`
  `__tests__/season-progress-bar.test.tsx`
  `__tests__/profile-dropdown.test.tsx`

#### 6. P3 收尾与基础验收
- 已完成时间：2026-04-26
- 已完成赛季结算、管理员赛季管理、看板 / Profile 经济语义的收尾打磨
- 已完成对应自动化验收：P3 相关测试通过，类型检查通过
- 战报中心赛季复盘暂不纳入本轮范围，后续如重启会单独立 spec / plan

---

## 下一阶段规划

### 产品判断

当前产品已经不只是“健身打卡工具”，而是一个团队节奏记录工具。后续规划需要分成两条线推进：

- `主线未实现能力`：继续补齐团队动态、文档中心、周报、企业微信等团队内容和基础设施
- `牛马补给站`：新增一条游戏化主线，用四维任务、抽奖券、背包道具和弱社交提高每日打开与健身打卡动力

两条线可以互相协作，但不能互相阻塞。牛马补给站 MVP 不依赖团队动态；团队动态和文档中心也不依赖牛马补给站。

---

## 主线未实现能力

### 1. 团队动态

- 定位：承接“今天正在发生什么”和“哪些内容值得沉淀”
- 入口形态：不新增主导航 Tab，优先放在 Navbar 头像左侧的喇叭入口中，作为团队消息 / 播报中心
- 和战报中心的区别：
  团队动态偏现场和时间线，战报中心偏复盘和分析
- 和共享看板的区别：
  团队动态负责沉淀事件和回看；共享看板继续负责便签和公告
- 第一版可承接：
  打卡事件
  咖啡摘要事件
  共享看板公告或重要笔记引用
  赛季里程碑事件
  手动生成的周报或月报
- 数据层建议：
  新增 `TeamDynamic` / `TimelineItem` 表，和实时 `ActivityEvent` 分离
- 后续可以作为企业微信推送内容的来源

### 2. 文档中心

- 定位：承接 changelog、规则说明、帮助文档、FAQ 等“产品说明型内容”
- 入口形态：优先放在 Profile 下拉中，不占用主导航 Tab
- 第一版建议：
  一个 `/docs` 页面
  页面内提供 changelog、赛季规则、使用说明、常见问题等分区或 tabs
- 和团队动态的区别：
  文档中心回答“这是什么、怎么用”；团队动态回答“最近发生了什么”

### 3. 手动生成周报

- 定位：先做可控的手动触发，不急着做定时自动任务
- 管理员或成员点击“生成本周战报”，系统基于当前数据生成结构化周报
- 周报建议先覆盖：
  本周打卡次数
  本周全勤日
  本周运动高光成员
  本周咖啡王
  团队低谷日和高峰日
  赛季冲刺进度
  一段可读的团队总结文案
- 周报生成后保存为一条团队动态，便于回看和推送

### 4. 企业微信基础推送

- 第一版只做出站推送，优先接企业微信群机器人 Webhook
- 不做复杂 OAuth、成员绑定和回调命令
- 支持推送：
  手动生成的周报
  每日轻量日结
  关键里程碑事件
- 配置建议先放在管理员设置里，后续再考虑更完整的集成管理页

### 主线协同关系

- 战报中心：负责分析、生成、预览
- 团队动态：负责沉淀、展示、回看
- 文档中心：负责更新日志、规则说明、帮助文档
- 企业微信：负责把重要结果送回团队沟通场景
- 共享看板：继续保留轻量便签和公告属性，不承担数据复盘

---

## 牛马补给站：游戏化更新

### 产品定位

- 定位：用四维轻任务、抽奖券、背包道具和暴击增益提高每天打卡动力
- 入口形态：新增聚合入口 `牛马补给站`，承接今日任务、抽奖、背包和弱社交邀请
- 核心闭环：
  `每日轻任务 -> 领取抽奖券 -> 抽奖 -> 获得银子 / 道具 -> 道具反哺健身打卡和赛季贡献`
- 第一版奖励结构：
  健身打卡获得 `1` 张券；四维任务全成获得 `1` 张券；抽奖券可长期累积并支持十连
- 数据策略：
  任务卡、奖池和道具定义先走本地配置；用户任务、券流水、背包、抽奖、道具使用和社交邀请进数据库
- 与企业微信关系：
  弱社交道具使用后通过企业微信群机器人发送提醒，系统内仍保留邀请和响应状态
- 与团队动态关系：
  只沉淀高价值游戏事件，不把所有普通任务完成和点名动作刷进时间线

### Story 切分

当前已拆成 `GM-00` 到 `GM-15` 的 story roadmap：
`docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

实施原则：

- 当前游戏化大文档只作为 master planning reference
- 真正实现时必须拆成 `1 个 story = 1 份 spec + 1 份 plan`
- 每个 story 都应可独立测试、独立合并、独立上线
- 可上线不代表必须有前端变化，配置、数据模型、服务层和 API foundation 也可以单独上线
- 后续 story 可以扩展前序能力，但不应要求重写前序 story

第一版按以下 release slices 推进：

1. `Foundation`：P3 经济稳定、内容配置、数据库基础
2. `牛马补给站 MVP`：页面入口、四维任务、生活券、健身券
3. `Lottery and Backpack`：单抽、十连、购券补齐、背包库存
4. `Boosts and Leave Protection`：今日生效道具、请假券、暴击结算
5. `Redemption and WeChat`：瑞幸咖啡券、企业微信 sender、弱社交邀请
6. `Archive and Recap`：团队动态、文档中心规则、周报 / 战报接入

### 与主线的边界

- 企业微信基础能力属于主线；弱社交提醒使用企业微信属于牛马补给站集成
- 团队动态本体属于主线；牛马补给站高价值事件写入团队动态属于后续集成
- 文档中心本体属于主线；牛马补给站规则说明属于文档中心内容扩展
- 周报本体属于主线；游戏化数据进入周报属于后续集成

---

## 接下来 2-4 周

### 主线最高优先级
- 设计并实现“团队动态”信息架构，采用喇叭入口 + 页面级面板，先让战报结果有地方沉淀
- 为团队动态新增独立数据模型，和实时 `ActivityEvent` 分离
- 搭一个轻量文档中心，先承接 changelog 与赛季规则
- 实现“手动生成周报”MVP，并保存为团队动态

### 牛马补给站最高优先级
- 为 GM-01 `Content Config Foundation` 写代码级实施计划
- 完成 GM-01：内容配置、字段类型和配置校验
- 完成 GM-02：数据库基础表和券余额 / 流水模型
- 完成 GM-03 / GM-04：牛马补给站页面入口、四维任务和生活券领取
- 完成 GM-05：健身打卡发券，并处理已消费券阻止撤销的提示

### 主线次优先级
- 接入企业微信群机器人 Webhook，实现周报一键推送
- 打磨咖啡打卡页和牛马日历的移动端体验
- 继续补关键回归测试，特别是跨 Tab 状态同步、赛季结算边界和周报生成口径

### 牛马补给站次优先级
- 实现 GM-06 / GM-07：抽奖、十连保底、银子补齐和背包
- 实现 GM-08 / GM-09：今日生效道具、请假券、暴击道具和赛季结算接入
- 实现 GM-10 / GM-12：瑞幸咖啡券兑换、弱社交道具和企业微信群机器人提醒
- 后续接入 GM-13 / GM-15：团队动态和周报 / 战报

### 暂缓项
- 自动定时周报
- Quest / Todo / Auto Quest（先由四维轻任务替代，不作为 P4 MVP）
- Rank 等级体系
- GP 历史流水与重商城化玩法
- Apple Health / Google Fit / Strava 等健康数据接入

这些能力不是取消，而是等待团队动态、周报和经济系统稳定后再重排优先级。

---

## 中长期规划

### 中期
- 自动周报和月报
- 企业微信更完整的配置与推送记录
- 文档中心内容扩展与后台维护能力
- 牛马补给站完整玩法：抽奖、背包、暴击、弱社交、真实福利兑换
- Todo / Quest 任务系统（视四维轻任务使用情况再决定是否恢复）
- 自动重复任务（Auto Quest，暂不优先）
- 团队排行与竞赛机制
- 银子消费与奖励兑换（优先落在抽奖券、基础道具和瑞幸咖啡券）
- 多团队支持

### 长期
- 公有云部署
- 原生移动端
- 更多游戏化元素：成就、徽章、称号
- 与 Apple Health / Google Fit / Strava 等外部平台集成

---

## 相关文档

### Specs
- `docs/superpowers/specs/2026-04-18-user-avatar-system-design.md`
- `docs/superpowers/specs/2026-04-18-login-page-design.md`
- `docs/superpowers/specs/2026-04-18-core-board-design.md`
- `docs/superpowers/specs/2026-04-19-branding-localization-design.md`
- `docs/superpowers/specs/2026-04-19-shared-board-design.md`
- `docs/superpowers/specs/2026-04-20-report-center-light-dashboard-design.md`
- `docs/superpowers/specs/2026-04-22-punch-persistence-and-sync-design.md`
- `docs/superpowers/specs/2026-04-22-economy-and-season-system-design.md`
- `docs/superpowers/specs/2026-04-23-coffee-checkin-design.md`
- `docs/superpowers/specs/2026-04-23-niuma-calendar-design.md`
- `docs/superpowers/specs/2026-04-25-team-dynamics-design.md`
- `docs/superpowers/specs/2026-04-25-docs-center-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/p2-2026-04-19-quest-and-gp-system-design.md`

### Plans
- `docs/superpowers/plans/2026-04-18-user-avatar-system.md`
- `docs/superpowers/plans/2026-04-18-login-page.md`
- `docs/superpowers/plans/2026-04-18-core-board.md`
- `docs/superpowers/plans/2026-04-19-branding-localization.md`
- `docs/superpowers/plans/2026-04-19-shared-board.md`
- `docs/superpowers/plans/2026-04-20-report-center-light-dashboard.md`
- `docs/superpowers/plans/2026-04-22-punch-persistence-and-sync.md`
- `docs/superpowers/plans/2026-04-22-economy-and-season-system.md`
- `docs/superpowers/plans/2026-04-23-coffee-checkin.md`
- `docs/superpowers/plans/2026-04-23-niuma-calendar.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`
- `docs/superpowers/plans/p2-2026-04-19-data-persistence-and-gp.md`

---

- 最后更新：2026-04-25
- 当前状态：P3 基础闭环已基本落地，下一阶段聚焦团队动态入口、文档中心、手动周报、企业微信推送和“牛马补给站”游戏化更新
