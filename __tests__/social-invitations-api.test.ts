import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { createCookieValue } from "@/lib/auth";
import { POST as createInvitation } from "@/app/api/social-invitations/route";
import { POST as respondInvitation } from "@/app/api/social-invitations/[invitationId]/respond/route";

function createRequest(body: unknown, userId: string) {
  return new NextRequest("http://localhost/api/social-invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `userId=${createCookieValue(userId)}`,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/social-invitations", () => {
  let senderId: string;
  let recipientId: string;

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T09:00:00+08:00"));
    await seedDatabase();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2 });
    senderId = users[0]!.id;
    recipientId = users[1]!.id;
  });

  beforeEach(async () => {
    await prisma.socialInvitationResponse.deleteMany();
    await prisma.socialInvitation.deleteMany();
    await prisma.enterpriseWechatSendLog.deleteMany();
    await prisma.enterpriseWechatPushEvent.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("creates a direct invitation and pushes one text reminder", async () => {
    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-1",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const response = await createInvitation(
      createRequest(
        {
          type: "DRINK_WATER",
          recipientUserId: recipientId,
          message: "SMOKE_DIRECT_MESSAGE",
        },
        senderId,
      ),
    );

    expect(response.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "WEAK_SOCIAL_INVITATION",
        message: expect.objectContaining({
          type: "text",
          content: expect.not.stringContaining("SMOKE_DIRECT_MESSAGE"),
        }),
      }),
    );
  });

  it("dedupes team-wide invitations by day and invitation type", async () => {
    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-2",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });
    const body = {
      type: "TEAM_STANDUP",
      recipientUserId: null,
      message: "全员起立，动一动。",
    };

    await createInvitation(createRequest(body, senderId));
    const response = await createInvitation(createRequest(body, senderId));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.invitation.status).toBe("PENDING");
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("responds in-app without triggering another enterprise wechat push", async () => {
    const teamId = (await prisma.user.findUniqueOrThrow({ where: { id: senderId } })).teamId;
    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: senderId,
        recipientUserId: recipientId,
        invitationType: "DRINK_WATER",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "li 点名让 luo 接杯水。",
      },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage");

    const response = await respondInvitation(
      new NextRequest(`http://localhost/api/social-invitations/${invitation.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `userId=${createCookieValue(recipientId)}`,
        },
        body: JSON.stringify({ responseText: "收到" }),
      }),
      { params: Promise.resolve({ invitationId: invitation.id }) },
    );

    expect(response.status).toBe(200);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("keeps the invitation when sender throws unexpectedly", async () => {
    const sender = await import("@/lib/integrations/enterprise-wechat");
    vi.spyOn(sender, "sendEnterpriseWechatMessage").mockRejectedValue(new Error("wechat down hard"));

    const response = await createInvitation(
      createRequest(
        {
          type: "DRINK_WATER",
          recipientUserId: recipientId,
          message: "li 点名让 luo 接杯水。",
        },
        senderId,
      ),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.invitation).toMatchObject({
      status: "PENDING",
      senderUserId: senderId,
      recipientUserId: recipientId,
    });
  });
});
