# Supply Task 06 Shop Purchase Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production shop purchase service that deducts 银子, increments inventory, and writes `ShopPurchase` audit rows.

**Architecture:** Keep item buyability, price, and purchase limits in `content/gamification/shop-catalog.ts`; keep item names/effects/enabled status in existing item definitions. `purchaseShopItem()` performs all purchase side effects in one Prisma transaction and throws `ShopPurchaseError` for user-facing business failures.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom, React 19.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-06-shop-purchase-service-design.md`

This task does not build the shop purchase API, client helper, supply production view-model, or production UI.

## File Structure

- Create: `lib/gamification/shop.ts`
  - Exports `ShopPurchaseError`.
  - Exports `purchaseShopItem({ userId, itemId, now })`.
  - Reads `getShopCatalogItem()` and `getItemDefinition()`.
  - Uses one Prisma transaction for user lookup, limit checks, coin deduction, inventory upsert, and `ShopPurchase` create.
- Create: `__tests__/gamification-shop.test.ts`
  - Covers successful purchase, insufficient coins, daily limit, weekly limit, and non-approved items.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-06-shop-purchase-service-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-06-shop-purchase-service.md`

## Task 1: Failing Shop Purchase Service Tests

**Files:**
- Create: `__tests__/gamification-shop.test.ts`

- [ ] **Step 1: Create the failing service test**

Create `__tests__/gamification-shop.test.ts`:

```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import { purchaseShopItem, ShopPurchaseError } from "@/lib/gamification/shop";
import { prisma } from "@/lib/prisma";

describe("gamification shop purchase service", () => {
  const fixedNow = new Date("2026-05-25T09:00:00+08:00");
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deducts coins, increments inventory, and writes purchase audit", async () => {
    const result = await purchaseShopItem({
      userId,
      itemId: "task_reroll_coupon",
      now: fixedNow,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "task_reroll_coupon" } },
    });
    const purchase = await prisma.shopPurchase.findFirstOrThrow({ where: { userId } });

    expect(result.purchase.itemId).toBe("task_reroll_coupon");
    expect(user.coins).toBe(850);
    expect(inventory.quantity).toBe(1);
    expect(purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      dayKey: getShanghaiDayKey(fixedNow),
      weekKey: getShanghaiWeekKey(getShanghaiDayKey(fixedNow)),
      status: "SETTLED",
    });
    expect(JSON.parse(purchase.metadataJson ?? "{}")).toMatchObject({
      itemName: "任务换班券",
      category: "task",
      requiresAdminConfirmation: false,
    });
  });

  it("rejects insufficient coins without changing inventory or purchase audit", async () => {
    await prisma.user.update({ where: { id: userId }, data: { coins: 10 } });

    await expect(
      purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_COINS" });

    expect(await prisma.inventoryItem.count({ where: { userId } })).toBe(0);
    expect(await prisma.shopPurchase.count({ where: { userId } })).toBe(0);
  });

  it("enforces daily and weekly purchase limits", async () => {
    await purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow });
    await expect(
      purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED" });

    await purchaseShopItem({ userId, itemId: "double_niuma_coupon", now: fixedNow });
    await expect(
      purchaseShopItem({
        userId,
        itemId: "double_niuma_coupon",
        now: new Date("2026-05-26T09:00:00+08:00"),
      }),
    ).rejects.toMatchObject({ code: "WEEKLY_LIMIT_REACHED" });
  });

  it("rejects unknown shop items", async () => {
    await expect(
      purchaseShopItem({ userId, itemId: "single_draw_guarantee_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "ITEM_NOT_BUYABLE" });
    await expect(
      purchaseShopItem({ userId, itemId: "single_draw_guarantee_coupon", now: fixedNow }),
    ).rejects.toBeInstanceOf(ShopPurchaseError);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/gamification-shop.test.ts
```

Expected: FAIL because `lib/gamification/shop.ts` does not exist.

## Task 2: Shop Purchase Service

**Files:**
- Create: `lib/gamification/shop.ts`

- [ ] **Step 1: Implement the service**

Create `lib/gamification/shop.ts`:

```typescript
import { getShopCatalogItem } from "@/content/gamification/shop-catalog";
import { getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
import { prisma } from "@/lib/prisma";

export class ShopPurchaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = "ShopPurchaseError";
  }
}

export async function purchaseShopItem(input: {
  userId: string;
  itemId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const weekKey = getShanghaiWeekKey(dayKey);
  const catalogItem = getShopCatalogItem(input.itemId);
  const definition = getItemDefinition(input.itemId);

  if (!catalogItem || !definition || !definition.enabled) {
    throw new ShopPurchaseError("这个商品不存在或已下架。", "ITEM_NOT_BUYABLE", 404);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true, coins: true },
    });

    if (!user) {
      throw new ShopPurchaseError("用户不存在。", "UNAUTHORIZED", 401);
    }

    if (catalogItem.dailyLimit) {
      const dailyCount = await tx.shopPurchase.count({
        where: { userId: input.userId, itemId: input.itemId, dayKey, status: "SETTLED" },
      });

      if (dailyCount >= catalogItem.dailyLimit) {
        throw new ShopPurchaseError("今天这个商品已经买到上限。", "DAILY_LIMIT_REACHED");
      }
    }

    if (catalogItem.weeklyLimit) {
      const weeklyCount = await tx.shopPurchase.count({
        where: { userId: input.userId, itemId: input.itemId, weekKey, status: "SETTLED" },
      });

      if (weeklyCount >= catalogItem.weeklyLimit) {
        throw new ShopPurchaseError("本周这个商品已经买到上限。", "WEEKLY_LIMIT_REACHED");
      }
    }

    if (user.coins < catalogItem.priceCoins) {
      throw new ShopPurchaseError("银子不足。", "INSUFFICIENT_COINS");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { coins: { decrement: catalogItem.priceCoins } },
    });

    await tx.inventoryItem.upsert({
      where: { userId_itemId: { userId: input.userId, itemId: input.itemId } },
      create: { userId: input.userId, teamId: user.teamId, itemId: input.itemId, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });

    const purchase = await tx.shopPurchase.create({
      data: {
        userId: input.userId,
        teamId: user.teamId,
        itemId: input.itemId,
        quantity: 1,
        unitPriceCoins: catalogItem.priceCoins,
        totalPriceCoins: catalogItem.priceCoins,
        dayKey,
        weekKey,
        status: "SETTLED",
        metadataJson: JSON.stringify({
          itemName: definition.name,
          category: definition.category,
          requiresAdminConfirmation: definition.requiresAdminConfirmation,
        }),
      },
    });

    return { purchase };
  });
}
```

- [ ] **Step 2: Run the service tests**

Run:

```bash
npm test -- __tests__/gamification-shop.test.ts
```

Expected: PASS.

## Task 3: Verification And Commit

**Files:**
- Add: `lib/gamification/shop.ts`
- Add: `__tests__/gamification-shop.test.ts`
- Add: `docs/superpowers/specs/2026-05-25-supply-task-06-shop-purchase-service-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-06-shop-purchase-service.md`

- [ ] **Step 1: Run focused verification**

Run:

```bash
npm test -- __tests__/gamification-shop.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run adjacent catalog verification**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts __tests__/gamification-shop.test.ts
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
git add lib/gamification/shop.ts __tests__/gamification-shop.test.ts docs/superpowers/specs/2026-05-25-supply-task-06-shop-purchase-service-design.md docs/superpowers/plans/2026-05-25-supply-task-06-shop-purchase-service.md
git commit -m "feat: add gamification shop purchase service"
```
