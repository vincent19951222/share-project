# Supply Task 07 Shop Purchase API And Client Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production shop purchase API route and client helper that turn the Task 6 purchase service into a usable authenticated HTTP contract.

**Architecture:** Keep purchase side effects in `lib/gamification/shop.ts`; the route only authenticates, validates payload shape, maps service errors, and returns the refreshed existing gamification snapshot. The client helper follows the existing `lib/api.ts` pattern and delegates response/error parsing to `readApiResult()`.

**Tech Stack:** Next.js 15 App Router API Routes, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-07-shop-purchase-api-design.md`

This task does not build the production supply view-model, `/api/gamification/supply/state`, or production UI wiring.

## File Structure

- Create: `app/api/gamification/shop/purchase/route.ts`
  - Reads and verifies `userId` cookie with `parseCookieValue()`.
  - Validates a non-empty string `itemId`.
  - Calls `purchaseShopItem()`.
  - Builds a refreshed `GamificationStateSnapshot` with `buildGamificationStateForUser()`.
  - Maps `ShopPurchaseError` into HTTP responses with `{ error, code }`.
- Modify: `lib/api.ts`
  - Adds `purchaseGamificationShopItem(itemId)`.
  - Reuses `readApiResult()` and `GamificationStateSnapshot`.
- Create: `__tests__/gamification-shop-api.test.ts`
  - Covers unauthenticated, invalid payload, successful purchase with refreshed backpack snapshot, and insufficient coins error mapping.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-07-shop-purchase-api-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-07-shop-purchase-api.md`

## Task 1: Failing Shop Purchase API Tests

**Files:**
- Create: `__tests__/gamification-shop-api.test.ts`

- [ ] **Step 1: Create the failing API test**

Create `__tests__/gamification-shop-api.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/shop/purchase/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/shop/purchase", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/shop/purchase", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { itemId: "task_reroll_coupon" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 when itemId is missing or blank", async () => {
    const missingResponse = await POST(request(userId, {}));
    const blankResponse = await POST(request(userId, { itemId: "  " }));

    expect(missingResponse.status).toBe(400);
    expect(blankResponse.status).toBe(400);
  });

  it("purchases an item and returns purchase plus refreshed snapshot", async () => {
    const response = await POST(request(userId, { itemId: "task_reroll_coupon" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      status: "SETTLED",
    });
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.backpack.totalQuantity).toBe(1);
    expect(body.snapshot.backpack.groups[0].items[0]).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
    });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: userId } })).resolves.toMatchObject({
      coins: 850,
    });
  });

  it("maps purchase service errors to stable response codes", async () => {
    await prisma.user.update({ where: { id: userId }, data: { coins: 10 } });

    const response = await POST(request(userId, { itemId: "task_reroll_coupon" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "INSUFFICIENT_COINS",
      error: "银子不足。",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts
```

Expected: FAIL because `app/api/gamification/shop/purchase/route.ts` does not exist.

## Task 2: Shop Purchase API Route

**Files:**
- Create: `app/api/gamification/shop/purchase/route.ts`

- [ ] **Step 1: Implement the API route**

Create `app/api/gamification/shop/purchase/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { purchaseShopItem, ShopPurchaseError } from "@/lib/gamification/shop";
import { buildGamificationStateForUser } from "@/lib/gamification/state";

type ShopPurchasePayload = {
  itemId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ShopPurchasePayload | null;

    if (!payload || typeof payload.itemId !== "string" || payload.itemId.trim().length === 0) {
      return NextResponse.json({ error: "缺少商品 ID" }, { status: 400 });
    }

    const result = await purchaseShopItem({ userId, itemId: payload.itemId.trim() });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ purchase: result.purchase, snapshot });
  } catch (error) {
    if (error instanceof ShopPurchaseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run focused API tests**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts
```

Expected: PASS.

## Task 3: Client Helper

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add the client helper**

In `lib/api.ts`, add this helper near the existing gamification item helpers:

```typescript
export async function purchaseGamificationShopItem(itemId: string): Promise<{
  purchase: {
    id: string;
    itemId: string;
    totalPriceCoins: number;
  };
  snapshot: GamificationStateSnapshot;
}> {
  const response = await fetch("/api/gamification/shop/purchase", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itemId }),
  });

  return readApiResult(response, "购买补给响应解析失败");
}
```

- [ ] **Step 2: Run focused API tests again**

Run:

```bash
npm test -- __tests__/gamification-shop-api.test.ts
```

Expected: PASS.

## Task 4: Verification And Commit

**Files:**
- Create: `app/api/gamification/shop/purchase/route.ts`
- Modify: `lib/api.ts`
- Create: `__tests__/gamification-shop-api.test.ts`
- Add: `docs/superpowers/specs/2026-05-25-supply-task-07-shop-purchase-api-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-07-shop-purchase-api.md`

- [ ] **Step 1: Run focused related tests**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts __tests__/gamification-shop.test.ts __tests__/gamification-shop-api.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add app/api/gamification/shop/purchase/route.ts lib/api.ts __tests__/gamification-shop-api.test.ts docs/superpowers/specs/2026-05-25-supply-task-07-shop-purchase-api-design.md docs/superpowers/plans/2026-05-25-supply-task-07-shop-purchase-api.md
git commit -m "feat: add gamification shop purchase api"
```

Expected: commit succeeds.
