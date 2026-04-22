# 登录页面 & 用户系统设计

日期：2026-04-18

## 概述

为 Room Todo 打卡看板引入用户认证系统和 SQLite 数据库，从第一天就使用 Prisma ORM，确保后续数据库迁移无忧。

## 技术选型

| 决策项 | 选择 | 原因 |
|--------|------|------|
| ORM | Prisma | 生态成熟，Schema 直观，迁移工具完善 |
| 数据库 | SQLite | 轻量，前期够用 |
| 认证方式 | 简单 Cookie | 5 个固定用户场景，不需要复杂方案 |
| 架构模式 | API Route + Server Action 混合 | 登录走 API Route，业务操作走 Server Action |

## 第1节：数据库 Schema

```prisma
model Team {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique   // Room Access Code, e.g. "ROOM-88"
  createdAt DateTime @default(now())
  users     User[]
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String             // bcrypt hash
  avatarKey String             // key → 前端 SVG 映射
  coins     Int      @default(0)
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  punchRecords PunchRecord[]
  createdAt DateTime @default(now())
}

model PunchRecord {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  dayIndex  Int               // 打卡第几天，对应热力图列索引
  punched   Boolean
  punchType String?           // 可选的打卡类型描述
  createdAt DateTime @default(now())

  @@unique([userId, dayIndex])  // 每人每天只有一条记录
}
```

**设计决策**：
- 主键使用 CUID（Prisma 默认 `@default(cuid())`），迁移友好
- 时间戳使用 `DateTime`，Prisma 在 SQLite 中存为 ISO 8601 字符串
- 密码用 `bcryptjs` hash，当前 `0000` → seed 时 hash 写入
- `avatarKey` 存 key（如 `alen`），SVG 映射在前端维护
- `coins` 放 User 表，避免每次聚合
- `PunchRecord.dayIndex` 用 Int，和 UI grid 模型对齐
- `@@unique([userId, dayIndex])` 保证每人每天唯一

## 第2节：认证流程

### 登录

1. 用户在 `/login` 页面输入 username + password
2. `POST /api/auth/login` → Prisma 查 User → `bcryptjs.compare()` 验证
3. 验证通过：设置 `userId` cookie（HttpOnly, SameSite=Lax, Path=/），redirect 302 到 `/`
4. 验证失败：返回 401 + 错误信息

### 路由保护

- `(board)/layout.tsx`（Server Component）读取 cookie
- 无 cookie → redirect `/login`
- 有 cookie → 查询 DB → 渲染主页

### 登出

- `POST /api/auth/logout` → 清除 cookie → redirect `/login`

### Cookie 规格

| 属性 | 值 |
|------|------|
| name | `userId` |
| value | User CUID |
| httpOnly | true |
| sameSite | lax |
| path | / |
| maxAge | 7 天 |

## 第3节：文件结构

```
app/
├── (auth)/
│   ├── layout.tsx           # 空 layout，不包裹 BoardProvider
│   └── login/
│       └── page.tsx         # 登录页
├── (board)/
│   ├── layout.tsx           # 包裹 BoardProvider，cookie 检查 + 数据查询
│   └── page.tsx             # 现有主页内容
├── api/
│   └── auth/
│       ├── login/route.ts   # POST 验证 + 设 cookie
│       └── logout/route.ts  # POST 清 cookie + redirect

lib/
├── prisma.ts                # Prisma Client 单例
├── auth.ts                  # cookie 读写工具
├── store.tsx                # 改造：接受 initialState
├── mock-data.ts             # 精简：仅保留工具函数
├── types.ts                 # 微调

prisma/
├── schema.prisma
└── seed.ts                  # 5 用户 + 打卡记录 seed

components/login/
└── LoginForm.tsx            # 登录表单 Client Component
```

### 登录页组件

- `LoginForm.tsx` — Client Component，处理表单提交、loading、错误提示
- 视觉复用 `design/login.html`：双栏布局、brutal-input、quest-btn
- 移动端自适应：小屏隐藏左侧海报区
- 左侧海报区的 `login-poster.png` 放到 `public/` 目录

## 第4节：数据对接

### Mock → DB 映射

| 现有 mock | 数据库 |
|-----------|--------|
| `Member.id` ("A","B"...) | `User.id` (CUID) |
| `Member.name` ("Alen"...) | `User.username` ("li","luo"...) |
| `Member.avatarSvg` | `User.avatarKey` → 前端按 key 渲染 |
| `gridData[member][day]` | `PunchRecord` (userId + dayIndex + punched) |
| `teamCoins` | `SUM(User.coins)` per Team |
| `logs[]` | 暂保留前端 state，不入库 |

### BoardProvider 改造

- 接受 `initialState` 参数，不再硬编码
- `(board)/layout.tsx`（Server Component）负责：读 cookie → 查 DB → 转换为 BoardState → 传给 BoardProvider

### Seed 数据

- 1 个 Team：code=`ROOM-88`，name=`"晓风战队"`
- 5 个 User：li, luo, liu, wu, ji，密码均为 `0000`（bcrypt hash）
- avatarKey 映射：li→alen, luo→bob, liu→cindy, wu→dave, ji→eva
- 每人 ~18 天打卡记录（约 80% 完成率）
- 初始金币：200-350 不等

### 打卡操作

- dispatch `PUNCH` 时同步调 API Route 写入 DB
- 乐观更新：先更新 UI，异步写库
- 打卡 API 返回新 coins 数值，更新 state

### 文件改动范围

**需要改动**：
- `store.tsx` — BoardProvider 接受外部 initialState
- `mock-data.ts` — 精简
- `app/layout.tsx` — 拆分为 route group layouts
- `app/page.tsx` — 迁移到 `(board)/page.tsx`
- `Navbar.tsx` — 当前用户数据源对齐
- `types.ts` — 微调 Member 接口

**不需要改动**：
- PunchBoard、HeatmapGrid、ActivityStream
- ReportCenter 系列
- UI 组件（QuestBtn、TabBtn、PunchPopup、Toast）
- SvgIcons

## Seed 用户清单

| username | password | avatarKey | 初始金币 |
|----------|----------|-----------|----------|
| li       | 0000     | alen      | 345      |
| luo      | 0000     | bob       | 280      |
| liu      | 0000     | cindy     | 310      |
| wu       | 0000     | dave      | 225      |
| ji       | 0000     | eva       | 290      |

Team: code=`ROOM-88`，总金币 = 各用户金币之和 = 1450
