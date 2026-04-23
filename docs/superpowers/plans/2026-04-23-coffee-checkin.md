# Coffee Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted, independent `续命咖啡` tab where team members can record today's coffee cups, see a life-style coffee receipt, and browse a 30-day team coffee calendar without touching the economy system.

**Architecture:** Add a separate `CoffeeRecord` model where each row represents one cup, then build a dedicated `CoffeeSnapshot` from Prisma for the current user's team. Coffee state stays independent from `BoardProvider` except for tab selection; the page owns its own fetch/poll/update flow and never updates silver, seasons, punch streaks, or board economy fields.

**Tech Stack:** Next.js 15 App Router route handlers, Prisma 7 + SQLite, React 19 client components, TypeScript, Vitest + jsdom, Tailwind CSS v4.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `CoffeeRecord`.
  - Add `coffeeRecords` relations to `Team` and `User`.
- Modify: `lib/db-seed.ts`
  - Clear seeded team coffee records for deterministic local/test data.
- Modify: `__tests__/seed.test.ts`
  - Assert seeded coffee records are reset for the local team.
- Create: `lib/coffee-state.ts`
  - Server-side snapshot builder, coffee date helpers, and aggregation logic.
- Create: `__tests__/coffee-state.test.ts`
  - Unit/integration coverage for snapshot aggregation, current month window, deleted record handling, and team scoping.
- Modify: `lib/types.ts`
  - Add coffee DTO types.
  - Extend `activeTab` union with `"coffee"`.
- Create: `app/api/coffee/state/route.ts`
  - Authenticated coffee snapshot reader.
- Create: `app/api/coffee/cups/route.ts`
  - Authenticated `POST` endpoint for adding one cup today.
- Create: `app/api/coffee/cups/latest/route.ts`
  - Authenticated `DELETE` endpoint for soft-deleting the current user's latest cup today.
- Create: `__tests__/coffee-api.test.ts`
  - Route coverage for auth, add cup, remove latest, and zero-cup removal.
- Modify: `lib/api.ts`
  - Add `fetchCoffeeState`, `addTodayCoffeeCup`, and `removeLatestTodayCoffeeCup`.
- Create: `components/coffee-checkin/CoffeeCheckin.tsx`
  - Coffee page container with local reducer, initial fetch, polling, and layout.
- Create: `components/coffee-checkin/CoffeeReceipt.tsx`
  - Left receipt panel: today stats, controls, and lightweight activity copy.
- Create: `components/coffee-checkin/CoffeeGrid.tsx`
  - Right 30-day team coffee calendar.
- Create: `__tests__/coffee-checkin.test.tsx`
  - Component coverage for loading, add cup, remove cup, today's-only operations, and stat rendering.
- Modify: `components/navbar/Navbar.tsx`
  - Add `续命咖啡` tab.
- Modify: `app/(board)/page.tsx`
  - Render `CoffeeCheckin` as a parallel tab view.
- Create or modify: `__tests__/coffee-tab.test.tsx`
  - Verify tab selection can switch to coffee without disturbing other tabs.
- Modify: `ROADMAP.md`
  - Add `续命咖啡` as an accepted upcoming feature after implementation lands.

## Implementation Rules

- Do not connect coffee to economy fields. Coffee must not increment `coins`, `teamVaultTotal`, `seasonIncome`, `filledSlots`, `currentStreak`, Quest, GP, or Rank.
- Each `POST /api/coffee/cups` creates exactly one `CoffeeRecord`.
- Each `DELETE /api/coffee/cups/latest` soft-deletes only the latest non-deleted record for the current user today.
- Users can only add/remove cups for today. Historical dates are read-only in V1.
- Use `Asia/Shanghai` for `dayKey`.
- Use the current month window and current day calculation style already used by board snapshots.
- Coffee state should be independent. Do not store `CoffeeSnapshot` inside `BoardState`; only extend `activeTab` to include `"coffee"`.
- Keep UI close to `design/coffee-prototype.html`: coffee receipt + team calendar, life-style palette, but still product-consistent.

---

### Task 1: Add Coffee Data Model And Seed Reset

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Modify: `__tests__/seed.test.ts`

- [ ] **Step 1: Write failing seed coverage**

Update `__tests__/seed.test.ts` with a test that creates coffee records for the seeded team, calls `seedDatabase()`, and verifies they are gone.

Use this shape near the other seed cleanup tests:

```typescript
it("should clear coffee records for the seeded team", async () => {
  await seedDatabase();

  const li = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

  await prisma.coffeeRecord.create({
    data: {
      userId: li.id,
      teamId: li.teamId,
      dayKey: "2026-04-23",
    },
  });

  expect(await prisma.coffeeRecord.count({ where: { teamId: li.teamId } })).toBe(1);

  await seedDatabase();

  expect(await prisma.coffeeRecord.count({ where: { teamId: li.teamId } })).toBe(0);
});
```

- [ ] **Step 2: Run the seed test to verify it fails**

Run:

```bash
npm test -- __tests__/seed.test.ts
```

Expected: FAIL because `prisma.coffeeRecord` and `CoffeeRecord` do not exist.

- [ ] **Step 3: Add Prisma relations and model**

Update `prisma/schema.prisma`.

Add to `Team`:

```prisma
coffeeRecords CoffeeRecord[]
```

Add to `User`:

```prisma
coffeeRecords CoffeeRecord[]
```

Add the model near the other activity/record models:

```prisma
model CoffeeRecord {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  teamId    String
  team      Team      @relation(fields: [teamId], references: [id])
  dayKey    String
  createdAt DateTime  @default(now())
  deletedAt DateTime?

  @@index([teamId, dayKey, createdAt])
  @@index([userId, dayKey, createdAt])
}
```

- [ ] **Step 4: Push schema and regenerate Prisma client**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: both commands succeed and the generated client exposes `coffeeRecord`.

- [ ] **Step 5: Reset seeded team coffee data**

Update `lib/db-seed.ts` after the seeded team is found/created:

```typescript
await prisma.coffeeRecord.deleteMany({
  where: { teamId: team.id },
});
```

Also add coffee cleanup before deleting extra users:

```typescript
await prisma.coffeeRecord.deleteMany({ where: { userId: { in: extraUserIds } } });
```

- [ ] **Step 6: Re-run seed test**

Run:

```bash
npm test -- __tests__/seed.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/db-seed.ts __tests__/seed.test.ts
git commit -m "feat: add coffee record model"
```

---

### Task 2: Add Coffee Snapshot Builder

**Files:**
- Create: `lib/coffee-state.ts`
- Modify: `lib/types.ts`
- Create: `__tests__/coffee-state.test.ts`

- [ ] **Step 1: Add coffee DTO types and tab type**

Update `lib/types.ts`:

```typescript
export type AppTab = "punch" | "board" | "coffee" | "dash";

export interface CoffeeMemberSnapshot {
  id: string;
  name: string;
  avatarKey: string;
}

export interface CoffeeDayCell {
  cups: number;
}

export interface CoffeeKingSnapshot {
  userId: string;
  name: string;
  cups: number;
}

export interface CoffeeSnapshot {
  members: CoffeeMemberSnapshot[];
  gridData: CoffeeDayCell[][];
  today: number;
  totalDays: number;
  currentUserId: string;
  stats: {
    todayTotalCups: number;
    todayDrinkers: number;
    currentUserTodayCups: number;
    coffeeKing: CoffeeKingSnapshot | null;
  };
}
```

Then replace the existing hard-coded tab unions:

```typescript
activeTab: AppTab;
```

and:

```typescript
| { type: "SET_TAB"; tab: AppTab }
```

- [ ] **Step 2: Write failing coffee state tests**

Create `__tests__/coffee-state.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  COFFEE_TOTAL_DAYS,
  buildCoffeeSnapshotForUser,
  getCurrentCoffeeDay,
  getCurrentCoffeeTotalDays,
} from "@/lib/coffee-state";

describe("coffee-state", () => {
  let liId: string;
  let luoId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const li = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const luo = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    liId = li.id;
    luoId = luo.id;
    teamId = li.teamId;

    await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives the current coffee day in Asia/Shanghai", () => {
    expect(getCurrentCoffeeDay(new Date("2026-04-23T18:30:00Z"))).toBe(24);
    expect(getCurrentCoffeeTotalDays(new Date("2026-04-23T18:30:00Z"))).toBe(30);
    expect(COFFEE_TOTAL_DAYS).toBe(30);
  });

  it("aggregates cups by user and day while ignoring deleted records", async () => {
    await prisma.coffeeRecord.createMany({
      data: [
        { userId: liId, teamId, dayKey: "2026-04-23", createdAt: new Date("2026-04-23T01:00:00Z") },
        { userId: liId, teamId, dayKey: "2026-04-23", createdAt: new Date("2026-04-23T02:00:00Z") },
        { userId: liId, teamId, dayKey: "2026-04-23", deletedAt: new Date("2026-04-23T03:00:00Z") },
        { userId: luoId, teamId, dayKey: "2026-04-23" },
        { userId: luoId, teamId, dayKey: "2026-04-23" },
        { userId: luoId, teamId, dayKey: "2026-04-23" },
      ],
    });

    const snapshot = await buildCoffeeSnapshotForUser(liId, new Date("2026-04-23T10:00:00+08:00"));

    expect(snapshot).not.toBeNull();
    expect(snapshot!.currentUserId).toBe(liId);
    expect(snapshot!.gridData[0][22]).toEqual({ cups: 2 });
    expect(snapshot!.stats.todayTotalCups).toBe(5);
    expect(snapshot!.stats.todayDrinkers).toBe(2);
    expect(snapshot!.stats.currentUserTodayCups).toBe(2);
    expect(snapshot!.stats.coffeeKing).toEqual({
      userId: luoId,
      name: "luo",
      cups: 3,
    });
  });

  it("returns null for a missing user", async () => {
    await expect(buildCoffeeSnapshotForUser("missing-user")).resolves.toBeNull();
  });
});
```

- [ ] **Step 3: Run coffee state tests to verify they fail**

Run:

```bash
npm test -- __tests__/coffee-state.test.ts
```

Expected: FAIL because `lib/coffee-state.ts` does not exist.

- [ ] **Step 4: Implement `lib/coffee-state.ts`**

Create `lib/coffee-state.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import type { CoffeeDayCell, CoffeeSnapshot } from "@/lib/types";

export const COFFEE_TOTAL_DAYS = 30;

export function getCurrentCoffeeTotalDays(now: Date = new Date()): number {
  const monthKey = getShanghaiDayKey(now).slice(0, 7);
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getCurrentCoffeeDay(now: Date = new Date()): number {
  const day = Number(getShanghaiDayKey(now).slice(8, 10));
  return Math.max(1, Math.min(day, getCurrentCoffeeTotalDays(now)));
}

export async function buildCoffeeSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<CoffeeSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const today = getCurrentCoffeeDay(now);
  const totalDays = getCurrentCoffeeTotalDays(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              username: true,
              avatarKey: true,
            },
          },
          coffeeRecords: {
            where: {
              dayKey: { startsWith: currentMonthKey },
              deletedAt: null,
            },
            select: {
              userId: true,
              dayKey: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const cupCounts = new Map<string, number>();

  for (const record of user.team.coffeeRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (!Number.isInteger(day) || day < 1 || day > totalDays) {
      continue;
    }

    const key = `${record.userId}:${day}`;
    cupCounts.set(key, (cupCounts.get(key) ?? 0) + 1);
  }

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
  }));

  const gridData: CoffeeDayCell[][] = members.map((member) =>
    Array.from({ length: totalDays }, (_, index) => ({
      cups: cupCounts.get(`${member.id}:${index + 1}`) ?? 0,
    })),
  );

  const todayRows = members.map((member, index) => ({
    userId: member.id,
    name: member.name,
    cups: gridData[index][today - 1]?.cups ?? 0,
  }));

  const todayTotalCups = todayRows.reduce((sum, row) => sum + row.cups, 0);
  const todayDrinkers = todayRows.filter((row) => row.cups > 0).length;
  const currentUserTodayCups =
    todayRows.find((row) => row.userId === user.id)?.cups ?? 0;
  const coffeeKing =
    todayRows
      .filter((row) => row.cups > 0)
      .sort((left, right) => right.cups - left.cups || left.name.localeCompare(right.name))[0] ?? null;

  return {
    members,
    gridData,
    today,
    totalDays,
    currentUserId: user.id,
    stats: {
      todayTotalCups,
      todayDrinkers,
      currentUserTodayCups,
      coffeeKing,
    },
  };
}
```

- [ ] **Step 5: Re-run coffee state tests**

Run:

```bash
npm test -- __tests__/coffee-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/coffee-state.ts __tests__/coffee-state.test.ts
git commit -m "feat: build coffee check-in snapshots"
```

---

### Task 3: Add Coffee API Routes

**Files:**
- Create: `app/api/coffee/state/route.ts`
- Create: `app/api/coffee/cups/route.ts`
- Create: `app/api/coffee/cups/latest/route.ts`
- Create: `__tests__/coffee-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `__tests__/coffee-api.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/coffee/state/route";
import { POST } from "@/app/api/coffee/cups/route";
import { DELETE } from "@/app/api/coffee/cups/latest/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";

function request(url: string, userId?: string, method = "GET") {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

describe("coffee API", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET(request("/api/coffee/state"))).status).toBe(401);
    expect((await POST(request("/api/coffee/cups", undefined, "POST"))).status).toBe(401);
    expect((await DELETE(request("/api/coffee/cups/latest", undefined, "DELETE"))).status).toBe(401);
  });

  it("adds one cup for the current user today and returns the latest snapshot", async () => {
    const response = await POST(request("/api/coffee/cups", userId, "POST"));
    expect(response.status).toBe(200);

    const dayKey = getShanghaiDayKey();
    expect(await prisma.coffeeRecord.count({ where: { userId, teamId, dayKey, deletedAt: null } })).toBe(1);

    const body = await response.json();
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.stats.currentUserTodayCups).toBe(1);
  });

  it("creates multiple records when multiple cups are added", async () => {
    await POST(request("/api/coffee/cups", userId, "POST"));
    const response = await POST(request("/api/coffee/cups", userId, "POST"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.stats.currentUserTodayCups).toBe(2);
  });

  it("soft-deletes only the latest current-user cup for today", async () => {
    await POST(request("/api/coffee/cups", userId, "POST"));
    await POST(request("/api/coffee/cups", userId, "POST"));

    const response = await DELETE(request("/api/coffee/cups/latest", userId, "DELETE"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.stats.currentUserTodayCups).toBe(1);
    expect(await prisma.coffeeRecord.count({ where: { userId, teamId, deletedAt: null } })).toBe(1);
    expect(await prisma.coffeeRecord.count({ where: { userId, teamId, deletedAt: { not: null } } })).toBe(1);
  });

  it("returns 409 when there is no cup to remove today", async () => {
    const response = await DELETE(request("/api/coffee/cups/latest", userId, "DELETE"));
    expect(response.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run API tests to verify they fail**

Run:

```bash
npm test -- __tests__/coffee-api.test.ts
```

Expected: FAIL because the coffee API route files do not exist.

- [ ] **Step 3: Implement `GET /api/coffee/state`**

Create `app/api/coffee/state/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await buildCoffeeSnapshotForUser(userId);
    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement `POST /api/coffee/cups`**

Create `app/api/coffee/cups/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    await prisma.coffeeRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: getShanghaiDayKey(),
      },
    });

    const snapshot = await buildCoffeeSnapshotForUser(user.id);
    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement `DELETE /api/coffee/cups/latest`**

Create `app/api/coffee/cups/latest/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const latest = await prisma.coffeeRecord.findFirst({
      where: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: getShanghaiDayKey(),
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!latest) {
      return NextResponse.json({ error: "今天还没有可撤销的咖啡" }, { status: 409 });
    }

    await prisma.coffeeRecord.update({
      where: { id: latest.id },
      data: { deletedAt: new Date() },
    });

    const snapshot = await buildCoffeeSnapshotForUser(user.id);
    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Re-run API tests**

Run:

```bash
npm test -- __tests__/coffee-api.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/coffee/state/route.ts app/api/coffee/cups/route.ts app/api/coffee/cups/latest/route.ts __tests__/coffee-api.test.ts
git commit -m "feat: add coffee check-in API"
```

---

### Task 4: Add Coffee Client API Helpers

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add helper functions**

Update `lib/api.ts`:

```typescript
import type { BoardSnapshot, CoffeeSnapshot } from "@/lib/types";
```

Add:

```typescript
async function readCoffeeSnapshot(response: Response): Promise<CoffeeSnapshot> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }

  return payload.snapshot as CoffeeSnapshot;
}

export async function fetchCoffeeState(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/state", {
    cache: "no-store",
  });

  return readCoffeeSnapshot(response);
}

export async function addTodayCoffeeCup(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/cups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  return readCoffeeSnapshot(response);
}

export async function removeLatestTodayCoffeeCup(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/cups/latest", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  return readCoffeeSnapshot(response);
}
```

- [ ] **Step 2: Type-check helpers through focused tests**

Run:

```bash
npm test -- __tests__/coffee-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat: add coffee client api helpers"
```

---

### Task 5: Build Coffee Check-in UI

**Files:**
- Create: `components/coffee-checkin/CoffeeCheckin.tsx`
- Create: `components/coffee-checkin/CoffeeReceipt.tsx`
- Create: `components/coffee-checkin/CoffeeGrid.tsx`
- Create: `__tests__/coffee-checkin.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `__tests__/coffee-checkin.test.tsx`.

The test should stub `fetch`, render `CoffeeCheckin`, and verify:

- loading state appears before first snapshot resolves
- receipt renders `今日咖啡小票`
- `+1 杯` calls `POST /api/coffee/cups`
- `-1 杯` calls `DELETE /api/coffee/cups/latest`
- zero cups disables `-1 杯`
- current user today cell renders `+` at zero and `☕ 2` after snapshot update

Use this minimal test skeleton:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import type { CoffeeSnapshot } from "@/lib/types";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function snapshot(cups: number): CoffeeSnapshot {
  return {
    members: [{ id: "u1", name: "li", avatarKey: "male1" }],
    gridData: [[{ cups: 0 }, { cups: cups }]],
    today: 2,
    totalDays: 2,
    currentUserId: "u1",
    stats: {
      todayTotalCups: cups,
      todayDrinkers: cups > 0 ? 1 : 0,
      currentUserTodayCups: cups,
      coffeeKing: cups > 0 ? { userId: "u1", name: "li", cups } : null,
    },
  };
}

describe("CoffeeCheckin", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("loads coffee state and can add or remove today's cups", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ snapshot: snapshot(0) }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ snapshot: snapshot(1) }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ snapshot: snapshot(0) }) }),
    );

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("今日咖啡小票");
    expect(container.textContent).toContain("今天还没续命");

    const addButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("+1 杯"),
    );
    expect(addButton).toBeDefined();

    await act(async () => {
      addButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/coffee/cups", expect.objectContaining({ method: "POST" }));
    expect(container.textContent).toContain("我的今日杯数");
    expect(container.textContent).toContain("1");

    const removeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("-1 杯"),
    );
    expect(removeButton).toBeDefined();

    await act(async () => {
      removeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/coffee/cups/latest", expect.objectContaining({ method: "DELETE" }));
  });
});
```

- [ ] **Step 2: Run component tests to verify they fail**

Run:

```bash
npm test -- __tests__/coffee-checkin.test.tsx
```

Expected: FAIL because coffee components do not exist.

- [ ] **Step 3: Implement `CoffeeReceipt`**

Create `components/coffee-checkin/CoffeeReceipt.tsx`.

Requirements:

- Render title `今日咖啡小票`
- Render the four stats from `CoffeeSnapshot.stats`
- Render `+1 杯` and `-1 杯` buttons
- Disable `-1 杯` when `currentUserTodayCups === 0`
- Use coffee receipt visual direction from `design/coffee-prototype.html`
- Keep dimensions stable and avoid nested cards

Suggested props:

```typescript
import type { CoffeeSnapshot } from "@/lib/types";

interface CoffeeReceiptProps {
  snapshot: CoffeeSnapshot;
  busy: boolean;
  error: string | null;
  onAddCup: () => void;
  onRemoveCup: () => void;
}
```

- [ ] **Step 4: Implement `CoffeeGrid`**

Create `components/coffee-checkin/CoffeeGrid.tsx`.

Requirements:

- Render member rail and day header
- Render `☕ N` for cup cells
- Render `+` only for current user's today cell at 0 cups
- Render future days as disabled/dashed cells
- Do not expose history controls
- Use avatars via `getAvatarUrl`

Suggested props:

```typescript
import type { CoffeeSnapshot } from "@/lib/types";

interface CoffeeGridProps {
  snapshot: CoffeeSnapshot;
  onTodayCellClick?: () => void;
}
```

- [ ] **Step 5: Implement `CoffeeCheckin` container**

Create `components/coffee-checkin/CoffeeCheckin.tsx`.

Requirements:

- Fetch initial snapshot from `fetchCoffeeState()`
- Poll every 5 seconds while mounted
- Use `addTodayCoffeeCup()` and `removeLatestTodayCoffeeCup()`
- On API success, replace local snapshot with response snapshot
- On API failure, keep current snapshot and show a short error message
- Do not import or dispatch `useBoard`

Skeleton:

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  addTodayCoffeeCup,
  fetchCoffeeState,
  removeLatestTodayCoffeeCup,
} from "@/lib/api";
import type { CoffeeSnapshot } from "@/lib/types";
import { CoffeeGrid } from "./CoffeeGrid";
import { CoffeeReceipt } from "./CoffeeReceipt";

export function CoffeeCheckin() {
  const [snapshot, setSnapshot] = useState<CoffeeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const next = await fetchCoffeeState();
        if (!cancelled) setSnapshot(next);
      } catch {
        if (!cancelled) setError("咖啡小票同步失败，稍后再试。");
      }
    }

    void sync();
    const timer = window.setInterval(sync, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function runMutation(action: () => Promise<CoffeeSnapshot>) {
    setBusy(true);
    setError(null);
    try {
      setSnapshot(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
    return (
      <section className="flex h-full items-center justify-center rounded-[1.5rem] border-[6px] border-orange-100 bg-orange-50 font-black text-orange-900">
        正在打印今日咖啡小票...
      </section>
    );
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(320px,0.95fr)_minmax(520px,1.9fr)] gap-4 max-[980px]:grid-cols-1 max-[980px]:overflow-y-auto">
      <CoffeeReceipt
        snapshot={snapshot}
        busy={busy}
        error={error}
        onAddCup={() => void runMutation(addTodayCoffeeCup)}
        onRemoveCup={() => void runMutation(removeLatestTodayCoffeeCup)}
      />
      <CoffeeGrid snapshot={snapshot} />
    </section>
  );
}
```

- [ ] **Step 6: Add component styling**

Prefer Tailwind utility classes inside the components. Use custom CSS in `app/globals.css` only if the repeating receipt tear or cell style becomes too verbose.

If adding CSS, add small scoped utility classes:

```css
.coffee-receipt-tear {
  background: radial-gradient(circle at 0 0, transparent 0.62rem, #fffaf0 0.64rem) 0 0 / 1.3rem 0.9rem repeat-x;
}
```

- [ ] **Step 7: Re-run coffee component tests**

Run:

```bash
npm test -- __tests__/coffee-checkin.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/coffee-checkin __tests__/coffee-checkin.test.tsx app/globals.css
git commit -m "feat: add coffee check-in interface"
```

---

### Task 6: Add Coffee Tab Integration

**Files:**
- Modify: `lib/types.ts`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/(board)/page.tsx`
- Create or modify: `__tests__/coffee-tab.test.tsx`

- [ ] **Step 1: Write failing tab integration test**

Create `__tests__/coffee-tab.test.tsx` that renders the board page with a mocked `useBoard` state, clicks `续命咖啡`, and expects `dispatch({ type: "SET_TAB", tab: "coffee" })`.

If rendering the full `Home` component is too coupled, test `Navbar` directly.

Expected assertion:

```typescript
expect(dispatch).toHaveBeenCalledWith({ type: "SET_TAB", tab: "coffee" });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx
```

Expected: FAIL because the coffee tab does not exist yet.

- [ ] **Step 3: Add Navbar coffee tab**

Update `components/navbar/Navbar.tsx` inside the tab strip:

```tsx
<TabBtn
  active={state.activeTab === "coffee"}
  onClick={() => dispatch({ type: "SET_TAB", tab: "coffee" })}
>
  <span className="w-4 h-4" aria-hidden="true">☕</span>
  续命咖啡
</TabBtn>
```

Keep order:

1. `协同打卡`
2. `共享看板`
3. `续命咖啡`
4. `战报中心`

- [ ] **Step 4: Render CoffeeCheckin on board page**

Update `app/(board)/page.tsx`:

```tsx
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
```

Add a view between shared board and report center:

```tsx
<div
  className={`absolute inset-0 transition-opacity duration-300 ${
    state.activeTab === "coffee" ? "opacity-100" : "opacity-0 pointer-events-none"
  }`}
>
  <CoffeeCheckin />
</div>
```

- [ ] **Step 5: Re-run tab integration test**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts components/navbar/Navbar.tsx app/(board)/page.tsx __tests__/coffee-tab.test.tsx
git commit -m "feat: add coffee check-in tab"
```

---

### Task 7: Verification, Polish, And Docs

**Files:**
- Modify: `ROADMAP.md`
- Optional modify: `docs/superpowers/specs/2026-04-23-coffee-checkin-design.md` if implementation finds a better detail.
- Optional modify: `design/coffee-prototype.html` only if the product prototype needs to reflect a final copy tweak.

- [ ] **Step 1: Run focused coffee suite**

Run:

```bash
npm test -- __tests__/coffee-state.test.ts __tests__/coffee-api.test.ts __tests__/coffee-checkin.test.tsx __tests__/coffee-tab.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related regression tests**

Run:

```bash
npm test -- __tests__/board-provider-sync.test.tsx __tests__/heatmap-grid-punch.test.tsx __tests__/shared-board-polling.test.tsx __tests__/shared-board-errors.test.tsx
```

Expected: PASS. Coffee tab changes must not break existing board polling or punch flow.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected:

- `npm test`: PASS
- `npm run build`: PASS

- [ ] **Step 4: Manual browser check**

Run:

```bash
npm run dev
```

Open `http://localhost:3000`, log in, and verify:

- `续命咖啡` tab appears in the nav
- coffee page loads without layout overlap
- `+1 杯` increments today's current-user cups
- `-1 杯` decrements today's current-user cups
- refresh preserves cup count
- another browser/session sees the updated coffee snapshot after polling
- the page visually resembles `design/coffee-prototype.html`

- [ ] **Step 5: Update roadmap**

Update `ROADMAP.md` under the near-term feature status:

- Add `续命咖啡` as an accepted independent life-style check-in page.
- State that it is independent from economy/season systems.
- Link this spec and plan:
  - `docs/superpowers/specs/2026-04-23-coffee-checkin-design.md`
  - `docs/superpowers/plans/2026-04-23-coffee-checkin.md`

- [ ] **Step 6: Commit**

```bash
git add ROADMAP.md docs/superpowers/specs/2026-04-23-coffee-checkin-design.md docs/superpowers/plans/2026-04-23-coffee-checkin.md design/coffee-prototype.html
git commit -m "docs: plan coffee check-in implementation"
```

If implementation code has already been committed task-by-task, this final commit should include only docs or polish leftovers.

## Self-Review Checklist

- Coffee records are persisted as one row per cup.
- Removing a cup soft-deletes the latest current-user record for today only.
- Historical dates are read-only.
- Coffee UI does not dispatch board economy actions.
- Coffee APIs do not mutate `User.coins`, `Season`, `SeasonMemberStat`, `PunchRecord`, or activity events unless a future explicit spec adds that.
- Coffee state is team-scoped through the authenticated user.
- The visual treatment is meaningfully different from fitness check-in while still using product-consistent brutalist borders and shadows.
- All new tests have clear behavior assertions instead of snapshot-only coverage.

