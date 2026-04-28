import os from "os";
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

  it("falls back to the default home data path when no env override exists", () => {
    const expectedPath = path.join(os.homedir(), "data", "share-project", "dev.db");

    expect(
      resolveSqliteDatabasePath({
        PRISMA_DB_PATH: "",
        DATABASE_URL: "",
      }),
    ).toBe(expectedPath);
  });

  it("expands ~ for PRISMA_DB_PATH overrides", () => {
    expect(
      resolveSqliteDatabasePath({
        PRISMA_DB_PATH: "~/data/share-project/override.db",
        DATABASE_URL: "",
      }),
    ).toBe(path.join(os.homedir(), "data", "share-project", "override.db"));
  });
});
