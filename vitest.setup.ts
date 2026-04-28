import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const projectRoot = process.cwd();
const testDbPath = path.resolve(projectRoot, "prisma", "vitest.db");
const migrationsPath = path.resolve(projectRoot, "prisma", "migrations");

fs.mkdirSync(path.dirname(testDbPath), { recursive: true });

for (const suffix of ["", "-shm", "-wal"]) {
  const targetPath = `${testDbPath}${suffix}`;

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { force: true });
  }
}

const db = new Database(testDbPath);

try {
  const migrationFiles = fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsPath, entry.name, "migration.sql"))
    .filter((migrationPath) => fs.existsSync(migrationPath))
    .sort();

  for (const migrationPath of migrationFiles) {
    db.exec(fs.readFileSync(migrationPath, "utf8"));
  }
} finally {
  db.close();
}

process.env.PRISMA_DB_PATH = testDbPath;
