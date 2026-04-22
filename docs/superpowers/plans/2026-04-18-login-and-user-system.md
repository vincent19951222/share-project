# 登录页面 & 用户系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Room Todo 打卡看板引入用户认证系统（登录页 + SQLite + Prisma ORM），使用 TDD 流程开发。

**Architecture:** Prisma + SQLite 作为数据层，API Route 处理登录/登出，Server Component 做路由保护。使用 Next.js Route Group 分离认证页和主应用页。Cookie 存储 userId 实现简单认证。

**Tech Stack:** Next.js 15, React 19, Prisma, SQLite, bcryptjs, Vitest (测试框架), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-18-login-and-user-system-design.md`

---

## File Structure

```
新建文件:
├── prisma/
│   └── schema.prisma                  # 数据模型定义
│   └── seed.ts                        # Seed 脚本入口
├── lib/
│   ├── prisma.ts                      # Prisma Client 单例
│   ├── auth.ts                        # cookie 读写 + 密码验证工具
│   └── db-seed.ts                     # Seed 数据生成逻辑
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                 # 空白 layout，不包裹 BoardProvider
│   │   └── login/
│   │       └── page.tsx               # 登录页 Server Component
│   ├── (board)/
│   │   ├── layout.tsx                 # 包裹 BoardProvider + cookie 检查
│   │   └── page.tsx                   # 主页内容
│   └── api/
│       └── auth/
│           ├── login/route.ts         # POST 登录验证
│           └── logout/route.ts        # POST 登出
├── components/
│   └── login/
│       └── LoginForm.tsx              # 登录表单 Client Component
├── __tests__/
│   ├── auth.test.ts                   # auth 工具函数测试
│   ├── login-api.test.ts              # 登录 API Route 测试
│   ├── logout-api.test.ts             # 登出 API Route 测试
│   ├── seed.test.ts                   # Seed 数据测试
│   └── db-queries.test.ts             # Prisma 查询测试
├── vitest.config.ts                   # Vitest 配置
└── public/
    └── login-poster.png               # 登录页海报图

修改文件:
├── lib/store.tsx                      # BoardProvider 接受 initialState
├── lib/types.ts                       # Member 接口调整
├── lib/mock-data.ts                   # 精简，保留工具函数
├── app/layout.tsx                     → 精简为根 layout
├── app/page.tsx                       → 删除（迁移到 (board)/page.tsx）
├── package.json                       # 添加依赖 + 脚本
└── tsconfig.json                      # 添加 prisma 目录
```

---

## Task 1: 初始化测试框架 Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `__tests__/setup.test.ts`

- [ ] **Step 1: 安装 vitest 依赖**

```bash
cd E:/Projects/share-project && npm install -D vitest @vitejs/plugin-react jsdom @types/node
```

- [ ] **Step 2: 创建 vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: 写第一个测试验证 vitest 能运行**

```typescript
// __tests__/setup.test.ts
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("should work", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/setup.test.ts
```

Expected: 1 test passed

- [ ] **Step 5: 添加 test 脚本到 package.json**

在 `package.json` 的 `scripts` 中添加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 提交**

```bash
cd E:/Projects/share-project && git add vitest.config.ts __tests__/setup.test.ts package.json package-lock.json && git commit -m "chore: add vitest test framework"
```

---

## Task 2: 安装 Prisma + bcryptjs + 初始化 Schema

**Files:**
- Modify: `package.json` (依赖)
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd E:/Projects/share-project && npm install prisma @prisma/client bcryptjs && npm install -D @types/bcryptjs
```

- [ ] **Step 2: 初始化 Prisma（SQLite）**

```bash
cd E:/Projects/share-project && npx prisma init --datasource-provider sqlite
```

- [ ] **Step 3: 写 Prisma Schema**

将 `prisma/schema.prisma` 替换为：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Team {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique
  createdAt DateTime @default(now())
  users     User[]
}

model User {
  id          String       @id @default(cuid())
  username    String       @unique
  password    String
  avatarKey   String
  coins       Int          @default(0)
  teamId      String
  team        Team         @relation(fields: [teamId], references: [id])
  punchRecords PunchRecord[]
  createdAt   DateTime     @default(now())
}

model PunchRecord {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  dayIndex  Int
  punched   Boolean
  punchType String?
  createdAt DateTime @default(now())

  @@unique([userId, dayIndex])
}
```

- [ ] **Step 4: 确认 .env 文件有 DATABASE_URL**

```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 5: 运行 migration**

```bash
cd E:/Projects/share-project && npx prisma migrate dev --name init
```

Expected: 生成 `prisma/dev.db` 和 migration 文件

- [ ] **Step 6: 创建 Prisma Client 单例**

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 7: 写测试验证 Prisma 连接**

```typescript
// __tests__/db-connection.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma connection", () => {
  it("should connect to the database", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toEqual([{ value: 1 }]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 8: 运行测试**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/db-connection.test.ts
```

Expected: PASS

- [ ] **Step 9: 提交**

```bash
cd E:/Projects/share-project && git add prisma/ lib/prisma.ts .env __tests__/db-connection.test.ts package.json package-lock.json && git commit -m "feat: add Prisma schema with Team, User, PunchRecord models"
```

---

## Task 3: Auth 工具函数（TDD）

**Files:**
- Create: `lib/auth.ts`
- Create: `__tests__/auth.test.ts`

- [ ] **Step 1: 写 auth 工具函数的失败测试**

```typescript
// __tests__/auth.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, createCookieValue, parseCookieValue } from "@/lib/auth";

describe("hashPassword & verifyPassword", () => {
  it("should hash a password and verify it correctly", async () => {
    const hash = await hashPassword("0000");
    expect(hash).not.toBe("0000");
    expect(await verifyPassword("0000", hash)).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("0000");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("createCookieValue & parseCookieValue", () => {
  it("should create and parse cookie value", () => {
    const userId = "clx12345abcde";
    const cookieValue = createCookieValue(userId);
    expect(cookieValue).toBe(userId);
    expect(parseCookieValue(cookieValue)).toBe(userId);
  });

  it("should return null for empty cookie value", () => {
    expect(parseCookieValue("")).toBeNull();
    expect(parseCookieValue(undefined as unknown as string)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/auth.test.ts
```

Expected: FAIL — 模块 `@/lib/auth` 不存在

- [ ] **Step 3: 实现 auth.ts**

```typescript
// lib/auth.ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createCookieValue(userId: string): string {
  return userId;
}

export function parseCookieValue(value: string | undefined | null): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/auth.test.ts
```

Expected: 4 tests passed

- [ ] **Step 5: 提交**

```bash
cd E:/Projects/share-project && git add lib/auth.ts __tests__/auth.test.ts && git commit -m "feat: add auth utility functions with tests"
```

---

## Task 4: Seed 数据（TDD）

**Files:**
- Create: `lib/db-seed.ts`
- Create: `__tests__/seed.test.ts`
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: 写 seed 逻辑的失败测试**

```typescript
// __tests__/seed.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase, SEED_USERS, SEED_TEAM } from "@/lib/db-seed";

describe("seedDatabase", () => {
  beforeAll(async () => {
    await prisma.punchRecord.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should seed team and users", async () => {
    await seedDatabase();

    const team = await prisma.team.findUnique({ where: { code: SEED_TEAM.code } });
    expect(team).not.toBeNull();
    expect(team!.name).toBe(SEED_TEAM.name);

    for (const seedUser of SEED_USERS) {
      const user = await prisma.user.findUnique({ where: { username: seedUser.username } });
      expect(user).not.toBeNull();
      expect(user!.avatarKey).toBe(seedUser.avatarKey);
      expect(user!.coins).toBe(seedUser.coins);
    }
  });

  it("should create punch records for each user", async () => {
    await seedDatabase();

    for (const seedUser of SEED_USERS) {
      const user = await prisma.user.findUnique({
        where: { username: seedUser.username },
        include: { punchRecords: true },
      });
      expect(user!.punchRecords.length).toBeGreaterThan(0);

      // Check unique constraint: no duplicate dayIndex
      const dayIndices = user!.punchRecords.map((r) => r.dayIndex);
      expect(new Set(dayIndices).size).toBe(dayIndices.length);
    }
  });

  it("should be idempotent (upsert)", async () => {
    await seedDatabase();
    await seedDatabase();

    const userCount = await prisma.user.count();
    expect(userCount).toBe(SEED_USERS.length);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/seed.test.ts
```

Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 db-seed.ts**

```typescript
// lib/db-seed.ts
import { prisma } from "@/lib/prisma";
import { hashPassword } from "./auth";

export const SEED_TEAM = {
  code: "ROOM-88",
  name: "晓风战队",
};

export const SEED_USERS = [
  { username: "li", avatarKey: "alen", coins: 345 },
  { username: "luo", avatarKey: "bob", coins: 280 },
  { username: "liu", avatarKey: "cindy", coins: 310 },
  { username: "wu", avatarKey: "dave", coins: 225 },
  { username: "ji", avatarKey: "eva", coins: 290 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export async function seedDatabase(): Promise<void> {
  const today = 18;
  const passwordHash = await hashPassword("0000");

  const team = await prisma.team.upsert({
    where: { code: SEED_TEAM.code },
    update: { name: SEED_TEAM.name },
    create: { code: SEED_TEAM.code, name: SEED_TEAM.name },
  });

  const rand = seededRandom(42);

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: { avatarKey: seedUser.avatarKey, coins: seedUser.coins, password: passwordHash },
      create: {
        username: seedUser.username,
        password: passwordHash,
        avatarKey: seedUser.avatarKey,
        coins: seedUser.coins,
        teamId: team.id,
      },
    });

    // Generate punch records for days 1..today-1 (约 80% 完成率)
    for (let day = 1; day < today; day++) {
      const punched = rand() > 0.2;
      await prisma.punchRecord.upsert({
        where: { userId_dayIndex: { userId: user.id, dayIndex: day } },
        update: { punched },
        create: {
          userId: user.id,
          dayIndex: day,
          punched,
        },
      });
    }
  }
}
```

- [ ] **Step 4: 创建 prisma/seed.ts 入口**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../lib/db-seed";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  await seedDatabase();
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: 添加 seed 配置到 package.json**

在 `package.json` 中添加：

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

安装 tsx：

```bash
cd E:/Projects/share-project && npm install -D tsx
```

- [ ] **Step 6: 运行测试**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/seed.test.ts
```

Expected: 3 tests passed

- [ ] **Step 7: 运行 seed 命令确认端到端正常**

```bash
cd E:/Projects/share-project && npx prisma db seed
```

Expected: "Seeding complete."

- [ ] **Step 8: 提交**

```bash
cd E:/Projects/share-project && git add lib/db-seed.ts prisma/seed.ts __tests__/seed.test.ts package.json package-lock.json && git commit -m "feat: add database seed with 5 users and punch records"
```

---

## Task 5: 登录 API Route（TDD）

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `__tests__/login-api.test.ts`

- [ ] **Step 1: 写登录 API 的失败测试**

```typescript
// __tests__/login-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 200 and set cookie for valid credentials", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "li", password: "0000" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("li");
    expect(body.user).not.toHaveProperty("password");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("userId=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("should return 401 for wrong password", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "li", password: "wrong" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 401 for non-existent user", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "nobody", password: "0000" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for missing fields", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/login-api.test.ts
```

Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现登录 API Route**

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, avatarKey: user.avatarKey, coins: user.coins },
    });

    response.cookies.set("userId", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 运行测试**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/login-api.test.ts
```

Expected: 4 tests passed

- [ ] **Step 5: 提交**

```bash
cd E:/Projects/share-project && git add app/api/auth/login/route.ts __tests__/login-api.test.ts && git commit -m "feat: add login API route with password verification"
```

---

## Task 6: 登出 API Route（TDD）

**Files:**
- Create: `app/api/auth/logout/route.ts`
- Create: `__tests__/logout-api.test.ts`

- [ ] **Step 1: 写登出 API 的失败测试**

```typescript
// __tests__/logout-api.test.ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("should clear the userId cookie and return 200", async () => {
    const request = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("userId=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/logout-api.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现登出 API Route**

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set("userId", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
```

- [ ] **Step 4: 运行测试**

```bash
cd E:/Projects/share-project && npx vitest run __tests__/logout-api.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd E:/Projects/share-project && git add app/api/auth/logout/route.ts __tests__/logout-api.test.ts && git commit -m "feat: add logout API route"
```

---

## Task 7: Route Group 重构 + BoardProvider 改造

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx` (占位)
- Create: `app/(board)/layout.tsx`
- Move: `app/page.tsx` → `app/(board)/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `lib/store.tsx`
- Modify: `lib/types.ts`

- [ ] **Step 1: 创建目录结构**

```bash
cd E:/Projects/share-project && mkdir -p "app/(auth)/login" && mkdir -p "app/(board)"
```

- [ ] **Step 2: 精简根 layout.tsx — 移除 BoardProvider**

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Todo - 团队打卡看板",
  description: "团队协同打卡与战报看板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen w-screen flex flex-col p-4 gap-4 text-main relative">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 创建 (auth) layout — 空 layout**

```typescript
// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] **Step 4: 创建 (board) layout — 包裹 BoardProvider + cookie 检查**

```typescript
// app/(board)/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";
import { SvgIcons } from "@/components/ui/SvgIcons";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: { include: { users: true } },
      punchRecords: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const team = user.team;
  const members = team.users.map((u) => ({
    id: u.id,
    name: u.username,
    avatarSvg: (SvgIcons as Record<string, string>)[u.avatarKey] || "",
  }));

  const memberCount = members.length;
  const today = 18;
  const totalDays = 30;

  // Build grid from punch records
  const gridData: (boolean | null)[][] = members.map((_, idx) => {
    const teamUser = team.users[idx];
    const row: (boolean | null)[] = [];
    for (let day = 1; day <= totalDays; day++) {
      if (day < today) {
        const record = team.users[idx] && team.users[idx].punchRecords
          ? team.users[idx].punchRecords.find((r) => r.dayIndex === day)
          : null;
        row.push(record ? record.punched : false);
      } else if (day === today) {
        const record = team.users[idx].punchRecords.find((r) => r.dayIndex === day);
        row.push(record ? record.punched : false);
      } else {
        row.push(null);
      }
    }
    return row;
  });

  const teamCoins = team.users.reduce((sum, u) => sum + u.coins, 0);

  const initialState: BoardState = {
    members,
    gridData,
    teamCoins,
    targetCoins: 2000,
    today,
    totalDays,
    logs: [
      {
        id: "seed-1",
        text: "WebSocket Connection Established. [Realtime Engine Active]",
        type: "system",
        timestamp: new Date(0),
      },
    ],
    activeTab: "punch",
    currentUserId: user.id,
  };

  return <BoardProvider initialState={initialState}>{children}</BoardProvider>;
}
```

- [ ] **Step 5: 修改 types.ts — 添加 currentUserId**

```typescript
// lib/types.ts
export interface Member {
  id: string;
  name: string;
  avatarSvg: string;
}

export type CellStatus = boolean | null;

export interface ActivityLog {
  id: string;
  text: string;
  type: "system" | "success" | "alert" | "highlight";
  timestamp: Date;
}

export interface BoardState {
  members: Member[];
  gridData: CellStatus[][];
  teamCoins: number;
  targetCoins: number;
  today: number;
  totalDays: number;
  logs: ActivityLog[];
  activeTab: "punch" | "dash";
  currentUserId: string;
}

export type BoardAction =
  | { type: "PUNCH"; memberIndex: number; dayIndex: number; punchType: string }
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: "punch" | "dash" }
  | { type: "SIMULATE_REMOTE_PUNCH"; memberIndex: number; typeDesc: string };
```

- [ ] **Step 6: 修改 store.tsx — BoardProvider 接受 initialState**

将 `store.tsx` 的 `BoardProvider` 改为接受外部 `initialState`：

```typescript
// lib/store.tsx
"use client";

import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import { BoardState, BoardAction } from "./types";

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "PUNCH": {
      const newGrid = state.gridData.map((row) => [...row]);
      newGrid[action.memberIndex][action.dayIndex] = true;
      return {
        ...state,
        gridData: newGrid,
        teamCoins: state.teamCoins + 15,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            text: `<div class="w-4 h-4 inline-block align-middle text-slate-800">${state.members[action.memberIndex].avatarSvg}</div> <b>${state.members[action.memberIndex].name}</b> 完成了 <b>${action.punchType}</b>! Team Pts +15.`,
            type: "success",
            timestamp: new Date(),
          },
        ],
      };
    }
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SIMULATE_REMOTE_PUNCH": {
      const member = state.members[action.memberIndex];
      const dayIdx = state.today - 1;
      if (state.gridData[action.memberIndex][dayIdx] === true) return state;
      const newGrid = state.gridData.map((row) => [...row]);
      newGrid[action.memberIndex][dayIdx] = true;
      return {
        ...state,
        gridData: newGrid,
        teamCoins: state.teamCoins + 15,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            text: `[实时推送] <div class="w-4 h-4 inline-block align-middle text-slate-800">${member.avatarSvg}</div> <b>${member.name}</b> 刚刚完成了 ${action.typeDesc}，点亮了格子！`,
            type: "highlight",
            timestamp: new Date(),
          },
        ],
      };
    }
    default:
      return state;
  }
}

interface BoardContextType {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
}

const BoardContext = createContext<BoardContextType | null>(null);

export function BoardProvider({
  initialState,
  children,
}: {
  initialState: BoardState;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SIMULATE_REMOTE_PUNCH", memberIndex: 1, typeDesc: "力量训练" });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BoardContext.Provider value={{ state, dispatch }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
}
```

- [ ] **Step 7: 迁移 page.tsx 到 (board)/page.tsx**

将现有 `app/page.tsx` 的内容移到 `app/(board)/page.tsx`（内容不变），然后删除 `app/page.tsx`。

- [ ] **Step 8: 验证构建**

```bash
cd E:/Projects/share-project && npx next build
```

Expected: 构建成功（可能有 warning 但不应有 error）

- [ ] **Step 9: 提交**

```bash
cd E:/Projects/share-project && git add app/(auth)/ app/(board)/ app/layout.tsx lib/store.tsx lib/types.ts && git rm app/page.tsx && git commit -m "feat: restructure routes into auth and board groups with DB-backed state"
```

---

## Task 8: 登录页面 UI

**Files:**
- Create: `components/login/LoginForm.tsx`
- Create: `app/(auth)/login/page.tsx`
- Copy: `design/login-poster.png` → `public/login-poster.png`

- [ ] **Step 1: 检查是否有 login-poster.png，复制到 public**

```bash
cd E:/Projects/share-project && ls design/login-poster.png && cp design/login-poster.png public/login-poster.png || echo "No poster image found"
```

- [ ] **Step 2: 创建 LoginForm Client Component**

```typescript
// components/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      {/* 用户名输入 */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
          Username
        </label>
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter username"
            className="brutal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      {/* 密码输入 */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
          Password
        </label>
        <div className="input-group">
          <input
            type="password"
            placeholder="Enter password"
            className="brutal-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-red-500 text-sm font-bold bg-red-50 border-2 border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={loading}
        className="quest-btn w-full py-4 text-lg mt-4 flex gap-2 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        {loading ? "LOGGING IN..." : "START QUEST"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: 创建登录页面**

```typescript
// app/(auth)/login/page.tsx
import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-5xl h-[80vh] min-h-[600px] soft-card flex flex-col md:flex-row overflow-hidden relative z-10 bg-white">
        {/* 左侧：品牌海报区 */}
        <div className="hidden md:flex w-1/2 relative poster-bg border-r-4 border-slate-100 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/10 to-slate-900/70"></div>
          <div className="absolute inset-0 p-10 flex flex-col justify-between text-white z-10">
            <div className="font-black text-3xl tracking-tighter flex items-center gap-2 drop-shadow-md">
              <div className="w-10 h-10 bg-yellow-300 border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[0_3px_0_0_#1f2937] p-1.5">
                <svg viewBox="0 0 24 24" className="w-full h-full text-slate-800" fill="#fcd34d" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="13" rx="2" />
                  <path d="M2 8h20M12 8v13M8 13h8" />
                </svg>
              </div>
              ROOM TODO
            </div>
            <div className="flex flex-col gap-2">
              <span className="px-3 py-1 bg-yellow-300/90 text-slate-900 text-xs font-bold rounded-md w-max border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1f2937]">
                LEVEL UP TOGETHER
              </span>
              <h1 className="text-4xl font-black leading-tight drop-shadow-lg">
                打卡不仅仅是
                <br />
                完成任务，
                <br />
                更是团队的荣誉。
              </h1>
            </div>
          </div>
        </div>

        {/* 右侧：登录表单 */}
        <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-10">
            <h2 className="text-3xl font-black mb-2 text-slate-800">Join Room</h2>
            <p className="text-sub font-bold text-sm">输入你的用户名和密码，准备开始协同挑战。</p>
          </div>

          <LoginForm />

          <div className="mt-8 text-center">
            <span className="text-sub text-sm font-bold">测试账号：li / luo / liu / wu / ji </span>
            <span className="text-sub text-sm font-bold">密码：0000</span>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 在 globals.css 中添加登录页相关样式**

在 `app/globals.css` 末尾添加：

```css
.poster-bg {
  background-image: url('/login-poster.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.input-group {
  position: relative;
}
.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #64748b;
  transition: color 0.2s;
  pointer-events: none;
}
.brutal-input:focus ~ .input-icon {
  color: #1f2937;
}
```

注意：`.brutal-input` 样式已存在于 `design/login.html`，但项目 `globals.css` 中没有。需要添加：

在 `app/globals.css` 末尾继续添加：

```css
.brutal-input {
  width: 100%;
  padding: 0.875rem 1.25rem;
  padding-left: 3rem;
  border: 3px solid #e2e8f0;
  border-radius: 1rem;
  outline: none;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-weight: 700;
  color: #1e293b;
  background-color: #f8fafc;
}
.brutal-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}
.brutal-input:focus {
  background-color: #ffffff;
  border-color: #1f2937;
  box-shadow: 0 4px 0 0 #1f2937;
  transform: translateY(-2px);
}
```

- [ ] **Step 5: 验证构建**

```bash
cd E:/Projects/share-project && npx next build
```

- [ ] **Step 6: 手动验证**

```bash
cd E:/Projects/share-project && npm run dev
```

打开 `http://localhost:3000` → 应自动跳转到 `/login`
输入 `li` / `0000` → 应跳转到主页，看到打卡看板

- [ ] **Step 7: 提交**

```bash
cd E:/Projects/share-project && git add components/login/ app/(auth)/ app/globals.css public/ && git commit -m "feat: add login page with brutalist design"
```

---

## Task 9: Navbar 适配 + 登出按钮

**Files:**
- Modify: `components/navbar/Navbar.tsx`
- Modify: `components/navbar/ProfileDropdown.tsx`

- [ ] **Step 1: 修改 Navbar — currentMember 基于 currentUserId**

将 `Navbar.tsx` 中的 `const currentMember = state.members[0];` 替换为基于 `currentUserId` 查找：

```typescript
// components/navbar/Navbar.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { useBoard } from "@/lib/store";
import { TabBtn } from "@/components/ui/TabBtn";
import { ProfileDropdown } from "./ProfileDropdown";
import { SvgIcons } from "@/components/ui/SvgIcons";

export function Navbar() {
  const { state, dispatch } = useBoard();
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const handleProfileClick = useCallback(() => {
    setProfileOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const currentMember = state.members.find((m) => m.id === state.currentUserId) || state.members[0];

  return (
    <nav ref={navRef} className="h-14 w-full flex items-center justify-between shrink-0 px-2 z-50">
      <div className="flex items-center gap-6">
        <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-300 border-2 border-slate-800 rounded-lg flex items-center justify-center shadow-[0_2px_0_0_#1f2937] p-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.box }} />
          </div>
          ROOM TODO
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-full border-2 border-slate-200">
          <TabBtn
            active={state.activeTab === "punch"}
            onClick={() => dispatch({ type: "SET_TAB", tab: "punch" })}
          >
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            协同打卡
          </TabBtn>
          <TabBtn
            active={state.activeTab === "dash"}
            onClick={() => dispatch({ type: "SET_TAB", tab: "dash" })}
          >
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.chart }} />
            战报中心
          </TabBtn>
        </div>
      </div>
      <div className="relative">
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full pl-2 pr-4 py-1 hover:border-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm p-1 text-slate-800">
            <span dangerouslySetInnerHTML={{ __html: currentMember.avatarSvg }} />
          </div>
          <span className="font-bold text-sm">{currentMember.name}</span>
        </button>
        {profileOpen && <ProfileDropdown onDismiss={handleClickOutside} />}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 修改 ProfileDropdown — 添加登出按钮**

在 `ProfileDropdown.tsx` 的底部区块中添加登出按钮：

```typescript
// components/navbar/ProfileDropdown.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QuestBtn } from "@/components/ui/QuestBtn";
import { SvgIcons } from "@/components/ui/SvgIcons";

interface ProfileDropdownProps {
  onDismiss: () => void;
}

export function ProfileDropdown({ onDismiss }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.classList.add("show");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onDismiss} />
      <div ref={ref} className="dropdown-menu flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sub">ASSET BALANCE</span>
            <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
              3,450
            </div>
          </div>
          <QuestBtn className="px-3 py-1 text-xs">提现</QuestBtn>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-sub">ACHIEVEMENTS (3)</span>
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-orange-100 border-2 border-orange-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="初级举铁匠">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.weightlift }} />
            </div>
            <div className="w-12 h-12 bg-blue-100 border-2 border-blue-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="慢跑达人">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.runner }} />
            </div>
            <div className="w-12 h-12 bg-green-100 border-2 border-green-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="早起鸟">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.bird }} />
            </div>
          </div>
        </div>
        <div className="p-5 border-t-2 border-slate-100 bg-slate-50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <span>关联 App</span>
            <span className="text-green-500 bg-green-100 px-2 py-0.5 rounded text-xs">Apple Health 已连</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span>每日提醒</span>
            <span className="text-sub">18:30</span>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full py-2 text-sm font-bold text-red-500 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: 验证构建**

```bash
cd E:/Projects/share-project && npx next build
```

- [ ] **Step 4: 提交**

```bash
cd E:/Projects/share-project && git add components/navbar/Navbar.tsx components/navbar/ProfileDropdown.tsx && git commit -m "feat: adapt navbar to use currentUserId and add logout button"
```

---

## Task 10: HeatmapGrid 适配 currentUserId

**Files:**
- Modify: `components/punch-board/HeatmapGrid.tsx`

- [ ] **Step 1: 修改 HeatmapGrid — 用 currentUserId 判断 "isMe"**

将 `const currentUserIndex = 0;` 替换为从 state 中查找：

```typescript
// 在 HeatmapGrid 函数组件内，替换第 7 行附近
const { state, dispatch } = useBoard();
const containerRef = useRef<HTMLDivElement>(null);
const currentUserIndex = state.members.findIndex((m) => m.id === state.currentUserId);
```

- [ ] **Step 2: 验证构建**

```bash
cd E:/Projects/share-project && npx next build
```

- [ ] **Step 3: 提交**

```bash
cd E:/Projects/share-project && git add components/punch-board/HeatmapGrid.tsx && git commit -m "feat: use currentUserId to determine current user in heatmap"
```

---

## Task 11: 精简 mock-data.ts

**Files:**
- Modify: `lib/mock-data.ts`

- [ ] **Step 1: 精简 mock-data.ts，移除不再需要的导出**

```typescript
// lib/mock-data.ts
// 仅保留 seededRandom 工具函数，供 seed 脚本使用
// 其他函数已由 Prisma + DB 数据替代

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
```

- [ ] **Step 2: 搜索项目中是否还有对已移除函数的引用**

```bash
cd E:/Projects/share-project && grep -r "createMembers\|initGridData\|createSeedLog" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next
```

Expected: 仅在 `mock-data.ts` 自身中出现（如果有的话）。如果有其他文件引用这些函数，需要更新它们从新的数据源获取数据。

- [ ] **Step 3: 验证构建**

```bash
cd E:/Projects/share-project && npx next build
```

- [ ] **Step 4: 提交**

```bash
cd E:/Projects/share-project && git add lib/mock-data.ts && git commit -m "refactor: slim down mock-data to only utility functions"
```

---

## Task 12: 全量验证 + 清理

**Files:**
- 所有文件

- [ ] **Step 1: 运行所有测试**

```bash
cd E:/Projects/share-project && npx vitest run
```

Expected: 所有测试通过

- [ ] **Step 2: 运行构建**

```bash
cd E:/Projects/share-project && npx next build
```

Expected: 构建成功

- [ ] **Step 3: 启动开发服务器手动测试**

```bash
cd E:/Projects/share-project && npm run dev
```

验证清单：
1. 访问 `http://localhost:3000` → 跳转到 `/login`
2. 输入 `li` / `0000` → 登录成功，跳转到主页
3. 主页显示打卡看板，当前用户头像高亮
4. 输入错误密码 → 显示错误提示
5. 点击头像 → 下拉菜单显示 → 点击"退出登录" → 跳转到 `/login`

- [ ] **Step 4: 最终提交**

```bash
cd E:/Projects/share-project && git add -A && git commit -m "chore: final cleanup and verification for login system"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] 数据库 Schema (Team, User, PunchRecord) → Task 2
- [x] CUID 主键 → Task 2
- [x] ISO 8601 时间戳 → Task 2 (Prisma DateTime 默认)
- [x] 密码 bcrypt hash → Task 3, Task 4
- [x] 认证流程 (Cookie) → Task 5, Task 6
- [x] 登录页 UI → Task 8
- [x] Route Group 分离 → Task 7
- [x] BoardProvider 改造 → Task 7
- [x] Seed 数据 (5 用户) → Task 4
- [x] Navbar 适配 → Task 9
- [x] HeatmapGrid 适配 → Task 10
- [x] 登出按钮 → Task 9

### Placeholder Scan
- 无 TBD/TODO
- 所有步骤有完整代码

### Type Consistency
- `BoardState.currentUserId` 在 types.ts 定义，store.tsx 使用，layout.tsx 传入
- `Member` 接口未变化（id, name, avatarSvg）
- API Route 的 request/response 类型一致
