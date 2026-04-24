import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/activity-events/route";
import { createCookieValue } from "@/lib/auth";
import { ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string, search = "") {
  return new NextRequest(`http://localhost/api/activity-events${search}`, {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {},
  });
}

describe("/api/activity-events", () => {
  const now = new Date("2026-04-23T20:00:00+08:00");
  let userId: string;
  let teammateId: string;
  let teamId: string;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const teammate = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    userId = user.id;
    teammateId = teammate.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns the latest 50 activity events from the last 24 hours", async () => {
    await prisma.activityEvent.deleteMany({ where: { teamId } });
    await prisma.activityEvent.create({
      data: {
        teamId,
        userId,
        type: ACTIVITY_EVENT_TYPES.PUNCH,
        message: "too old",
        assetAwarded: 10,
        createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      },
    });

    for (let index = 0; index < 55; index += 1) {
      await prisma.activityEvent.create({
        data: {
          teamId,
          userId,
          type: ACTIVITY_EVENT_TYPES.PUNCH,
          message: `recent-${index}`,
          assetAwarded: 20,
          createdAt: new Date(now.getTime() - index * 60 * 1000),
        },
      });
    }

    const response = await GET(request(userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(50);
    expect(body.events[0].text).toBe("recent-0");
    expect(body.events[49].text).toBe("recent-49");
    expect(body.events.some((event: { text: string }) => event.text === "too old")).toBe(false);
    expect(body.events[0].user).toMatchObject({
      id: userId,
      name: "li",
      avatarKey: "male1",
    });
  });

  it("returns the same team activity list for teammates and after relogin", async () => {
    await prisma.activityEvent.deleteMany({ where: { teamId } });
    await prisma.activityEvent.create({
      data: {
        teamId,
        userId,
        type: ACTIVITY_EVENT_TYPES.PUNCH,
        message: "li 刚刚打卡，拿下 20 银子",
        assetAwarded: 20,
        createdAt: new Date(now.getTime() - 1000),
      },
    });
    await prisma.activityEvent.create({
      data: {
        teamId,
        userId: teammateId,
        type: ACTIVITY_EVENT_TYPES.PUNCH,
        message: "luo 刚刚打卡，拿下 20 银子",
        assetAwarded: 20,
        createdAt: now,
      },
    });

    const firstLoginResponse = await GET(request(userId));
    const teammateResponse = await GET(request(teammateId));
    const reloginResponse = await GET(request(userId));

    const firstLoginBody = await firstLoginResponse.json();
    const teammateBody = await teammateResponse.json();
    const reloginBody = await reloginResponse.json();

    expect(firstLoginResponse.status).toBe(200);
    expect(teammateResponse.status).toBe(200);
    expect(reloginResponse.status).toBe(200);
    expect(firstLoginBody.events.map((event: { text: string }) => event.text)).toEqual([
      "luo 刚刚打卡，拿下 20 银子",
      "li 刚刚打卡，拿下 20 银子",
    ]);
    expect(teammateBody.events).toEqual(firstLoginBody.events);
    expect(reloginBody.events).toEqual(firstLoginBody.events);
  });

  it("filters coffee events to the current Shanghai day and punch events by kind", async () => {
    await prisma.activityEvent.deleteMany({ where: { teamId } });

    await prisma.activityEvent.createMany({
      data: [
        {
          teamId,
          userId,
          type: ACTIVITY_EVENT_TYPES.COFFEE_ADD,
          message: "li 续命 1 杯，今日累计 1 杯",
          assetAwarded: null,
          createdAt: new Date("2026-04-23T09:18:00+08:00"),
        },
        {
          teamId,
          userId,
          type: ACTIVITY_EVENT_TYPES.COFFEE_REMOVE,
          message: "li 撤回 1 杯咖啡，今日累计 0 杯",
          assetAwarded: null,
          createdAt: new Date("2026-04-22T23:30:00+08:00"),
        },
        {
          teamId,
          userId: teammateId,
          type: ACTIVITY_EVENT_TYPES.PUNCH,
          message: "luo 刚刚打卡，拿下 20 银子",
          assetAwarded: 20,
          createdAt: new Date("2026-04-23T11:18:00+08:00"),
        },
      ],
    });

    const coffeeResponse = await GET(request(userId, "?kind=coffee"));
    const coffeeBody = await coffeeResponse.json();
    const punchResponse = await GET(request(userId, "?kind=punch"));
    const punchBody = await punchResponse.json();

    expect(coffeeResponse.status).toBe(200);
    expect(coffeeBody.events.map((event: { text: string }) => event.text)).toEqual([
      "li 续命 1 杯，今日累计 1 杯",
    ]);

    expect(punchResponse.status).toBe(200);
    expect(punchBody.events.map((event: { text: string }) => event.text)).toEqual([
      "luo 刚刚打卡，拿下 20 银子",
    ]);
  });
});
