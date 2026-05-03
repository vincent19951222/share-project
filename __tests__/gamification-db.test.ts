import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { adjustInventoryItem, adjustLotteryTickets } from "@/lib/gamification/db";

async function getSeedUser() {
  return prisma.user.findUniqueOrThrow({ where: { username: "li" } });
}

describe("gamification database foundation", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it("creates one daily task assignment per user/day/dimension", async () => {
    const user = await getSeedUser();

    await prisma.dailyTaskAssignment.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-25",
        dimensionKey: "movement",
        taskCardId: "movement_001",
      },
    });

    await expect(
      prisma.dailyTaskAssignment.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey: "2026-04-25",
          dimensionKey: "movement",
          taskCardId: "movement_002",
        },
      }),
    ).rejects.toThrow();
  });

  it("updates ticket balance and writes ledger in one helper", async () => {
    const user = await getSeedUser();

    const result = await adjustLotteryTickets({
      userId: user.id,
      teamId: user.teamId,
      dayKey: "2026-04-25",
      delta: 2,
      reason: "DAILY_TASKS_GRANTED",
      sourceType: "daily_tasks",
      sourceId: "daily-2026-04-25",
    });

    expect(result.balanceAfter).toBe(2);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.ticketBalance).toBe(2);

    const ledger = await prisma.lotteryTicketLedger.findMany({ where: { userId: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      delta: 2,
      balanceAfter: 2,
      reason: "DAILY_TASKS_GRANTED",
    });
  });

  it("rejects zero ticket delta", async () => {
    const user = await getSeedUser();

    await expect(
      adjustLotteryTickets({
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-25",
        delta: 0,
        reason: "ADMIN_ADJUSTMENT",
      }),
    ).rejects.toThrow(/delta cannot be 0/);
  });

  it("rejects negative ticket balances", async () => {
    const user = await getSeedUser();

    await expect(
      adjustLotteryTickets({
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-04-25",
        delta: -1,
        reason: "LOTTERY_DRAW_SPENT",
      }),
    ).rejects.toThrow(/Ticket balance cannot be negative/);
  });

  it("creates and adjusts inventory rows", async () => {
    const user = await getSeedUser();

    const item = await adjustInventoryItem({
      userId: user.id,
      teamId: user.teamId,
      itemId: "task_reroll_coupon",
      delta: 2,
    });

    expect(item.quantity).toBe(2);

    const adjusted = await adjustInventoryItem({
      userId: user.id,
      teamId: user.teamId,
      itemId: "task_reroll_coupon",
      delta: -1,
    });

    expect(adjusted.quantity).toBe(1);
  });

  it("rejects zero inventory delta", async () => {
    const user = await getSeedUser();

    await expect(
      adjustInventoryItem({
        userId: user.id,
        teamId: user.teamId,
        itemId: "task_reroll_coupon",
        delta: 0,
      }),
    ).rejects.toThrow(/delta cannot be 0/);
  });

  it("rejects negative inventory quantities", async () => {
    const user = await getSeedUser();

    await expect(
      adjustInventoryItem({
        userId: user.id,
        teamId: user.teamId,
        itemId: "task_reroll_coupon",
        delta: -1,
      }),
    ).rejects.toThrow(/Inventory quantity cannot be negative/);
  });

  it("creates lottery draw results with ordered positions", async () => {
    const user = await getSeedUser();

    const draw = await prisma.lotteryDraw.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
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
      include: { results: true },
    });

    expect(draw.results).toHaveLength(1);
    expect(draw.results[0].position).toBe(1);
  });

  it("creates social invitation linked to item use record", async () => {
    const user = await getSeedUser();

    const itemUse = await prisma.itemUseRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        itemId: "drink_water_ping",
        dayKey: "2026-04-25",
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId: user.teamId,
        senderUserId: user.id,
        invitationType: "DRINK_WATER",
        itemUseRecordId: itemUse.id,
        status: "PENDING",
        dayKey: "2026-04-25",
        message: "Drink some water.",
      },
    });

    expect(invitation.itemUseRecordId).toBe(itemUse.id);
  });

  it("creates real-world redemption with optional confirmer", async () => {
    const user = await getSeedUser();

    const redemption = await prisma.realWorldRedemption.create({
      data: {
        teamId: user.teamId,
        userId: user.id,
        itemId: "luckin_coffee_coupon",
        status: "REQUESTED",
      },
    });

    expect(redemption.status).toBe("REQUESTED");
    expect(redemption.confirmedByUserId).toBeNull();
  });
});
