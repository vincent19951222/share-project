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

## 🚧 进行中的功能

### 📊 P2: Quest & GP 系统（分阶段实施）

**设计完成时间：** 2026年4月19日

**系统概览：**
- 📋 Todo List - 手动任务管理
- 🤖 Auto Quest - 自动化重复任务
- 💰 GP 积分体系 - 统一的游戏化积分
- 📈 GP Rank 等级系统 - C/B/A/S 晋升机制

**实施阶段：**

#### 🔄 阶段 4: 数据持久化 & 统一积分
**状态：** 设计完成，待实施

**功能目标：**
- 将打卡操作从前端 state 迁移到数据库
- 建立 GP 流水账系统（`GpLedger` 表）
- 统一积分单位（`coins` → `gp`）
- 打卡奖励 +5 GP（每日一次）

**技术要点：**
- `POST /api/board/punch` - 打卡API
- `GET /api/board` - 从数据库读取真实数据
- `GpLedger` 表记录所有积分变动

**相关文档：**
- [设计规范](docs/superpowers/specs/p2-2026-04-19-quest-and-gp-system-design.md)
- [实施计划](docs/superpowers/plans/p2-2026-04-19-data-persistence-and-gp.md)

---

#### 📋 阶段 5: Todo List（核心 Quest）
**状态：** 设计完成，待阶段4完成后实施

**功能目标：**
- Navbar 新增 "Quests" tab
- 手动创建、完成、撤销任务
- 任务完成奖励 GP
- 权限控制（创建者可编辑/删除）

**技术要点：**
- `TodoItem` 表 - 任务数据
- `GET/POST/PATCH/DELETE /api/quests` - 任务CRUD
- GpLedger 记录任务完成积分

---

#### 🤖 阶段 6: Auto Quest（自动化任务）
**状态：** 设计完成，待阶段5完成后实施

**功能目标：**
- 创建重复性任务模板
- 按星期几自动生成实例
- 懒生成机制（打开面板时生成）
- 防重复和同步机制

**技术要点：**
- `AutoQuest` 表 - 自动任务模板
- 位掩码存储重复规则（周一~周日）
- `GET /api/auto-quests/generate` - 触发生成

---

#### 🏆 阶段 7: GP 展示 & Rank
**状态：** 设计完成，待阶段6完成后实施

**功能目标：**
- GP Rank 等级体系（C/B/A/S）
- Profile 页面显示 GP 统计
- 周/月统计卡片
- GP 流水历史记录

**Rank 体系：**
| Rank | GP 要求 | 视觉 |
|------|---------|------|
| C | 0+ | 灰色 |
| B | 200+ | 蓝色 |
| A | 600+ | 紫色 |
| S | 1200+ | 金色 |

**相关文档：**
- [设计规范](docs/superpowers/specs/p2-2026-04-19-quest-and-gp-system-design.md)

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

### 计划中
- **4月下旬：** 开始实施阶段4（数据持久化）
- **5月上旬：** 完成阶段5（Todo List）
- **5月中旬：** 完成阶段6（Auto Quest）
- **5月下旬：** 完成阶段7（GP Rank）

---

## 🎯 未来规划

### 短期目标（1-2个月）
- ✅ 完成 Quest & GP 系统全部4个阶段
- 📱 移动端响应式优化
- 🔔 浏览器通知提醒
- 📊 更多数据统计图表

### 中期目标（3-6个月）
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
- [Quest & GP 系统设计](docs/superpowers/specs/p2-2026-04-19-quest-and-gp-system-design.md)
- [品牌本土化设计](docs/superpowers/specs/2026-04-19-branding-localization-design.md)

### 实施计划
- [用户头像系统实施](docs/superpowers/plans/2026-04-18-user-avatar-system.md)
- [登录页面实施](docs/superpowers/plans/2026-04-18-login-page.md)
- [核心打卡板实施](docs/superpowers/plans/2026-04-18-core-board.md)
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

**最后更新：** 2026年4月19日  
**版本：** 1.0.0  
**状态：** 活跃开发中 🚀