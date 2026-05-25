import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("gamification experience schema", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores user exp and enforces an idempotent experience ledger source", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

    await prisma.user.update({ where: { id: user.id }, data: { exp: 100 } });
    await prisma.experienceLedger.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: "2026-05-25",
        delta: 100,
        balanceAfter: 100,
        reason: "FITNESS_PUNCH_EXP",
        sourceType: "fitness_punch",
        sourceId: "punch-1",
      },
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.exp).toBe(100);

    await expect(
      prisma.experienceLedger.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey: "2026-05-25",
          delta: 100,
          balanceAfter: 200,
          reason: "FITNESS_PUNCH_EXP",
          sourceType: "fitness_punch",
          sourceId: "punch-1",
        },
      }),
    ).rejects.toThrow();
  });
});
