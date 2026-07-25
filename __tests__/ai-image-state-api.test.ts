// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/ai-image/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/ai-image/state", {
    headers: userId ? { cookie: `userId=${createCookieValue(userId)}` } : {},
  });
}

describe("GET /api/gamification/ai-image/state", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires login", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("returns only the AI image workspace snapshot", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const response = await GET(request(user.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      wallet: { coins: user.coins },
      themes: { unlocked: expect.any(Array), locked: expect.any(Array) },
      recentTasks: expect.any(Array),
      recentArtworks: expect.any(Array),
    });
    expect(body.snapshot).not.toHaveProperty("legacyArchive");
    expect(body.snapshot).not.toHaveProperty("dashboard");
    expect(body.snapshot).not.toHaveProperty("redemptions");
  });
});
