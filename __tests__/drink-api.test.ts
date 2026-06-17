import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/drinks/records/latest/route";
import { POST } from "@/app/api/drinks/records/route";
import { GET } from "@/app/api/drinks/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getPreviousShanghaiDayKey, getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(url: string, userId?: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: userId
      ? {
          Cookie: `userId=${createCookieValue(userId)}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
  });
}

describe("drink API", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.drinkRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects unauthenticated drink requests", async () => {
    expect((await GET(request("/api/drinks/state"))).status).toBe(401);
    expect((await POST(request("/api/drinks/records", undefined, "POST", { drinkType: "water" })))
      .status).toBe(401);
    expect((await DELETE(request("/api/drinks/records/latest", undefined, "DELETE"))).status).toBe(
      401,
    );
  });

  it("creates a drink record with type and note", async () => {
    const response = await POST(
      request("/api/drinks/records", userId, "POST", {
        drinkType: "milkTea",
        note: "奶茶续命，快乐加倍",
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.snapshot.stats.latestDrink).toMatchObject({
      drinkType: "milkTea",
      note: "奶茶续命，快乐加倍",
    });
    await expect(
      prisma.drinkRecord.findFirstOrThrow({
        where: { userId, teamId, drinkType: "milkTea", deletedAt: null },
      }),
    ).resolves.toMatchObject({
      note: "奶茶续命，快乐加倍",
    });
  });

  it("creates a drink record for yesterday when a makeup day key is provided", async () => {
    const fixedNow = new Date("2026-06-17T09:00:00+08:00");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    const yesterdayDayKey = getPreviousShanghaiDayKey(getShanghaiDayKey());

    const response = await POST(
      request("/api/drinks/records", userId, "POST", {
        drinkType: "latte",
        note: "昨天忘记记了",
        dayKey: yesterdayDayKey,
      }),
    );
    const payload = await response.json();
    const yesterdayDay = Number(yesterdayDayKey.slice(8, 10));

    expect(response.status).toBe(200);
    expect(payload.snapshot.stats.currentUserTodayCups).toBe(0);
    expect(payload.snapshot.gridData[0][yesterdayDay - 1].drinkCounts.latte).toBe(1);
    await expect(
      prisma.drinkRecord.findFirstOrThrow({
        where: { userId, teamId, drinkType: "latte", deletedAt: null },
      }),
    ).resolves.toMatchObject({
      dayKey: yesterdayDayKey,
      note: "昨天忘记记了",
    });
  });

  it("rejects explicit drink day keys outside yesterday", async () => {
    const fixedNow = new Date("2026-06-17T09:00:00+08:00");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    const todayDayKey = getShanghaiDayKey();
    const twoDaysAgo = getPreviousShanghaiDayKey(getPreviousShanghaiDayKey(todayDayKey));

    const todayResponse = await POST(
      request("/api/drinks/records", userId, "POST", {
        drinkType: "water",
        dayKey: todayDayKey,
      }),
    );
    const olderResponse = await POST(
      request("/api/drinks/records", userId, "POST", {
        drinkType: "water",
        dayKey: twoDaysAgo,
      }),
    );

    expect(todayResponse.status).toBe(409);
    expect(olderResponse.status).toBe(409);
    await expect(prisma.drinkRecord.count({ where: { userId, teamId } })).resolves.toBe(0);
  });

  it("rejects unsupported drink types", async () => {
    const response = await POST(
      request("/api/drinks/records", userId, "POST", {
        drinkType: "coffee",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("soft-deletes the latest matching drink type", async () => {
    await POST(request("/api/drinks/records", userId, "POST", { drinkType: "water" }));
    await POST(request("/api/drinks/records", userId, "POST", { drinkType: "latte" }));

    const response = await DELETE(
      request("/api/drinks/records/latest", userId, "DELETE", { drinkType: "water" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.snapshot.stats.drinkCounts.water).toBe(0);
    expect(payload.snapshot.stats.drinkCounts.latte).toBe(1);
  });

  it("soft-deletes the latest drink without a type even when legacy data has an unknown type", async () => {
    await prisma.drinkRecord.create({
      data: {
        userId,
        teamId,
        dayKey: getShanghaiDayKey(),
        drinkType: "legacy-coffee",
        note: "legacy import",
      },
    });

    const response = await DELETE(request("/api/drinks/records/latest", userId, "DELETE"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.snapshot.stats.currentUserTodayCups).toBe(0);
    await expect(
      prisma.drinkRecord.findFirstOrThrow({
        where: { userId, teamId, drinkType: "legacy-coffee" },
      }),
    ).resolves.toMatchObject({
      deletedAt: expect.any(Date),
    });
  });
});
