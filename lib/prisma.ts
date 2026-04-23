import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDbPath() {
  const overridePath = process.env.PRISMA_DB_PATH?.trim();

  if (!overridePath) {
    return path.resolve(process.cwd(), "prisma", "dev.db");
  }

  return path.isAbsolute(overridePath)
    ? overridePath
    : path.resolve(process.cwd(), overridePath);
}

function createPrismaClient() {
  const dbPath = resolveDbPath();
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

function hasRequiredDelegates(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && "activityEvent" in client);
}

export const prisma = hasRequiredDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
