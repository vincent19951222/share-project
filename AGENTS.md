# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

"脱脂牛马"（原 Room Todo）是一个为健身团队打造的协同打卡与战报看板应用。采用纯 Next.js 架构，无独立后端服务，所有数据通过 API Routes 访问。

## 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器 (http://localhost:3000)

# 构建
npm run build        # 构建生产版本
npm start            # 启动生产服务器

# 测试
npm test             # 运行所有测试
npm run test:watch   # 监听模式运行测试

# 代码质量
npm run lint         # ESLint 检查

# 数据库
npx prisma generate  # 生成 Prisma Client
npx prisma db push   # 推送 schema 到数据库
npx prisma studio    # 打开 Prisma Studio
npx tsx prisma/seed.ts  # 运行数据库种子
```

## 技术栈

- **框架**: Next.js 15+ (App Router)
- **语言**: TypeScript (strict mode)
- **样式**: Tailwind CSS v4 (本地安装，非 CDN)
- **数据库**: SQLite (dev) / Prisma ORM with better-sqlite3 adapter
- **测试**: Vitest + jsdom
- **认证**: Cookie-based (httpOnly cookies)
- **状态管理**: React Context + useReducer (无外部库)

## 项目结构

```
app/
  (auth)/           # 认证路由组
    login/page.tsx  # 登录页面
  (board)/          # 主应用路由组（需认证）
    layout.tsx      # BoardProvider + 数据预加载
    page.tsx        # 主面板页面
  api/              # API Routes
    auth/login/route.ts    # 登录/注册
    auth/logout/route.ts   # 登出
    user/profile/route.ts  # 用户资料编辑
  layout.tsx        # 根布局（字体、元数据）
  globals.css       # 全局样式

components/
  login/
  navbar/
  punch-board/      # 打卡看板组件
  report-center/    # 战报中心组件
  ui/               # 通用 UI 组件

lib/
  prisma.ts         # Prisma Client 单例
  auth.ts           # 密码哈希/验证、cookie 处理
  types.ts          # TypeScript 类型定义
  store.tsx         # BoardProvider + useReducer
  api.ts            # 后端 API 抽象层
  avatars.ts        # 头像 key 验证

prisma/
  schema.prisma     # 数据库模型定义
  dev.db            # SQLite 数据库文件
  seed.ts           # 数据库种子脚本
```

## 路由架构

- **路由组**: Next.js Route Groups 用于区分认证状态
  - `(auth)`: 公开页面（登录）
  - `(board)`: 需认证页面（主应用）
- **认证中间件**: 在 `(board)/layout.tsx` 中通过 cookie 验证，未登录重定向到 `/login`
- **数据预加载**: `(board)/layout.tsx` 预加载团队和打卡数据并注入 `BoardProvider`

## 状态管理模式

采用 React Context + useReducer 模式（`lib/store.tsx`）：

```typescript
// Provider 在 layout.tsx 中使用，预加载初始数据
<BoardProvider initialState={initialState}>
  {children}
</BoardProvider>

// 组件中通过 hook 访问
const { state, dispatch } = useBoard();
```

**Actions**: `PUNCH`, `ADD_LOG`, `SET_TAB`, `SIMULATE_REMOTE_PUNCH`

**重要**: 当前打卡操作仅更新前端 state，刷新后丢失。P2 阶段将迁移到数据库持久化。

## 数据库模型

**核心表**:
- `Team`: 团队
- `User`: 用户（包含 `coins` 积分字段）
- `PunchRecord`: 打卡记录（`@@unique([userId, dayIndex])` 保证每日唯一性）

**关系**: User → Team (多对一), User → PunchRecord (一对多)

**重要**: `coins` 字段将在 P2 阶段重命名为 `gp` (Game Points)，统一积分体系。

## 认证流程

1. **登录/注册**: `POST /api/auth/login` 同时处理登录和注册
   - 登录: 验证密码，设置 cookie
   - 注册: 创建用户，分配到第一个可用团队，设置 cookie
2. **Cookie**: `userId` 存储在 httpOnly cookie 中（7天有效期）
3. **密码**: 使用 bcryptjs 哈希（10 rounds）

## 样式系统

**全局样式** (`app/globals.css`):
- `.soft-card`: 卡片容器样式
- `.quest-btn`: Brutalist 黄色按钮（按下效果）
- `.cell-*`: 打卡格子状态样式
- `.text-sub` / `.text-main`: 语义化文本颜色

**设计语言**: Brutalist 风格（粗边框、阴影、按下效果）
- 主色调: 黄色 (#fde047) + 深灰 (#1f2937)
- 字体: Quicksand + Noto Sans SC（支持中文）

## 测试配置

- **框架**: Vitest
- **环境**: jsdom
- **配置**: `@` 别名映射到项目根目录
- **文件约定**: `__tests__/*.test.ts`
- **全局对象**: describe, it, expect 可直接使用（无需 import）

## 品牌与本土化

**产品名称**: "脱脂牛马"（健身团队打卡平台）
**界面语言**: 中文为主，保持技术日志英文
**特殊术语**:
- "牛马金库" (Team Vault)
- "今日脱脂率" (Today's Rate)
- "银子" (积分单位)

## 架构原则

1. **纯 Next.js**: 无独立后端，所有业务逻辑在 API Routes
2. **无外部 UI 库**: 所有组件自实现（除 Radix UI 基础 primitives）
3. **类型安全**: TypeScript strict mode，无 `any` 类型
4. **数据预加载**: 在 layout 中预加载数据，避免客户端 fetch
5. **Brutalist 设计**: 粗边框、强阴影、明确的交互反馈

## 重要文件位置

- **类型定义**: [lib/types.ts](lib/types.ts)
- **Prisma 配置**: [prisma/schema.prisma](prisma/schema.prisma)
- **全局样式**: [app/globals.css](app/globals.css)
- **状态管理**: [lib/store.tsx](lib/store.tsx)
- **认证逻辑**: [lib/auth.ts](lib/auth.ts)
- **主布局**: [app/(board)/layout.tsx](app/(board)/layout.tsx)（数据预加载逻辑）

## 开发注意事项

1. **数据库迁移**: 修改 `schema.prisma` 后运行 `npx prisma db push`
2. **Prisma Client**: 自定义输出路径 `lib/generated/prisma`，import 时使用 `@/lib/generated/prisma/client`
3. **时区**: 所有时间戳统一使用 Asia/Shanghai
4. **ID 生成**: 统一使用 CUID (Prisma `@default(cuid())`)
5. **认证状态**: 在 `(board)/layout.tsx` 中验证，不要在单独组件中重复检查
