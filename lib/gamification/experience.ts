import { Prisma } from "@/lib/generated/prisma/client";
import { prisma, type PrismaClientOrTransaction } from "@/lib/prisma";

export const TASK_COMPLETION_EXP = 50;
export const FITNESS_PUNCH_EXP = 100;
export const LEVEL_EXP_SIZE = 1000;

export class ExperienceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperienceError";
  }
}

function isPrismaClient(db: PrismaClientOrTransaction): db is typeof prisma {
  return "$transaction" in db;
}

async function runInTransaction<T>(
  db: PrismaClientOrTransaction,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (isPrismaClient(db)) {
    return db.$transaction(callback);
  }

  return callback(db);
}

export function getUserLevelSnapshot(totalExp: number) {
  const normalizedExp = Math.max(0, Math.floor(totalExp));
  const level = Math.floor(normalizedExp / LEVEL_EXP_SIZE) + 1;

  return {
    totalExp: normalizedExp,
    level,
    currentLevelExp: normalizedExp % LEVEL_EXP_SIZE,
    nextLevelExp: LEVEL_EXP_SIZE,
    title: level >= 25 ? "卷王预备役" : level >= 10 ? "稳定脱脂牛马" : "自律牛马",
  };
}

export async function adjustExperience(input: {
  userId: string;
  teamId: string;
  dayKey: string;
  delta: number;
  reason: string;
  sourceType: string;
  sourceId: string;
  metadata?: unknown;
  db?: PrismaClientOrTransaction;
}) {
  if (input.delta <= 0) {
    throw new ExperienceError("Experience delta must be positive");
  }

  const db = input.db ?? prisma;

  try {
    return await runInTransaction(db, async (tx) => {
      const existingLedger = await tx.experienceLedger.findUnique({
        where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
      });

      if (existingLedger) {
        return { ledger: existingLedger, applied: false as const };
      }

      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { exp: true },
      });
      const balanceAfter = user.exp + input.delta;

      await tx.user.update({
        where: { id: input.userId },
        data: { exp: balanceAfter },
      });

      const ledger = await tx.experienceLedger.create({
        data: {
          userId: input.userId,
          teamId: input.teamId,
          dayKey: input.dayKey,
          delta: input.delta,
          balanceAfter,
          reason: input.reason,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          metadataJson: input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
        },
      });

      return { ledger, applied: true as const };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const ledger = await db.experienceLedger.findUniqueOrThrow({
        where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
      });

      return { ledger, applied: false as const };
    }

    throw error;
  }
}

export function grantTaskCompletionExperience(input: {
  userId: string;
  teamId: string;
  dayKey: string;
  assignmentId: string;
  db?: PrismaClientOrTransaction;
}) {
  return adjustExperience({
    ...input,
    delta: TASK_COMPLETION_EXP,
    reason: "DAILY_TASK_COMPLETION_EXP",
    sourceType: "daily_task_assignment",
    sourceId: input.assignmentId,
    metadata: { assignmentId: input.assignmentId },
  });
}

export function grantFitnessPunchExperience(input: {
  userId: string;
  teamId: string;
  dayKey: string;
  punchRecordId: string;
  db?: PrismaClientOrTransaction;
}) {
  return adjustExperience({
    ...input,
    delta: FITNESS_PUNCH_EXP,
    reason: "FITNESS_PUNCH_EXP",
    sourceType: "fitness_punch",
    sourceId: input.punchRecordId,
    metadata: { punchRecordId: input.punchRecordId },
  });
}
