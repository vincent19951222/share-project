import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/coffee/state/route";
import { POST } from "@/app/api/coffee/cups/route";
import { DELETE } from "@/app/api/coffee/cups/latest/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { createCookieValue } from "@/lib/auth";

function request(url: string, userId?: string, method = "GET") {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

describe("coffee API", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET(request("/api/coffee/state"))).status).toBe(401);
    expect((await POST(request("/api/coffee/cups", undefined, "POST"))).status).toBe(401);
    expect((await DELETE(request("/api/coffee/cups/latest", undefined, "DELETE"))).status).toBe(401);
  });

  it("adds one cup for the current user today and returns the latest snapshot", async () => {
    const response = await POST(request("/api/coffee/cups", userId, "POST"));
    expect(response.status).toBe(200);

    const dayKey = getShanghaiDayKey();
    expect(
      await prisma.coffeeRecord.count({
        where: { userId, teamId, dayKey, deletedAt: null },
      }),
    ).toBe(1);

    const body = await response.json();
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.stats.currentUserTodayCups).toBe(1);
  });

  it("creates multiple records when multiple cups are added", async () => {
    await POST(request("/api/coffee/cups", userId, "POST"));
    const response = await POST(request("/api/coffee/cups", userId, "POST"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.stats.currentUserTodayCups).toBe(2);
  });

  it("soft-deletes only the latest current-user cup for today", async () => {
    await POST(request("/api/coffee/cups", userId, "POST"));
    await POST(request("/api/coffee/cups", userId, "POST"));

    const response = await DELETE(request("/api/coffee/cups/latest", userId, "DELETE"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.stats.currentUserTodayCups).toBe(1);
    expect(
      await prisma.coffeeRecord.count({ where: { userId, teamId, deletedAt: null } }),
    ).toBe(1);
    expect(
      await prisma.coffeeRecord.count({
        where: { userId, teamId, deletedAt: { not: null } },
      }),
    ).toBe(1);
  });

  it("returns 409 when there is no cup to remove today", async () => {
    const response = await DELETE(request("/api/coffee/cups/latest", userId, "DELETE"));
    expect(response.status).toBe(409);
  });
});
