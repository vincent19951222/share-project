import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/board/state/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/board/state", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${userId}` } : undefined,
  });
}

describe("GET /api/board/state", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    userId = (
      await prisma.user.findUniqueOrThrow({ where: { username: "li" } })
    ).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("returns the latest board snapshot for the current user's team", async () => {
    const response = await GET(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.members).toHaveLength(5);
    expect(body.snapshot.gridData).toHaveLength(5);
    expect(body.snapshot.teamVaultTotal).toBeGreaterThan(0);
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: expect.any(Number),
      currentStreak: expect.any(Number),
      nextReward: expect.any(Number),
      seasonIncome: 0,
      isAdmin: true,
    });
    expect(body.snapshot.activeSeason).toBeNull();
  });
});
