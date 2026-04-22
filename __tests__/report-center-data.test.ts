import { describe, expect, it } from "vitest";
import { buildReportData } from "@/components/report-center/report-data";
import type { BoardState } from "@/lib/types";

function createState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1" },
      { id: "u2", name: "luo", avatarKey: "male2" },
      { id: "u3", name: "liu", avatarKey: "female1" },
    ],
    gridData: [
      [true, true, false, true, null],
      [true, false, false, true, null],
      [true, true, false, false, null],
    ],
    teamCoins: 1450,
    targetCoins: 2000,
    today: 4,
    totalDays: 5,
    logs: [],
    activeTab: "dash",
    currentUserId: "u1",
    ...overrides,
  };
}

describe("buildReportData", () => {
  it("derives lightweight dashboard metrics from elapsed board state", () => {
    const report = buildReportData(createState(), new Date("2026-04-20T12:00:00+08:00"));

    expect(report.title).toBe("APRIL DASHBOARD");
    expect(report.summary).toBe("本月打卡 7 次，全勤 1 天，团队节奏还有上升空间。");
    expect(report.teamVault).toEqual({ current: 1450, target: 2000, progress: 73 });
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
    expect(report.highlights.map((highlight) => highlight.title)).toEqual([
      "气氛组播报",
      "团队小结",
      "轻提醒",
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
        teamCoins: 0,
        targetCoins: 0,
        today: 0,
        totalDays: 0,
      }),
      new Date("2026-04-20T12:00:00+08:00"),
    );

    expect(report.summary).toBe("本月打卡 0 次，全勤 0 天，先攒一点数据再看趋势。");
    expect(report.teamVault).toEqual({ current: 0, target: 0, progress: 0 });
    expect(report.metrics.map((metric) => metric.value)).toEqual(["0%", "0", "0", "暂无高光"]);
    expect(report.dailyPoints).toEqual([]);
    expect(report.peakDay).toBeNull();
    expect(report.lowDay).toBeNull();
  });
});
