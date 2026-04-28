import os from "os";
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
    expect(resolveSqliteDatabaseUrl(config)).toBe("file:E:/data/share-project/prod.db");
  });

  it("normalizes relative DATABASE_URL values to an absolute runtime path", () => {
    const config = {
      DATABASE_URL: "file:./prisma/dev.db",
    };

    const expectedPath = path.resolve(process.cwd(), "prisma", "dev.db");

    expect(resolveSqliteDatabasePath(config)).toBe(expectedPath);
    expect(resolveSqliteDatabaseUrl(config)).toBe(`file:${expectedPath.replace(/\\/g, "/")}`);
  });

  it("expands ~ inside DATABASE_URL values", () => {
    const config = {
      DATABASE_URL: "file:~/data/share-project/dev.db",
    };
    const expectedPath = path.join(os.homedir(), "data", "share-project", "dev.db");

    expect(resolveSqliteDatabasePath(config)).toBe(expectedPath);
    expect(resolveSqliteDatabaseUrl(config)).toBe(`file:${expectedPath.replace(/\\/g, "/")}`);
  });

  it("falls back to ~/data/share-project/dev.db for local development", () => {
    const config = {};
    const expectedPath = path.join(os.homedir(), "data", "share-project", "dev.db");

    expect(resolveSqliteDatabasePath(config)).toBe(expectedPath);
    expect(resolveSqliteDatabaseUrl(config)).toBe(`file:${expectedPath.replace(/\\/g, "/")}`);
  });
});
