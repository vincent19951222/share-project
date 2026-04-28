import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { ensureSqliteDatabaseDirectory, resolveSqliteDatabaseUrl } from "@/lib/sqlite-db-config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  ensureSqliteDatabaseDirectory();
  const adapter = new PrismaBetterSqlite3({ url: resolveSqliteDatabaseUrl() });
  return new PrismaClient({ adapter });
}

function hasRequiredDelegates(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && "activityEvent" in client);
}

export const prisma = hasRequiredDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
