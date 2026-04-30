import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";
import {
  buildGamificationWeeklyReport,
  buildGamificationWeeklyReportMessage,
  normalizeGamificationReportWeek,
  publishGamificationWeeklyReport,
  WeeklyReportError,
} from "@/lib/gamification/weekly-report";

describe("gamification weekly report service", () => {
  const now = new Date("2026-04-26T10:00:00+08:00");
  let teamId: string;
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    userId = member.id;
    teamId = admin.teamId;

    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.dailyTaskAssignment.deleteMany({ where: { teamId } });
    await prisma.lotteryTicketLedger.deleteMany({ where: { teamId } });
    await prisma.lotteryDrawResult.deleteMany({ where: { draw: { teamId } } });
    await prisma.lotteryDraw.deleteMany({ where: { teamId } });
    await prisma.itemUseRecord.deleteMany({ where: { teamId } });
    await prisma.punchRecord.deleteMany({ where: { user: { teamId } } });
    await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.teamDynamicReadState.deleteMany({
      where: { teamDynamic: { teamId } },
    });
    await prisma.teamDynamic.deleteMany({ where: { teamId } });
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("normalizes Shanghai natural week boundaries", () => {
    expect(normalizeGamificationReportWeek({ now })).toMatchObject({
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      daysInWindow: 7,
    });
    expect(
      normalizeGamificationReportWeek({
        now,
        weekStartDayKey: "2026-04-20",
      }),
    ).toMatchObject({
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      daysInWindow: 7,
    });
    expect(() =>
      normalizeGamificationReportWeek({
        now,
        weekStartDayKey: "2026-04-21",
      }),
    ).toThrow(WeeklyReportError);
  });

  it("returns a safe empty report when the team has no game activity", async () => {
    const snapshot = await buildGamificationWeeklyReport({ teamId, now });

    expect(snapshot).toMatchObject({
      teamId,
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      published: false,
      publishedDynamicId: null,
    });
    expect(snapshot.metrics.taskCompletionRate).toBe(0);
    expect(snapshot.metrics.drawCount).toBe(0);
    expect(snapshot.metricCards.map((card) => card.value)).toEqual(["0%", "0", "0", "0%"]);
    expect(snapshot.summaryCards[0].body).toContain("补给站还在热机");
  });

  it("aggregates tasks, tickets, lottery, boost, social, and game dynamics", async () => {
    await seedWeeklyGameActivity({ teamId, adminId, userId });

    const snapshot = await buildGamificationWeeklyReport({ teamId, now });

    expect(snapshot.metrics).toMatchObject({
      completedTaskCount: 10,
      allFourCompletionDays: 2,
      fitnessTicketsEarned: 3,
      lifeTicketsEarned: 2,
      paidTicketsBought: 1,
      ticketsSpent: 4,
      netTicketChange: 2,
      drawCount: 2,
      singleDrawCount: 1,
      tenDrawCount: 1,
      coinSpent: 40,
      coinRewarded: 25,
      rareRewardCount: 1,
      realWorldRewardCount: 1,
      itemUseCount: 4,
      boostUseCount: 1,
      boostAssetBonusTotal: 40,
      boostSeasonBonusTotal: 40,
      leaveCouponUseCount: 1,
      socialInvitationCount: 2,
      directInvitationCount: 1,
      teamInvitationCount: 1,
      socialResponseCount: 2,
      socialResponseRate: 100,
      gameDynamicCount: 2,
      rarePrizeDynamicCount: 1,
      socialMomentDynamicCount: 1,
    });
    expect(snapshot.metricCards.map((card) => card.label)).toEqual([
      "四维完成率",
      "本周发券",
      "抽奖次数",
      "弱社交响应",
    ]);
    expect(snapshot.highlights.map((highlight) => highlight.sourceType)).toContain("team_dynamic");
  });

  it("builds a concise enterprise wechat message from the snapshot", async () => {
    await seedWeeklyGameActivity({ teamId, adminId, userId });
    const snapshot = await buildGamificationWeeklyReport({ teamId, now });

    const message = buildGamificationWeeklyReportMessage(snapshot);

    expect(message).toContain("【牛马补给周报】");
    expect(message).toContain("四维完成率");
    expect(message).toContain("抽奖");
  });

  it("publishes idempotently to Team Dynamics and does not require enterprise wechat", async () => {
    await seedWeeklyGameActivity({ teamId, adminId, userId });

    const first = await publishGamificationWeeklyReport({
      teamId,
      publisherUserId: adminId,
      weekStartDayKey: "2026-04-20",
      sendEnterpriseWechat: false,
      now,
    });
    const second = await publishGamificationWeeklyReport({
      teamId,
      publisherUserId: adminId,
      weekStartDayKey: "2026-04-20",
      sendEnterpriseWechat: false,
      now,
    });

    expect(first.teamDynamic.status).toBe("CREATED");
    expect(second.teamDynamic.status).toBe("EXISTING");
    expect(first.teamDynamic.id).toBe(second.teamDynamic.id);
    expect(first.wechat.status).toBe("NOT_REQUESTED");
    expect(
      await prisma.teamDynamic.count({
        where: {
          teamId,
          sourceType: "gamification_weekly_report",
          sourceId: `${teamId}:2026-04-20`,
        },
      }),
    ).toBe(1);
  });
});

async function seedWeeklyGameActivity(input: {
  teamId: string;
  adminId: string;
  userId: string;
}) {
  const { teamId, adminId, userId } = input;
  const days = ["2026-04-20", "2026-04-21", "2026-04-22"];

  for (const dayKey of days) {
    for (const dimensionKey of ["movement", "hydration", "social", "learning"]) {
      await prisma.dailyTaskAssignment.create({
        data: {
          teamId,
          userId: adminId,
          dayKey,
          dimensionKey,
          taskCardId: `${dimensionKey}_001`,
          completedAt: new Date(`${dayKey}T02:00:00.000Z`),
        },
      });
    }
  }

  await prisma.dailyTaskAssignment.deleteMany({
    where: {
      userId: adminId,
      dayKey: "2026-04-22",
      dimensionKey: { in: ["social", "learning"] },
    },
  });

  await prisma.lotteryTicketLedger.createMany({
    data: [
      { teamId, userId: adminId, dayKey: "2026-04-20", delta: 1, balanceAfter: 1, reason: "FITNESS_PUNCH_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-21", delta: 1, balanceAfter: 2, reason: "FITNESS_PUNCH_GRANTED" },
      { teamId, userId, dayKey: "2026-04-21", delta: 1, balanceAfter: 1, reason: "FITNESS_PUNCH_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-20", delta: 1, balanceAfter: 2, reason: "DAILY_TASKS_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-21", delta: 1, balanceAfter: 3, reason: "DAILY_TASKS_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-22", delta: 1, balanceAfter: 4, reason: "COIN_PURCHASE_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-22", delta: -4, balanceAfter: 0, reason: "LOTTERY_DRAW_SPENT" },
    ],
  });

  const singleDraw = await prisma.lotteryDraw.create({
    data: {
      teamId,
      userId: adminId,
      drawType: "SINGLE",
      ticketSpent: 1,
      coinSpent: 0,
      createdAt: new Date("2026-04-22T03:00:00.000Z"),
    },
  });
  await prisma.lotteryDrawResult.create({
    data: {
      drawId: singleDraw.id,
      position: 1,
      rewardId: "coins_025",
      rewardTier: "common",
      rewardKind: "coins",
      rewardSnapshotJson: JSON.stringify({ name: "25 银子", coins: 25 }),
    },
  });

  const tenDraw = await prisma.lotteryDraw.create({
    data: {
      teamId,
      userId: adminId,
      drawType: "TEN",
      ticketSpent: 3,
      coinSpent: 40,
      createdAt: new Date("2026-04-23T03:00:00.000Z"),
    },
  });
  await prisma.lotteryDrawResult.createMany({
    data: [
      {
        drawId: tenDraw.id,
        position: 1,
        rewardId: "double_niuma_coupon",
        rewardTier: "rare",
        rewardKind: "item",
        rewardSnapshotJson: JSON.stringify({ name: "双倍牛马券" }),
      },
      {
        drawId: tenDraw.id,
        position: 2,
        rewardId: "luckin_coffee_coupon",
        rewardTier: "real_world",
        rewardKind: "item",
        rewardSnapshotJson: JSON.stringify({ name: "瑞幸咖啡券" }),
      },
    ],
  });

  await prisma.itemUseRecord.createMany({
    data: [
      {
        id: "boost_use_1",
        teamId,
        userId: adminId,
        itemId: "double_niuma_coupon",
        status: "SETTLED",
        targetType: "PUNCH_RECORD",
        targetId: "punch_boost_1",
        dayKey: "2026-04-23",
        effectSnapshotJson: JSON.stringify({
          type: "fitness_coin_and_season_multiplier",
          multiplier: 2,
        }),
        settledAt: new Date("2026-04-23T03:10:00.000Z"),
      },
      {
        id: "leave_use_1",
        teamId,
        userId,
        itemId: "fitness_leave_coupon",
        status: "SETTLED",
        targetType: "FITNESS_STREAK",
        targetId: null,
        dayKey: "2026-04-24",
        effectSnapshotJson: JSON.stringify({ type: "fitness_streak_protection" }),
        settledAt: new Date("2026-04-24T03:10:00.000Z"),
      },
      {
        id: "social_use_1",
        teamId,
        userId: adminId,
        itemId: "drink_water_ping",
        status: "SETTLED",
        targetType: "SOCIAL_INVITATION",
        targetId: null,
        dayKey: "2026-04-24",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
        settledAt: new Date("2026-04-24T03:15:00.000Z"),
      },
      {
        id: "social_use_2",
        teamId,
        userId: adminId,
        itemId: "team_standup_ping",
        status: "SETTLED",
        targetType: "SOCIAL_INVITATION",
        targetId: null,
        dayKey: "2026-04-24",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
        settledAt: new Date("2026-04-24T03:20:00.000Z"),
      },
    ],
  });

  await prisma.punchRecord.create({
    data: {
      id: "punch_boost_1",
      userId: adminId,
      dayIndex: 23,
      dayKey: "2026-04-23",
      punched: true,
      punchType: "default",
      assetAwarded: 80,
      baseAssetAwarded: 40,
      boostAssetBonus: 40,
      baseSeasonContribution: 40,
      boostSeasonBonus: 40,
      seasonContributionAwarded: 80,
      boostItemUseRecordId: "boost_use_1",
    },
  });

  const direct = await prisma.socialInvitation.create({
    data: {
      teamId,
      senderUserId: adminId,
      recipientUserId: userId,
      invitationType: "DRINK_WATER",
      itemUseRecordId: "social_use_1",
      status: "RESPONDED",
      dayKey: "2026-04-24",
      message: "喝水一下",
      respondedAt: new Date("2026-04-24T03:00:00.000Z"),
    },
  });
  const teamWide = await prisma.socialInvitation.create({
    data: {
      teamId,
      senderUserId: adminId,
      recipientUserId: null,
      invitationType: "TEAM_STANDUP",
      itemUseRecordId: "social_use_2",
      status: "RESPONDED",
      dayKey: "2026-04-24",
      message: "全员起立",
      respondedAt: new Date("2026-04-24T03:30:00.000Z"),
    },
  });
  await prisma.socialInvitationResponse.createMany({
    data: [
      { teamId, invitationId: direct.id, responderUserId: userId, dayKey: "2026-04-24" },
      { teamId, invitationId: teamWide.id, responderUserId: userId, dayKey: "2026-04-24" },
    ],
  });

  await prisma.teamDynamic.createMany({
    data: [
      {
        teamId,
        type: "GAME_RARE_PRIZE",
        title: "li 抽中了瑞幸咖啡券",
        summary: "补给站出大货了",
        payloadJson: "{}",
        actorUserId: adminId,
        sourceType: "lottery_draw_result",
        sourceId: "rare_result_1",
        importance: "high",
        occurredAt: new Date("2026-04-23T04:00:00.000Z"),
      },
      {
        teamId,
        type: "GAME_SOCIAL_MOMENT",
        title: "全员起立令收到 2 个响应",
        summary: "办公室还没完全冷掉",
        payloadJson: "{}",
        actorUserId: adminId,
        sourceType: "social_invitation_moment",
        sourceId: teamWide.id,
        importance: "normal",
        occurredAt: new Date("2026-04-24T04:00:00.000Z"),
      },
    ],
  });
}
