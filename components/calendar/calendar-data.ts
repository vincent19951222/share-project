import type { CalendarMonthSnapshot } from "@/lib/types";

interface MonthParts {
  year: number;
  month: number;
}

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

function parseMonthKey(monthKey: string): MonthParts {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (!match) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
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
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  return { year, month };
}

function toMonthKey(year: number, month: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}

export function formatCalendarMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${year}年${month}月`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  if (year === 1 && month === 1) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  if (month === 1) {
    return toMonthKey(year - 1, 12);
  }

  return toMonthKey(year, month - 1);
}

export function isFutureMonthKey(monthKey: string, currentMonthKey: string): boolean {
  const target = parseMonthKey(monthKey);
  const current = parseMonthKey(currentMonthKey);

  if (target.year !== current.year) {
    return target.year > current.year;
  }

  return target.month > current.month;
}

export interface CalendarBlankCell {
  kind: "blank";
}

export interface CalendarDayCell {
  kind: "day";
  day: number;
  workedOut: boolean;
  coffeeCups: number;
  isToday: boolean;
}

export type CalendarGridCell = CalendarBlankCell | CalendarDayCell;

export function buildCalendarGrid(
  snapshot: CalendarMonthSnapshot,
  firstDayOffset: number,
): CalendarGridCell[] {
  const normalizedOffset = Number.isFinite(firstDayOffset) ? Math.trunc(firstDayOffset) : 0;
  const leadingBlankCount = Math.max(0, Math.min(6, normalizedOffset));
  const dayRecords = new Map(snapshot.days.map((dayRecord) => [dayRecord.day, dayRecord] as const));

  const blankCells: CalendarGridCell[] = Array.from({ length: leadingBlankCount }, () => ({
    kind: "blank",
  }));

  const dayCells: CalendarGridCell[] = Array.from({ length: snapshot.totalDays }, (_, index) => {
    const day = index + 1;
    const record = dayRecords.get(day);

    return {
      kind: "day",
      day,
      workedOut: record?.workedOut ?? false,
      coffeeCups: record?.coffeeCups ?? 0,
      isToday:
        snapshot.monthKey === snapshot.currentMonthKey &&
        snapshot.todayDay !== null &&
        snapshot.todayDay === day,
    };
  });

  return [...blankCells, ...dayCells];
}
