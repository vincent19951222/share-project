import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/lottery/draw/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import * as teamDynamicsService from "@/lib/team-dynamics-service";

function request(userId?: string, body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/gamification/lottery/draw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/lottery/draw", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);

    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    dayKey = getShanghaiDayKey(fixedNow);

    await prisma.lotteryDrawResult.deleteMany({});
    await prisma.lotteryDraw.deleteMany({});
    await prisma.teamDynamic.deleteMany({ where: { teamId: user.teamId } });
    await prisma.lotteryTicketLedger.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 200,
        ticketBalance: 10,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { drawType: "SINGLE" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid draw type", async () => {
    const response = await POST(request(userId, { drawType: "BAD" }));

    expect(response.status).toBe(400);
  });

  it("runs a single draw and returns draw plus snapshot", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });

    const response = await POST(request(userId, { drawType: "SINGLE" }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.draw).toMatchObject({
      drawType: "SINGLE",
      ticketSpent: 1,
      coinSpent: 0,
    });
    expect(body.draw.rewards).toHaveLength(1);
    expect(body.snapshot.ticketBalance).toBe(0);
    expect(body.snapshot.lottery.recentDraws[0].id).toBe(body.draw.id);
  });

  it("writes a team dynamic when a rare reward is drawn", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });
    vi.spyOn(Math, "random").mockReturnValue(0.999);

    const response = await POST(request(userId, { drawType: "SINGLE" }));
    expect(response.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const dynamic = await prisma.teamDynamic.findFirstOrThrow({
      where: {
        teamId: user.teamId,
        type: "GAME_RARE_PRIZE",
        sourceType: "lottery_draw_result",
      },
    });

    expect(dynamic.title).toContain("瑞幸咖啡券");
    expect(dynamic.actorUserId).toBe(userId);
  });

  it("does not write a team dynamic for common coin rewards", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });
    vi.spyOn(Math, "random").mockReturnValue(0.01);

    const response = await POST(request(userId, { drawType: "SINGLE" }));
    expect(response.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const count = await prisma.teamDynamic.count({
      where: { teamId: user.teamId, type: "GAME_RARE_PRIZE" },
    });
    expect(count).toBe(0);
  });

  it("still completes a rare draw when team dynamics write fails", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    vi.spyOn(teamDynamicsService, "createOrReuseTeamDynamic").mockRejectedValue(
      new Error("team dynamics unavailable"),
    );

    const response = await POST(request(userId, { drawType: "SINGLE" }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.teamDynamics[0]).toMatchObject({ status: "FAILED" });
    expect(await prisma.lotteryDraw.count({ where: { userId } })).toBe(1);
  });

  it("runs a ten draw with top-up", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ticketBalance: 4,
        coins: 500,
      },
    });

    const response = await POST(
      request(userId, {
        drawType: "TEN",
        useCoinTopUp: true,
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: { userId, dayKey },
    });

    expect(body.draw).toMatchObject({
      drawType: "TEN",
      ticketSpent: 10,
      coinSpent: 240,
    });
    expect(body.draw.rewards).toHaveLength(10);
    expect(ledgers.some((ledger) => ledger.reason === "COIN_PURCHASE_GRANTED")).toBe(true);
    expect(ledgers.some((ledger) => ledger.reason === "LOTTERY_DRAW_SPENT")).toBe(true);
  });

  it("rejects ten draw top-up without confirmation", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ticketBalance: 8,
        coins: 200,
      },
    });

    const response = await POST(request(userId, { drawType: "TEN" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("确认"),
    });
  });
});
