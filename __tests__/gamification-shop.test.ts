import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import { purchaseShopItem, ShopPurchaseError } from "@/lib/gamification/shop";
import { prisma } from "@/lib/prisma";

describe("gamification shop purchase service", () => {
  const fixedNow = new Date("2026-05-25T09:00:00+08:00");
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deducts coins, increments inventory, and writes purchase audit", async () => {
    const result = await purchaseShopItem({
      userId,
      itemId: "task_reroll_coupon",
      now: fixedNow,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "task_reroll_coupon" } },
    });
    const purchase = await prisma.shopPurchase.findFirstOrThrow({ where: { userId } });

    expect(result.purchase.itemId).toBe("task_reroll_coupon");
    expect(user.coins).toBe(850);
    expect(inventory.quantity).toBe(1);
    expect(purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      dayKey: getShanghaiDayKey(fixedNow),
      weekKey: getShanghaiWeekKey(getShanghaiDayKey(fixedNow)),
      status: "SETTLED",
    });
    expect(JSON.parse(purchase.metadataJson ?? "{}")).toMatchObject({
      itemName: "任务换班券",
      category: "task",
      requiresAdminConfirmation: false,
    });
  });

  it("rejects insufficient coins without changing inventory or purchase audit", async () => {
    await prisma.user.update({ where: { id: userId }, data: { coins: 10 } });

    await expect(
      purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_COINS" });

    expect(await prisma.inventoryItem.count({ where: { userId } })).toBe(0);
    expect(await prisma.shopPurchase.count({ where: { userId } })).toBe(0);
  });

  it("enforces daily and weekly purchase limits", async () => {
    await purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow });
    await expect(
      purchaseShopItem({ userId, itemId: "task_reroll_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED" });

    await purchaseShopItem({ userId, itemId: "double_niuma_coupon", now: fixedNow });
    await expect(
      purchaseShopItem({
        userId,
        itemId: "double_niuma_coupon",
        now: new Date("2026-05-26T09:00:00+08:00"),
      }),
    ).rejects.toMatchObject({ code: "WEEKLY_LIMIT_REACHED" });
  });

  it("rejects unknown shop items", async () => {
    await expect(
      purchaseShopItem({ userId, itemId: "single_draw_guarantee_coupon", now: fixedNow }),
    ).rejects.toMatchObject({ code: "ITEM_NOT_BUYABLE" });
    await expect(
      purchaseShopItem({ userId, itemId: "single_draw_guarantee_coupon", now: fixedNow }),
    ).rejects.toBeInstanceOf(ShopPurchaseError);
  });
});
