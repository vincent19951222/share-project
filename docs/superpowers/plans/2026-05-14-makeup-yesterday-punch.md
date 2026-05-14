# Makeup Yesterday Punch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `0.2.1` self-service yesterday makeup punch feature with fully repaired rewards, streaks, and active season progress.

**Architecture:** Add a dedicated makeup endpoint instead of generalizing the existing punch endpoint. Keep the backend as the source of truth: the client only renders a yesterday affordance and applies the returned `BoardSnapshot`. The ledger mutation happens in one Prisma transaction and uses the existing reward, board snapshot, activity event, and sync patterns.

**Tech Stack:** Next.js 15 App Router API Routes, TypeScript strict mode, Prisma 7 with SQLite, React Context reducer, Vitest + jsdom.

---

## File Structure

- Modify: `app/api/board/punch/route.ts`
  - Export small shared helpers only if needed by tests or the new route. Keep today's punch and undo behavior unchanged.
- Create: `app/api/board/punch/makeup-yesterday/route.ts`
  - Owns authentication, eligibility validation, transaction, activity event, and snapshot response for makeup punch.
- Modify: `lib/api.ts`
  - Add `submitYesterdayMakeupPunch()` that calls the new endpoint and returns `BoardSnapshot`.
- Modify: `components/punch-board/HeatmapGrid.tsx`
  - Render the `补` popup on the current user's missed yesterday cell and reuse existing punch sync handling.
- Modify: `__tests__/board-punch-api.test.ts`
  - Import the makeup route and add backend ledger tests.
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
  - Add frontend interaction tests for the missed-yesterday affordance.
- Create: `docs/Release-note/release-notes-0.2.1.md`
  - Add user-facing release notes.
- Modify: `package.json`
  - Set `"version": "0.2.1"`.
- Modify: `package-lock.json`
  - Keep lockfile root package version aligned with `package.json`.

## Task 1: Backend Makeup API Tests

**Files:**
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Import the makeup route**

At the top of `__tests__/board-punch-api.test.ts`, change the route imports to:

```ts
import { DELETE, POST } from "@/app/api/board/punch/route";
import { POST as POST_MAKEUP_YESTERDAY } from "@/app/api/board/punch/makeup-yesterday/route";
```

- [ ] **Step 2: Add request helper and day constants**

Inside `describe("/api/board/punch", () => {`, below the existing `todayDayKey` declaration, add:

```ts
  let yesterday: number;
  let yesterdayDayKey: string;
```

Inside `beforeAll`, after `todayDayKey = getShanghaiDayKey(fixedNow);`, add:

```ts
    const yesterdayDate = new Date(fixedNow.getTime() - 24 * 60 * 60 * 1000);
    yesterday = getCurrentBoardDay(yesterdayDate);
    yesterdayDayKey = getShanghaiDayKey(yesterdayDate);
```

Below the existing `request()` helper, add:

```ts
function makeupRequest(userId?: string) {
  return new NextRequest("http://localhost/api/board/punch/makeup-yesterday", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify({}),
  });
}
```

- [ ] **Step 3: Add success test for yesterday missed and today missed**

Append this test before the existing `"rejects a second punch on the same day"` test:

```ts
  it("makes up yesterday when today is not punched and repairs rewards, streak, and season progress", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 1,
        lastPunchDayKey: "2026-04-22",
      },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: yesterdayDayKey } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });
    const currentUserRowIndex = body.snapshot.members.findIndex(
      (member: { id: string }) => member.id === body.snapshot.currentUserId,
    );

    expect(record.dayIndex).toBe(yesterday);
    expect(record.dayKey).toBe(yesterdayDayKey);
    expect(record.punchType).toBe("makeup-yesterday");
    expect(record.assetAwarded).toBe(20);
    expect(record.streakAfterPunch).toBe(2);
    expect(record.countedForSeasonSlot).toBe(true);
    expect(after.coins).toBe(before.coins + 20);
    expect(after.currentStreak).toBe(2);
    expect(after.lastPunchDayKey).toBe(yesterdayDayKey);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(20);
    expect(stat.slotContribution).toBe(1);
    expect(body.snapshot.gridData[currentUserRowIndex][yesterday - 1]).toBe(true);
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: after.coins,
      currentStreak: 2,
      nextReward: 30,
      seasonIncome: 20,
    });
  });
```

- [ ] **Step 4: Add success test for repairing an existing today punch**

Append:

```ts
  it("repairs today's streak and reward delta when yesterday is made up after today's punch", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 1, targetSlots: 5 });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 20,
        currentStreak: 1,
        lastPunchDayKey: todayDayKey,
      },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: season.id,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
        countedForSeasonSlot: true,
      },
    });
    await prisma.seasonMemberStat.create({
      data: {
        seasonId: season.id,
        userId,
        seasonIncome: 10,
        slotContribution: 1,
        colorIndex: 0,
        memberOrder: 0,
        firstContributionAt: fixedNow,
      },
    });

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const yesterdayRecord = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: yesterdayDayKey } },
    });
    const todayRecord = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });

    expect(yesterdayRecord.assetAwarded).toBe(10);
    expect(yesterdayRecord.streakAfterPunch).toBe(1);
    expect(yesterdayRecord.countedForSeasonSlot).toBe(true);
    expect(todayRecord.assetAwarded).toBe(20);
    expect(todayRecord.streakAfterPunch).toBe(2);
    expect(after.coins).toBe(40);
    expect(after.currentStreak).toBe(2);
    expect(after.lastPunchDayKey).toBe(todayDayKey);
    expect(stat.seasonIncome).toBe(30);
    expect(stat.slotContribution).toBe(2);
  });
```

- [ ] **Step 5: Add rejection and capped-season tests**

Append:

```ts
  it("rejects yesterday makeup when yesterday already has a punch", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    await prisma.punchRecord.create({
      data: {
        userId,
        dayIndex: yesterday,
        dayKey: yesterdayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
      },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(409);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const records = await prisma.punchRecord.findMany({
      where: { userId, dayKey: yesterdayDayKey },
    });

    expect(records).toHaveLength(1);
    expect(after.coins).toBe(before.coins);
  });

  it("rejects yesterday makeup without an active season", async () => {
    await resetState();

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(409);
    await expect(
      prisma.punchRecord.findUnique({
        where: { userId_dayKey: { userId, dayKey: yesterdayDayKey } },
      }),
    ).resolves.toBeNull();
  });

  it("rejects yesterday makeup when the active season month does not match yesterday", async () => {
    await resetState();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.season.create({
      data: {
        teamId: user.teamId,
        monthKey: "2026-05",
        goalName: "May sprint",
        status: "ACTIVE",
        targetSlots: 80,
        filledSlots: 0,
        startedAt: new Date("2026-05-01T00:00:00+08:00"),
      },
    });

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(409);
  });

  it("keeps season slot capped during yesterday makeup when the active season is full", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 1, targetSlots: 1 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: yesterdayDayKey } },
    });

    expect(after.coins).toBe(before.coins + 10);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(0);
    expect(stat.firstContributionAt).toBeNull();
    expect(record.countedForSeasonSlot).toBe(false);
  });
```

- [ ] **Step 6: Add first-day and concurrency tests**

Append:

```ts
  it("rejects cross-month yesterday makeup on the first day of a month", async () => {
    await resetState();
    vi.setSystemTime(new Date("2026-05-01T09:00:00+08:00"));
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.season.create({
      data: {
        teamId: user.teamId,
        monthKey: "2026-05",
        goalName: "May sprint",
        status: "ACTIVE",
        targetSlots: 80,
        filledSlots: 0,
        startedAt: new Date("2026-05-01T00:00:00+08:00"),
      },
    });

    const response = await POST_MAKEUP_YESTERDAY(makeupRequest(userId));
    expect(response.status).toBe(409);

    vi.setSystemTime(fixedNow);
  });

  it("allows only one successful concurrent yesterday makeup and awards once", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [firstResponse, secondResponse] = await Promise.all([
      POST_MAKEUP_YESTERDAY(makeupRequest(userId)),
      POST_MAKEUP_YESTERDAY(makeupRequest(userId)),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    const records = await prisma.punchRecord.findMany({
      where: { userId, dayKey: yesterdayDayKey },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(statuses).toEqual([200, 409]);
    expect(records).toHaveLength(1);
    expect(after.coins).toBe(before.coins + 10);
  });
```

- [ ] **Step 7: Run tests and verify they fail for missing route**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: FAIL because `@/app/api/board/punch/makeup-yesterday/route` does not exist.

- [ ] **Step 8: Commit failing tests**

```bash
git add __tests__/board-punch-api.test.ts
git commit -m "test: cover yesterday makeup punch api"
```

## Task 2: Backend Makeup API Implementation

**Files:**
- Create: `app/api/board/punch/makeup-yesterday/route.ts`
- Modify: `app/api/board/punch/route.ts` only if TypeScript exposes duplicated helper needs during implementation

- [ ] **Step 1: Create the route file**

Create `app/api/board/punch/makeup-yesterday/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCookieValue } from "@/lib/auth";
import { ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";
import { getNextPunchRewardPreview, getNextPunchStreak, getShanghaiDayKey } from "@/lib/economy";

class MakeupNotAllowedError extends Error {
  constructor(message = "补签条件不满足") {
    super(message);
    this.name = "MakeupNotAllowedError";
  }
}

function isPunchConflictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }

  return error instanceof Error && error.message.toLowerCase().includes("database is locked");
}

function shiftDateByDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

async function buildSnapshotResponse(userId: string, now: Date) {
  const snapshot = await buildBoardSnapshotForUser(userId, now);

  if (!snapshot) {
    return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
  }

  return NextResponse.json({ snapshot });
}

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          include: {
            users: {
              select: {
                id: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            seasons: {
              where: { status: "ACTIVE" },
              orderBy: { startedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "user-not-found" }, { status: 401 });
    }

    const now = new Date();
    const todayDayKey = getShanghaiDayKey(now);
    const yesterdayDate = shiftDateByDays(now, -1);
    const yesterdayDayKey = getShanghaiDayKey(yesterdayDate);
    const todayMonthKey = monthKeyOf(todayDayKey);
    const yesterdayMonthKey = monthKeyOf(yesterdayDayKey);

    if (todayMonthKey !== yesterdayMonthKey) {
      return NextResponse.json({ error: "makeup-not-allowed" }, { status: 409 });
    }

    const activeSeason = user.team.seasons[0] ?? null;

    if (!activeSeason || activeSeason.monthKey !== yesterdayMonthKey) {
      return NextResponse.json({ error: "makeup-not-allowed" }, { status: 409 });
    }

    const yesterdayDayIndex = getCurrentBoardDay(yesterdayDate);
    const memberOrder = Math.max(
      user.team.users.findIndex((member) => member.id === user.id),
      0,
    );

    try {
      await prisma.$transaction(async (tx) => {
        const yesterdayPunch = await tx.punchRecord.findUnique({
          where: {
            userId_dayKey: {
              userId: user.id,
              dayKey: yesterdayDayKey,
            },
          },
          select: { id: true },
        });

        if (yesterdayPunch) {
          throw new MakeupNotAllowedError("昨天已经打过卡了");
        }

        const todayPunch = await tx.punchRecord.findUnique({
          where: {
            userId_dayKey: {
              userId: user.id,
              dayKey: todayDayKey,
            },
          },
          select: {
            id: true,
            seasonId: true,
            assetAwarded: true,
            countedForSeasonSlot: true,
          },
        });

        const previousPunch = await tx.punchRecord.findFirst({
          where: {
            userId: user.id,
            dayKey: { lt: yesterdayDayKey },
            punched: true,
          },
          orderBy: [{ dayKey: "desc" }, { createdAt: "desc" }],
          select: {
            dayKey: true,
            streakAfterPunch: true,
          },
        });

        const yesterdayStreak = getNextPunchStreak(
          previousPunch?.streakAfterPunch ?? 0,
          previousPunch?.dayKey ?? null,
          yesterdayDayKey,
        );
        const yesterdayReward = getNextPunchRewardPreview(
          previousPunch?.streakAfterPunch ?? 0,
          previousPunch?.dayKey ?? null,
          yesterdayDayKey,
        );

        const seasonUpdate = await tx.season.updateMany({
          where: {
            id: activeSeason.id,
            status: "ACTIVE",
            filledSlots: { lt: activeSeason.targetSlots },
          },
          data: {
            filledSlots: { increment: 1 },
          },
        });
        const countsForSeasonSlot = seasonUpdate.count === 1;

        await tx.punchRecord.create({
          data: {
            userId: user.id,
            seasonId: activeSeason.id,
            dayIndex: yesterdayDayIndex,
            dayKey: yesterdayDayKey,
            punched: true,
            punchType: "makeup-yesterday",
            streakAfterPunch: yesterdayStreak,
            assetAwarded: yesterdayReward,
            countedForSeasonSlot: countsForSeasonSlot,
          },
        });

        const existingStat = await tx.seasonMemberStat.findUnique({
          where: {
            seasonId_userId: {
              seasonId: activeSeason.id,
              userId: user.id,
            },
          },
          select: {
            firstContributionAt: true,
            slotContribution: true,
          },
        });

        if (existingStat) {
          await tx.seasonMemberStat.update({
            where: {
              seasonId_userId: {
                seasonId: activeSeason.id,
                userId: user.id,
              },
            },
            data: {
              seasonIncome: { increment: yesterdayReward },
              ...(countsForSeasonSlot
                ? {
                    slotContribution: { increment: 1 },
                    ...(existingStat.firstContributionAt ? {} : { firstContributionAt: now }),
                  }
                : {}),
            },
          });
        } else {
          await tx.seasonMemberStat.create({
            data: {
              seasonId: activeSeason.id,
              userId: user.id,
              seasonIncome: yesterdayReward,
              slotContribution: countsForSeasonSlot ? 1 : 0,
              colorIndex: memberOrder,
              memberOrder,
              firstContributionAt: countsForSeasonSlot ? now : null,
            },
          });
        }

        let userCoinDelta = yesterdayReward;
        let nextCurrentStreak = yesterdayStreak;
        let nextLastPunchDayKey = yesterdayDayKey;

        if (todayPunch) {
          const repairedTodayStreak = getNextPunchStreak(
            yesterdayStreak,
            yesterdayDayKey,
            todayDayKey,
          );
          const repairedTodayReward = getNextPunchRewardPreview(
            yesterdayStreak,
            yesterdayDayKey,
            todayDayKey,
          );
          const todayRewardDelta = repairedTodayReward - todayPunch.assetAwarded;

          await tx.punchRecord.update({
            where: { id: todayPunch.id },
            data: {
              streakAfterPunch: repairedTodayStreak,
              assetAwarded: repairedTodayReward,
            },
          });

          if (todayPunch.seasonId === activeSeason.id && todayRewardDelta !== 0) {
            await tx.seasonMemberStat.update({
              where: {
                seasonId_userId: {
                  seasonId: activeSeason.id,
                  userId: user.id,
                },
              },
              data: {
                seasonIncome: { increment: todayRewardDelta },
              },
            });
          }

          userCoinDelta += todayRewardDelta;
          nextCurrentStreak = repairedTodayStreak;
          nextLastPunchDayKey = todayDayKey;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            coins: { increment: userCoinDelta },
            currentStreak: nextCurrentStreak,
            lastPunchDayKey: nextLastPunchDayKey,
          },
        });

        await tx.activityEvent.create({
          data: {
            teamId: user.teamId,
            userId: user.id,
            type: ACTIVITY_EVENT_TYPES.PUNCH,
            message: `${user.username} 补签了昨天的健身打卡，拿了 ${yesterdayReward} 银子`,
            assetAwarded: yesterdayReward,
            createdAt: now,
          },
        });
      });
    } catch (error) {
      if (error instanceof MakeupNotAllowedError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      if (isPunchConflictError(error)) {
        return NextResponse.json({ error: "duplicate-punch" }, { status: 409 });
      }

      throw error;
    }

    return buildSnapshotResponse(user.id, now);
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run backend tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS for all `board-punch-api` tests. If the concurrent makeup test returns `[200, 500]`, inspect the thrown Prisma error and extend `isPunchConflictError()` only for the observed duplicate/lock case.

- [ ] **Step 3: Run typecheck for route typing**

Run:

```bash
npm run lint
```

Expected: PASS. If TypeScript complains about `seasonIncome: { increment: todayRewardDelta }` accepting negative increments, replace it with `increment` for positive deltas and `decrement: Math.abs(todayRewardDelta)` for negative deltas in both user coins and season income.

- [ ] **Step 4: Commit backend implementation**

```bash
git add app/api/board/punch/makeup-yesterday/route.ts
git commit -m "feat: add yesterday makeup punch api"
```

## Task 3: Frontend API And Heatmap Tests

**Files:**
- Modify: `lib/api.ts`
- Modify: `__tests__/heatmap-grid-punch.test.tsx`

- [ ] **Step 1: Add the client API helper**

In `lib/api.ts`, after `deleteTodayPunch()`, add:

```ts
export async function submitYesterdayMakeupPunch(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch/makeup-yesterday", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readSnapshot(response);
}
```

- [ ] **Step 2: Add frontend tests for the makeup affordance**

In `__tests__/heatmap-grid-punch.test.tsx`, append these tests before the closing `});` of `describe("HeatmapGrid punch flow", ...)`:

```tsx
  it("shows a makeup entry on the current user's missed yesterday cell", async () => {
    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[false, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    const makeupButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "补",
    );

    expect(makeupButtons).toHaveLength(2);
  });

  it("does not show makeup entry when the current user's yesterday cell is already punched", async () => {
    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[true, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    expect(container.textContent).not.toContain("补");
  });

  it("waits for the server snapshot before applying yesterday makeup", async () => {
    const request = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: BoardSnapshot }>;
    }>();
    const fetchMock = vi.fn().mockReturnValue(request.promise);
    vi.stubGlobal("fetch", fetchMock);

    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[false, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const makeupButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "补",
    );
    expect(makeupButton).toBeDefined();

    await act(async () => {
      makeupButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("补昨天打卡");

    const confirmButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认补签"),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board/punch/makeup-yesterday",
      expect.objectContaining({ method: "POST" }),
    );
    expect(readState(container).gridData[0][0]).toBe(false);

    await act(async () => {
      request.resolve({
        ok: true,
        json: async () => ({
          snapshot: createSnapshot({
            gridData: [[true, false, null], [false, false, null]],
            today: 2,
            totalDays: 3,
            teamVaultTotal: 10,
            currentUser: {
              assetBalance: 10,
              currentStreak: 1,
              nextReward: 20,
              seasonIncome: 10,
              isAdmin: false,
            },
          }),
        }),
      });
      await request.promise;
      await Promise.resolve();
    });

    const stateAfterResponse = readState(container);

    expect(stateAfterResponse.gridData[0][0]).toBe(true);
    expect(stateAfterResponse.logs).toHaveLength(1);
    expect(stateAfterResponse.logs[0].type).toBe("success");
    expect(stateAfterResponse.logs[0].text).toContain("补签");
  });
```

Note: the two `补` buttons come from desktop and mobile heatmap renderings. The test should keep that expectation unless the component later hides one layout in jsdom.

- [ ] **Step 3: Run frontend tests and verify they fail before UI implementation**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: FAIL because `HeatmapGrid` does not render `补` and does not call the new API helper yet.

- [ ] **Step 4: Commit failing frontend tests and API helper**

```bash
git add lib/api.ts __tests__/heatmap-grid-punch.test.tsx
git commit -m "test: cover yesterday makeup punch UI"
```

## Task 4: Heatmap Makeup UI Implementation

**Files:**
- Modify: `components/punch-board/HeatmapGrid.tsx`

- [ ] **Step 1: Import the new API helper**

Change:

```ts
import { deleteTodayPunch, submitTodayPunch } from "@/lib/api";
```

to:

```ts
import { deleteTodayPunch, submitTodayPunch, submitYesterdayMakeupPunch } from "@/lib/api";
```

- [ ] **Step 2: Add `handleMakeupYesterday`**

In `HeatmapGrid`, after `handlePunchUndo()`, add:

```ts
  async function handleMakeupYesterday() {
    setSubmitting(true);
    setError(null);
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await submitYesterdayMakeupPunch();

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `makeup-punch-${Date.now()}`,
          text: "<b>你</b> 已补签昨天健身打卡，服务器状态已同步。",
          type: "success",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "补签失败";
      setError(message);
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `makeup-punch-error-${Date.now()}`,
          text: `补签失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 3: Render the yesterday popup**

In `renderPunchCell`, after:

```tsx
    if (day < state.today) {
      return <div key={day} className={`cell ${status ? "cell-punched" : "cell-missed"}`}>{status ? "鉁? : ""}</div>;
    }
```

replace that entire `if (day < state.today)` block with:

```tsx
    if (day < state.today) {
      const isYesterday = day === state.today - 1;

      if (isYesterday && status === false && isCurrentUser) {
        return (
          <PunchPopup
            key={day}
            busy={submitting}
            error={error}
            onConfirm={handleMakeupYesterday}
            triggerContent="补"
            triggerClassName="cell cell-missed cursor-pointer text-xs font-black text-slate-800 disabled:opacity-50"
            title="补昨天打卡"
            description="确认补签昨天的健身打卡吗？"
            helperText="补签会补发银子，并修正连续打卡和赛季进度。"
            confirmLabel="确认补签"
            busyLabel="补签中..."
          />
        );
      }

      return (
        <div key={day} className={`cell ${status ? "cell-punched" : "cell-missed"}`}>
          {status ? "✓" : ""}
        </div>
      );
    }
```

Do not add client-side active-season checks here; the backend is the final authority and the current board snapshot does not expose enough to validate every rule cleanly.

- [ ] **Step 4: Run frontend tests**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run backend tests again**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit UI implementation**

```bash
git add components/punch-board/HeatmapGrid.tsx
git commit -m "feat: add yesterday makeup punch entry"
```

## Task 5: Versioning And Release Notes

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/Release-note/release-notes-0.2.1.md`

- [ ] **Step 1: Bump package version**

In `package.json`, change:

```json
  "version": "0.1.0",
```

to:

```json
  "version": "0.2.1",
```

In `package-lock.json`, update the root package version fields near the top:

```json
  "version": "0.2.1",
```

and inside `packages[""]`:

```json
      "version": "0.2.1",
```

- [ ] **Step 2: Add release notes**

Create `docs/Release-note/release-notes-0.2.1.md`:

```md
# 脱脂牛马 0.2.1 发布说明

`0.2.1` 是一次围绕「忘记点打卡」的小修复版本。

如果昨天确实完成了健身，但忘记在系统里打卡，现在可以在打卡看板上补签昨天。补签只支持昨天，且只能给自己补；如果对应赛季已经结束，或者跨到了上个月，就不能再补。

补签会按有效健身打卡处理：补发银子，修正连续打卡，并同步当前赛季进度。如果今天已经打过卡，系统也会一起修正今天因为断签少算的奖励差额。

这个版本不开放任意日期补卡，也不加入管理员代补。我们先把最常见的「昨天练了但忘点」处理稳，避免补卡变成一套复杂的人工记账系统。
```

- [ ] **Step 3: Run lockfile sanity check**

Run:

```bash
npm install --package-lock-only
```

Expected: command exits 0 and only `package-lock.json` changes mechanically if npm normalizes metadata.

- [ ] **Step 4: Run docs/version status check**

Run:

```bash
git diff -- package.json package-lock.json docs/Release-note/release-notes-0.2.1.md
```

Expected: only the version bump and new `0.2.1` release note are shown.

- [ ] **Step 5: Commit versioning**

```bash
git add package.json package-lock.json docs/Release-note/release-notes-0.2.1.md
git commit -m "docs: add 0.2.1 release notes"
```

## Task 6: Final Verification

**Files:**
- No new files expected.

- [ ] **Step 1: Run targeted tests**

```bash
npm test -- __tests__/board-punch-api.test.ts __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: PASS. If unrelated existing tests fail, record the failing test names and inspect whether failures are caused by the makeup changes before changing code.

- [ ] **Step 3: Run typecheck**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Manual local smoke check in a sibling preview worktree**

Do not run `npm run dev` in `E:\Projects\share-project`. Use a sibling preview worktree so the production directory stays clean:

```powershell
git worktree add E:\Projects\share-project-021-preview codex/0.2.1-makeup-punch
New-Item -ItemType Junction -Path E:\Projects\share-project-021-preview\node_modules -Target E:\Projects\share-project\node_modules
cmd /c "cd /d E:\Projects\share-project-021-preview && set DATABASE_URL=file:/E:/data/share-project/prod.db&& npm run dev"
```

Open `http://localhost:3001` and verify:

- current user's missed yesterday cell shows `补`
- clicking `补` opens the confirmation popup
- backend rejection shows an error instead of silently changing the cell
- successful makeup refreshes the board snapshot

- [ ] **Step 5: Final git check**

```bash
git status --short --branch
git log --oneline -5
```

Expected: working tree clean, latest commits correspond to tests, backend, UI, and release notes.
