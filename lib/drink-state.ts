import { DRINK_TYPES, isDrinkType, type DrinkType } from "@/lib/drinks";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import type { DrinkDayCell, DrinkEventSnapshot, DrinkSnapshot } from "@/lib/types";

export const DRINK_TOTAL_DAYS = 30;

function createEmptyDrinkCounts(): Record<DrinkType, number> {
  return DRINK_TYPES.reduce(
    (counts, type) => ({ ...counts, [type]: 0 }),
    {} as Record<DrinkType, number>,
  );
}

export function getCurrentDrinkTotalDays(now: Date = new Date()): number {
  const monthKey = getShanghaiDayKey(now).slice(0, 7);
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getCurrentDrinkDay(now: Date = new Date()): number {
  const day = Number(getShanghaiDayKey(now).slice(8, 10));
  return Math.max(1, Math.min(day, getCurrentDrinkTotalDays(now)));
}

function formatDrinkEventTime(createdAt: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(createdAt);
}

export async function buildDrinkSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<DrinkSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const today = getCurrentDrinkDay(now);
  const totalDays = getCurrentDrinkTotalDays(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            orderBy: { createdAt: "asc" },
            select: { id: true, username: true, avatarKey: true },
          },
          drinkRecords: {
            where: {
              dayKey: { startsWith: currentMonthKey },
              deletedAt: null,
            },
            select: {
              id: true,
              userId: true,
              dayKey: true,
              drinkType: true,
              note: true,
              createdAt: true,
              user: {
                select: {
                  username: true,
                  avatarKey: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const cupCounts = new Map<string, number>();
  const drinkCountsByCell = new Map<string, Record<DrinkType, number>>();
  const todayEvents: DrinkEventSnapshot[] = [];
  const currentUserDrinkCounts = createEmptyDrinkCounts();

  for (const record of user.team.drinkRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (!Number.isInteger(day) || day < 1 || day > totalDays) {
      continue;
    }

    const drinkType = isDrinkType(record.drinkType) ? record.drinkType : "other";
    const key = `${record.userId}:${day}`;
    const cellCounts = drinkCountsByCell.get(key) ?? createEmptyDrinkCounts();

    cellCounts[drinkType] += 1;
    drinkCountsByCell.set(key, cellCounts);
    cupCounts.set(key, (cupCounts.get(key) ?? 0) + 1);

    if (record.userId === user.id && record.dayKey === todayDayKey) {
      currentUserDrinkCounts[drinkType] += 1;
    }

    if (record.dayKey === todayDayKey) {
      todayEvents.push({
        id: record.id,
        userId: record.userId,
        userName: record.user.username,
        avatarKey: record.user.avatarKey,
        drinkType,
        time: formatDrinkEventTime(record.createdAt),
        note: record.note,
        createdAt: record.createdAt.toISOString(),
      });
    }
  }

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
  }));

  const gridData: DrinkDayCell[][] = members.map((member) =>
    Array.from({ length: totalDays }, (_, index) => {
      const key = `${member.id}:${index + 1}`;
      return {
        cups: cupCounts.get(key) ?? 0,
        drinkCounts: drinkCountsByCell.get(key) ?? createEmptyDrinkCounts(),
      };
    }),
  );

  const todayRows = members.map((member, index) => ({
    userId: member.id,
    name: member.name,
    cups: gridData[index]?.[today - 1]?.cups ?? 0,
  }));

  const todayTotalCups = todayRows.reduce((sum, row) => sum + row.cups, 0);
  const todayDrinkers = todayRows.filter((row) => row.cups > 0).length;
  const currentUserTodayCups = todayRows.find((row) => row.userId === user.id)?.cups ?? 0;
  const drinkKing =
    todayRows
      .filter((row) => row.cups > 0)
      .sort((left, right) => right.cups - left.cups || left.name.localeCompare(right.name))[0] ??
    null;
  const favoriteDrink =
    DRINK_TYPES.map((drinkType) => ({ drinkType, count: currentUserDrinkCounts[drinkType] }))
      .filter((item) => item.count > 0)
      .sort(
        (left, right) =>
          right.count - left.count ||
          DRINK_TYPES.indexOf(left.drinkType) - DRINK_TYPES.indexOf(right.drinkType),
      )[0] ?? null;

  return {
    members,
    gridData,
    today,
    totalDays,
    monthKey: currentMonthKey,
    currentUserId: user.id,
    todayEvents,
    stats: {
      todayTotalCups,
      todayDrinkers,
      currentUserTodayCups,
      drinkKing,
      favoriteDrink,
      latestDrink: todayEvents.at(-1) ?? null,
      drinkCounts: currentUserDrinkCounts,
    },
  };
}
