import fs from "fs";
import os from "os";
import path from "path";

type SqliteConfigEnv = {
  DATABASE_URL?: string;
  PRISMA_DB_PATH?: string;
  [key: string]: string | undefined;
};

const FILE_PROTOCOL = "file:";
const DEFAULT_DEV_DB_PATH = path.join(os.homedir(), "data", "share-project", "dev.db");

function normalizePathForUrl(dbPath: string) {
  return dbPath.replace(/\\/g, "/");
}

function isWindowsAbsolutePath(inputPath: string) {
  return /^[A-Za-z]:[\\/]/.test(inputPath);
}

function expandHomeDirectory(inputPath: string) {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

function resolvePathInput(inputPath: string) {
  const expandedPath = expandHomeDirectory(inputPath);

  return path.isAbsolute(expandedPath) || isWindowsAbsolutePath(expandedPath)
    ? path.normalize(expandedPath)
    : path.resolve(process.cwd(), expandedPath);
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

  return DEFAULT_DEV_DB_PATH;
}

export function resolveSqliteDatabaseUrl(env: SqliteConfigEnv = process.env) {
  const dbPath = resolveSqliteDatabasePath(env);
  return `${FILE_PROTOCOL}${normalizePathForUrl(dbPath)}`;
}

export function ensureSqliteDatabaseDirectory(env: SqliteConfigEnv = process.env) {
  const dbPath = resolveSqliteDatabasePath(env);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}
