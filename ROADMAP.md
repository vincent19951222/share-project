# 脱脂牛马 - 项目路线图

> 一个面向健身团队的打卡、战报与轻量协作应用。目标不是把大家管得更严，而是把团队节奏记录得更真实、更有趣。

## 项目愿景

脱脂牛马希望把“健身打卡”做成一件更容易坚持的事：

- 用团队看板放大陪伴感和节奏感
- 用轻量数据战报帮助大家回看趋势
- 用生活化记录补全真实状态，而不只记录训练本身
- 用积分、赛季和冲刺条，逐步建立更清晰的游戏化反馈

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
- 展示内容包括：
  今日全队咖啡杯数
  今日续命人数
  本月累计杯数
  本周咖啡王
  近 7 天咖啡因波形
- 咖啡页与战报页现在共享同一份 `CoffeeProvider` 状态，避免重复拉取和状态漂移
- 已补回归测试，确保 `0 杯` 天数在波形里显示为空柱而不是伪高柱
- 关键文件：
  `lib/coffee-store.tsx`
  `components/report-center/CoffeeReportPanel.tsx`
  `components/report-center/ReportCenter.tsx`
  `components/report-center/report-data.ts`
  `__tests__/coffee-report-panel.test.tsx`

---

## 当前研发重点

### P3：经济系统与赛季冲刺

- 当前状态：进行中
- 设计完成时间：2026-04-22
- 当前目标：先把“银子 / 赛季收入 / 牛马金库 / 冲刺条”的语义和结算链路做扎实，再考虑更复杂的 Quest / Rank 扩展

#### 已落地基础

##### 阶段 1：经济规则与赛季主题基础
- 已完成
- 已有 `lib/economy.ts` 处理 Shanghai day key、streak、奖励和赛季档位规则
- 已有赛季主题和颜色映射基础

##### 阶段 2：数据模型与种子数据
- 基本完成
- `User`、`Season`、`SeasonMemberStat`、`PunchRecord` 已具备赛季结算需要的关键字段
- 管理员角色和种子数据已接入

#### 进行中

##### 阶段 3：服务端打卡结算
- 根据 streak 发放奖励
- 在 active season 下同步累计赛季收入并推进冲刺条
- 保证重复打卡、并发打卡和服务端快照一致性

#### 待实现

##### 阶段 4：管理员赛季管理
- `/admin` 赛季配置页
- 创建赛季、结束赛季、查看历史赛季
- 仅管理员可操作

##### 阶段 5：看板与战报的经济语义升级
- 团队头部显示更清晰的“牛马金库 / 我的银子 / streak / 冲刺条”
- Profile 下拉展示真实个人资产与打卡状态
- 战报中心补全赛季辅助信息，而不是把金库直接当进度条

---

## 接下来 2-4 周

### 最高优先级
- 完成服务端打卡结算闭环
- 接通管理员赛季管理 API 与页面
- 统一看板、Profile、战报中的经济语义

### 次优先级
- 打磨咖啡打卡页的移动端体验
- 打磨牛马日历的历史月份浏览体验
- 继续补关键回归测试，特别是跨 Tab 状态同步和赛季结算边界

### 暂缓项
- Quest / Todo / Auto Quest
- Rank 等级体系
- GP 历史流水与商城化玩法

这些能力不是取消，而是等待经济系统稳定后再重排优先级。

---

## 中长期规划

### 中期
- Todo / Quest 任务系统
- 自动重复任务（Auto Quest）
- 团队排行与竞赛机制
- 银子消费与奖励兑换
- 多团队支持

### 长期
- 公有云部署
- 原生移动端
- 更多游戏化元素：成就、徽章、称号
- 与 Apple Health / Google Fit 等外部平台集成

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
- 当前状态：咖啡战报面板已接入，经济系统与赛季结算继续推进中
