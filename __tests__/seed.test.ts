import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase, SEED_USERS, SEED_TEAM } from "@/lib/db-seed";

describe("seedDatabase", () => {
  beforeAll(async () => {
    await prisma.boardNote.deleteMany();
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
      expect(user!.punchRecords).toHaveLength(1);
      expect(user!.punchRecords[0]).toMatchObject({
        dayIndex: 22,
        punched: true,
        punchType: "default",
      });
    }
  });

  it("should be idempotent (upsert)", async () => {
    await seedDatabase();
    await seedDatabase();

    const userCount = await prisma.user.count();
    const punchCount = await prisma.punchRecord.count();
    expect(userCount).toBe(SEED_USERS.length);
    expect(punchCount).toBe(SEED_USERS.length);
  });

  it("should keep the seeded team vault at 50", async () => {
    await seedDatabase();

    const aggregate = await prisma.user.aggregate({
      _sum: { coins: true },
      where: { username: { in: SEED_USERS.map((user) => user.username) } },
    });

    expect(aggregate._sum.coins).toBe(50);
  });

  it("should remove extra users outside the seeded roster", async () => {
    await seedDatabase();

    const team = await prisma.team.findUniqueOrThrow({ where: { code: SEED_TEAM.code } });
    await prisma.user.create({
      data: {
        username: "newuser",
        password: "test",
        avatarKey: "male1",
        coins: 0,
        teamId: team.id,
      },
    });

    await seedDatabase();

    const extraUser = await prisma.user.findUnique({ where: { username: "newuser" } });
    expect(extraUser).toBeNull();
  });
});
