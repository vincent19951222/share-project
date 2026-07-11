import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH, POST } from "@/app/api/board/punch/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";
import { createTrainingPlanForUser } from "@/lib/training-plan/service";

function request(
  method: "POST" | "PATCH" | "DELETE",
  userId: string,
  body: unknown = {},
) {
  return new NextRequest("http://localhost/api/board/punch", {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `userId=${createCookieValue(userId)}`,
    },
    body: JSON.stringify(body),
  });
}

describe("training plan punch integration", () => {
  const now = new Date("2026-07-13T08:00:00+08:00");
  const todayDayKey = "2026-07-13";
  let userId: string;
  let todayPlanDayId: string;
  let futurePlanDayId: string;
  let punchPayload: Record<string, unknown>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.punchRecord.deleteMany({ where: { userId, dayKey: todayDayKey } });

    const plan = await createTrainingPlanForUser({
      userId,
      now,
      input: {
        weeklyFrequency: 2,
        sessionDurationMinutes: 30,
        weekdays: [1, 4],
        equipment: ["gym"],
        avoidTags: [],
      },
    });
    const todayDay = plan.days.find((day) => day.dayKey === todayDayKey)!;
    const futureDay = plan.days.find((day) => day.dayKey === "2026-07-16")!;
    todayPlanDayId = todayDay.id;
    futurePlanDayId = futureDay.id;
    punchPayload = {
      ...todayDay.workoutPayload,
      trainingPlanCompletion: {
        planDayId: todayDay.id,
        exercises: todayDay.exercises.map((exercise, index) => ({
          planExerciseId: exercise.id,
          completed: index < 3,
          actualWeightKg: index === 1 ? 12.5 : null,
          actualReps: index === 1 ? "10" : null,
        })),
      },
    };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("completes the plan day in the same transaction as a new punch", async () => {
    const response = await POST(request("POST", userId, punchPayload));
    expect(response.status).toBe(200);

    const workout = await prisma.workoutRecord.findFirstOrThrow({
      where: { userId, dayKey: todayDayKey },
    });
    const planDay = await prisma.trainingPlanDay.findUniqueOrThrow({
      where: { id: todayPlanDayId },
      include: { exercises: true },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: { userId, dayKey: todayDayKey, reason: "FITNESS_PUNCH_GRANTED" },
    });

    expect(planDay.completedAt).not.toBeNull();
    expect(planDay.workoutRecordId).toBe(workout.id);
    expect(planDay.exercises.filter((exercise) => exercise.completedAt)).toHaveLength(3);
    expect(planDay.exercises.find((exercise) => exercise.actualWeightKg === 12.5)).toMatchObject({
      actualReps: "10",
    });
    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });

  it("treats a replayed completed plan punch as idempotent", async () => {
    expect((await POST(request("POST", userId, punchPayload))).status).toBe(200);
    expect((await POST(request("POST", userId, punchPayload))).status).toBe(200);

    await expect(
      prisma.lotteryTicketLedger.count({
        where: { userId, dayKey: todayDayKey, reason: "FITNESS_PUNCH_GRANTED" },
      }),
    ).resolves.toBe(1);
    await expect(prisma.punchRecord.count({ where: { userId, dayKey: todayDayKey } })).resolves.toBe(
      1,
    );
  });

  it("uses PATCH to complete a plan after an ordinary punch", async () => {
    const ordinaryPayload = { ...punchPayload };
    delete ordinaryPayload.trainingPlanCompletion;
    expect((await POST(request("POST", userId, ordinaryPayload))).status).toBe(200);
    expect((await PATCH(request("PATCH", userId, punchPayload))).status).toBe(200);

    const planDay = await prisma.trainingPlanDay.findUniqueOrThrow({
      where: { id: todayPlanDayId },
    });
    expect(planDay.completedAt).not.toBeNull();
    await expect(
      prisma.lotteryTicketLedger.count({
        where: { userId, dayKey: todayDayKey, reason: "FITNESS_PUNCH_GRANTED" },
      }),
    ).resolves.toBe(1);
  });

  it("rejects a future plan day without creating a punch", async () => {
    const futurePayload = {
      ...punchPayload,
      trainingPlanCompletion: {
        ...(punchPayload.trainingPlanCompletion as Record<string, unknown>),
        planDayId: futurePlanDayId,
      },
    };
    const response = await POST(request("POST", userId, futurePayload));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "training-plan-day-not-completable",
    });
    await expect(prisma.punchRecord.count({ where: { userId, dayKey: todayDayKey } })).resolves.toBe(
      0,
    );
  });

  it("resets plan completion when today's punch is undone", async () => {
    expect((await POST(request("POST", userId, punchPayload))).status).toBe(200);
    expect((await DELETE(request("DELETE", userId))).status).toBe(200);

    const planDay = await prisma.trainingPlanDay.findUniqueOrThrow({
      where: { id: todayPlanDayId },
      include: { exercises: true },
    });
    expect(planDay.completedAt).toBeNull();
    expect(planDay.workoutRecordId).toBeNull();
    expect(planDay.exercises.every((exercise) => exercise.completedAt === null)).toBe(true);
    expect(planDay.exercises.every((exercise) => exercise.actualWeightKg === null)).toBe(true);
  });
});
