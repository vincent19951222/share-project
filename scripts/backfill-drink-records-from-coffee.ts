import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { mapCoffeeRecordToDrinkRecord } from "@/scripts/drink-backfill-utils";

async function main() {
  const coffeeRecords = await prisma.coffeeRecord.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      teamId: true,
      dayKey: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const record of coffeeRecords) {
    const data = mapCoffeeRecordToDrinkRecord(record);
    const existing = await prisma.drinkRecord.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.drinkRecord.create({ data });
    created += 1;
  }

  console.log(`Backfilled drink records from coffee records: created=${created}, skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
