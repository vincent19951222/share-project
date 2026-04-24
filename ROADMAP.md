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
- 待打磨：中文文案、移动端体验、表单交互和异常提示
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
- 待打磨：中文文案、视觉密度、移动端适配、赛季贡献说明
- 关键文件：
  `components/punch-board/TeamHeader.tsx`
  `components/punch-board/SeasonProgressBar.tsx`
  `components/navbar/ProfileDropdown.tsx`
  `__tests__/season-progress-bar.test.tsx`
  `__tests__/profile-dropdown.test.tsx`

#### 6. 战报中心赛季复盘
- 待实现
- 当前战报中心已经展示团队打卡统计和咖啡能量站，但还没有完整承接赛季经济复盘
- 后续需要补充赛季收入、冲刺贡献、成员贡献排行、赛季进度解释和阶段性总结

---

## 下一阶段主线：团队动态、手动周报、企业微信推送

### 产品判断

当前产品已经不只是“健身打卡工具”，而是一个团队节奏记录工具。健身打卡、咖啡打卡、日历和战报是第一批入口，下一步要把这些记录沉淀成团队可以讨论、回看和转发的内容。

### 1. 团队动态

- 定位：承接“今天正在发生什么”和“哪些内容值得沉淀”
- 和战报中心的区别：
  团队动态偏现场和时间线，战报中心偏复盘和分析
- 第一版可承接：
  打卡事件
  咖啡事件
  共享看板笔记
  里程碑事件
  手动生成的周报或月报
- 后续可以作为企业微信推送内容的来源

### 2. 手动生成周报

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

### 3. 企业微信整合

- 第一版只做出站推送，优先接企业微信群机器人 Webhook
- 不做复杂 OAuth、成员绑定和回调命令
- 支持推送：
  手动生成的周报
  每日轻量日结
  关键里程碑事件
- 配置建议先放在管理员设置里，后续再考虑更完整的集成管理页

### 4. 协同关系

- 战报中心：负责分析、生成、预览
- 团队动态：负责沉淀、展示、回看
- 企业微信：负责把重要结果送回团队沟通场景
- 共享看板：继续保留轻量便签和公告属性，不承担数据复盘

---

## 接下来 2-4 周

### 最高优先级
- 打磨并验收 P3 已完成基础能力：赛季结算、管理员赛季管理、看板/Profile 经济语义
- 设计并实现“团队动态”信息架构，先让战报结果有地方沉淀
- 实现“手动生成周报”MVP，并保存为团队动态

### 次优先级
- 接入企业微信群机器人 Webhook，实现周报一键推送
- 为战报中心补充赛季复盘模块
- 打磨咖啡打卡页和牛马日历的移动端体验
- 继续补关键回归测试，特别是跨 Tab 状态同步、赛季结算边界和周报生成口径

### 暂缓项
- 自动定时周报
- Quest / Todo / Auto Quest
- Rank 等级体系
- GP 历史流水与商城化玩法
- Apple Health / Google Fit / Strava 等健康数据接入

这些能力不是取消，而是等待团队动态、周报和经济系统稳定后再重排优先级。

---

## 中长期规划

### 中期
- 自动周报和月报
- 企业微信更完整的配置与推送记录
- Todo / Quest 任务系统
- 自动重复任务（Auto Quest）
- 团队排行与竞赛机制
- 银子消费与奖励兑换
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
- `docs/superpowers/plans/p2-2026-04-19-data-persistence-and-gp.md`

---

- 最后更新：2026-04-24
- 当前状态：P3 基础闭环已基本落地，下一阶段聚焦团队动态、手动周报和企业微信推送
