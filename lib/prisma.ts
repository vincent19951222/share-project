import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type ResolveDbPathOptions = {
  cwd?: string;
  prismaDbPath?: string;
  databaseUrl?: string;
};

function resolveFileUrlPath(databaseUrl: string | undefined) {
  const normalized = databaseUrl?.trim();

  if (!normalized?.startsWith("file:")) {
    return null;
  }

  const withoutScheme = normalized.slice("file:".length);

  if (!withoutScheme) {
    return null;
  }

  const [pathname] = withoutScheme.split(/[?#]/, 1);
  return pathname || null;
}

export function resolveDbPath({
  cwd = process.cwd(),
  prismaDbPath = process.env.PRISMA_DB_PATH,
  databaseUrl = process.env.DATABASE_URL,
}: ResolveDbPathOptions = {}) {
  const overridePath = prismaDbPath?.trim();

  if (overridePath) {
    return path.isAbsolute(overridePath)
      ? overridePath
      : path.resolve(cwd, overridePath);
  }

  const databasePath = resolveFileUrlPath(databaseUrl);

  if (databasePath) {
    return path.isAbsolute(databasePath)
      ? databasePath
      : path.resolve(cwd, databasePath);
  }

  return path.resolve(cwd, "prisma", "dev.db");
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
