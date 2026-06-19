import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string, search = "") {
  return new NextRequest(`http://localhost/api/dashboard/state${search}`, {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {},
  });
}

describe("GET /api/dashboard/state", () => {
  const now = new Date("2026-06-19T08:00:00.000Z");
  let userId: string;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("未登录");
  });

  it("returns dashboard snapshot for authenticated user", async () => {
    const response = await GET(request(userId));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.snapshot).toBeDefined();
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.period).toBe("month");
    expect(typeof body.snapshot.workoutSummary.days).toBe("number");
    expect(typeof body.snapshot.drinkSummary.cups).toBe("number");
  });

  it("returns year snapshot when period=year", async () => {
    const response = await GET(request(userId, "?period=year"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.snapshot.period).toBe("year");
  });

  it("defaults to month when period is invalid", async () => {
    const response = await GET(request(userId, "?period=invalid"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.snapshot.period).toBe("month");
  });
});
