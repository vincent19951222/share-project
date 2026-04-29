import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as claimTicket } from "@/app/api/gamification/tasks/claim-ticket/route";
import { POST as completeTask } from "@/app/api/gamification/tasks/complete/route";
import { POST as ensureToday } from "@/app/api/gamification/tasks/ensure-today/route";
import { POST as rerollTask } from "@/app/api/gamification/tasks/reroll/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(url: string, userId?: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("gamification task APIs", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    userId = (await prisma.user.findUniqueOrThrow({ where: { username: "li" } })).id;
    dayKey = getShanghaiDayKey(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects unauthenticated task actions", async () => {
    const response = await ensureToday(request("/api/gamification/tasks/ensure-today"));
    expect(response.status).toBe(401);
  });

  it("ensures today's assignments and returns a snapshot", async () => {
    const response = await ensureToday(request("/api/gamification/tasks/ensure-today", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot.dimensions).toHaveLength(4);
    expect(body.snapshot.dimensions.every((dimension: { assignment: unknown }) => dimension.assignment)).toBe(true);

    const assignments = await prisma.dailyTaskAssignment.findMany({ where: { userId, dayKey } });
    expect(assignments).toHaveLength(4);
  });

  it("completes a task and exposes progress in the snapshot", async () => {
    await ensureToday(request("/api/gamification/tasks/ensure-today", userId));

    const response = await completeTask(
      request("/api/gamification/tasks/complete", userId, {
        dimensionKey: "movement",
        completionText: "已复活",
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const movement = body.snapshot.dimensions.find((dimension: { key: string }) => dimension.key === "movement");
    expect(movement.assignment).toMatchObject({
      status: "completed",
      completionText: "已复活",
      canComplete: false,
      canReroll: false,
    });
    expect(body.snapshot.ticketSummary.taskCompletedCount).toBe(1);
    expect(body.snapshot.ticketSummary.lifeTicketClaimable).toBe(false);
  });

  it("rerolls an incomplete task", async () => {
    await ensureToday(request("/api/gamification/tasks/ensure-today", userId));
    const before = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });

    const response = await rerollTask(
      request("/api/gamification/tasks/reroll", userId, {
        dimensionKey: "movement",
      }),
    );
    expect(response.status).toBe(200);

    const after = await prisma.dailyTaskAssignment.findUniqueOrThrow({
      where: {
        userId_dayKey_dimensionKey: {
          userId,
          dayKey,
          dimensionKey: "movement",
        },
      },
    });
    expect(after.taskCardId).not.toBe(before.taskCardId);
    expect(after.rerollCount).toBe(1);
  });

  it("claims exactly one life ticket after all four tasks are complete", async () => {
    await ensureToday(request("/api/gamification/tasks/ensure-today", userId));

    for (const dimensionKey of ["movement", "hydration", "social", "learning"]) {
      await completeTask(
        request("/api/gamification/tasks/complete", userId, {
          dimensionKey,
        }),
      );
    }

    const firstResponse = await claimTicket(request("/api/gamification/tasks/claim-ticket", userId));
    const secondResponse = await claimTicket(request("/api/gamification/tasks/claim-ticket", userId));
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const body = await secondResponse.json();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: { userId, dayKey, reason: "DAILY_TASKS_GRANTED" },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
    expect(body.snapshot.ticketSummary).toMatchObject({
      lifeTicketEarned: true,
      lifeTicketClaimable: false,
      todayEarned: 1,
    });
  });
});
