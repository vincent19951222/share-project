import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma connection", () => {
  it("should connect to the database", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toEqual([{ value: BigInt(1) }]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
