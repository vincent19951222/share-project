import { prisma } from "@/lib/prisma";

export const LEGACY_TICKET_TO_COIN_RATE = 50;

export interface ConvertSupplyTicketsToCoinsResult {
  convertedUserCount: number;
  ticketCount: number;
  coinGrantTotal: number;
}

export async function convertSupplyTicketsToCoins({
  apply,
}: {
  apply: boolean;
}): Promise<ConvertSupplyTicketsToCoinsResult> {
  const users = await prisma.user.findMany({
    where: { ticketBalance: { gt: 0 } },
    select: { id: true, ticketBalance: true, coins: true },
    orderBy: { createdAt: "asc" },
  });

  const ticketCount = users.reduce((sum, user) => sum + user.ticketBalance, 0);
  const coinGrantTotal = ticketCount * LEGACY_TICKET_TO_COIN_RATE;

  if (apply) {
    for (const user of users) {
      const coinGrant = user.ticketBalance * LEGACY_TICKET_TO_COIN_RATE;

      await prisma.user.updateMany({
        where: { id: user.id, ticketBalance: user.ticketBalance },
        data: {
          coins: { increment: coinGrant },
          ticketBalance: 0,
        },
      });
    }
  }

  return {
    convertedUserCount: users.length,
    ticketCount,
    coinGrantTotal,
  };
}

export async function convertLegacyTicketsForUser(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarKey: true,
        coins: true,
        ticketBalance: true,
      },
    });

    if (!user || user.ticketBalance <= 0) {
      return user;
    }

    await tx.user.updateMany({
      where: { id: user.id, ticketBalance: user.ticketBalance },
      data: {
        coins: { increment: user.ticketBalance * LEGACY_TICKET_TO_COIN_RATE },
        ticketBalance: 0,
      },
    });

    return tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarKey: true,
        coins: true,
        ticketBalance: true,
      },
    });
  });
}
