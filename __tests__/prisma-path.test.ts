import path from "path";
import { describe, expect, it } from "vitest";
import { resolveDbPath } from "@/lib/prisma";

describe("resolveDbPath", () => {
  const cwd = process.cwd();

  it("prefers PRISMA_DB_PATH when provided", () => {
    expect(
      resolveDbPath({
        cwd,
        prismaDbPath: "./tmp/override.db",
        databaseUrl: "file:./.local/dev.db",
      }),
    ).toBe(path.resolve(cwd, "tmp/override.db"));
  });

  it("uses DATABASE_URL when PRISMA_DB_PATH is absent", () => {
    expect(
      resolveDbPath({
        cwd,
        prismaDbPath: "",
        databaseUrl: "file:./.local/dev.db",
      }),
    ).toBe(path.resolve(cwd, ".local/dev.db"));
  });

  it("falls back to prisma/dev.db when no env override exists", () => {
    expect(
      resolveDbPath({
        cwd,
        prismaDbPath: "",
        databaseUrl: "",
      }),
    ).toBe(path.resolve(cwd, "prisma/dev.db"));
  });
});
