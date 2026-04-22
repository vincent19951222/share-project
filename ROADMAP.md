# 脱脂牛马 - 项目路线图

> 一个为健身团队打造的协作打卡平台，让"脱脂"不再孤单！

## 🎯 项目愿景

打造一个轻松有趣、具有团队归属感的健身协作平台，通过打卡、任务和积分体系，让健身变得更有动力和趣味性。

**核心理念：** "脱脂牛马" - 用幽默和自嘲的方式，让健身之路不再孤单。

---

## ✅ 已完成功能

### 🎨 P1: 基础平台建设（2026年4月）

#### 1. 用户头像系统 ✅
**完成时间：** 2026年4月18日

**功能特性：**
- 🎭 8种独特的动物头像选择
- 🖼️ 头像映射系统和常量定义
- 🔄 从 `avatarSvg` 迁移到 `avatarKey + img` 标签
- 📊 种子数据更新，支持用户头像

**技术实现：**
- `lib/avatars.ts` - 头像配置和映射
- `components/profile/EditProfileModal.tsx` - 头像编辑功能
- `prisma/seed.ts` - 种子数据头像支持

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-18-user-avatar-system-design.md)
- [实施计划](docs/superpowers/plans/2026-04-18-user-avatar-system.md)

---

#### 2. 登录注册系统 ✅
**完成时间：** 2026年4月18日

**功能特性：**
- 🔐 统一的登录/注册表单
- 🎭 注册时头像选择功能
- 🔄 自动注册模式（登录时自动创建新用户）
- ✨ 表单验证和错误处理
- 🎨 Brutalist 设计风格

**技术实现：**
- `components/login/LoginForm.tsx` - 登录表单组件
- `app/api/auth/login/route.ts` - 登录API（支持自动注册）
- `app/(auth)/login/page.tsx` - 登录页面

**品牌文案：**
- "加入牛马俱乐部"
- "开工！"
- "共同成长"

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-18-login-page-design.md)
- [实施计划](docs/superpowers/plans/2026-04-18-login-page.md)

---

#### 3. 核心打卡板 ✅
**完成时间：** 2026年4月18日

**功能特性：**
- 📊 团队打卡看板，显示所有成员的打卡状态
- 🔥 热力图展示，显示30天的打卡记录
- 📈 活动动态实时更新
- 👥 团队头部信息展示
- 🎯 进度条和目标追踪
- 🏆 战报中心（数据统计和趋势分析）

**界面组件：**
- `components/punch-board/PunchBoard.tsx` - 主打卡板
- `components/punch-board/HeatmapGrid.tsx` - 热力图
- `components/punch-board/TeamHeader.tsx` - 团队头部
- `components/punch-board/ActivityStream.tsx` - 活动动态
- `components/report-center/ReportCenter.tsx` - 战报中心

**品牌文案：**
- "牛马金库"
- "今日脱脂率"
- "本周牛马放纵餐"
- "活动动态（实时）"
- "同步中"
- "催促" / "已催促"

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-18-core-board-design.md)
- [实施计划](docs/superpowers/plans/2026-04-18-core-board.md)

---

#### 4. 品牌本土化 ✅
**完成时间：** 2026年4月19日

**品牌定位：**
- 🐮 **产品名称：** 脱脂牛马
- 💰 **积分单位：** 银子
- 🎯 **品牌调性：** 轻松、幽默、有归属感

**完成的中文化：**
- ✅ 页面标题和元数据
- ✅ 导航栏品牌标识
- ✅ 所有界面文本标签
- ✅ 登录页面完整中文化
- ✅ 活动动态区域中文化

**品牌词汇表：**
| 英文原文 | 中文版本 | 使用场景 |
|---------|----------|----------|
| Room Todo | 脱脂牛马 | 产品名称 |
| Team Vault | 牛马金库 | 团队积分展示 |
| Today's Rate | 今日脱脂率 | 今日打卡统计 |
| WEEKLY QUEST | 本周牛马放纵餐 | 周目标奖励 |
| Pts | 银子 | 积分单位 |
| Join Room | 加入牛马俱乐部 | 登录页标题 |
| Start Quest | 开工！ | 登录按钮 |
| Poke | 催促 | 提醒队友 |
| Activity Stream | 活动动态 | 实时更新流 |

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-19-branding-localization-design.md)
- [实施计划](docs/superpowers/plans/2026-04-19-branding-localization.md)

---

## 🚧 近期研发状态

### ✅ P2: 共享打卡基础能力（2026年4月20日-22日）

#### 1. 战报中心轻量数据看板 ✅
**状态：** 已设计并纳入近期版本

**功能目标：**
- 将 `战报中心` 从静态展示改成由 `BoardState` 驱动的轻量看板
- 移除固定月份、固定分数和假人名等占位内容
- 保留 Brutalist 风格，聚焦团队完成率、总打卡数、全勤日和高光成员

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-20-report-center-light-dashboard-design.md)
- [实施计划](docs/superpowers/plans/2026-04-20-report-center-light-dashboard.md)

---

#### 2. 共享看板 ✅
**状态：** 已进入产品路线图

**功能目标：**
- 新增 `共享看板` Tab，作为团队内部轻量便签墙
- 支持自由笔记和团队通告
- 支持发布、删除、软删除、瀑布流展示和同步状态提示
- 预留置顶和过期字段，但第一版不做完整公告系统

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-19-shared-board-design.md)
- [实施计划](docs/superpowers/plans/2026-04-19-shared-board.md)

---

#### 3. 打卡持久化 & 轻量同步 ✅
**状态：** 已作为经济系统前置能力

**功能目标：**
- 将真实打卡从前端本地 state 迁移到数据库
- 新增 `POST /api/board/punch` 持久化打卡
- 新增 `GET /api/board/state` 获取团队快照
- 通过 5 秒轮询让多端看板在单服务部署下保持同步
- 重复打卡由服务端保护，避免重复加银子

**相关文档：**
- [设计规范](docs/superpowers/specs/2026-04-22-punch-persistence-and-sync-design.md)
- [实施计划](docs/superpowers/plans/2026-04-22-punch-persistence-and-sync.md)

---

### 💰 P3: 经济系统 & 赛季冲刺（研发中）

- **当前状态：** 研发中
- **设计完成时间：** 2026年4月22日
- **定位：** 先建立清晰的打卡经济模型，再继续推进 Quest / Todo / Rank。

**系统概览：**
- 💰 `我的银子` - 用户永久累计的个人资产
- 🏦 `牛马金库` - 团队所有成员个人资产总和，仅用于展示
- 🔥 `牛马冲刺条` - 赛季维度的团队目标进度
- 📈 `赛季收入` - 当前赛季内的个人收入统计
- 🧩 `streak` - 用户级连续打卡状态，不随赛季切换重置

**核心规则：**
- 有效打卡奖励按连续天数递增：`10 -> 20 -> 30 -> 40 -> 50`，第 5 天后维持 `50`
- 每次有效打卡只推进赛季冲刺条 `+1` 格，不受 streak 奖励倍率影响
- 赛季由管理员手动开启和结束，不按自然月自动切换
- 赛季目标档位固定为 `50 / 80 / 100 / 120 / 150`
- 当前保留数据库字段 `User.coins`，前台统一展示为“我的银子”

**实施阶段：**

#### 阶段 1: 经济规则与赛季主题基础 ✅
**状态：** 已进入代码

**功能目标：**
- 新增 `lib/economy.ts`，集中处理上海时区 day key、streak、奖励和赛季档位校验
- 新增 `lib/season-theme.ts`，提供每月固定赛季底色和 5 个成员贡献色
- 增加对应单元测试，锁定经济规则边界

---

#### 阶段 2: 数据模型与种子数据 ✅
**状态：** 已进入代码，仍需和完整结算链路联调

**功能目标：**
- `User` 增加 `role`、`currentStreak`、`lastPunchDayKey`
- 新增 `Season` 和 `SeasonMemberStat`
- `PunchRecord` 增加 `dayKey`、`seasonId`、`streakAfterPunch`、`assetAwarded`、`countedForSeasonSlot`
- 种子数据指定首位用户 `li` 为管理员，并清理本团队赛季数据

---

#### 阶段 3: 服务端打卡结算 🚧
**状态：** 研发中

**功能目标：**
- 将当前固定奖励打卡升级为 streak 奖励结算
- 无 active 赛季时仍可正常增加“我的银子”和 streak
- 有 active 赛季时同步增加“赛季收入”，并推进“牛马冲刺条”
- 冲刺条满格后继续累计个人银子和赛季收入，但不再增加额外格子
- 保持重复打卡、并发打卡和服务端快照一致性

---

#### 阶段 4: 管理员赛季管理 ⏳
**状态：** 待实施

**功能目标：**
- 新增管理员赛季 API
- 新增 `/admin` 赛季设置页
- 支持创建赛季、结束当前赛季、查看赛季历史
- 仅管理员可进入和操作

---

#### 阶段 5: 看板与战报语义升级 ⏳
**状态：** 待实施

**功能目标：**
- 团队头部显示新的“牛马金库”“我的银子 / streak”“牛马冲刺条”
- Profile 下拉菜单展示真实个人银子和连续打卡状态
- 战报中心停止把金库当目标进度条，改为展示团队总资产和赛季辅助信息
- 新增固定长度的赛季分段进度条组件

**相关文档：**
- [经济与赛季系统设计](docs/superpowers/specs/2026-04-22-economy-and-season-system-design.md)
- [经济与赛季系统实施计划](docs/superpowers/plans/2026-04-22-economy-and-season-system.md)

---

### 📋 P4: Quest / Todo / Rank（后续）

**状态：** 后移，待经济系统稳定后继续

**后续范围：**
- 手动 Todo / Quest 管理
- Auto Quest 自动化重复任务
- GP / 银子流水历史
- C/B/A/S Rank 等级体系
- 任务奖励与赛季、个人资产的关系梳理

**说明：** 旧版 Quest & GP 设计仍保留为参考，但近期实现优先级已经调整为“经济系统 & 赛季冲刺”。

**相关文档：**
- [Quest & GP 系统设计](docs/superpowers/specs/p2-2026-04-19-quest-and-gp-system-design.md)
- [数据持久化和 GP 实施](docs/superpowers/plans/p2-2026-04-19-data-persistence-and-gp.md)

---

## 🎨 设计语言

### 视觉风格
- **设计风格：** Brutalist（粗野主义）
- **色彩系统：** Slate灰 + 黄色点缀 + 功能色彩
- **排版：** Quicksand（英文）+ Noto Sans SC（中文）
- **组件风格：** 圆角卡片、粗边框、阴影效果

### 品牌调性
- **名称：** 脱脂牛马
- **语气：** 轻松、幽默、自嘲但积极
- **关键词：** 牛马、银子、脱脂、放纵餐、开工、催促
- **目标用户：** 健身团队、互相督促的小伙伴

---

## 🔧 技术栈

**前端框架：**
- Next.js 15 (App Router)
- React 19
- TypeScript 5.7

**样式：**
- Tailwind CSS 4.0
- CSS Modules

**数据库：**
- Prisma 7.7
- Better SQLite3

**开发工具：**
- Vitest 4.1（测试）
- ESLint（代码检查）
- Git Hooks（提交规范）

---

## 📅 时间线

### 2026年4月
- **4月18日：** 完成用户头像系统、登录页面、核心打卡板
- **4月19日：** 完成品牌本土化，Quest & GP 系统设计
- **4月20日：** 完成战报中心轻量数据看板设计
- **4月22日：** 完成打卡持久化/同步设计，启动经济与赛季系统研发

### 近期计划
- **当前：** 推进经济系统服务端结算（streak 奖励、个人银子、赛季收入、冲刺条）
- **下一步：** 管理员赛季管理页与赛季 API
- **随后：** 看板头部、Profile、战报中心的经济语义升级
- **经济系统稳定后：** 重新评估 Quest / Todo / Auto Quest / Rank 的优先级

---

## 🎯 未来规划

### 短期目标（1-2个月）
- 🚧 完成经济系统 & 赛季冲刺闭环
- 🧾 建立清晰的银子、赛季收入、牛马金库、冲刺条语义
- 🛠️ 完成管理员赛季管理入口
- 📱 移动端响应式优化
- 🔔 浏览器通知提醒
- 📊 更多数据统计图表

### 中期目标（3-6个月）
- 📋 Todo / Quest 任务系统
- 🤖 Auto Quest 自动化重复任务
- 🏆 团队排行榜和竞赛
- 🎁 积分商城（用银子兑换奖励）
- 👥 多团队支持
- 🤝 社交分享功能

### 长期愿景（6-12个月）
- 🌐 公有云部署，支持多团队使用
- 📱 原生移动应用
- 🎮 更多游戏化元素（成就系统、徽章）
- 🔗 与其他健身应用集成（Apple Health、Google Fit）

---

## 📚 相关文档

### 设计规范
- [用户头像系统设计](docs/superpowers/specs/2026-04-18-user-avatar-system-design.md)
- [登录页面设计](docs/superpowers/specs/2026-04-18-login-page-design.md)
- [核心打卡板设计](docs/superpowers/specs/2026-04-18-core-board-design.md)
- [共享看板设计](docs/superpowers/specs/2026-04-19-shared-board-design.md)
- [战报中心轻量看板设计](docs/superpowers/specs/2026-04-20-report-center-light-dashboard-design.md)
- [打卡持久化与同步设计](docs/superpowers/specs/2026-04-22-punch-persistence-and-sync-design.md)
- [经济与赛季系统设计](docs/superpowers/specs/2026-04-22-economy-and-season-system-design.md)
- [Quest & GP 系统设计](docs/superpowers/specs/p2-2026-04-19-quest-and-gp-system-design.md)
- [品牌本土化设计](docs/superpowers/specs/2026-04-19-branding-localization-design.md)

### 实施计划
- [用户头像系统实施](docs/superpowers/plans/2026-04-18-user-avatar-system.md)
- [登录页面实施](docs/superpowers/plans/2026-04-18-login-page.md)
- [核心打卡板实施](docs/superpowers/plans/2026-04-18-core-board.md)
- [共享看板实施](docs/superpowers/plans/2026-04-19-shared-board.md)
- [战报中心轻量看板实施](docs/superpowers/plans/2026-04-20-report-center-light-dashboard.md)
- [打卡持久化与同步实施](docs/superpowers/plans/2026-04-22-punch-persistence-and-sync.md)
- [经济与赛季系统实施](docs/superpowers/plans/2026-04-22-economy-and-season-system.md)
- [数据持久化和 GP 实施](docs/superpowers/plans/p2-2026-04-19-data-persistence-and-gp.md)
- [品牌本土化实施](docs/superpowers/plans/2026-04-19-branding-localization.md)

### 技术文档
- [故障排除指南](TROUBLESHOOTING.md)
- [品牌本土化验证报告](VERIFICATION.md)

---

## 🙏 致谢

**团队：** 脱脂牛马健身群  
**技术支持：** Claude Code + Superpowers  
**设计理念：** 让健身不再孤单，让脱脂成为一种乐趣！

---

- **最后更新：** 2026年4月22日
- **版本：** 1.1.0
- **状态：** 经济系统研发中 🚧
