import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

// 固定"今天"为 2026-06-15
const NOW = new Date("2026-06-15T03:00:00Z"); // 上海时区 11:00，仍是 06-15

function makeTeam(overrides: any = {}) {
  return {
    id: "team-1",
    users: [],
    ...overrides,
  };
}

describe("buildTeamDashboardSnapshot - month", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when team not found", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(null);
    const snap = await buildTeamDashboardSnapshot("missing", { type: "month", monthKey: "2026-06" }, NOW);
    expect(snap).toBeNull();
  });

  it("computes punchTrend per day with full-attendance flag and metrics", async () => {
    // 2 成员，06-10 两人都打，06-11 只一人打
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2026-06-10", punched: true },
              { dayKey: "2026-06-11", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
          {
            id: "u2",
            punchRecords: [
              { dayKey: "2026-06-10", punched: true },
              { dayKey: "2026-06-11", punched: false },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot("team-1", { type: "month", monthKey: "2026-06" }, NOW);
    expect(snap).not.toBeNull();
    const point10 = snap!.punchTrend.find((p) => p.dayKey === "2026-06-10");
    const point11 = snap!.punchTrend.find((p) => p.dayKey === "2026-06-11");
    expect(point10).toEqual({ dayKey: "2026-06-10", count: 2, isFullAttendance: true });
    expect(point11).toEqual({ dayKey: "2026-06-11", count: 1, isFullAttendance: false });
    // 月视图 punchTrend 覆盖 06-01 到 06-15 = 15 天
    expect(snap!.punchTrend.length).toBe(15);
    expect(snap!.metrics.totalPunches).toBe(3);
    expect(snap!.metrics.fullAttendanceDays).toBe(1);
    // completionRate = 3 / (2 成员 * 15 天) = 0.1
    expect(snap!.metrics.completionRate).toBeCloseTo(0.1, 5);
  });
});

describe("buildTeamDashboardSnapshot - year", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aggregates punchTrend and drinkTrend by month with metrics (full-attendance day counted)", async () => {
    // 2 成员：06-10 两人都打（全员打卡），01-05 仅 u1 打
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2026-01-05", punched: true },
              { dayKey: "2026-06-10", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [
              { dayKey: "2026-06-10", drinkType: "water" },
            ],
          },
          {
            id: "u2",
            punchRecords: [
              { dayKey: "2026-06-10", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot("team-1", { type: "year", year: 2026 }, NOW);
    expect(snap!.period).toEqual({
      type: "year",
      startKey: "2026-01-01",
      endKey: "2026-06-15",
    });
    // 年视图 punchTrend = 6 个月（1-6月）
    expect(snap!.punchTrend.length).toBe(6);
    expect(snap!.punchTrend[0]).toEqual({ dayKey: "2026-01", count: 1, isFullAttendance: false });
    expect(snap!.punchTrend[5]).toEqual({ dayKey: "2026-06", count: 2, isFullAttendance: false });
    expect(snap!.drinkTrend[5]).toEqual({ dayKey: "2026-06", count: 1 });
    expect(snap!.drinkTrend[0].count).toBe(0);
    // metrics：年视图也应正确统计全员打卡天数（不应恒为 0）
    // totalPunches = u1(2) + u2(1) = 3
    expect(snap!.metrics.totalPunches).toBe(3);
    // fullAttendanceDays：仅 06-10 当天 2 人都打（count=2=memberCount）→ 1 天
    expect(snap!.metrics.fullAttendanceDays).toBe(1);
    // completionRate = 3 / (2 成员 * 166 天) ≈ 0.0090361
    // elapsedDays: 2026-01-01 → 06-15 = 31+28+31+30+31+15 = 166
    expect(snap!.metrics.completionRate).toBeCloseTo(3 / (2 * 166), 5);
  });
});

describe("buildTeamDashboardSnapshot - balance & drinks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("buckets workout entries into strength parts and cardio items", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [],
            workoutRecords: [
              {
                dayKey: "2026-06-10",
                entries: [
                  { category: "strength", code: "chest" },
                  { category: "strength", code: "chest" },
                  { category: "cardio", code: "treadmill" },
                ],
              },
            ],
            drinkRecords: [],
          },
        ],
      }),
    );
    const snap = await buildTeamDashboardSnapshot("team-1", { type: "month", monthKey: "2026-06" }, NOW);
    const chest = snap!.workoutBalance.find((b) => b.code === "chest");
    const treadmill = snap!.workoutBalance.find((b) => b.code === "treadmill");
    const back = snap!.workoutBalance.find((b) => b.code === "back");
    const glutes = snap!.workoutBalance.find((b) => b.code === "glutes");
    const dance = snap!.workoutBalance.find((b) => b.code === "dance");
    expect(chest!.count).toBe(2);
    expect(treadmill!.count).toBe(1);
    expect(back!.count).toBe(0);
    expect(glutes).toBeUndefined();
    expect(dance).toMatchObject({ label: "跳舞", count: 0 });
    // 6 力量 + 5 有氧 = 11 行
    expect(snap!.workoutBalance.length).toBe(11);
  });

  it("buckets drinks by type and keeps zero-count types", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [],
            workoutRecords: [],
            drinkRecords: [
              { dayKey: "2026-06-10", drinkType: "water" },
              { dayKey: "2026-06-10", drinkType: "milkTea" },
              { dayKey: "2026-06-11", drinkType: "unknown-type" },
            ],
          },
        ],
      }),
    );
    const snap = await buildTeamDashboardSnapshot("team-1", { type: "month", monthKey: "2026-06" }, NOW);
    const water = snap!.drinkBreakdown.find((d) => d.type === "water");
    const milkTea = snap!.drinkBreakdown.find((d) => d.type === "milkTea");
    const americano = snap!.drinkBreakdown.find((d) => d.type === "americano");
    expect(water!.count).toBe(1);
    expect(milkTea!.count).toBe(1);
    expect(americano!.count).toBe(0);
    // unknown-type 被归入 other
    const other = snap!.drinkBreakdown.find((d) => d.type === "other");
    expect(other!.count).toBe(1);
    expect(snap!.drinkBreakdown.length).toBe(5);
  });

  it("handles empty team gracefully", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(makeTeam({ users: [] }));
    const snap = await buildTeamDashboardSnapshot("team-1", { type: "month", monthKey: "2026-06" }, NOW);
    expect(snap!.metrics.completionRate).toBe(0);
    expect(snap!.metrics.totalPunches).toBe(0);
    expect(snap!.punchTrend.length).toBe(15);
    expect(snap!.punchTrend.every((p) => !p.isFullAttendance)).toBe(true);
  });
});

describe("buildTeamDashboardSnapshot - historical month", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses month-end as endKey for a complete historical month", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2026-05-10", punched: true },
              { dayKey: "2026-05-31", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot(
      "team-1",
      { type: "month", monthKey: "2026-05" },
      NOW,
    );
    expect(snap!.period).toEqual({
      type: "month",
      startKey: "2026-05-01",
      endKey: "2026-05-31",
    });
    expect(snap!.punchTrend.length).toBe(31);
    expect(snap!.metrics.totalPunches).toBe(2);
  });

  it("aggregates a complete historical year into 12 month buckets", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(
      makeTeam({
        users: [
          {
            id: "u1",
            punchRecords: [
              { dayKey: "2025-01-05", punched: true },
              { dayKey: "2025-12-20", punched: true },
            ],
            workoutRecords: [],
            drinkRecords: [],
          },
        ],
      }),
    );

    const snap = await buildTeamDashboardSnapshot(
      "team-1",
      { type: "year", year: 2025 },
      NOW,
    );
    expect(snap!.period).toEqual({
      type: "year",
      startKey: "2025-01-01",
      endKey: "2025-12-31",
    });
    expect(snap!.punchTrend.length).toBe(12);
    expect(snap!.punchTrend[0]).toEqual({ dayKey: "2025-01", count: 1, isFullAttendance: false });
    expect(snap!.punchTrend[11]).toEqual({ dayKey: "2025-12", count: 1, isFullAttendance: false });
  });
});
