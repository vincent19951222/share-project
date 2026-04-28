import path from "path";
import { describe, expect, it } from "vitest";
import { resolveSqliteDatabasePath } from "@/lib/sqlite-db-config";

describe("resolveSqliteDatabasePath", () => {
  const cwd = process.cwd();

  it("prefers PRISMA_DB_PATH when provided", () => {
    expect(
      resolveSqliteDatabasePath({
        PRISMA_DB_PATH: "./tmp/override.db",
        DATABASE_URL: "file:./.local/dev.db",
      }),
    ).toBe(path.resolve(cwd, "tmp/override.db"));
  });

  it("uses DATABASE_URL when PRISMA_DB_PATH is absent", () => {
    expect(
      resolveSqliteDatabasePath({
        PRISMA_DB_PATH: "",
        DATABASE_URL: "file:./.local/dev.db",
      }),
    ).toBe(path.resolve(cwd, ".local/dev.db"));
  });

  it("falls back to prisma/dev.db when no env override exists", () => {
    expect(
      resolveSqliteDatabasePath({
        PRISMA_DB_PATH: "",
        DATABASE_URL: "",
      }),
    ).toBe(path.resolve(cwd, "prisma/dev.db"));
  });
});
