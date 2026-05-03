import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/board/punch/route";
import { createCookieValue } from "@/lib/auth";
import { getCurrentBoardDay } from "@/lib/board-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(method: "POST" | "DELETE", userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("fitness punch ticket hook", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let today: number;
  let todayDayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    today = getCurrentBoardDay(fixedNow);
    todayDayKey = getShanghaiDayKey(fixedNow);

    await prisma.lotteryTicketLedger.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
    await prisma.activityEvent.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 10,
        currentStreak: 0,
        lastPunchDayKey: null,
        ticketBalance: 0,
      },
    });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("grants one fitness ticket with a ledger when a real punch succeeds", async () => {
    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_GRANTED",
      },
    });

    expect(punch.punchType).toBe("default");
    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
    expect(ledgers[0]).toMatchObject({
      teamId,
      delta: 1,
      balanceAfter: 1,
      sourceType: "fitness_punch",
      sourceId: punch.id,
    });
  });

  it("does not grant a second fitness ticket when duplicate punch is rejected", async () => {
    const firstResponse = await POST(request("POST", userId));
    const secondResponse = await POST(request("POST", userId));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_GRANTED",
      },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });

  it("revokes the unused fitness ticket when today's punch is undone", async () => {
    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const todayPunch = await prisma.punchRecord.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const revokeLedger = await prisma.lotteryTicketLedger.findFirst({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_REVOKED",
      },
    });

    expect(todayPunch).toBeNull();
    expect(user.ticketBalance).toBe(0);
    expect(revokeLedger).toMatchObject({
      delta: -1,
      balanceAfter: 0,
      sourceType: "fitness_punch_reversal",
    });
  });

  it("blocks undo when the granted fitness ticket has already been spent from the balance pool", async () => {
    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const userBeforeSpend = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 0 },
    });
    await prisma.lotteryTicketLedger.create({
      data: {
        userId,
        teamId,
        dayKey: todayDayKey,
        delta: -1,
        balanceAfter: 0,
        reason: "LOTTERY_DRAW_SPENT",
        sourceType: "lottery_draw",
        sourceId: "draw-that-spent-fitness-ticket",
      },
    });

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(409);
    await expect(undoResponse.json()).resolves.toMatchObject({
      error: "今天打卡送出的健身券已经花掉了，不能撤销打卡。",
    });

    const punchAfterUndoAttempt = await prisma.punchRecord.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const userAfterUndoAttempt = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const revokeLedger = await prisma.lotteryTicketLedger.findFirst({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_REVOKED",
      },
    });

    expect(punchAfterUndoAttempt?.id).toBe(punch.id);
    expect(userAfterUndoAttempt.coins).toBe(userBeforeSpend.coins);
    expect(userAfterUndoAttempt.currentStreak).toBe(userBeforeSpend.currentStreak);
    expect(userAfterUndoAttempt.lastPunchDayKey).toBe(todayDayKey);
    expect(userAfterUndoAttempt.ticketBalance).toBe(0);
    expect(revokeLedger).toBeNull();
  });

  it("keeps legacy punch undo working when no fitness ticket grant ledger exists", async () => {
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
        countedForSeasonSlot: false,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 20,
        currentStreak: 1,
        lastPunchDayKey: todayDayKey,
        ticketBalance: 0,
      },
    });

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const todayPunch = await prisma.punchRecord.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });

    expect(todayPunch).toBeNull();
    expect(user.ticketBalance).toBe(0);
  });
});
