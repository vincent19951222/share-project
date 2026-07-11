import { prisma } from "@/lib/prisma";
import {
  CARDIO_ITEMS,
  STRENGTH_PARTS,
  type CardioItem,
  type StrengthPart,
  type TrainingType,
} from "@/lib/workouts";
import {
  getExerciseById,
  getTrainingTemplate,
  type ExerciseCatalogEntry,
  type TrainingPhase,
  type TrainingTemplateExercise,
} from "@/lib/training-plan/content";
import {
  addShanghaiDays,
  deriveTrainingPlanDayStatus,
  getTrainingPlanStartDayKey,
  type CreateTrainingPlanInput,
  type TrainingPlanDayStatus,
} from "@/lib/training-plan/domain";
import { getShanghaiDayKey } from "@/lib/economy";

type PlanCardioItem = CardioItem | "bike";

export interface TrainingPlanWorkoutPayload {
  trainingType: TrainingType;
  cardioItem: PlanCardioItem | null;
  cardioItems: PlanCardioItem[];
  strengthParts: StrengthPart[];
  durationMinutes: number;
}

export interface TrainingPlanExerciseSnapshot {
  id: string;
  exerciseId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  phase: TrainingPhase;
  sortOrder: number;
  plannedSets: number | null;
  plannedReps: string | null;
  plannedSeconds: number | null;
  restSeconds: number | null;
  beginnerTip: string;
  homeAlternativeExerciseId: string | null;
  homeAlternativeName: string | null;
  completed: boolean;
  actualWeightKg: number | null;
  actualReps: string | null;
}

export interface TrainingPlanDaySnapshot {
  id: string;
  dayKey: string;
  weekIndex: number;
  weekday: number;
  title: string;
  estimatedMinutes: number;
  status: TrainingPlanDayStatus;
  workoutPayload: TrainingPlanWorkoutPayload;
  exercises: TrainingPlanExerciseSnapshot[];
}

export interface TrainingPlanSnapshot {
  id: string;
  templateId: string;
  templateVersion: number;
  status: "ACTIVE" | "COMPLETED";
  startDayKey: string;
  endDayKey: string;
  currentWeekIndex: number;
  todayDay: TrainingPlanDaySnapshot | null;
  nextDay: TrainingPlanDaySnapshot | null;
  days: TrainingPlanDaySnapshot[];
}

export class ActiveTrainingPlanExistsError extends Error {
  constructor() {
    super("active-plan-exists");
    this.name = "ActiveTrainingPlanExistsError";
  }
}

export class TrainingTemplateNotFoundError extends Error {
  constructor() {
    super("training-template-not-found");
    this.name = "TrainingTemplateNotFoundError";
  }
}

const BODY_PART_TO_STRENGTH_PART: Partial<Record<string, StrengthPart>> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulder",
  "upper arms": "arms",
  waist: "abs",
  "upper legs": "legs",
  "lower legs": "legs",
};

function resolveTemplateExercise(
  item: TrainingTemplateExercise,
  avoidTags: Set<string>,
): ExerciseCatalogEntry {
  const exercise = getExerciseById(item.exerciseId);
  if (!exercise) throw new TrainingTemplateNotFoundError();

  if (!exercise.avoidTags.some((tag) => avoidTags.has(tag))) {
    return exercise;
  }

  const alternative = exercise.homeAlternativeId
    ? getExerciseById(exercise.homeAlternativeId)
    : null;
  if (!alternative || alternative.avoidTags.some((tag) => avoidTags.has(tag))) {
    throw new TrainingTemplateNotFoundError();
  }
  return alternative;
}

function getCardioItem(exercise: ExerciseCatalogEntry): PlanCardioItem | null {
  if (exercise.bodyPart !== "cardio") return null;
  if (exercise.equipment === "elliptical machine") return "elliptical";
  if (exercise.equipment === "stationary bike") return "bike";
  if (exercise.nameEn.toLowerCase().includes("treadmill")) return "treadmill";
  return "walk";
}

function buildWorkoutPayload(
  exercises: ExerciseCatalogEntry[],
  durationMinutes: number,
): TrainingPlanWorkoutPayload {
  const cardioSelection = new Set<PlanCardioItem>();
  const strengthSelection = new Set<StrengthPart>();

  for (const exercise of exercises) {
    const cardioItem = getCardioItem(exercise);
    if (cardioItem) cardioSelection.add(cardioItem);
    const strengthPart = BODY_PART_TO_STRENGTH_PART[exercise.bodyPart];
    if (strengthPart) strengthSelection.add(strengthPart);
  }

  const cardioCatalog: PlanCardioItem[] = [
    "treadmill",
    "elliptical",
    "bike",
    ...CARDIO_ITEMS.filter((item) => item !== "treadmill" && item !== "elliptical"),
  ];
  const cardioItems = cardioCatalog.filter((item) => cardioSelection.has(item));
  const strengthParts = STRENGTH_PARTS.filter((item) => strengthSelection.has(item));
  const trainingType: TrainingType =
    cardioItems.length > 0 && strengthParts.length > 0
      ? "both"
      : cardioItems.length > 0
        ? "cardio"
        : "strength";

  return {
    trainingType,
    cardioItem: cardioItems[0] ?? null,
    cardioItems,
    strengthParts,
    durationMinutes,
  };
}

function dayDifference(startDayKey: string, endDayKey: string): number {
  const start = Date.parse(`${startDayKey}T12:00:00Z`);
  const end = Date.parse(`${endDayKey}T12:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
}

async function settleExpiredPlans(userId: string, todayDayKey: string, now: Date) {
  await prisma.trainingPlan.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      endDayKey: { lt: todayDayKey },
    },
    data: {
      status: "COMPLETED",
      completedAt: now,
    },
  });
}

export async function getCurrentTrainingPlanSnapshot({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<TrainingPlanSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  await settleExpiredPlans(userId, todayDayKey, now);

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      days: {
        orderBy: { dayKey: "asc" },
        include: {
          exercises: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!plan) return null;

  const days: TrainingPlanDaySnapshot[] = plan.days.map((day) => ({
    id: day.id,
    dayKey: day.dayKey,
    weekIndex: day.weekIndex,
    weekday: day.weekday,
    title: day.title,
    estimatedMinutes: day.estimatedMinutes,
    status: deriveTrainingPlanDayStatus({
      dayKey: day.dayKey,
      todayDayKey,
      completedAt: day.completedAt,
    }),
    workoutPayload: JSON.parse(day.workoutPayloadJson) as TrainingPlanWorkoutPayload,
    exercises: day.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment,
      phase: exercise.phase as TrainingPhase,
      sortOrder: exercise.sortOrder,
      plannedSets: exercise.plannedSets,
      plannedReps: exercise.plannedReps,
      plannedSeconds: exercise.plannedSeconds,
      restSeconds: exercise.restSeconds,
      beginnerTip: exercise.beginnerTip,
      homeAlternativeExerciseId: exercise.homeAlternativeExerciseId,
      homeAlternativeName: exercise.homeAlternativeName,
      completed: exercise.completedAt !== null,
      actualWeightKg: exercise.actualWeightKg,
      actualReps: exercise.actualReps,
    })),
  }));

  const daysIntoPlan = dayDifference(plan.startDayKey, todayDayKey);
  const currentWeekIndex =
    daysIntoPlan < 0 ? 1 : Math.max(1, Math.min(4, Math.floor(daysIntoPlan / 7) + 1));

  return {
    id: plan.id,
    templateId: plan.templateId,
    templateVersion: plan.templateVersion,
    status: plan.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
    startDayKey: plan.startDayKey,
    endDayKey: plan.endDayKey,
    currentWeekIndex,
    todayDay: days.find((day) => day.dayKey === todayDayKey) ?? null,
    nextDay:
      days.find(
        (day) =>
          day.dayKey >= todayDayKey &&
          day.status !== "completed" &&
          day.status !== "missed",
      ) ?? null,
    days,
  };
}

export async function createTrainingPlanForUser({
  userId,
  now = new Date(),
  input,
}: {
  userId: string;
  now?: Date;
  input: CreateTrainingPlanInput;
}): Promise<TrainingPlanSnapshot> {
  if (input.equipment.length !== 1 || input.equipment[0] !== "gym") {
    throw new TrainingTemplateNotFoundError();
  }
  const template = getTrainingTemplate(
    input.weeklyFrequency,
    input.sessionDurationMinutes,
  );
  if (!template) throw new TrainingTemplateNotFoundError();

  const todayDayKey = getShanghaiDayKey(now);
  const startDayKey = getTrainingPlanStartDayKey(now);
  const endDayKey = addShanghaiDays(startDayKey, 27);
  const avoidTags = new Set(input.avoidTags);

  await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({
      where: { userId, status: "ACTIVE", endDayKey: { lt: todayDayKey } },
      data: { status: "COMPLETED", completedAt: now },
    });
    const activePlan = await tx.trainingPlan.findFirst({
      where: { userId, status: "ACTIVE", endDayKey: { gte: todayDayKey } },
      select: { id: true },
    });
    if (activePlan) throw new ActiveTrainingPlanExistsError();

    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new Error("user-not-found");

    await tx.trainingProfile.upsert({
      where: { userId },
      create: {
        userId,
        weeklyFrequency: input.weeklyFrequency,
        sessionDurationMinutes: input.sessionDurationMinutes,
        weekdaysJson: JSON.stringify(input.weekdays),
        equipmentJson: JSON.stringify(input.equipment),
        avoidTagsJson: JSON.stringify(input.avoidTags),
      },
      update: {
        weeklyFrequency: input.weeklyFrequency,
        sessionDurationMinutes: input.sessionDurationMinutes,
        weekdaysJson: JSON.stringify(input.weekdays),
        equipmentJson: JSON.stringify(input.equipment),
        avoidTagsJson: JSON.stringify(input.avoidTags),
      },
    });

    const planDays = template.weeks.flatMap((week) =>
      week.sessions.map((session) => {
        const weekday = input.weekdays[session.slot];
        const dayKey = addShanghaiDays(
          startDayKey,
          (week.weekIndex - 1) * 7 + (weekday - 1),
        );
        const resolved = session.exercises.map((item) => ({
          item,
          exercise: resolveTemplateExercise(item, avoidTags),
        }));
        const workoutPayload = buildWorkoutPayload(
          resolved.map((entry) => entry.exercise),
          session.estimatedMinutes,
        );

        return {
          dayKey,
          weekIndex: week.weekIndex,
          weekday,
          title: session.title,
          estimatedMinutes: session.estimatedMinutes,
          workoutPayloadJson: JSON.stringify(workoutPayload),
          exercises: {
            create: resolved.map(({ item, exercise }, sortOrder) => {
              const homeAlternative = exercise.homeAlternativeId
                ? getExerciseById(exercise.homeAlternativeId)
                : null;
              return {
                exerciseId: exercise.id,
                name: exercise.nameZh,
                bodyPart: exercise.bodyPart,
                equipment: exercise.equipment,
                phase: item.phase,
                sortOrder,
                plannedSets: item.sets,
                plannedReps: item.reps,
                plannedSeconds: item.seconds,
                restSeconds: item.restSeconds,
                beginnerTip: exercise.beginnerTip,
                homeAlternativeExerciseId: homeAlternative?.id ?? null,
                homeAlternativeName: homeAlternative?.nameZh ?? null,
              };
            }),
          },
        };
      }),
    );

    await tx.trainingPlan.create({
      data: {
        userId,
        templateId: template.id,
        templateVersion: template.version,
        status: "ACTIVE",
        startDayKey,
        endDayKey,
        profileSnapshotJson: JSON.stringify(input),
        days: { create: planDays },
      },
    });
  });

  const snapshot = await getCurrentTrainingPlanSnapshot({ userId, now });
  if (!snapshot) throw new Error("training-plan-create-failed");
  return snapshot;
}
