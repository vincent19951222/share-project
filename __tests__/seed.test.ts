import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  seedDatabase,
  SEED_USERS,
  SEED_TEAM,
  SEED_PUNCH_DAY_KEY,
} from "@/lib/db-seed";

describe("seedDatabase", () => {
  beforeAll(async () => {
    const fixtureTeams = await prisma.team.findMany({
      where: { code: { in: [SEED_TEAM.code, "OTHER-SEED-TEAM", "EXTRA-USER-SEASON"] } },
      select: { id: true },
    });
    const fixtureTeamIds = fixtureTeams.map((team) => team.id);
    const fixtureUsers = await prisma.user.findMany({
      where: {
        OR: [
          { teamId: { in: fixtureTeamIds } },
          { username: { in: SEED_USERS.map((user) => user.username) } },
        ],
      },
      select: { id: true },
    });
    const fixtureUserIds = fixtureUsers.map((user) => user.id);
    const fixtureSeasons = await prisma.season.findMany({
      where: { teamId: { in: fixtureTeamIds } },
      select: { id: true },
    });
    const fixtureSeasonIds = fixtureSeasons.map((season) => season.id);
    const fixtureTeamDynamics = await prisma.teamDynamic.findMany({
      where: { teamId: { in: fixtureTeamIds } },
      select: { id: true },
    });
    const fixtureTeamDynamicIds = fixtureTeamDynamics.map((item) => item.id);

    await prisma.weeklyReportDraft.deleteMany({
      where: {
        OR: [
          { createdByUserId: { in: fixtureUserIds } },
          { teamId: { in: fixtureTeamIds } },
        ],
      },
    });
    await prisma.socialInvitationResponse.deleteMany({
      where: {
        OR: [
          { responderUserId: { in: fixtureUserIds } },
          { teamId: { in: fixtureTeamIds } },
        ],
      },
    });
    await prisma.socialInvitation.deleteMany({
      where: {
        OR: [
          { senderUserId: { in: fixtureUserIds } },
          { recipientUserId: { in: fixtureUserIds } },
          { teamId: { in: fixtureTeamIds } },
        ],
      },
    });
    await prisma.realWorldRedemption.deleteMany({
      where: {
        OR: [
          { userId: { in: fixtureUserIds } },
          { confirmedByUserId: { in: fixtureUserIds } },
          { teamId: { in: fixtureTeamIds } },
        ],
      },
    });
    await prisma.itemUseRecord.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    const fixtureLotteryDraws = await prisma.lotteryDraw.findMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
      select: { id: true },
    });
    const fixtureLotteryDrawIds = fixtureLotteryDraws.map((draw) => draw.id);

    await prisma.lotteryDrawResult.deleteMany({
      where: { drawId: { in: fixtureLotteryDrawIds } },
    });
    await prisma.lotteryDraw.deleteMany({
      where: { id: { in: fixtureLotteryDrawIds } },
    });
    await prisma.inventoryItem.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.lotteryTicketLedger.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.dailyTaskAssignment.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.enterpriseWechatPushEvent.deleteMany({
      where: { teamId: { in: fixtureTeamIds } },
    });
    await prisma.enterpriseWechatSendLog.deleteMany({
      where: { teamId: { in: fixtureTeamIds } },
    });
    await prisma.seasonMemberStat.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { seasonId: { in: fixtureSeasonIds } }],
      },
    });
    await prisma.boardNote.deleteMany({
      where: {
        OR: [{ authorId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.activityEvent.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.coffeeRecord.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { teamId: { in: fixtureTeamIds } }],
      },
    });
    await prisma.punchRecord.deleteMany({
      where: {
        OR: [{ userId: { in: fixtureUserIds } }, { seasonId: { in: fixtureSeasonIds } }],
      },
    });
    await prisma.teamDynamicReadState.deleteMany({
      where: {
        OR: [
          { userId: { in: fixtureUserIds } },
          { teamDynamicId: { in: fixtureTeamDynamicIds } },
        ],
      },
    });
    await prisma.teamDynamic.deleteMany({
      where: { id: { in: fixtureTeamDynamicIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    await prisma.season.deleteMany({ where: { id: { in: fixtureSeasonIds } } });
    await prisma.team.deleteMany({ where: { id: { in: fixtureTeamIds } } });
  });

  it("should seed team and users", async () => {
    await seedDatabase();

    const team = await prisma.team.findUnique({ where: { code: SEED_TEAM.code } });
    expect(team).not.toBeNull();
    expect(team!.name).toBe(SEED_TEAM.name);

    for (const seedUser of SEED_USERS) {
      const user = await prisma.user.findUnique({ where: { username: seedUser.username } });
      expect(user).not.toBeNull();
      expect(user!.avatarKey).toBe(seedUser.avatarKey);
      expect(user!.role).toBe(seedUser.role);
      expect(user!.currentStreak).toBe(0);
      expect(user!.lastPunchDayKey).toBeNull();
      expect(user!.coins).toBe(seedUser.coins);
    }
  });

  it("should create punch records for each user", async () => {
    await seedDatabase();

    for (const seedUser of SEED_USERS) {
      const user = await prisma.user.findUnique({
        where: { username: seedUser.username },
        include: { punchRecords: true },
      });
      expect(user!.punchRecords).toHaveLength(1);
      expect(user!.punchRecords[0]).toMatchObject({
        dayIndex: 22,
        dayKey: SEED_PUNCH_DAY_KEY,
        punched: true,
        punchType: "default",
        streakAfterPunch: 0,
        assetAwarded: 0,
        countedForSeasonSlot: false,
        seasonId: null,
      });
    }
  });

  it("should leave season tables empty after seeding", async () => {
    await seedDatabase();

    const team = await prisma.team.findUniqueOrThrow({ where: { code: SEED_TEAM.code } });
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: SEED_USERS[0].username },
    });
    const season = await prisma.season.create({
      data: {
        teamId: team.id,
        monthKey: "2026-04",
        goalName: "Season cleanup coverage",
        status: "ACTIVE",
        targetSlots: 50,
      },
    });
    await prisma.seasonMemberStat.create({
      data: {
        seasonId: season.id,
        userId: user.id,
        colorIndex: 1,
        memberOrder: 1,
      },
    });
    await prisma.punchRecord.create({
      data: {
        userId: user.id,
        seasonId: season.id,
        dayIndex: 22,
        dayKey: "2026-04-23",
        punched: true,
        punchType: "default",
      },
    });

    await seedDatabase();

    expect(await prisma.season.findUnique({ where: { id: season.id } })).toBeNull();
    expect(await prisma.seasonMemberStat.count({ where: { seasonId: season.id } })).toBe(0);
    expect(await prisma.punchRecord.count({ where: { seasonId: season.id } })).toBe(0);
  });

  it("should clear coffee records for the seeded team", async () => {
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({
      where: { username: SEED_USERS[0].username },
    });

    await prisma.coffeeRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-23",
      },
    });

    expect(await prisma.coffeeRecord.count({ where: { teamId: user.teamId } })).toBe(1);

    await seedDatabase();

    expect(await prisma.coffeeRecord.count({ where: { teamId: user.teamId } })).toBe(0);
  });

  it("should clear team dynamics and read states for the seeded team", async () => {
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({
      where: { username: SEED_USERS[0].username },
    });
    const dynamic = await prisma.teamDynamic.create({
      data: {
        teamId: user.teamId,
        type: "SEASON_STARTED",
        title: "Seed cleanup dynamic",
        summary: "Should be removed by reseeding",
        payloadJson: JSON.stringify({ source: "seed-test" }),
        sourceType: "seed-test",
        sourceId: "seed-test-dynamic",
        occurredAt: new Date("2026-04-25T08:00:00+08:00"),
      },
    });
    await prisma.teamDynamicReadState.create({
      data: {
        teamDynamicId: dynamic.id,
        userId: user.id,
      },
    });

    await seedDatabase();

    expect(await prisma.teamDynamic.findUnique({ where: { id: dynamic.id } })).toBeNull();
    expect(
      await prisma.teamDynamicReadState.count({
        where: { teamDynamicId: dynamic.id },
      }),
    ).toBe(0);
  });

  it("should not delete seasons that belong to another team", async () => {
    await seedDatabase();

    let otherTeamId: string | null = null;
    let otherSeasonId: string | null = null;

    try {
      const otherTeam = await prisma.team.create({
        data: {
          code: "OTHER-SEED-TEAM",
          name: "Other Seed Team",
        },
      });
      otherTeamId = otherTeam.id;
      const otherSeason = await prisma.season.create({
        data: {
          teamId: otherTeam.id,
          monthKey: "2026-04",
          goalName: "External season",
          status: "ACTIVE",
          targetSlots: 50,
        },
      });
      otherSeasonId = otherSeason.id;

      await seedDatabase();

      expect(await prisma.season.findUnique({ where: { id: otherSeason.id } })).not.toBeNull();
    } finally {
      if (otherSeasonId) {
        await prisma.seasonMemberStat.deleteMany({ where: { seasonId: otherSeasonId } });
        await prisma.season.deleteMany({ where: { id: otherSeasonId } });
      }
      if (otherTeamId) {
        await prisma.activityEvent.deleteMany({ where: { teamId: otherTeamId } });
        await prisma.team.deleteMany({ where: { id: otherTeamId } });
      }
    }
  });

  it("should enforce punch uniqueness by userId and dayKey", async () => {
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({
      where: { username: SEED_USERS[0].username },
    });

    await expect(
      prisma.punchRecord.create({
        data: {
          userId: user.id,
          dayIndex: 999,
          dayKey: SEED_PUNCH_DAY_KEY,
          punched: true,
          punchType: "default",
        },
      }),
    ).rejects.toThrow();
  });

  it("should be idempotent (upsert)", async () => {
    await seedDatabase();
    await seedDatabase();

    const seedUserIds = await prisma.user.findMany({
      where: { username: { in: SEED_USERS.map((user) => user.username) } },
      select: { id: true },
    });
    const userCount = seedUserIds.length;
    const punchCount = await prisma.punchRecord.count({
      where: { userId: { in: seedUserIds.map((user) => user.id) } },
    });
    expect(userCount).toBe(SEED_USERS.length);
    expect(punchCount).toBe(SEED_USERS.length);
  });

  it("should keep the seeded team vault at 50", async () => {
    await seedDatabase();

    const aggregate = await prisma.user.aggregate({
      _sum: { coins: true },
      where: { username: { in: SEED_USERS.map((user) => user.username) } },
    });

    expect(aggregate._sum.coins).toBe(50);
  });

  it("should preserve seeded users' shared board notes by default", async () => {
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({
      where: { username: SEED_USERS[0].username },
    });
    const note = await prisma.boardNote.create({
      data: {
        teamId: user.teamId,
        authorId: user.id,
        type: "ANNOUNCEMENT",
        content: "Seed should preserve this notice",
        color: null,
      },
    });

    await seedDatabase();

    await expect(prisma.boardNote.findUniqueOrThrow({
      where: { id: note.id },
    })).resolves.toMatchObject({
      content: "Seed should preserve this notice",
      authorId: user.id,
    });
  });

  it("should remove extra users outside the seeded roster", async () => {
    await seedDatabase();

    const team = await prisma.team.findUniqueOrThrow({ where: { code: SEED_TEAM.code } });
    const extraUser = await prisma.user.create({
      data: {
        username: "newuser",
        password: "test",
        avatarKey: "male1",
        coins: 0,
        teamId: team.id,
      },
    });
    let otherTeamId: string | null = null;
    let otherSeasonId: string | null = null;

    try {
      const otherTeam = await prisma.team.create({
        data: {
          code: "EXTRA-USER-SEASON",
          name: "Extra User Season Team",
        },
      });
      otherTeamId = otherTeam.id;
      const otherSeason = await prisma.season.create({
        data: {
          teamId: otherTeam.id,
          monthKey: "2026-04",
          goalName: "Extra user season stat",
          targetSlots: 50,
        },
      });
      otherSeasonId = otherSeason.id;
      await prisma.seasonMemberStat.create({
        data: {
          seasonId: otherSeason.id,
          userId: extraUser.id,
          colorIndex: 0,
          memberOrder: 0,
        },
      });

      await seedDatabase();

      const extraUserAfterSeed = await prisma.user.findUnique({ where: { username: "newuser" } });
      expect(extraUserAfterSeed).toBeNull();
    } finally {
      if (otherSeasonId) {
        await prisma.seasonMemberStat.deleteMany({ where: { seasonId: otherSeasonId } });
        await prisma.season.deleteMany({ where: { id: otherSeasonId } });
      }
      if (otherTeamId) {
        await prisma.activityEvent.deleteMany({ where: { teamId: otherTeamId } });
        await prisma.team.deleteMany({ where: { id: otherTeamId } });
      }
    }
  });
});
