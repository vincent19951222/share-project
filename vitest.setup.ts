import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const sourceDbPath = path.resolve(projectRoot, "prisma", "dev.db");
const testDbPath = path.resolve(projectRoot, "prisma", "vitest.db");

function copyIfExists(sourcePath: string, targetPath: string) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  fs.copyFileSync(sourcePath, targetPath);
}

fs.mkdirSync(path.dirname(testDbPath), { recursive: true });

for (const suffix of ["", "-shm", "-wal"]) {
  const targetPath = `${testDbPath}${suffix}`;

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { force: true });
  }
}

copyIfExists(sourceDbPath, testDbPath);
copyIfExists(`${sourceDbPath}-shm`, `${testDbPath}-shm`);
copyIfExists(`${sourceDbPath}-wal`, `${testDbPath}-wal`);

process.env.PRISMA_DB_PATH = testDbPath;
