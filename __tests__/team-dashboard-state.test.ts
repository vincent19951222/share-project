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
    const snap = await buildTeamDashboardSnapshot("missing", "month", NOW);
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

    const snap = await buildTeamDashboardSnapshot("team-1", "month", NOW);
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
