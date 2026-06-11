import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { backfillDefaultWorkoutRecords } from "@/lib/workouts";

describe("workout record backfill", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T09:00:00+08:00"));
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;

    await prisma.workoutEntry.deleteMany();
    await prisma.workoutRecord.deleteMany();
    await prisma.punchRecord.deleteMany();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("creates one default treadmill workout for each legacy punch and is idempotent", async () => {
    const firstPunch = await prisma.punchRecord.create({
      data: {
        userId,
        dayIndex: 20,
        dayKey: "2026-04-20",
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
      },
    });
    const secondPunch = await prisma.punchRecord.create({
      data: {
        userId,
        dayIndex: 21,
        dayKey: "2026-04-21",
        punched: true,
        punchType: "makeup-yesterday",
        streakAfterPunch: 2,
        assetAwarded: 20,
      },
    });

    await expect(backfillDefaultWorkoutRecords({ prisma })).resolves.toEqual({
      scanned: 2,
      created: 2,
      skipped: 0,
    });
    await expect(backfillDefaultWorkoutRecords({ prisma })).resolves.toEqual({
      scanned: 2,
      created: 0,
      skipped: 2,
    });

    const workouts = await prisma.workoutRecord.findMany({
      where: { userId },
      include: { entries: true },
      orderBy: { dayKey: "asc" },
    });

    expect(workouts).toHaveLength(2);
    expect(workouts.map((workout) => workout.punchRecordId)).toEqual([firstPunch.id, secondPunch.id]);
    for (const workout of workouts) {
      expect(workout).toMatchObject({
        userId,
        teamId,
        trainingType: "cardio",
        durationMinutes: null,
      });
      expect(workout.entries).toHaveLength(1);
      expect(workout.entries[0]).toMatchObject({
        category: "cardio",
        code: "treadmill",
        label: "跑步机",
      });
    }
  });
});
