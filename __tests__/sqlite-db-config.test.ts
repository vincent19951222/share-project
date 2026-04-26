import path from "path";
import { describe, expect, it } from "vitest";
import { resolveSqliteDatabasePath, resolveSqliteDatabaseUrl } from "@/lib/sqlite-db-config";

describe("sqlite database config", () => {
  it("prefers PRISMA_DB_PATH when provided", () => {
    const config = {
      DATABASE_URL: 'file:/E:/data/share-project/prod.db',
      PRISMA_DB_PATH: "E:/data/share-project/override.db",
    };

    expect(resolveSqliteDatabasePath(config)).toBe(path.normalize("E:/data/share-project/override.db"));
    expect(resolveSqliteDatabaseUrl(config)).toBe("file:E:/data/share-project/override.db");
  });

  it("uses DATABASE_URL for production-style absolute sqlite files", () => {
    const config = {
      DATABASE_URL: "file:/E:/data/share-project/prod.db",
    };

    expect(resolveSqliteDatabasePath(config)).toBe(path.normalize("E:/data/share-project/prod.db"));
    expect(resolveSqliteDatabaseUrl(config)).toBe("file:/E:/data/share-project/prod.db");
  });

  it("falls back to prisma/dev.db for local development", () => {
    const config = {};
    const expectedPath = path.resolve(process.cwd(), "prisma", "dev.db");

    expect(resolveSqliteDatabasePath(config)).toBe(expectedPath);
    expect(resolveSqliteDatabaseUrl(config)).toBe(`file:${expectedPath.replace(/\\/g, "/")}`);
  });
});
