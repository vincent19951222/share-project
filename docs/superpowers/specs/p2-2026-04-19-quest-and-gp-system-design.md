# Quest & GP System Design

> 把 ShareList 的完整 Quest 功能（Todo + Auto Quest + GP 积分）集成到 Room Todo，作为 additional feature。

## 背景与动机

Room Todo 当前是一个团队打卡仪表盘，打卡操作只在前端 state 中，刷新即丢失。ShareList 是一个 Room-based 的协作任务面板，有完整的 Quest/Todo + Auto Quest + GP 积分体系。

目标：将 ShareList 的 Quest 功能迁移到 Room Todo，与现有打卡体系融合，形成"打卡 + 任务"双引擎的团队协作工具。

## 设计决策

| 维度 | 决定 | 原因 |
|------|------|------|
| 实时同步 | 不需要，API Route + 刷新 | Room Todo 是纯 Next.js 架构，保持简单 |
| UI 集成方式 | Navbar 新 Tab | 与 Board/Report/Activity 并列，不破坏现有布局 |
| 积分体系 | 统一 GP | coins 字段无业务逻辑，改名成本为零；统一积分体验更完整 |
| 实施策略 | 4 阶段分批 | 每阶段独立可交付，降低风险 |

## 数据模型

### 现有表调整

**User 表：**
- `coins Int` → `gp Int`（直接改名）

**PunchRecord 表：**
- 新增 `gpAwarded Int` — 记录这次打卡奖励了多少 GP

### 新增表

**GpLedger — GP 流水账：**
- `id` String @id @default(cuid())
- `userId` String → User
- `sourceType` String — 枚举值：`PUNCH` / `QUEST_COMPLETE` / `QUEST_REVERT`
- `sourceId` String — 关联源 ID（PunchRecord.id 或 TodoItem.id）
- `gpDelta` Int — 变动量（正数加，负数扣）
- `awardedAt` DateTime @default(now())
- `reversedAt` DateTime? — 被撤销的时间

**TodoItem — 任务：**
- `id` String @id @default(cuid())
- `title` String
- `gpReward` Int @default(5)
- `teamId` String → Team
- `createdByUserId` String → User
- `completedByUserId` String? → User
- `completedAt` DateTime?
- `isDeleted` Boolean @default(false)
- `autoQuestId` String? → AutoQuest
- `createdAt` DateTime @default(now())
- `updatedAt` DateTime @updatedAt

**AutoQuest — 自动任务模板：**
- `id` String @id @default(cuid())
- `title` String
- `gpReward` Int @default(10)
- `repeatMask` Int — 位掩码（bit 0=周一 ... bit 6=周日，如 `0b1010101` = 周一三五日）
- `isEnabled` Boolean @default(true)
- `teamId` String → Team
- `createdByUserId` String → User
- `createdAt` DateTime @default(now())
- `updatedAt` DateTime @updatedAt

## 阶段 4：数据持久化 & 统一积分

### 目标

将打卡操作从纯前端 state 迁移到数据库，建立统一 GP 积分基础。

### GP 规则

- 每日打卡奖励 **+5 GP**
- 同一天重复打卡不重复奖励（`PunchRecord` 的 `@@unique([userId, dayIndex])` 保证）
- 完成/撤销打卡通过 `GpLedger` 记录

### API

- `POST /api/board/punch` — 新增。打卡写入 DB + 记 GpLedger，返回更新后的打卡状态
- `GET /api/board` — 改造。从 DB 读取真实打卡数据，不再用 seed 随机数据

### 前端变更

- `PUNCH` dispatch 调用 API 而非纯本地 state 更新
- BoardLayout 从 DB 读取真实 punch 数据构建 initialState
- HeatmapGrid 展示真实打卡记录

## 阶段 5：Todo List（核心 Quest）

### UI 设计

Navbar 新增 "Quests" tab，切换后展示 Quest 面板。沿用 brutalist 设计语言。

**布局结构：**
- Section Bar：标题 "TODAY'S QUESTS" + "Auto Quests" 链接
- 任务列表：每条任务包含 checkbox、标题、创建者、GP 奖励
- 底部 Composer：输入框 + GP 奖励设置 + 提交按钮

### 业务逻辑

| 操作 | 权限 | 效果 |
|------|------|------|
| 新增任务 | 任何成员 | 创建 TodoItem |
| 编辑任务（标题/GP） | 仅创建者 | 更新 TodoItem |
| 完成任务 | 任何成员 | 写 completedBy + GpLedger(+) + User.gp += |
| 撤销完成 | 任何成员 | 清 completedBy + GpLedger(-) reverse + User.gp -= |
| 删除任务 | 仅创建者 | 软删除 isDeleted=true |

### API

- `GET /api/quests` — 获取当前团队所有有效任务（`isDeleted=false`）
- `POST /api/quests` — 新增任务
- `PATCH /api/quests/[id]` — 编辑 / 完成 / 撤销
- `DELETE /api/quests/[id]` — 软删除

## 阶段 6：Auto Quest（自动化任务）

### UI 设计

从 Quest 面板 Section Bar 点击 "Auto Quests" 进入独立视图。

**布局结构：**
- 标题栏："Auto Quests" + 新建按钮
- 列表：每条 AutoQuest 显示标题、GP 奖励、重复星期、启停状态、编辑按钮

### 懒生成逻辑

1. 用户打开 Quest 面板时，调用 `GET /api/auto-quests/generate`
2. 服务端遍历所有 `isEnabled=true` 的 AutoQuest
3. 检查今天（上海时区）的 `repeatMask` 对应 bit 是否为 1
4. 查询今天是否已有该 AutoQuest 的实例（`TodoItem.autoQuestId` + `createdAt` 在今天）
5. 如果没有，创建一条 `TodoItem` 并关联 `autoQuestId`

### 防重复与同步

- 同一天同一 AutoQuest 只生成一次（查询已有实例）
- 编辑 AutoQuest 的标题/GP 后，今天的实例同步更新
- 暂停 AutoQuest 后，今天的未完成实例保留但不再生成新的

### API

- `GET /api/auto-quests` — 获取 AutoQuest 列表
- `POST /api/auto-quests` — 创建
- `PATCH /api/auto-quests/[id]` — 编辑 / 启停
- `GET /api/auto-quests/generate` — 触发今天的实例生成

## 阶段 7：GP 展示 & Rank（游戏化）

### Rank 等级体系

| Rank | GP 要求 | 视觉 |
|------|---------|------|
| C | 0+ | 灰色 |
| B | 200+ | 蓝色 |
| A | 600+ | 紫色 |
| S | 1200+ | 金色 |

### UI 设计

**Profile Dropdown 增强：**
- 总 GP 数值 + Rank 徽章
- 本周 GP / 本月 GP
- 点击可进入完整 Profile 页

**Profile 页（新增 `/profile` 路由）：**
- GP 总分 + Rank 徽章（大号展示）
- 周/月统计卡片
- 历史流水列表（GpLedger，分页）

### 数据查询

所有统计从 `GpLedger` 聚合：
- `totalGp`：`SUM(gpDelta) WHERE reversedAt IS NULL`
- `thisWeekGp`：同上 + 本周一至今
- `thisMonthGp`：同上 + 本月 1 号至今
- `history`：按 `awardedAt DESC` 排序，分页

### API

- `GET /api/profile/me` — 返回当前用户 GP 统计 + 流水（支持分页）

## 全局 Prisma Schema 汇总

最终数据库将包含以下表：

1. **Team** — 团队（已有）
2. **User** — 用户，`coins` → `gp`（已有，调整）
3. **PunchRecord** — 打卡记录，新增 `gpAwarded`（已有，调整）
4. **GpLedger** — GP 流水账（新增）
5. **TodoItem** — 任务（新增）
6. **AutoQuest** — 自动任务模板（新增）

## 技术约束

- 纯 Next.js 架构，不引入后端服务
- 所有数据通过 API Route 访问
- 时区统一使用 `Asia/Shanghai`
- ID 统一使用 CUID
- 时间戳统一使用 ISO 8601 DateTime
- TDD 开发流程
- 不引入外部 UI 库
