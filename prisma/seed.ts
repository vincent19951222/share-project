import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { ensureSqliteDatabaseDirectory, resolveSqliteDatabaseUrl } from "@/lib/sqlite-db-config";
import { seedDatabase } from "../lib/db-seed";

ensureSqliteDatabaseDirectory();
const adapter = new PrismaBetterSqlite3({ url: resolveSqliteDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");
  await seedDatabase();
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
