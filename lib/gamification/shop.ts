import { getShopCatalogItem } from "@/content/gamification/shop-catalog";
import { getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
import { prisma } from "@/lib/prisma";

export class ShopPurchaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = "ShopPurchaseError";
  }
}

export async function purchaseShopItem(input: {
  userId: string;
  itemId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const weekKey = getShanghaiWeekKey(dayKey);
  const catalogItem = getShopCatalogItem(input.itemId);
  const definition = getItemDefinition(input.itemId);

  if (!catalogItem || !definition || !definition.enabled) {
    throw new ShopPurchaseError("这个商品不存在或已下架。", "ITEM_NOT_BUYABLE", 404);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true, coins: true },
    });

    if (!user) {
      throw new ShopPurchaseError("用户不存在。", "UNAUTHORIZED", 401);
    }

    if (catalogItem.dailyLimit) {
      const dailyCount = await tx.shopPurchase.count({
        where: { userId: input.userId, itemId: input.itemId, dayKey, status: "SETTLED" },
      });

      if (dailyCount >= catalogItem.dailyLimit) {
        throw new ShopPurchaseError("今天这个商品已经买到上限。", "DAILY_LIMIT_REACHED");
      }
    }

    if (catalogItem.weeklyLimit) {
      const weeklyCount = await tx.shopPurchase.count({
        where: { userId: input.userId, itemId: input.itemId, weekKey, status: "SETTLED" },
      });

      if (weeklyCount >= catalogItem.weeklyLimit) {
        throw new ShopPurchaseError("本周这个商品已经买到上限。", "WEEKLY_LIMIT_REACHED");
      }
    }

    if (user.coins < catalogItem.priceCoins) {
      throw new ShopPurchaseError("银子不足。", "INSUFFICIENT_COINS");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { coins: { decrement: catalogItem.priceCoins } },
    });

    await tx.inventoryItem.upsert({
      where: { userId_itemId: { userId: input.userId, itemId: input.itemId } },
      create: { userId: input.userId, teamId: user.teamId, itemId: input.itemId, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });

    const purchase = await tx.shopPurchase.create({
      data: {
        userId: input.userId,
        teamId: user.teamId,
        itemId: input.itemId,
        quantity: 1,
        unitPriceCoins: catalogItem.priceCoins,
        totalPriceCoins: catalogItem.priceCoins,
        dayKey,
        weekKey,
        status: "SETTLED",
        metadataJson: JSON.stringify({
          itemName: definition.name,
          category: definition.category,
          requiresAdminConfirmation: definition.requiresAdminConfirmation,
        }),
      },
    });

    return { purchase };
  });
}
