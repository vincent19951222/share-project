import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/items/use/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/items/use", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/items/use", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.dailyTaskAssignment.deleteMany({ where: { userId } });
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { itemId: "small_boost_coupon" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(request(userId, { itemId: "" }));

    expect(response.status).toBe(400);
  });

  it("uses a boost and returns a refreshed snapshot", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });

    const response = await POST(request(userId, { itemId: "small_boost_coupon" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
      inventoryConsumed: false,
    });
    expect(body.snapshot.backpack.todayEffects[0]).toMatchObject({
      itemId: "small_boost_coupon",
      status: "PENDING",
    });
  });

  it("uses a task reroll coupon with a target dimension", async () => {
    const dayKey = getShanghaiDayKey(fixedNow);
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 1 },
    });
    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey,
        dimensionKey: "movement",
        taskCardId: "movement_001",
      },
    });

    const response = await POST(
      request(userId, {
        itemId: "task_reroll_coupon",
        target: { dimensionKey: "movement" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "task_reroll_coupon",
      status: "SETTLED",
      targetType: "DAILY_TASK_ASSIGNMENT",
      inventoryConsumed: true,
    });
  });

  it("rejects unsupported item effects", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });

    const response = await POST(request(userId, { itemId: "luckin_coffee_coupon" }));

    expect(response.status).toBe(409);
  });
});
