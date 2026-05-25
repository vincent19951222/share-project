import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("gamification shop schema", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores purchase audit rows for inventory purchases", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

    const purchase = await prisma.shopPurchase.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        itemId: "task_reroll_coupon",
        quantity: 1,
        unitPriceCoins: 150,
        totalPriceCoins: 150,
        dayKey: "2026-05-25",
        weekKey: "2026-W22",
        status: "SETTLED",
      },
    });

    expect(purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      status: "SETTLED",
    });
  });
});
