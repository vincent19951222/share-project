import {
  ACTIVITY_EVENT_TYPES,
  buildCoffeeAddActivityMessage,
  buildCoffeeRemoveActivityMessage,
  buildDrinkAddActivityMessage,
  buildDrinkRemoveActivityMessage,
} from "@/lib/activity-events";
import { drinkCatalog, isDrinkType, type DrinkType } from "@/lib/drinks";
import { getPreviousShanghaiDayKey, getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export const DRINK_RECORD_NOT_FOUND = "DRINK_RECORD_NOT_FOUND";
export const DRINK_MAKEUP_NOT_ALLOWED = "DRINK_MAKEUP_NOT_ALLOWED";

export type DrinkActivityMode = "drink" | "coffeeCompatibility";

export interface DrinkMutationUser {
  id: string;
  teamId: string;
  username: string;
}

export function isDrinkRecordNotFoundError(error: unknown) {
  return error instanceof Error && error.message === DRINK_RECORD_NOT_FOUND;
}

export function isDrinkMakeupNotAllowedError(error: unknown) {
  return error instanceof Error && error.message === DRINK_MAKEUP_NOT_ALLOWED;
}

function resolveDrinkRecordDayKey(dayKey: string | undefined, now = new Date()) {
  const todayDayKey = getShanghaiDayKey(now);

  if (!dayKey) {
    return todayDayKey;
  }

  const yesterdayDayKey = getPreviousShanghaiDayKey(todayDayKey);

  if (dayKey !== yesterdayDayKey || dayKey.slice(0, 7) !== todayDayKey.slice(0, 7)) {
    throw new Error(DRINK_MAKEUP_NOT_ALLOWED);
  }

  return dayKey;
}

function buildAddActivity(
  mode: DrinkActivityMode,
  user: DrinkMutationUser,
  drinkType: DrinkType,
  totalCups: number,
  isMakeup: boolean,
) {
  if (mode === "coffeeCompatibility") {
    return {
      type: ACTIVITY_EVENT_TYPES.COFFEE_ADD,
      message: buildCoffeeAddActivityMessage(user.username, totalCups),
    };
  }

  if (isMakeup) {
    return {
      type: ACTIVITY_EVENT_TYPES.DRINK_ADD,
      message: `${user.username} 补记了昨天 1 杯${drinkCatalog[drinkType].label}，当日累计 ${totalCups} 杯`,
    };
  }

  return {
    type: ACTIVITY_EVENT_TYPES.DRINK_ADD,
    message: buildDrinkAddActivityMessage(user.username, drinkCatalog[drinkType].label, totalCups),
  };
}

function buildRemoveActivity(
  mode: DrinkActivityMode,
  user: DrinkMutationUser,
  drinkType: DrinkType,
  totalCups: number,
) {
  if (mode === "coffeeCompatibility") {
    return {
      type: ACTIVITY_EVENT_TYPES.COFFEE_REMOVE,
      message: buildCoffeeRemoveActivityMessage(user.username, totalCups),
    };
  }

  return {
    type: ACTIVITY_EVENT_TYPES.DRINK_REMOVE,
    message: buildDrinkRemoveActivityMessage(user.username, drinkCatalog[drinkType].label, totalCups),
  };
}

export async function createDrinkRecordForUser(input: {
  user: DrinkMutationUser;
  drinkType: DrinkType;
  note?: string | null;
  dayKey?: string;
  activityMode: DrinkActivityMode;
}) {
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const todayDayKey = getShanghaiDayKey(now);
    const dayKey = resolveDrinkRecordDayKey(input.dayKey, now);

    await tx.drinkRecord.create({
      data: {
        userId: input.user.id,
        teamId: input.user.teamId,
        dayKey,
        drinkType: input.drinkType,
        note: input.note ?? null,
      },
    });

    const totalCups = await tx.drinkRecord.count({
      where: {
        userId: input.user.id,
        teamId: input.user.teamId,
        dayKey,
        deletedAt: null,
      },
    });
    const activity = buildAddActivity(
      input.activityMode,
      input.user,
      input.drinkType,
      totalCups,
      dayKey !== todayDayKey,
    );

    await tx.activityEvent.create({
      data: {
        teamId: input.user.teamId,
        userId: input.user.id,
        type: activity.type,
        message: activity.message,
        assetAwarded: null,
      },
    });
  });
}

export async function removeLatestDrinkRecordForUser(input: {
  user: DrinkMutationUser;
  drinkType?: DrinkType;
  activityMode: DrinkActivityMode;
}) {
  await prisma.$transaction(async (tx) => {
    const dayKey = getShanghaiDayKey();
    const latest = await tx.drinkRecord.findFirst({
      where: {
        userId: input.user.id,
        teamId: input.user.teamId,
        dayKey,
        deletedAt: null,
        ...(input.drinkType ? { drinkType: input.drinkType } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        drinkType: true,
      },
    });

    if (!latest) {
      throw new Error(DRINK_RECORD_NOT_FOUND);
    }

    await tx.drinkRecord.update({
      where: { id: latest.id },
      data: { deletedAt: new Date() },
    });

    const totalCups = await tx.drinkRecord.count({
      where: {
        userId: input.user.id,
        teamId: input.user.teamId,
        dayKey,
        deletedAt: null,
      },
    });
    const removedDrinkType =
      input.drinkType ?? (isDrinkType(latest.drinkType) ? latest.drinkType : "other");
    const activity = buildRemoveActivity(input.activityMode, input.user, removedDrinkType, totalCups);

    await tx.activityEvent.create({
      data: {
        teamId: input.user.teamId,
        userId: input.user.id,
        type: activity.type,
        message: activity.message,
        assetAwarded: null,
      },
    });
  });
}
