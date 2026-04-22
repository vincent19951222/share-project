import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  BOARD_TOTAL_DAYS,
  buildBoardSnapshotForUser,
  getCurrentBoardDay,
} from "@/lib/board-state";

describe("board-state", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: "li" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives the current board day in Asia/Shanghai and clamps to total days", () => {
    expect(getCurrentBoardDay(new Date("2026-04-05T01:00:00Z"))).toBe(5);
    expect(getCurrentBoardDay(new Date("2026-05-30T20:00:00Z"))).toBe(
      BOARD_TOTAL_DAYS,
    );
  });

  it("builds a normalized snapshot with season-aware member economy data", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const teamUsers = await prisma.user.findMany({
      where: { teamId: user.teamId },
      orderBy: { createdAt: "asc" },
    });
    const seasons = await prisma.season.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });

    await prisma.punchRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
        dayKey: "2026-04-18",
      },
    });
    await prisma.seasonMemberStat.deleteMany({
      where: {
        seasonId: { in: seasons.map((season) => season.id) },
      },
    });
    await prisma.season.deleteMany({
      where: { id: { in: seasons.map((season) => season.id) } },
    });

    const activeSeason = await prisma.season.create({
      data: {
        teamId: user.teamId,
        monthKey: "2026-04",
        goalName: "April sprint",
        status: "ACTIVE",
        targetSlots: 50,
        filledSlots: 3,
        startedAt: new Date("2026-04-01T00:00:00+08:00"),
      },
    });

    try {
      await prisma.seasonMemberStat.createMany({
        data: [
          {
            seasonId: activeSeason.id,
            userId: teamUsers[0].id,
            seasonIncome: 30,
            slotContribution: 2,
            colorIndex: 0,
            memberOrder: 0,
            firstContributionAt: new Date("2026-04-05T08:00:00+08:00"),
          },
          {
            seasonId: activeSeason.id,
            userId: teamUsers[2].id,
            seasonIncome: 60,
            slotContribution: 5,
            colorIndex: 2,
            memberOrder: 2,
            firstContributionAt: new Date("2026-04-08T08:00:00+08:00"),
          },
        ],
      });

      const snapshot = await buildBoardSnapshotForUser(
        userId,
        new Date("2026-04-18T09:00:00+08:00"),
      );

      expect(snapshot).not.toBeNull();
      expect(snapshot!.currentUserId).toBe(userId);
      expect(snapshot!.members).toHaveLength(5);
      expect(snapshot!.gridData).toHaveLength(snapshot!.members.length);
      expect(snapshot!.today).toBe(18);
      expect(snapshot!.totalDays).toBe(BOARD_TOTAL_DAYS);
      expect(snapshot!.teamVaultTotal).toBeGreaterThan(0);
      expect(snapshot!.currentUser!.assetBalance).toBeGreaterThan(0);
      expect(snapshot!.currentUser!.nextReward).toBe(10);
      expect(snapshot!.activeSeason).not.toBeNull();
      expect(snapshot!.activeSeason?.targetSlots).toBe(50);
      expect(snapshot!.activeSeason?.filledSlots).toBe(3);
      expect(snapshot!.activeSeason?.contributions.map((item) => item.name)).toEqual([
        teamUsers[2].username,
        teamUsers[0].username,
        teamUsers[1].username,
        teamUsers[3].username,
        teamUsers[4].username,
      ]);

      const zeroRow = snapshot!.activeSeason?.contributions.find(
        (item) => item.userId === teamUsers[1].id,
      );

      expect(zeroRow).toMatchObject({
        userId: teamUsers[1].id,
        seasonIncome: 0,
        slotContribution: 0,
        colorIndex: 1,
      });

      const currentUserRowIndex = snapshot!.members.findIndex(
        (member) => member.id === snapshot!.currentUserId,
      );

      expect(currentUserRowIndex).toBeGreaterThanOrEqual(0);
      expect(snapshot!.members[currentUserRowIndex]).toMatchObject({
        id: userId,
        assetBalance: expect.any(Number),
        seasonIncome: 30,
        slotContribution: 2,
      });
      expect(snapshot!.gridData[currentUserRowIndex]).toHaveLength(BOARD_TOTAL_DAYS);
      expect(snapshot!.gridData[currentUserRowIndex][snapshot!.today - 1]).toBe(
        false,
      );
      expect(snapshot!.gridData[currentUserRowIndex][snapshot!.today]).toBeNull();
    } finally {
      await prisma.seasonMemberStat.deleteMany({ where: { seasonId: activeSeason.id } });
      await prisma.punchRecord.deleteMany({ where: { seasonId: activeSeason.id } });
      await prisma.season.deleteMany({ where: { id: activeSeason.id } });
    }
  });

  it("returns null when the user does not exist", async () => {
    const snapshot = await buildBoardSnapshotForUser(
      "missing-user",
      new Date("2026-04-18T09:00:00+08:00"),
    );
    expect(snapshot).toBeNull();
  });
});
