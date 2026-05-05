import { describe, expect, it } from "vitest";
import {
  buildCalendarGrid,
  formatCalendarMonthLabel,
  getPreviousMonthKey,
  isFutureMonthKey,
} from "@/components/calendar/calendar-data";
import { readCalendarMonthKey } from "@/lib/calendar-state";

describe("calendar-data", () => {
  it("formats month labels in the expected Chinese month format", () => {
    expect(formatCalendarMonthLabel("2026-04")).toBe("2026年4月");
  });

  it("walks back one month across year boundaries", () => {
    expect(getPreviousMonthKey("2026-04")).toBe("2026-03");
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
  });

  it("rejects the year-one January boundary when walking back a month", () => {
    expect(() => getPreviousMonthKey("0001-01")).toThrow(RangeError);
  });

  it("detects future month keys relative to the current month", () => {
    expect(isFutureMonthKey("2026-05", "2026-04")).toBe(true);
    expect(isFutureMonthKey("2026-04", "2026-04")).toBe(false);
    expect(isFutureMonthKey("2026-03", "2026-04")).toBe(false);
    expect(isFutureMonthKey("2027-01", "2026-12")).toBe(true);
    expect(isFutureMonthKey("2026-12", "2027-01")).toBe(false);
  });

  it("normalizes invalid and future month queries back to the current month", () => {
    expect(readCalendarMonthKey(undefined, "2026-04")).toBe("2026-04");
    expect(readCalendarMonthKey("", "2026-04")).toBe("2026-04");
    expect(readCalendarMonthKey(" 2026-03 ", "2026-04")).toBe("2026-03");
    expect(readCalendarMonthKey("2026-13", "2026-04")).toBe("2026-04");
    expect(readCalendarMonthKey("2026-05", "2026-04")).toBe("2026-04");
    expect(readCalendarMonthKey("2026-03", "2026-04")).toBe("2026-03");
  });

  it("builds a full-week grid with neighbor days and today's day highlighted", () => {
    const snapshot = {
      monthKey: "2026-04",
      currentMonthKey: "2026-04",
      todayDay: 3,
      totalDays: 5,
      workoutDays: 2,
      coffeeCupTotal: 6,
      days: [
        { day: 1, workedOut: true, coffeeCups: 0 },
        { day: 2, workedOut: false, coffeeCups: 2 },
        { day: 3, workedOut: true, coffeeCups: 4 },
        { day: 4, workedOut: false, coffeeCups: 0 },
        { day: 5, workedOut: false, coffeeCups: 0 },
      ],
    };

    expect(buildCalendarGrid(snapshot, 2)).toEqual([
      { kind: "neighbor", day: 30, monthRelation: "previous" },
      { kind: "neighbor", day: 31, monthRelation: "previous" },
      { kind: "day", day: 1, workedOut: true, coffeeCups: 0, isToday: false },
      { kind: "day", day: 2, workedOut: false, coffeeCups: 2, isToday: false },
      { kind: "day", day: 3, workedOut: true, coffeeCups: 4, isToday: true },
      { kind: "day", day: 4, workedOut: false, coffeeCups: 0, isToday: false },
      { kind: "day", day: 5, workedOut: false, coffeeCups: 0, isToday: false },
    ]);
  });

  it("pads month endings with next-month neighbor days", () => {
    const snapshot = {
      monthKey: "2026-04",
      currentMonthKey: "2026-04",
      todayDay: 30,
      totalDays: 30,
      workoutDays: 1,
      coffeeCupTotal: 1,
      days: [{ day: 30, workedOut: true, coffeeCups: 1 }],
    };

    const cells = buildCalendarGrid(snapshot, 4);

    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 4)).toEqual([
      { kind: "neighbor", day: 28, monthRelation: "previous" },
      { kind: "neighbor", day: 29, monthRelation: "previous" },
      { kind: "neighbor", day: 30, monthRelation: "previous" },
      { kind: "neighbor", day: 31, monthRelation: "previous" },
    ]);
    expect(cells[34]).toEqual({ kind: "neighbor", day: 1, monthRelation: "next" });
  });

  it("does not highlight today on non-current months or when today is absent", () => {
    const snapshot = {
      monthKey: "2026-03",
      currentMonthKey: "2026-04",
      todayDay: null,
      totalDays: 3,
      workoutDays: 1,
      coffeeCupTotal: 1,
      days: [{ day: 1, workedOut: false, coffeeCups: 0 }],
    };
    const cells = buildCalendarGrid(snapshot, 0);

    expect(cells).toHaveLength(7);
    expect(cells[2]).toMatchObject({ kind: "day", day: 3, isToday: false });

    const absentTodaySnapshot = {
      ...snapshot,
      monthKey: "2026-04",
      currentMonthKey: "2026-04",
      todayDay: null,
    };

    expect(buildCalendarGrid(absentTodaySnapshot, 0)[2]).toMatchObject({
      kind: "day",
      day: 3,
      isToday: false,
    });
  });

  it("rejects invalid month keys", () => {
    expect(() => formatCalendarMonthLabel("0000-01")).toThrow(RangeError);
    expect(() => getPreviousMonthKey("2026-13")).toThrow(RangeError);
    expect(() => isFutureMonthKey("2026-04", "0000-01")).toThrow(RangeError);
  });

  it("clamps out-of-range offsets to a sane weekday range", () => {
    const snapshot = {
      monthKey: "2026-04",
      currentMonthKey: "2026-04",
      todayDay: 1,
      totalDays: 2,
      workoutDays: 1,
      coffeeCupTotal: 1,
      days: [{ day: 1, workedOut: true, coffeeCups: 1 }],
    };

    expect(buildCalendarGrid(snapshot, -2)).toHaveLength(7);
    expect(buildCalendarGrid(snapshot, 9)).toEqual([
      { kind: "neighbor", day: 26, monthRelation: "previous" },
      { kind: "neighbor", day: 27, monthRelation: "previous" },
      { kind: "neighbor", day: 28, monthRelation: "previous" },
      { kind: "neighbor", day: 29, monthRelation: "previous" },
      { kind: "neighbor", day: 30, monthRelation: "previous" },
      { kind: "neighbor", day: 31, monthRelation: "previous" },
      { kind: "day", day: 1, workedOut: true, coffeeCups: 1, isToday: true },
      { kind: "day", day: 2, workedOut: false, coffeeCups: 0, isToday: false },
      { kind: "neighbor", day: 1, monthRelation: "next" },
      { kind: "neighbor", day: 2, monthRelation: "next" },
      { kind: "neighbor", day: 3, monthRelation: "next" },
      { kind: "neighbor", day: 4, monthRelation: "next" },
      { kind: "neighbor", day: 5, monthRelation: "next" },
      { kind: "neighbor", day: 6, monthRelation: "next" },
    ]);
    expect(buildCalendarGrid(snapshot, 2.9)).toEqual([
      { kind: "neighbor", day: 30, monthRelation: "previous" },
      { kind: "neighbor", day: 31, monthRelation: "previous" },
      { kind: "day", day: 1, workedOut: true, coffeeCups: 1, isToday: true },
      { kind: "day", day: 2, workedOut: false, coffeeCups: 0, isToday: false },
      { kind: "neighbor", day: 1, monthRelation: "next" },
      { kind: "neighbor", day: 2, monthRelation: "next" },
      { kind: "neighbor", day: 3, monthRelation: "next" },
    ]);
  });

  it("supports leap February and 31-day month grid lengths", () => {
    const leapFebruarySnapshot = {
      monthKey: "2024-02",
      currentMonthKey: "2024-02",
      todayDay: 29,
      totalDays: 29,
      workoutDays: 1,
      coffeeCupTotal: 2,
      days: [
        { day: 1, workedOut: true, coffeeCups: 0 },
        { day: 29, workedOut: false, coffeeCups: 2 },
      ],
    };

    const leapCells = buildCalendarGrid(leapFebruarySnapshot, 0);
    expect(leapCells).toHaveLength(35);
    expect(leapCells[28]).toMatchObject({
      kind: "day",
      day: 29,
      coffeeCups: 2,
      isToday: true,
    });

    const longMonthSnapshot = {
      monthKey: "2026-05",
      currentMonthKey: "2026-05",
      todayDay: 31,
      totalDays: 31,
      workoutDays: 1,
      coffeeCupTotal: 1,
      days: [{ day: 31, workedOut: true, coffeeCups: 1 }],
    };

    const longMonthCells = buildCalendarGrid(longMonthSnapshot, 0);
    expect(longMonthCells).toHaveLength(35);
    expect(longMonthCells[30]).toMatchObject({
      kind: "day",
      day: 31,
      workedOut: true,
      coffeeCups: 1,
      isToday: true,
    });
  });
});
