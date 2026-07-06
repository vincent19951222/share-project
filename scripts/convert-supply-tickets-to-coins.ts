import "dotenv/config";
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

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");

  if (!apply && !dryRun) {
    throw new Error("Pass --dry-run or --apply");
  }

  const result = await convertSupplyTicketsToCoins({ apply });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...result }, null, 2));
}

if (process.argv[1]?.endsWith("convert-supply-tickets-to-coins.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
