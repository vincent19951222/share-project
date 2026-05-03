import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/social/respond/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { createSocialInvitationFromItem } from "@/lib/gamification/social-invitations";
import { prisma } from "@/lib/prisma";

function request(userId: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/social/respond", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function wechatOk() {
  return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/gamification/social/respond", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let senderId: string;
  let recipientId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const sender = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const recipient = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    senderId = sender.id;
    recipientId = recipient.id;
    teamId = sender.teamId;
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { invitationId: "invitation-1" }));

    expect(response.status).toBe(401);
  });

  it("responds to a direct social invitation and returns a refreshed snapshot", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const response = await POST(
      request(recipientId, {
        invitationId: created.invitation.id,
        responseText: "已喝水",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.response).toMatchObject({
      invitationId: created.invitation.id,
      responderUserId: recipientId,
      responseText: "已喝水",
    });
    expect(body.snapshot.social.recentResponses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invitationId: created.invitation.id,
          responderUserId: recipientId,
        }),
      ]),
    );
  });

  it("rejects duplicate responses", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await POST(request(recipientId, { invitationId: created.invitation.id }));
    const response = await POST(request(recipientId, { invitationId: created.invitation.id }));

    expect(response.status).toBe(409);
  });
});
