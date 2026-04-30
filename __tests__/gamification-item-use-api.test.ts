import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/items/use/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function wechatOk() {
  return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

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
  let teammateId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const teammate = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    userId = user.id;
    teamId = user.teamId;
    teammateId = teammate.id;
    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.dailyTaskAssignment.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
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

  it("immediately settles boost bonus when used after today's punch", async () => {
    const dayKey = getShanghaiDayKey(fixedNow);
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "coin_rich_coupon", quantity: 1 },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { coins: 140 },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        seasonContributionAwarded: 0,
        countedForSeasonSlot: false,
      },
    });

    const response = await POST(request(userId, { itemId: "coin_rich_coupon" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "coin_rich_coupon",
      status: "SETTLED",
      inventoryConsumed: true,
    });
    expect(body.itemUse.message).toContain("补结算");
    expect(body.snapshot.backpack.todayEffects[0]).toMatchObject({
      itemId: "coin_rich_coupon",
      status: "SETTLED",
    });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: userId } })).resolves.toMatchObject({
      coins: 180,
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

  it("uses a direct social invitation item and returns invitation metadata", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(wechatOk()));
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });

    const response = await POST(
      request(userId, {
        itemId: "drink_water_ping",
        target: { recipientUserId: teammateId, message: "喝一口水" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "drink_water_ping",
      status: "SETTLED",
      targetType: "SOCIAL_INVITATION",
      inventoryConsumed: true,
    });
    expect(body.socialInvitation).toMatchObject({
      status: "PENDING",
      wechatStatus: "SENT",
    });
  });

  it("rejects direct social invitation items without a recipient", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "walk_ping", quantity: 1 },
    });

    const response = await POST(request(userId, { itemId: "walk_ping", target: {} }));

    expect(response.status).toBe(400);
  });

  it("uses a team-wide social invitation item without a recipient", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(wechatOk()));
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });

    const response = await POST(
      request(userId, {
        itemId: "team_standup_ping",
        target: { message: "都站起来" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.itemUse).toMatchObject({
      itemId: "team_standup_ping",
      status: "SETTLED",
      targetType: "SOCIAL_INVITATION",
    });
    expect(body.socialInvitation).toMatchObject({
      status: "PENDING",
      wechatStatus: "SENT",
    });
  });
});
