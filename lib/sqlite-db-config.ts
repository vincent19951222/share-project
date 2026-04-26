import path from "path";

type SqliteConfigEnv = {
  DATABASE_URL?: string;
  PRISMA_DB_PATH?: string;
  [key: string]: string | undefined;
};

const FILE_PROTOCOL = "file:";
const DEFAULT_DEV_DB_PATH = path.join("prisma", "dev.db");

function normalizePathForUrl(dbPath: string) {
  return dbPath.replace(/\\/g, "/");
}

function resolvePathInput(inputPath: string) {
  return path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(process.cwd(), inputPath);
}

function extractPathFromDatabaseUrl(databaseUrl: string) {
  const rawPath = databaseUrl.slice(FILE_PROTOCOL.length);

  if (/^\/[A-Za-z]:[\\/]/.test(rawPath)) {
    return rawPath.slice(1);
  }

  return rawPath;
}

export function resolveSqliteDatabasePath(env: SqliteConfigEnv = process.env) {
  const overridePath = env.PRISMA_DB_PATH?.trim();

  if (overridePath) {
    return resolvePathInput(overridePath);
  }

  const databaseUrl = env.DATABASE_URL?.trim();

  if (databaseUrl?.startsWith(FILE_PROTOCOL)) {
    return resolvePathInput(extractPathFromDatabaseUrl(databaseUrl));
  }

  return path.resolve(process.cwd(), DEFAULT_DEV_DB_PATH);
}

export function resolveSqliteDatabaseUrl(env: SqliteConfigEnv = process.env) {
  const databaseUrl = env.DATABASE_URL?.trim();
  const overridePath = env.PRISMA_DB_PATH?.trim();

  if (!overridePath && databaseUrl?.startsWith(FILE_PROTOCOL)) {
    return databaseUrl;
  }

  const dbPath = resolveSqliteDatabasePath(env);
  return `${FILE_PROTOCOL}${normalizePathForUrl(dbPath)}`;
}
