import { Prisma } from "@/lib/generated/prisma/client";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";

export const RELEASE_BENEFIT_TICKET_AMOUNT = 20;
export const RELEASE_BENEFIT_REASON = "MANUAL_RELEASE_BENEFIT_GRANTED";
export const RELEASE_BENEFIT_SOURCE_TYPE = "manual_release_benefit";

const MAX_GRANT_KEY_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 80;

interface GrantReleaseBenefitInput {
  adminUserId: string;
  adminUsername: string;
  teamId: string;
  grantKey: string;
  message?: string | null;
  now?: Date;
}

export interface GrantReleaseBenefitResult {
  amount: number;
  grantKey: string;
  grantedCount: number;
  teamDynamicId: string;
}

export class ReleaseBenefitError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReleaseBenefitError";
  }
}

function normalizeGrantKey(value: string): string {
  const normalized = value.trim();

  if (normalized.length < 3 || normalized.length > MAX_GRANT_KEY_LENGTH) {
    throw new ReleaseBenefitError("invalid-grant-key", 400);
  }

  return normalized;
}

function normalizeMessage(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new ReleaseBenefitError("invalid-message", 400);
  }

  return normalized || `大版本更新福利已到账，每人 ${RELEASE_BENEFIT_TICKET_AMOUNT} 张抽奖券。`;
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function grantReleaseBenefit({
  adminUserId,
  adminUsername,
  teamId,
  grantKey,
  message,
  now = new Date(),
}: GrantReleaseBenefitInput): Promise<GrantReleaseBenefitResult> {
  const normalizedGrantKey = normalizeGrantKey(grantKey);
  const normalizedMessage = normalizeMessage(message);
  const teamBatchSourceId = `${teamId}:${normalizedGrantKey}`;
  const userSourceIdPrefix = `${teamBatchSourceId}:`;
  const dayKey = getShanghaiDayKey(now);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingBatch = await tx.lotteryTicketLedger.findFirst({
        where: {
          teamId,
          reason: RELEASE_BENEFIT_REASON,
          sourceType: RELEASE_BENEFIT_SOURCE_TYPE,
          sourceId: {
            startsWith: userSourceIdPrefix,
          },
        },
        select: { id: true },
      });

      if (existingBatch) {
        throw new ReleaseBenefitError("benefit-already-granted", 409);
      }

      const members = await tx.user.findMany({
        where: { teamId },
        select: {
          id: true,
        },
        orderBy: { createdAt: "asc" },
      });

      for (const member of members) {
        const updatedUser = await tx.user.update({
          where: { id: member.id },
          data: {
            ticketBalance: {
              increment: RELEASE_BENEFIT_TICKET_AMOUNT,
            },
          },
          select: {
            ticketBalance: true,
          },
        });

        await tx.lotteryTicketLedger.create({
          data: {
            userId: member.id,
            teamId,
            dayKey,
            delta: RELEASE_BENEFIT_TICKET_AMOUNT,
            balanceAfter: updatedUser.ticketBalance,
            reason: RELEASE_BENEFIT_REASON,
            sourceType: RELEASE_BENEFIT_SOURCE_TYPE,
            sourceId: `${userSourceIdPrefix}${member.id}`,
            metadataJson: JSON.stringify({
              grantKey: normalizedGrantKey,
              adminUserId,
              source: "admin-release-benefit",
            }),
            createdAt: now,
          },
        });
      }

      const dynamic = await tx.teamDynamic.create({
        data: {
          teamId,
          type: TEAM_DYNAMIC_TYPES.GAME_RELEASE_BENEFIT,
          title: "版本福利已发放",
          summary: `${normalizedMessage} 全员 +${RELEASE_BENEFIT_TICKET_AMOUNT} 张抽奖券。`,
          payloadJson: JSON.stringify({
            grantKey: normalizedGrantKey,
            amount: RELEASE_BENEFIT_TICKET_AMOUNT,
            grantedCount: members.length,
            adminUserId,
            adminUsername,
            message: normalizedMessage,
          }),
          actorUserId: adminUserId,
          sourceType: RELEASE_BENEFIT_SOURCE_TYPE,
          sourceId: teamBatchSourceId,
          importance: "high",
          occurredAt: now,
        },
      });

      return {
        amount: RELEASE_BENEFIT_TICKET_AMOUNT,
        grantKey: normalizedGrantKey,
        grantedCount: members.length,
        teamDynamicId: dynamic.id,
      };
    });
  } catch (error) {
    if (error instanceof ReleaseBenefitError) {
      throw error;
    }

    if (isUniqueConflict(error)) {
      throw new ReleaseBenefitError("benefit-already-granted", 409);
    }

    throw error;
  }
}
