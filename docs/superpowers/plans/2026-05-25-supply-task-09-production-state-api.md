# Supply Task 09 Production Supply State API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Task 8 production supply snapshot through an authenticated API route and add the matching client helper for later production UI wiring.

**Architecture:** Keep snapshot construction in `lib/gamification/supply-view-model.ts`. The API route only authenticates, ensures today's tasks, maps task service errors, and returns `{ snapshot }`; `lib/api.ts` wraps the route with a typed helper that returns the snapshot directly.

**Tech Stack:** Next.js 15 App Router API Routes, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-09-production-state-api-design.md`

This task does not modify the production UI, the Task 8 view-model mapper, or existing mutation APIs.

## File Structure

- Create: `app/api/gamification/supply/state/route.ts`
  - Reads and verifies `userId` cookie with `parseCookieValue()`.
  - Calls `ensureTodayTaskAssignments({ userId })`.
  - Calls `buildSupplyStationViewModelForUser(userId)`.
  - Maps unauthenticated, missing user, task service errors, and unexpected errors.
- Modify: `lib/api.ts`
  - Imports `SupplyStationProductionSnapshot`.
  - Adds `fetchSupplyStationState()`.
- Create: `__tests__/gamification-supply-state-api.test.ts`
  - Covers unauthenticated, valid snapshot plus task generation, and stale/missing user cookie handling.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-09-production-state-api-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-09-production-state-api.md`

## Task 1: Failing Supply State API Tests

**Files:**
- Create: `__tests__/gamification-supply-state-api.test.ts`

- [ ] **Step 1: Create the failing API test**

Create `__tests__/gamification-supply-state-api.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/supply/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/supply/state", {
    method: "GET",
    headers: userId ? { cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/gamification/supply/state", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "未登录" });
  });

  it("ensures today's tasks and returns production supply snapshot", async () => {
    const dayKey = getShanghaiDayKey();

    await expect(
      prisma.dailyTaskAssignment.count({ where: { userId, dayKey } }),
    ).resolves.toBe(0);

    const response = await GET(request(userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      currentUserId: userId,
      teamId,
      dayKey,
      resources: {
        coins: { label: "银子" },
        ticket: { label: "抽奖券" },
        backpack: { label: "背包", maxValue: 60 },
      },
    });
    expect(body.snapshot.dashboard.dailyQuests).toHaveLength(4);
    await expect(
      prisma.dailyTaskAssignment.count({ where: { userId, dayKey } }),
    ).resolves.toBe(4);
  });

  it("returns 401 when the cookie points to a missing user", async () => {
    const response = await GET(request("missing-user"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "用户不存在" });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/gamification-supply-state-api.test.ts
```

Expected: FAIL because `app/api/gamification/supply/state/route.ts` does not exist.

## Task 2: Supply State API Route

**Files:**
- Create: `app/api/gamification/supply/state/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/gamification/supply/state/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import {
  ensureTodayTaskAssignments,
  GamificationTaskError,
} from "@/lib/gamification/tasks";

export async function GET(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    await ensureTodayTaskAssignments({ userId });
    const snapshot = await buildSupplyStationViewModelForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run focused API tests**

Run:

```bash
npm test -- __tests__/gamification-supply-state-api.test.ts
```

Expected: PASS.

## Task 3: Client Helper

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add the helper type import**

In `lib/api.ts`, add `SupplyStationProductionSnapshot` to the existing type import from `@/lib/types`.

- [ ] **Step 2: Add the client helper**

In `lib/api.ts`, add this helper near `fetchGamificationState()`:

```typescript
export async function fetchSupplyStationState(): Promise<SupplyStationProductionSnapshot> {
  const response = await fetch("/api/gamification/supply/state", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{
    snapshot: SupplyStationProductionSnapshot;
  }>(response, "获取牛马补给站失败");

  return payload.snapshot;
}
```

- [ ] **Step 3: Run focused API tests again**

Run:

```bash
npm test -- __tests__/gamification-supply-state-api.test.ts
```

Expected: PASS.

## Task 4: Verification And Commit

**Files:**
- Create: `app/api/gamification/supply/state/route.ts`
- Modify: `lib/api.ts`
- Create: `__tests__/gamification-supply-state-api.test.ts`
- Add: `docs/superpowers/specs/2026-05-25-supply-task-09-production-state-api-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-09-production-state-api.md`

- [ ] **Step 1: Run focused supply state tests**

Run:

```bash
npm test -- __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run related route and service tests**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts __tests__/gamification-state-api.test.ts __tests__/gamification-tasks.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/gamification/supply/state/route.ts lib/api.ts __tests__/gamification-supply-state-api.test.ts docs/superpowers/specs/2026-05-25-supply-task-09-production-state-api-design.md docs/superpowers/plans/2026-05-25-supply-task-09-production-state-api.md
git commit -m "feat: add supply production state api"
```
