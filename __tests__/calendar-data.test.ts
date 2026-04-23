import { describe, expect, it } from "vitest";
import {
  buildCalendarGrid,
  formatCalendarMonthLabel,
  getPreviousMonthKey,
  isFutureMonthKey,
} from "@/components/calendar/calendar-data";

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

  it("builds a grid with leading blanks and today's day highlighted", () => {
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
      { kind: "blank" },
      { kind: "blank" },
      { kind: "day", day: 1, workedOut: true, coffeeCups: 0, isToday: false },
      { kind: "day", day: 2, workedOut: false, coffeeCups: 2, isToday: false },
      { kind: "day", day: 3, workedOut: true, coffeeCups: 4, isToday: true },
      { kind: "day", day: 4, workedOut: false, coffeeCups: 0, isToday: false },
      { kind: "day", day: 5, workedOut: false, coffeeCups: 0, isToday: false },
    ]);
  });

  it("does not highlight today on non-current months or when today is absent", () => {
    const snapshot = {
      monthKey: "2026-03",
      currentMonthKey: "2026-04",
      todayDay: 3,
      totalDays: 3,
      workoutDays: 1,
      coffeeCupTotal: 1,
      days: [{ day: 1, workedOut: false, coffeeCups: 0 }],
    };
    const cells = buildCalendarGrid(snapshot, 0);

    expect(cells).toHaveLength(3);
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

    expect(buildCalendarGrid(snapshot, -2)).toHaveLength(2);
    expect(buildCalendarGrid(snapshot, 9)).toEqual([
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
      { kind: "day", day: 1, workedOut: true, coffeeCups: 1, isToday: true },
      { kind: "day", day: 2, workedOut: false, coffeeCups: 0, isToday: false },
    ]);
    expect(buildCalendarGrid(snapshot, 2.9)).toEqual([
      { kind: "blank" },
      { kind: "blank" },
      { kind: "day", day: 1, workedOut: true, coffeeCups: 1, isToday: true },
      { kind: "day", day: 2, workedOut: false, coffeeCups: 0, isToday: false },
    ]);
  });
});
