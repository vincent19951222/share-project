import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import {
  claimDailyTasksTicket,
  completeDailyTask,
  ensureTodayTaskAssignments,
  rerollDailyTask,
} from "@/lib/gamification/tasks";
import type { TaskDimensionKey } from "@/content/gamification/types";

const TASK_DIMENSIONS: TaskDimensionKey[] = ["movement", "hydration", "social", "learning"];

async function seedCompletedFourDimensionAssignments(input: {
  userId: string;
  teamId: string;
  dayKey: string;
}) {
  await Promise.all(
    TASK_DIMENSIONS.map((dimensionKey) =>
      prisma.dailyTaskAssignment.upsert({
        where: {
          userId_dayKey_dimensionKey: {
            userId: input.userId,
            dayKey: input.dayKey,
            dimensionKey,
          },
        },
        update: {
          completedAt: new Date(`${input.dayKey}T09:00:00+08:00`),
        },
        create: {
          userId: input.userId,
          teamId: input.teamId,
          dayKey: input.dayKey,
          dimensionKey,
          taskCardId: `${dimensionKey}_001`,
          completedAt: new Date(`${input.dayKey}T09:00:00+08:00`),
        },
      }),
    ),
  );
}

describe("gamification daily tasks", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    dayKey = getShanghaiDayKey(fixedNow);
    await prisma.teamDynamic.deleteMany({ where: { teamId } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates one assignment for each dimension and is idempotent", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await ensureTodayTaskAssignments({ userId, rng: () => 0.99 });

    const assignments = await prisma.dailyTaskAssignment.findMany({
      where: { userId, dayKey },
      orderBy: { dimensionKey: "asc" },
    });

    expect(assignments).toHaveLength(4);
    expect(new Set(assignments.map((assignment) => assignment.dimensionKey))).toEqual(
      new Set(TASK_DIMENSIONS),
    );
    expect(assignments.every((assignment) => assignment.teamId === teamId)).toBe(true);
    expect(assignments.every((assignment) => assignment.rerollCount === 0)).toBe(true);
  });

  it("marks a dimension task complete with optional completion text", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });

    await completeDailyTask({
      userId,
      dimensionKey: "movement",
      completionText: "屁股离线",
    });

    const assignment = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    expect(assignment.completedAt).toBeInstanceOf(Date);
    expect(assignment.completionText).toBe("屁股离线");
  });

  it("does not rewrite an already completed task", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await completeDailyTask({
      userId,
      dimensionKey: "movement",
      completionText: "第一次",
    });
    const before = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    await completeDailyTask({
      userId,
      dimensionKey: "movement",
      completionText: "第二次",
    });

    const after = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    expect(after.completedAt?.toISOString()).toBe(before.completedAt?.toISOString());
    expect(after.completionText).toBe("第一次");
  });

  it("rerolls an incomplete task once per dimension", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    const before = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    await rerollDailyTask({
      userId,
      dimensionKey: "movement",
      rng: () => 0.99,
    });

    const after = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    expect(after.taskCardId).not.toBe(before.taskCardId);
    expect(after.rerollCount).toBe(1);
    expect(after.rerolledFromTaskCardId).toBe(before.taskCardId);

    await expect(
      rerollDailyTask({
        userId,
        dimensionKey: "movement",
        rng: () => 0.5,
      }),
    ).rejects.toThrow(/今天这个维度已经换过一次/);
  });

  it("rejects reroll after completion", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await completeDailyTask({ userId, dimensionKey: "movement" });

    await expect(
      rerollDailyTask({
        userId,
        dimensionKey: "movement",
        rng: () => 0.99,
      }),
    ).rejects.toThrow(/已完成的任务不能再换/);
  });

  it("rejects life-ticket claim before all four tasks are complete", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });
    await completeDailyTask({ userId, dimensionKey: "movement" });

    await expect(claimDailyTasksTicket({ userId })).rejects.toThrow(
      /四项任务全部完成后才能领取生活券/,
    );
  });

  it("grants one life ticket after all four tasks are complete", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });

    for (const dimensionKey of TASK_DIMENSIONS) {
      await completeDailyTask({ userId, dimensionKey });
    }

    await claimDailyTasksTicket({ userId });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey,
        reason: "DAILY_TASKS_GRANTED",
      },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
    expect(ledgers[0]).toMatchObject({
      delta: 1,
      balanceAfter: 1,
      sourceType: "daily_tasks",
      sourceId: `${userId}:${dayKey}`,
    });
  });

  it("writes a team dynamic when all-four completion streak reaches 3 days", async () => {
    const dayKeys = ["2026-04-24", "2026-04-25", "2026-04-26"];

    for (const key of dayKeys) {
      await seedCompletedFourDimensionAssignments({ userId, teamId, dayKey: key });
    }

    await claimDailyTasksTicket({
      userId,
      now: new Date("2026-04-26T09:00:00+08:00"),
    });

    const dynamic = await prisma.teamDynamic.findFirstOrThrow({
      where: {
        teamId,
        type: "GAME_TASK_STREAK_MILESTONE",
        sourceType: "daily_task_streak",
        sourceId: `${userId}:3:2026-04-26`,
      },
    });

    expect(dynamic.title).toContain("连续 3 天");
  });

  it("does not grant a second ticket on repeated claim", async () => {
    await ensureTodayTaskAssignments({ userId, rng: () => 0.01 });

    for (const dimensionKey of TASK_DIMENSIONS) {
      await completeDailyTask({ userId, dimensionKey });
    }

    await claimDailyTasksTicket({ userId });
    await claimDailyTasksTicket({ userId });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey,
        reason: "DAILY_TASKS_GRANTED",
      },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });
});
