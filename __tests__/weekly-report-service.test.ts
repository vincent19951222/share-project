import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { WeeklyReportSnapshot } from "@/lib/weekly-report";
import {
  WeeklyReportServiceError,
  buildWeeklyReportSnapshot,
  getCurrentWeeklyReportDraft,
  publishWeeklyReportDraft,
  upsertWeeklyReportDraft,
} from "@/lib/weekly-report-service";

const REPORT_NOW = new Date("2026-04-30T10:00:00+08:00");
const PUBLISH_NOW = new Date("2026-04-30T12:00:00+08:00");

const TEAM_ID = "weekly-report-team";
const TEAM_CODE = "WEEKLY-REPORT-SVC";
const ADMIN_ID = "weekly-report-admin";
const ADMIN_TWO_ID = "weekly-report-admin-two";
const MEMBER_A_ID = "weekly-report-member-a";
const MEMBER_B_ID = "weekly-report-member-b";
const SEASON_ID = "weekly-report-season";
const OUTSIDER_TEAM_ID = "weekly-report-outsider-team";
const OUTSIDER_ID = "weekly-report-outsider";
const OUTSIDER_TEAM_CODE = "WEEKLY-REPORT-OUT";

const USERS = [
  {
    id: ADMIN_ID,
    username: "weekly_report_admin",
    avatarKey: "male1",
    role: "ADMIN",
    createdAt: new Date("2026-04-01T08:00:00+08:00"),
  },
  {
    id: ADMIN_TWO_ID,
    username: "weekly_report_admin_two",
    avatarKey: "female2",
    role: "ADMIN",
    createdAt: new Date("2026-04-01T08:00:30+08:00"),
  },
  {
    id: MEMBER_A_ID,
    username: "weekly_report_member_a",
    avatarKey: "male2",
    role: "MEMBER",
    createdAt: new Date("2026-04-01T08:01:00+08:00"),
  },
  {
    id: MEMBER_B_ID,
    username: "weekly_report_member_b",
    avatarKey: "female1",
    role: "MEMBER",
    createdAt: new Date("2026-04-01T08:02:00+08:00"),
  },
] as const;

function createPunchRecord(userId: string, dayKey: string) {
  return {
    userId,
    seasonId: null,
    dayIndex: Number(dayKey.slice(8, 10)),
    dayKey,
    punched: true,
    punchType: "default",
    streakAfterPunch: 1,
    assetAwarded: 10,
    countedForSeasonSlot: false,
    createdAt: new Date(`${dayKey}T08:00:00+08:00`),
  };
}

function createCoffeeRecord(userId: string, dayKey: string, createdAt: string, deletedAt?: string) {
  return {
    userId,
    teamId: TEAM_ID,
    dayKey,
    createdAt: new Date(createdAt),
    deletedAt: deletedAt ? new Date(deletedAt) : null,
  };
}

async function cleanupFixture() {
  vi.restoreAllMocks();
  await prisma.teamDynamicReadState.deleteMany({
    where: {
      OR: [
        { userId: { in: [...USERS.map((user) => user.id), OUTSIDER_ID] } },
        { teamDynamic: { teamId: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } },
      ],
    },
  });
  await prisma.teamDynamic.deleteMany({ where: { teamId: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } });
  await prisma.weeklyReportDraft.deleteMany({ where: { teamId: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } });
  await prisma.boardNote.deleteMany({ where: { teamId: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } });
  await prisma.activityEvent.deleteMany({ where: { teamId: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } });
  await prisma.coffeeRecord.deleteMany({ where: { teamId: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } });
  await prisma.punchRecord.deleteMany({
    where: { userId: { in: [...USERS.map((user) => user.id), OUTSIDER_ID] } },
  });
  await prisma.seasonMemberStat.deleteMany({ where: { seasonId: SEASON_ID } });
  await prisma.season.deleteMany({ where: { id: SEASON_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [...USERS.map((user) => user.id), OUTSIDER_ID] } } });
  await prisma.team.deleteMany({ where: { id: { in: [TEAM_ID, OUTSIDER_TEAM_ID] } } });
}

async function seedFixture() {
  await prisma.team.createMany({
    data: [
      {
        id: TEAM_ID,
        code: TEAM_CODE,
        name: "周报测试队",
        createdAt: new Date("2026-04-01T08:00:00+08:00"),
      },
      {
        id: OUTSIDER_TEAM_ID,
        code: OUTSIDER_TEAM_CODE,
        name: "外队",
        createdAt: new Date("2026-04-01T08:05:00+08:00"),
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      ...USERS.map((user) => ({
        ...user,
        password: "test-password",
        teamId: TEAM_ID,
        currentStreak: 0,
        lastPunchDayKey: null,
        coins: 10,
      })),
      {
        id: OUTSIDER_ID,
        username: "weekly_report_outsider",
        password: "test-password",
        avatarKey: "male3",
        role: "MEMBER",
        teamId: OUTSIDER_TEAM_ID,
        currentStreak: 0,
        lastPunchDayKey: null,
        coins: 10,
        createdAt: new Date("2026-04-01T08:06:00+08:00"),
      },
    ],
  });

  await prisma.season.create({
    data: {
      id: SEASON_ID,
      teamId: TEAM_ID,
      monthKey: "2026-04",
      goalName: "四月脱脂冲刺",
      status: "ACTIVE",
      targetSlots: 50,
      filledSlots: 12,
      startedAt: new Date("2026-04-01T09:00:00+08:00"),
    },
  });

  await prisma.punchRecord.createMany({
    data: [
      createPunchRecord(ADMIN_ID, "2026-04-27"),
      createPunchRecord(MEMBER_A_ID, "2026-04-27"),
      createPunchRecord(MEMBER_B_ID, "2026-04-27"),
      createPunchRecord(ADMIN_ID, "2026-04-28"),
      createPunchRecord(MEMBER_A_ID, "2026-04-28"),
      createPunchRecord(ADMIN_ID, "2026-04-30"),
    ],
  });

  await prisma.coffeeRecord.createMany({
    data: [
      createCoffeeRecord(ADMIN_ID, "2026-04-27", "2026-04-27T09:00:00+08:00"),
      createCoffeeRecord(MEMBER_A_ID, "2026-04-28", "2026-04-28T09:00:00+08:00"),
      createCoffeeRecord(MEMBER_A_ID, "2026-04-28", "2026-04-28T09:05:00+08:00"),
      createCoffeeRecord(MEMBER_A_ID, "2026-04-28", "2026-04-28T09:10:00+08:00"),
      createCoffeeRecord(MEMBER_B_ID, "2026-04-29", "2026-04-29T09:00:00+08:00"),
      createCoffeeRecord(ADMIN_ID, "2026-04-30", "2026-04-30T09:00:00+08:00"),
      createCoffeeRecord(
        MEMBER_B_ID,
        "2026-04-30",
        "2026-04-30T09:05:00+08:00",
        "2026-04-30T10:05:00+08:00",
      ),
      createCoffeeRecord(OUTSIDER_ID, "2026-04-28", "2026-04-28T11:00:00+08:00"),
      createCoffeeRecord(OUTSIDER_ID, "2026-04-29", "2026-04-29T11:30:00+08:00"),
    ],
  });
}

describe("weekly-report service", () => {
  beforeEach(async () => {
    await cleanupFixture();
    await seedFixture();
  });

  afterAll(async () => {
    await cleanupFixture();
    await prisma.$disconnect();
  });

  it("builds a deterministic snapshot from seeded persisted data", async () => {
    const snapshot = await buildWeeklyReportSnapshot({
      teamId: TEAM_ID,
      generatedByUserId: ADMIN_ID,
      now: REPORT_NOW,
    });

    expect(snapshot).toMatchObject({
      version: 1,
      weekStartDayKey: "2026-04-27",
      weekEndDayKey: "2026-04-30",
      generatedByUserId: ADMIN_ID,
      summary: "本周打卡 6 次，全勤 0 天，赛季进度 12/50。",
      metrics: {
        totalPunches: 6,
        fullAttendanceDays: 0,
        peakDay: { dayKey: "2026-04-27", value: 3 },
        lowDay: { dayKey: "2026-04-29", value: 0 },
        seasonProgress: { filledSlots: 12, targetSlots: 50, status: "ACTIVE" },
      },
      highlights: {
        topMembers: [
          {
            userId: ADMIN_ID,
            label: "本周高光",
            value: "weekly_report_admin · 3 次有效打卡",
          },
          {
            userId: MEMBER_A_ID,
            label: "本周高光",
            value: "weekly_report_member_a · 2 次有效打卡",
          },
          {
            userId: MEMBER_B_ID,
            label: "本周高光",
            value: "weekly_report_member_b · 1 次有效打卡",
          },
        ],
        coffee: {
          userId: MEMBER_A_ID,
          label: "续命担当",
          value: "weekly_report_member_a · 3 杯咖啡",
        },
      },
    });
    expect(snapshot.sections[2]?.bullets[0]).toBe("团队本周共喝了 6 杯咖啡");
    expect(snapshot.sections).toHaveLength(3);
    expect(snapshot.sections.map((section) => section.id)).toEqual([
      "overview",
      "members",
      "coffee",
    ]);
  });

  it("keeps current-week drafts private between admins on the same team", async () => {
    const draft = await upsertWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });

    const ownDraft = await getCurrentWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });
    const otherAdminDraft = await getCurrentWeeklyReportDraft({
      userId: ADMIN_TWO_ID,
      now: REPORT_NOW,
    });

    expect(ownDraft?.id).toBe(draft.id);
    expect(otherAdminDraft).toBeNull();
  });

  it("rejects non-admin draft and publish operations", async () => {
    await expect(
      upsertWeeklyReportDraft({
        userId: MEMBER_A_ID,
        now: REPORT_NOW,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<WeeklyReportServiceError>);

    await expect(
      getCurrentWeeklyReportDraft({
        userId: MEMBER_A_ID,
        now: REPORT_NOW,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<WeeklyReportServiceError>);

    await expect(
      publishWeeklyReportDraft({
        userId: MEMBER_A_ID,
        now: PUBLISH_NOW,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<WeeklyReportServiceError>);
  });

  it("errors when publishing the current week without a draft", async () => {
    await expect(
      publishWeeklyReportDraft({
        userId: ADMIN_ID,
        now: PUBLISH_NOW,
      }),
    ).rejects.toMatchObject({
      code: "DRAFT_NOT_FOUND",
      status: 404,
    } satisfies Partial<WeeklyReportServiceError>);
  });

  it("upserts and overwrites the current admin draft for the same week", async () => {
    const firstDraft = await upsertWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });

    await prisma.punchRecord.create({
      data: createPunchRecord(MEMBER_B_ID, "2026-04-30"),
    });

    const secondDraft = await upsertWeeklyReportDraft({
      userId: ADMIN_ID,
      now: new Date("2026-04-30T11:00:00+08:00"),
    });

    const storedDraft = await getCurrentWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });

    expect(secondDraft.id).toBe(firstDraft.id);
    expect(secondDraft.snapshot.metrics.totalPunches).toBe(7);
    expect(storedDraft).not.toBeNull();
    expect(storedDraft?.id).toBe(firstDraft.id);
    expect(storedDraft?.snapshot.metrics.totalPunches).toBe(7);
    expect(
      await prisma.weeklyReportDraft.count({
        where: {
          teamId: TEAM_ID,
          createdByUserId: ADMIN_ID,
          weekStartDayKey: "2026-04-27",
        },
      }),
    ).toBe(1);
  });

  it("publishes and reuses one team dynamic for the same team and week", async () => {
    await upsertWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });

    const firstDynamic = await publishWeeklyReportDraft({
      userId: ADMIN_ID,
      now: PUBLISH_NOW,
    });
    const secondDynamic = await publishWeeklyReportDraft({
      userId: ADMIN_ID,
      now: new Date("2026-04-30T12:05:00+08:00"),
    });

    expect(firstDynamic.type).toBe("WEEKLY_REPORT_CREATED");
    expect(firstDynamic.sourceType).toBe("weekly-report");
    expect(firstDynamic.sourceId).toBe(`${TEAM_ID}:2026-04-27`);
    expect(secondDynamic.id).toBe(firstDynamic.id);
    expect(
      await prisma.teamDynamic.count({
        where: {
          teamId: TEAM_ID,
          type: "WEEKLY_REPORT_CREATED",
        },
      }),
    ).toBe(1);
  });

  it("publishes the stored draft snapshot instead of recomputing current data", async () => {
    const draft = await upsertWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });

    await prisma.punchRecord.create({
      data: createPunchRecord(MEMBER_B_ID, "2026-04-30"),
    });
    await prisma.coffeeRecord.create({
      data: createCoffeeRecord(MEMBER_B_ID, "2026-04-30", "2026-04-30T11:30:00+08:00"),
    });

    const latestSnapshot = await buildWeeklyReportSnapshot({
      teamId: TEAM_ID,
      generatedByUserId: ADMIN_ID,
      now: REPORT_NOW,
    });
    const dynamic = await publishWeeklyReportDraft({
      userId: ADMIN_ID,
      now: PUBLISH_NOW,
    });
    const publishedSnapshot = JSON.parse(dynamic.payloadJson) as WeeklyReportSnapshot;

    expect(latestSnapshot.metrics.totalPunches).toBe(7);
    expect(draft.snapshot.metrics.totalPunches).toBe(6);
    expect(publishedSnapshot.metrics.totalPunches).toBe(6);
    expect(publishedSnapshot.summary).toBe(draft.snapshot.summary);
    expect(dynamic.summary).toBe(draft.summary);
  });

  it("falls back to the existing weekly team dynamic when publish hits a source-key race", async () => {
    await upsertWeeklyReportDraft({
      userId: ADMIN_ID,
      now: REPORT_NOW,
    });

    const existing = await prisma.teamDynamic.create({
      data: {
        teamId: TEAM_ID,
        type: "WEEKLY_REPORT_CREATED",
        title: "本周战报已经生成",
        summary: "已有周报",
        payloadJson: JSON.stringify({ reused: true }),
        actorUserId: ADMIN_ID,
        sourceType: "weekly-report",
        sourceId: `${TEAM_ID}:2026-04-27`,
        occurredAt: PUBLISH_NOW,
      },
    });

    const findUniqueSpy = vi.spyOn(prisma.teamDynamic, "findUnique");
    findUniqueSpy.mockResolvedValueOnce(null as never);
    const createSpy = vi.spyOn(prisma.teamDynamic, "create");
    createSpy.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
      }),
    );

    const published = await publishWeeklyReportDraft({
      userId: ADMIN_ID,
      now: PUBLISH_NOW,
    });

    expect(published.id).toBe(existing.id);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(findUniqueSpy).toHaveBeenCalled();
  });
});
