import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import { drinkCatalog, isDrinkType } from "@/lib/drinks";
import {
  CARDIO_ITEMS,
  STRENGTH_PARTS,
  getCardioItemLabel,
  getStrengthPartLabel,
} from "@/lib/workouts";
import { buildCalendarMonthSnapshotForUser } from "@/lib/calendar-state";
import {
  buildHeatmapDays,
  getRollingHeatmapStartDayKey,
} from "@/components/dashboard/dashboard-data";
import type {
  DashboardDayRecord,
  DashboardHeatmapDay,
  DashboardMonthSnapshot,
  DashboardPeriod,
  DashboardSnapshot,
  DrinkBreakdownItem,
  WorkoutBalanceItem,
} from "@/lib/types";

function createEmptyDrinkCounts(): Record<"water" | "milkTea" | "americano" | "latte" | "other", number> {
  return { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 };
}

function createEmptyDrinkBreakdown(): DrinkBreakdownItem[] {
  return (Object.keys(drinkCatalog) as Array<keyof typeof drinkCatalog>).map((type) => ({
    type,
    label: drinkCatalog[type].label,
    count: 0,
    color: drinkCatalog[type].color,
    softColor: drinkCatalog[type].softColor,
    textColor: drinkCatalog[type].textColor,
  }));
}

export async function buildDashboardMonthSnapshotForUser(
  userId: string,
  monthKey: string,
  now: Date = new Date(),
): Promise<DashboardMonthSnapshot | null> {
  const baseSnapshot = await buildCalendarMonthSnapshotForUser(userId, monthKey, now);
  if (!baseSnapshot) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      workoutRecords: {
        where: {
          dayKey: { startsWith: monthKey },
        },
        include: { entries: true },
      },
      drinkRecords: {
        where: {
          dayKey: { startsWith: monthKey },
          deletedAt: null,
        },
        select: { dayKey: true, drinkType: true },
      },
    },
  });

  if (!user) {
    return {
      ...baseSnapshot,
      days: baseSnapshot.days.map((dayRecord) => ({
        ...dayRecord,
        workoutMinutes: 0,
        trainingType: null,
        cardioItem: null,
        strengthParts: [],
        drinkCounts: createEmptyDrinkCounts(),
      })),
    };
  }

  const workoutByDay = new Map<number, (typeof user.workoutRecords)[number]>();
  const drinkCountsByDay = new Map<number, Record<keyof typeof drinkCatalog, number>>();

  for (const record of user.workoutRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (day >= 1 && day <= baseSnapshot.totalDays) {
      workoutByDay.set(day, record);
    }
  }

  for (const record of user.drinkRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (day < 1 || day > baseSnapshot.totalDays) {
      continue;
    }
    const counts = drinkCountsByDay.get(day) ?? createEmptyDrinkCounts();
    const type = isDrinkType(record.drinkType) ? record.drinkType : "other";
    counts[type] += 1;
    drinkCountsByDay.set(day, counts);
  }

  const days: DashboardDayRecord[] = baseSnapshot.days.map((dayRecord) => {
    const workout = workoutByDay.get(dayRecord.day);
    const drinkCounts = drinkCountsByDay.get(dayRecord.day) ?? createEmptyDrinkCounts();
    const strengthParts = STRENGTH_PARTS.filter((part) =>
      workout?.entries.some(
        (entry) => entry.category === "strength" && entry.code === part,
      ),
    );
    const cardioEntry = workout?.entries.find((entry) => entry.category === "cardio");

    return {
      ...dayRecord,
      workoutMinutes: workout?.durationMinutes ?? 0,
      trainingType:
        workout?.trainingType === "cardio" ||
        workout?.trainingType === "strength" ||
        workout?.trainingType === "both"
          ? workout.trainingType
          : null,
      cardioItem:
        cardioEntry && (CARDIO_ITEMS as readonly string[]).includes(cardioEntry.code)
          ? (cardioEntry.code as typeof CARDIO_ITEMS[number])
          : null,
      strengthParts,
      drinkCounts,
    };
  });

  return {
    ...baseSnapshot,
    days,
  };
}

function buildWorkoutBalance(
  workoutRecords: { entries: { category: string; code: string; label: string }[] }[],
): WorkoutBalanceItem[] {
  const countMap = new Map<
    string,
    { label: string; category: "strength" | "cardio"; count: number }
  >();

  for (const record of workoutRecords) {
    for (const entry of record.entries) {
      const existing = countMap.get(entry.code);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(entry.code, {
          label: entry.label,
          category: entry.category === "cardio" ? "cardio" : "strength",
          count: 1,
        });
      }
    }
  }

  const balance: WorkoutBalanceItem[] = [];
  for (const part of STRENGTH_PARTS) {
    const item = countMap.get(part);
    balance.push({
      code: part,
      label: getStrengthPartLabel(part),
      category: "strength",
      count: item?.count ?? 0,
    });
  }
  for (const item of CARDIO_ITEMS) {
    const found = countMap.get(item);
    balance.push({
      code: item,
      label: getCardioItemLabel(item),
      category: "cardio",
      count: found?.count ?? 0,
    });
  }

  return balance;
}

export async function buildDashboardSnapshotForUser(
  userId: string,
  period: DashboardPeriod,
  now: Date = new Date(),
): Promise<DashboardSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const year = Number(todayDayKey.slice(0, 4));
  const month = Number(todayDayKey.slice(5, 7));
  const heatmapStartDayKey = getRollingHeatmapStartDayKey(todayDayKey);
  const summaryStartDayKey = period === "month" ? `${currentMonthKey}-01` : `${year}-01-01`;
  const queryStartDayKey =
    heatmapStartDayKey < summaryStartDayKey ? heatmapStartDayKey : summaryStartDayKey;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      workoutRecords: {
        where: {
          dayKey: {
            gte: queryStartDayKey,
            lte: todayDayKey,
          },
        },
        include: { entries: true },
      },
      drinkRecords: {
        where: {
          dayKey: {
            gte: queryStartDayKey,
            lte: todayDayKey,
          },
          deletedAt: null,
        },
        select: { dayKey: true, drinkType: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const summaryWorkoutRecords = user.workoutRecords.filter(
    (record) => record.dayKey >= summaryStartDayKey && record.dayKey <= todayDayKey,
  );
  const summaryDrinkRecords = user.drinkRecords.filter(
    (record) => record.dayKey >= summaryStartDayKey && record.dayKey <= todayDayKey,
  );

  const workoutDays = new Set(summaryWorkoutRecords.map((record) => record.dayKey));
  const totalMinutes = summaryWorkoutRecords.reduce(
    (sum, record) => sum + (record.durationMinutes ?? 0),
    0,
  );

  const workoutBalance = buildWorkoutBalance(summaryWorkoutRecords);

  const drinkByType = createEmptyDrinkCounts();
  for (const record of summaryDrinkRecords) {
    const type = isDrinkType(record.drinkType) ? record.drinkType : "other";
    drinkByType[type] += 1;
  }

  const drinkBreakdown: DrinkBreakdownItem[] = (
    Object.keys(drinkCatalog) as Array<keyof typeof drinkCatalog>
  ).map((type) => ({
    type,
    label: drinkCatalog[type].label,
    count: drinkByType[type],
    color: drinkCatalog[type].color,
    softColor: drinkCatalog[type].softColor,
    textColor: drinkCatalog[type].textColor,
  }));

  const activityByDay: Record<string, { workoutMinutes: number; drinkCups: number }> = {};
  for (const record of user.workoutRecords) {
    activityByDay[record.dayKey] = {
      workoutMinutes:
        (activityByDay[record.dayKey]?.workoutMinutes ?? 0) + (record.durationMinutes ?? 0),
      drinkCups: activityByDay[record.dayKey]?.drinkCups ?? 0,
    };
  }
  for (const record of user.drinkRecords) {
    activityByDay[record.dayKey] = {
      workoutMinutes: activityByDay[record.dayKey]?.workoutMinutes ?? 0,
      drinkCups: (activityByDay[record.dayKey]?.drinkCups ?? 0) + 1,
    };
  }

  const heatmap: DashboardHeatmapDay[] = buildHeatmapDays(
    heatmapStartDayKey,
    todayDayKey,
    activityByDay,
  );
  const monthCalendar = await buildDashboardMonthSnapshotForUser(userId, currentMonthKey, now);

  if (!monthCalendar) {
    return null;
  }

  return {
    currentUserId: user.id,
    year,
    month,
    currentMonthKey,
    period,
    workoutSummary: {
      days: workoutDays.size,
      totalMinutes,
    },
    drinkSummary: {
      cups: summaryDrinkRecords.length,
      byType: drinkByType,
    },
    workoutBalance,
    drinkBreakdown,
    heatmap,
    monthCalendar,
  };
}
