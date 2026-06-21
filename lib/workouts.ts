import type { Prisma } from "@/lib/generated/prisma/client";

export const TRAINING_TYPES = ["cardio", "strength", "both"] as const;
export const CARDIO_ITEMS = ["treadmill", "elliptical", "walk", "swim"] as const;
export const STRENGTH_PARTS = ["chest", "back", "shoulder", "arms", "glutes", "legs", "abs"] as const;

export type TrainingType = (typeof TRAINING_TYPES)[number];
export type CardioItem = (typeof CARDIO_ITEMS)[number];
export type StrengthPart = (typeof STRENGTH_PARTS)[number];
export type WorkoutEntryCategory = "cardio" | "strength";

export type WorkoutTicketPayload = {
  trainingType: TrainingType;
  cardioItem: CardioItem | null;
  strengthParts: StrengthPart[];
  durationMinutes: number;
};

export type WorkoutCreatePayload = Omit<WorkoutTicketPayload, "durationMinutes"> & {
  durationMinutes: number | null;
};

export type WorkoutEntryInput = {
  category: WorkoutEntryCategory;
  code: CardioItem | StrengthPart;
  label: string;
};

export type WorkoutParseResult =
  | { ok: true; payload: WorkoutTicketPayload }
  | { ok: false; error: "invalid-workout-payload" };

const cardioLabels: Record<CardioItem, string> = {
  treadmill: "跑步机",
  elliptical: "椭圆机",
  walk: "散步",
  swim: "游泳",
};

const strengthLabels: Record<StrengthPart, string> = {
  chest: "胸",
  back: "背",
  shoulder: "肩",
  arms: "手臂",
  glutes: "臀",
  legs: "腿",
  abs: "腹",
};

export function getCardioItemLabel(item: CardioItem): string {
  return cardioLabels[item];
}

export function getStrengthPartLabel(part: StrengthPart): string {
  return strengthLabels[part];
}

function isTrainingType(value: unknown): value is TrainingType {
  return typeof value === "string" && TRAINING_TYPES.includes(value as TrainingType);
}

function isCardioItem(value: unknown): value is CardioItem {
  return typeof value === "string" && CARDIO_ITEMS.includes(value as CardioItem);
}

function isStrengthPart(value: unknown): value is StrengthPart {
  return typeof value === "string" && STRENGTH_PARTS.includes(value as StrengthPart);
}

function normalizeStrengthParts(value: unknown): StrengthPart[] | null {
  if (!Array.isArray(value)) return null;

  const selected = new Set<StrengthPart>();

  for (const item of value) {
    if (!isStrengthPart(item)) return null;
    selected.add(item);
  }

  return STRENGTH_PARTS.filter((part) => selected.has(part));
}

function isValidDuration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 10 &&
    value <= 180 &&
    value % 10 === 0
  );
}

function isValidCreateDuration(value: unknown): value is number | null {
  return value === null || isValidDuration(value);
}

function hasCatalogOrderedStrengthParts(value: StrengthPart[]): boolean {
  const normalized = normalizeStrengthParts(value);

  if (normalized === null || normalized.length !== value.length) return false;

  return normalized.every((part, index) => part === value[index]);
}

function isValidWorkoutCreatePayload(payload: WorkoutCreatePayload): boolean {
  if (
    !isTrainingType(payload.trainingType) ||
    !isValidCreateDuration(payload.durationMinutes) ||
    !Array.isArray(payload.strengthParts) ||
    !hasCatalogOrderedStrengthParts(payload.strengthParts)
  ) {
    return false;
  }

  const cardioItem = payload.cardioItem;

  if (payload.trainingType === "cardio") {
    return isCardioItem(cardioItem) && payload.strengthParts.length === 0;
  }

  if (payload.trainingType === "strength") {
    return cardioItem === null && payload.strengthParts.length > 0;
  }

  return isCardioItem(cardioItem) && payload.strengthParts.length > 0;
}

export function parseWorkoutTicketPayload(input: unknown): WorkoutParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid-workout-payload" };
  }

  const body = input as Record<string, unknown>;
  const trainingType = body.trainingType;
  const durationMinutes = body.durationMinutes;
  const strengthParts = normalizeStrengthParts(body.strengthParts);

  if (!isTrainingType(trainingType) || strengthParts === null || !isValidDuration(durationMinutes)) {
    return { ok: false, error: "invalid-workout-payload" };
  }

  const cardioItem = isCardioItem(body.cardioItem) ? body.cardioItem : null;

  if (trainingType === "cardio") {
    if (!cardioItem) return { ok: false, error: "invalid-workout-payload" };

    return {
      ok: true,
      payload: {
        trainingType,
        cardioItem,
        strengthParts: [],
        durationMinutes,
      },
    };
  }

  if (trainingType === "strength") {
    if (strengthParts.length === 0) return { ok: false, error: "invalid-workout-payload" };

    return {
      ok: true,
      payload: {
        trainingType,
        cardioItem: null,
        strengthParts,
        durationMinutes,
      },
    };
  }

  if (!cardioItem || strengthParts.length === 0) {
    return { ok: false, error: "invalid-workout-payload" };
  }

  return {
    ok: true,
    payload: {
      trainingType,
      cardioItem,
      strengthParts,
      durationMinutes,
    },
  };
}

export function buildDefaultWorkoutPayload(): WorkoutCreatePayload {
  return {
    trainingType: "cardio",
    cardioItem: "treadmill",
    strengthParts: [],
    durationMinutes: null,
  };
}

export function buildWorkoutEntries(payload: WorkoutCreatePayload): WorkoutEntryInput[] {
  const entries: WorkoutEntryInput[] = [];

  if ((payload.trainingType === "cardio" || payload.trainingType === "both") && payload.cardioItem) {
    entries.push({
      category: "cardio",
      code: payload.cardioItem,
      label: cardioLabels[payload.cardioItem],
    });
  }

  if (payload.trainingType === "strength" || payload.trainingType === "both") {
    for (const part of payload.strengthParts) {
      entries.push({
        category: "strength",
        code: part,
        label: strengthLabels[part],
      });
    }
  }

  return entries;
}

export function buildWorkoutSummary(payload: WorkoutCreatePayload): string {
  const cardioText = payload.cardioItem ? cardioLabels[payload.cardioItem] : "";
  const strengthText = payload.strengthParts.map((part) => strengthLabels[part]).join(" / ");
  const durationText = payload.durationMinutes ? ` · ${payload.durationMinutes} 分钟` : "";

  if (payload.trainingType === "both") {
    return `${cardioText} + ${strengthText}${durationText}`;
  }

  if (payload.trainingType === "strength") {
    return `${strengthText}${durationText}`;
  }

  return `${cardioText}${durationText}`;
}

type WorkoutTx = Pick<Prisma.TransactionClient, "workoutRecord">;
type WorkoutReplaceTx = Pick<Prisma.TransactionClient, "workoutRecord">;

type StoredWorkoutEntry = {
  category: string;
  code: string;
  label: string;
};

type StoredWorkoutRecord = {
  trainingType: string;
  durationMinutes: number | null;
  entries: StoredWorkoutEntry[];
};

export async function createWorkoutForPunch({
  tx,
  userId,
  teamId,
  punchRecordId,
  dayKey,
  payload,
}: {
  tx: WorkoutTx;
  userId: string;
  teamId: string;
  punchRecordId: string;
  dayKey: string;
  payload: WorkoutCreatePayload;
}) {
  if (!isValidWorkoutCreatePayload(payload)) {
    throw new Error("invalid-workout-payload");
  }

  const entries = buildWorkoutEntries(payload);

  return tx.workoutRecord.create({
    data: {
      userId,
      teamId,
      punchRecordId,
      dayKey,
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        create: entries,
      },
    },
    include: {
      entries: true,
    },
  });
}

export function mapWorkoutRecordToTicketPayload(
  workout: StoredWorkoutRecord | null,
): WorkoutTicketPayload | null {
  if (!workout) {
    return null;
  }

  const cardioEntry = workout.entries.find(
    (entry) => entry.category === "cardio" && isCardioItem(entry.code),
  );
  const strengthParts = STRENGTH_PARTS.filter((part) =>
    workout.entries.some((entry) => entry.category === "strength" && entry.code === part),
  );
  const parsed = parseWorkoutTicketPayload({
    trainingType: workout.trainingType,
    cardioItem: cardioEntry?.code ?? null,
    strengthParts,
    durationMinutes: workout.durationMinutes ?? 60,
  });

  return parsed.ok ? parsed.payload : null;
}

export async function replaceWorkoutForPunch({
  tx,
  userId,
  teamId,
  punchRecordId,
  dayKey,
  payload,
}: {
  tx: WorkoutReplaceTx;
  userId: string;
  teamId: string;
  punchRecordId: string;
  dayKey: string;
  payload: WorkoutCreatePayload;
}) {
  if (!isValidWorkoutCreatePayload(payload)) {
    throw new Error("invalid-workout-payload");
  }

  const entries = buildWorkoutEntries(payload);

  return tx.workoutRecord.upsert({
    where: { punchRecordId },
    create: {
      userId,
      teamId,
      punchRecordId,
      dayKey,
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        create: entries,
      },
    },
    update: {
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        deleteMany: {},
        create: entries,
      },
    },
    include: {
      entries: true,
    },
  });
}

export async function createDefaultWorkoutForPunch(
  input: Omit<Parameters<typeof createWorkoutForPunch>[0], "payload">,
) {
  return createWorkoutForPunch({
    ...input,
    payload: buildDefaultWorkoutPayload(),
  });
}

type WorkoutBackfillDb = {
  punchRecord: Prisma.TransactionClient["punchRecord"];
  workoutRecord: Prisma.TransactionClient["workoutRecord"];
  $transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
};

export async function backfillDefaultWorkoutRecords({ prisma }: { prisma: WorkoutBackfillDb }) {
  const legacyPunches = await prisma.punchRecord.findMany({
    where: {
      punched: true,
    },
    select: {
      id: true,
      userId: true,
      dayKey: true,
      user: {
        select: {
          teamId: true,
        },
      },
      workoutRecord: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [{ dayKey: "asc" }, { createdAt: "asc" }],
  });

  let created = 0;
  let skipped = 0;

  for (const punch of legacyPunches) {
    if (punch.workoutRecord) {
      skipped += 1;
      continue;
    }

    const didCreate = await prisma.$transaction(async (tx) => {
      const existingWorkout = await tx.workoutRecord.findUnique({
        where: { punchRecordId: punch.id },
        select: { id: true },
      });

      if (existingWorkout) {
        return false;
      }

      await createDefaultWorkoutForPunch({
        tx,
        userId: punch.userId,
        teamId: punch.user.teamId,
        punchRecordId: punch.id,
        dayKey: punch.dayKey,
      });

      return true;
    });

    if (didCreate) {
      created += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    scanned: legacyPunches.length,
    created,
    skipped,
  };
}
