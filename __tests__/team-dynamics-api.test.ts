import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { createCookieValue } from "@/lib/auth";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import { GET as getTimeline } from "@/app/api/team-dynamics/route";
import { POST as postRead } from "@/app/api/team-dynamics/read/route";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";

function request(
  path: string,
  userId?: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/team-dynamics", () => {
  let userId: string;
  let teammateId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const teammate = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    userId = user.id;
    teammateId = teammate.id;
    teamId = user.teamId;
  });

  beforeEach(async () => {
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await getTimeline(request("/api/team-dynamics"));
    expect(response.status).toBe(401);
  });

  it("returns the latest panel slice and unread count for the viewer team", async () => {
    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "新赛季已经开启",
      summary: "五月脱脂挑战开始了",
      payload: { goalName: "五月脱脂挑战" },
      sourceType: "season",
      sourceId: "season-panel",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    const response = await getTimeline(request("/api/team-dynamics?view=panel", userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.unreadCount).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      title: "新赛季已经开启",
      isRead: false,
    });
  });

  it("supports unread filter and marks entries as read", async () => {
    const entry = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE,
      title: "li 连续打卡 7 天",
      summary: "保持住了",
      payload: { username: "li", streak: 7 },
      sourceType: "streak",
      sourceId: "li-7-2026-04-25",
      occurredAt: new Date("2026-04-25T09:00:00+08:00"),
    });

    const markResponse = await postRead(
      request("/api/team-dynamics/read", userId, "POST", {
        mode: "single",
        id: entry.id,
      }),
    );
    expect(markResponse.status).toBe(200);

    const response = await getTimeline(
      request("/api/team-dynamics?view=page&filter=unread", userId),
    );
    const body = await response.json();

    expect(body.unreadCount).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  it("marks all entries as read for the current user only", async () => {
    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_ENDED,
      title: "赛季已经结束",
      summary: "五月脱脂挑战已封盘",
      payload: { goalName: "五月脱脂挑战" },
      sourceType: "season",
      sourceId: "season-ended-page",
      occurredAt: new Date("2026-04-25T10:00:00+08:00"),
    });

    const response = await postRead(
      request("/api/team-dynamics/read", userId, "POST", {
        mode: "all",
      }),
    );
    expect(response.status).toBe(200);

    const teammateView = await getTimeline(request("/api/team-dynamics?view=panel", teammateId));
    const teammateBody = await teammateView.json();

    expect(teammateBody.unreadCount).toBe(1);
  });
});
