import { Prisma } from "@/lib/generated/prisma/client";
import { getShanghaiDayKey } from "@/lib/economy";
import { getGamificationDimensions, getTaskCards } from "@/lib/gamification/content";
import { adjustLotteryTickets } from "@/lib/gamification/db";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { prisma } from "@/lib/prisma";
import type { TaskCardDefinition, TaskDimensionKey } from "@/content/gamification/types";
import type { GamificationStateSnapshot } from "@/lib/types";

const REROLL_LIMIT_PER_DIMENSION = 1;
const COMPLETION_TEXT_LIMIT = 80;
const DAY_MS = 86_400_000;

const DIMENSION_KEYS = getGamificationDimensions().map((dimension) => dimension.key);

type Rng = () => number;

interface UserTeamIdentity {
  id: string;
  teamId: string;
}

interface PreviousAssignment {
  taskCardId: string;
  dayKey: string;
}

export interface EnsureTodayTaskAssignmentsInput {
  userId: string;
  now?: Date;
  rng?: Rng;
}

export interface CompleteDailyTaskInput {
  userId: string;
  dimensionKey: TaskDimensionKey;
  completionText?: string;
  now?: Date;
}

export interface RerollDailyTaskInput {
  userId: string;
  dimensionKey: TaskDimensionKey;
  now?: Date;
  rng?: Rng;
}

export interface ClaimDailyTasksTicketInput {
  userId: string;
  now?: Date;
}

export class GamificationTaskError extends Error {
  readonly status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "GamificationTaskError";
    this.status = status;
  }
}

function assertDimensionKey(value: string): asserts value is TaskDimensionKey {
  if (!DIMENSION_KEYS.includes(value as TaskDimensionKey)) {
    throw new GamificationTaskError("未知任务维度", 400);
  }
}

function normalizeCompletionText(text: string | undefined): string | null {
  const normalized = text?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.length > COMPLETION_TEXT_LIMIT) {
    throw new GamificationTaskError(`完成状态词不能超过 ${COMPLETION_TEXT_LIMIT} 个字符`, 400);
  }

  return normalized;
}

function dayKeyToUtcTime(dayKey: string): number {
  const [yearText, monthText, dayText] = dayKey.split("-");
  return Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function isWeekend(dayKey: string): boolean {
  const weekday = new Date(dayKeyToUtcTime(dayKey)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function isWithinCooldown(
  card: TaskCardDefinition,
  todayDayKey: string,
  previousDayKeys: string[],
) {
  if (card.repeatCooldownDays <= 0) {
    return false;
  }

  const todayTime = dayKeyToUtcTime(todayDayKey);

  return previousDayKeys.some((dayKey) => {
    const diffDays = Math.floor((todayTime - dayKeyToUtcTime(dayKey)) / DAY_MS);
    return diffDays > 0 && diffDays <= card.repeatCooldownDays;
  });
}

function selectWeightedTaskCard(cards: TaskCardDefinition[], rng: Rng): TaskCardDefinition {
  const totalWeight = cards.reduce((sum, card) => sum + card.weight, 0);
  let cursor = Math.min(Math.max(rng(), 0), 0.999_999) * totalWeight;

  for (const card of cards) {
    cursor -= card.weight;

    if (cursor < 0) {
      return card;
    }
  }

  return cards[cards.length - 1];
}

function chooseTaskCard({
  dimensionKey,
  dayKey,
  previousAssignments,
  excludedTaskCardIds = [],
  rng,
}: {
  dimensionKey: TaskDimensionKey;
  dayKey: string;
  previousAssignments: PreviousAssignment[];
  excludedTaskCardIds?: string[];
  rng: Rng;
}): TaskCardDefinition {
  const excluded = new Set(excludedTaskCardIds);
  const weekend = isWeekend(dayKey);
  const allCards = getTaskCards().filter(
    (card) =>
      card.enabled &&
      card.dimensionKey === dimensionKey &&
      (weekend || !card.isWeekendOnly) &&
      !excluded.has(card.id),
  );

  if (allCards.length === 0) {
    throw new GamificationTaskError("当前维度没有可用任务卡");
  }

  const previousDayKeysByTaskId = new Map<string, string[]>();

  for (const assignment of previousAssignments) {
    const dayKeys = previousDayKeysByTaskId.get(assignment.taskCardId) ?? [];
    dayKeys.push(assignment.dayKey);
    previousDayKeysByTaskId.set(assignment.taskCardId, dayKeys);
  }

  const cooldownFiltered = allCards.filter(
    (card) => !isWithinCooldown(card, dayKey, previousDayKeysByTaskId.get(card.id) ?? []),
  );
  const candidates = cooldownFiltered.length > 0 ? cooldownFiltered : allCards;

  return selectWeightedTaskCard(candidates, rng);
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findUserIdentity(userId: string): Promise<UserTeamIdentity> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });

  if (!user) {
    throw new GamificationTaskError("用户不存在", 401);
  }

  return user;
}

async function buildSnapshotOrThrow(
  userId: string,
  now: Date,
): Promise<GamificationStateSnapshot> {
  const snapshot = await buildGamificationStateForUser(userId, now);

  if (!snapshot) {
    throw new GamificationTaskError("用户不存在", 401);
  }

  return snapshot;
}

export async function ensureTodayTaskAssignments({
  userId,
  now = new Date(),
  rng = Math.random,
}: EnsureTodayTaskAssignmentsInput): Promise<GamificationStateSnapshot> {
  const user = await findUserIdentity(userId);
  const dayKey = getShanghaiDayKey(now);

  await prisma.$transaction(async (tx) => {
    const existingAssignments = await tx.dailyTaskAssignment.findMany({
      where: { userId, dayKey },
      select: { dimensionKey: true },
    });
    const existingDimensionKeys = new Set(existingAssignments.map((assignment) => assignment.dimensionKey));

    for (const dimensionKey of DIMENSION_KEYS) {
      if (existingDimensionKeys.has(dimensionKey)) {
        continue;
      }

      const previousAssignments = await tx.dailyTaskAssignment.findMany({
        where: {
          userId,
          dimensionKey,
          dayKey: { lt: dayKey },
        },
        orderBy: { dayKey: "desc" },
        take: 14,
        select: { taskCardId: true, dayKey: true },
      });
      const taskCard = chooseTaskCard({
        dimensionKey,
        dayKey,
        previousAssignments,
        rng,
      });

      await tx.dailyTaskAssignment.upsert({
        where: {
          userId_dayKey_dimensionKey: {
            userId,
            dayKey,
            dimensionKey,
          },
        },
        create: {
          userId,
          teamId: user.teamId,
          dayKey,
          dimensionKey,
          taskCardId: taskCard.id,
        },
        update: {},
      });
    }
  });

  return buildSnapshotOrThrow(userId, now);
}

export async function completeDailyTask({
  userId,
  dimensionKey,
  completionText,
  now = new Date(),
}: CompleteDailyTaskInput): Promise<GamificationStateSnapshot> {
  assertDimensionKey(dimensionKey);
  await ensureTodayTaskAssignments({ userId, now });

  const dayKey = getShanghaiDayKey(now);
  const normalizedCompletionText = normalizeCompletionText(completionText);
  const assignment = await prisma.dailyTaskAssignment.findUnique({
    where: {
      userId_dayKey_dimensionKey: {
        userId,
        dayKey,
        dimensionKey,
      },
    },
  });

  if (!assignment) {
    throw new GamificationTaskError("今日任务不存在");
  }

  if (!assignment.completedAt) {
    await prisma.dailyTaskAssignment.update({
      where: { id: assignment.id },
      data: {
        completedAt: now,
        completionText: normalizedCompletionText,
      },
    });
  }

  return buildSnapshotOrThrow(userId, now);
}

export async function rerollDailyTask({
  userId,
  dimensionKey,
  now = new Date(),
  rng = Math.random,
}: RerollDailyTaskInput): Promise<GamificationStateSnapshot> {
  assertDimensionKey(dimensionKey);
  await ensureTodayTaskAssignments({ userId, now });

  const dayKey = getShanghaiDayKey(now);
  const assignment = await prisma.dailyTaskAssignment.findUnique({
    where: {
      userId_dayKey_dimensionKey: {
        userId,
        dayKey,
        dimensionKey,
      },
    },
  });

  if (!assignment) {
    throw new GamificationTaskError("今日任务不存在");
  }

  if (assignment.completedAt) {
    throw new GamificationTaskError("已完成的任务不能再换");
  }

  if (assignment.rerollCount >= REROLL_LIMIT_PER_DIMENSION) {
    throw new GamificationTaskError("今天这个维度已经换过一次");
  }

  const previousAssignments = await prisma.dailyTaskAssignment.findMany({
    where: {
      userId,
      dimensionKey,
      dayKey: { lt: dayKey },
    },
    orderBy: { dayKey: "desc" },
    take: 14,
    select: { taskCardId: true, dayKey: true },
  });
  const taskCard = chooseTaskCard({
    dimensionKey,
    dayKey,
    previousAssignments,
    excludedTaskCardIds: [assignment.taskCardId],
    rng,
  });

  await prisma.dailyTaskAssignment.update({
    where: { id: assignment.id },
    data: {
      taskCardId: taskCard.id,
      rerollCount: { increment: 1 },
      rerolledFromTaskCardId: assignment.taskCardId,
    },
  });

  return buildSnapshotOrThrow(userId, now);
}

export async function claimDailyTasksTicket({
  userId,
  now = new Date(),
}: ClaimDailyTasksTicketInput): Promise<GamificationStateSnapshot> {
  const user = await findUserIdentity(userId);
  const dayKey = getShanghaiDayKey(now);
  const sourceId = `${userId}:${dayKey}`;

  try {
    await prisma.$transaction(async (tx) => {
      const existingLedger = await tx.lotteryTicketLedger.findFirst({
        where: {
          userId,
          dayKey,
          reason: "DAILY_TASKS_GRANTED",
          sourceType: "daily_tasks",
          sourceId,
        },
      });

      if (existingLedger) {
        return;
      }

      const completedCount = await tx.dailyTaskAssignment.count({
        where: {
          userId,
          dayKey,
          completedAt: { not: null },
        },
      });

      if (completedCount < DIMENSION_KEYS.length) {
        throw new GamificationTaskError("四项任务全部完成后才能领取生活券");
      }

      await adjustLotteryTickets({
        userId,
        teamId: user.teamId,
        dayKey,
        delta: 1,
        reason: "DAILY_TASKS_GRANTED",
        sourceType: "daily_tasks",
        sourceId,
        metadata: { source: "gm-04-daily-tasks" },
        db: tx,
      });
    });
  } catch (error) {
    if (!isUniqueConflict(error)) {
      throw error;
    }
  }

  return buildSnapshotOrThrow(userId, now);
}
