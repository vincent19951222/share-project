import "server-only";

import { prisma } from "@/lib/prisma";
import type { SupplyLegacyArchiveSnapshot } from "@/lib/types";

export async function buildLegacySupplyArchiveSnapshot({
  userId,
  teamId,
  ticketBalance,
}: {
  userId: string;
  teamId: string;
  ticketBalance: number;
}): Promise<SupplyLegacyArchiveSnapshot> {
  const [inventoryQuantity, redemptionCount, latestTaskRecordCount] = await Promise.all([
    prisma.inventoryItem.aggregate({
      where: { userId, teamId },
      _sum: { quantity: true },
    }),
    prisma.realWorldRedemption.count({ where: { userId, teamId } }),
    prisma.dailyTaskAssignment.count({ where: { userId, teamId } }),
  ]);

  return {
    ticketBalance,
    inventoryQuantity: inventoryQuantity._sum.quantity ?? 0,
    redemptionCount,
    latestTaskRecordCount,
  };
}
