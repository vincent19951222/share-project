import { getShopCatalogItems } from "@/content/gamification/shop-catalog";
import { getItemDefinition } from "@/lib/gamification/content";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { buildSupplyTaskRecordSnapshot } from "@/lib/gamification/task-records";
import { prisma } from "@/lib/prisma";
import type {
  GamificationBackpackCategory,
  SupplyShopProductSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

export const SUPPLY_BACKPACK_CAPACITY = 60;

function buildShopProducts(input: {
  ownedQuantityByItemId: Map<string, number>;
}): SupplyShopProductSnapshot[] {
  return getShopCatalogItems().map((catalogItem) => {
    const definition = getItemDefinition(catalogItem.itemId);
    const purchaseEnabled = Boolean(definition?.enabled);

    return {
      itemId: catalogItem.itemId,
      name: definition?.name ?? "未知补给",
      description: definition?.description ?? "这个商品配置已经不存在，请联系管理员确认。",
      category: (definition?.category ?? "unknown") as GamificationBackpackCategory,
      priceCoins: catalogItem.priceCoins,
      ownedQuantity: input.ownedQuantityByItemId.get(catalogItem.itemId) ?? 0,
      dailyLimit: catalogItem.dailyLimit,
      weeklyLimit: catalogItem.weeklyLimit,
      purchaseEnabled,
      purchaseDisabledReason: purchaseEnabled ? null : "商品配置不可用",
      requiresAdminConfirmation: definition?.requiresAdminConfirmation ?? false,
    };
  });
}

export async function buildSupplyStationViewModelForUser(
  userId: string,
  now: Date = new Date(),
): Promise<SupplyStationProductionSnapshot | null> {
  const snapshot = await buildGamificationStateForUser(userId, now);

  if (!snapshot) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatarKey: true,
      coins: true,
      ticketBalance: true,
      inventoryItems: {
        select: {
          itemId: true,
          quantity: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const ownedQuantityByItemId = new Map(
    user.inventoryItems.map((item) => [item.itemId, item.quantity]),
  );
  const backpackUsedSlots = snapshot.backpack.totalQuantity;

  return {
    currentUserId: snapshot.currentUserId,
    currentUserRole: snapshot.currentUserRole,
    teamId: snapshot.teamId,
    dayKey: snapshot.dayKey,
    resources: {
      coins: { label: "银子", value: user.coins },
      ticket: { label: "抽奖券", value: user.ticketBalance },
      backpack: {
        label: "背包",
        value: backpackUsedSlots,
        maxValue: SUPPLY_BACKPACK_CAPACITY,
      },
    },
    profile: {
      ...snapshot.profile,
      username: user.username,
      avatarKey: user.avatarKey,
    },
    dashboard: {
      dailyQuests: snapshot.dimensions,
      todayEffects: snapshot.backpack.todayEffects,
    },
    drawPool: {
      wallet: {
        ...snapshot.ticketSummary,
        ticketBalance: snapshot.ticketBalance,
      },
      lottery: snapshot.lottery,
    },
    backpack: {
      ...snapshot.backpack,
      capacity: {
        usedSlots: backpackUsedSlots,
        totalSlots: SUPPLY_BACKPACK_CAPACITY,
      },
    },
    shop: {
      products: buildShopProducts({ ownedQuantityByItemId }),
    },
    taskRecord: await buildSupplyTaskRecordSnapshot({
      userId: user.id,
      teamId: snapshot.teamId,
      now,
    }),
    social: snapshot.social,
    redemptions: snapshot.redemptions,
  };
}
