import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/state", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/gamification/state", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns a shell snapshot with four dimensions and empty assignments", async () => {
    const response = await GET(request(userId));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot).toMatchObject({
      currentUserId: userId,
      teamId,
      dayKey: getShanghaiDayKey(),
      ticketBalance: 0,
      ticketSummary: {
        maxFreeTicketsToday: 2,
        todayEarned: 0,
        todaySpent: 0,
        lifeTicketEarned: false,
        fitnessTicketEarned: false,
      },
      lottery: {
        status: "active",
        singleDrawEnabled: false,
        tenDrawEnabled: false,
        tenDrawTopUpRequired: 10,
        tenDrawTopUpCoinCost: 400,
        dailyTopUpPurchased: 0,
        dailyTopUpLimit: 3,
        ticketPrice: 40,
      },
      backpack: {
        totalQuantity: 0,
        previewItems: [],
      },
      social: {
        status: "placeholder",
        pendingSentCount: 0,
        pendingReceivedCount: 0,
      },
    });

    expect(body.snapshot.dimensions.map((dimension: { key: string }) => dimension.key)).toEqual([
      "movement",
      "hydration",
      "social",
      "learning",
    ]);
    expect(
      body.snapshot.dimensions.every(
        (dimension: { assignment: unknown }) => dimension.assignment === null,
      ),
    ).toBe(true);
  });

  it("includes existing task, inventory, draw, ticket, and social summaries", async () => {
    const dayKey = getShanghaiDayKey();
    const teammate = await prisma.user.findFirstOrThrow({
      where: {
        teamId,
        NOT: { id: userId },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 3 },
    });

    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey,
        dimensionKey: "movement",
        taskCardId: "movement_001",
        completedAt: new Date(`${dayKey}T08:30:00.000Z`),
      },
    });

    await prisma.lotteryTicketLedger.createMany({
      data: [
        {
          userId,
          teamId,
          dayKey,
          delta: 1,
          balanceAfter: 1,
          reason: "DAILY_TASKS_GRANTED",
        },
        {
          userId,
          teamId,
          dayKey,
          delta: -1,
          balanceAfter: 0,
          reason: "LOTTERY_DRAW_SPENT",
        },
      ],
    });

    await prisma.inventoryItem.create({
      data: {
        userId,
        teamId,
        itemId: "task_reroll_coupon",
        quantity: 2,
      },
    });

    await prisma.lotteryDraw.create({
      data: {
        userId,
        teamId,
        drawType: "SINGLE",
        ticketSpent: 1,
        results: {
          create: {
            position: 1,
            rewardId: "coins_005",
            rewardTier: "coin",
            rewardKind: "coins",
            rewardSnapshotJson: JSON.stringify({ amount: 5 }),
          },
        },
      },
    });

    const sentUse = await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "drink_water_ping",
        dayKey,
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: userId,
        recipientUserId: teammate.id,
        invitationType: "DRINK_WATER",
        itemUseRecordId: sentUse.id,
        status: "PENDING",
        dayKey,
        message: "喝水，别把自己腌入味。",
      },
    });

    const receivedUse = await prisma.itemUseRecord.create({
      data: {
        userId: teammate.id,
        teamId,
        itemId: "walk_ping",
        dayKey,
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: teammate.id,
        recipientUserId: userId,
        invitationType: "WALK",
        itemUseRecordId: receivedUse.id,
        status: "PENDING",
        dayKey,
        message: "出去溜达一圈。",
      },
    });

    const response = await GET(request(userId));

    expect(response.status).toBe(200);

    const body = await response.json();
    const movement = body.snapshot.dimensions.find(
      (dimension: { key: string }) => dimension.key === "movement",
    );

    expect(movement.assignment).toMatchObject({
      taskCardId: "movement_001",
      title: "工位重启",
      status: "completed",
    });
    expect(body.snapshot.ticketBalance).toBe(3);
    expect(body.snapshot.ticketSummary).toMatchObject({
      todayEarned: 1,
      todaySpent: 1,
      lifeTicketEarned: true,
    });
    expect(body.snapshot.backpack).toMatchObject({
      totalQuantity: 2,
      previewItems: [
        expect.objectContaining({
          itemId: "task_reroll_coupon",
          name: "任务换班券",
          quantity: 2,
        }),
      ],
    });
    expect(body.snapshot.lottery.recentDraws).toHaveLength(1);
    expect(body.snapshot.social).toMatchObject({
      pendingSentCount: 1,
      pendingReceivedCount: 1,
    });
  });
});
