import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase, SEED_USERS, SEED_TEAM } from "@/lib/db-seed";

describe("seedDatabase", () => {
  beforeAll(async () => {
    await prisma.punchRecord.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should seed team and users", async () => {
    await seedDatabase();

    const team = await prisma.team.findUnique({ where: { code: SEED_TEAM.code } });
    expect(team).not.toBeNull();
    expect(team!.name).toBe(SEED_TEAM.name);

    for (const seedUser of SEED_USERS) {
      const user = await prisma.user.findUnique({ where: { username: seedUser.username } });
      expect(user).not.toBeNull();
      expect(user!.avatarKey).toBe(seedUser.avatarKey);
      expect(user!.coins).toBe(seedUser.coins);
    }
  });

  it("should create punch records for each user", async () => {
    await seedDatabase();

    for (const seedUser of SEED_USERS) {
      const user = await prisma.user.findUnique({
        where: { username: seedUser.username },
        include: { punchRecords: true },
      });
      expect(user!.punchRecords.length).toBeGreaterThan(0);

      const dayIndices = user!.punchRecords.map((r) => r.dayIndex);
      expect(new Set(dayIndices).size).toBe(dayIndices.length);
    }
  });

  it("should be idempotent (upsert)", async () => {
    await seedDatabase();
    await seedDatabase();

    const userCount = await prisma.user.count();
    expect(userCount).toBe(SEED_USERS.length);
  });
});
