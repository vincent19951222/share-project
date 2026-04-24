import { describe, expect, it } from "vitest";
import { buildReportData } from "@/components/report-center/report-data";
import type { BoardState, CoffeeSnapshot } from "@/lib/types";

function createState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1", assetBalance: 120, seasonIncome: 30, slotContribution: 2 },
      { id: "u2", name: "luo", avatarKey: "male2", assetBalance: 80, seasonIncome: 20, slotContribution: 1 },
      { id: "u3", name: "liu", avatarKey: "female1", assetBalance: 60, seasonIncome: 10, slotContribution: 0 },
    ],
    gridData: [
      [true, true, false, true, null],
      [true, false, false, true, null],
      [true, true, false, false, null],
    ],
    teamVaultTotal: 1450,
    currentUser: {
      assetBalance: 120,
      currentStreak: 6,
      nextReward: 20,
      seasonIncome: 30,
      isAdmin: false,
    },
    activeSeason: {
      id: "season-1",
      monthKey: "2026-04",
      goalName: "减脂挑战",
      targetSlots: 5,
      filledSlots: 3,
      contributions: [
        { userId: "u1", name: "li", avatarKey: "male1", colorIndex: 0, slotContribution: 2, seasonIncome: 30 },
        { userId: "u2", name: "luo", avatarKey: "male2", colorIndex: 1, slotContribution: 1, seasonIncome: 20 },
        { userId: "u3", name: "liu", avatarKey: "female1", colorIndex: 2, slotContribution: 0, seasonIncome: 10 },
      ],
    },
    today: 4,
    totalDays: 5,
    logs: [],
    activeTab: "dash",
    currentUserId: "u1",
    ...overrides,
  };
}

function createCoffeeSnapshot(): CoffeeSnapshot {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1" },
      { id: "u2", name: "luo", avatarKey: "male2" },
      { id: "u3", name: "liu", avatarKey: "female1" },
    ],
    gridData: [
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 1, 2][index] ?? 0,
      })),
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 3, 1][index] ?? 0,
      })),
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0][index] ?? 0,
      })),
    ],
    today: 24,
    totalDays: 30,
    currentUserId: "u1",
    stats: {
      todayTotalCups: 3,
      todayDrinkers: 2,
      currentUserTodayCups: 2,
      coffeeKing: { userId: "u1", name: "li", cups: 2 },
    },
  };
}

describe("buildReportData", () => {
  it("derives lightweight dashboard metrics from elapsed board state", () => {
    const report = buildReportData(
      createState(),
      new Date("2026-04-24T12:00:00+08:00"),
      createCoffeeSnapshot(),
    );

    expect(report.title).toBe("4月牛马战报");
    expect(report.summary).toBe("本月打卡 7 次，全勤 1 天，团队节奏还有上升空间。");
    expect(report.teamVault).toEqual({ current: 1450, helper: "减脂挑战 · 3/5" });
    expect(report.metrics.map((metric) => [metric.label, metric.value])).toEqual([
      ["团队完成率", "58%"],
      ["总打卡次数", "7"],
      ["全勤日", "1"],
      ["本月高光", "最稳：li"],
    ]);
    expect(report.metrics[3].helper).toBe("最长连续 2 天没掉链子");
    expect(report.dailyPoints.map((point) => [point.day, point.count, point.isFullAttendance])).toEqual([
      [1, 3, true],
      [2, 2, false],
      [3, 0, false],
      [4, 2, false],
    ]);
    expect(report.peakDay).toEqual({ day: 1, count: 3 });
    expect(report.lowDay).toEqual({ day: 3, count: 0 });
    expect(report.coffee).toMatchObject({
      todayTotalCups: 3,
      todayDrinkers: 2,
      memberCount: 3,
      monthTotalCups: 14,
      weekKing: { name: "luo", cups: 7 },
      roast: "轻度续命，问题不大。",
    });
    expect(report.coffee.recentDays.map((point) => [point.day, point.cups])).toEqual([
      [18, 0],
      [19, 0],
      [20, 3],
      [21, 3],
      [22, 0],
      [23, 5],
      [24, 3],
    ]);
  });

  it("clamps elapsed days and ignores future columns", () => {
    const report = buildReportData(
      createState({
        gridData: [
          [true, false, true, true, true],
          [false, false, true, false, true],
          [true, false, false, false, true],
        ],
        today: 9,
        totalDays: 4,
      }),
      new Date("2026-04-20T12:00:00+08:00"),
    );

    expect(report.dailyPoints.map((point) => [point.day, point.count])).toEqual([
      [1, 2],
      [2, 0],
      [3, 2],
      [4, 1],
    ]);
    expect(report.metrics.map((metric) => [metric.label, metric.value])).toEqual([
      ["团队完成率", "42%"],
      ["总打卡次数", "5"],
      ["全勤日", "0"],
      ["本月高光", "最稳：li"],
    ]);
  });

  it("breaks ties predictably for peak day, low day, and most consistent member", () => {
    const report = buildReportData(
      createState({
        gridData: [
          [true, true, false, false, null],
          [true, true, false, false, null],
          [false, false, false, false, null],
        ],
        today: 4,
        totalDays: 5,
      }),
      new Date("2026-04-20T12:00:00+08:00"),
    );

    expect(report.peakDay).toEqual({ day: 1, count: 2 });
    expect(report.lowDay).toEqual({ day: 3, count: 0 });
    expect(report.metrics[3]).toMatchObject({
      label: "本月高光",
      value: "最稳：li",
      helper: "最长连续 2 天没掉链子",
    });
  });

  it("uses safe fallbacks when there is no elapsed member data", () => {
    const report = buildReportData(
      createState({
        members: [],
        gridData: [],
        teamVaultTotal: 0,
        currentUser: {
          assetBalance: 0,
          currentStreak: 0,
          nextReward: 0,
          seasonIncome: 0,
          isAdmin: false,
        },
        activeSeason: null,
        today: 0,
        totalDays: 0,
      }),
      new Date("2026-04-20T12:00:00+08:00"),
    );

    expect(report.summary).toBe("本月打卡 0 次，全勤 0 天，先攒一点数据再看趋势。");
    expect(report.teamVault).toEqual({ current: 0, helper: "暂无进行中的赛季" });
    expect(report.metrics.map((metric) => metric.value)).toEqual(["0%", "0", "0", "暂无高光"]);
    expect(report.dailyPoints).toEqual([]);
    expect(report.peakDay).toBeNull();
    expect(report.lowDay).toBeNull();
  });
});
