import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";
import { trainingTemplates } from "@/lib/training-plan/content";
import {
  ActiveTrainingPlanExistsError,
  TrainingTemplateNotFoundError,
  createTrainingPlanForUser,
  getCurrentTrainingPlanSnapshot,
} from "@/lib/training-plan/service";

describe("training plan service", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    userId = (
      await prisma.user.findUniqueOrThrow({ where: { username: "li" }, select: { id: true } })
    ).id;
    await prisma.trainingPlanExercise.deleteMany({});
    await prisma.trainingPlanDay.deleteMany({});
    await prisma.trainingPlan.deleteMany({});
    await prisma.trainingProfile.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates four immutable weeks mapped to selected weekdays", async () => {
    const plan = await createTrainingPlanForUser({
      userId,
      now: new Date("2026-07-13T08:00:00+08:00"),
      input: {
        weeklyFrequency: 3,
        sessionDurationMinutes: 45,
        weekdays: [1, 3, 6],
        equipment: ["gym"],
        avoidTags: [],
      },
    });

    expect(plan.startDayKey).toBe("2026-07-13");
    expect(plan.endDayKey).toBe("2026-08-09");
    expect(plan.days).toHaveLength(12);
    expect(plan.days.slice(0, 3).map((day) => day.dayKey)).toEqual([
      "2026-07-13",
      "2026-07-15",
      "2026-07-18",
    ]);
    expect(plan.days.every((day) => day.exercises.length >= 5)).toBe(true);

    const profile = await prisma.trainingProfile.findUniqueOrThrow({ where: { userId } });
    expect(JSON.parse(profile.weekdaysJson)).toEqual([1, 3, 6]);
    expect(profile.sessionDurationMinutes).toBe(45);
  });

  it("rejects a second active plan", async () => {
    const request = {
      userId,
      now: new Date("2026-07-13T08:00:00+08:00"),
      input: {
        weeklyFrequency: 3 as const,
        sessionDurationMinutes: 45 as const,
        weekdays: [1, 3, 6],
        equipment: ["gym"],
        avoidTags: [],
      },
    };

    await createTrainingPlanForUser(request);
    await expect(createTrainingPlanForUser(request)).rejects.toBeInstanceOf(
      ActiveTrainingPlanExistsError,
    );
  });

  it("keeps the persisted snapshot unchanged after content objects mutate", async () => {
    const plan = await createTrainingPlanForUser({
      userId,
      now: new Date("2026-07-13T08:00:00+08:00"),
      input: {
        weeklyFrequency: 3,
        sessionDurationMinutes: 45,
        weekdays: [1, 3, 6],
        equipment: ["gym"],
        avoidTags: [],
      },
    });
    const before = await prisma.trainingPlanDay.findMany({
      where: { planId: plan.id },
      orderBy: { dayKey: "asc" },
    });
    const originalTitle = trainingTemplates[4].weeks[0].sessions[0].title;

    try {
      trainingTemplates[4].weeks[0].sessions[0].title = "mutated-test-title";
      const after = await prisma.trainingPlanDay.findMany({
        where: { planId: plan.id },
        orderBy: { dayKey: "asc" },
      });
      expect(after).toEqual(before);
    } finally {
      trainingTemplates[4].weeks[0].sessions[0].title = originalTitle;
    }
  });

  it("derives a missed Monday without changing Wednesday or Saturday", async () => {
    await createTrainingPlanForUser({
      userId,
      now: new Date("2026-07-13T08:00:00+08:00"),
      input: {
        weeklyFrequency: 3,
        sessionDurationMinutes: 45,
        weekdays: [1, 3, 6],
        equipment: ["gym"],
        avoidTags: [],
      },
    });

    const snapshot = await getCurrentTrainingPlanSnapshot({
      userId,
      now: new Date("2026-07-14T08:00:00+08:00"),
    });

    expect(snapshot?.days[0].status).toBe("missed");
    expect(snapshot?.days[1]).toMatchObject({ dayKey: "2026-07-15", status: "upcoming" });
    expect(snapshot?.days[2]).toMatchObject({ dayKey: "2026-07-18", status: "upcoming" });
  });

  it("keeps cardio selections unique when a template includes the bike", async () => {
    const plan = await createTrainingPlanForUser({
      userId,
      now: new Date("2026-07-13T08:00:00+08:00"),
      input: {
        weeklyFrequency: 3,
        sessionDurationMinutes: 45,
        weekdays: [1, 3, 6],
        equipment: ["gym"],
        avoidTags: [],
      },
    });

    expect(plan.days.some((day) => day.workoutPayload.cardioItems.includes("bike"))).toBe(true);
    for (const day of plan.days) {
      expect(new Set(day.workoutPayload.cardioItems).size).toBe(
        day.workoutPayload.cardioItems.length,
      );
    }
  });

  it("rejects creation when an avoid tag leaves no safe fixed template", async () => {
    await expect(
      createTrainingPlanForUser({
        userId,
        now: new Date("2026-07-13T08:00:00+08:00"),
        input: {
          weeklyFrequency: 4,
          sessionDurationMinutes: 60,
          weekdays: [1, 2, 4, 6],
          equipment: ["gym"],
          avoidTags: ["knee"],
        },
      }),
    ).rejects.toBeInstanceOf(TrainingTemplateNotFoundError);
  });

  it("keeps the deterministic seed free of user training plans", async () => {
    await createTrainingPlanForUser({
      userId,
      now: new Date("2026-07-13T08:00:00+08:00"),
      input: {
        weeklyFrequency: 2,
        sessionDurationMinutes: 30,
        weekdays: [2, 5],
        equipment: ["gym"],
        avoidTags: [],
      },
    });

    await seedDatabase();

    await expect(prisma.trainingPlan.count({ where: { userId } })).resolves.toBe(0);
    await expect(prisma.trainingProfile.count({ where: { userId } })).resolves.toBe(0);
  });
});
