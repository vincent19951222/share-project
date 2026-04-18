# Data Persistence & Unified GP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将打卡操作从纯前端 state 迁移到数据库持久化，建立统一 GP 积分体系（coins → gp），打卡奖励 GP 并写入 GpLedger 流水表。

**Architecture:** 在现有 Prisma schema 中新增 GpLedger 表，将 User.coins 重命名为 User.gp，给 PunchRecord 增加 gpAwarded 字段。新增 POST /api/board/punch API Route 处理打卡写入。改造 BoardLayout 从 DB 读取真实数据，前端 PUNCH dispatch 改为调用 API 后更新 state。

**Tech Stack:** Prisma v7 + SQLite, Next.js 15 API Routes, Vitest, TypeScript

---

### Task 1: Schema Migration — coins → gp + GpLedger + PunchRecord.gpAwarded

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<auto>/migration.sql` (auto-generated)

- [ ] **Step 1: Update Prisma schema**

Modify `prisma/schema.prisma` — rename `coins` to `gp`, add `gpAwarded` to PunchRecord, add GpLedger model:

```prisma
model User {
  id           String        @id @default(cuid())
  username     String        @unique
  password     String
  avatarKey    String
  gp           Int           @default(0)
  teamId       String
  team         Team          @relation(fields: [teamId], references: [id])
  punchRecords PunchRecord[]
  gpLedgers    GpLedger[]
  createdAt    DateTime      @default(now())
}

model PunchRecord {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  dayIndex  Int
  punched   Boolean
  punchType String?
  gpAwarded Int      @default(5)
  createdAt DateTime @default(now())

  @@unique([userId, dayIndex])
}

model GpLedger {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  sourceType String
  sourceId   String
  gpDelta    Int
  awardedAt  DateTime  @default(now())
  reversedAt DateTime?
}
```

- [ ] **Step 2: Run migration**

Run: `npx prisma migrate dev --name add-gp-ledger-and-rename-coins`
Expected: Migration created and applied successfully. Note: since dev.db has existing data, this will use SQLite ALTER TABLE.

- [ ] **Step 3: Verify migration**

Run: `npx prisma studio` or check with a query that the schema is correct:
- `User` table has `gp` column (no `coins`)
- `PunchRecord` table has `gpAwarded` column
- `GpLedger` table exists with all columns

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "schema: add GpLedger table, rename coins to gp, add gpAwarded to PunchRecord"
```

---

### Task 2: Update Seed Data — coins → gp + GpLedger entries

**Files:**
- Modify: `lib/db-seed.ts`
- Test: `__tests__/seed.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/seed.test.ts`:

```typescript
it("should have gp column instead of coins", async () => {
  await seedDatabase();

  const user = await prisma.user.findUnique({ where: { username: "li" } });
  expect(user).not.toBeNull();
  // Prisma v7 returns BigInt for Int in SQLite — convert for comparison
  expect(Number(user!.gp)).toBe(345);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/seed.test.ts`
Expected: FAIL — `user.coins` no longer exists (schema changed in Task 1)

- [ ] **Step 3: Update db-seed.ts — rename coins to gp**

In `lib/db-seed.ts`, change all references from `coins` to `gp`:

```typescript
export const SEED_USERS = [
  { username: "li", avatarKey: "male1", gp: 345 },
  { username: "luo", avatarKey: "male2", gp: 280 },
  { username: "liu", avatarKey: "female1", gp: 310 },
  { username: "wu", avatarKey: "male3", gp: 225 },
  { username: "ji", avatarKey: "female2", gp: 290 },
];
```

In the `seedDatabase` function, update the upsert calls to use `gp`:

```typescript
for (const seedUser of SEED_USERS) {
  const user = await prisma.user.upsert({
    where: { username: seedUser.username },
    update: { avatarKey: seedUser.avatarKey, gp: seedUser.gp, password: passwordHash },
    create: {
      username: seedUser.username,
      password: passwordHash,
      avatarKey: seedUser.avatarKey,
      gp: seedUser.gp,
      teamId: team.id,
    },
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/seed.test.ts`
Expected: PASS — all seed tests pass with `gp` field

- [ ] **Step 5: Commit**

```bash
git add lib/db-seed.ts __tests__/seed.test.ts
git commit -m "refactor: rename coins to gp in seed data"
```

---

### Task 3: Update All coins References in Codebase

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/store.tsx`
- Modify: `app/(board)/layout.tsx`
- Modify: `app/api/user/profile/route.ts`
- Modify: `components/punch-board/TeamHeader.tsx` (if it references coins)
- Modify: `components/punch-board/ReportCenter.tsx` (if it references coins)

- [ ] **Step 1: Find all coins references**

Run: `grep -r "coins" --include="*.ts" --include="*.tsx" -l`
Note every file that references `coins` or `teamCoins`.

- [ ] **Step 2: Update lib/types.ts**

Rename `teamCoins` to `teamGp` in `BoardState`:

```typescript
export interface BoardState {
  members: Member[];
  gridData: CellStatus[][];
  teamGp: number;
  targetCoins: number;
  today: number;
  totalDays: number;
  logs: ActivityLog[];
  activeTab: "punch" | "dash";
  currentUserId: string;
}
```

- [ ] **Step 3: Update lib/store.tsx**

In the `boardReducer` PUNCH case, change `teamCoins` to `teamGp`:

```typescript
case "PUNCH": {
  const newGrid = state.gridData.map((row) => [...row]);
  newGrid[action.memberIndex][action.dayIndex] = true;
  return {
    ...state,
    gridData: newGrid,
    teamGp: state.teamGp + 15,
    logs: [
      ...state.logs,
      {
        id: `log-${Date.now()}`,
        text: `<b>${state.members[action.memberIndex].name}</b> 完成了 <b>${action.punchType}</b>! Team Pts +15.`,
        type: "success",
        timestamp: new Date(),
      },
    ],
  };
}
```

Also update the `SIMULATE_REMOTE_PUNCH` case similarly (change `teamCoins` to `teamGp`).

- [ ] **Step 4: Update app/(board)/layout.tsx**

Change the `teamCoins` aggregation to use `gp`:

```typescript
const teamGp = team.users.reduce((sum, u) => sum + Number(u.gp), 0);
```

And in `initialState`:

```typescript
const initialState: BoardState = {
  members,
  gridData,
  teamGp,
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
```

- [ ] **Step 5: Update app/api/user/profile/route.ts**

Change `coins` to `gp` in the response:

```typescript
return NextResponse.json({
  user: {
    id: updatedUser.id,
    username: updatedUser.username,
    avatarKey: updatedUser.avatarKey,
    gp: updatedUser.gp,
  },
});
```

- [ ] **Step 6: Update any component files referencing coins**

Search and replace `teamCoins` → `teamGp` in all component files under `components/`. Also check for any hardcoded `coins` references.

- [ ] **Step 7: Run build to verify**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/store.tsx app/(board)/layout.tsx app/api/user/profile/route.ts components/
git commit -m "refactor: rename coins/teamCoins to gp/teamGp across codebase"
```

---

### Task 4: GP Ledger Utility + Tests

**Files:**
- Create: `lib/gp.ts`
- Test: `__tests__/gp.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/gp.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { awardGp, reverseGp, getUserTotalGp } from "@/lib/gp";

describe("GP Ledger", () => {
  beforeAll(async () => {
    await prisma.punchRecord.deleteMany();
    await prisma.gpLedger.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should award GP and create ledger entry", async () => {
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    const beforeGp = Number(user!.gp);

    await awardGp({
      userId: user!.id,
      sourceType: "PUNCH",
      sourceId: "test-punch-1",
      gpDelta: 5,
    });

    const afterUser = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(Number(afterUser!.gp)).toBe(beforeGp + 5);

    const ledger = await prisma.gpLedger.findFirst({
      where: { sourceId: "test-punch-1" },
    });
    expect(ledger).not.toBeNull();
    expect(Number(ledger!.gpDelta)).toBe(5);
    expect(ledger!.sourceType).toBe("PUNCH");
    expect(ledger!.reversedAt).toBeNull();
  });

  it("should reverse GP and set reversedAt", async () => {
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    const beforeGp = Number(user!.gp);

    await reverseGp({
      userId: user!.id,
      sourceId: "test-punch-1",
    });

    const afterUser = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(Number(afterUser!.gp)).toBe(beforeGp - 5);

    const ledger = await prisma.gpLedger.findFirst({
      where: { sourceId: "test-punch-1" },
    });
    expect(ledger!.reversedAt).not.toBeNull();
  });

  it("should calculate total GP from non-reversed ledger entries", async () => {
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    const total = await getUserTotalGp(user!.id);
    expect(total).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/gp.test.ts`
Expected: FAIL — `lib/gp.ts` does not exist

- [ ] **Step 3: Implement lib/gp.ts**

Create `lib/gp.ts`:

```typescript
import { prisma } from "@/lib/prisma";

interface AwardGpInput {
  userId: string;
  sourceType: "PUNCH" | "QUEST_COMPLETE" | "QUEST_REVERT";
  sourceId: string;
  gpDelta: number;
}

export async function awardGp({ userId, sourceType, sourceId, gpDelta }: AwardGpInput) {
  await prisma.$transaction([
    prisma.gpLedger.create({
      data: {
        userId,
        sourceType,
        sourceId,
        gpDelta,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { gp: { increment: gpDelta } },
    }),
  ]);
}

interface ReverseGpInput {
  userId: string;
  sourceId: string;
}

export async function reverseGp({ userId, sourceId }: ReverseGpInput) {
  const ledger = await prisma.gpLedger.findFirst({
    where: { userId, sourceId, reversedAt: null },
  });

  if (!ledger) return;

  await prisma.$transaction([
    prisma.gpLedger.update({
      where: { id: ledger.id },
      data: { reversedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { gp: { decrement: Number(ledger.gpDelta) } },
    }),
  ]);
}

export async function getUserTotalGp(userId: string): Promise<number> {
  const result = await prisma.gpLedger.aggregate({
    where: { userId, reversedAt: null },
    _sum: { gpDelta: true },
  });
  return Number(result._sum.gpDelta ?? 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/gp.test.ts`
Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/gp.ts __tests__/gp.test.ts
git commit -m "feat: add GP ledger utilities with award, reverse, and total"
```

---

### Task 5: Punch API Route + Tests

**Files:**
- Create: `app/api/board/punch/route.ts`
- Test: `__tests__/punch-api.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/punch-api.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("POST /api/board/punch", () => {
  beforeAll(async () => {
    await prisma.punchRecord.deleteMany();
    await prisma.gpLedger.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should punch and award GP for valid user", async () => {
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    const beforeGp = Number(user!.gp);
    const dayIndex = 18;

    const request = new NextRequest("http://localhost/api/board/punch", {
      method: "POST",
      body: JSON.stringify({ dayIndex, punchType: "力量训练" }),
      headers: { "Content-Type": "application/json" },
    });
    // Simulate authenticated request by setting cookie
    request.cookies.set("userId", user!.id);

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.punched).toBe(true);
    expect(body.gpAwarded).toBe(5);

    // Verify DB state
    const record = await prisma.punchRecord.findUnique({
      where: { userId_dayIndex: { userId: user!.id, dayIndex } },
    });
    expect(record).not.toBeNull();
    expect(record!.punched).toBe(true);

    const afterUser = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(Number(afterUser!.gp)).toBe(beforeGp + 5);

    const ledger = await prisma.gpLedger.findFirst({
      where: { sourceType: "PUNCH", sourceId: record!.id },
    });
    expect(ledger).not.toBeNull();
  });

  it("should return 401 if not logged in", async () => {
    const request = new NextRequest("http://localhost/api/board/punch", {
      method: "POST",
      body: JSON.stringify({ dayIndex: 18, punchType: "力量训练" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should not award GP if already punched today", async () => {
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    const beforeGp = Number(user!.gp);
    const dayIndex = 18;

    // Already punched in previous test, punch again
    const request = new NextRequest("http://localhost/api/board/punch", {
      method: "POST",
      body: JSON.stringify({ dayIndex, punchType: "力量训练" }),
      headers: { "Content-Type": "application/json" },
    });
    request.cookies.set("userId", user!.id);

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.punched).toBe(true);
    expect(body.gpAwarded).toBe(0); // No GP for duplicate punch

    const afterUser = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(Number(afterUser!.gp)).toBe(beforeGp); // GP unchanged
  });

  it("should return 400 for missing fields", async () => {
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    const request = new NextRequest("http://localhost/api/board/punch", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    request.cookies.set("userId", user!.id);

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/punch-api.test.ts`
Expected: FAIL — `app/api/board/punch/route.ts` does not exist

- [ ] **Step 3: Implement the punch API route**

Create `app/api/board/punch/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardGp } from "@/lib/gp";

const PUNCH_GP_REWARD = 5;

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { dayIndex, punchType } = body;

  if (typeof dayIndex !== "number" || typeof punchType !== "string") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 401 });
  }

  const existing = await prisma.punchRecord.findUnique({
    where: { userId_dayIndex: { userId, dayIndex } },
  });

  if (existing) {
    // Already punched — update but don't award GP
    const record = await prisma.punchRecord.update({
      where: { userId_dayIndex: { userId, dayIndex } },
      data: { punched: true, punchType },
    });
    return NextResponse.json({ punched: true, gpAwarded: 0, record });
  }

  // New punch — create record and award GP
  const record = await prisma.punchRecord.create({
    data: {
      userId,
      dayIndex,
      punched: true,
      punchType,
      gpAwarded: PUNCH_GP_REWARD,
    },
  });

  await awardGp({
    userId,
    sourceType: "PUNCH",
    sourceId: record.id,
    gpDelta: PUNCH_GP_REWARD,
  });

  return NextResponse.json({ punched: true, gpAwarded: PUNCH_GP_REWARD, record });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/punch-api.test.ts`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/api/board/punch/route.ts __tests__/punch-api.test.ts
git commit -m "feat: add POST /api/board/punch with GP awarding"
```

---

### Task 6: Frontend — Punch Dispatch Calls API

**Files:**
- Modify: `components/punch-board/PunchPopup.tsx`
- Modify: `lib/store.tsx`
- Modify: `lib/types.ts`

- [ ] **Step 1: Add async PUNCH_API action type**

Update `lib/types.ts` to add a new action type:

```typescript
export type BoardAction =
  | { type: "PUNCH"; memberIndex: number; dayIndex: number; punchType: string }
  | { type: "PUNCH_SUCCESS"; memberIndex: number; dayIndex: number; punchType: string; gpAwarded: number }
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: "punch" | "dash" }
  | { type: "SIMULATE_REMOTE_PUNCH"; memberIndex: number; typeDesc: string };
```

- [ ] **Step 2: Add PUNCH_SUCCESS handler to reducer**

In `lib/store.tsx`, add the `PUNCH_SUCCESS` case:

```typescript
case "PUNCH_SUCCESS": {
  const newGrid = state.gridData.map((row) => [...row]);
  newGrid[action.memberIndex][action.dayIndex] = true;
  return {
    ...state,
    gridData: newGrid,
    teamGp: state.teamGp + action.gpAwarded,
    logs: [
      ...state.logs,
      {
        id: `log-${Date.now()}`,
        text: `<b>${state.members[action.memberIndex].name}</b> 完成了 <b>${action.punchType}</b>! Team Pts +${action.gpAwarded}.`,
        type: "success",
        timestamp: new Date(),
      },
    ],
  };
}
```

- [ ] **Step 3: Update HeatmapGrid to call API on punch**

In `components/punch-board/HeatmapGrid.tsx`, the PunchPopup is rendered with `onSelect` at line ~89. The API call should happen here (this is where `rIndex` and `state.today` are available):

```typescript
<PunchPopup
  key={day}
  onSelect={async (punchType) => {
    try {
      const res = await fetch("/api/board/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex: state.today, punchType }),
      });
      if (!res.ok) return;
      const data = await res.json();
      dispatch({
        type: "PUNCH_SUCCESS",
        memberIndex: rIndex,
        dayIndex: i,
        punchType,
        gpAwarded: data.gpAwarded,
      });
    } catch {
      // Network error — silently fail
    }
  }}
/>
```

Note: `PunchPopup` itself (`components/ui/PunchPopup.tsx`) does NOT need changes — it still just calls `onSelect(type: string)`. The async API call lives in HeatmapGrid.

- [ ] **Step 4: Remove the old PUNCH dispatch**

After HeatmapGrid is updated, the old `PUNCH` action type and its reducer case can be removed since all punch operations now go through the API. However, `SIMULATE_REMOTE_PUNCH` should remain for demo purposes — it can be updated to use `PUNCH_SUCCESS` pattern instead.

- [ ] **Step 5: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/store.tsx components/punch-board/HeatmapGrid.tsx
git commit -m "feat: punch dispatch calls API, persist to DB with GP awarding"
```

---

### Task 7: BoardLayout Reads Real Data from DB

**Files:**
- Modify: `app/(board)/layout.tsx`

- [ ] **Step 1: Update BoardLayout to calculate teamGp from real DB data**

The current layout already reads punch records from DB. The main change is ensuring `teamGp` comes from the aggregated `User.gp` field (which is now kept in sync by the punch API), and that the grid data reflects real punch records.

Read `app/(board)/layout.tsx` and verify:
1. `teamGp` aggregates from `user.gp` (already updated in Task 3)
2. `gridData` reads from `punchRecords` (already working)
3. The `today` value uses the real current day of month instead of hardcoded `18`

Change the hardcoded `today` to use the real date:

```typescript
const today = new Date().getDate();
```

- [ ] **Step 2: Run build and dev server**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run dev` and verify manually:
- Login as `li`
- Punch today's cell
- Refresh the page — the punch should still be there
- GP should have increased

- [ ] **Step 3: Commit**

```bash
git add app/(board)/layout.tsx
git commit -m "fix: use real current day instead of hardcoded 18"
```

---

### Task 8: Run All Tests + Build Verification

**Files:**
- No new files (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (seed, auth, login-api, logout-api, profile-api, gp, punch-api)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Update roadmap**

In `docs/roadmap.md`, add Phase 4 section:

```markdown
### Phase 4: Data Persistence & Unified GP

**Spec:** `docs/superpowers/specs/2026-04-19-quest-and-gp-system-design.md`
**Plan:** `docs/superpowers/plans/2026-04-19-data-persistence-and-gp.md`

- [x] Schema migration — coins → gp + GpLedger + PunchRecord.gpAwarded
- [x] Seed data updated (coins → gp)
- [x] All coins/teamCoins references renamed to gp/teamGp
- [x] GP ledger utilities (awardGp, reverseGp, getUserTotalGp)
- [x] Punch API Route (POST /api/board/punch) with GP awarding
- [x] Frontend punch dispatch calls API, persists to DB
- [x] BoardLayout uses real current day
- [x] All tests pass + build verification
```

- [ ] **Step 4: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: add Phase 4 to roadmap"
```
