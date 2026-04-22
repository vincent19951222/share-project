# Economy And Season System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add season-aware economy rules so daily punch rewards increase personal assets by streak, the punch board shows a segmented season progress bar plus team vault total, and admins can start or end seasons from a dedicated management page.

**Architecture:** Keep the existing `User.coins` column as the persisted personal asset balance for now, and layer the new rules on top with `currentStreak`, `lastPunchDayKey`, `Season`, and `SeasonMemberStat`. Reuse the existing server snapshot flow by making `buildBoardSnapshotForUser()` season-aware, then drive both the punch board UI and admin page from small focused services instead of spreading season logic across route handlers and components.

**Tech Stack:** Next.js 15 App Router route handlers and server pages, Prisma 7 + SQLite, React 19 client components, TypeScript, Vitest + jsdom.

---

## File Structure

- Create: `lib/economy.ts`
  - Pure helpers for Shanghai day keys, streak transitions, reward lookup, and allowed target slot validation.
- Create: `lib/season-theme.ts`
  - Fixed month palettes, empty-slot colors, and the five member contribution colors per month.
- Create: `__tests__/economy-rules.test.ts`
  - Unit coverage for streak rewards, reset rules, Shanghai day key formatting, and allowed slot tiers.
- Create: `__tests__/season-theme.test.ts`
  - Unit coverage for month palette lookup and fixed five-color contribution sets.
- Modify: `prisma/schema.prisma`
  - Add admin/streak fields to `User`.
  - Add `Season` and `SeasonMemberStat`.
  - Extend `PunchRecord` with season-aware settlement fields and a full-date uniqueness key.
- Modify: `lib/db-seed.ts`
  - Seed one admin user, clear season data, and keep seeded personal assets deterministic.
- Modify: `__tests__/seed.test.ts`
  - Assert admin role, streak defaults, and empty season tables after seeding.
- Modify: `lib/types.ts`
  - Replace the old `teamCoins / targetCoins` snapshot contract with `teamVaultTotal`, `currentUser`, and `activeSeason`.
- Modify: `lib/board-state.ts`
  - Build the season-aware board snapshot and keep the existing 30-day punch heatmap.
- Modify: `app/api/board/punch/route.ts`
  - Settle streak rewards into personal assets and optional season stats.
- Modify: `__tests__/board-state.test.ts`
  - Cover vault total, current user summary, and active season contribution ordering.
- Modify: `__tests__/board-state-api.test.ts`
  - Assert the new snapshot fields.
- Modify: `__tests__/board-punch-api.test.ts`
  - Cover no-season punches, active-season punches, full-bar punches, and duplicate protection.
- Create: `lib/session.ts`
  - Small shared auth helpers for route handlers and server pages.
- Create: `lib/season-service.ts`
  - Create, end, and list seasons in one reusable place.
- Create: `app/api/admin/seasons/route.ts`
  - Admin-only season creation endpoint.
- Create: `app/api/admin/seasons/current/route.ts`
  - Admin-only “end active season” endpoint.
- Create: `__tests__/admin-seasons-api.test.ts`
  - Route coverage for admin auth, goal-name validation, slot-tier validation, create, and end flows.
- Create: `app/(board)/admin/page.tsx`
  - Admin-only season settings page inside the authenticated board route group.
- Create: `components/admin/SeasonAdminPanel.tsx`
  - Client panel for creating and ending seasons and viewing season history.
- Create: `__tests__/season-admin-panel.test.tsx`
  - Component coverage for create form rendering, active season state, and history rendering.
- Create: `components/punch-board/SeasonProgressBar.tsx`
  - Single-line fixed-width segmented season progress bar with equal-width cells for all slot tiers.
- Create: `__tests__/season-progress-bar.test.tsx`
  - Coverage for the segmented grid template and filled vs empty slot rendering.
- Modify: `components/punch-board/TeamHeader.tsx`
  - Show “牛马金库” as the team vault total, the new progress bar, and current-user “我的银子 / streak” info.
- Modify: `components/navbar/ProfileDropdown.tsx`
  - Replace the hard-coded asset mock with real “我的银子 / 连续打卡” values and add the admin “赛季设置” entry point.
- Modify: `components/report-center/report-data.ts`
  - Stop treating the vault as a target progress bar; report the team vault total plus a season helper line instead.
- Modify: `components/report-center/ReportHeader.tsx`
  - Render the updated vault and season summary semantics.
- Modify: `__tests__/report-center-data.test.ts`
  - Update fixtures to the new board state shape and the new report header data contract.
- Modify: `__tests__/report-center-component.test.tsx`
  - Update rendered expectations for the new report header.
- Modify: `__tests__/board-provider-sync.test.tsx`
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
- Modify: `__tests__/shared-board-polling.test.tsx`
- Modify: `__tests__/shared-board-errors.test.tsx`
  - Update board state fixtures to the new snapshot shape where required.

## Implementation Rules

- Keep `User.coins` as the persisted personal asset column in this plan. The UI calls it “我的银子”, but do not fold a database rename into this feature.
- Keep the existing 30-day punch heatmap. The new season system sits alongside it; it does not replace it.
- Use `Asia/Shanghai` for all daily settlement and season month-key calculations.
- Each effective punch increases team season progress by exactly one slot. Streak rewards must never add multiple season slots.
- A full season bar stays visually full while `seasonIncome` and personal assets continue to grow.
- The season target slot count must be one of `50 / 80 / 100 / 120 / 150`. Reject custom values.
- The first seeded user (`li`) becomes the admin for tests and local development.

---

### Task 1: Add Pure Economy And Theme Helpers

**Files:**
- Create: `lib/economy.ts`
- Create: `lib/season-theme.ts`
- Create: `__tests__/economy-rules.test.ts`
- Create: `__tests__/season-theme.test.ts`

- [ ] **Step 1: Write the failing economy helper tests**

Create `__tests__/economy-rules.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  ALLOWED_TARGET_SLOTS,
  getNextPunchStreak,
  getNextPunchRewardPreview,
  getPunchRewardForStreak,
  getShanghaiDayKey,
  isValidTargetSlots,
} from "@/lib/economy";

describe("economy helpers", () => {
  it("maps streak rewards to 10/20/30/40/50 and caps at 50", () => {
    expect(getPunchRewardForStreak(1)).toBe(10);
    expect(getPunchRewardForStreak(2)).toBe(20);
    expect(getPunchRewardForStreak(3)).toBe(30);
    expect(getPunchRewardForStreak(4)).toBe(40);
    expect(getPunchRewardForStreak(5)).toBe(50);
    expect(getPunchRewardForStreak(9)).toBe(50);
  });

  it("continues streaks only when the previous punch happened yesterday in Shanghai time", () => {
    expect(getNextPunchStreak(0, null, "2026-04-24")).toBe(1);
    expect(getNextPunchStreak(3, "2026-04-23", "2026-04-24")).toBe(4);
    expect(getNextPunchStreak(3, "2026-04-22", "2026-04-24")).toBe(1);
  });

  it("derives the next reward preview from the next streak state", () => {
    expect(getNextPunchRewardPreview(0, null, "2026-04-24")).toBe(10);
    expect(getNextPunchRewardPreview(4, "2026-04-23", "2026-04-24")).toBe(50);
    expect(getNextPunchRewardPreview(4, "2026-04-22", "2026-04-24")).toBe(10);
  });

  it("formats a Shanghai day key in yyyy-mm-dd", () => {
    expect(getShanghaiDayKey(new Date("2026-04-23T18:10:00Z"))).toBe("2026-04-24");
  });

  it("accepts only the fixed season target slot tiers", () => {
    expect(ALLOWED_TARGET_SLOTS).toEqual([50, 80, 100, 120, 150]);
    expect(isValidTargetSlots(80)).toBe(true);
    expect(isValidTargetSlots(77)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the economy helper tests to verify they fail**

Run:

```bash
npm test -- __tests__/economy-rules.test.ts
```

Expected: FAIL because `@/lib/economy` does not exist yet.

- [ ] **Step 3: Implement the economy helpers**

Create `lib/economy.ts`:

```typescript
export const ALLOWED_TARGET_SLOTS = [50, 80, 100, 120, 150] as const;

const REWARD_TABLE = [10, 20, 30, 40, 50] as const;

export function getShanghaiDayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function getPunchRewardForStreak(streak: number): number {
  const normalized = Math.max(1, Math.min(streak, REWARD_TABLE.length));
  return REWARD_TABLE[normalized - 1];
}

export function getNextPunchStreak(
  currentStreak: number,
  lastPunchDayKey: string | null,
  todayDayKey: string,
): number {
  if (!lastPunchDayKey) {
    return 1;
  }

  const last = new Date(`${lastPunchDayKey}T00:00:00+08:00`);
  const today = new Date(`${todayDayKey}T00:00:00+08:00`);
  const diffDays = Math.round((today.getTime() - last.getTime()) / 86_400_000);

  return diffDays === 1 ? currentStreak + 1 : 1;
}

export function getNextPunchRewardPreview(
  currentStreak: number,
  lastPunchDayKey: string | null,
  todayDayKey: string,
): number {
  return getPunchRewardForStreak(
    getNextPunchStreak(currentStreak, lastPunchDayKey, todayDayKey),
  );
}

export function isValidTargetSlots(value: number): value is (typeof ALLOWED_TARGET_SLOTS)[number] {
  return ALLOWED_TARGET_SLOTS.includes(value as (typeof ALLOWED_TARGET_SLOTS)[number]);
}
```

- [ ] **Step 4: Re-run the economy helper tests**

Run:

```bash
npm test -- __tests__/economy-rules.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing season theme tests**

Create `__tests__/season-theme.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getSeasonTheme } from "@/lib/season-theme";

describe("season theme palette", () => {
  it("returns a fixed palette for each month with exactly five contribution colors", () => {
    const april = getSeasonTheme(4);
    const december = getSeasonTheme(12);

    expect(april.month).toBe(4);
    expect(april.memberColors).toHaveLength(5);
    expect(april.memberColors[0]).not.toBe(april.emptySlotColor);
    expect(december.month).toBe(12);
    expect(december.memberColors).toHaveLength(5);
  });
});
```

- [ ] **Step 6: Run the season theme tests to verify they fail**

Run:

```bash
npm test -- __tests__/season-theme.test.ts
```

Expected: FAIL because `@/lib/season-theme` does not exist yet.

- [ ] **Step 7: Implement the month theme helper**

Create `lib/season-theme.ts`:

```typescript
export interface SeasonTheme {
  month: number;
  panelBackground: string;
  accentColor: string;
  emptySlotColor: string;
  memberColors: [string, string, string, string, string];
}

const THEMES: Record<number, SeasonTheme> = {
  1: { month: 1, panelBackground: "#fff1f2", accentColor: "#e11d48", emptySlotColor: "#fecdd3", memberColors: ["#be123c", "#e11d48", "#fb7185", "#f97316", "#fb923c"] },
  2: { month: 2, panelBackground: "#fff7ed", accentColor: "#ea580c", emptySlotColor: "#fed7aa", memberColors: ["#c2410c", "#ea580c", "#fb923c", "#f97316", "#facc15"] },
  3: { month: 3, panelBackground: "#f7fee7", accentColor: "#65a30d", emptySlotColor: "#d9f99d", memberColors: ["#4d7c0f", "#65a30d", "#84cc16", "#22c55e", "#16a34a"] },
  4: { month: 4, panelBackground: "#fffbeb", accentColor: "#d97706", emptySlotColor: "#fde68a", memberColors: ["#b45309", "#d97706", "#f59e0b", "#f97316", "#ef4444"] },
  5: { month: 5, panelBackground: "#ecfeff", accentColor: "#0891b2", emptySlotColor: "#a5f3fc", memberColors: ["#155e75", "#0891b2", "#06b6d4", "#14b8a6", "#0f766e"] },
  6: { month: 6, panelBackground: "#eff6ff", accentColor: "#2563eb", emptySlotColor: "#bfdbfe", memberColors: ["#1d4ed8", "#2563eb", "#3b82f6", "#0ea5e9", "#0284c7"] },
  7: { month: 7, panelBackground: "#eef2ff", accentColor: "#4f46e5", emptySlotColor: "#c7d2fe", memberColors: ["#3730a3", "#4f46e5", "#6366f1", "#8b5cf6", "#7c3aed"] },
  8: { month: 8, panelBackground: "#faf5ff", accentColor: "#9333ea", emptySlotColor: "#e9d5ff", memberColors: ["#7e22ce", "#9333ea", "#a855f7", "#c084fc", "#ec4899"] },
  9: { month: 9, panelBackground: "#fff1f2", accentColor: "#db2777", emptySlotColor: "#fbcfe8", memberColors: ["#be185d", "#db2777", "#ec4899", "#f43f5e", "#fb7185"] },
  10: { month: 10, panelBackground: "#fff7ed", accentColor: "#c2410c", emptySlotColor: "#fdba74", memberColors: ["#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c"] },
  11: { month: 11, panelBackground: "#f8fafc", accentColor: "#475569", emptySlotColor: "#cbd5e1", memberColors: ["#334155", "#475569", "#64748b", "#0f766e", "#0284c7"] },
  12: { month: 12, panelBackground: "#ecfeff", accentColor: "#0f766e", emptySlotColor: "#99f6e4", memberColors: ["#115e59", "#0f766e", "#14b8a6", "#06b6d4", "#0ea5e9"] },
};

export function getSeasonTheme(month: number): SeasonTheme {
  return THEMES[month] ?? THEMES[1];
}
```

- [ ] **Step 8: Re-run the season theme tests**

Run:

```bash
npm test -- __tests__/season-theme.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/economy.ts lib/season-theme.ts __tests__/economy-rules.test.ts __tests__/season-theme.test.ts
git commit -m "feat: add season economy helpers"
```

### Task 2: Extend Prisma And Seed Data For Seasons

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Modify: `__tests__/seed.test.ts`

- [ ] **Step 1: Write the failing seed coverage for admin and season defaults**

Update `__tests__/seed.test.ts` by adding this test near the existing seed assertions:

```typescript
it("should mark the first seeded user as admin and clear season tables", async () => {
  await prisma.seasonMemberStat.deleteMany();
  await prisma.season.deleteMany();

  await seedDatabase();

  const users = await prisma.user.findMany({
    where: { username: { in: SEED_USERS.map((user) => user.username) } },
    orderBy: { createdAt: "asc" },
  });

  expect(users[0]?.role).toBe("ADMIN");
  expect(users.slice(1).every((user) => user.role === "MEMBER")).toBe(true);
  expect(users.every((user) => user.currentStreak === 0)).toBe(true);
  expect(users.every((user) => user.lastPunchDayKey === null)).toBe(true);
  expect(await prisma.season.count()).toBe(0);
  expect(await prisma.seasonMemberStat.count()).toBe(0);
});
```

- [ ] **Step 2: Run the seed test to verify it fails**

Run:

```bash
npm test -- __tests__/seed.test.ts
```

Expected: FAIL because the new Prisma fields and season tables do not exist yet.

- [ ] **Step 3: Update the Prisma schema**

Update `prisma/schema.prisma`:

```prisma
model Team {
  id         String      @id @default(cuid())
  name       String
  code       String      @unique
  createdAt  DateTime    @default(now())
  users      User[]
  seasons    Season[]
  boardNotes BoardNote[]
}

model User {
  id              String             @id @default(cuid())
  username        String             @unique
  password        String
  avatarKey       String
  coins           Int                @default(0)
  role            String             @default("MEMBER")
  currentStreak   Int                @default(0)
  lastPunchDayKey String?
  teamId          String
  team            Team               @relation(fields: [teamId], references: [id])
  punchRecords    PunchRecord[]
  seasonStats     SeasonMemberStat[]
  boardNotes      BoardNote[]
  createdAt       DateTime           @default(now())
}

model Season {
  id          String             @id @default(cuid())
  teamId      String
  team        Team               @relation(fields: [teamId], references: [id])
  monthKey    String
  goalName    String
  status      String             @default("ACTIVE")
  targetSlots Int
  filledSlots Int                @default(0)
  startedAt   DateTime           @default(now())
  endedAt     DateTime?
  memberStats SeasonMemberStat[]
  punches     PunchRecord[]

  @@index([teamId, status, startedAt])
}

model SeasonMemberStat {
  id                  String    @id @default(cuid())
  seasonId            String
  season              Season    @relation(fields: [seasonId], references: [id])
  userId              String
  user                User      @relation(fields: [userId], references: [id])
  seasonIncome        Int       @default(0)
  slotContribution    Int       @default(0)
  colorIndex          Int
  memberOrder         Int
  firstContributionAt DateTime?

  @@unique([seasonId, userId])
  @@index([seasonId, slotContribution, memberOrder])
}

model PunchRecord {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id])
  seasonId             String?
  season               Season?  @relation(fields: [seasonId], references: [id])
  dayKey               String
  dayIndex             Int
  punched              Boolean
  punchType            String?
  streakAfterPunch     Int      @default(0)
  assetAwarded         Int      @default(0)
  countedForSeasonSlot Boolean  @default(false)
  createdAt            DateTime @default(now())

  @@unique([userId, dayKey])
}
```

- [ ] **Step 4: Push the schema and regenerate Prisma**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: both commands succeed and the generated Prisma client now includes `Season`, `SeasonMemberStat`, and the new user/punch fields.

- [ ] **Step 5: Update seed logic and the rest of the seed test assertions**

Update `lib/db-seed.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { hashPassword } from "./auth";

export const SEED_TEAM = {
  code: "ROOM-88",
  name: "晓风战队",
};

export const SEED_USERS = [
  { username: "li", avatarKey: "male1", coins: 10, role: "ADMIN" },
  { username: "luo", avatarKey: "male2", coins: 10, role: "MEMBER" },
  { username: "liu", avatarKey: "female1", coins: 10, role: "MEMBER" },
  { username: "wu", avatarKey: "male3", coins: 10, role: "MEMBER" },
  { username: "ji", avatarKey: "female2", coins: 10, role: "MEMBER" },
];

export const SEED_PUNCH_DAY = 22;
export const SEED_PUNCH_DAY_KEY = "2026-04-22";
export const SEED_PUNCH_CREATED_AT = new Date("2026-04-22T00:00:00+08:00");

export async function seedDatabase(): Promise<void> {
  const passwordHash = await hashPassword("0000");

  const team = await prisma.team.upsert({
    where: { code: SEED_TEAM.code },
    update: { name: SEED_TEAM.name },
    create: { code: SEED_TEAM.code, name: SEED_TEAM.name },
  });

  const seededUsernames = new Set(SEED_USERS.map((user) => user.username));
  const seededUserIds: string[] = [];

  await prisma.seasonMemberStat.deleteMany();
  await prisma.season.deleteMany();

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        avatarKey: seedUser.avatarKey,
        coins: seedUser.coins,
        password: passwordHash,
        teamId: team.id,
        role: seedUser.role,
        currentStreak: 0,
        lastPunchDayKey: null,
      },
      create: {
        username: seedUser.username,
        password: passwordHash,
        avatarKey: seedUser.avatarKey,
        coins: seedUser.coins,
        teamId: team.id,
        role: seedUser.role,
        currentStreak: 0,
        lastPunchDayKey: null,
      },
    });
    seededUserIds.push(user.id);
  }

  await prisma.punchRecord.deleteMany({
    where: { userId: { in: seededUserIds } },
  });

  await prisma.punchRecord.createMany({
    data: seededUserIds.map((userId) => ({
      userId,
      dayKey: SEED_PUNCH_DAY_KEY,
      dayIndex: SEED_PUNCH_DAY,
      punched: true,
      punchType: "default",
      createdAt: SEED_PUNCH_CREATED_AT,
      streakAfterPunch: 1,
      assetAwarded: 10,
      countedForSeasonSlot: false,
    })),
  });

  await prisma.boardNote.deleteMany({
    where: {
      authorId: { in: seededUserIds },
    },
  });

  await prisma.user.updateMany({
    where: { id: { in: seededUserIds } },
    data: {
      coins: 10,
      currentStreak: 0,
      lastPunchDayKey: null,
    },
  });

  const extraUsers = await prisma.user.findMany({
    where: {
      teamId: team.id,
      username: { notIn: Array.from(seededUsernames) },
    },
    select: { id: true },
  });

  if (extraUsers.length > 0) {
    const extraUserIds = extraUsers.map((user) => user.id);
    await prisma.boardNote.deleteMany({ where: { authorId: { in: extraUserIds } } });
    await prisma.punchRecord.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
  }
}
```

Also update the existing coin assertions in `__tests__/seed.test.ts` to include the new role/streak fields:

```typescript
expect(user!.avatarKey).toBe(seedUser.avatarKey);
expect(user!.coins).toBe(seedUser.coins);
expect(user!.role).toBe(seedUser.role);
expect(user!.currentStreak).toBe(0);
expect(user!.lastPunchDayKey).toBeNull();
```

And update the punch assertion block:

```typescript
expect(user!.punchRecords[0]).toMatchObject({
  dayKey: "2026-04-22",
  dayIndex: 22,
  punched: true,
  punchType: "default",
  streakAfterPunch: 1,
  assetAwarded: 10,
  countedForSeasonSlot: false,
});
```

- [ ] **Step 6: Re-run the seed test**

Run:

```bash
npm test -- __tests__/seed.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/db-seed.ts __tests__/seed.test.ts
git commit -m "feat: add season persistence models"
```

### Task 3: Make Board State And Punch Settlement Season-Aware

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/board-state.ts`
- Modify: `app/api/board/punch/route.ts`
- Modify: `__tests__/board-state.test.ts`
- Modify: `__tests__/board-state-api.test.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Rewrite the board-state tests around the new snapshot contract**

Replace `__tests__/board-state.test.ts` with:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { BOARD_TOTAL_DAYS, buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";

describe("board-state", () => {
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: "li" },
      select: { id: true, teamId: true },
    });
    userId = user.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("builds the current user summary and team vault without an active season", async () => {
    const snapshot = await buildBoardSnapshotForUser(
      userId,
      new Date("2026-04-18T09:00:00+08:00"),
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot!.currentUserId).toBe(userId);
    expect(snapshot!.members).toHaveLength(5);
    expect(snapshot!.teamVaultTotal).toBe(50);
    expect(snapshot!.currentUser).toMatchObject({
      assetBalance: 10,
      currentStreak: 0,
      nextReward: 10,
      isAdmin: true,
      seasonIncome: 0,
    });
    expect(snapshot!.activeSeason).toBeNull();
  });

  it("includes the active season goal and contribution ordering", async () => {
    const users = await prisma.user.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
    });

    await prisma.season.create({
      data: {
        teamId,
        monthKey: "2026-04",
        goalName: "五月掉脂挑战",
        targetSlots: 50,
        filledSlots: 3,
        memberStats: {
          create: users.map((user, index) => ({
            userId: user.id,
            seasonIncome: index === 0 ? 30 : index === 1 ? 20 : 0,
            slotContribution: index === 0 ? 2 : index === 1 ? 1 : 0,
            colorIndex: index,
            memberOrder: index,
            firstContributionAt:
              index < 2 ? new Date(`2026-04-2${index + 1}T09:00:00+08:00`) : null,
          })),
        },
      },
    });

    const snapshot = await buildBoardSnapshotForUser(
      userId,
      new Date("2026-04-24T09:00:00+08:00"),
    );

    expect(snapshot!.activeSeason).toMatchObject({
      goalName: "五月掉脂挑战",
      targetSlots: 50,
      filledSlots: 3,
    });
    expect(snapshot!.activeSeason!.contributions.map((item) => [item.name, item.slotContribution])).toEqual([
      ["li", 2],
      ["luo", 1],
      ["liu", 0],
      ["wu", 0],
      ["ji", 0],
    ]);
  });

  it("derives the current board day in Asia/Shanghai and clamps to total days", () => {
    expect(getCurrentBoardDay(new Date("2026-04-05T01:00:00Z"))).toBe(5);
    expect(getCurrentBoardDay(new Date("2026-05-30T20:00:00Z"))).toBe(BOARD_TOTAL_DAYS);
  });
});
```

- [ ] **Step 2: Rewrite the punch route tests around streak and season behavior**

Replace `__tests__/board-punch-api.test.ts` with:

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("POST /api/board/punch", () => {
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T09:00:00+08:00"));
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: "li" },
      select: { id: true, teamId: true },
    });
    userId = user.id;
    teamId = user.teamId;
  });

  beforeEach(async () => {
    await prisma.seasonMemberStat.deleteMany();
    await prisma.season.deleteMany();
    await prisma.punchRecord.deleteMany({ where: { userId, dayKey: "2026-04-24" } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 10,
        currentStreak: 0,
        lastPunchDayKey: null,
      },
    });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("adds only personal assets when no active season exists", async () => {
    const response = await POST(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(user.coins).toBe(20);
    expect(user.currentStreak).toBe(1);
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: 20,
      currentStreak: 1,
      nextReward: 20,
      seasonIncome: 0,
    });
    expect(body.snapshot.activeSeason).toBeNull();
  });

  it("adds season income and one slot contribution when a season is active", async () => {
    const users = await prisma.user.findMany({ where: { teamId }, orderBy: { createdAt: "asc" } });
    const season = await prisma.season.create({
      data: {
        teamId,
        monthKey: "2026-04",
        goalName: "五月掉脂挑战",
        targetSlots: 50,
        memberStats: {
          create: users.map((user, index) => ({
            userId: user.id,
            colorIndex: index,
            memberOrder: index,
          })),
        },
      },
    });

    const response = await POST(request(userId));
    expect(response.status).toBe(200);

    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });
    const refreshedSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });

    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(1);
    expect(refreshedSeason.filledSlots).toBe(1);
  });

  it("keeps season income growing after the bar is full but stops slot growth", async () => {
    const users = await prisma.user.findMany({ where: { teamId }, orderBy: { createdAt: "asc" } });
    const season = await prisma.season.create({
      data: {
        teamId,
        monthKey: "2026-04",
        goalName: "月底封神",
        targetSlots: 50,
        filledSlots: 50,
        memberStats: {
          create: users.map((user, index) => ({
            userId: user.id,
            colorIndex: index,
            memberOrder: index,
            slotContribution: index === 0 ? 20 : 0,
            seasonIncome: index === 0 ? 200 : 0,
            firstContributionAt: index === 0 ? new Date("2026-04-23T09:00:00+08:00") : null,
          })),
        },
      },
    });

    const response = await POST(request(userId));
    expect(response.status).toBe(200);

    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });
    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: "2026-04-24" } },
    });

    expect(stat.seasonIncome).toBe(210);
    expect(stat.slotContribution).toBe(20);
    expect(punch.countedForSeasonSlot).toBe(false);
  });

  it("rejects a second punch on the same Shanghai day", async () => {
    await POST(request(userId));
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
    expect(response.status).toBe(409);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.coins).toBe(before.coins);
  });
});
```

- [ ] **Step 3: Run the board-state and punch tests to verify they fail**

Run:

```bash
npm test -- __tests__/board-state.test.ts __tests__/board-punch-api.test.ts __tests__/board-state-api.test.ts
```

Expected: FAIL because the board snapshot types and the punch route do not expose the new season-aware fields yet.

- [ ] **Step 4: Replace the board snapshot contract**

Update `lib/types.ts`:

```typescript
export interface Member {
  id: string;
  name: string;
  avatarKey: string;
  assetBalance: number;
  seasonIncome: number;
  slotContribution: number;
}

export type CellStatus = boolean | null;

export interface ActivityLog {
  id: string;
  text: string;
  type: "system" | "success" | "alert" | "highlight";
  timestamp: Date;
}

export interface CurrentUserSnapshot {
  assetBalance: number;
  currentStreak: number;
  nextReward: number;
  seasonIncome: number;
  isAdmin: boolean;
}

export interface SeasonContributionSnapshot {
  userId: string;
  name: string;
  avatarKey: string;
  colorIndex: number;
  slotContribution: number;
  seasonIncome: number;
}

export interface ActiveSeasonSnapshot {
  id: string;
  monthKey: string;
  goalName: string;
  targetSlots: number;
  filledSlots: number;
  contributions: SeasonContributionSnapshot[];
}

export interface BoardSnapshot {
  members: Member[];
  gridData: CellStatus[][];
  teamVaultTotal: number;
  today: number;
  totalDays: number;
  currentUserId: string;
  currentUser: CurrentUserSnapshot;
  activeSeason: ActiveSeasonSnapshot | null;
}

export interface BoardState extends BoardSnapshot {
  logs: ActivityLog[];
  activeTab: "punch" | "board" | "dash";
  lastAppliedPollRequestId?: number;
  pendingPunchEpoch?: number;
  latestSettledPunchEpoch?: number;
}

export type BoardAction =
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: "punch" | "board" | "dash" }
  | { type: "BEGIN_PUNCH_SYNC"; punchEpoch: number }
  | { type: "END_PUNCH_SYNC"; punchEpoch: number }
  | {
      type: "SYNC_REMOTE_STATE";
      snapshot: BoardSnapshot;
      source: "poll";
      requestId: number;
      pendingPunchEpochAtStart: number;
      settledPunchEpochAtStart: number;
    }
  | {
      type: "SYNC_REMOTE_STATE";
      snapshot: BoardSnapshot;
      source: "punch";
      punchEpoch: number;
    };
```

- [ ] **Step 5: Implement the season-aware snapshot builder**

Update `lib/board-state.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { getNextPunchRewardPreview, getShanghaiDayKey } from "@/lib/economy";
import type {
  ActiveSeasonSnapshot,
  BoardSnapshot,
  CellStatus,
  Member,
  SeasonContributionSnapshot,
} from "@/lib/types";

export const BOARD_TOTAL_DAYS = 30;

function getMonthKey(now: Date): string {
  return getShanghaiDayKey(now).slice(0, 7);
}

function getDayOfMonth(now: Date): number {
  return Number(getShanghaiDayKey(now).slice(8, 10));
}

export function getCurrentBoardDay(now: Date = new Date()): number {
  return Math.max(1, Math.min(getDayOfMonth(now), BOARD_TOTAL_DAYS));
}

interface SortableSeasonContribution extends SeasonContributionSnapshot {
  firstContributionAt: string | null;
  memberOrder: number;
}

function sortSeasonContributions(
  items: SortableSeasonContribution[],
): SortableSeasonContribution[] {
  return [...items].sort((left, right) => {
    if (right.slotContribution !== left.slotContribution) {
      return right.slotContribution - left.slotContribution;
    }

    const leftTime = left.firstContributionAt ? new Date(left.firstContributionAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.firstContributionAt ? new Date(right.firstContributionAt).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.memberOrder - right.memberOrder;
  });
}

export async function buildBoardSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<BoardSnapshot | null> {
  const monthKey = getMonthKey(now);
  const monthPrefix = `${monthKey}-`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            include: {
              punchRecords: {
                where: { dayKey: { startsWith: monthPrefix } },
                orderBy: { dayKey: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          seasons: {
            where: { status: "ACTIVE" },
            include: {
              memberStats: {
                include: { user: true },
                orderBy: [{ slotContribution: "desc" }, { memberOrder: "asc" }],
              },
            },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const today = getCurrentBoardDay(now);
  const activeSeason = user.team.seasons[0] ?? null;
  const activeStatsByUserId = new Map(
    (activeSeason?.memberStats ?? []).map((item) => [item.userId, item]),
  );

  const members: Member[] = user.team.users.map((member) => {
    const seasonStat = activeStatsByUserId.get(member.id);
    return {
      id: member.id,
      name: member.username,
      avatarKey: member.avatarKey,
      assetBalance: member.coins,
      seasonIncome: seasonStat?.seasonIncome ?? 0,
      slotContribution: seasonStat?.slotContribution ?? 0,
    };
  });

  const gridData: CellStatus[][] = user.team.users.map((member) => {
    return Array.from({ length: BOARD_TOTAL_DAYS }, (_, index) => {
      const dayIndex = index + 1;

      if (dayIndex > today) {
        return null;
      }

      const record = member.punchRecords.find((item) => item.dayIndex === dayIndex);
      return record ? record.punched : false;
    });
  });

  const currentUserSeasonIncome = activeStatsByUserId.get(user.id)?.seasonIncome ?? 0;

  let seasonSnapshot: ActiveSeasonSnapshot | null = null;
  if (activeSeason) {
    const rawContributions = activeSeason.memberStats.map((item) => ({
      userId: item.userId,
      name: item.user.username,
      avatarKey: item.user.avatarKey,
      colorIndex: item.colorIndex,
      slotContribution: item.slotContribution,
      seasonIncome: item.seasonIncome,
      firstContributionAt: item.firstContributionAt?.toISOString() ?? null,
      memberOrder: item.memberOrder,
    }));

    const contributions = sortSeasonContributions(rawContributions).map(
      ({ firstContributionAt: _firstContributionAt, memberOrder: _memberOrder, ...rest }) => rest,
    );

    seasonSnapshot = {
      id: activeSeason.id,
      monthKey: activeSeason.monthKey,
      goalName: activeSeason.goalName,
      targetSlots: activeSeason.targetSlots,
      filledSlots: activeSeason.filledSlots,
      contributions,
    };
  }

  return {
    members,
    gridData,
    teamVaultTotal: user.team.users.reduce((sum, member) => sum + member.coins, 0),
    today,
    totalDays: BOARD_TOTAL_DAYS,
    currentUserId: user.id,
    currentUser: {
      assetBalance: user.coins,
      currentStreak: user.currentStreak,
      nextReward: getNextPunchRewardPreview(
        user.currentStreak,
        user.lastPunchDayKey,
        getShanghaiDayKey(now),
      ),
      seasonIncome: currentUserSeasonIncome,
      isAdmin: user.role === "ADMIN",
    },
    activeSeason: seasonSnapshot,
  };
}
```

- [ ] **Step 6: Implement streak-aware punch settlement**

Update `app/api/board/punch/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getNextPunchStreak,
  getPunchRewardForStreak,
  getShanghaiDayKey,
} from "@/lib/economy";
import { buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        teamId: true,
        coins: true,
        currentStreak: true,
        lastPunchDayKey: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const now = new Date();
    const dayKey = getShanghaiDayKey(now);
    const dayIndex = getCurrentBoardDay(now);
    const nextStreak = getNextPunchStreak(user.currentStreak, user.lastPunchDayKey, dayKey);
    const reward = getPunchRewardForStreak(nextStreak);

    try {
      await prisma.$transaction(async (tx) => {
        const activeSeason = await tx.season.findFirst({
          where: { teamId: user.teamId, status: "ACTIVE" },
          include: {
            memberStats: {
              where: { userId: user.id },
            },
          },
          orderBy: { startedAt: "desc" },
        });

        const countedForSeasonSlot =
          !!activeSeason && activeSeason.filledSlots < activeSeason.targetSlots;

        await tx.punchRecord.create({
          data: {
            userId: user.id,
            seasonId: activeSeason?.id ?? null,
            dayKey,
            dayIndex,
            punched: true,
            punchType: "default",
            streakAfterPunch: nextStreak,
            assetAwarded: reward,
            countedForSeasonSlot,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            coins: {
              increment: reward,
            },
            currentStreak: nextStreak,
            lastPunchDayKey: dayKey,
          },
        });

        if (activeSeason) {
          await tx.seasonMemberStat.update({
            where: {
              seasonId_userId: {
                seasonId: activeSeason.id,
                userId: user.id,
              },
            },
            data: {
              seasonIncome: { increment: reward },
              slotContribution: countedForSeasonSlot ? { increment: 1 } : undefined,
              firstContributionAt:
                countedForSeasonSlot && activeSeason.memberStats[0]?.firstContributionAt == null
                  ? now
                  : undefined,
            },
          });

          if (countedForSeasonSlot) {
            await tx.season.update({
              where: { id: activeSeason.id },
              data: {
                filledSlots: { increment: 1 },
              },
            });
          }
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ error: "今天已经打过卡了" }, { status: 409 });
      }

      throw error;
    }

    const snapshot = await buildBoardSnapshotForUser(user.id, now);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

No code changes are required in `app/api/board/state/route.ts`; it can keep returning `buildBoardSnapshotForUser(userId)` unchanged because the snapshot builder now owns the new contract.

Also update `__tests__/board-state-api.test.ts` expectations:

```typescript
expect(body.snapshot.teamVaultTotal).toBeGreaterThan(0);
expect(body.snapshot.currentUser).toMatchObject({
  assetBalance: 10,
  currentStreak: 0,
  nextReward: 10,
});
expect(body.snapshot.activeSeason).toBeNull();
```

- [ ] **Step 7: Re-run the board-state and punch tests**

Run:

```bash
npm test -- __tests__/board-state.test.ts __tests__/board-punch-api.test.ts __tests__/board-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/board-state.ts app/api/board/punch/route.ts __tests__/board-state.test.ts __tests__/board-state-api.test.ts __tests__/board-punch-api.test.ts
git commit -m "feat: add season-aware punch settlement"
```

### Task 4: Add Admin Season Services And Routes

**Files:**
- Create: `lib/session.ts`
- Create: `lib/season-service.ts`
- Create: `app/api/admin/seasons/route.ts`
- Create: `app/api/admin/seasons/current/route.ts`
- Create: `__tests__/admin-seasons-api.test.ts`

- [ ] **Step 1: Write the failing admin season route tests**

Create `__tests__/admin-seasons-api.test.ts`:

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as GET_SEASONS, POST as POST_SEASONS } from "@/app/api/admin/seasons/route";
import { PATCH as PATCH_CURRENT_SEASON } from "@/app/api/admin/seasons/current/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

function request(method: "GET" | "POST" | "PATCH", userId?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/seasons", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("admin season routes", () => {
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T09:00:00+08:00"));
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: "li" },
      select: { id: true, teamId: true },
    });
    const member = await prisma.user.findUniqueOrThrow({
      where: { username: "luo" },
      select: { id: true },
    });

    adminId = admin.id;
    memberId = member.id;
    teamId = admin.teamId;
  });

  beforeEach(async () => {
    await prisma.seasonMemberStat.deleteMany();
    await prisma.season.deleteMany();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("rejects unauthenticated and non-admin requests", async () => {
    expect((await POST_SEASONS(request("POST"))).status).toBe(401);
    expect(
      (
        await POST_SEASONS(
          request("POST", memberId, { goalName: "五月掉脂挑战", targetSlots: 80 }),
        )
      ).status,
    ).toBe(403);
  });

  it("creates one active season with a goal name and fixed slot tier", async () => {
    const response = await POST_SEASONS(
      request("POST", adminId, { goalName: "五月掉脂挑战", targetSlots: 80 }),
    );

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.season).toMatchObject({
      goalName: "五月掉脂挑战",
      monthKey: "2026-04",
      targetSlots: 80,
      filledSlots: 0,
      status: "ACTIVE",
    });

    expect(await prisma.season.count({ where: { teamId, status: "ACTIVE" } })).toBe(1);
    expect(await prisma.seasonMemberStat.count()).toBe(5);
  });

  it("rejects unsupported custom slot values", async () => {
    const response = await POST_SEASONS(
      request("POST", adminId, { goalName: "非法目标", targetSlots: 77 }),
    );
    expect(response.status).toBe(400);
  });

  it("ends the current season and keeps it in history", async () => {
    await POST_SEASONS(request("POST", adminId, { goalName: "五月掉脂挑战", targetSlots: 50 }));

    const response = await PATCH_CURRENT_SEASON(
      request("PATCH", adminId, { action: "end" }),
    );

    expect(response.status).toBe(200);

    const season = await prisma.season.findFirstOrThrow({
      where: { teamId },
      orderBy: { startedAt: "desc" },
    });

    expect(season.status).toBe("ENDED");
    expect(season.endedAt).not.toBeNull();
  });

  it("lists the current season and history for the admin page", async () => {
    await POST_SEASONS(request("POST", adminId, { goalName: "五月掉脂挑战", targetSlots: 50 }));

    const response = await GET_SEASONS(request("GET", adminId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.current.goalName).toBe("五月掉脂挑战");
    expect(body.history).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the admin route tests to verify they fail**

Run:

```bash
npm test -- __tests__/admin-seasons-api.test.ts
```

Expected: FAIL because the admin routes and shared season/session services do not exist yet.

- [ ] **Step 3: Implement session helpers**

Create `lib/session.ts`:

```typescript
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getUserSessionById(userId: string | undefined | null) {
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      teamId: true,
    },
  });
}

export async function getRequestSession(request: NextRequest) {
  return getUserSessionById(request.cookies.get("userId")?.value);
}

export async function getCookieSession(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  return getUserSessionById(cookieStore.get("userId")?.value);
}
```

- [ ] **Step 4: Implement season services and admin routes**

Create `lib/season-service.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey, isValidTargetSlots } from "@/lib/economy";

function getMonthKey(now: Date): string {
  return getShanghaiDayKey(now).slice(0, 7);
}

export async function listSeasonsForTeam(teamId: string) {
  const seasons = await prisma.season.findMany({
    where: { teamId },
    include: {
      memberStats: {
        include: { user: true },
        orderBy: [{ seasonIncome: "desc" }, { memberOrder: "asc" }],
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const serializeSeason = (season: (typeof seasons)[number]) => ({
    id: season.id,
    goalName: season.goalName,
    monthKey: season.monthKey,
    targetSlots: season.targetSlots,
    filledSlots: season.filledSlots,
    status: season.status,
    startedAt: season.startedAt.toISOString(),
    endedAt: season.endedAt?.toISOString() ?? null,
  });

  const current = seasons.find((season) => season.status === "ACTIVE");

  return {
    current: current ? serializeSeason(current) : null,
    history: seasons.map(serializeSeason),
  };
}

export async function createSeasonForTeam(
  teamId: string,
  goalName: string,
  targetSlots: number,
  now: Date = new Date(),
) {
  if (!goalName.trim()) {
    throw new Error("GOAL_NAME_REQUIRED");
  }

  if (!isValidTargetSlots(targetSlots)) {
    throw new Error("INVALID_TARGET_SLOTS");
  }

  const existing = await prisma.season.findFirst({
    where: { teamId, status: "ACTIVE" },
    select: { id: true },
  });

  if (existing) {
    throw new Error("ACTIVE_SEASON_EXISTS");
  }

  const members = await prisma.user.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
  });

  return prisma.season.create({
    data: {
      teamId,
      monthKey: getMonthKey(now),
      goalName: goalName.trim(),
      targetSlots,
      memberStats: {
        create: members.map((member, index) => ({
          userId: member.id,
          colorIndex: index,
          memberOrder: index,
        })),
      },
    },
    include: {
      memberStats: true,
    },
  });
}

export async function endActiveSeasonForTeam(teamId: string, now: Date = new Date()) {
  const active = await prisma.season.findFirst({
    where: { teamId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!active) {
    throw new Error("NO_ACTIVE_SEASON");
  }

  return prisma.season.update({
    where: { id: active.id },
    data: {
      status: "ENDED",
      endedAt: now,
    },
  });
}
```

Create `app/api/admin/seasons/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSeasonForTeam, listSeasonsForTeam } from "@/lib/season-service";
import { getRequestSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const data = await listSeasonsForTeam(session.teamId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await request.json();

  try {
    const season = await createSeasonForTeam(
      session.teamId,
      body.goalName,
      Number(body.targetSlots),
    );
    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "GOAL_NAME_REQUIRED") {
      return NextResponse.json({ error: "请填写赛季目标名称" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_TARGET_SLOTS") {
      return NextResponse.json({ error: "目标格数只能使用固定档位" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ACTIVE_SEASON_EXISTS") {
      return NextResponse.json({ error: "请先结束当前赛季" }, { status: 409 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

Create `app/api/admin/seasons/current/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { endActiveSeasonForTeam } from "@/lib/season-service";
import { getRequestSession } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const season = await endActiveSeasonForTeam(session.teamId);
    return NextResponse.json({ season });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_SEASON") {
      return NextResponse.json({ error: "当前没有进行中的赛季" }, { status: 409 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Re-run the admin route tests**

Run:

```bash
npm test -- __tests__/admin-seasons-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/session.ts lib/season-service.ts app/api/admin/seasons/route.ts app/api/admin/seasons/current/route.ts __tests__/admin-seasons-api.test.ts
git commit -m "feat: add admin season routes"
```

### Task 5: Build The Admin Season Page And Entry Point

**Files:**
- Create: `app/(board)/admin/page.tsx`
- Create: `components/admin/SeasonAdminPanel.tsx`
- Create: `__tests__/season-admin-panel.test.tsx`
- Modify: `components/navbar/ProfileDropdown.tsx`

- [ ] **Step 1: Write the failing admin panel test**

Create `__tests__/season-admin-panel.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeasonAdminPanel } from "@/components/admin/SeasonAdminPanel";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("SeasonAdminPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ season: {} }), { status: 201 })));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the create form when there is no active season and the history list below it", () => {
    act(() => {
      root.render(
        <SeasonAdminPanel
          initialData={{
            current: null,
            history: [
              {
                id: "s-1",
                goalName: "四月冲刺",
                targetSlots: 50,
                filledSlots: 32,
                status: "ENDED",
                startedAt: "2026-04-01T00:00:00.000Z",
                endedAt: "2026-04-20T00:00:00.000Z",
              },
            ],
          }}
        />,
      );
    });

    expect(container.textContent).toContain("开启新赛季");
    expect(container.textContent).toContain("赛季目标名称");
    expect(container.textContent).toContain("目标格数");
    expect(container.textContent).toContain("四月冲刺");
  });

  it("renders the active season card and the end button when a season is running", () => {
    act(() => {
      root.render(
        <SeasonAdminPanel
          initialData={{
            current: {
              id: "s-2",
              goalName: "五月掉脂挑战",
              targetSlots: 80,
              filledSlots: 21,
              status: "ACTIVE",
              startedAt: "2026-05-01T00:00:00.000Z",
              endedAt: null,
            },
            history: [],
          }}
        />,
      );
    });

    expect(container.textContent).toContain("五月掉脂挑战");
    expect(container.textContent).toContain("21 / 80");
    expect(container.textContent).toContain("结束当前赛季");
  });
});
```

- [ ] **Step 2: Run the admin panel test to verify it fails**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx
```

Expected: FAIL because the admin page and `SeasonAdminPanel` do not exist yet.

- [ ] **Step 3: Build the admin page and season management panel**

Create `app/(board)/admin/page.tsx`:

```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SeasonAdminPanel } from "@/components/admin/SeasonAdminPanel";
import { listSeasonsForTeam } from "@/lib/season-service";
import { getCookieSession } from "@/lib/session";

export default async function AdminSeasonPage() {
  const cookieStore = await cookies();
  const session = await getCookieSession(cookieStore);

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  const seasons = await listSeasonsForTeam(session.teamId);

  return <SeasonAdminPanel initialData={seasons} />;
}
```

Create `components/admin/SeasonAdminPanel.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SeasonListItem {
  id: string;
  goalName: string;
  targetSlots: number;
  filledSlots: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

interface SeasonAdminPanelProps {
  initialData: {
    current: SeasonListItem | null;
    history: SeasonListItem[];
  };
}

const TARGET_OPTIONS = [50, 80, 100, 120, 150];

export function SeasonAdminPanel({ initialData }: SeasonAdminPanelProps) {
  const router = useRouter();
  const [goalName, setGoalName] = useState("");
  const [targetSlots, setTargetSlots] = useState("50");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function createSeason() {
    const response = await fetch("/api/admin/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalName,
        targetSlots: Number(targetSlots),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "开启赛季失败");
      return;
    }

    setMessage("赛季已开启");
    startTransition(() => router.refresh());
  }

  async function endSeason() {
    const response = await fetch("/api/admin/seasons/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "结束赛季失败");
      return;
    }

    setMessage("赛季已结束");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6 rounded-[28px] border-4 border-slate-200 bg-white p-6 shadow-[0_6px_0_0_#e2e8f0]">
      <div>
        <h1 className="text-3xl font-black text-slate-900">赛季设置</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">管理员在这里开启、结束和回看赛季。</p>
      </div>

      {initialData.current ? (
        <section className="rounded-3xl border-4 border-slate-900 bg-amber-50 p-5 shadow-[0_6px_0_0_#1f2937]">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">进行中的赛季</div>
          <div className="mt-2 text-2xl font-black">{initialData.current.goalName}</div>
          <div className="mt-1 text-sm font-bold text-slate-600">
            {initialData.current.filledSlots} / {initialData.current.targetSlots}
          </div>
          <button
            onClick={endSeason}
            disabled={isPending}
            className="quest-btn mt-4 px-4 py-2 text-sm"
          >
            结束当前赛季
          </button>
        </section>
      ) : (
        <section className="rounded-3xl border-4 border-slate-200 bg-slate-50 p-5">
          <div className="text-xl font-black">开启新赛季</div>
          <label className="mt-4 block text-sm font-black text-slate-700">赛季目标名称</label>
          <input
            value={goalName}
            onChange={(event) => setGoalName(event.target.value)}
            className="brutal-input mt-2"
            placeholder="例如：五月掉脂挑战"
          />
          <label className="mt-4 block text-sm font-black text-slate-700">目标格数</label>
          <select
            value={targetSlots}
            onChange={(event) => setTargetSlots(event.target.value)}
            className="brutal-input mt-2 pl-4"
          >
            {TARGET_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            onClick={createSeason}
            disabled={isPending || goalName.trim().length === 0}
            className="quest-btn mt-4 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            开启新赛季
          </button>
        </section>
      )}

      {message ? <p className="text-sm font-bold text-slate-600">{message}</p> : null}

      <section>
        <h2 className="text-lg font-black text-slate-900">赛季历史</h2>
        <div className="mt-3 space-y-3">
          {initialData.history.map((season) => (
            <article key={season.id} className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
              <div className="font-black text-slate-900">{season.goalName}</div>
              <div className="text-sm font-bold text-slate-500">
                {season.filledSlots} / {season.targetSlots} · {season.status}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Replace the profile dropdown placeholder with live values and an admin CTA**

Update `components/navbar/ProfileDropdown.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";

interface ProfileDropdownProps {
  onDismiss: () => void;
  onEditProfile: () => void;
}

export function ProfileDropdown({ onDismiss, onEditProfile }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { state } = useBoard();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.classList.add("show");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onDismiss} />
      <div ref={ref} className="dropdown-menu flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="border-b-2 border-slate-100 bg-slate-50 p-5">
          <span className="text-xs font-bold text-sub">我的银子</span>
          <div className="mt-1 flex items-center gap-1 text-2xl font-black text-yellow-500">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
            {state.currentUser.assetBalance.toLocaleString("zh-CN")}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-600">
            已连续 {state.currentUser.currentStreak} 天 · 明天继续可得 {state.currentUser.nextReward}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t-2 border-slate-100 bg-slate-50 p-5">
          {state.currentUser.isAdmin ? (
            <button
              onClick={() => {
                onDismiss();
                router.push("/admin");
              }}
              className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 text-sm font-bold text-slate-800 hover:border-slate-800"
            >
              赛季设置
            </button>
          ) : null}
          <button
            onClick={onEditProfile}
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-100 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200"
          >
            编辑资料
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border-2 border-red-200 bg-red-50 py-2 text-sm font-bold text-red-500 hover:bg-red-100"
          >
            退出登录
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Re-run the admin panel test**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/(board)/admin/page.tsx components/admin/SeasonAdminPanel.tsx components/navbar/ProfileDropdown.tsx __tests__/season-admin-panel.test.tsx
git commit -m "feat: add season admin page"
```

### Task 6: Replace The Punch Header With Vault, Segmented Season Progress, And Personal Status

**Files:**
- Create: `components/punch-board/SeasonProgressBar.tsx`
- Create: `__tests__/season-progress-bar.test.tsx`
- Modify: `components/punch-board/TeamHeader.tsx`
- Modify: `components/report-center/report-data.ts`
- Modify: `components/report-center/ReportHeader.tsx`
- Modify: `__tests__/report-center-data.test.ts`
- Modify: `__tests__/report-center-component.test.tsx`
- Modify: `__tests__/board-provider-sync.test.tsx`
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
- Modify: `__tests__/shared-board-polling.test.tsx`
- Modify: `__tests__/shared-board-errors.test.tsx`

- [ ] **Step 1: Write the failing segmented progress bar test**

Create `__tests__/season-progress-bar.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SeasonProgressBar } from "@/components/punch-board/SeasonProgressBar";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("SeasonProgressBar", () => {
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
  });

  it("renders a fixed-length grid with one cell per target slot", () => {
    act(() => {
      root.render(
        <SeasonProgressBar
          activeSeason={{
            id: "season-1",
            monthKey: "2026-04",
            goalName: "五月掉脂挑战",
            targetSlots: 80,
            filledSlots: 3,
            contributions: [
              { userId: "u1", name: "li", avatarKey: "male1", colorIndex: 0, slotContribution: 2, seasonIncome: 30 },
              { userId: "u2", name: "luo", avatarKey: "male2", colorIndex: 1, slotContribution: 1, seasonIncome: 10 },
            ],
          }}
        />,
      );
    });

    const grid = container.querySelector("[data-season-progress-grid]") as HTMLDivElement | null;
    expect(grid).not.toBeNull();
    expect(grid!.style.gridTemplateColumns).toBe("repeat(80, minmax(0, 1fr))");
    expect(container.querySelectorAll("[data-slot-state='filled']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-slot-state='empty']")).toHaveLength(77);
  });
});
```

- [ ] **Step 2: Run the progress bar test to verify it fails**

Run:

```bash
npm test -- __tests__/season-progress-bar.test.tsx
```

Expected: FAIL because `SeasonProgressBar` does not exist yet.

- [ ] **Step 3: Implement the segmented season progress bar**

Create `components/punch-board/SeasonProgressBar.tsx`:

```typescript
"use client";

import { getSeasonTheme } from "@/lib/season-theme";
import type { ActiveSeasonSnapshot } from "@/lib/types";

interface SeasonProgressBarProps {
  activeSeason: ActiveSeasonSnapshot | null;
}

function buildFilledColorOrder(activeSeason: ActiveSeasonSnapshot) {
  return activeSeason.contributions.flatMap((item) =>
    Array.from({ length: item.slotContribution }, () => item.colorIndex),
  );
}

export function SeasonProgressBar({ activeSeason }: SeasonProgressBarProps) {
  if (!activeSeason) {
    return (
      <div className="rounded-full border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">
        暂无进行中的赛季
      </div>
    );
  }

  const month = Number(activeSeason.monthKey.slice(5, 7));
  const theme = getSeasonTheme(month);
  const filledColorOrder = buildFilledColorOrder(activeSeason);

  return (
    <div className="rounded-[24px] border-[3px] border-slate-900 px-4 py-3 shadow-[0_4px_0_0_#1f2937]" style={{ backgroundColor: theme.panelBackground }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">牛马冲刺条</div>
          <div className="text-sm font-black text-slate-900">{activeSeason.goalName}</div>
        </div>
        <div className="text-sm font-black text-slate-700">
          {activeSeason.filledSlots} / {activeSeason.targetSlots}
        </div>
      </div>
      <div
        data-season-progress-grid
        className="mt-3 grid h-5 w-full gap-px overflow-hidden rounded-full border-2 border-slate-200 bg-white/50 p-[2px]"
        style={{ gridTemplateColumns: `repeat(${activeSeason.targetSlots}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: activeSeason.targetSlots }, (_, index) => {
          const filledColorIndex = filledColorOrder[index];
          const isFilled = filledColorIndex !== undefined;
          return (
            <div
              key={index}
              data-slot-state={isFilled ? "filled" : "empty"}
              className="h-full rounded-full"
              style={{
                backgroundColor: isFilled
                  ? theme.memberColors[filledColorIndex]
                  : theme.emptySlotColor,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rework the punch header and report header semantics**

Update `components/punch-board/TeamHeader.tsx`:

```typescript
"use client";

import { SeasonProgressBar } from "./SeasonProgressBar";
import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";

export function TeamHeader() {
  const { state } = useBoard();
  const todayPunchedCount = state.gridData.filter(
    (row) => row[state.today - 1] === true,
  ).length;

  return (
    <header className="flex w-full shrink-0 items-start gap-4 soft-card px-6 py-5">
      <div className="min-w-48 rounded-[24px] border-[3px] border-slate-900 bg-white px-5 py-4 shadow-[0_4px_0_0_#1f2937]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-200 bg-orange-100 p-2 text-orange-500 shadow-sm">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.trophy }} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sub">牛马金库</div>
            <div className="text-2xl font-black text-main">{state.teamVaultTotal.toLocaleString("zh-CN")}</div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <SeasonProgressBar activeSeason={state.activeSeason} />
      </div>

      <div className="min-w-64 rounded-[24px] border-[3px] border-slate-900 bg-slate-50 px-5 py-4 shadow-[0_4px_0_0_#1f2937]">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sub">我的银子</div>
        <div className="text-2xl font-black text-yellow-500">{state.currentUser.assetBalance.toLocaleString("zh-CN")}</div>
        <div className="mt-2 text-sm font-bold text-slate-600">
          已连续 {state.currentUser.currentStreak} 天 · 明天可得 {state.currentUser.nextReward}
        </div>
        <div className="mt-3 text-sm font-bold text-slate-700">
          今日脱脂率 {todayPunchedCount}/{state.members.length}
        </div>
      </div>
    </header>
  );
}
```

Update `components/report-center/report-data.ts`:

```typescript
import type { BoardState } from "@/lib/types";

export interface ReportData {
  title: string;
  summary: string;
  teamVault: {
    current: number;
    helper: string;
  };
  metrics: ReportMetric[];
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
  highlights: ReportHighlight[];
}

function getTeamVaultHelper(state: BoardState) {
  if (!state.activeSeason) {
    return "当前没有进行中的赛季";
  }

  return `${state.activeSeason.goalName} · ${state.activeSeason.filledSlots}/${state.activeSeason.targetSlots}`;
}

export function buildReportData(state: BoardState, now = new Date()): ReportData {
  const elapsedDays = clampElapsedDays(state);
  const memberCount = state.members.length;
  const elapsedMemberDays = memberCount * elapsedDays;

  const rawDailyCounts = Array.from({ length: elapsedDays }, (_, dayIndex) => ({
    day: dayIndex + 1,
    count: countPunchesForDay(state, dayIndex),
  }));

  const totalPunches = rawDailyCounts.reduce((sum, point) => sum + point.count, 0);
  const completionRate =
    elapsedMemberDays > 0 ? Math.round((totalPunches / elapsedMemberDays) * 100) : 0;
  const fullAttendanceDays =
    memberCount > 0 ? rawDailyCounts.filter((point) => point.count === memberCount).length : 0;

  const peakDay = rawDailyCounts.reduce<ReportDaySummary | null>(
    (best, point) => (!best || point.count > best.count ? point : best),
    null,
  );
  const lowDay = rawDailyCounts.reduce<ReportDaySummary | null>(
    (best, point) => (!best || point.count < best.count ? point : best),
    null,
  );

  const dailyPoints = rawDailyCounts.map((point) => ({
    ...point,
    isFullAttendance: memberCount > 0 && point.count === memberCount,
    isPeak: peakDay?.day === point.day,
    isLow: lowDay?.day === point.day,
  }));

  const mostConsistentMember = getLongestStreak(state, elapsedDays);

  return {
    title: getDashboardTitle(now),
    summary: getSummary(totalPunches, fullAttendanceDays, completionRate),
    teamVault: {
      current: state.teamVaultTotal,
      helper: getTeamVaultHelper(state),
    },
    metrics: [
      {
        label: "团队完成率",
        value: `${completionRate}%`,
        helper: getCompletionHelper(completionRate),
        tone: completionRate >= 75 ? "good" : "plain",
      },
      {
        label: "总打卡次数",
        value: totalPunches.toLocaleString("zh-CN"),
        helper: `${memberCount} 人 · ${elapsedDays} 天`,
        tone: "plain",
      },
      {
        label: "全勤日",
        value: fullAttendanceDays.toLocaleString("zh-CN"),
        helper: fullAttendanceDays > 0 ? "全员亮灯的日子" : "还在等第一次全员亮灯",
        tone: "good",
      },
      {
        label: "本月高光",
        value: mostConsistentMember ? `最稳：${mostConsistentMember.name}` : "暂无高光",
        helper: mostConsistentMember
          ? `最长连续 ${mostConsistentMember.streak} 天没掉链子`
          : "先攒一点连续记录",
        tone: "warm",
      },
    ],
    dailyPoints,
    peakDay,
    lowDay,
    highlights: getHighlights(completionRate, peakDay, lowDay, memberCount),
  };
}
```

Update `components/report-center/ReportHeader.tsx`:

```typescript
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportData } from "./report-data";

interface ReportHeaderProps {
  title: string;
  summary: string;
  teamVault: ReportData["teamVault"];
}

export function ReportHeader({ title, summary, teamVault }: ReportHeaderProps) {
  return (
    <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 flex items-center gap-2 font-bold leading-relaxed text-sub">
          {summary}
          <span className="h-5 w-5 shrink-0" dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
      </div>
      <div className="min-w-56 lg:text-right">
        <div className="text-xs font-bold text-sub">牛马金库</div>
        <div className="text-3xl font-black text-yellow-500">
          {teamVault.current.toLocaleString("zh-CN")}
        </div>
        <div className="mt-2 text-sm font-bold text-slate-500">{teamVault.helper}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update the report tests and remaining board-state fixtures**

Update the board state fixture in `__tests__/report-center-data.test.ts`:

```typescript
function createState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1", assetBalance: 30, seasonIncome: 20, slotContribution: 2 },
      { id: "u2", name: "luo", avatarKey: "male2", assetBalance: 20, seasonIncome: 10, slotContribution: 1 },
      { id: "u3", name: "liu", avatarKey: "female1", assetBalance: 10, seasonIncome: 0, slotContribution: 0 },
    ],
    gridData: [
      [true, true, false, true, null],
      [true, false, false, true, null],
      [true, true, false, false, null],
    ],
    teamVaultTotal: 60,
    today: 4,
    totalDays: 5,
    logs: [],
    activeTab: "dash",
    currentUserId: "u1",
    currentUser: {
      assetBalance: 30,
      currentStreak: 2,
      nextReward: 30,
      seasonIncome: 20,
      isAdmin: true,
    },
    activeSeason: {
      id: "season-1",
      monthKey: "2026-04",
      goalName: "五月掉脂挑战",
      targetSlots: 50,
      filledSlots: 3,
      contributions: [
        { userId: "u1", name: "li", avatarKey: "male1", colorIndex: 0, slotContribution: 2, seasonIncome: 20 },
        { userId: "u2", name: "luo", avatarKey: "male2", colorIndex: 1, slotContribution: 1, seasonIncome: 10 },
        { userId: "u3", name: "liu", avatarKey: "female1", colorIndex: 2, slotContribution: 0, seasonIncome: 0 },
      ],
    },
    ...overrides,
  };
}
```

Then update the vault assertions:

```typescript
expect(report.teamVault).toEqual({
  current: 60,
  helper: "五月掉脂挑战 · 3/50",
});
```

Update the `__tests__/report-center-component.test.tsx` fixture in the same way, and replace the expectation:

```typescript
expect(container.textContent).toContain("牛马金库");
expect(container.textContent).toContain("五月掉脂挑战 · 3/50");
expect(container.textContent).not.toContain("/2000");
```

For the remaining board-state fixtures in:

- `__tests__/board-provider-sync.test.tsx`
- `__tests__/heatmap-grid-punch.test.tsx`
- `__tests__/shared-board-polling.test.tsx`
- `__tests__/shared-board-errors.test.tsx`

replace each old snapshot fixture shape:

```typescript
teamCoins: 0,
targetCoins: 100,
currentUserId: "u1",
```

with:

```typescript
teamVaultTotal: 0,
currentUserId: "u1",
currentUser: {
  assetBalance: 0,
  currentStreak: 0,
  nextReward: 10,
  seasonIncome: 0,
  isAdmin: false,
},
activeSeason: null,
```

and update any assertions that previously read `state.teamCoins` to read `state.teamVaultTotal`.

- [ ] **Step 6: Re-run the UI and report tests**

Run:

```bash
npm test -- __tests__/season-progress-bar.test.tsx __tests__/report-center-data.test.ts __tests__/report-center-component.test.tsx __tests__/board-provider-sync.test.tsx __tests__/heatmap-grid-punch.test.tsx __tests__/shared-board-polling.test.tsx __tests__/shared-board-errors.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/punch-board/SeasonProgressBar.tsx components/punch-board/TeamHeader.tsx components/report-center/report-data.ts components/report-center/ReportHeader.tsx __tests__/season-progress-bar.test.tsx __tests__/report-center-data.test.ts __tests__/report-center-component.test.tsx __tests__/board-provider-sync.test.tsx __tests__/heatmap-grid-punch.test.tsx __tests__/shared-board-polling.test.tsx __tests__/shared-board-errors.test.tsx
git commit -m "feat: show vault and season progress on board"
```

## Self-Review

### Spec coverage

- Personal streak rewards only affect personal asset growth and season income: covered by Task 1 and Task 3.
- Team season progress always advances by exactly one slot per effective punch: covered by Task 3 tests and route implementation.
- Segmented fixed-length progress bar with the allowed tiers `50 / 80 / 100 / 120 / 150`: covered by Task 1 and Task 6.
- Admin-managed season create/end flow with goal names: covered by Task 4 and Task 5.
- “牛马金库” remains the team-wide sum of personal assets: covered by Task 3 snapshot contract and Task 6 header/report UI.

### Placeholder scan

- No `TODO`, `TBD`, or “similar to previous task” placeholders remain.
- Every code-writing step includes concrete snippets.
- Every verification step includes a concrete command and expected result.

### Type consistency

- Snapshot naming is consistently `teamVaultTotal`, `currentUser`, and `activeSeason`.
- Season member stats consistently use `seasonIncome` and `slotContribution`.
- Personal streak naming stays `currentStreak` end-to-end.
