import type { DashboardDayRecord, DashboardHeatmapDay, DashboardMonthSnapshot } from "@/lib/types";

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export function formatDashboardMonthLabel(monthKey: string): string {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (!match) {
    return monthKey;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return `${year}年${month}月`;
}

export function getBarHeight(count: number, maxCount: number): string {
  if (count <= 0) {
    return "0%";
  }

  return `${Math.max(12, (count / Math.max(1, maxCount)) * 100)}%`;
}

export function getIntensityLevel(workoutMinutes: number, drinkCups: number): 0 | 1 | 2 | 3 | 4 {
  if (workoutMinutes === 0 && drinkCups === 0) {
    return 0;
  }

  const score = (workoutMinutes >= 90 ? 4 : workoutMinutes >= 60 ? 3 : workoutMinutes >= 30 ? 2 : workoutMinutes > 0 ? 1 : 0)
    + Math.min(2, Math.floor(drinkCups / 2));

  if (score >= 5) {
    return 4;
  }
  if (score >= 3) {
    return 3;
  }
  if (score >= 2) {
    return 2;
  }
  if (score >= 1) {
    return 1;
  }
  return 0;
}

export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function buildHeatmapDays(
  year: number,
  activityByDay: Record<string, { workoutMinutes: number; drinkCups: number }>,
): DashboardHeatmapDay[] {
  const days: DashboardHeatmapDay[] = [];
  const totalDays = isLeapYear(year) ? 366 : 365;

  for (let dayOfYear = 1; dayOfYear <= totalDays; dayOfYear += 1) {
    const date = new Date(Date.UTC(year, 0, dayOfYear));
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const dayKey = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const activity = activityByDay[dayKey] ?? { workoutMinutes: 0, drinkCups: 0 };

    days.push({
      dayKey,
      month,
      day,
      workoutMinutes: activity.workoutMinutes,
      drinkCups: activity.drinkCups,
      intensityLevel: getIntensityLevel(activity.workoutMinutes, activity.drinkCups),
    });
  }

  return days;
}

export interface HeatmapMonthLabel {
  label: string;
  column: number;
}

export function getHeatmapMonthLabels(days: DashboardHeatmapDay[]): HeatmapMonthLabel[] {
  const labels: HeatmapMonthLabel[] = [];
  let lastMonth = 0;

  for (let index = 0; index < days.length; index += 7) {
    const day = days[index];
    if (!day) {
      continue;
    }

    if (day.month !== lastMonth) {
      labels.push({
        label: `${day.month}月`,
        column: Math.floor(index / 7) + 1,
      });
      lastMonth = day.month;
    }
  }

  return labels;
}

export function getHeatmapWeekCount(days: DashboardHeatmapDay[]): number {
  return Math.ceil(days.length / 7);
}

export interface DashboardCalendarNeighborCell {
  kind: "neighbor";
  day: number;
  monthRelation: "previous" | "next";
}

export interface DashboardCalendarDayCell extends DashboardDayRecord {
  kind: "day";
  isToday: boolean;
}

export type DashboardCalendarGridCell = DashboardCalendarNeighborCell | DashboardCalendarDayCell;

function parseMonthKey(monthKey: string): { year: number; month: number } | null {
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

function getPreviousMonthKey(monthKey: string): string {
  const parts = parseMonthKey(monthKey);
  if (!parts) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  const { year, month } = parts;
  if (year === 1 && month === 1) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  if (month === 1) {
    return `${(year - 1).toString().padStart(4, "0")}-12`;
  }

  return `${year.toString().padStart(4, "0")}-${(month - 1).toString().padStart(2, "0")}`;
}

function getFirstDayOffset(monthKey: string): number {
  const parts = parseMonthKey(monthKey);
  if (!parts) {
    return 0;
  }

  const utcDay = new Date(Date.UTC(parts.year, parts.month - 1, 1)).getUTCDay();
  return (utcDay + 6) % 7;
}

export function buildDashboardCalendarGrid(
  snapshot: DashboardMonthSnapshot,
): DashboardCalendarGridCell[] {
  const firstDayOffset = getFirstDayOffset(snapshot.monthKey);
  const leadingNeighborCount = Math.max(0, Math.min(6, firstDayOffset));
  const previousMonthTotalDays = getMonthTotalDays(getPreviousMonthKey(snapshot.monthKey));
  const dayRecords = new Map(snapshot.days.map((dayRecord) => [dayRecord.day, dayRecord]));

  const leadingCells: DashboardCalendarGridCell[] = Array.from(
    { length: leadingNeighborCount },
    (_, index) => ({
      kind: "neighbor",
      day: previousMonthTotalDays - leadingNeighborCount + index + 1,
      monthRelation: "previous",
    }),
  );

  const dayCells: DashboardCalendarGridCell[] = Array.from(
    { length: snapshot.totalDays },
    (_, index) => {
      const day = index + 1;
      const record = dayRecords.get(day);
      const drinkCups = record?.drinkCups ?? record?.coffeeCups ?? 0;

      return {
        kind: "day",
        day,
        workedOut: record?.workedOut ?? false,
        drinkCups,
        coffeeCups: drinkCups,
        workoutMinutes: record?.workoutMinutes ?? 0,
        trainingType: record?.trainingType ?? null,
        cardioItem: record?.cardioItem ?? null,
        strengthParts: record?.strengthParts ?? [],
        drinkCounts: record?.drinkCounts ?? { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 },
        isToday:
          snapshot.monthKey === snapshot.currentMonthKey &&
          snapshot.todayDay !== null &&
          snapshot.todayDay === day,
      };
    },
  );

  const cells = [...leadingCells, ...dayCells];
  const trailingNeighborCount = (7 - (cells.length % 7)) % 7;
  const trailingCells: DashboardCalendarGridCell[] = Array.from(
    { length: trailingNeighborCount },
    (_, index) => ({
      kind: "neighbor",
      day: index + 1,
      monthRelation: "next",
    }),
  );

  return [...cells, ...trailingCells];
}
