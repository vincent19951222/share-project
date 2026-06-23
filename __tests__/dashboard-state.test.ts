import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  buildDashboardMonthSnapshotForUser,
  buildDashboardSnapshotForUser,
} from "@/lib/dashboard-state";

const TEST_NOW = new Date("2026-06-19T08:00:00.000Z");

async function createTestUser() {
  const suffix = randomUUID();
  const team = await prisma.team.create({
    data: {
      code: `dashboard-team-${suffix}`,
      name: "Dashboard Test Team",
    },
  });

  const user = await prisma.user.create({
    data: {
      username: `dashboard-user-${suffix}`,
      password: "hashed",
      avatarKey: "male1",
      teamId: team.id,
    },
  });

  return { user, team };
}

async function createPunchWithWorkout(
  userId: string,
  teamId: string,
  dayKey: string,
  payload: {
    trainingType: "cardio" | "strength" | "both";
    cardioItem?: string;
    cardioItems?: string[];
    strengthParts?: string[];
    durationMinutes: number;
  },
) {
  const dayIndex = Number(dayKey.slice(8, 10));
  const punch = await prisma.punchRecord.create({
    data: {
      userId,
      dayIndex,
      dayKey,
      punched: true,
      punchType: "workout",
    },
  });

  const entries: { category: string; code: string; label: string }[] = [];
  const cardioItems = payload.cardioItems ?? (payload.cardioItem ? [payload.cardioItem] : []);
  if (payload.trainingType === "cardio" || payload.trainingType === "both") {
    for (const item of cardioItems) {
      entries.push({ category: "cardio", code: item, label: item });
    }
  }
  if (payload.trainingType === "strength" || payload.trainingType === "both") {
    for (const part of payload.strengthParts ?? []) {
      entries.push({ category: "strength", code: part, label: part });
    }
  }

  await prisma.workoutRecord.create({
    data: {
      userId,
      teamId,
      punchRecordId: punch.id,
      dayKey,
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        create: entries,
      },
    },
  });
}

async function createDrink(
  userId: string,
  teamId: string,
  dayKey: string,
  drinkType: string,
) {
  await prisma.drinkRecord.create({
    data: {
      userId,
      teamId,
      dayKey,
      drinkType,
    },
  });
}

describe("buildDashboardMonthSnapshotForUser", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("aggregates workout and drink details by day", async () => {
    const { user, team } = await createTestUser();

    await createPunchWithWorkout(user.id, team.id, "2026-06-05", {
      trainingType: "both",
      cardioItem: "treadmill",
      strengthParts: ["chest", "abs"],
      durationMinutes: 60,
    });
    await createDrink(user.id, team.id, "2026-06-05", "water");
    await createDrink(user.id, team.id, "2026-06-05", "americano");

    const snapshot = await buildDashboardMonthSnapshotForUser(
      user.id,
      "2026-06",
      TEST_NOW,
    );

    expect(snapshot).not.toBeNull();
    const day = snapshot!.days.find((d) => d.day === 5);
    expect(day?.workedOut).toBe(true);
    expect(day?.workoutMinutes).toBe(60);
    expect(day?.trainingType).toBe("both");
    expect(day?.cardioItem).toBe("treadmill");
    expect(day?.cardioItems).toEqual(["treadmill"]);
    expect(day?.strengthParts).toEqual(["chest", "abs"]);
    expect(day?.drinkCups).toBe(2);
    expect(day?.drinkCounts).toMatchObject({ water: 1, americano: 1 });
  });

  it("aggregates multiple cardio items by day", async () => {
    const { user, team } = await createTestUser();

    await createPunchWithWorkout(user.id, team.id, "2026-06-06", {
      trainingType: "cardio",
      cardioItems: ["treadmill", "dance"],
      durationMinutes: 60,
    });

    const snapshot = await buildDashboardMonthSnapshotForUser(
      user.id,
      "2026-06",
      TEST_NOW,
    );

    expect(snapshot).not.toBeNull();
    const day = snapshot!.days.find((d) => d.day === 6);
    expect(day?.cardioItem).toBe("treadmill");
    expect(day?.cardioItems).toEqual(["treadmill", "dance"]);
  });

  it("returns zero details for days with no records", async () => {
    const { user, team } = await createTestUser();

    await createDrink(user.id, team.id, "2026-06-10", "water");

    const snapshot = await buildDashboardMonthSnapshotForUser(
      user.id,
      "2026-06",
      TEST_NOW,
    );

    expect(snapshot).not.toBeNull();
    const emptyDay = snapshot!.days.find((d) => d.day === 3);
    expect(emptyDay?.workedOut).toBe(false);
    expect(emptyDay?.workoutMinutes).toBe(0);
    expect(emptyDay?.drinkCups).toBe(0);
  });
});

describe("buildDashboardSnapshotForUser", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns month workout and drink summaries", async () => {
    const { user, team } = await createTestUser();

    await createPunchWithWorkout(user.id, team.id, "2026-06-10", {
      trainingType: "strength",
      strengthParts: ["arms", "shoulder"],
      durationMinutes: 50,
    });
    await createDrink(user.id, team.id, "2026-06-10", "latte");

    const snapshot = await buildDashboardSnapshotForUser(user.id, { type: "month", monthKey: "2026-06" }, TEST_NOW);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.workoutSummary.days).toBe(1);
    expect(snapshot!.workoutSummary.totalMinutes).toBe(50);
    expect(snapshot!.drinkSummary.cups).toBe(1);
    expect(snapshot!.drinkSummary.byType.latte).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "arms")?.count).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "shoulder")?.count).toBe(1);
    expect(snapshot!.heatmap.some((day) => day.dayKey === "2026-06-10" && day.workoutMinutes === 50)).toBe(true);
  });

  it("uses visible workout balance labels even when counts are zero", async () => {
    const { user } = await createTestUser();

    const snapshot = await buildDashboardSnapshotForUser(user.id, { type: "month", monthKey: "2026-06" }, TEST_NOW);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.workoutBalance.map((item) => String(item.code))).not.toContain("glutes");
    expect(snapshot!.workoutBalance.find((item) => item.code === "legs")).toMatchObject({
      label: "臀腿",
      count: 0,
    });
    expect(snapshot!.workoutBalance.find((item) => item.code === "elliptical")).toMatchObject({
      label: "椭圆机",
      count: 0,
    });
    expect(snapshot!.workoutBalance.find((item) => item.code === "walk")).toMatchObject({
      label: "散步",
      count: 0,
    });
    expect(snapshot!.workoutBalance.find((item) => item.code === "dance")).toMatchObject({
      label: "跳舞",
      count: 0,
    });
  });

  it("aggregates full year data when period is year", async () => {
    const { user, team } = await createTestUser();

    await createPunchWithWorkout(user.id, team.id, "2026-01-15", {
      trainingType: "cardio",
      cardioItem: "swim",
      durationMinutes: 30,
    });
    await createPunchWithWorkout(user.id, team.id, "2026-06-15", {
      trainingType: "cardio",
      cardioItem: "swim",
      durationMinutes: 40,
    });
    await createDrink(user.id, team.id, "2026-03-10", "water");

    const snapshot = await buildDashboardSnapshotForUser(user.id, { type: "year", year: 2026 }, TEST_NOW);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.workoutSummary.days).toBe(2);
    expect(snapshot!.workoutSummary.totalMinutes).toBe(70);
    expect(snapshot!.drinkSummary.cups).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "swim")?.count).toBe(2);
  });

  it("builds the heatmap from the past 12 calendar months through today", async () => {
    const { user, team } = await createTestUser();

    await createPunchWithWorkout(user.id, team.id, "2025-07-03", {
      trainingType: "cardio",
      cardioItem: "walk",
      durationMinutes: 30,
    });
    await createPunchWithWorkout(user.id, team.id, "2026-06-20", {
      trainingType: "cardio",
      cardioItem: "swim",
      durationMinutes: 40,
    });

    const snapshot = await buildDashboardSnapshotForUser(user.id, { type: "year", year: 2026 }, TEST_NOW);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.heatmap[0]?.dayKey).toBe("2025-07-01");
    expect(snapshot!.heatmap.at(-1)?.dayKey).toBe("2026-06-19");
    expect(snapshot!.workoutSummary.days).toBe(0);
    expect(snapshot!.heatmap.some((day) => day.dayKey === "2025-07-03" && day.workoutMinutes === 30)).toBe(true);
    expect(snapshot!.heatmap.some((day) => day.dayKey === "2026-06-20")).toBe(false);
    expect(snapshot!.heatmap.some((day) => day.month === 12 && day.dayKey.startsWith("2026-12"))).toBe(false);
  });

  it("queries a complete historical month without bleeding into later months", async () => {
    const { user, team } = await createTestUser();

    await createPunchWithWorkout(user.id, team.id, "2026-05-20", {
      trainingType: "strength",
      strengthParts: ["chest"],
      durationMinutes: 30,
    });
    await createPunchWithWorkout(user.id, team.id, "2026-06-10", {
      trainingType: "strength",
      strengthParts: ["back"],
      durationMinutes: 40,
    });

    const snapshot = await buildDashboardSnapshotForUser(
      user.id,
      { type: "month", monthKey: "2026-05" },
      TEST_NOW,
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot!.workoutSummary.days).toBe(1);
    expect(snapshot!.workoutSummary.totalMinutes).toBe(30);
    expect(snapshot!.workoutBalance.find((item) => item.code === "chest")?.count).toBe(1);
    expect(snapshot!.workoutBalance.find((item) => item.code === "back")?.count).toBe(0);
    expect(snapshot!.currentMonthKey).toBe("2026-05");
    expect(snapshot!.month).toBe(5);
  });
});
