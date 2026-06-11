import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/board/punch/route";
import { POST as POST_ADMIN_MAKEUP } from "@/app/api/admin/board/makeup-punch/route";
import { POST as POST_MAKEUP_YESTERDAY } from "@/app/api/board/punch/makeup-yesterday/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { getCurrentBoardDay } from "@/lib/board-state";
import { getPreviousShanghaiDayKey, getShanghaiDayKey } from "@/lib/economy";
import { createCookieValue } from "@/lib/auth";

const validWorkoutPayload = {
  trainingType: "both",
  cardioItem: "elliptical",
  strengthParts: ["chest", "abs"],
  durationMinutes: 60,
} as const;

function request(method: "POST" | "DELETE", userId?: string, body: unknown = validWorkoutPayload) {
  return new NextRequest("http://localhost/api/board/punch", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(method === "POST" ? body : {}),
  });
}

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

function adminMakeupRequest(
  adminUserId: string | undefined,
  body: { targetUserId?: string; dayKey?: string },
) {
  return new NextRequest("http://localhost/api/admin/board/makeup-punch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminUserId ? { Cookie: `userId=${createCookieValue(adminUserId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/board/punch", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let today: number;
  let todayDayKey: string;
  let yesterday: number;
  let yesterdayDayKey: string;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    today = getCurrentBoardDay(fixedNow);
    todayDayKey = getShanghaiDayKey(fixedNow);
    const yesterdayDate = new Date(fixedNow.getTime() - 24 * 60 * 60 * 1000);
    yesterday = getCurrentBoardDay(yesterdayDate);
    yesterdayDayKey = getShanghaiDayKey(yesterdayDate);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function resetState() {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teamUsers = await prisma.user.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    const seasons = await prisma.season.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    const seasonIds = seasons.map((season) => season.id);

    await prisma.adminMakeupPunchLedger.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.workoutEntry.deleteMany();
    await prisma.workoutRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.punchRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.itemUseRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.inventoryItem.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.lotteryTicketLedger.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.experienceLedger.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.activityEvent.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.enterpriseWechatPushEvent.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.enterpriseWechatSendLog.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.seasonMemberStat.deleteMany({
      where: {
        seasonId: { in: seasonIds },
      },
    });
    await prisma.season.deleteMany({
      where: { id: { in: seasonIds } },
    });
    await prisma.user.updateMany({
      where: { id: { in: teamUsers.map((member) => member.id) } },
      data: {
        coins: 10,
        exp: 0,
        currentStreak: 0,
        lastPunchDayKey: null,
      },
    });
  }

  async function createActiveSeason({
    filledSlots,
    targetSlots,
  }: {
    filledSlots: number;
    targetSlots: number;
  }) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return prisma.season.create({
      data: {
        teamId: user.teamId,
        monthKey: "2026-04",
        goalName: "April sprint",
        status: "ACTIVE",
        targetSlots,
        filledSlots,
        startedAt: new Date("2026-04-01T00:00:00+08:00"),
      },
    });
  }

  it("returns 401 when unauthenticated", async () => {
    await resetState();

    const response = await POST(request("POST"));
    expect(response.status).toBe(401);
  });

  it("creates today's punch, increments coins once, and returns the latest snapshot without a season", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 1,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const currentUserRowIndex = body.snapshot.members.findIndex(
      (member: { id: string }) => member.id === body.snapshot.currentUserId,
    );

    const record = await prisma.punchRecord.findUnique({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const expLedger = await prisma.experienceLedger.findFirstOrThrow({
      where: { userId, sourceType: "fitness_punch", sourceId: record!.id },
    });

    expect(record?.punched).toBe(true);
    expect(record?.dayIndex).toBe(today);
    expect(record?.seasonId).toBeNull();
    expect(record?.assetAwarded).toBe(20);
    expect(record?.streakAfterPunch).toBe(2);
    expect(record?.countedForSeasonSlot).toBe(false);
    expect(after.coins).toBe(before.coins + 20);
    expect(after.exp).toBe(before.exp + 100);
    expect(expLedger.delta).toBe(100);
    expect(expLedger.reason).toBe("FITNESS_PUNCH_EXP");
    expect(after.currentStreak).toBe(2);
    expect(after.lastPunchDayKey).toBe(todayDayKey);
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: after.coins,
      currentStreak: 2,
      nextReward: 30,
      seasonIncome: 0,
      isAdmin: true,
    });
    expect(body.snapshot.activeSeason).toBeNull();
    expect(currentUserRowIndex).toBeGreaterThanOrEqual(0);
    expect(body.snapshot.gridData[currentUserRowIndex][today - 1]).toBe(true);

    const activity = await prisma.activityEvent.findFirstOrThrow({
      where: {
        userId,
        type: "PUNCH",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(activity.message).toBe("li 刚刚打卡，椭圆机 + 胸 / 腹 · 60 分钟，拿下 20 银子");
    expect(activity.assetAwarded).toBe(20);
  });

  it("creates structured workout rows for today's punch payload", async () => {
    await resetState();

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const workout = await prisma.workoutRecord.findUniqueOrThrow({
      where: { punchRecordId: punch.id },
      include: { entries: { orderBy: [{ category: "asc" }, { code: "asc" }] } },
    });

    expect(workout).toMatchObject({
      userId,
      teamId: user.teamId,
      punchRecordId: punch.id,
      dayKey: todayDayKey,
      trainingType: "both",
      durationMinutes: 60,
    });
    expect(workout.entries.map((entry) => [entry.category, entry.code, entry.label])).toEqual([
      ["cardio", "elliptical", "椭圆机"],
      ["strength", "abs", "腹"],
      ["strength", "chest", "胸"],
    ]);

    const activity = await prisma.activityEvent.findFirstOrThrow({
      where: { userId, type: "PUNCH" },
      orderBy: { createdAt: "desc" },
    });
    expect(activity.message).toContain("椭圆机 + 胸 / 腹 · 60 分钟");
  });

  it("rejects invalid workout payloads before creating today's punch", async () => {
    await resetState();

    const response = await POST(request("POST", userId, {
      trainingType: "strength",
      cardioItem: null,
      strengthParts: [],
      durationMinutes: 60,
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid-workout-payload" });
    await expect(prisma.punchRecord.count({ where: { userId, dayKey: todayDayKey } })).resolves.toBe(0);
    await expect(prisma.workoutRecord.count({ where: { userId, dayKey: todayDayKey } })).resolves.toBe(0);
  });

  it("settles a pending fitness boost when the real punch is created", async () => {
    await resetState();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.inventoryItem.create({
      data: { userId, teamId: user.teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId: user.teamId,
        itemId: "small_boost_coupon",
        dayKey: todayDayKey,
        status: "PENDING",
        targetType: null,
        targetId: null,
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const boost = await prisma.itemUseRecord.findFirstOrThrow({
      where: { userId, itemId: "small_boost_coupon" },
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });

    expect(boost).toMatchObject({
      status: "SETTLED",
      targetType: "FITNESS_PUNCH",
      targetId: punch.id,
    });
    expect(punch).toMatchObject({
      assetAwarded: 15,
      baseAssetAwarded: 10,
      boostAssetBonus: 5,
      baseSeasonContribution: 0,
      seasonContributionAwarded: 0,
    });
    expect(inventory.quantity).toBe(0);
  });

  it("settles a season sprint boost without adding extra season slots", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 1 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await prisma.inventoryItem.create({
      data: { userId: user.id, teamId: user.teamId, itemId: "season_sprint_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        itemId: "season_sprint_coupon",
        dayKey: todayDayKey,
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "fitness_season_multiplier", multiplier: 2 }),
      },
    });

    const response = await POST(request("POST", user.id));
    expect(response.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId: user.id, dayKey: todayDayKey } },
    });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
    });
    const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });

    expect(punch.assetAwarded).toBe(10);
    expect(punch.seasonContributionAwarded).toBe(20);
    expect(stat.seasonIncome).toBe(20);
    expect(stat.slotContribution).toBe(1);
    expect(afterSeason.filledSlots).toBe(1);
  });

  it("continues streak reward through one leave-protected day", async () => {
    await resetState();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const yesterdayDayKey = getPreviousShanghaiDayKey(todayDayKey);
    const dayBeforeYesterdayKey = getPreviousShanghaiDayKey(yesterdayDayKey);

    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today - 2,
        dayKey: dayBeforeYesterdayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId: user.teamId,
        itemId: "fitness_leave_coupon",
        dayKey: yesterdayDayKey,
        status: "SETTLED",
        targetType: "LEAVE_PROTECTION",
        targetId: null,
        effectSnapshotJson: JSON.stringify({
          type: "leave_protection",
          protectsStreak: true,
          freezesNextFitnessRewardTier: true,
        }),
        settledAt: new Date("2026-04-23T09:00:00+08:00"),
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 3,
        lastPunchDayKey: dayBeforeYesterdayKey,
        coins: 100,
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(punch.streakAfterPunch).toBe(4);
    expect(punch.assetAwarded).toBe(40);
    expect(after.coins).toBe(140);
  });

  it("awards coins from the user's consecutive punch streak globally", async () => {
    const cases = [
      {
        label: "first consecutive day",
        currentStreak: 0,
        lastPunchDayKey: null,
        expectedStreak: 1,
        expectedReward: 10,
        expectedNextReward: 20,
      },
      {
        label: "second consecutive day",
        currentStreak: 1,
        lastPunchDayKey: "2026-04-23",
        expectedStreak: 2,
        expectedReward: 20,
        expectedNextReward: 30,
      },
      {
        label: "third consecutive day",
        currentStreak: 2,
        lastPunchDayKey: "2026-04-23",
        expectedStreak: 3,
        expectedReward: 30,
        expectedNextReward: 40,
      },
      {
        label: "capped reward after five consecutive days",
        currentStreak: 5,
        lastPunchDayKey: "2026-04-23",
        expectedStreak: 6,
        expectedReward: 50,
        expectedNextReward: 50,
      },
    ] as const;

    for (const testCase of cases) {
      await resetState();
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: testCase.currentStreak,
          lastPunchDayKey: testCase.lastPunchDayKey,
        },
      });

      const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const response = await POST(request("POST", userId));

      expect(response.status, testCase.label).toBe(200);

      const body = await response.json();
      const record = await prisma.punchRecord.findUniqueOrThrow({
        where: { userId_dayKey: { userId, dayKey: todayDayKey } },
      });
      const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

      expect(record.assetAwarded, testCase.label).toBe(testCase.expectedReward);
      expect(record.streakAfterPunch, testCase.label).toBe(testCase.expectedStreak);
      expect(after.coins, testCase.label).toBe(before.coins + testCase.expectedReward);
      expect(after.currentStreak, testCase.label).toBe(testCase.expectedStreak);
      expect(after.lastPunchDayKey, testCase.label).toBe(todayDayKey);
      expect(body.snapshot.currentUser).toMatchObject({
        assetBalance: after.coins,
        currentStreak: testCase.expectedStreak,
        nextReward: testCase.expectedNextReward,
      });
    }
  });

  it("computes today's punch reward from the latest user state inside the transaction", async () => {
    await resetState();
    await prisma.punchRecord.create({
      data: {
        userId,
        dayIndex: yesterday,
        dayKey: yesterdayDayKey,
        punched: true,
        punchType: "makeup-yesterday",
        streakAfterPunch: 5,
        assetAwarded: 50,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 1,
        lastPunchDayKey: yesterdayDayKey,
      },
    });
    const staleUser = await prisma.user.findUniqueOrThrow({
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
    const findUniqueSpy = vi.spyOn(prisma.user, "findUnique");

    findUniqueSpy.mockResolvedValueOnce({
      ...staleUser,
      currentStreak: 0,
      lastPunchDayKey: null,
    } as never);

    try {
      const response = await POST(request("POST", userId));
      expect(response.status).toBe(200);
    } finally {
      findUniqueSpy.mockRestore();
    }

    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(record.assetAwarded).toBe(20);
    expect(record.streakAfterPunch).toBe(2);
    expect(after.coins).toBe(30);
    expect(after.currentStreak).toBe(2);
    expect(after.lastPunchDayKey).toBe(todayDayKey);
  });

  it("adds a season slot and season income when an active season exists", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(record.seasonId).toBe(season.id);
    expect(record.countedForSeasonSlot).toBe(true);
    expect(record.assetAwarded).toBe(10);
    expect(record.streakAfterPunch).toBe(1);
    expect(after.coins).toBe(before.coins + 10);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(1);
    expect(stat.firstContributionAt).not.toBeNull();
    expect(body.snapshot.activeSeason?.filledSlots).toBe(1);
    expect(body.snapshot.currentUser.nextReward).toBe(20);
  });

  it("awards today's punch without season ledger writes when the only active season is for a past month", async () => {
    await resetState();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const staleSeason = await prisma.season.create({
      data: {
        teamId: user.teamId,
        monthKey: "2026-03",
        goalName: "March sprint",
        status: "ACTIVE",
        targetSlots: 5,
        filledSlots: 0,
        startedAt: new Date("2026-03-01T00:00:00+08:00"),
      },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: staleSeason.id },
    });
    const stat = await prisma.seasonMemberStat.findUnique({
      where: {
        seasonId_userId: {
          seasonId: staleSeason.id,
          userId,
        },
      },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(record.seasonId).toBeNull();
    expect(record.countedForSeasonSlot).toBe(false);
    expect(record.assetAwarded).toBe(10);
    expect(after.coins).toBe(before.coins + 10);
    expect(afterSeason.filledSlots).toBe(0);
    expect(stat).toBeNull();
    expect(body.snapshot.activeSeason).toBeNull();
    expect(body.snapshot.currentUser.seasonIncome).toBe(0);
  });

  it("keeps filled slots capped and skips slot contribution when the season is already full", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 1, targetSlots: 1 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(after.coins).toBe(before.coins + 10);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(0);
    expect(stat.firstContributionAt).toBeNull();
    expect(record.countedForSeasonSlot).toBe(false);
    expect(body.snapshot.activeSeason?.filledSlots).toBe(1);
  });

  it("awards today's punch without season ledger writes when a pre-read active season has ended", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    const staleUser = await prisma.user.findUniqueOrThrow({
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
    await prisma.season.update({
      where: { id: season.id },
      data: { status: "ENDED" },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const findUniqueSpy = vi.spyOn(prisma.user, "findUnique");

    findUniqueSpy.mockResolvedValueOnce(staleUser as never);

    try {
      const response = await POST(request("POST", userId));
      expect(response.status).toBe(200);
    } finally {
      findUniqueSpy.mockRestore();
    }

    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const stat = await prisma.seasonMemberStat.findUnique({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });

    expect(record.seasonId).toBeNull();
    expect(record.countedForSeasonSlot).toBe(false);
    expect(record.assetAwarded).toBe(10);
    expect(after.coins).toBe(before.coins + 10);
    expect(after.currentStreak).toBe(1);
    expect(afterSeason.filledSlots).toBe(0);
    expect(stat).toBeNull();
  });

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
    await prisma.punchRecord.create({
      data: {
        userId,
        dayIndex: 22,
        dayKey: "2026-04-22",
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
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
    const workout = await prisma.workoutRecord.findUniqueOrThrow({
      where: { punchRecordId: record.id },
      include: { entries: true },
    });

    expect(workout).toMatchObject({
      userId,
      dayKey: yesterdayDayKey,
      trainingType: "cardio",
      durationMinutes: null,
    });
    expect(workout.entries).toHaveLength(1);
    expect(workout.entries[0]).toMatchObject({
      category: "cardio",
      code: "treadmill",
      label: "跑步机",
    });
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
    await expect(response.json()).resolves.toMatchObject({ error: "duplicate-punch" });

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

  it("rejects cross-month yesterday makeup on the first day of a month", async () => {
    await resetState();
    vi.setSystemTime(new Date("2026-05-01T09:00:00+08:00"));
    try {
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
    } finally {
      vi.setSystemTime(fixedNow);
    }
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

  it("lets admins globally make up any missed past day in the current month with a fixed +10 reward", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    const target = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const beforeTarget = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    const makeupDayKey = "2026-04-10";

    const response = await POST_ADMIN_MAKEUP(
      adminMakeupRequest(userId, {
        targetUserId: target.id,
        dayKey: makeupDayKey,
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId: target.id, dayKey: makeupDayKey } },
    });
    const afterTarget = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId: target.id } },
    });
    const ledgerClient = prisma as unknown as {
      adminMakeupPunchLedger: {
        findFirstOrThrow(input: unknown): Promise<{
          adminUserId: string;
          targetUserId: string;
          punchRecordId: string;
          dayKey: string;
          rewardAwarded: number;
        }>;
      };
    };
    const ledger = await ledgerClient.adminMakeupPunchLedger.findFirstOrThrow({
      where: {
        adminUserId: userId,
        targetUserId: target.id,
        dayKey: makeupDayKey,
      },
    });
    const targetRowIndex = body.snapshot.members.findIndex(
      (member: { id: string }) => member.id === target.id,
    );

    expect(record.punchType).toBe("admin-makeup");
    const workout = await prisma.workoutRecord.findUniqueOrThrow({
      where: { punchRecordId: record.id },
      include: { entries: true },
    });

    expect(workout).toMatchObject({
      userId: target.id,
      dayKey: makeupDayKey,
      trainingType: "cardio",
      durationMinutes: null,
    });
    expect(workout.entries).toHaveLength(1);
    expect(workout.entries[0]).toMatchObject({
      category: "cardio",
      code: "treadmill",
      label: "跑步机",
    });
    expect(record.assetAwarded).toBe(10);
    expect(record.baseAssetAwarded).toBe(10);
    expect(record.boostAssetBonus).toBe(0);
    expect(record.seasonContributionAwarded).toBe(10);
    expect(record.countedForSeasonSlot).toBe(true);
    expect(afterTarget.coins).toBe(beforeTarget.coins + 10);
    expect(afterTarget.exp).toBe(beforeTarget.exp);
    expect(afterTarget.ticketBalance).toBe(beforeTarget.ticketBalance);
    expect(afterTarget.currentStreak).toBe(beforeTarget.currentStreak);
    expect(afterTarget.lastPunchDayKey).toBe(beforeTarget.lastPunchDayKey);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(1);
    expect(ledger).toMatchObject({
      adminUserId: userId,
      targetUserId: target.id,
      punchRecordId: record.id,
      dayKey: makeupDayKey,
      rewardAwarded: 10,
    });
    expect(body.snapshot.gridData[targetRowIndex][9]).toBe(true);
  });

  it("rejects global makeup from non-admin users", async () => {
    await resetState();
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });

    const response = await POST_ADMIN_MAKEUP(
      adminMakeupRequest(member.id, {
        targetUserId: userId,
        dayKey: "2026-04-10",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects admin global makeup when the target day already has a punch", async () => {
    await resetState();
    const target = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const makeupDayKey = "2026-04-10";
    await prisma.punchRecord.create({
      data: {
        userId: target.id,
        dayIndex: 10,
        dayKey: makeupDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
      },
    });

    const response = await POST_ADMIN_MAKEUP(
      adminMakeupRequest(userId, {
        targetUserId: target.id,
        dayKey: makeupDayKey,
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "duplicate-punch" });
  });

  it("rejects admin global makeup for users outside the admin team", async () => {
    await resetState();
    const otherTeam = await prisma.team.create({
      data: {
        name: "Other Team",
        code: "OTHER-TEAM-ADMIN-MAKEUP",
      },
    });
    const outsider = await prisma.user.create({
      data: {
        username: "outsider-admin-makeup",
        password: "not-used",
        avatarKey: "male1",
        teamId: otherTeam.id,
      },
    });

    const response = await POST_ADMIN_MAKEUP(
      adminMakeupRequest(userId, {
        targetUserId: outsider.id,
        dayKey: "2026-04-10",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "target-user-not-found" });
  });

  it("rejects a second punch on the same day without double-incrementing coins", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const firstResponse = await POST(request("POST", userId));
    expect(firstResponse.status).toBe(200);

    const middle = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const response = await POST(request("POST", userId));
    expect(response.status).toBe(409);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const records = await prisma.punchRecord.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
      },
    });

    expect(records).toHaveLength(1);
    await expect(prisma.workoutRecord.count({ where: { userId, dayKey: todayDayKey } })).resolves.toBe(1);
    expect(after.coins).toBe(middle.coins);
    expect(after.coins).toBe(before.coins + 10);
  });

  it("allows only one successful concurrent punch and increments coins once", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", userId)),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    const records = await prisma.punchRecord.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
      },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(statuses).toEqual([200, 409]);
    expect(records).toHaveLength(1);
    expect(records[0]?.punched).toBe(true);
    expect(after.coins).toBe(before.coins + 10);
  });

  it("caps season slot growth when different users punch concurrently", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otherUser = await prisma.user.findFirstOrThrow({
      where: {
        teamId: currentUser.teamId,
        id: { not: userId },
      },
      orderBy: { createdAt: "asc" },
    });
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", otherUser.id)),
    ]);

    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const records = await prisma.punchRecord.findMany({
      where: { seasonId: season.id },
    });
    const stats = await prisma.seasonMemberStat.findMany({
      where: { seasonId: season.id },
    });

    expect([firstResponse.status, secondResponse.status].sort((a, b) => a - b)).toEqual([200, 200]);
    expect(afterSeason.filledSlots).toBe(1);
    expect(records.filter((record) => record.countedForSeasonSlot)).toHaveLength(1);
    expect(stats.reduce((sum, stat) => sum + stat.slotContribution, 0)).toBe(1);
  });

  it("writes a season target reached dynamic exactly once when the last slot fills", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otherUser = await prisma.user.findFirstOrThrow({
      where: { teamId: currentUser.teamId, id: { not: userId } },
      orderBy: { createdAt: "asc" },
    });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", otherUser.id)),
    ]);

    expect([firstResponse.status, secondResponse.status].sort((a, b) => a - b)).toEqual([200, 200]);

    const entries = await prisma.teamDynamic.findMany({
      where: { teamId: currentUser.teamId, type: "SEASON_TARGET_REACHED" },
    });

    expect(entries).toHaveLength(1);
  });

  it("writes a full attendance dynamic when every member punches on the same day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    for (const teammate of teammates) {
      const response = await POST(request("POST", teammate.id));
      expect(response.status).toBe(200);
    }

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { teamId: currentUser.teamId, type: "TEAM_FULL_ATTENDANCE" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.summary).toContain("全勤");
  });

  it("writes a streak milestone dynamic when the current user reaches seven days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 6,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { type: "STREAK_MILESTONE" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.title).toContain("7 天");
  });

  it("sends a streak milestone push when the user reaches fourteen days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 13,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-1",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const response = await POST(request("POST", userId));

    expect(response.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "TEAM_MILESTONE",
        message: expect.objectContaining({ type: "text" }),
      }),
    );
  });

  it("sends full-team attendance to enterprise wechat only once per day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-2",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    for (const teammate of teammates) {
      await POST(request("POST", teammate.id));
    }

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("does not resend full-team attendance after undo and re-complete on the same day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-3",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    for (const teammate of teammates) {
      const response = await POST(request("POST", teammate.id));
      expect(response.status).toBe(200);
    }

    const lastTeammate = teammates[teammates.length - 1]!;
    const undoResponse = await DELETE(request("DELETE", lastTeammate.id));
    expect(undoResponse.status).toBe(200);

    const repunchResponse = await POST(request("POST", lastTeammate.id));
    expect(repunchResponse.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("sends a season target reached push only once per season", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-4",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const firstResponse = await POST(request("POST", userId));
    expect(firstResponse.status).toBe(200);

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    const secondResponse = await POST(request("POST", userId));
    expect(secondResponse.status).toBe(200);

    const seasonGoalCalls = sendSpy.mock.calls.filter(
      ([arg]) => arg?.targetType === "SeasonGoal",
    );
    expect(seasonGoalCalls).toHaveLength(1);
  });

  it("sends a streak milestone push when the user reaches one hundred days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 99,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-5",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const response = await POST(request("POST", userId));

    expect(response.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "StreakMilestone",
        message: expect.objectContaining({
          content: expect.stringContaining("100"),
        }),
      }),
    );
  });

  it("undoes today's punch and restores the previous streak and coins", async () => {
    await resetState();

    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today - 1,
        dayKey: "2026-04-23",
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 100,
        currentStreak: 5,
        lastPunchDayKey: todayDayKey,
      },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 5,
        assetAwarded: 50,
        countedForSeasonSlot: false,
      },
    });

    const response = await DELETE(request("DELETE", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const todayRecord = await prisma.punchRecord.findUnique({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(todayRecord).toBeNull();
    expect(after.coins).toBe(50);
    expect(after.currentStreak).toBe(4);
    expect(after.lastPunchDayKey).toBe("2026-04-23");
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: 50,
      currentStreak: 4,
      nextReward: 50,
    });
  });

  it("deletes workout rows when today's punch is undone", async () => {
    await resetState();

    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    await expect(prisma.workoutRecord.count({ where: { punchRecordId: punch.id } })).resolves.toBe(1);

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    await expect(prisma.workoutRecord.count({ where: { punchRecordId: punch.id } })).resolves.toBe(0);
    await expect(prisma.workoutEntry.count()).resolves.toBe(0);
  });

  it("undoes today's season punch and rolls back season income plus progress", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 3, targetSlots: 5 });

    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today - 1,
        dayKey: "2026-04-23",
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 70,
        currentStreak: 2,
        lastPunchDayKey: todayDayKey,
      },
    });
    await prisma.seasonMemberStat.create({
      data: {
        seasonId: season.id,
        userId,
        seasonIncome: 20,
        slotContribution: 2,
        colorIndex: 0,
        memberOrder: 0,
        firstContributionAt: new Date("2026-04-20T08:00:00+08:00"),
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
        streakAfterPunch: 2,
        assetAwarded: 20,
        countedForSeasonSlot: true,
      },
    });
    await prisma.season.update({
      where: { id: season.id },
      data: { filledSlots: 4 },
    });
    await prisma.seasonMemberStat.update({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
      data: {
        seasonIncome: 40,
        slotContribution: 3,
      },
    });

    const response = await DELETE(request("DELETE", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });
    const afterStat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });

    expect(after.coins).toBe(50);
    expect(after.currentStreak).toBe(1);
    expect(after.lastPunchDayKey).toBe("2026-04-23");
    expect(afterSeason.filledSlots).toBe(3);
    expect(afterStat.seasonIncome).toBe(20);
    expect(afterStat.slotContribution).toBe(2);
    expect(body.snapshot.activeSeason?.filledSlots).toBe(3);
    expect(body.snapshot.currentUser?.seasonIncome).toBe(20);

    const activity = await prisma.activityEvent.findFirstOrThrow({
      where: {
        userId,
        type: "UNDO_PUNCH",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(activity.message).toBe("li 撤销了今天的打卡");
    expect(activity.assetAwarded).toBeNull();
  });

  it("undoes a coin-only boosted punch without rolling back extra season income", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 1, targetSlots: 5 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const itemUse = await prisma.itemUseRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        itemId: "coin_rich_coupon",
        dayKey: todayDayKey,
        status: "SETTLED",
        targetType: "FITNESS_PUNCH",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 2 }),
        settledAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { coins: 180, currentStreak: 4, lastPunchDayKey: todayDayKey },
    });
    await prisma.seasonMemberStat.create({
      data: {
        seasonId: season.id,
        userId: user.id,
        seasonIncome: 40,
        slotContribution: 1,
        colorIndex: 0,
        memberOrder: 0,
        firstContributionAt: new Date(),
      },
    });
    await prisma.punchRecord.create({
      data: {
        userId: user.id,
        seasonId: season.id,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 80,
        baseAssetAwarded: 40,
        boostAssetBonus: 40,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
        seasonContributionAwarded: 40,
        boostItemUseRecordId: itemUse.id,
        boostSummaryJson: JSON.stringify({ boostLabel: "银子暴富券" }),
        countedForSeasonSlot: true,
      },
    });

    const response = await DELETE(request("DELETE", user.id));
    expect(response.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
    });
    const inventoryCount = await prisma.inventoryItem.count({
      where: { userId: user.id, itemId: "coin_rich_coupon" },
    });
    const activity = await prisma.activityEvent.findFirstOrThrow({
      where: { userId: user.id, type: "UNDO_PUNCH" },
      orderBy: { createdAt: "desc" },
    });

    expect(after.coins).toBe(100);
    expect(stat.seasonIncome).toBe(0);
    expect(inventoryCount).toBe(0);
    expect(activity.message).toContain("银子暴富券");
  });

  it("rejects undo when today's punch does not exist", async () => {
    await resetState();

    const response = await DELETE(request("DELETE", userId));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "今天还没打卡，撤销不了",
    });
  });
});
