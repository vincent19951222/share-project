import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildGamificationOpsDashboard } from "@/lib/gamification/ops-dashboard";
import { prisma } from "@/lib/prisma";

function shanghaiDate(dayKey: string, hour = 10) {
  return new Date(`${dayKey}T${String(hour).padStart(2, "0")}:00:00+08:00`);
}

describe("gamification ops dashboard service", () => {
  const now = new Date("2026-05-02T12:00:00+08:00");
  let teamId: string;
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    teamId = admin.teamId;
    adminId = admin.id;
    memberId = member.id;

    await prisma.user.updateMany({
      where: { teamId },
      data: { coins: 0, ticketBalance: 0 },
    });
    await prisma.lotteryTicketLedger.deleteMany({ where: { teamId } });
    await prisma.lotteryDrawResult.deleteMany({ where: { draw: { teamId } } });
    await prisma.lotteryDraw.deleteMany({ where: { teamId } });
    await prisma.realWorldRedemption.deleteMany({ where: { teamId } });
    await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    await prisma.punchRecord.deleteMany({ where: { user: { teamId } } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("summarizes healthy ticket and coin balances without risk alerts", async () => {
    const punch = await prisma.punchRecord.create({
      data: {
        userId: adminId,
        dayIndex: 2,
        dayKey: "2026-05-02",
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 100,
        baseAssetAwarded: 100,
        boostAssetBonus: 0,
        baseSeasonContribution: 100,
        boostSeasonBonus: 0,
        seasonContributionAwarded: 100,
        countedForSeasonSlot: false,
        createdAt: shanghaiDate("2026-05-02"),
      },
    });
    await prisma.user.update({
      where: { id: adminId },
      data: { coins: 100, ticketBalance: 2 },
    });
    await prisma.lotteryTicketLedger.create({
      data: {
        userId: adminId,
        teamId,
        dayKey: "2026-05-02",
        delta: 2,
        balanceAfter: 2,
        reason: "TEST_GRANTED",
        sourceType: "ops-test-ticket",
        sourceId: punch.id,
        createdAt: shanghaiDate("2026-05-02"),
      },
    });

    const snapshot = await buildGamificationOpsDashboard({ teamId, now, windowDays: 7 });

    expect(snapshot.window).toMatchObject({
      startDayKey: "2026-04-26",
      endDayKey: "2026-05-02",
      days: 7,
    });
    expect(snapshot.metrics).toMatchObject({
      teamMemberCount: 5,
      totalTicketBalance: 2,
      totalCoinBalance: 100,
      ticketBalanceMismatchCount: 0,
      coinBalanceMismatchCount: 0,
      pendingRedemptionCount: 0,
      wechatFailureCount: 0,
    });
    expect(snapshot.risks.find((risk) => risk.key === "asset_integrity")).toMatchObject({
      severity: "ok",
    });
    expect(snapshot.pendingRedemptions).toEqual([]);
  });

  it("flags asset mismatch, hoarding, overdue redemptions, repeated social invites, and wechat failures", async () => {
    await prisma.user.update({
      where: { id: memberId },
      data: { coins: 999, ticketBalance: 35 },
    });
    await prisma.lotteryTicketLedger.create({
      data: {
        userId: memberId,
        teamId,
        dayKey: "2026-05-01",
        delta: 20,
        balanceAfter: 20,
        reason: "TEST_GRANTED",
        sourceType: "ops-test-risk-ticket",
        sourceId: "ticket-risk",
        createdAt: shanghaiDate("2026-05-01"),
      },
    });
    await prisma.realWorldRedemption.create({
      data: {
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
        status: "REQUESTED",
        requestedAt: shanghaiDate("2026-04-28"),
      },
    });
    for (let index = 0; index < 3; index += 1) {
      await prisma.socialInvitation.create({
        data: {
          teamId,
          senderUserId: adminId,
          recipientUserId: memberId,
          invitationType: "DRINK_WATER",
          status: "PENDING",
          dayKey: "2026-05-01",
          message: `喝水 ${index}`,
          createdAt: shanghaiDate("2026-05-01", 10 + index),
        },
      });
    }
    const draw = await prisma.lotteryDraw.create({
      data: {
        userId: memberId,
        teamId,
        drawType: "TEN",
        ticketSpent: 10,
        coinSpent: 40,
        createdAt: shanghaiDate("2026-05-01"),
      },
    });
    await prisma.lotteryDrawResult.create({
      data: {
        drawId: draw.id,
        position: 1,
        rewardId: "reward_luckin_coffee",
        rewardTier: "rare",
        rewardKind: "real_world_redemption",
        rewardSnapshotJson: JSON.stringify({
          id: "reward_luckin_coffee",
          effect: { type: "grant_real_world_redemption", itemId: "luckin_coffee_coupon", quantity: 1 },
        }),
      },
    });
    await prisma.enterpriseWechatSendLog.create({
      data: {
        teamId,
        purpose: "SOCIAL_INVITATION",
        messageType: "markdown",
        status: "FAILED",
        contentPreview: "failed smoke",
        errorMessage: "webhook failed",
        createdAt: shanghaiDate("2026-05-01"),
      },
    });

    const snapshot = await buildGamificationOpsDashboard({ teamId, now, windowDays: 7 });

    expect(snapshot.metrics).toMatchObject({
      totalTicketBalance: 35,
      ticketBalanceMismatchCount: 1,
      coinBalanceMismatchCount: 1,
      pendingRedemptionCount: 1,
      overdueRedemptionCount: 1,
      repeatedDirectInvitationPairCount: 1,
      realWorldRewardCount: 1,
      wechatFailureCount: 1,
    });
    expect(snapshot.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "asset_integrity", severity: "risk" }),
        expect.objectContaining({ key: "ticket_hoarding", severity: "watch" }),
        expect.objectContaining({ key: "redemption_queue", severity: "risk" }),
        expect.objectContaining({ key: "weak_social_frequency", severity: "watch" }),
        expect.objectContaining({ key: "wechat_delivery", severity: "risk" }),
      ]),
    );
    expect(snapshot.pendingRedemptions[0]).toEqual(
      expect.objectContaining({ username: "luo", itemName: "瑞幸咖啡券", ageDays: 4 }),
    );
    expect(snapshot.topTicketBalances[0]).toEqual(
      expect.objectContaining({ username: "luo", value: 35 }),
    );
    expect(snapshot.repeatedDirectInvitations[0]).toEqual(
      expect.objectContaining({ senderUsername: "li", recipientUsername: "luo", count: 3 }),
    );
  });
});
