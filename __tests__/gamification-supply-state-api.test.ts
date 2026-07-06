import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/supply/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/supply/state", {
    method: "GET",
    headers: userId ? { cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/gamification/supply/state", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "未登录" });
  });

  it("returns production supply snapshot without creating old daily tasks", async () => {
    const dayKey = getShanghaiDayKey();

    await expect(
      prisma.dailyTaskAssignment.count({ where: { userId, dayKey } }),
    ).resolves.toBe(0);

    const response = await GET(request(userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      currentUserId: userId,
      teamId,
      dayKey,
      resources: {
        coins: { label: "银子" },
      },
      supplyAiImage: {
        wallet: {
          generationCostPerImage: 60,
          themeDrawCost: 200,
        },
      },
    });
    expect(body.snapshot.resources.ticket).toBeUndefined();
    expect(body.snapshot.dashboard.dailyQuests).toEqual([]);
    await expect(
      prisma.dailyTaskAssignment.count({ where: { userId, dayKey } }),
    ).resolves.toBe(0);
  });

  it("returns 401 when the cookie points to a missing user", async () => {
    const response = await GET(request("missing-user"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "用户不存在" });
  });
});
