import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
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
        dailyTopUpLimit: 10,
        ticketPrice: 40,
      },
      backpack: {
        status: "active",
        totalQuantity: 0,
        ownedItemCount: 0,
        previewItems: [],
        groups: [],
        todayEffects: [],
      },
      social: {
        status: "active",
        pendingSentCount: 0,
        pendingReceivedCount: 0,
        teamWidePendingCount: 0,
        sent: [],
        received: [],
        teamWide: [],
        recentResponses: [],
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

  it("enables ten draw top-up when four tickets can be filled with coins", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ticketBalance: 4,
        coins: 500,
      },
    });

    const response = await GET(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.snapshot.lottery).toMatchObject({
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 6,
      tenDrawTopUpCoinCost: 240,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "还差 6 张券，可用 240 银子补齐十连。",
    });
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

    await prisma.inventoryItem.createMany({
      data: [
        {
          userId,
          teamId,
          itemId: "small_boost_coupon",
          quantity: 1,
        },
        {
          userId,
          teamId,
          itemId: "luckin_coffee_coupon",
          quantity: 2,
        },
      ],
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
        invitationType: "WALK_AROUND",
        itemUseRecordId: receivedUse.id,
        status: "PENDING",
        dayKey,
        message: "出去溜达一圈。",
      },
    });

    const teamWideUse = await prisma.itemUseRecord.create({
      data: {
        userId: teammate.id,
        teamId,
        itemId: "team_standup_ping",
        dayKey,
        status: "SETTLED",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    const teamWideInvitation = await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: teammate.id,
        recipientUserId: null,
        invitationType: "TEAM_STANDUP",
        itemUseRecordId: teamWideUse.id,
        status: "PENDING",
        dayKey,
        message: "全员起立两分钟",
      },
    });

    await prisma.socialInvitationResponse.create({
      data: {
        teamId,
        invitationId: teamWideInvitation.id,
        responderUserId: userId,
        dayKey,
        responseText: "已起立",
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
      status: "active",
      totalQuantity: 3,
      ownedItemCount: 2,
    });
    expect(body.snapshot.backpack.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "boost",
          totalQuantity: 1,
        }),
        expect.objectContaining({
          category: "real_world",
          totalQuantity: 2,
        }),
      ]),
    );
    expect(body.snapshot.backpack.groups[0].items[0]).toEqual(
      expect.objectContaining({
        itemId: "small_boost_coupon",
        quantity: 1,
        effectSummary: expect.any(String),
        usageLimitSummary: expect.any(String),
      }),
    );
    expect(body.snapshot.backpack.todayEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: "drink_water_ping",
          status: "PENDING",
        }),
      ]),
    );
    expect(body.snapshot.lottery.recentDraws).toHaveLength(1);
    expect(body.snapshot.social).toMatchObject({
      status: "active",
      pendingSentCount: 1,
      pendingReceivedCount: 1,
      teamWidePendingCount: 1,
    });
    expect(body.snapshot.social.sent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          senderUserId: userId,
          recipientUserId: teammate.id,
          invitationType: "DRINK_WATER",
          responseCount: 0,
        }),
      ]),
    );
    expect(body.snapshot.social.received).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          senderUserId: teammate.id,
          recipientUserId: userId,
          invitationType: "WALK_AROUND",
        }),
      ]),
    );
    expect(body.snapshot.social.teamWide).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: teamWideInvitation.id,
          recipientUserId: null,
          responseCount: 1,
        }),
      ]),
    );
    expect(body.snapshot.social.recentResponses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invitationId: teamWideInvitation.id,
          responderUserId: userId,
          responseText: "已起立",
        }),
      ]),
    );
    expect(body.snapshot.social.availableRecipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: teammate.id,
          username: teammate.username,
        }),
      ]),
    );
    expect(
      body.snapshot.social.availableRecipients.some(
        (member: { userId: string }) => member.userId === userId,
      ),
    ).toBe(false);
  });

  it("includes current user redemptions and admin pending queue", async () => {
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const redemption = await prisma.realWorldRedemption.create({
      data: {
        userId: member.id,
        teamId,
        itemId: "luckin_coffee_coupon",
        status: "REQUESTED",
      },
    });

    const adminResponse = await GET(request(userId));
    const adminBody = await adminResponse.json();

    expect(adminResponse.status).toBe(200);
    expect(adminBody.snapshot.currentUserRole).toBe("ADMIN");
    expect(adminBody.snapshot.redemptions.adminQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: redemption.id,
          username: "luo",
          itemName: getItemDefinition("luckin_coffee_coupon")?.name,
          status: "REQUESTED",
        }),
      ]),
    );

    const memberResponse = await GET(request(member.id));
    const memberBody = await memberResponse.json();

    expect(memberResponse.status).toBe(200);
    expect(memberBody.snapshot.currentUserRole).toBe("MEMBER");
    expect(memberBody.snapshot.redemptions.mine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: redemption.id,
          status: "REQUESTED",
          statusLabel: "待管理员确认",
        }),
      ]),
    );
    expect(memberBody.snapshot.redemptions.adminQueue).toEqual([]);
  });
});
