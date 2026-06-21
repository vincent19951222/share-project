import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  parseCookieValue: vi.fn((value: string | undefined | null) => value ?? null),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    team: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/team-dashboard-state", () => ({
  buildTeamDashboardSnapshot: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";
import { GET } from "@/app/api/dashboard/team-state/route";

function makeReq(cookie: string | undefined, period = "month") {
  const url = `http://localhost/api/dashboard/team-state?period=${period}`;
  const req = new Request(url);
  Object.defineProperty(req, "cookies", {
    get: () => ({
      get: () => (cookie === undefined ? undefined : { value: cookie }),
    }),
  });
  return req as any;
}

describe("team-state route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    const res = await GET(makeReq(undefined));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not found", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await GET(makeReq("u1"));
    expect(res.status).toBe(401);
  });

  it("calls aggregator with teamId and falls back period to month", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue({
      period: { type: "month", startKey: "2026-06-01", endKey: "2026-06-15" },
      metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
      punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
    });
    const res = await GET(makeReq("u1", "bogus"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith("team-1", "month", expect.any(Date));
  });

  it("passes year period through", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue({
      period: { type: "year", startKey: "2026-01-01", endKey: "2026-06-15" },
      metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
      punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
    });
    const res = await GET(makeReq("u1", "year"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith("team-1", "year", expect.any(Date));
  });
});
