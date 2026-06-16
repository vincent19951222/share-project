# Drink Record Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the production `续命咖啡` experience with `牛马水铺`, backed by a generalized drink record model that preserves historical coffee data.

**Architecture:** Add `DrinkRecord` as the new source of truth while keeping `CoffeeRecord` for rollback and temporary compatibility. Build drink APIs, shared drink mutation helpers, and a drink store, then extract the approved `ui-prototypes/drink-update` UI into production `components/drink-checkin/*`. Update calendar, reports, weekly summaries, and activity events to read drink records while keeping short-term coffee-shaped compatibility routes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Prisma 7 with SQLite, Vitest + jsdom, Tailwind CSS v4/global CSS, existing cookie auth and API route patterns.

---

## Scope Guardrails

- Keep `/drink` as the public route.
- Keep `CoffeeRecord` in the first release for rollback.
- Do not run seeds in production.
- Use `npx prisma db push` for this repo's current production database flow.
- Run verification commands serially because `prisma generate`, tests, lint, and build can collide when run in parallel.
- Do not stage `.agents/`, `skills-lock.json`, handoff docs, or `tmp/imagegen/*` unless a later task explicitly asks for them.

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `DrinkRecord` relations and model.
- Create: `lib/drinks.ts`
  - Drink type constants, labels, assets, validation, note normalization.
- Create: `lib/drink-state.ts`
  - Build `DrinkSnapshot` from `DrinkRecord`.
- Create: `lib/drink-records.ts`
  - Shared create/remove helpers so drink APIs and coffee compatibility APIs write the same `DrinkRecord` table with different activity-event modes.
- Create: `lib/drink-store.tsx`
  - Client provider and mutation orchestration for `/drink` and `/report`.
- Modify: `lib/types.ts`
  - Add drink snapshot types, keep coffee compatibility types during transition.
- Modify: `lib/api.ts`
  - Add `fetchDrinkState`, `addDrinkRecord`, `removeLatestDrinkRecord`.
- Create: `app/api/drinks/state/route.ts`
  - Drink state GET.
- Create: `app/api/drinks/records/route.ts`
  - Drink record POST.
- Create: `app/api/drinks/records/latest/route.ts`
  - Latest drink DELETE.
- Modify: `app/api/coffee/state/route.ts`, `app/api/coffee/cups/route.ts`, `app/api/coffee/cups/latest/route.ts`
  - Compatibility wrappers over drink state and drink mutations.
- Modify: `lib/activity-events.ts`, `app/api/activity-events/route.ts`
  - Add drink event types and `kind=drink`.
- Create: `scripts/backfill-drink-records-from-coffee.ts`
  - One-time deterministic backfill.
- Create: `scripts/drink-backfill-utils.ts`
  - Pure mapping helpers used by tests and the backfill script.
- Create: `scripts/verify-drink-record-backfill.ts`
  - Count/date/user distribution checks.
- Create: `components/drink-checkin/*`
  - Production UI extracted from the prototype.
- Modify: `components/board/BoardApp.tsx`, `components/board/dynamic-tabs.tsx`, `components/board/tab-component-loaders.ts`
  - Switch coffee tab rendering to drink components and provider.
- Modify: `components/navbar/Navbar.tsx`
  - Rename nav label from `续命咖啡` to `牛马水铺`.
- Modify: `lib/calendar-state.ts`, `components/calendar/*`
  - Aggregate drink counts while preserving coffee-compatible fields.
- Modify: `components/report-center/*`, `components/report-center/report-data.ts`
  - Replace coffee report with drink report.
- Modify: `lib/weekly-report-service.ts`, `lib/weekly-report.ts`
  - Read drink records and update wording.
- Tests:
  - Create `__tests__/drink-state.test.ts`
  - Create `__tests__/drink-api.test.ts`
  - Create `__tests__/drink-api-helpers.test.ts`
  - Create `__tests__/drink-checkin.test.tsx`
  - Create `__tests__/drink-record-backfill.test.ts`
  - Modify existing coffee/calendar/report/weekly/activity tests for compatibility.

## Task 1: Drink Domain Types And Catalog

**Files:**
- Create: `lib/drinks.ts`
- Modify: `lib/types.ts`
- Create: `__tests__/drink-state.test.ts`

- [ ] **Step 1: Write the failing catalog and type test**

Create `__tests__/drink-state.test.ts` with the catalog test first:

```ts
import { describe, expect, it } from "vitest";
import {
  DRINK_TYPES,
  drinkCatalog,
  isDrinkType,
  normalizeDrinkNote,
} from "@/lib/drinks";

describe("drink domain", () => {
  it("defines the fixed 牛马水铺 drink catalog", () => {
    expect(DRINK_TYPES).toEqual(["water", "milkTea", "americano", "latte", "other"]);
    expect(drinkCatalog.water.label).toBe("水");
    expect(drinkCatalog.milkTea.label).toBe("奶茶");
    expect(drinkCatalog.americano.label).toBe("美式");
    expect(drinkCatalog.latte.label).toBe("拿铁");
    expect(drinkCatalog.other.label).toBe("其他");
    expect(isDrinkType("americano")).toBe(true);
    expect(isDrinkType("coffee")).toBe(false);
  });

  it("normalizes drink notes for persistence", () => {
    expect(normalizeDrinkNote("  下午用奶泡顶住  ")).toBe("下午用奶泡顶住");
    expect(normalizeDrinkNote("   ")).toBeNull();
    expect(normalizeDrinkNote("x".repeat(90))).toBe("x".repeat(80));
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/drink-state.test.ts
```

Expected: FAIL with an import error for `@/lib/drinks`.

- [ ] **Step 3: Create the drink catalog**

Create `lib/drinks.ts`:

```ts
export const DRINK_TYPES = ["water", "milkTea", "americano", "latte", "other"] as const;

export type DrinkType = (typeof DRINK_TYPES)[number];

export interface DrinkCatalogItem {
  type: DrinkType;
  label: string;
  asset: string;
  color: string;
  softColor: string;
  textColor: string;
}

export const drinkCatalog: Record<DrinkType, DrinkCatalogItem> = {
  water: {
    type: "water",
    label: "水",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-water.png",
    color: "#4fb8d6",
    softColor: "#e8f8fc",
    textColor: "#0087a6",
  },
  milkTea: {
    type: "milkTea",
    label: "奶茶",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-milk-tea.png",
    color: "#ef7f8f",
    softColor: "#fff1ee",
    textColor: "#e96f83",
  },
  americano: {
    type: "americano",
    label: "美式",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-americano.png",
    color: "#7a5438",
    softColor: "#fff3df",
    textColor: "#76411f",
  },
  latte: {
    type: "latte",
    label: "拿铁",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-latte.png",
    color: "#ef9d36",
    softColor: "#fff4dd",
    textColor: "#e4841b",
  },
  other: {
    type: "other",
    label: "其他",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-other.png",
    color: "#8f948e",
    softColor: "#f4f3ed",
    textColor: "#555555",
  },
};

export function isDrinkType(value: unknown): value is DrinkType {
  return typeof value === "string" && (DRINK_TYPES as readonly string[]).includes(value);
}

export function normalizeDrinkNote(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().slice(0, 80);
  return trimmed.length > 0 ? trimmed : null;
}
```

- [ ] **Step 4: Add drink snapshot types**

At the top of `lib/types.ts`, before the first `export interface`, add:

```ts
import type { DrinkType } from "@/lib/drinks";
```

Then append these interfaces next to the existing coffee snapshot types near `CoffeeMemberSnapshot`:

```ts
export interface DrinkDayCell {
  cups: number;
  drinkCounts: Record<DrinkType, number>;
}

export interface DrinkEventSnapshot {
  id: string;
  userId: string;
  userName: string;
  avatarKey: string;
  drinkType: DrinkType;
  time: string;
  note: string | null;
  createdAt: string;
}

export interface DrinkCountSnapshot {
  drinkType: DrinkType;
  count: number;
}

export interface DrinkKingSnapshot {
  userId: string;
  name: string;
  cups: number;
}

export interface DrinkSnapshot {
  members: CoffeeMemberSnapshot[];
  gridData: DrinkDayCell[][];
  today: number;
  totalDays: number;
  currentUserId: string;
  todayEvents: DrinkEventSnapshot[];
  stats: {
    todayTotalCups: number;
    todayDrinkers: number;
    currentUserTodayCups: number;
    drinkKing: DrinkKingSnapshot | null;
    favoriteDrink: DrinkCountSnapshot | null;
    latestDrink: DrinkEventSnapshot | null;
    drinkCounts: Record<DrinkType, number>;
  };
}
```

Do not place the import in the middle of the file. If `lib/types.ts` already imports from `@/lib/drinks`, merge imports instead of duplicating them.

- [ ] **Step 5: Run the test and commit**

Run:

```bash
npm test -- __tests__/drink-state.test.ts
npm run lint
```

Expected: both commands pass.

Commit:

```bash
git add lib/drinks.ts lib/types.ts __tests__/drink-state.test.ts
git commit -m "feat: add drink domain catalog"
```

## Task 2: Schema And Coffee Backfill Scripts

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/drink-backfill-utils.ts`
- Create: `scripts/backfill-drink-records-from-coffee.ts`
- Create: `scripts/verify-drink-record-backfill.ts`
- Create: `__tests__/drink-record-backfill.test.ts`

- [ ] **Step 1: Write the failing backfill test**

Create `__tests__/drink-record-backfill.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildDrinkRecordIdFromCoffeeRecordId,
  mapCoffeeRecordToDrinkRecord,
} from "@/scripts/drink-backfill-utils";

describe("drink record coffee backfill", () => {
  it("maps legacy coffee records to stable americano drink records", () => {
    expect(buildDrinkRecordIdFromCoffeeRecordId("coffee_123")).toBe("drink_coffee_123");
    expect(
      mapCoffeeRecordToDrinkRecord({
        id: "coffee_123",
        userId: "user_1",
        teamId: "team_1",
        dayKey: "2026-06-02",
        createdAt: new Date("2026-06-02T01:30:00.000Z"),
        deletedAt: null,
      }),
    ).toEqual({
      id: "drink_coffee_123",
      userId: "user_1",
      teamId: "team_1",
      dayKey: "2026-06-02",
      drinkType: "americano",
      note: "历史咖啡记录",
      createdAt: new Date("2026-06-02T01:30:00.000Z"),
      deletedAt: null,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- __tests__/drink-record-backfill.test.ts
```

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Add `DrinkRecord` to Prisma schema**

Modify `prisma/schema.prisma`:

```prisma
model Team {
  drinkRecords  DrinkRecord[]
}

model User {
  drinkRecords         DrinkRecord[]
}

model DrinkRecord {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  teamId    String
  team      Team      @relation(fields: [teamId], references: [id])
  dayKey    String
  drinkType String
  note      String?
  createdAt DateTime  @default(now())
  deletedAt DateTime?

  @@index([teamId, dayKey, createdAt])
  @@index([userId, dayKey, createdAt])
  @@index([teamId, drinkType, dayKey])
}
```

Keep the existing `CoffeeRecord` model in place.

- [ ] **Step 4: Add deterministic backfill helpers and script**

Create `scripts/drink-backfill-utils.ts`:

```ts
import type { DrinkType } from "@/lib/drinks";

export interface LegacyCoffeeRecord {
  id: string;
  userId: string;
  teamId: string;
  dayKey: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export function buildDrinkRecordIdFromCoffeeRecordId(coffeeRecordId: string) {
  return `drink_${coffeeRecordId}`;
}

export function mapCoffeeRecordToDrinkRecord(record: LegacyCoffeeRecord) {
  return {
    id: buildDrinkRecordIdFromCoffeeRecordId(record.id),
    userId: record.userId,
    teamId: record.teamId,
    dayKey: record.dayKey,
    drinkType: "americano" satisfies DrinkType,
    note: "历史咖啡记录",
    createdAt: record.createdAt,
    deletedAt: record.deletedAt,
  };
}
```

Create `scripts/backfill-drink-records-from-coffee.ts`:

```ts
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { mapCoffeeRecordToDrinkRecord } from "@/scripts/drink-backfill-utils";

async function main() {
  const coffeeRecords = await prisma.coffeeRecord.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      teamId: true,
      dayKey: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const record of coffeeRecords) {
    const data = mapCoffeeRecordToDrinkRecord(record);
    const existing = await prisma.drinkRecord.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.drinkRecord.create({ data });
    created += 1;
  }

  console.log(`Backfilled drink records from coffee records: created=${created}, skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: Add verification script**

Create `scripts/verify-drink-record-backfill.ts`:

```ts
import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const coffeeCount = await prisma.coffeeRecord.count();
  const backfilledDrinkCount = await prisma.drinkRecord.count({
    where: {
      id: { startsWith: "drink_" },
      drinkType: "americano",
      note: "历史咖啡记录",
    },
  });

  if (coffeeCount !== backfilledDrinkCount) {
    throw new Error(`Backfill mismatch: coffee=${coffeeCount}, drink=${backfilledDrinkCount}`);
  }

  console.log(`Backfill verified: coffee=${coffeeCount}, drink=${backfilledDrinkCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 6: Generate Prisma client, run tests, commit**

Run:

```bash
npx prisma generate
npm test -- __tests__/drink-record-backfill.test.ts
npm run lint
```

Expected: all pass.

Commit:

```bash
git add prisma/schema.prisma scripts/drink-backfill-utils.ts scripts/backfill-drink-records-from-coffee.ts scripts/verify-drink-record-backfill.ts __tests__/drink-record-backfill.test.ts
git commit -m "feat: add drink record schema"
```

`lib/generated/prisma` is gitignored in this repository. Run `npx prisma generate` for local type generation, but do not stage the generated client.

## Task 3: Drink State Builder

**Files:**
- Create: `lib/drink-state.ts`
- Extend: `__tests__/drink-state.test.ts`

- [ ] **Step 1: Add failing state builder test**

Append to `__tests__/drink-state.test.ts`:

```ts
import { buildDrinkSnapshotForUser } from "@/lib/drink-state";
import { prisma } from "@/lib/prisma";

describe("buildDrinkSnapshotForUser", () => {
  it("aggregates drink counts, latest drink, favorite drink, and today's events", async () => {
    const team = await prisma.team.create({
      data: { name: "drink team", code: "drink-state-team" },
    });
    const user = await prisma.user.create({
      data: {
        username: "drink-user",
        password: "hashed",
        avatarKey: "male1",
        teamId: team.id,
      },
    });

    await prisma.drinkRecord.createMany({
      data: [
        {
          userId: user.id,
          teamId: team.id,
          dayKey: "2026-06-02",
          drinkType: "water",
          note: "早起一杯",
          createdAt: new Date("2026-06-02T00:42:00.000Z"),
        },
        {
          userId: user.id,
          teamId: team.id,
          dayKey: "2026-06-02",
          drinkType: "latte",
          note: "下午用奶泡顶住",
          createdAt: new Date("2026-06-02T07:18:00.000Z"),
        },
      ],
    });

    const snapshot = await buildDrinkSnapshotForUser(user.id, new Date("2026-06-02T08:00:00.000Z"));

    expect(snapshot?.stats.todayTotalCups).toBe(2);
    expect(snapshot?.stats.currentUserTodayCups).toBe(2);
    expect(snapshot?.stats.drinkCounts).toMatchObject({ water: 1, latte: 1 });
    expect(snapshot?.stats.favoriteDrink).toEqual({ drinkType: "water", count: 1 });
    expect(snapshot?.stats.latestDrink?.drinkType).toBe("latte");
    expect(snapshot?.stats.latestDrink?.note).toBe("下午用奶泡顶住");
    expect(snapshot?.todayEvents.map((event) => event.drinkType)).toEqual(["water", "latte"]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/drink-state.test.ts
```

Expected: FAIL because `lib/drink-state.ts` does not exist.

- [ ] **Step 3: Implement `lib/drink-state.ts`**

Create `lib/drink-state.ts` by adapting `lib/coffee-state.ts`:

```ts
import { DRINK_TYPES, type DrinkType } from "@/lib/drinks";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import type { DrinkDayCell, DrinkEventSnapshot, DrinkSnapshot } from "@/lib/types";

export const DRINK_TOTAL_DAYS = 30;

function createEmptyDrinkCounts(): Record<DrinkType, number> {
  return DRINK_TYPES.reduce(
    (counts, type) => ({ ...counts, [type]: 0 }),
    {} as Record<DrinkType, number>,
  );
}

export function getCurrentDrinkTotalDays(now: Date = new Date()): number {
  const monthKey = getShanghaiDayKey(now).slice(0, 7);
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getCurrentDrinkDay(now: Date = new Date()): number {
  const day = Number(getShanghaiDayKey(now).slice(8, 10));
  return Math.max(1, Math.min(day, getCurrentDrinkTotalDays(now)));
}

export async function buildDrinkSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<DrinkSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const today = getCurrentDrinkDay(now);
  const totalDays = getCurrentDrinkTotalDays(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            orderBy: { createdAt: "asc" },
            select: { id: true, username: true, avatarKey: true },
          },
          drinkRecords: {
            where: {
              dayKey: { startsWith: currentMonthKey },
              deletedAt: null,
            },
            select: {
              id: true,
              userId: true,
              dayKey: true,
              drinkType: true,
              note: true,
              createdAt: true,
              user: {
                select: {
                  username: true,
                  avatarKey: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const cupCounts = new Map<string, number>();
  const drinkCountsByCell = new Map<string, Record<DrinkType, number>>();
  const todayEvents: DrinkEventSnapshot[] = [];
  const currentUserDrinkCounts = createEmptyDrinkCounts();

  for (const record of user.team.drinkRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (!Number.isInteger(day) || day < 1 || day > totalDays) {
      continue;
    }

    const drinkType = DRINK_TYPES.includes(record.drinkType as DrinkType)
      ? (record.drinkType as DrinkType)
      : "other";
    const key = `${record.userId}:${day}`;
    const cellCounts = drinkCountsByCell.get(key) ?? createEmptyDrinkCounts();

    cellCounts[drinkType] += 1;
    drinkCountsByCell.set(key, cellCounts);
    cupCounts.set(key, (cupCounts.get(key) ?? 0) + 1);

    if (record.userId === user.id && record.dayKey === todayDayKey) {
      currentUserDrinkCounts[drinkType] += 1;
    }

    if (record.dayKey === todayDayKey) {
      todayEvents.push({
        id: record.id,
        userId: record.userId,
        userName: record.user.username,
        avatarKey: record.user.avatarKey,
        drinkType,
        time: new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Shanghai",
        }).format(record.createdAt),
        note: record.note,
        createdAt: record.createdAt.toISOString(),
      });
    }
  }

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
  }));

  const gridData: DrinkDayCell[][] = members.map((member) =>
    Array.from({ length: totalDays }, (_, index) => {
      const key = `${member.id}:${index + 1}`;
      return {
        cups: cupCounts.get(key) ?? 0,
        drinkCounts: drinkCountsByCell.get(key) ?? createEmptyDrinkCounts(),
      };
    }),
  );

  const todayRows = members.map((member, index) => ({
    userId: member.id,
    name: member.name,
    cups: gridData[index]?.[today - 1]?.cups ?? 0,
  }));

  const todayTotalCups = todayRows.reduce((sum, row) => sum + row.cups, 0);
  const todayDrinkers = todayRows.filter((row) => row.cups > 0).length;
  const currentUserTodayCups = todayRows.find((row) => row.userId === user.id)?.cups ?? 0;
  const drinkKing =
    todayRows
      .filter((row) => row.cups > 0)
      .sort((left, right) => right.cups - left.cups || left.name.localeCompare(right.name))[0] ?? null;

  const favoriteDrink =
    DRINK_TYPES.map((drinkType) => ({ drinkType, count: currentUserDrinkCounts[drinkType] }))
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count || DRINK_TYPES.indexOf(left.drinkType) - DRINK_TYPES.indexOf(right.drinkType))[0] ?? null;

  return {
    members,
    gridData,
    today,
    totalDays,
    currentUserId: user.id,
    todayEvents,
    stats: {
      todayTotalCups,
      todayDrinkers,
      currentUserTodayCups,
      drinkKing,
      favoriteDrink,
      latestDrink: todayEvents.at(-1) ?? null,
      drinkCounts: currentUserDrinkCounts,
    },
  };
}
```

- [ ] **Step 4: Run tests and commit**

Run:

```bash
npm test -- __tests__/drink-state.test.ts
npm run lint
```

Expected: both pass.

Commit:

```bash
git add lib/drink-state.ts lib/types.ts __tests__/drink-state.test.ts
git commit -m "feat: build drink state snapshot"
```

## Task 4: Drink API Routes And Client Helpers

**Files:**
- Create: `app/api/drinks/state/route.ts`
- Create: `app/api/drinks/records/route.ts`
- Create: `app/api/drinks/records/latest/route.ts`
- Create: `lib/drink-records.ts`
- Modify: `lib/api.ts`
- Create: `__tests__/drink-api.test.ts`
- Create: `__tests__/drink-api-helpers.test.ts`

- [ ] **Step 1: Write route tests**

Create `__tests__/drink-api.test.ts` mirroring `__tests__/coffee-api.test.ts`, with these assertions:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/drinks/state/route";
import { POST } from "@/app/api/drinks/records/route";
import { DELETE } from "@/app/api/drinks/records/latest/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(url: string, userId?: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: userId
      ? {
          Cookie: `userId=${createCookieValue(userId)}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
  });
}

describe("drink API", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.drinkRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects unauthenticated drink requests", async () => {
    expect((await GET(request("/api/drinks/state"))).status).toBe(401);
    expect((await POST(request("/api/drinks/records", undefined, "POST", { drinkType: "water" }))).status).toBe(401);
    expect((await DELETE(request("/api/drinks/records/latest", undefined, "DELETE"))).status).toBe(401);
  });

  it("creates a drink record with type and note", async () => {
    const response = await POST(request("/api/drinks/records", userId, "POST", {
      drinkType: "milkTea",
      note: "奶茶续命，快乐加倍",
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.snapshot.stats.latestDrink).toMatchObject({
      drinkType: "milkTea",
      note: "奶茶续命，快乐加倍",
    });
    await expect(
      prisma.drinkRecord.findFirstOrThrow({
        where: { userId, teamId, drinkType: "milkTea", deletedAt: null },
      }),
    ).resolves.toMatchObject({
      note: "奶茶续命，快乐加倍",
    });
  });

  it("rejects unsupported drink types", async () => {
    const response = await POST(request("/api/drinks/records", userId, "POST", {
      drinkType: "coffee",
    }));

    expect(response.status).toBe(400);
  });

  it("soft-deletes the latest matching drink type", async () => {
    await POST(request("/api/drinks/records", userId, "POST", { drinkType: "water" }));
    await POST(request("/api/drinks/records", userId, "POST", { drinkType: "latte" }));

    const response = await DELETE(
      request("/api/drinks/records/latest", userId, "DELETE", { drinkType: "water" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.snapshot.stats.drinkCounts.water).toBe(0);
    expect(payload.snapshot.stats.drinkCounts.latte).toBe(1);
  });
});
```

- [ ] **Step 2: Write API helper tests**

Create `__tests__/drink-api-helpers.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDrinkRecord, fetchDrinkState, removeLatestDrinkRecord } from "@/lib/api";

const drinkSnapshot = {
  members: [],
  gridData: [],
  today: 2,
  totalDays: 30,
  currentUserId: "u1",
  todayEvents: [],
  stats: {
    todayTotalCups: 0,
    todayDrinkers: 0,
    currentUserTodayCups: 0,
    drinkKing: null,
    favoriteDrink: null,
    latestDrink: null,
    drinkCounts: { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 },
  },
};

describe("drink API helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls drink endpoints with the expected methods and payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: drinkSnapshot }),
      }),
    );

    await expect(fetchDrinkState()).resolves.toEqual(drinkSnapshot);
    await expect(addDrinkRecord({ drinkType: "water", note: "早起一杯" })).resolves.toEqual(drinkSnapshot);
    await expect(removeLatestDrinkRecord("water")).resolves.toEqual(drinkSnapshot);

    expect(fetch).toHaveBeenCalledWith("/api/drinks/state", expect.objectContaining({ method: "GET" }));
    expect(fetch).toHaveBeenCalledWith(
      "/api/drinks/records",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ drinkType: "water", note: "早起一杯" }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/drinks/records/latest",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ drinkType: "water" }),
      }),
    );

  });
});
```

- [ ] **Step 3: Run and verify failures**

Run:

```bash
npm test -- __tests__/drink-api.test.ts __tests__/drink-api-helpers.test.ts
```

Expected: FAIL because routes and helpers do not exist.

- [ ] **Step 4: Implement routes**

Create `lib/drink-records.ts` and implement routes by adapting coffee routes:

- `app/api/drinks/state/route.ts` calls `buildDrinkSnapshotForUser`.
- `lib/drink-records.ts` exposes `createDrinkRecordForUser({ user, drinkType, note, activityMode })` and `removeLatestDrinkRecordForUser({ user, drinkType, activityMode })`.
- `activityMode: "drink"` writes `DRINK_ADD/DRINK_REMOVE`; `activityMode: "coffeeCompatibility"` writes `COFFEE_ADD/COFFEE_REMOVE`.
- `app/api/drinks/records/route.ts` validates `drinkType` with `isDrinkType`, normalizes note, calls the helper with `activityMode: "drink"`, and returns a fresh `DrinkSnapshot`.
- `app/api/drinks/records/latest/route.ts` reads optional `drinkType`, calls the helper with `activityMode: "drink"`, and returns a fresh `DrinkSnapshot`.

- [ ] **Step 5: Add client helpers**

Add to `lib/api.ts`:

```ts
import type { DrinkSnapshot } from "@/lib/types";
import type { DrinkType } from "@/lib/drinks";

async function readDrinkSnapshot(response: Response): Promise<DrinkSnapshot> {
  const payload = await readApiResult<{ snapshot: DrinkSnapshot }>(response, "响应解析失败");
  return payload.snapshot;
}

export async function fetchDrinkState(): Promise<DrinkSnapshot> {
  const response = await fetch("/api/drinks/state", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  return readDrinkSnapshot(response);
}

export async function addDrinkRecord(input: { drinkType: DrinkType; note?: string | null }): Promise<DrinkSnapshot> {
  const response = await fetch("/api/drinks/records", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readDrinkSnapshot(response);
}

export async function removeLatestDrinkRecord(drinkType?: DrinkType): Promise<DrinkSnapshot> {
  const response = await fetch("/api/drinks/records/latest", {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(drinkType ? { drinkType } : {}),
  });

  return readDrinkSnapshot(response);
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npm test -- __tests__/drink-api.test.ts __tests__/drink-api-helpers.test.ts
npm run lint
```

Expected: both pass.

Commit:

```bash
git add app/api/drinks lib/drink-records.ts lib/api.ts __tests__/drink-api.test.ts __tests__/drink-api-helpers.test.ts
git commit -m "feat: add drink record api"
```

## Task 5: Activity Events And Coffee Compatibility API

**Files:**
- Modify: `lib/activity-events.ts`
- Modify: `app/api/activity-events/route.ts`
- Modify: `app/api/coffee/state/route.ts`
- Modify: `app/api/coffee/cups/route.ts`
- Modify: `app/api/coffee/cups/latest/route.ts`
- Modify: `__tests__/activity-events-api.test.ts`
- Modify: `__tests__/coffee-api.test.ts`

- [ ] **Step 1: Add failing compatibility tests**

Extend `__tests__/activity-events-api.test.ts`:

```ts
it("filters drink activity events by kind=drink", async () => {
  await prisma.activityEvent.deleteMany({ where: { teamId } });
  await prisma.activityEvent.create({
    data: {
      teamId,
      userId,
      type: ACTIVITY_EVENT_TYPES.DRINK_ADD,
      message: "li 在水铺记录 1 杯水，今日累计 1 杯",
      assetAwarded: null,
      createdAt: now,
    },
  });
  await prisma.activityEvent.create({
    data: {
      teamId,
      userId,
      type: ACTIVITY_EVENT_TYPES.COFFEE_ADD,
      message: "li 续命 1 杯，今日累计 1 杯",
      assetAwarded: null,
      createdAt: now,
    },
  });

  const response = await GET(request(userId, "?kind=drink"));
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.events.map((event: { text: string }) => event.text)).toEqual([
    "li 在水铺记录 1 杯水，今日累计 1 杯",
  ]);
});
```

Extend `__tests__/coffee-api.test.ts` to clear `drinkRecord` in `beforeEach`, then assert coffee POST creates an americano drink record, creates a `COFFEE_ADD` activity event, and returns the existing coffee-shaped response.

- [ ] **Step 2: Run and verify failures**

Run:

```bash
npm test -- __tests__/activity-events-api.test.ts __tests__/coffee-api.test.ts
```

Expected: FAIL because `kind=drink` and coffee wrappers are not implemented.

- [ ] **Step 3: Add drink activity events**

Modify `lib/activity-events.ts`:

```ts
export const ACTIVITY_EVENT_TYPES = {
  PUNCH: "PUNCH",
  UNDO_PUNCH: "UNDO_PUNCH",
  COFFEE_ADD: "COFFEE_ADD",
  COFFEE_REMOVE: "COFFEE_REMOVE",
  DRINK_ADD: "DRINK_ADD",
  DRINK_REMOVE: "DRINK_REMOVE",
} as const;

export function buildDrinkAddActivityMessage(username: string, drinkLabel: string, totalCups: number) {
  return `${username} 在水铺记录 1 杯${drinkLabel}，今日累计 ${totalCups} 杯`;
}

export function buildDrinkRemoveActivityMessage(username: string, drinkLabel: string, totalCups: number) {
  return `${username} 撤回 1 杯${drinkLabel}，今日累计 ${totalCups} 杯`;
}

export function getActivityEventTypesByKind(kind: string | null | undefined) {
  if (kind === "punch") {
    return [ACTIVITY_EVENT_TYPES.PUNCH, ACTIVITY_EVENT_TYPES.UNDO_PUNCH];
  }

  if (kind === "coffee") {
    return [ACTIVITY_EVENT_TYPES.COFFEE_ADD, ACTIVITY_EVENT_TYPES.COFFEE_REMOVE];
  }

  if (kind === "drink") {
    return [ACTIVITY_EVENT_TYPES.DRINK_ADD, ACTIVITY_EVENT_TYPES.DRINK_REMOVE];
  }

  return null;
}
```

In `app/api/activity-events/route.ts`, treat both `kind=coffee` and `kind=drink` as current-Shanghai-day feeds:

```ts
const since =
  kind === "coffee" || kind === "drink"
    ? new Date(`${getShanghaiDayKey()}T00:00:00+08:00`)
    : new Date(Date.now() - RECENT_ACTIVITY_WINDOW_MS);
```

- [ ] **Step 4: Implement coffee wrappers**

Change coffee API routes so they call drink logic with `drinkType: "americano"` and `activityMode: "coffeeCompatibility"`. The compatibility API should stop creating new `CoffeeRecord` rows; historical rows already move through the backfill script. Preserve response shape by mapping `DrinkSnapshot` to `CoffeeSnapshot`:

```ts
function mapDrinkSnapshotToCoffeeSnapshot(snapshot: DrinkSnapshot): CoffeeSnapshot {
  return {
    members: snapshot.members,
    gridData: snapshot.gridData.map((row) => row.map((cell) => ({ cups: cell.cups }))),
    today: snapshot.today,
    totalDays: snapshot.totalDays,
    currentUserId: snapshot.currentUserId,
    stats: {
      todayTotalCups: snapshot.stats.todayTotalCups,
      todayDrinkers: snapshot.stats.todayDrinkers,
      currentUserTodayCups: snapshot.stats.currentUserTodayCups,
      coffeeKing: snapshot.stats.drinkKing,
    },
  };
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- __tests__/activity-events-api.test.ts __tests__/coffee-api.test.ts
npm run lint
```

Expected: both pass.

Commit:

```bash
git add lib/activity-events.ts app/api/activity-events/route.ts app/api/coffee __tests__/activity-events-api.test.ts __tests__/coffee-api.test.ts
git commit -m "feat: add drink activity compatibility"
```

## Task 6: Production Drink Store And UI Extraction

**Files:**
- Create: `lib/drink-store.tsx`
- Create: `components/drink-checkin/DrinkCheckin.tsx`
- Create: `components/drink-checkin/DrinkReceipt.tsx`
- Create: `components/drink-checkin/DrinkActivityFeed.tsx`
- Create: `components/drink-checkin/DrinkTeamGrid.tsx`
- Create: `components/drink-checkin/drink-entry.ts`
- Create: `components/drink-checkin/drink-catalog.ts`
- Create: `__tests__/drink-checkin.test.tsx`

- [ ] **Step 1: Write failing UI behavior test**

Create `__tests__/drink-checkin.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrinkCheckin } from "@/components/drink-checkin/DrinkCheckin";
import { DrinkProvider } from "@/lib/drink-store";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createJsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

const snapshot = {
  members: [{ id: "u1", name: "li", avatarKey: "male1" }],
  gridData: [[{ cups: 0, drinkCounts: { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 } }]],
  today: 2,
  totalDays: 2,
  currentUserId: "u1",
  todayEvents: [],
  stats: {
    todayTotalCups: 0,
    todayDrinkers: 0,
    currentUserTodayCups: 0,
    drinkKing: null,
    favoriteDrink: null,
    latestDrink: null,
    drinkCounts: { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 },
  },
};

describe("DrinkCheckin", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.pushState({}, "", "/drink");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("opens a confirmation ticket and posts the edited drink note", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/drinks/state") {
          return Promise.resolve(createJsonResponse({ snapshot }));
        }
        if (url === "/api/drinks/records" && init?.method === "POST") {
          return Promise.resolve(createJsonResponse({ snapshot: {
            ...snapshot,
            todayEvents: [{
              id: "d1",
              userId: "u1",
              userName: "li",
              avatarKey: "male1",
              drinkType: "water",
              time: "08:42",
              note: "测试备注",
              createdAt: "2026-06-02T00:42:00.000Z",
            }],
            stats: {
              ...snapshot.stats,
              todayTotalCups: 1,
              currentUserTodayCups: 1,
              latestDrink: {
                id: "d1",
                userId: "u1",
                userName: "li",
                avatarKey: "male1",
                drinkType: "water",
                time: "08:42",
                note: "测试备注",
                createdAt: "2026-06-02T00:42:00.000Z",
              },
              drinkCounts: { ...snapshot.stats.drinkCounts, water: 1 },
            },
          } }));
        }
        if (url === "/api/activity-events?kind=drink") {
          return Promise.resolve(createJsonResponse({ events: [] }));
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    await act(async () => {
      root.render(
        <DrinkProvider>
          <DrinkCheckin />
        </DrinkProvider>,
      );
      await Promise.resolve();
    });

    const addWater = container.querySelector<HTMLButtonElement>('button[aria-label="增加一杯水"]');
    expect(addWater).not.toBeNull();

    await act(async () => {
      addWater?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("确认记录一杯");

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[name="drink-note"]');
    expect(textarea).not.toBeNull();

    await act(async () => {
      textarea!.value = "测试备注";
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const confirm = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认入账"),
    );

    await act(async () => {
      confirm?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/drinks/records",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ drinkType: "water", note: "测试备注" }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/drink-checkin.test.tsx
```

Expected: FAIL because production drink components and store do not exist.

- [ ] **Step 3: Implement `DrinkProvider`**

Create `lib/drink-store.tsx` by adapting `lib/coffee-store.tsx` to use `fetchDrinkState`, `addDrinkRecord`, and `removeLatestDrinkRecord`.

- [ ] **Step 4: Extract production drink UI**

Create `components/drink-checkin/*` from the committed prototype:

- Move drink catalog to `components/drink-checkin/drink-catalog.ts`.
- Move note options and event helper to `components/drink-checkin/drink-entry.ts`.
- `DrinkCheckin.tsx` owns scene shell and loading/error states.
- `DrinkReceipt.tsx` owns today tickets, confirmation modal, status board, and today log.
- `DrinkActivityFeed.tsx` calls `/api/activity-events?kind=drink`.
- `DrinkTeamGrid.tsx` renders `snapshot.gridData`.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- __tests__/drink-checkin.test.tsx
npm run lint
```

Expected: both pass.

Commit:

```bash
git add lib/drink-store.tsx components/drink-checkin __tests__/drink-checkin.test.tsx
git commit -m "feat: add production drink checkin"
```

## Task 7: Switch `/drink` From Coffee To Drink

**Files:**
- Modify: `components/board/BoardApp.tsx`
- Modify: `components/board/dynamic-tabs.tsx`
- Modify: `components/board/tab-component-loaders.ts`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `__tests__/board-app-dynamic-tabs.test.ts`
- Modify: `__tests__/home-supply-navigation.test.tsx`

- [ ] **Step 1: Write failing tab switch tests**

Update assertions so the dynamic tab loader expects `DynamicDrinkCheckin`, `loadDrinkCheckin`, and loading label `牛马水铺加载中`.

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npm test -- __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx
```

Expected: FAIL because board still references coffee component names.

- [ ] **Step 3: Switch board tab wiring**

Change:

- `DynamicCoffeeCheckin` -> `DynamicDrinkCheckin`
- `loadCoffeeCheckin` -> `loadDrinkCheckin`
- `CoffeeProvider` -> `DrinkProvider`
- Loading text `续命咖啡加载中` -> `牛马水铺加载中`

Keep `AppTab` key as `"coffee"` and route `/drink` for this release.

- [ ] **Step 4: Update navigation label**

In `components/navbar/Navbar.tsx`, change the visible label for the `/drink` tab from `续命咖啡` to `牛马水铺`. Keep the route unchanged.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx __tests__/drink-checkin.test.tsx
npm run lint
```

Expected: all pass.

Commit:

```bash
git add components/board components/navbar __tests__/board-app-dynamic-tabs.test.ts __tests__/home-supply-navigation.test.tsx
git commit -m "feat: switch drink route to water shop"
```

## Task 8: Calendar, Reports, Weekly Summary

**Files:**
- Modify: `lib/calendar-state.ts`
- Modify: `components/calendar/*`
- Modify: `components/report-center/report-data.ts`
- Rename or create: `components/report-center/DrinkReportPanel.tsx`
- Modify: `components/report-center/ReportCenter.tsx`
- Modify: `lib/weekly-report-service.ts`
- Modify: `lib/weekly-report.ts`
- Modify tests: `__tests__/calendar-board.test.tsx`, `__tests__/report-center-data.test.ts`, `__tests__/report-center-component.test.tsx`, `__tests__/weekly-report-service.test.ts`

- [ ] **Step 1: Add failing downstream tests**

Update tests to assert:

- Calendar text uses drink wording while `coffeeCups` compatibility remains available.
- Report data has `drink` stats with totals from `DrinkRecord`.
- Weekly report counts drink records, not coffee records.

- [ ] **Step 2: Run and verify failures**

Run:

```bash
npm test -- __tests__/calendar-board.test.tsx __tests__/report-center-data.test.ts __tests__/report-center-component.test.tsx __tests__/weekly-report-service.test.ts
```

Expected: FAIL because downstream code still queries `coffeeRecord`.

- [ ] **Step 3: Update calendar state**

In `lib/calendar-state.ts`, query `drinkRecords` and compute:

```ts
drinkCups: drinkCupsByDay.get(day) ?? 0,
coffeeCups: drinkCupsByDay.get(day) ?? 0,
```

Keep `coffeeCupTotal` as an alias for one release and add `drinkCupTotal`.

- [ ] **Step 4: Update report center**

Create `DrinkReportPanel.tsx` from `CoffeeReportPanel.tsx` and update copy to `牛马水铺`. In `report-data.ts`, build `drink` from `DrinkSnapshot` and keep `coffee` compatibility only when existing callers still require it.

- [ ] **Step 5: Update weekly report**

Change `lib/weekly-report-service.ts` to query `client.drinkRecord.findMany` and change summary copy from coffee to drink.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npm test -- __tests__/calendar-board.test.tsx __tests__/report-center-data.test.ts __tests__/report-center-component.test.tsx __tests__/weekly-report-service.test.ts
npm run lint
```

Expected: all pass.

Commit:

```bash
git add lib/calendar-state.ts components/calendar components/report-center lib/weekly-report-service.ts lib/weekly-report.ts __tests__/calendar-board.test.tsx __tests__/report-center-data.test.ts __tests__/report-center-component.test.tsx __tests__/weekly-report-service.test.ts
git commit -m "feat: migrate reports to drink records"
```

## Task 9: Final Verification And Production Rehearsal

**Files:**
- Modify if needed: docs or tests only.

- [ ] **Step 1: Run focused tests serially**

Run each command separately:

```bash
npm test -- __tests__/drink-state.test.ts
npm test -- __tests__/drink-api.test.ts __tests__/drink-api-helpers.test.ts
npm test -- __tests__/drink-checkin.test.tsx
npm test -- __tests__/calendar-board.test.tsx __tests__/report-center-data.test.ts __tests__/weekly-report-service.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run full verification serially**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all pass. If a command fails with Prisma/Next output collision text such as `EEXIST`, rerun that command serially after ensuring no other verification command is active.

- [ ] **Step 3: Rehearse database upgrade on a production-shaped SQLite copy**

Use a copied database, not the live production DB:

```bash
npx prisma db push
npx tsx scripts/backfill-drink-records-from-coffee.ts
npx tsx scripts/verify-drink-record-backfill.ts
```

Expected: schema push succeeds, backfill reports created/skipped counts, verification prints matching coffee and drink counts.

- [ ] **Step 4: Browser smoke test**

Start dev server:

```bash
npm run dev -- --port 3002
```

Open `/drink` and verify:

- Nav label shows `牛马水铺`.
- Clicking water `+` opens confirmation ticket.
- Edited note appears in today log after confirmation.
- Calendar refreshes after mutation.
- `/report` still loads after the drink provider fetches state.

- [ ] **Step 5: Commit final adjustments**

If verification required small fixes:

```bash
git add <fixed-files>
git commit -m "fix: stabilize drink upgrade"
```

If no fixes were needed, do not create an empty commit.

## Production Release Notes

Use this order for production:

```text
stop PM2 -> backup DB -> update code -> npm install -> npx prisma generate -> npx prisma db push -> backfill -> verify backfill -> npm run build -> restart PM2 -> smoke test
```

Do not run seed scripts against production. Keep `CoffeeRecord` in the database for rollback.

## Plan Self-Review

- Spec coverage: schema, migration, API, store, UI, calendar, report, weekly summary, activity events, compatibility, tests, and production rehearsal are each mapped to a task.
- Unfinished-marker scan: the plan has no unresolved implementation slots.
- Type consistency: `DrinkType`, `DrinkSnapshot`, `DrinkRecord`, `DrinkProvider`, and `/api/drinks/*` names are used consistently across tasks.
