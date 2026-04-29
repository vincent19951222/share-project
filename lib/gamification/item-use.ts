import type { Prisma } from "@/lib/generated/prisma/client";
import type { ItemDefinition, ItemEffect, TaskDimensionKey } from "@/content/gamification/types";
import { getItemDefinition, getItemDefinitions, getTaskCards } from "@/lib/gamification/content";
import {
  getNextPunchStreak,
  getPreviousShanghaiDayKey,
  getShanghaiDayKey,
  getShanghaiWeekKey,
} from "@/lib/economy";
import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;
type ItemUseStatus = "PENDING" | "SETTLED";

export class ItemUseError extends Error {
  constructor(
    message: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = "ItemUseError";
  }
}

export interface UseInventoryItemInput {
  userId: string;
  itemId: string;
  now?: Date;
  target?: {
    dimensionKey?: TaskDimensionKey;
  };
  rng?: () => number;
}

export interface UseInventoryItemResult {
  itemUse: {
    id: string;
    itemId: string;
    status: ItemUseStatus;
    targetType: string | null;
    targetId: string | null;
    inventoryConsumed: boolean;
    message: string;
  };
}

function isFitnessBoostEffect(effect: ItemEffect) {
  return (
    effect.type === "fitness_coin_multiplier" ||
    effect.type === "fitness_season_multiplier" ||
    effect.type === "fitness_coin_and_season_multiplier"
  );
}

function isStrongBoostEffect(effect: ItemEffect) {
  return (
    effect.type === "fitness_season_multiplier" ||
    effect.type === "fitness_coin_and_season_multiplier" ||
    (effect.type === "fitness_coin_multiplier" && effect.multiplier === 2)
  );
}

function assertSupportedItem(definition: ItemDefinition | undefined): ItemDefinition {
  if (!definition || !definition.enabled) {
    throw new ItemUseError("道具不存在或已下架", 404);
  }

  if (
    isFitnessBoostEffect(definition.effect) ||
    definition.effect.type === "task_reroll" ||
    definition.effect.type === "leave_protection"
  ) {
    return definition;
  }

  throw new ItemUseError("这个道具的使用入口还没开放");
}

function getFitnessBoostItemIds() {
  return getItemDefinitions()
    .filter((item) => isFitnessBoostEffect(item.effect))
    .map((item) => item.id);
}

function getStrongBoostItemIds() {
  return getItemDefinitions()
    .filter((item) => isStrongBoostEffect(item.effect))
    .map((item) => item.id);
}

function chooseTaskCard(input: {
  dimensionKey: TaskDimensionKey;
  excludedTaskCardId: string;
  rng: () => number;
}) {
  const candidates = getTaskCards().filter(
    (card) =>
      card.enabled &&
      card.dimensionKey === input.dimensionKey &&
      card.id !== input.excludedTaskCardId,
  );

  if (candidates.length === 0) {
    throw new ItemUseError("当前维度没有可替换的任务卡");
  }

  const totalWeight = candidates.reduce((sum, card) => sum + card.weight, 0);
  let cursor = Math.min(Math.max(input.rng(), 0), 0.999_999) * totalWeight;

  for (const card of candidates) {
    cursor -= card.weight;

    if (cursor < 0) {
      return card;
    }
  }

  return candidates[candidates.length - 1]!;
}

export async function expirePastPendingItemUses(input: {
  userId: string;
  todayDayKey: string;
  tx?: TransactionClient;
}) {
  const client = input.tx ?? prisma;

  await client.itemUseRecord.updateMany({
    where: {
      userId: input.userId,
      status: "PENDING",
      dayKey: { lt: input.todayDayKey },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

async function getAvailableInventory(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
  todayDayKey: string;
}) {
  const inventory = await input.tx.inventoryItem.findUnique({
    where: {
      userId_itemId: {
        userId: input.userId,
        itemId: input.itemId,
      },
    },
    select: {
      quantity: true,
    },
  });
  const pendingReservations = await input.tx.itemUseRecord.count({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      status: "PENDING",
      dayKey: { gte: input.todayDayKey },
    },
  });

  return {
    quantity: inventory?.quantity ?? 0,
    reservedQuantity: pendingReservations,
    availableQuantity: Math.max(0, (inventory?.quantity ?? 0) - pendingReservations),
  };
}

async function assertInventoryAvailable(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
  todayDayKey: string;
}) {
  const inventory = await getAvailableInventory(input);

  if (inventory.availableQuantity < 1) {
    throw new ItemUseError("库存不足");
  }
}

async function consumeInventory(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
}) {
  const update = await input.tx.inventoryItem.updateMany({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      quantity: { gt: 0 },
    },
    data: {
      quantity: {
        decrement: 1,
      },
    },
  });

  if (update.count !== 1) {
    throw new ItemUseError("库存不足");
  }
}

async function assertConfiguredUseLimits(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  definition: ItemDefinition;
}) {
  if (input.definition.maxUsePerUserPerDay) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        userId: input.userId,
        itemId: input.definition.id,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerUserPerDay) {
      throw new ItemUseError(`这个道具每天最多使用 ${input.definition.maxUsePerUserPerDay} 次`);
    }
  }

  if (input.definition.maxUsePerUserPerWeek) {
    const weekKey = getShanghaiWeekKey(input.dayKey);
    const count = await input.tx.itemUseRecord.count({
      where: {
        userId: input.userId,
        itemId: input.definition.id,
        dayKey: { gte: weekKey },
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerUserPerWeek) {
      throw new ItemUseError(`这个道具每周最多使用 ${input.definition.maxUsePerUserPerWeek} 次`);
    }
  }

  if (input.definition.maxUsePerTeamPerDay) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        teamId: input.teamId,
        itemId: input.definition.id,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerTeamPerDay) {
      throw new ItemUseError(`这个道具全队每天最多使用 ${input.definition.maxUsePerTeamPerDay} 次`);
    }
  }
}

async function assertFitnessBoostLimits(input: {
  tx: TransactionClient;
  userId: string;
  dayKey: string;
  definition: ItemDefinition;
}) {
  const sameDayBoostCount = await input.tx.itemUseRecord.count({
    where: {
      userId: input.userId,
      dayKey: input.dayKey,
      itemId: { in: getFitnessBoostItemIds() },
      status: { in: ["PENDING", "SETTLED"] },
    },
  });

  if (sameDayBoostCount > 0) {
    throw new ItemUseError("今天已经有一个健身加成在生效队列中");
  }

  if (!isStrongBoostEffect(input.definition.effect)) {
    return;
  }

  const weekKey = getShanghaiWeekKey(input.dayKey);
  const sameWeekStrongBoostCount = await input.tx.itemUseRecord.count({
    where: {
      userId: input.userId,
      dayKey: { gte: weekKey },
      itemId: { in: getStrongBoostItemIds() },
      status: { in: ["PENDING", "SETTLED"] },
    },
  });

  if (sameWeekStrongBoostCount > 0) {
    throw new ItemUseError("强力加成每周最多使用一次");
  }
}

async function useFitnessBoost(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  definition: ItemDefinition;
}) {
  await assertFitnessBoostLimits(input);

  const todayPunch = await input.tx.punchRecord.findUnique({
    where: {
      userId_dayKey: {
        userId: input.userId,
        dayKey: input.dayKey,
      },
    },
    select: { id: true },
  });
  const record = await input.tx.itemUseRecord.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.definition.id,
      dayKey: input.dayKey,
      status: "PENDING",
      targetType: todayPunch ? "FITNESS_PUNCH" : null,
      targetId: todayPunch?.id ?? null,
      effectSnapshotJson: JSON.stringify(input.definition.effect),
    },
  });

  return {
    itemUse: {
      id: record.id,
      itemId: record.itemId,
      status: "PENDING" as const,
      targetType: record.targetType,
      targetId: record.targetId,
      inventoryConsumed: false,
      message: "暴击已进入今日待生效，真实健身后结算。",
    },
  };
}

async function useTaskReroll(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  definition: ItemDefinition;
  dimensionKey: TaskDimensionKey | undefined;
  rng: () => number;
  now: Date;
}) {
  if (!input.dimensionKey) {
    throw new ItemUseError("请选择要换班的任务维度", 400);
  }

  const assignment = await input.tx.dailyTaskAssignment.findUnique({
    where: {
      userId_dayKey_dimensionKey: {
        userId: input.userId,
        dayKey: input.dayKey,
        dimensionKey: input.dimensionKey,
      },
    },
  });

  if (!assignment) {
    throw new ItemUseError("今天这个维度还没有任务");
  }

  if (assignment.completedAt) {
    throw new ItemUseError("已完成的任务不能再换班");
  }

  const replacement = chooseTaskCard({
    dimensionKey: input.dimensionKey,
    excludedTaskCardId: assignment.taskCardId,
    rng: input.rng,
  });

  await consumeInventory({
    tx: input.tx,
    userId: input.userId,
    itemId: input.definition.id,
  });

  const updatedAssignment = await input.tx.dailyTaskAssignment.update({
    where: { id: assignment.id },
    data: {
      taskCardId: replacement.id,
      rerollCount: { increment: 1 },
      rerolledFromTaskCardId: assignment.taskCardId,
    },
    select: { id: true },
  });
  const record = await input.tx.itemUseRecord.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.definition.id,
      dayKey: input.dayKey,
      status: "SETTLED",
      targetType: "DAILY_TASK_ASSIGNMENT",
      targetId: updatedAssignment.id,
      effectSnapshotJson: JSON.stringify(input.definition.effect),
      settledAt: input.now,
    },
  });

  return {
    itemUse: {
      id: record.id,
      itemId: record.itemId,
      status: "SETTLED" as const,
      targetType: record.targetType,
      targetId: record.targetId,
      inventoryConsumed: true,
      message: "任务已换班，新的卡片已刷新。",
    },
  };
}

async function assertLeaveProtectionAllowed(input: {
  tx: TransactionClient;
  userId: string;
  dayKey: string;
}) {
  const todayPunch = await input.tx.punchRecord.findUnique({
    where: {
      userId_dayKey: {
        userId: input.userId,
        dayKey: input.dayKey,
      },
    },
    select: { id: true },
  });

  if (todayPunch) {
    throw new ItemUseError("今天已经真实健身，不能再请假保护");
  }

  const previousDayKey = getPreviousShanghaiDayKey(input.dayKey);
  const previousPunch = await input.tx.punchRecord.findUnique({
    where: {
      userId_dayKey: {
        userId: input.userId,
        dayKey: previousDayKey,
      },
    },
    select: { id: true },
  });

  if (!previousPunch) {
    throw new ItemUseError("昨天没有真实健身，暂时不能使用请假保护");
  }

  const previousLeave = await input.tx.itemUseRecord.findFirst({
    where: {
      userId: input.userId,
      dayKey: previousDayKey,
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
    },
    select: { id: true },
  });

  if (previousLeave) {
    throw new ItemUseError("请假保护不能连续使用两天");
  }
}

async function useLeaveProtection(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  definition: ItemDefinition;
  now: Date;
}) {
  await assertLeaveProtectionAllowed(input);
  await consumeInventory({
    tx: input.tx,
    userId: input.userId,
    itemId: input.definition.id,
  });

  const record = await input.tx.itemUseRecord.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.definition.id,
      dayKey: input.dayKey,
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
      targetId: null,
      effectSnapshotJson: JSON.stringify(input.definition.effect),
      settledAt: input.now,
    },
  });

  return {
    itemUse: {
      id: record.id,
      itemId: record.itemId,
      status: "SETTLED" as const,
      targetType: record.targetType,
      targetId: record.targetId,
      inventoryConsumed: true,
      message: "今天已请假保护，连续记录等待下一次真实健身接上。",
    },
  };
}

export async function useInventoryItem({
  userId,
  itemId,
  now = new Date(),
  target,
  rng = Math.random,
}: UseInventoryItemInput): Promise<UseInventoryItemResult> {
  const definition = assertSupportedItem(getItemDefinition(itemId));
  const dayKey = getShanghaiDayKey(now);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      throw new ItemUseError("用户不存在", 401);
    }

    await expirePastPendingItemUses({ userId, todayDayKey: dayKey, tx });
    await assertInventoryAvailable({ tx, userId, itemId, todayDayKey: dayKey });
    await assertConfiguredUseLimits({
      tx,
      userId,
      teamId: user.teamId,
      dayKey,
      definition,
    });

    if (isFitnessBoostEffect(definition.effect)) {
      return useFitnessBoost({
        tx,
        userId,
        teamId: user.teamId,
        dayKey,
        definition,
      });
    }

    if (definition.effect.type === "task_reroll") {
      return useTaskReroll({
        tx,
        userId,
        teamId: user.teamId,
        dayKey,
        definition,
        dimensionKey: target?.dimensionKey,
        rng,
        now,
      });
    }

    return useLeaveProtection({
      tx,
      userId,
      teamId: user.teamId,
      dayKey,
      definition,
      now,
    });
  });
}

export async function bindPendingFitnessBoostsToPunch(input: {
  tx: TransactionClient;
  userId: string;
  dayKey: string;
  punchRecordId: string;
}) {
  await input.tx.itemUseRecord.updateMany({
    where: {
      userId: input.userId,
      dayKey: input.dayKey,
      itemId: { in: getFitnessBoostItemIds() },
      status: "PENDING",
      targetType: null,
      targetId: null,
    },
    data: {
      targetType: "FITNESS_PUNCH",
      targetId: input.punchRecordId,
    },
  });
}

export async function getNextPunchStreakWithLeaveProtection(input: {
  userId: string;
  currentStreak: number;
  lastPunchDayKey: string | null | undefined;
  todayDayKey: string;
  tx?: TransactionClient;
}) {
  const regularStreak = getNextPunchStreak(
    input.currentStreak,
    input.lastPunchDayKey,
    input.todayDayKey,
  );

  if (regularStreak > 1) {
    return regularStreak;
  }

  if (!input.lastPunchDayKey) {
    return regularStreak;
  }

  const yesterdayDayKey = getPreviousShanghaiDayKey(input.todayDayKey);
  const dayBeforeYesterdayKey = getPreviousShanghaiDayKey(yesterdayDayKey);

  if (input.lastPunchDayKey !== dayBeforeYesterdayKey) {
    return regularStreak;
  }

  const client = input.tx ?? prisma;
  const leaveProtection = await client.itemUseRecord.findFirst({
    where: {
      userId: input.userId,
      dayKey: yesterdayDayKey,
      status: "SETTLED",
      targetType: "LEAVE_PROTECTION",
    },
    select: { id: true },
  });

  return leaveProtection ? Math.max(1, Math.floor(input.currentStreak)) + 1 : regularStreak;
}
