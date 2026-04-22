import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { getCurrentBoardDay } from "@/lib/board-state";
import { getShanghaiDayKey } from "@/lib/economy";

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
        dayKey: todayDayKey,
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

    const response = await POST(request());
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

    const response = await POST(request(userId));
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
      nextReward: 10,
      seasonIncome: 0,
      isAdmin: true,
    });
    expect(body.snapshot.activeSeason).toBeNull();
    expect(currentUserRowIndex).toBeGreaterThanOrEqual(0);
    expect(body.snapshot.gridData[currentUserRowIndex][today - 1]).toBe(true);
  });

  it("adds a season slot and season income when an active season exists", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
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
    expect(body.snapshot.currentUser.nextReward).toBe(10);
  });

  it("keeps filled slots capped when the season is already full", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 1, targetSlots: 1 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
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
    expect(stat.slotContribution).toBe(1);
    expect(record.countedForSeasonSlot).toBe(true);
    expect(body.snapshot.activeSeason?.filledSlots).toBe(1);
  });

  it("rejects a second punch on the same day without double-incrementing coins", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const firstResponse = await POST(request(userId));
    expect(firstResponse.status).toBe(200);

    const middle = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const response = await POST(request(userId));
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
      POST(request(userId)),
      POST(request(userId)),
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
});
