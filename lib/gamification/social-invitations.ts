import { Prisma, type SocialInvitationResponse } from "@/lib/generated/prisma/client";
import type { ItemDefinition } from "@/content/gamification/types";
import { getShanghaiDayKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
import {
  buildSocialMomentDynamic,
  buildTeamBroadcastDynamic,
  safeCreateGameTeamDynamic,
} from "@/lib/gamification/team-dynamics";
import {
  sendEnterpriseWechatMessage,
  type EnterpriseWechatSendResult,
} from "@/lib/integrations/enterprise-wechat";
import { prisma } from "@/lib/prisma";

type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;
type Tx = Prisma.TransactionClient;

type SocialInvitationType =
  | "DRINK_WATER"
  | "WALK_AROUND"
  | "CHAT"
  | "SHARE_INFO"
  | "TEAM_STANDUP"
  | "TEAM_BROADCAST";

type SocialInvitationTarget = {
  recipientUserId?: string;
  message?: string;
};

export class SocialInvitationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 409) {
    super(message);
    this.name = "SocialInvitationError";
    this.code = code;
    this.status = status;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function normalizeInvitationType(value: string): SocialInvitationType {
  if (
    value === "DRINK_WATER" ||
    value === "WALK_AROUND" ||
    value === "CHAT" ||
    value === "SHARE_INFO" ||
    value === "TEAM_STANDUP" ||
    value === "TEAM_BROADCAST"
  ) {
    return value;
  }

  throw new SocialInvitationError("这个弱社交类型暂不支持。", "UNSUPPORTED_SOCIAL_INVITATION", 400);
}

function isTeamWideInvitation(type: SocialInvitationType) {
  return type === "TEAM_STANDUP" || type === "TEAM_BROADCAST";
}

function sanitizeOptionalText(value: unknown, code: string, label: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new SocialInvitationError(`${label}必须是文本。`, code, 400);
  }

  const trimmed = value.trim();
  if (trimmed.length > 80) {
    throw new SocialInvitationError(`${label}最多 80 个字。`, code, 400);
  }

  return trimmed || undefined;
}

function assertSocialItem(itemId: string): {
  definition: ItemDefinition;
  invitationType: SocialInvitationType;
} {
  const definition = getItemDefinition(itemId);

  if (
    !definition ||
    !definition.enabled ||
    definition.category !== "social" ||
    definition.useTiming !== "instant" ||
    definition.effect.type !== "social_invitation"
  ) {
    throw new SocialInvitationError("这个补给不能发起弱社交邀请。", "ITEM_NOT_SOCIAL", 400);
  }

  return {
    definition,
    invitationType: normalizeInvitationType(definition.effect.invitationType),
  };
}

function defaultSocialMessage(type: SocialInvitationType) {
  switch (type) {
    case "DRINK_WATER":
      return "今天的喝水 KPI 靠你守住了。";
    case "WALK_AROUND":
      return "站起来走一圈，让工位以为你离职了。";
    case "CHAT":
      return "聊两句，让班味散一散。";
    case "SHARE_INFO":
      return "分享一个今天看到的新东西。";
    case "TEAM_STANDUP":
      return "全员起立两分钟，刷新一下身体缓存。";
    case "TEAM_BROADCAST":
      return "给全队留一句轻量广播。";
  }
}

function buildInvitationMessage(input: {
  senderUsername: string;
  recipientUsername: string | null;
  invitationType: SocialInvitationType;
  message?: string;
}) {
  const customMessage = input.message ?? defaultSocialMessage(input.invitationType);

  if (isTeamWideInvitation(input.invitationType)) {
    return `${input.senderUsername} 发起了全队弱社交邀请：${customMessage}`;
  }

  return `${input.senderUsername} 点名 ${input.recipientUsername ?? "队友"}：${customMessage}`;
}

async function consumeInventory(input: { tx: Tx; userId: string; itemId: string }) {
  const updated = await input.tx.inventoryItem.updateMany({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      quantity: { gt: 0 },
    },
    data: {
      quantity: { decrement: 1 },
    },
  });

  if (updated.count !== 1) {
    throw new SocialInvitationError("库存不足。", "INSUFFICIENT_INVENTORY");
  }
}

async function assertConfiguredUseLimits(input: {
  tx: Tx;
  userId: string;
  teamId: string;
  itemId: string;
  definition: ItemDefinition;
  dayKey: string;
}) {
  if (input.definition.maxUsePerUserPerDay) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        userId: input.userId,
        itemId: input.itemId,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerUserPerDay) {
      throw new SocialInvitationError("这个道具今天使用次数已达上限。", "USER_DAILY_LIMIT");
    }
  }

  if (input.definition.maxUsePerTeamPerDay) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        teamId: input.teamId,
        itemId: input.itemId,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });

    if (count >= input.definition.maxUsePerTeamPerDay) {
      throw new SocialInvitationError("这个道具今天全队使用次数已达上限。", "TEAM_DAILY_LIMIT");
    }
  }
}

async function resolveRecipient(input: {
  tx: Tx;
  senderUserId: string;
  teamId: string;
  recipientUserId: string | undefined;
  invitationType: SocialInvitationType;
}) {
  if (isTeamWideInvitation(input.invitationType)) {
    return null;
  }

  if (!input.recipientUserId) {
    throw new SocialInvitationError("请先选择一位同队成员。", "RECIPIENT_REQUIRED", 400);
  }

  if (input.recipientUserId === input.senderUserId) {
    throw new SocialInvitationError("不能邀请自己。", "SELF_INVITATION", 400);
  }

  const recipient = await input.tx.user.findUnique({
    where: { id: input.recipientUserId },
    select: { id: true, username: true, teamId: true },
  });

  if (!recipient || recipient.teamId !== input.teamId) {
    throw new SocialInvitationError("只能邀请同队成员。", "RECIPIENT_NOT_FOUND", 404);
  }

  return recipient;
}

async function assertNoDuplicateDirectInvitation(input: {
  tx: Tx;
  senderUserId: string;
  recipientUserId: string | null;
  invitationType: SocialInvitationType;
  dayKey: string;
}) {
  if (!input.recipientUserId) {
    return;
  }

  const existing = await input.tx.socialInvitation.findFirst({
    where: {
      senderUserId: input.senderUserId,
      recipientUserId: input.recipientUserId,
      invitationType: input.invitationType,
      dayKey: input.dayKey,
      status: { in: ["PENDING", "RESPONDED"] },
    },
    select: { id: true },
  });

  if (existing) {
    throw new SocialInvitationError(
      "今天已经对这位队友发过同类邀请了。",
      "DUPLICATE_DIRECT_INVITATION",
    );
  }
}

async function sendWechatForInvitation(input: {
  teamId: string;
  invitationId: string;
  message: string;
  fetchImpl?: FetchImpl;
}): Promise<EnterpriseWechatSendResult> {
  const result = await sendEnterpriseWechatMessage({
    teamId: input.teamId,
    purpose: "WEAK_SOCIAL_INVITATION",
    targetType: "SocialInvitation",
    targetId: input.invitationId,
    fetchImpl: input.fetchImpl,
    message: {
      type: "text",
      content: `【牛马补给站】\n${input.message}`,
    },
  });

  await prisma.socialInvitation.update({
    where: { id: input.invitationId },
    data: {
      wechatSendLogId: result.logId,
      wechatWebhookSentAt: result.status === "SENT" ? new Date() : null,
    },
  });

  return result;
}

export async function createSocialInvitationFromItem(input: {
  userId: string;
  itemId: string;
  target?: SocialInvitationTarget;
  now?: Date;
  fetchImpl?: FetchImpl;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const { definition, invitationType } = assertSocialItem(input.itemId);
  const targetMessage = sanitizeOptionalText(input.target?.message, "INVALID_MESSAGE", "消息");

  const created = await prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, username: true, teamId: true },
    });

    if (!sender) {
      throw new SocialInvitationError("用户不存在。", "USER_NOT_FOUND", 401);
    }

    const recipient = await resolveRecipient({
      tx,
      senderUserId: sender.id,
      teamId: sender.teamId,
      recipientUserId: input.target?.recipientUserId,
      invitationType,
    });
    await assertNoDuplicateDirectInvitation({
      tx,
      senderUserId: sender.id,
      recipientUserId: recipient?.id ?? null,
      invitationType,
      dayKey,
    });
    await assertConfiguredUseLimits({
      tx,
      userId: sender.id,
      teamId: sender.teamId,
      itemId: input.itemId,
      definition,
      dayKey,
    });
    await consumeInventory({ tx, userId: sender.id, itemId: input.itemId });

    const invitationMessage = targetMessage ?? defaultSocialMessage(invitationType);
    const pushMessage = buildInvitationMessage({
      senderUsername: sender.username,
      recipientUsername: recipient?.username ?? null,
      invitationType,
      message: targetMessage,
    });
    const itemUse = await tx.itemUseRecord.create({
      data: {
        userId: sender.id,
        teamId: sender.teamId,
        itemId: input.itemId,
        dayKey,
        status: "SETTLED",
        targetType: "SOCIAL_INVITATION",
        targetId: null,
        effectSnapshotJson: JSON.stringify(definition.effect),
        settledAt: now,
      },
    });
    const invitation = await tx.socialInvitation.create({
      data: {
        teamId: sender.teamId,
        senderUserId: sender.id,
        recipientUserId: recipient?.id ?? null,
        invitationType,
        itemUseRecordId: itemUse.id,
        status: "PENDING",
        dayKey,
        message: invitationMessage,
      },
    });
    const updatedItemUse = await tx.itemUseRecord.update({
      where: { id: itemUse.id },
      data: { targetId: invitation.id },
    });

    return {
      itemUse: updatedItemUse,
      invitation,
      pushMessage,
      senderName: sender.username,
    };
  });

  const teamDynamic =
    created.invitation.invitationType === "TEAM_BROADCAST"
      ? await safeCreateGameTeamDynamic(
          buildTeamBroadcastDynamic({
            teamId: created.invitation.teamId,
            senderUserId: input.userId,
            senderName: created.senderName,
            invitationId: created.invitation.id,
            itemId: input.itemId,
            message: created.invitation.message,
            dayKey: created.invitation.dayKey,
            occurredAt: created.invitation.createdAt,
          }),
        )
      : { status: "SKIPPED" as const };

  const wechat = await sendWechatForInvitation({
    teamId: created.invitation.teamId,
    invitationId: created.invitation.id,
    message: created.pushMessage,
    fetchImpl: input.fetchImpl,
  });

  const invitation = await prisma.socialInvitation.findUniqueOrThrow({
    where: { id: created.invitation.id },
  });

  return {
    itemUse: {
      id: created.itemUse.id,
      itemId: created.itemUse.itemId,
      status: "SETTLED" as const,
      targetType: created.itemUse.targetType,
      targetId: invitation.id,
      inventoryConsumed: true,
      message: "弱社交邀请已发出，对方可以选择响应或忽略。",
    },
    invitation,
    wechat,
    teamDynamic,
  };
}

export async function expirePastSocialInvitations(input: {
  teamId: string;
  todayDayKey: string;
  now?: Date;
}) {
  await prisma.socialInvitation.updateMany({
    where: {
      teamId: input.teamId,
      dayKey: { lt: input.todayDayKey },
      status: "PENDING",
    },
    data: {
      status: "EXPIRED",
      expiredAt: input.now ?? new Date(),
    },
  });
}

export async function respondToSocialInvitation(input: {
  userId: string;
  invitationId: string;
  responseText?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const responseText = sanitizeOptionalText(input.responseText, "INVALID_RESPONSE", "响应内容");
  const responder = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, teamId: true },
  });

  if (!responder) {
    throw new SocialInvitationError("用户不存在。", "USER_NOT_FOUND", 401);
  }

  const invitation = await prisma.socialInvitation.findUnique({
    where: { id: input.invitationId },
    select: {
      id: true,
      teamId: true,
      senderUserId: true,
      recipientUserId: true,
      invitationType: true,
      status: true,
      dayKey: true,
      senderUser: {
        select: { username: true },
      },
    },
  });

  if (!invitation || invitation.teamId !== responder.teamId) {
    throw new SocialInvitationError("邀请不存在。", "INVITATION_NOT_FOUND", 404);
  }

  if (invitation.dayKey !== dayKey) {
    throw new SocialInvitationError("邀请已经过期。", "INVITATION_EXPIRED");
  }

  if (invitation.status === "EXPIRED" || invitation.status === "CANCELLED") {
    throw new SocialInvitationError("邀请已不可响应。", "INVITATION_CLOSED");
  }

  if (invitation.recipientUserId) {
    if (invitation.recipientUserId !== responder.id) {
      throw new SocialInvitationError("只有被邀请人可以响应。", "RESPONDER_NOT_ALLOWED", 403);
    }
  } else if (invitation.senderUserId === responder.id) {
    throw new SocialInvitationError("不能响应自己发起的全队邀请。", "RESPONDER_NOT_ALLOWED", 403);
  }

  let response: SocialInvitationResponse;

  try {
    response = await prisma.$transaction(async (tx) => {
      const response = await tx.socialInvitationResponse.create({
        data: {
          invitationId: invitation.id,
          teamId: invitation.teamId,
          responderUserId: responder.id,
          dayKey,
          responseText: responseText ?? null,
          displayPayloadJson: JSON.stringify({
            invitationType: invitation.invitationType,
            responseText: responseText ?? null,
          }),
        },
      });

      await tx.socialInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "RESPONDED",
          respondedAt: now,
        },
      });

      return response;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SocialInvitationError("你已经响应过这条邀请了。", "ALREADY_RESPONDED");
    }

    throw error;
  }

  const responseCount = await prisma.socialInvitationResponse.count({
    where: { invitationId: invitation.id },
  });

  if (invitation.recipientUserId === null && responseCount >= 2) {
    const responders = await prisma.socialInvitationResponse.findMany({
      where: { invitationId: invitation.id },
      include: {
        responderUser: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    await safeCreateGameTeamDynamic(
      buildSocialMomentDynamic({
        teamId: invitation.teamId,
        invitationId: invitation.id,
        invitationType: invitation.invitationType,
        senderUserId: invitation.senderUserId,
        senderName: invitation.senderUser.username,
        responseCount,
        responders: responders.map((item) => ({
          userId: item.responderUserId,
          displayName: item.responderUser.username,
        })),
        dayKey: invitation.dayKey,
        occurredAt: response.createdAt,
      }),
    );
  }

  return response;
}
