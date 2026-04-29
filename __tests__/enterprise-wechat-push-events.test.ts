import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("enterprise wechat persistence", () => {
  let teamId: string;
  let senderUserId: string;
  let recipientUserId: string;

  beforeEach(async () => {
    await seedDatabase();
    const team = await prisma.team.findUniqueOrThrow({ where: { code: "ROOM-88" } });
    const users = await prisma.user.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "asc" },
      take: 2,
    });

    teamId = team.id;
    senderUserId = users[0]!.id;
    recipientUserId = users[1]!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores enterprise wechat send logs without the webhook url", async () => {
    const log = await prisma.enterpriseWechatSendLog.create({
      data: {
        teamId,
        purpose: "WEEKLY_REPORT",
        messageType: "markdown",
        status: "SENT",
        contentPreview: "preview",
        targetType: "WeeklyReport",
        targetId: "draft-1",
        httpStatus: 200,
        wechatErrcode: 0,
        wechatErrmsg: "ok",
      },
    });

    expect(log.status).toBe("SENT");
    expect(JSON.stringify(log)).not.toContain("webhook");
  });

  it("dedupes high-value push events by unique event key", async () => {
    await prisma.enterpriseWechatPushEvent.create({
      data: {
        teamId,
        purpose: "TEAM_MILESTONE",
        eventKey: `${teamId}:2026-04-29:FULL_TEAM_PUNCHED`,
        targetType: "Attendance",
        targetId: "2026-04-29",
      },
    });

    await expect(
      prisma.enterpriseWechatPushEvent.create({
        data: {
          teamId,
          purpose: "TEAM_MILESTONE",
          eventKey: `${teamId}:2026-04-29:FULL_TEAM_PUNCHED`,
          targetType: "Attendance",
          targetId: "2026-04-29",
        },
      }),
    ).rejects.toThrow();
  });

  it("stores weak-social invitations and responses in-app", async () => {
    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId,
        recipientUserId,
        invitationType: "DRINK_WATER",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "li 点名让 luo 接杯水。",
      },
    });

    const response = await prisma.socialInvitationResponse.create({
      data: {
        invitationId: invitation.id,
        teamId,
        responderUserId: recipientUserId,
        responseText: "收到",
        dayKey: "2026-04-29",
      },
    });

    expect(invitation.status).toBe("PENDING");
    expect(response.invitationId).toBe(invitation.id);
  });
});
