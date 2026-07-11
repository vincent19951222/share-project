import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface TrainingPlanExerciseResultInput {
  planExerciseId: string;
  completed: boolean;
  actualWeightKg: number | null;
  actualReps: string | null;
}

export interface TrainingPlanCompletionInput {
  planDayId: string;
  exercises: TrainingPlanExerciseResultInput[];
}

export class TrainingPlanDayNotCompletableError extends Error {
  constructor() {
    super("training-plan-day-not-completable");
    this.name = "TrainingPlanDayNotCompletableError";
  }
}

function isValidWeight(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 500 &&
      Math.round(value * 10) === value * 10)
  );
}

function isValidReps(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length <= 32);
}

export function parseTrainingPlanCompletion(
  input: unknown,
):
  | { ok: true; value: TrainingPlanCompletionInput | null }
  | { ok: false; error: "invalid-training-plan-completion" } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: true, value: null };
  }

  const raw = (input as Record<string, unknown>).trainingPlanCompletion;
  if (raw === undefined) return { ok: true, value: null };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid-training-plan-completion" };
  }

  const body = raw as Record<string, unknown>;
  if (typeof body.planDayId !== "string" || body.planDayId.length === 0) {
    return { ok: false, error: "invalid-training-plan-completion" };
  }
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return { ok: false, error: "invalid-training-plan-completion" };
  }

  const results: TrainingPlanExerciseResultInput[] = [];
  const ids = new Set<string>();
  for (const item of body.exercises) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "invalid-training-plan-completion" };
    }
    const result = item as Record<string, unknown>;
    if (
      typeof result.planExerciseId !== "string" ||
      result.planExerciseId.length === 0 ||
      ids.has(result.planExerciseId) ||
      typeof result.completed !== "boolean" ||
      !isValidWeight(result.actualWeightKg) ||
      !isValidReps(result.actualReps)
    ) {
      return { ok: false, error: "invalid-training-plan-completion" };
    }
    ids.add(result.planExerciseId);
    results.push({
      planExerciseId: result.planExerciseId,
      completed: result.completed,
      actualWeightKg: result.actualWeightKg,
      actualReps: result.actualReps === null ? null : result.actualReps.trim() || null,
    });
  }

  return {
    ok: true,
    value: {
      planDayId: body.planDayId,
      exercises: results,
    },
  };
}

export async function completeTrainingPlanDay({
  tx,
  userId,
  dayKey,
  workoutRecordId,
  input,
  now,
}: {
  tx: Prisma.TransactionClient;
  userId: string;
  dayKey: string;
  workoutRecordId: string;
  input: TrainingPlanCompletionInput;
  now: Date;
}): Promise<void> {
  const planDay = await tx.trainingPlanDay.findFirst({
    where: {
      id: input.planDayId,
      dayKey,
      plan: { userId },
    },
    include: { exercises: true },
  });
  if (!planDay) throw new TrainingPlanDayNotCompletableError();
  if (planDay.completedAt) {
    if (planDay.workoutRecordId === workoutRecordId) return;
    throw new TrainingPlanDayNotCompletableError();
  }

  const storedIds = new Set(planDay.exercises.map((exercise) => exercise.id));
  const inputIds = new Set(input.exercises.map((exercise) => exercise.planExerciseId));
  if (
    storedIds.size !== inputIds.size ||
    [...storedIds].some((exerciseId) => !inputIds.has(exerciseId))
  ) {
    throw new TrainingPlanDayNotCompletableError();
  }

  for (const result of input.exercises) {
    await tx.trainingPlanExercise.update({
      where: { id: result.planExerciseId },
      data: {
        completedAt: result.completed ? now : null,
        actualWeightKg: result.completed ? result.actualWeightKg : null,
        actualReps: result.completed ? result.actualReps : null,
      },
    });
  }
  await tx.trainingPlanDay.update({
    where: { id: planDay.id },
    data: { completedAt: now, workoutRecordId },
  });
}

export async function resetTrainingPlanDayForWorkout({
  tx,
  workoutRecordId,
}: {
  tx: Prisma.TransactionClient;
  workoutRecordId: string;
}): Promise<void> {
  const planDay = await tx.trainingPlanDay.findUnique({
    where: { workoutRecordId },
    select: { id: true },
  });
  if (!planDay) return;

  await tx.trainingPlanExercise.updateMany({
    where: { planDayId: planDay.id },
    data: {
      completedAt: null,
      actualWeightKg: null,
      actualReps: null,
    },
  });
  await tx.trainingPlanDay.update({
    where: { id: planDay.id },
    data: { completedAt: null, workoutRecordId: null },
  });
}

export async function isTrainingPlanCompletionAlreadyApplied({
  userId,
  dayKey,
  input,
}: {
  userId: string;
  dayKey: string;
  input: TrainingPlanCompletionInput;
}): Promise<boolean> {
  const planDay = await prisma.trainingPlanDay.findFirst({
    where: {
      id: input.planDayId,
      dayKey,
      completedAt: { not: null },
      workoutRecordId: { not: null },
      plan: { userId },
    },
    select: { id: true },
  });
  return planDay !== null;
}
