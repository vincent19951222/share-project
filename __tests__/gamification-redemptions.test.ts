import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getItemDefinition } from "@/lib/gamification/content";
import {
  cancelRealWorldRedemption,
  confirmRealWorldRedemption,
  RedemptionServiceError,
  requestRealWorldRedemption,
} from "@/lib/gamification/redemptions";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("gamification real-world redemptions", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = member.teamId;

    await prisma.realWorldRedemption.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
    await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requests a Luckin redemption and consumes one inventory item", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 2 },
    });

    const result = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(result).toMatchObject({
      itemId: "luckin_coffee_coupon",
      itemName: getItemDefinition("luckin_coffee_coupon")?.name,
      status: "REQUESTED",
    });
    expect(inventory.quantity).toBe(1);
  });

  it("rejects non-real-world items", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });

    await expect(
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "small_boost_coupon",
      }),
    ).rejects.toMatchObject({
      code: "ITEM_NOT_REDEEMABLE",
      status: 400,
    });
  });

  it("rejects redemption when inventory is unavailable", async () => {
    await expect(
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
      }),
    ).rejects.toBeInstanceOf(RedemptionServiceError);
  });

  it("allows only one concurrent request for one coupon", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });

    const results = await Promise.allSettled([
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
      }),
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
      }),
    ]);
    const requestedCount = await prisma.realWorldRedemption.count({
      where: { userId: memberId, itemId: "luckin_coffee_coupon", status: "REQUESTED" },
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(requestedCount).toBe(1);
    expect(inventory.quantity).toBe(0);
  });

  it("confirms a requested redemption without refunding inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });

    const confirmed = await confirmRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
      note: "offline fulfilled",
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(confirmed).toMatchObject({
      id: requested.id,
      status: "CONFIRMED",
      confirmedByUsername: "li",
      note: "offline fulfilled",
    });
    expect(inventory.quantity).toBe(0);
  });

  it("cancels a requested redemption and refunds one inventory item", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });

    const cancelled = await cancelRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
      note: "user requested cancellation",
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(cancelled).toMatchObject({
      id: requested.id,
      status: "CANCELLED",
      cancelledByUsername: "li",
      note: "user requested cancellation",
    });
    expect(inventory.quantity).toBe(1);
  });

  it("does not cancel a confirmed redemption or refund inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });
    await confirmRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
    });

    await expect(
      cancelRealWorldRedemption({
        adminUserId: adminId,
        teamId,
        redemptionId: requested.id,
      }),
    ).rejects.toMatchObject({
      code: "REDEMPTION_NOT_REQUESTED",
      status: 409,
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });
    expect(inventory.quantity).toBe(0);
  });

  it("does not create coffee records when redemption is requested or confirmed", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });
    await confirmRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
    });

    await expect(prisma.coffeeRecord.count({ where: { userId: memberId } })).resolves.toBe(0);
  });
});
