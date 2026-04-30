import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  createSocialInvitationFromItem,
  expirePastSocialInvitations,
  respondToSocialInvitation,
  SocialInvitationError,
} from "@/lib/gamification/social-invitations";
import { prisma } from "@/lib/prisma";
import * as teamDynamicsService from "@/lib/team-dynamics-service";

function wechatOk() {
  return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("gamification social invitations", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let senderId: string;
  let recipientId: string;
  let thirdUserId: string;
  let teamId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const sender = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const recipient = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const third = await prisma.user.findUniqueOrThrow({ where: { username: "liu" } });
    senderId = sender.id;
    recipientId = recipient.id;
    thirdUserId = third.id;
    teamId = sender.teamId;
    dayKey = getShanghaiDayKey(fixedNow);

    await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.teamDynamic.deleteMany({ where: { teamId } });
    await prisma.itemUseRecord.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    await prisma.user.updateMany({ where: { teamId }, data: { coins: 10, ticketBalance: 0 } });
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
  });

  afterAll(async () => {
    vi.useRealTimers();
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a direct invitation, consumes inventory, settles item use, and records wechat send", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId, message: "喝水提醒" },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: senderId, itemId: "drink_water_ping" } },
    });
    const itemUse = await prisma.itemUseRecord.findUniqueOrThrow({
      where: { id: result.itemUse.id },
    });
    const invitation = await prisma.socialInvitation.findUniqueOrThrow({
      where: { id: result.invitation.id },
    });

    expect(inventory.quantity).toBe(0);
    expect(itemUse).toMatchObject({
      itemId: "drink_water_ping",
      status: "SETTLED",
      targetType: "SOCIAL_INVITATION",
      targetId: invitation.id,
    });
    expect(invitation).toMatchObject({
      senderUserId: senderId,
      recipientUserId: recipientId,
      invitationType: "DRINK_WATER",
      status: "PENDING",
      dayKey,
      message: "喝水提醒",
    });
    expect(invitation.wechatWebhookSentAt).toBeInstanceOf(Date);
    expect(result.wechat.status).toBe("SENT");
  });

  it("keeps invitation when enterprise wechat send fails", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "walk_ping", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "walk_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });

    const invitation = await prisma.socialInvitation.findUniqueOrThrow({
      where: { id: result.invitation.id },
    });
    const log = await prisma.enterpriseWechatSendLog.findFirstOrThrow({
      where: { targetType: "SocialInvitation", targetId: invitation.id },
    });

    expect(result.wechat.status).toBe("FAILED");
    expect(invitation.wechatWebhookSentAt).toBeNull();
    expect(log.failureReason).toBe("NETWORK_ERROR");
  });

  it("creates a team-wide invitation without a recipient", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: { message: "全员起立" },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    expect(result.invitation).toMatchObject({
      invitationType: "TEAM_STANDUP",
      recipientUserId: null,
      status: "PENDING",
    });
  });

  it("writes a team broadcast dynamic when team broadcast coupon is used", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_broadcast_coupon", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_broadcast_coupon",
      target: { message: "今天都站起来，别让椅子以为自己赢了。" },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const dynamic = await prisma.teamDynamic.findFirstOrThrow({
      where: {
        teamId,
        type: "GAME_TEAM_BROADCAST",
        sourceType: "social_invitation_broadcast",
        sourceId: result.invitation.id,
      },
    });

    expect(dynamic.summary).toContain("椅子");
  });

  it("rejects direct invitations without a recipient", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });

    await expect(
      createSocialInvitationFromItem({
        userId: senderId,
        itemId: "drink_water_ping",
        target: {},
      }),
    ).rejects.toMatchObject({
      code: "RECIPIENT_REQUIRED",
      status: 400,
    });
  });

  it("rejects self invitations", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "chat_ping", quantity: 1 },
    });

    await expect(
      createSocialInvitationFromItem({
        userId: senderId,
        itemId: "chat_ping",
        target: { recipientUserId: senderId },
      }),
    ).rejects.toBeInstanceOf(SocialInvitationError);
  });

  it("rejects duplicate direct invitation to the same recipient and type in one day", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "share_info_ping", quantity: 2 },
    });
    await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "share_info_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await expect(
      createSocialInvitationFromItem({
        userId: senderId,
        itemId: "share_info_ping",
        target: { recipientUserId: recipientId },
        fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
      }),
    ).rejects.toMatchObject({
      code: "DUPLICATE_DIRECT_INVITATION",
      status: 409,
    });
  });

  it("lets direct recipient respond and does not grant economy rewards", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const response = await respondToSocialInvitation({
      userId: recipientId,
      invitationId: created.invitation.id,
      responseText: "已喝水",
    });
    const recipient = await prisma.user.findUniqueOrThrow({ where: { id: recipientId } });

    expect(response).toMatchObject({
      invitationId: created.invitation.id,
      responderUserId: recipientId,
      responseText: "已喝水",
    });
    expect(recipient.coins).toBe(10);
    expect(recipient.ticketBalance).toBe(0);
  });

  it("allows multiple same-team users to respond to a team-wide invitation once each", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: {},
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });
    await respondToSocialInvitation({ userId: thirdUserId, invitationId: created.invitation.id });

    await expect(
      respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id }),
    ).rejects.toMatchObject({
      code: "ALREADY_RESPONDED",
      status: 409,
    });

    const responseCount = await prisma.socialInvitationResponse.count({
      where: { invitationId: created.invitation.id },
    });
    expect(responseCount).toBe(2);
  });

  it("writes one social moment dynamic when a team-wide invitation reaches two responses", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: {},
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });
    await respondToSocialInvitation({ userId: thirdUserId, invitationId: created.invitation.id });

    const count = await prisma.teamDynamic.count({
      where: {
        teamId,
        type: "GAME_SOCIAL_MOMENT",
        sourceType: "social_invitation_moment",
        sourceId: created.invitation.id,
      },
    });
    expect(count).toBe(1);
  });

  it("does not write social moment dynamic after only one team-wide response", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: {},
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });

    const count = await prisma.teamDynamic.count({
      where: { teamId, type: "GAME_SOCIAL_MOMENT" },
    });
    expect(count).toBe(0);
  });

  it("still records social response when team dynamics write fails", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: {},
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });
    vi.spyOn(teamDynamicsService, "createOrReuseTeamDynamic").mockRejectedValue(
      new Error("team dynamics unavailable"),
    );

    const response = await respondToSocialInvitation({
      userId: thirdUserId,
      invitationId: created.invitation.id,
    });
    const responseCount = await prisma.socialInvitationResponse.count({
      where: { invitationId: created.invitation.id },
    });

    expect(response.responderUserId).toBe(thirdUserId);
    expect(responseCount).toBe(2);
  });

  it("expires old pending invitations", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "walk_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "walk_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await expirePastSocialInvitations({
      teamId,
      todayDayKey: "2026-04-27",
    });

    const invitation = await prisma.socialInvitation.findUniqueOrThrow({
      where: { id: created.invitation.id },
    });
    expect(invitation.status).toBe("EXPIRED");
    expect(invitation.expiredAt).toBeInstanceOf(Date);
  });
});
