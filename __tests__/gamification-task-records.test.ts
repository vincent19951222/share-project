import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildSupplyTaskRecordSnapshot } from "@/lib/gamification/task-records";
import { prisma } from "@/lib/prisma";
import type { SupplyTaskRecordSnapshot } from "@/lib/types";

function expectDescendingTimeline(timeline: SupplyTaskRecordSnapshot["timeline"]) {
  const timestamps = timeline.map((row) => new Date(row.occurredAt).getTime());
  const sorted = [...timestamps].sort((a, b) => b - a);

  expect(timestamps).toEqual(sorted);
}

describe("supply task record aggregator", () => {
  let userId: string;
  let teammateId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const teammate = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });

    userId = user.id;
    teammateId = teammate.id;
    teamId = user.teamId;

    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey: "2026-05-25",
        dimensionKey: "movement",
        taskCardId: "movement_001",
        completedAt: new Date("2026-05-25T08:00:00+08:00"),
        completionText: "站起来活动 3 分钟",
      },
    });
    await prisma.experienceLedger.create({
      data: {
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 50,
        balanceAfter: 50,
        reason: "DAILY_TASK_COMPLETION_EXP",
        sourceType: "daily_task_assignment",
        sourceId: "assignment-1",
        createdAt: new Date("2026-05-25T09:00:00+08:00"),
      },
    });
    await prisma.lotteryTicketLedger.create({
      data: {
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 1,
        balanceAfter: 3,
        reason: "DAILY_TASKS_GRANTED",
        sourceType: "daily_task",
        sourceId: "ticket-ledger-1",
        createdAt: new Date("2026-05-25T09:30:00+08:00"),
      },
    });
    await prisma.shopPurchase.create({
      data: {
        userId,
        teamId,
        itemId: "task_reroll_coupon",
        quantity: 1,
        unitPriceCoins: 150,
        totalPriceCoins: 150,
        dayKey: "2026-05-25",
        weekKey: "2026-05-25",
        status: "SETTLED",
        createdAt: new Date("2026-05-25T10:00:00+08:00"),
      },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "task_reroll_coupon",
        dayKey: "2026-05-25",
        status: "SETTLED",
        effectSnapshotJson: JSON.stringify({ type: "task_reroll" }),
        settledAt: new Date("2026-05-25T10:20:00+08:00"),
        createdAt: new Date("2026-05-25T10:15:00+08:00"),
      },
    });
    await prisma.lotteryDraw.create({
      data: {
        userId,
        teamId,
        drawType: "SINGLE",
        ticketSpent: 1,
        coinSpent: 0,
        createdAt: new Date("2026-05-25T10:30:00+08:00"),
        results: {
          create: {
            position: 1,
            rewardId: "task_reroll_coupon",
            rewardTier: "R",
            rewardKind: "item",
            rewardSnapshotJson: JSON.stringify({
              id: "task_reroll_coupon",
              tier: "R",
              kind: "item",
              name: "任务换班券",
              description: "换一张任务卡。",
              effectSummary: "任务换班",
            }),
          },
        },
      },
    });
    await prisma.realWorldRedemption.create({
      data: {
        userId,
        teamId,
        itemId: "luckin_coffee_coupon",
        status: "REQUESTED",
        requestedAt: new Date("2026-05-25T11:00:00+08:00"),
      },
    });
    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: userId,
        recipientUserId: teammateId,
        invitationType: "coffee_walk",
        status: "RESPONDED",
        dayKey: "2026-05-25",
        message: "去走两步？",
        respondedAt: new Date("2026-05-25T11:20:00+08:00"),
        createdAt: new Date("2026-05-25T11:10:00+08:00"),
      },
    });
    await prisma.socialInvitationResponse.create({
      data: {
        invitationId: invitation.id,
        teamId,
        responderUserId: teammateId,
        dayKey: "2026-05-25",
        responseText: "走！",
        createdAt: new Date("2026-05-25T11:20:00+08:00"),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("builds seven date tabs and timeline rows from real tables", async () => {
    const snapshot = await buildSupplyTaskRecordSnapshot({
      userId,
      teamId,
      now: new Date("2026-05-25T12:00:00+08:00"),
    });

    expect(snapshot.dates).toHaveLength(7);
    expect(snapshot.dates[0]).toMatchObject({
      key: "2026-05-25",
      label: "今天",
      dateLabel: "05/25",
      weekday: "周一",
    });
    expect(snapshot.dates[1]).toMatchObject({
      key: "2026-05-24",
      label: "昨天",
    });
    expect(snapshot.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "task", title: "完成任务" }),
        expect.objectContaining({ category: "draw", title: "补给抽卡" }),
        expect.objectContaining({ category: "ticket", title: "抽奖券收入" }),
        expect.objectContaining({ category: "exp", title: "获得 EXP" }),
        expect.objectContaining({ category: "shop", title: "购买补给" }),
        expect.objectContaining({ category: "item", title: "使用补给" }),
        expect.objectContaining({ category: "redemption", title: "真实福利兑换" }),
        expect.objectContaining({ category: "social", title: "队友雷达" }),
      ]),
    );
    expectDescendingTimeline(snapshot.timeline);
  });
});
