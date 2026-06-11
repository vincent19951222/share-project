import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { backfillDefaultWorkoutRecords } from "@/lib/workouts";

async function main() {
  const result = await backfillDefaultWorkoutRecords({ prisma });
  console.log(
    `Workout backfill complete: scanned=${result.scanned} created=${result.created} skipped=${result.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
