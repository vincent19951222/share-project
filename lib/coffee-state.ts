import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import type { CoffeeDayCell, CoffeeSnapshot } from "@/lib/types";

export const COFFEE_TOTAL_DAYS = 30;

export function getCurrentCoffeeTotalDays(now: Date = new Date()): number {
  const monthKey = getShanghaiDayKey(now).slice(0, 7);
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getCurrentCoffeeDay(now: Date = new Date()): number {
  const day = Number(getShanghaiDayKey(now).slice(8, 10));
  return Math.max(1, Math.min(day, getCurrentCoffeeTotalDays(now)));
}

export async function buildCoffeeSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<CoffeeSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const today = getCurrentCoffeeDay(now);
  const totalDays = getCurrentCoffeeTotalDays(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              username: true,
              avatarKey: true,
            },
          },
          coffeeRecords: {
            where: {
              dayKey: { startsWith: currentMonthKey },
              deletedAt: null,
            },
            select: {
              userId: true,
              dayKey: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const cupCounts = new Map<string, number>();

  for (const record of user.team.coffeeRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (!Number.isInteger(day) || day < 1 || day > totalDays) {
      continue;
    }

    const key = `${record.userId}:${day}`;
    cupCounts.set(key, (cupCounts.get(key) ?? 0) + 1);
  }

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
  }));

  const gridData: CoffeeDayCell[][] = members.map((member) =>
    Array.from({ length: totalDays }, (_, index) => ({
      cups: cupCounts.get(`${member.id}:${index + 1}`) ?? 0,
    })),
  );

  const todayRows = members.map((member, index) => ({
    userId: member.id,
    name: member.name,
    cups: gridData[index]?.[today - 1]?.cups ?? 0,
  }));

  const todayTotalCups = todayRows.reduce((sum, row) => sum + row.cups, 0);
  const todayDrinkers = todayRows.filter((row) => row.cups > 0).length;
  const currentUserTodayCups =
    todayRows.find((row) => row.userId === user.id)?.cups ?? 0;
  const coffeeKing =
    todayRows
      .filter((row) => row.cups > 0)
      .sort(
        (left, right) =>
          right.cups - left.cups || left.name.localeCompare(right.name),
      )[0] ?? null;

  return {
    members,
    gridData,
    today,
    totalDays,
    currentUserId: user.id,
    stats: {
      todayTotalCups,
      todayDrinkers,
      currentUserTodayCups,
      coffeeKing,
    },
  };
}
