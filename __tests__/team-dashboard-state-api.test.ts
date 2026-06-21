import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";

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

function makeReq(cookie: string | undefined, query = "period=month") {
  const url = `http://localhost/api/dashboard/team-state?${query}`;
  const req = new Request(url);
  Object.defineProperty(req, "cookies", {
    get: () => ({
      get: () => (cookie === undefined ? undefined : { value: cookie }),
    }),
  });
  return req as any;
}

const SNAPSHOT_STUB = {
  period: { type: "month", startKey: "2026-06-01", endKey: "2026-06-15" },
  metrics: { completionRate: 0, totalPunches: 0, fullAttendanceDays: 0 },
  punchTrend: [], workoutBalance: [], drinkBreakdown: [], drinkTrend: [],
};

describe("team-state route", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-15T03:00:00Z"));
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(() => {
    vi.useRealTimers();
  });

  it("returns 401 when not logged in", async () => {
    const res = await GET(makeReq(undefined));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not found", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await GET(makeReq("u1"));
    expect(res.status).toBe(401);
  });

  it("defaults to current month scope when period is bogus", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue(SNAPSHOT_STUB);
    const res = await GET(makeReq("u1", "period=bogus"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
      "team-1",
      expect.objectContaining({ type: "month" }),
      expect.any(Date),
    );
  });

  it("passes monthKey from query as scope", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue(SNAPSHOT_STUB);
    const res = await GET(makeReq("u1", "period=month&monthKey=2026-05"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
      "team-1",
      { type: "month", monthKey: "2026-05" },
      expect.any(Date),
    );
  });

  it("falls back to current month for future monthKey", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue(SNAPSHOT_STUB);
    const res = await GET(makeReq("u1", "period=month&monthKey=2026-12"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
      "team-1",
      { type: "month", monthKey: "2026-06" },
      expect.any(Date),
    );
  });

  it("falls back to current month for invalid monthKey", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue(SNAPSHOT_STUB);
    const res = await GET(makeReq("u1", "period=month&monthKey=2025-99"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
      "team-1",
      { type: "month", monthKey: "2026-06" },
      expect.any(Date),
    );
  });

  it("passes year through and parses historical year", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1", teamId: "team-1" });
    (buildTeamDashboardSnapshot as any).mockResolvedValue(SNAPSHOT_STUB);
    const res = await GET(makeReq("u1", "period=year&year=2025"));
    expect(res.status).toBe(200);
    expect(buildTeamDashboardSnapshot).toHaveBeenCalledWith(
      "team-1",
      { type: "year", year: 2025 },
      expect.any(Date),
    );
  });
});
