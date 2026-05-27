import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  ExperienceError,
  FITNESS_PUNCH_EXP,
  TASK_COMPLETION_EXP,
  adjustExperience,
  getUserLevelSnapshot,
  grantFitnessPunchExperience,
  grantTaskCompletionExperience,
} from "@/lib/gamification/experience";
import { prisma } from "@/lib/prisma";

describe("gamification experience service", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives level snapshot from total exp", () => {
    expect(getUserLevelSnapshot(0)).toEqual({
      totalExp: 0,
      level: 1,
      currentLevelExp: 0,
      nextLevelExp: 1000,
      title: "自律牛马",
    });
    expect(getUserLevelSnapshot(10_240)).toMatchObject({
      totalExp: 10_240,
      level: 11,
      currentLevelExp: 240,
      title: "稳定脱脂牛马",
    });
    expect(getUserLevelSnapshot(25_000)).toMatchObject({
      totalExp: 25_000,
      level: 26,
      currentLevelExp: 0,
      title: "卷王预备役",
    });
    expect(getUserLevelSnapshot(-1.2)).toMatchObject({
      totalExp: 0,
      level: 1,
    });
  });

  it("adjusts exp and writes one ledger row", async () => {
    const result = await adjustExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      delta: 100,
      reason: "FITNESS_PUNCH_EXP",
      sourceType: "fitness_punch",
      sourceId: "punch-1",
      metadata: { punchRecordId: "punch-1" },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledger = await prisma.experienceLedger.findUniqueOrThrow({
      where: { sourceType_sourceId: { sourceType: "fitness_punch", sourceId: "punch-1" } },
    });

    expect(result.applied).toBe(true);
    expect(user.exp).toBe(100);
    expect(ledger.balanceAfter).toBe(100);
    expect(ledger.metadataJson).toBe(JSON.stringify({ punchRecordId: "punch-1" }));
  });

  it("is idempotent by source type and source id", async () => {
    const first = await grantFitnessPunchExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      punchRecordId: "punch-1",
    });
    const second = await grantFitnessPunchExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      punchRecordId: "punch-1",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.experienceLedger.findMany({ where: { userId } });

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.ledger.id).toBe(first.ledger.id);
    expect(user.exp).toBe(FITNESS_PUNCH_EXP);
    expect(ledgers).toHaveLength(1);
  });

  it("can run inside a caller-provided transaction", async () => {
    const result = await prisma.$transaction((tx) =>
      adjustExperience({
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 25,
        reason: "TEST_TRANSACTION",
        sourceType: "test_transaction",
        sourceId: "transaction-1",
        db: tx,
      }),
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(result.applied).toBe(true);
    expect(user.exp).toBe(25);
  });

  it("uses the task completion source key", async () => {
    await grantTaskCompletionExperience({
      userId,
      teamId,
      dayKey: "2026-05-25",
      assignmentId: "assignment-1",
    });

    const ledger = await prisma.experienceLedger.findFirstOrThrow({ where: { userId } });
    expect(ledger).toMatchObject({
      delta: TASK_COMPLETION_EXP,
      reason: "DAILY_TASK_COMPLETION_EXP",
      sourceType: "daily_task_assignment",
      sourceId: "assignment-1",
      balanceAfter: TASK_COMPLETION_EXP,
    });
  });

  it("rejects non-positive exp deltas", async () => {
    await expect(
      adjustExperience({
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 0,
        reason: "NOOP",
        sourceType: "noop",
        sourceId: "noop-1",
      }),
    ).rejects.toBeInstanceOf(ExperienceError);
  });
});
