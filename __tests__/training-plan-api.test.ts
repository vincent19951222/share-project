import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/training-plan/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string, body: unknown = {}) {
  return new NextRequest("http://localhost/api/training-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const validInput = {
  weeklyFrequency: 3,
  sessionDurationMinutes: 45,
  weekdays: [1, 3, 6],
  equipment: ["gym"],
  avoidTags: [],
};

describe("training plan API", () => {
  let userId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-13T08:00:00+08:00"));
    await seedDatabase();
    userId = (
      await prisma.user.findUniqueOrThrow({ where: { username: "li" }, select: { id: true } })
    ).id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const response = await POST(request(undefined, validInput));
    expect(response.status).toBe(401);
  });

  it("rejects invalid plan input", async () => {
    const response = await POST(
      request(userId, { ...validInput, weekdays: [1, 3] }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "weekday-count-mismatch" });
  });

  it("creates a plan and returns it in the board snapshot", async () => {
    const response = await POST(request(userId, validInput));
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.snapshot.currentTrainingPlan).toMatchObject({
      startDayKey: "2026-07-13",
      endDayKey: "2026-08-09",
      currentWeekIndex: 1,
    });
    expect(body.snapshot.currentTrainingPlan.days).toHaveLength(12);
    expect(body.snapshot.currentUserId).toBe(userId);
  });

  it("rejects a second active plan", async () => {
    expect((await POST(request(userId, validInput))).status).toBe(201);
    const response = await POST(request(userId, validInput));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "active-plan-exists" });
  });
});
