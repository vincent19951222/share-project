import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  COFFEE_TOTAL_DAYS,
  buildCoffeeSnapshotForUser,
  getCurrentCoffeeDay,
  getCurrentCoffeeTotalDays,
} from "@/lib/coffee-state";

describe("coffee-state", () => {
  let liId: string;
  let luoId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const li = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const luo = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    liId = li.id;
    luoId = luo.id;
    teamId = li.teamId;
  });

  beforeEach(async () => {
    await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives the current coffee day in Asia/Shanghai", () => {
    expect(getCurrentCoffeeDay(new Date("2026-04-23T18:30:00Z"))).toBe(24);
    expect(getCurrentCoffeeTotalDays(new Date("2026-04-23T18:30:00Z"))).toBe(30);
    expect(COFFEE_TOTAL_DAYS).toBe(30);
  });

  it("aggregates cups by user and day while ignoring deleted records", async () => {
    await prisma.coffeeRecord.createMany({
      data: [
        { userId: liId, teamId, dayKey: "2026-04-23", createdAt: new Date("2026-04-23T01:00:00Z") },
        { userId: liId, teamId, dayKey: "2026-04-23", createdAt: new Date("2026-04-23T02:00:00Z") },
        {
          userId: liId,
          teamId,
          dayKey: "2026-04-23",
          deletedAt: new Date("2026-04-23T03:00:00Z"),
        },
        { userId: luoId, teamId, dayKey: "2026-04-23" },
        { userId: luoId, teamId, dayKey: "2026-04-23" },
        { userId: luoId, teamId, dayKey: "2026-04-23" },
      ],
    });

    const snapshot = await buildCoffeeSnapshotForUser(
      liId,
      new Date("2026-04-23T10:00:00+08:00"),
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot!.currentUserId).toBe(liId);
    expect(snapshot!.gridData[0][22]).toEqual({ cups: 2 });
    expect(snapshot!.stats.todayTotalCups).toBe(5);
    expect(snapshot!.stats.todayDrinkers).toBe(2);
    expect(snapshot!.stats.currentUserTodayCups).toBe(2);
    expect(snapshot!.stats.coffeeKing).toEqual({
      userId: luoId,
      name: "luo",
      cups: 3,
    });
  });

  it("returns null for a missing user", async () => {
    await expect(buildCoffeeSnapshotForUser("missing-user")).resolves.toBeNull();
  });
});
