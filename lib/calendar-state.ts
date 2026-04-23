import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import type { CalendarDayRecord, CalendarMonthSnapshot } from "@/lib/types";

interface MonthParts {
  year: number;
  month: number;
}

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

function parseMonthKey(monthKey: string): MonthParts | null {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

function getMonthTotalDays(monthKey: string): number {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  return new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
}

function readTodayDay(now: Date, totalDays: number): number | null {
  const day = Number(getShanghaiDayKey(now).slice(8, 10));

  if (!Number.isInteger(day) || day < 1 || day > totalDays) {
    return null;
  }

  return day;
}

export function readCalendarMonthKey(
  requestedMonthKey: string | null | undefined,
  currentMonthKey: string,
): string {
  if (!parseMonthKey(currentMonthKey)) {
    throw new RangeError(`Invalid month key: ${currentMonthKey}`);
  }

  const normalizedMonthKey = requestedMonthKey?.trim() ?? "";
  if (!normalizedMonthKey) {
    return currentMonthKey;
  }

  const parts = parseMonthKey(normalizedMonthKey);
  if (!parts) {
    return currentMonthKey;
  }

  const candidateMonthKey = `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}`;

  return candidateMonthKey > currentMonthKey ? currentMonthKey : candidateMonthKey;
}

export async function buildCalendarMonthSnapshotForUser(
  userId: string,
  monthKey: string,
  now: Date = new Date(),
): Promise<CalendarMonthSnapshot | null> {
  const totalDays = getMonthTotalDays(monthKey);
  const todayDayKey = getShanghaiDayKey(now);
  const currentMonthKey = todayDayKey.slice(0, 7);
  const todayDay = monthKey === currentMonthKey ? readTodayDay(now, totalDays) : null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      punchRecords: {
        where: {
          dayKey: { startsWith: monthKey },
          punched: true,
        },
        select: {
          dayKey: true,
        },
      },
      coffeeRecords: {
        where: {
          dayKey: { startsWith: monthKey },
          deletedAt: null,
        },
        select: {
          dayKey: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const workedOutDays = new Set<number>();
  for (const record of user.punchRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (Number.isInteger(day) && day >= 1 && day <= totalDays) {
      workedOutDays.add(day);
    }
  }

  const coffeeCupsByDay = new Map<number, number>();
  for (const record of user.coffeeRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    if (!Number.isInteger(day) || day < 1 || day > totalDays) {
      continue;
    }

    coffeeCupsByDay.set(day, (coffeeCupsByDay.get(day) ?? 0) + 1);
  }

  const days: CalendarDayRecord[] = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;

    return {
      day,
      workedOut: workedOutDays.has(day),
      coffeeCups: coffeeCupsByDay.get(day) ?? 0,
    };
  });

  return {
    monthKey,
    currentMonthKey,
    todayDay,
    totalDays,
    workoutDays: workedOutDays.size,
    coffeeCupTotal: user.coffeeRecords.length,
    days,
  };
}
