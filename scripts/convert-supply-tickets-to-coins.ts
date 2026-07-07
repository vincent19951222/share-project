import "dotenv/config";
import { convertSupplyTicketsToCoins } from "@/lib/gamification/legacy-ticket-conversion";
import { prisma } from "@/lib/prisma";

export {
  LEGACY_TICKET_TO_COIN_RATE,
  convertSupplyTicketsToCoins,
} from "@/lib/gamification/legacy-ticket-conversion";

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
