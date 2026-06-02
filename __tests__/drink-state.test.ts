import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { buildDrinkSnapshotForUser } from "@/lib/drink-state";
import {
  DRINK_TYPES,
  drinkCatalog,
  isDrinkType,
  normalizeDrinkNote,
} from "@/lib/drinks";
import { prisma } from "@/lib/prisma";

describe("drink domain", () => {
  it("defines the fixed 牛马水铺 drink catalog", () => {
    expect(DRINK_TYPES).toEqual(["water", "milkTea", "americano", "latte", "other"]);
    expect(drinkCatalog.water.label).toBe("水");
    expect(drinkCatalog.milkTea.label).toBe("奶茶");
    expect(drinkCatalog.americano.label).toBe("美式");
    expect(drinkCatalog.latte.label).toBe("拿铁");
    expect(drinkCatalog.other.label).toBe("其他");
    expect(isDrinkType("americano")).toBe(true);
    expect(isDrinkType("coffee")).toBe(false);
  });

  it("normalizes drink notes for persistence", () => {
    expect(normalizeDrinkNote("  下午用奶泡顶住  ")).toBe("下午用奶泡顶住");
    expect(normalizeDrinkNote("   ")).toBeNull();
    expect(normalizeDrinkNote("x".repeat(90))).toBe("x".repeat(80));
  });
});

describe("buildDrinkSnapshotForUser", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("aggregates drink counts, latest drink, favorite drink, and today's events", async () => {
    const suffix = randomUUID();
    const team = await prisma.team.create({
      data: { name: "drink team", code: `drink-state-team-${suffix}` },
    });
    const user = await prisma.user.create({
      data: {
        username: `drink-user-${suffix}`,
        password: "hashed",
        avatarKey: "male1",
        teamId: team.id,
      },
    });

    await prisma.drinkRecord.createMany({
      data: [
        {
          userId: user.id,
          teamId: team.id,
          dayKey: "2026-06-02",
          drinkType: "water",
          note: "早起一杯",
          createdAt: new Date("2026-06-02T00:42:00.000Z"),
        },
        {
          userId: user.id,
          teamId: team.id,
          dayKey: "2026-06-02",
          drinkType: "latte",
          note: "下午用奶泡顶住",
          createdAt: new Date("2026-06-02T07:18:00.000Z"),
        },
      ],
    });

    const snapshot = await buildDrinkSnapshotForUser(
      user.id,
      new Date("2026-06-02T08:00:00.000Z"),
    );

    expect(snapshot?.stats.todayTotalCups).toBe(2);
    expect(snapshot?.stats.currentUserTodayCups).toBe(2);
    expect(snapshot?.stats.drinkCounts).toMatchObject({ water: 1, latte: 1 });
    expect(snapshot?.stats.favoriteDrink).toEqual({ drinkType: "water", count: 1 });
    expect(snapshot?.stats.latestDrink?.drinkType).toBe("latte");
    expect(snapshot?.stats.latestDrink?.note).toBe("下午用奶泡顶住");
    expect(snapshot?.todayEvents.map((event) => event.drinkType)).toEqual(["water", "latte"]);
  });
});
