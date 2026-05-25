# Supply Task 05 Shop Catalog Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production shop catalog contract used by the later real shop purchase service.

**Architecture:** Keep production shop rules in `content/gamification/shop-catalog.ts` as a small runtime catalog. The catalog stores only item ids, prices, and purchase limits; names, descriptions, effects, and enabled state continue to come from existing item definitions.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 with SQLite and better-sqlite3 adapter, Vitest/jsdom, React 19.

---

## Scope

This plan corresponds to:

`docs/superpowers/specs/2026-05-25-supply-task-05-shop-catalog-contract-design.md`

This task does not build the shop purchase service, purchase API, supply production view-model, or production UI.

## File Structure

- Create: `content/gamification/shop-catalog.ts`
  - Owns production buyable item ids, `priceCoins`, `dailyLimit`, and `weeklyLimit`.
  - Exports `getShopCatalogItems()` and `getShopCatalogItem(itemId)`.
- Create: `__tests__/gamification-shop-catalog.test.ts`
  - Locks approved item ids, key prices/limits, enabled item definition references, and unknown-item behavior.
- Add: `docs/superpowers/specs/2026-05-25-supply-task-05-shop-catalog-contract-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-05-shop-catalog-contract.md`

## Task 1: Failing Catalog Contract Test

**Files:**
- Create: `__tests__/gamification-shop-catalog.test.ts`

- [ ] **Step 1: Create the failing test**

Create `__tests__/gamification-shop-catalog.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getShopCatalogItem, getShopCatalogItems } from "@/content/gamification/shop-catalog";
import { getItemDefinition } from "@/lib/gamification/content";

describe("gamification shop catalog", () => {
  it("exposes the approved buyable item ids with prices and limits", () => {
    const items = getShopCatalogItems();

    expect(items.map((item) => item.itemId)).toEqual([
      "task_reroll_coupon",
      "small_boost_coupon",
      "fitness_leave_coupon",
      "drink_water_ping",
      "walk_ping",
      "team_standup_ping",
      "chat_ping",
      "share_info_ping",
      "team_broadcast_coupon",
      "double_niuma_coupon",
      "season_sprint_coupon",
      "luckin_coffee_coupon",
    ]);
    expect(getShopCatalogItem("task_reroll_coupon")).toMatchObject({
      itemId: "task_reroll_coupon",
      priceCoins: 150,
      dailyLimit: 1,
    });
    expect(getShopCatalogItem("double_niuma_coupon")).toMatchObject({
      itemId: "double_niuma_coupon",
      priceCoins: 600,
      weeklyLimit: 1,
    });
    expect(getShopCatalogItem("luckin_coffee_coupon")).toMatchObject({
      itemId: "luckin_coffee_coupon",
      priceCoins: 500,
      dailyLimit: 1,
    });
  });

  it("only references enabled content item definitions", () => {
    for (const item of getShopCatalogItems()) {
      const definition = getItemDefinition(item.itemId);
      expect(definition?.enabled, item.itemId).toBe(true);
      expect(item.priceCoins, item.itemId).toBeGreaterThan(0);
    }
  });

  it("keeps non-approved lottery helper items out of the shop", () => {
    expect(getShopCatalogItem("single_draw_guarantee_coupon")).toBeNull();
    expect(getShopCatalogItems().some((item) => item.itemId === "single_draw_guarantee_coupon")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts
```

Expected: FAIL because `content/gamification/shop-catalog.ts` does not exist.

## Task 2: Production Shop Catalog

**Files:**
- Create: `content/gamification/shop-catalog.ts`

- [ ] **Step 1: Implement the catalog**

Create `content/gamification/shop-catalog.ts`:

```typescript
export interface ShopCatalogItem {
  itemId: string;
  priceCoins: number;
  dailyLimit?: number;
  weeklyLimit?: number;
}

const SHOP_CATALOG_ITEMS: readonly ShopCatalogItem[] = [
  { itemId: "task_reroll_coupon", priceCoins: 150, dailyLimit: 1 },
  { itemId: "small_boost_coupon", priceCoins: 220, dailyLimit: 1 },
  { itemId: "fitness_leave_coupon", priceCoins: 260, dailyLimit: 1 },
  { itemId: "drink_water_ping", priceCoins: 80, dailyLimit: 2 },
  { itemId: "walk_ping", priceCoins: 80, dailyLimit: 2 },
  { itemId: "team_standup_ping", priceCoins: 180, dailyLimit: 1 },
  { itemId: "chat_ping", priceCoins: 90, dailyLimit: 2 },
  { itemId: "share_info_ping", priceCoins: 90, dailyLimit: 2 },
  { itemId: "team_broadcast_coupon", priceCoins: 200, dailyLimit: 1 },
  { itemId: "double_niuma_coupon", priceCoins: 600, weeklyLimit: 1 },
  { itemId: "season_sprint_coupon", priceCoins: 520, weeklyLimit: 1 },
  { itemId: "luckin_coffee_coupon", priceCoins: 500, dailyLimit: 1 },
];

export function getShopCatalogItems() {
  return SHOP_CATALOG_ITEMS;
}

export function getShopCatalogItem(itemId: string) {
  return SHOP_CATALOG_ITEMS.find((item) => item.itemId === itemId) ?? null;
}
```

- [ ] **Step 2: Run the catalog test**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts
```

Expected: PASS.

## Task 3: Verification And Commit

**Files:**
- Add: `content/gamification/shop-catalog.ts`
- Add: `__tests__/gamification-shop-catalog.test.ts`
- Add: `docs/superpowers/specs/2026-05-25-supply-task-05-shop-catalog-contract-design.md`
- Add: `docs/superpowers/plans/2026-05-25-supply-task-05-shop-catalog-contract.md`

- [ ] **Step 1: Run focused verification**

Run:

```bash
npm test -- __tests__/gamification-shop-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add content/gamification/shop-catalog.ts __tests__/gamification-shop-catalog.test.ts docs/superpowers/specs/2026-05-25-supply-task-05-shop-catalog-contract-design.md docs/superpowers/plans/2026-05-25-supply-task-05-shop-catalog-contract.md
git commit -m "feat: add supply shop catalog contract"
```
