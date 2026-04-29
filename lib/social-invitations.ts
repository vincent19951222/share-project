import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  formatEnterpriseWechatText,
  recordEnterpriseWechatPushEvent,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";

const SOCIAL_INVITATION_TYPES = new Set([
  "DRINK_WATER",
  "WALK_AROUND",
  "TEAM_STANDUP",
  "TEAM_BROADCAST",
]);

const DIRECT_INVITATION_ACTIONS: Record<"DRINK_WATER" | "WALK_AROUND", string> = {
  DRINK_WATER: "接杯水",
  WALK_AROUND: "起来走两分钟",
};

const TEAM_INVITATION_LABELS: Record<"TEAM_STANDUP" | "TEAM_BROADCAST", string> = {
  TEAM_STANDUP: "全员起立",
  TEAM_BROADCAST: "团队广播",
};

export class SocialInvitationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SocialInvitationError";
    this.status = status;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function isSocialInvitationType(
  value: string,
): value is "DRINK_WATER" | "WALK_AROUND" | "TEAM_STANDUP" | "TEAM_BROADCAST" {
  return SOCIAL_INVITATION_TYPES.has(value);
}

function buildInvitationPushMessage(input: {
  senderUsername: string;
  recipientUsername: string | null;
  type: "DRINK_WATER" | "WALK_AROUND" | "TEAM_STANDUP" | "TEAM_BROADCAST";
}) {
  if (input.type === "DRINK_WATER" || input.type === "WALK_AROUND") {
    return formatEnterpriseWechatText({
      title: "牛马补给站提醒",
      lines: [`${input.senderUsername} 点名让 ${input.recipientUsername ?? "队友"} ${DIRECT_INVITATION_ACTIONS[input.type]}。`],
    });
  }

  return formatEnterpriseWechatText({
    title: "牛马补给站提醒",
    lines: [`${input.senderUsername} 发起了${TEAM_INVITATION_LABELS[input.type]}，大家该动一动了。`],
  });
}

export async function createSocialInvitation(input: {
  senderUserId: string;
  type: "DRINK_WATER" | "WALK_AROUND" | "TEAM_STANDUP" | "TEAM_BROADCAST";
  recipientUserId: string | null;
  message: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const message = input.message.trim();

  if (!message) {
    throw new SocialInvitationError(400, "Message is required.");
  }

  const isDirectType = input.type === "DRINK_WATER" || input.type === "WALK_AROUND";
  const isTeamType = input.type === "TEAM_STANDUP" || input.type === "TEAM_BROADCAST";

  if (isDirectType && !input.recipientUserId) {
    throw new SocialInvitationError(400, "Recipient is required for direct invitations.");
  }

  if (isTeamType && input.recipientUserId) {
    throw new SocialInvitationError(400, "Team-wide invitations cannot target a single user.");
  }

  const sender = await prisma.user.findUniqueOrThrow({
    where: { id: input.senderUserId },
    select: { id: true, username: true, teamId: true },
  });

  let recipientUsername: string | null = null;

  if (input.recipientUserId) {
    if (input.recipientUserId === sender.id) {
      throw new SocialInvitationError(400, "Sender cannot invite themselves.");
    }

    const recipient = await prisma.user.findUnique({
      where: { id: input.recipientUserId },
      select: { id: true, username: true, teamId: true },
    });

    if (!recipient || recipient.teamId !== sender.teamId) {
      throw new SocialInvitationError(404, "Recipient not found.");
    }

    recipientUsername = recipient.username;
  }

  const invitation = await prisma.socialInvitation.create({
    data: {
      teamId: sender.teamId,
      senderUserId: sender.id,
      recipientUserId: input.recipientUserId,
      invitationType: input.type,
      status: "PENDING",
      dayKey,
      message,
    },
  });

  const eventKey =
    input.recipientUserId === null
      ? `${sender.teamId}:${dayKey}:${input.type}:TEAM_WIDE_WEAK_SOCIAL`
      : `${invitation.id}:WEAK_SOCIAL_CREATED`;

  const pushEvent = await recordEnterpriseWechatPushEvent({
    teamId: sender.teamId,
    purpose: "WEAK_SOCIAL_INVITATION",
    eventKey,
    targetType: "SocialInvitation",
    targetId: invitation.id,
    payloadJson: JSON.stringify({
      invitationType: input.type,
      dayKey,
      recipientUserId: input.recipientUserId,
    }),
  });

  if (pushEvent.created) {
    try {
      const push = await sendEnterpriseWechatMessage({
        teamId: sender.teamId,
        purpose: "WEAK_SOCIAL_INVITATION",
        targetType: "SocialInvitation",
        targetId: invitation.id,
        message: buildInvitationPushMessage({
          senderUsername: sender.username,
          recipientUsername,
          type: input.type,
        }),
      });
      const sendLog = await prisma.enterpriseWechatSendLog.findUnique({
        where: { id: push.logId },
        select: { id: true },
      });

      await prisma.socialInvitation.update({
        where: { id: invitation.id },
        data: {
          wechatSendLogId: sendLog?.id ?? null,
          wechatWebhookSentAt: push.ok ? now : null,
        },
      });
    } catch {
      // Enterprise WeChat delivery must not fail invitation creation.
    }
  }

  return prisma.socialInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
}

export async function respondToSocialInvitation(input: {
  invitationId: string;
  responderUserId: string;
  responseText?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const responder = await prisma.user.findUniqueOrThrow({
    where: { id: input.responderUserId },
    select: { id: true, teamId: true },
  });
  const invitation = await prisma.socialInvitation.findUnique({
    where: { id: input.invitationId },
    select: {
      id: true,
      teamId: true,
      senderUserId: true,
      recipientUserId: true,
      status: true,
      dayKey: true,
    },
  });

  if (!invitation || invitation.teamId !== responder.teamId) {
    throw new SocialInvitationError(404, "Invitation not found.");
  }

  if (invitation.dayKey !== dayKey) {
    throw new SocialInvitationError(409, "Invitation has expired.");
  }

  if (invitation.status === "EXPIRED" || invitation.status === "CANCELLED") {
    throw new SocialInvitationError(409, "Invitation can no longer be responded to.");
  }

  if (invitation.recipientUserId) {
    if (invitation.recipientUserId !== responder.id) {
      throw new SocialInvitationError(403, "Only the invited teammate can respond.");
    }
  } else if (invitation.senderUserId === responder.id) {
    throw new SocialInvitationError(403, "Sender cannot respond to a team-wide invitation.");
  }

  try {
    const response = await prisma.socialInvitationResponse.create({
      data: {
        invitationId: invitation.id,
        teamId: invitation.teamId,
        responderUserId: responder.id,
        responseText: input.responseText?.trim() || null,
        dayKey,
      },
    });

    const updatedInvitation = await prisma.socialInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "RESPONDED",
        respondedAt: now,
      },
    });

    return { invitation: updatedInvitation, response };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SocialInvitationError(409, "Invitation has already been responded to.");
    }

    throw error;
  }
}
