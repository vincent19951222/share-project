import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { prisma } from "@/lib/prisma";

describe("gamification backpack state", () => {
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

    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("groups positive inventory by item category and keeps preview items", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        { userId, teamId, itemId: "small_boost_coupon", quantity: 2 },
        { userId, teamId, itemId: "fitness_leave_coupon", quantity: 1 },
        { userId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
        { userId, teamId, itemId: "task_reroll_coupon", quantity: 0 },
      ],
    });

    const snapshot = await buildGamificationStateForUser(userId, fixedNow);

    expect(snapshot?.backpack.status).toBe("active");
    expect(snapshot?.backpack.totalQuantity).toBe(4);
    expect(snapshot?.backpack.ownedItemCount).toBe(3);
    expect(snapshot?.backpack.previewItems.map((item) => item.itemId)).toEqual([
      "small_boost_coupon",
      "fitness_leave_coupon",
      "luckin_coffee_coupon",
    ]);

    const boostGroup = snapshot?.backpack.groups.find((group) => group.category === "boost");
    const protectionGroup = snapshot?.backpack.groups.find(
      (group) => group.category === "protection",
    );
    const realWorldGroup = snapshot?.backpack.groups.find(
      (group) => group.category === "real_world",
    );
    const taskGroup = snapshot?.backpack.groups.find((group) => group.category === "task");

    expect(boostGroup?.totalQuantity).toBe(2);
    expect(protectionGroup?.totalQuantity).toBe(1);
    expect(realWorldGroup?.items[0]).toMatchObject({
      itemId: "luckin_coffee_coupon",
      requiresAdminConfirmation: true,
      useTiming: "manual_redemption",
    });
    expect(taskGroup).toBeUndefined();
  });

  it("shows unknown inventory instead of hiding it", async () => {
    await prisma.inventoryItem.create({
      data: {
        userId,
        teamId,
        itemId: "legacy_mystery_coupon",
        quantity: 3,
      },
    });

    const snapshot = await buildGamificationStateForUser(userId, fixedNow);
    const unknownGroup = snapshot?.backpack.groups.find((group) => group.category === "unknown");

    expect(unknownGroup?.totalQuantity).toBe(3);
    expect(unknownGroup?.items[0]).toMatchObject({
      itemId: "legacy_mystery_coupon",
      category: "unknown",
      knownDefinition: false,
      enabled: false,
    });
  });

  it("separates today's item effects from permanent inventory", async () => {
    await prisma.inventoryItem.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        quantity: 2,
      },
    });
    await prisma.itemUseRecord.createMany({
      data: [
        {
          userId,
          teamId,
          itemId: "small_boost_coupon",
          dayKey,
          status: "PENDING",
          effectSnapshotJson: JSON.stringify({
            type: "fitness_coin_multiplier",
            multiplier: 1.5,
          }),
        },
        {
          userId,
          teamId,
          itemId: "fitness_leave_coupon",
          dayKey,
          status: "SETTLED",
          effectSnapshotJson: JSON.stringify({
            type: "leave_protection",
            protectsStreak: true,
            freezesNextFitnessRewardTier: true,
          }),
          settledAt: fixedNow,
        },
        {
          userId,
          teamId,
          itemId: "ticket_discount_90",
          dayKey,
          status: "EXPIRED",
          effectSnapshotJson: JSON.stringify({ type: "ticket_discount", discountRate: 0.9 }),
        },
      ],
    });

    const snapshot = await buildGamificationStateForUser(userId, fixedNow);

    expect(snapshot?.backpack.totalQuantity).toBe(2);
    expect(snapshot?.backpack.todayEffects.map((effect) => effect.status)).toEqual([
      "PENDING",
      "SETTLED",
    ]);
    expect(snapshot?.backpack.todayEffects[0]).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
      settledAt: null,
    });
  });

  it("shows reserved and available quantities for pending boost usage", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        dayKey,
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });

    const snapshot = await buildGamificationStateForUser(userId, fixedNow);
    const boost = snapshot?.backpack.groups
      .flatMap((group) => group.items)
      .find((item) => item.itemId === "small_boost_coupon");

    expect(boost).toMatchObject({
      quantity: 1,
      reservedQuantity: 1,
      availableQuantity: 0,
      useEnabled: false,
      useDisabledReason: "库存已被今日效果预占",
    });
  });

  it("returns an empty active backpack when the user owns nothing", async () => {
    const snapshot = await buildGamificationStateForUser(userId, fixedNow);

    expect(snapshot?.backpack).toMatchObject({
      status: "active",
      totalQuantity: 0,
      ownedItemCount: 0,
      previewItems: [],
      groups: [],
      todayEffects: [],
    });
    expect(snapshot?.backpack.emptyMessage).toEqual(expect.any(String));
  });
});
