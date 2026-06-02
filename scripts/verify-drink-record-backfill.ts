import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const coffeeCount = await prisma.coffeeRecord.count();
  const backfilledDrinkCount = await prisma.drinkRecord.count({
    where: {
      id: { startsWith: "drink_" },
      drinkType: "americano",
      note: "历史咖啡记录",
    },
  });

  if (coffeeCount !== backfilledDrinkCount) {
    throw new Error(`Backfill mismatch: coffee=${coffeeCount}, drink=${backfilledDrinkCount}`);
  }

  console.log(`Backfill verified: coffee=${coffeeCount}, drink=${backfilledDrinkCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
