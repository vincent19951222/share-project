import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  expirePastPendingItemUses,
  getNextPunchStreakWithLeaveProtection,
  ItemUseError,
  useInventoryItem,
} from "@/lib/gamification/item-use";
import { prisma } from "@/lib/prisma";

describe("gamification item use", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    dayKey = getShanghaiDayKey(fixedNow);

    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.dailyTaskAssignment.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
    await prisma.lotteryTicketLedger.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("uses a fitness boost as pending without consuming inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });

    const result = await useInventoryItem({ userId, itemId: "small_boost_coupon", now: fixedNow });

    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });
    const record = await prisma.itemUseRecord.findUniqueOrThrow({
      where: { id: result.itemUse.id },
    });

    expect(result.itemUse).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
      targetType: null,
      targetId: null,
      inventoryConsumed: false,
    });
    expect(item.quantity).toBe(1);
    expect(record.effectSnapshotJson).toContain("fitness_coin_multiplier");
  });

  it("immediately settles a boost used after today's punch", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { coins: 140 },
    });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        seasonContributionAwarded: 0,
        countedForSeasonSlot: false,
      },
    });

    const result = await useInventoryItem({ userId, itemId: "coin_rich_coupon", now: fixedNow });
    const updatedPunch = await prisma.punchRecord.findUniqueOrThrow({ where: { id: punch.id } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "coin_rich_coupon" } },
    });

    expect(result.itemUse).toMatchObject({
      status: "SETTLED",
      targetType: "FITNESS_PUNCH",
      targetId: punch.id,
      inventoryConsumed: true,
    });
    expect(result.itemUse.message).toContain("补结算");
    expect(updatedPunch.assetAwarded).toBe(80);
    expect(updatedPunch.boostAssetBonus).toBe(40);
    expect(user.coins).toBe(180);
    expect(inventory.quantity).toBe(0);
  });

  it("rejects a second fitness boost for the same day", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
        { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
      ],
    });

    await useInventoryItem({ userId, itemId: "small_boost_coupon", now: fixedNow });

    await expect(
      useInventoryItem({ userId, itemId: "coin_rich_coupon", now: fixedNow }),
    ).rejects.toThrow(ItemUseError);
  });

  it("enforces one strong boost per Shanghai week", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
        { userId, teamId, itemId: "season_sprint_coupon", quantity: 1 },
      ],
    });

    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "coin_rich_coupon",
        dayKey: "2026-04-27",
        status: "SETTLED",
        targetType: "FITNESS_PUNCH",
        targetId: "punch-1",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 2 }),
        settledAt: new Date("2026-04-27T09:30:00+08:00"),
      },
    });

    await expect(
      useInventoryItem({
        userId,
        itemId: "season_sprint_coupon",
        now: new Date("2026-04-28T09:00:00+08:00"),
      }),
    ).rejects.toThrow(ItemUseError);
  });

  it("expires old pending boosts without consuming inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        dayKey: "2026-04-25",
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });

    await expirePastPendingItemUses({ userId, todayDayKey: dayKey });

    const record = await prisma.itemUseRecord.findFirstOrThrow({
      where: { userId, itemId: "small_boost_coupon" },
    });
    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });

    expect(record.status).toBe("EXPIRED");
    expect(item.quantity).toBe(1);
  });

  it("uses task reroll coupon to replace an unfinished assignment and consumes inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 1 },
    });
    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey,
        dimensionKey: "movement",
        taskCardId: "movement_001",
      },
    });

    const result = await useInventoryItem({
      userId,
      itemId: "task_reroll_coupon",
      now: fixedNow,
      target: { dimensionKey: "movement" },
      rng: () => 0.99,
    });

    const assignment = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: { userId_dayKey_dimensionKey: { userId, dayKey, dimensionKey: "movement" } },
    });
    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "task_reroll_coupon" } },
    });

    expect(result.itemUse).toMatchObject({
      status: "SETTLED",
      targetType: "DAILY_TASK_ASSIGNMENT",
      targetId: assignment.id,
      inventoryConsumed: true,
    });
    expect(assignment.taskCardId).not.toBe("movement_001");
    expect(assignment.rerollCount).toBe(1);
    expect(item.quantity).toBe(0);
  });

  it("uses leave protection without creating punch, tickets, coins, or season progress", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "fitness_leave_coupon", quantity: 1 },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 25,
        dayKey: "2026-04-25",
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { currentStreak: 3, lastPunchDayKey: "2026-04-25", coins: 100, ticketBalance: 0 },
    });

    const result = await useInventoryItem({ userId, itemId: "fitness_leave_coupon", now: fixedNow });

    const todayPunch = await prisma.punchRecord.findUnique({
      where: { userId_dayKey: { userId, dayKey } },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ticketLedgerCount = await prisma.lotteryTicketLedger.count({ where: { userId } });

    expect(result.itemUse).toMatchObject({
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
      targetId: null,
      inventoryConsumed: true,
    });
    expect(todayPunch).toBeNull();
    expect(user.coins).toBe(100);
    expect(user.ticketBalance).toBe(0);
    expect(ticketLedgerCount).toBe(0);
  });

  it("rejects a second leave protection on the same day", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "fitness_leave_coupon", quantity: 2 },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 25,
        dayKey: "2026-04-25",
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });

    await useInventoryItem({ userId, itemId: "fitness_leave_coupon", now: fixedNow });

    await expect(
      useInventoryItem({ userId, itemId: "fitness_leave_coupon", now: fixedNow }),
    ).rejects.toThrow(ItemUseError);
  });

  it("computes next streak through one leave-protected day without increasing the skipped day", async () => {
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "fitness_leave_coupon",
        dayKey: "2026-04-26",
        status: "SETTLED",
        targetType: "LEAVE_PROTECTION",
        effectSnapshotJson: JSON.stringify({
          type: "leave_protection",
          protectsStreak: true,
          freezesNextFitnessRewardTier: true,
        }),
        settledAt: fixedNow,
      },
    });

    const nextStreak = await getNextPunchStreakWithLeaveProtection({
      userId,
      currentStreak: 3,
      lastPunchDayKey: "2026-04-25",
      todayDayKey: "2026-04-27",
    });

    expect(nextStreak).toBe(4);
  });
});
