import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { GET, POST } from "@/app/api/admin/seasons/route";
import { PATCH } from "@/app/api/admin/seasons/current/route";
import { ALLOWED_TARGET_SLOTS } from "@/lib/economy";

const TEMP_TEAM_CODE_PREFIX = "ADMIN-SEASON-TEST-";

function makeRequest(
  method: string,
  path: string,
  userId: string | null,
  body?: unknown,
): NextRequest {
  const headers: Record<string, string> = {};

  if (userId) {
    headers.cookie = `userId=${userId}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function getSeedUsers() {
  const [admin, member] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { username: "li" } }),
    prisma.user.findUniqueOrThrow({ where: { username: "luo" } }),
  ]);

  return { admin, member };
}

async function cleanupAdminSeasonArtifacts() {
  const tempTeams = await prisma.team.findMany({
    where: { code: { startsWith: TEMP_TEAM_CODE_PREFIX } },
    select: { id: true },
  });
  const tempTeamIds = tempTeams.map((team) => team.id);

  if (tempTeamIds.length > 0) {
    const tempSeasons = await prisma.season.findMany({
      where: { teamId: { in: tempTeamIds } },
      select: { id: true },
    });
    const tempSeasonIds = tempSeasons.map((season) => season.id);

    await prisma.seasonMemberStat.deleteMany({ where: { seasonId: { in: tempSeasonIds } } });
    await prisma.punchRecord.deleteMany({ where: { seasonId: { in: tempSeasonIds } } });
    await prisma.season.deleteMany({ where: { id: { in: tempSeasonIds } } });
    await prisma.user.deleteMany({ where: { teamId: { in: tempTeamIds } } });
    await prisma.team.deleteMany({ where: { id: { in: tempTeamIds } } });
  }

  const seedTeam = await prisma.team.findUnique({ where: { code: "ROOM-88" }, select: { id: true } });
  if (seedTeam) {
    const seedSeasons = await prisma.season.findMany({
      where: { teamId: seedTeam.id },
      select: { id: true },
    });
    const seedSeasonIds = seedSeasons.map((season) => season.id);

    await prisma.seasonMemberStat.deleteMany({ where: { seasonId: { in: seedSeasonIds } } });
    await prisma.punchRecord.deleteMany({ where: { seasonId: { in: seedSeasonIds } } });
    await prisma.season.deleteMany({ where: { id: { in: seedSeasonIds } } });
  }
}

describe("admin seasons api", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00+08:00"));
  });

  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-04-22T12:00:00+08:00"));
    await seedDatabase();
  });

  afterEach(async () => {
    await cleanupAdminSeasonArtifacts();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(makeRequest("GET", "/api/admin/seasons", null));

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const { member } = await getSeedUsers();

    const response = await POST(
      makeRequest("POST", "/api/admin/seasons", member.id, {
        goalName: "五月掉脂挑战",
        targetSlots: 80,
      }),
    );

    expect(response.status).toBe(403);
  });

  it("creates a season with trimmed goal name and allowed slot tier", async () => {
    const { admin } = await getSeedUsers();

    const response = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "  五月掉脂挑战  ",
        targetSlots: 80,
      }),
    );

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.season.goalName).toBe("五月掉脂挑战");
    expect(body.season.targetSlots).toBe(80);
    expect(body.season.filledSlots).toBe(0);
    expect(body.season.status).toBe("ACTIVE");
    expect(body.season.monthKey).toBe("2026-04");
    expect(ALLOWED_TARGET_SLOTS).toContain(body.season.targetSlots);
  });

  it("rejects blank goal names", async () => {
    const { admin } = await getSeedUsers();

    const response = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "   ",
        targetSlots: 80,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects custom target slot tiers", async () => {
    const { admin } = await getSeedUsers();

    const response = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "五月掉脂挑战",
        targetSlots: 77,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON bodies", async () => {
    const { admin } = await getSeedUsers();

    const response = await POST(
      new NextRequest("http://localhost/api/admin/seasons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `userId=${admin.id}`,
        },
        body: "{bad-json",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a second active season for the same team", async () => {
    const { admin } = await getSeedUsers();

    const createResponse = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "五月掉脂挑战",
        targetSlots: 80,
      }),
    );
    expect(createResponse.status).toBe(201);

    const conflictResponse = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "六月掉脂挑战",
        targetSlots: 100,
      }),
    );

    expect(conflictResponse.status).toBe(409);
  });

  it("allows only one active season under concurrent create requests", async () => {
    const { admin } = await getSeedUsers();

    const [firstResponse, secondResponse] = await Promise.all([
      POST(
        makeRequest("POST", "/api/admin/seasons", admin.id, {
          goalName: "骞惰璧涘 A",
          targetSlots: 80,
        }),
      ),
      POST(
        makeRequest("POST", "/api/admin/seasons", admin.id, {
          goalName: "骞惰璧涘 B",
          targetSlots: 80,
        }),
      ),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((left, right) => left - right);
    const activeSeasonCount = await prisma.season.count({
      where: { teamId: admin.teamId, status: "ACTIVE" },
    });

    expect(statuses).toEqual([201, 409]);
    expect(activeSeasonCount).toBe(1);
  });

  it("lists seasons for the current team only, newest first", async () => {
    const { admin } = await getSeedUsers();

    const firstCreate = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "第一期挑战",
        targetSlots: 50,
      }),
    );
    expect(firstCreate.status).toBe(201);

    const endResponse = await PATCH(makeRequest("PATCH", "/api/admin/seasons/current", admin.id));
    expect(endResponse.status).toBe(200);

    vi.setSystemTime(new Date("2026-04-22T12:00:01+08:00"));

    const secondCreate = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "第二期挑战",
        targetSlots: 100,
      }),
    );
    expect(secondCreate.status).toBe(201);

    const tempTeam = await prisma.team.create({
      data: {
        code: `${TEMP_TEAM_CODE_PREFIX}LIST`,
        name: "Temp List Team",
      },
    });
    await prisma.season.create({
      data: {
        teamId: tempTeam.id,
        monthKey: "2026-04",
        goalName: "外部团队挑战",
        targetSlots: 120,
      },
    });

    const response = await GET(makeRequest("GET", "/api/admin/seasons", admin.id));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.seasons).toHaveLength(2);
    expect(body.seasons[0].goalName).toBe("第二期挑战");
    expect(body.seasons[1].goalName).toBe("第一期挑战");
    expect(body.seasons.every((season: { teamId: string }) => season.teamId === admin.teamId)).toBe(
      true,
    );
  });

  it("ends the active season for the admin's team", async () => {
    const { admin } = await getSeedUsers();

    const createResponse = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "五月掉脂挑战",
        targetSlots: 120,
      }),
    );
    expect(createResponse.status).toBe(201);

    const response = await PATCH(makeRequest("PATCH", "/api/admin/seasons/current", admin.id));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.season.status).toBe("ENDED");
    expect(body.season.endedAt).not.toBeNull();

    const season = await prisma.season.findFirstOrThrow({
      where: { teamId: admin.teamId, goalName: "五月掉脂挑战" },
    });
    expect(season.status).toBe("ENDED");
    expect(season.endedAt).not.toBeNull();
  });

  it("returns 404 when there is no active season to end", async () => {
    const { admin } = await getSeedUsers();

    const response = await PATCH(makeRequest("PATCH", "/api/admin/seasons/current", admin.id));

    expect(response.status).toBe(404);
  });
});
