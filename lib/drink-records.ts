import {
  ACTIVITY_EVENT_TYPES,
  buildCoffeeAddActivityMessage,
  buildCoffeeRemoveActivityMessage,
  buildDrinkAddActivityMessage,
  buildDrinkRemoveActivityMessage,
} from "@/lib/activity-events";
import { drinkCatalog, type DrinkType } from "@/lib/drinks";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export const DRINK_RECORD_NOT_FOUND = "DRINK_RECORD_NOT_FOUND";

export type DrinkActivityMode = "drink" | "coffeeCompatibility";

export interface DrinkMutationUser {
  id: string;
  teamId: string;
  username: string;
}

export function isDrinkRecordNotFoundError(error: unknown) {
  return error instanceof Error && error.message === DRINK_RECORD_NOT_FOUND;
}

function buildAddActivity(mode: DrinkActivityMode, user: DrinkMutationUser, drinkType: DrinkType, totalCups: number) {
  if (mode === "coffeeCompatibility") {
    return {
      type: ACTIVITY_EVENT_TYPES.COFFEE_ADD,
      message: buildCoffeeAddActivityMessage(user.username, totalCups),
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
  activityMode: DrinkActivityMode;
}) {
  await prisma.$transaction(async (tx) => {
    const dayKey = getShanghaiDayKey();

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
    const activity = buildAddActivity(input.activityMode, input.user, input.drinkType, totalCups);

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
    const removedDrinkType = input.drinkType ?? (latest.drinkType as DrinkType);
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
