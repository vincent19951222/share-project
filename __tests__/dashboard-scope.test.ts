import { describe, it, expect } from "vitest";
import {
  currentScope,
  prevScope,
  nextScope,
  isCurrentScope,
  scopeToStartEnd,
  formatScopeLabel,
  scopeToQuery,
  parseScopeFromQuery,
} from "@/lib/dashboard-scope";

// 固定"今天"为 2026-06-15（上海时区）
const NOW = new Date("2026-06-15T03:00:00Z");

describe("currentScope", () => {
  it("returns current month by default", () => {
    expect(currentScope(NOW)).toEqual({ type: "month", monthKey: "2026-06" });
  });
  it("returns current year when type=year", () => {
    expect(currentScope(NOW, "year")).toEqual({ type: "year", year: 2026 });
  });
});

describe("prevScope / nextScope", () => {
  it("month prev crosses year boundary", () => {
    expect(prevScope({ type: "month", monthKey: "2026-01" })).toEqual({
      type: "month",
      monthKey: "2025-12",
    });
  });
  it("month next increments", () => {
    expect(nextScope({ type: "month", monthKey: "2026-05" })).toEqual({
      type: "month",
      monthKey: "2026-06",
    });
  });
  it("month next crosses year boundary", () => {
    expect(nextScope({ type: "month", monthKey: "2026-12" })).toEqual({
      type: "month",
      monthKey: "2027-01",
    });
  });
  it("year prev/next", () => {
    expect(prevScope({ type: "year", year: 2026 })).toEqual({ type: "year", year: 2025 });
    expect(nextScope({ type: "year", year: 2025 })).toEqual({ type: "year", year: 2026 });
  });
});

describe("isCurrentScope", () => {
  it("true for current month/year, false for historical", () => {
    expect(isCurrentScope({ type: "month", monthKey: "2026-06" }, NOW)).toBe(true);
    expect(isCurrentScope({ type: "month", monthKey: "2026-05" }, NOW)).toBe(false);
    expect(isCurrentScope({ type: "year", year: 2026 }, NOW)).toBe(true);
    expect(isCurrentScope({ type: "year", year: 2025 }, NOW)).toBe(false);
  });
});

describe("scopeToStartEnd", () => {
  it("historical month: endKey = month end", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2026-05" }, NOW)).toEqual({
      startKey: "2026-05-01",
      endKey: "2026-05-31",
      isComplete: true,
    });
  });
  it("current month: endKey = today", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2026-06" }, NOW)).toEqual({
      startKey: "2026-06-01",
      endKey: "2026-06-15",
      isComplete: false,
    });
  });
  it("february leap year", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2024-02" }, NOW)).toEqual({
      startKey: "2024-02-01",
      endKey: "2024-02-29",
      isComplete: true,
    });
  });
  it("february common year", () => {
    expect(scopeToStartEnd({ type: "month", monthKey: "2026-02" }, NOW)).toEqual({
      startKey: "2026-02-01",
      endKey: "2026-02-28",
      isComplete: true,
    });
  });
  it("historical year: endKey = year end", () => {
    expect(scopeToStartEnd({ type: "year", year: 2025 }, NOW)).toEqual({
      startKey: "2025-01-01",
      endKey: "2025-12-31",
      isComplete: true,
    });
  });
  it("current year: endKey = today", () => {
    expect(scopeToStartEnd({ type: "year", year: 2026 }, NOW)).toEqual({
      startKey: "2026-01-01",
      endKey: "2026-06-15",
      isComplete: false,
    });
  });
});

describe("formatScopeLabel", () => {
  it("month label", () => {
    expect(formatScopeLabel({ type: "month", monthKey: "2026-05" })).toBe("2026年5月");
  });
  it("year label", () => {
    expect(formatScopeLabel({ type: "year", year: 2025 })).toBe("2025年");
  });
});

describe("scopeToQuery", () => {
  it("month query", () => {
    expect(scopeToQuery({ type: "month", monthKey: "2026-05" })).toBe(
      "period=month&monthKey=2026-05",
    );
  });
  it("year query", () => {
    expect(scopeToQuery({ type: "year", year: 2025 })).toBe("period=year&year=2025");
  });
});

describe("parseScopeFromQuery", () => {
  const sp = (qs: string) => new URLSearchParams(qs);

  it("defaults to current month when no params", () => {
    expect(parseScopeFromQuery(sp(""), NOW)).toEqual({ type: "month", monthKey: "2026-06" });
  });
  it("defaults to current month for bogus period", () => {
    expect(parseScopeFromQuery(sp("period=bogus"), NOW)).toEqual({ type: "month", monthKey: "2026-06" });
  });
  it("parses historical monthKey", () => {
    expect(parseScopeFromQuery(sp("period=month&monthKey=2026-05"), NOW)).toEqual({
      type: "month",
      monthKey: "2026-05",
    });
  });
  it("falls back to current month for future monthKey", () => {
    expect(parseScopeFromQuery(sp("period=month&monthKey=2026-12"), NOW)).toEqual({
      type: "month",
      monthKey: "2026-06",
    });
  });
  it("falls back to current month for malformed monthKey", () => {
    expect(parseScopeFromQuery(sp("period=month&monthKey=2026-13"), NOW)).toEqual({
      type: "month",
      monthKey: "2026-06",
    });
  });
  it("parses historical year", () => {
    expect(parseScopeFromQuery(sp("period=year&year=2025"), NOW)).toEqual({ type: "year", year: 2025 });
  });
  it("falls back to current year for future year", () => {
    expect(parseScopeFromQuery(sp("period=year&year=2030"), NOW)).toEqual({ type: "year", year: 2026 });
  });
  it("defaults to current year when year param missing", () => {
    expect(parseScopeFromQuery(sp("period=year"), NOW)).toEqual({ type: "year", year: 2026 });
  });
});
