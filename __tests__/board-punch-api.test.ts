import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { getCurrentBoardDay } from "@/lib/board-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { createCookieValue } from "@/lib/auth";

function request(method: "POST" | "DELETE", userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("/api/board/punch", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let today: number;
  let todayDayKey: string;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    today = getCurrentBoardDay(fixedNow);
    todayDayKey = getShanghaiDayKey(fixedNow);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
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

    await prisma.punchRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
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

    expect(record?.punched).toBe(true);
    expect(record?.dayIndex).toBe(today);
    expect(record?.seasonId).toBeNull();
    expect(record?.assetAwarded).toBe(20);
    expect(record?.streakAfterPunch).toBe(2);
    expect(record?.countedForSeasonSlot).toBe(false);
    expect(after.coins).toBe(before.coins + 20);
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
