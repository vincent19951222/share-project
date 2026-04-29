import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCookieValue } from "@/lib/auth";
import {
  ACTIVITY_EVENT_TYPES,
  buildPunchActivityMessage,
  buildUndoPunchActivityMessage,
} from "@/lib/activity-events";
import { buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";
import {
  FITNESS_PUNCH_REVERSAL_SOURCE_TYPE,
  FITNESS_PUNCH_SOURCE_TYPE,
  FITNESS_PUNCH_TICKET_GRANT_REASON,
  FITNESS_PUNCH_TICKET_REVOKE_REASON,
  FitnessTicketAlreadySpentError,
  shouldGrantFitnessPunchTicket,
} from "@/lib/gamification/fitness-ticket";
import {
  getPunchRewardForStreak,
  getShanghaiDayKey,
} from "@/lib/economy";
import {
  getNextPunchStreakWithLeaveProtection,
} from "@/lib/gamification/item-use";
import { settleBoostForPunch } from "@/lib/gamification/boost-settlement";
import {
  pushFullTeamAttendanceIfNeeded,
  pushSeasonTargetReachedIfNeeded,
  pushStreakMilestoneIfNeeded,
} from "@/lib/high-value-push";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";

const STREAK_MILESTONES = new Set([7, 14, 30]);

class TodayPunchNotFoundError extends Error {
  constructor() {
    super("今天还没打卡，撤销不了");
    this.name = "TodayPunchNotFoundError";
  }
}

function isPunchConflictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }

  return error instanceof Error && error.message.toLowerCase().includes("database is locked");
}

async function buildSnapshotResponse(userId: string, now: Date) {
  const snapshot = await buildBoardSnapshotForUser(userId, now);

  if (!snapshot) {
    return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
  }

  return NextResponse.json({ snapshot });
}

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          include: {
            users: {
              select: {
                id: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            seasons: {
              where: { status: "ACTIVE" },
              orderBy: { startedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "user-not-found" }, { status: 401 });
    }

    const now = new Date();
    const today = getCurrentBoardDay(now);
    const todayDayKey = getShanghaiDayKey(now);
    const nextStreak = await getNextPunchStreakWithLeaveProtection({
      userId: user.id,
      currentStreak: user.currentStreak,
      lastPunchDayKey: user.lastPunchDayKey,
      todayDayKey,
    });
    const reward = getPunchRewardForStreak(nextStreak);
    const activeSeason = user.team.seasons[0] ?? null;
    const baseReward = reward;
    const baseSeasonContribution = activeSeason ? baseReward : 0;
    const memberOrder = Math.max(
      user.team.users.findIndex((member) => member.id === user.id),
      0,
    );
    const teamMemberIds = user.team.users.map((member) => member.id);
    const teamMemberCount = teamMemberIds.length;
    let recordCountedForSeasonSlot = false;
    let nextFilledSlots = activeSeason?.filledSlots ?? 0;

    try {
      await prisma.$transaction(async (tx) => {
        let countsForSeasonSlot = false;

        if (activeSeason) {
          const seasonUpdate = await tx.season.updateMany({
            where: {
              id: activeSeason.id,
              status: "ACTIVE",
              filledSlots: {
                lt: activeSeason.targetSlots,
              },
            },
            data: {
              filledSlots: {
                increment: 1,
              },
            },
          });

          countsForSeasonSlot = seasonUpdate.count === 1;
          recordCountedForSeasonSlot = countsForSeasonSlot;
          nextFilledSlots = countsForSeasonSlot
            ? Math.min(activeSeason.filledSlots + 1, activeSeason.targetSlots)
            : activeSeason.filledSlots;
        }

        const punch = await tx.punchRecord.create({
          data: {
            userId: user.id,
            seasonId: activeSeason?.id ?? null,
            dayIndex: today,
            dayKey: todayDayKey,
            punched: true,
            punchType: "default",
            streakAfterPunch: nextStreak,
            assetAwarded: baseReward,
            baseAssetAwarded: baseReward,
            boostAssetBonus: 0,
            baseSeasonContribution,
            boostSeasonBonus: 0,
            seasonContributionAwarded: baseSeasonContribution,
            countedForSeasonSlot: countsForSeasonSlot,
          },
        });
        const grantsFitnessTicket = shouldGrantFitnessPunchTicket(punch);

        const boostSettlement = await settleBoostForPunch({
          tx,
          userId: user.id,
          teamId: user.teamId,
          dayKey: todayDayKey,
          punchRecordId: punch.id,
          baseAssetAwarded: baseReward,
          baseSeasonContribution,
          applyBonusDeltas: false,
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            coins: {
              increment: boostSettlement.assetAwarded,
            },
            currentStreak: nextStreak,
            lastPunchDayKey: todayDayKey,
            ...(grantsFitnessTicket
              ? {
                  ticketBalance: {
                    increment: 1,
                  },
                }
              : {}),
          },
          select: {
            ticketBalance: true,
          },
        });

        if (grantsFitnessTicket) {
          await tx.lotteryTicketLedger.create({
            data: {
              userId: user.id,
              teamId: user.teamId,
              dayKey: todayDayKey,
              delta: 1,
              balanceAfter: updatedUser.ticketBalance,
              reason: FITNESS_PUNCH_TICKET_GRANT_REASON,
              sourceType: FITNESS_PUNCH_SOURCE_TYPE,
              sourceId: punch.id,
              metadataJson: JSON.stringify({
                punchRecordId: punch.id,
                dayKey: todayDayKey,
                punchType: punch.punchType,
              }),
              createdAt: now,
            },
          });
        }

        await tx.activityEvent.create({
          data: {
            teamId: user.teamId,
            userId: user.id,
            type: ACTIVITY_EVENT_TYPES.PUNCH,
            message: buildPunchActivityMessage(
              user.username,
              boostSettlement.assetAwarded,
              boostSettlement.boostLabel,
            ),
            assetAwarded: boostSettlement.assetAwarded,
            createdAt: now,
          },
        });

        if (activeSeason) {
          const existingStat = await tx.seasonMemberStat.findUnique({
            where: {
              seasonId_userId: {
                seasonId: activeSeason.id,
                userId: user.id,
              },
            },
            select: {
              firstContributionAt: true,
            },
          });

          if (existingStat) {
            await tx.seasonMemberStat.update({
              where: {
                seasonId_userId: {
                  seasonId: activeSeason.id,
                  userId: user.id,
                },
              },
              data: {
                seasonIncome: {
                  increment: boostSettlement.seasonContributionAwarded,
                },
                ...(countsForSeasonSlot
                  ? {
                      slotContribution: {
                        increment: 1,
                      },
                      ...(existingStat.firstContributionAt ? {} : { firstContributionAt: now }),
                    }
                  : {}),
              },
            });
          } else {
            await tx.seasonMemberStat.create({
              data: {
                seasonId: activeSeason.id,
                userId: user.id,
                seasonIncome: boostSettlement.seasonContributionAwarded,
                slotContribution: countsForSeasonSlot ? 1 : 0,
                colorIndex: memberOrder,
                memberOrder,
                firstContributionAt: countsForSeasonSlot ? now : null,
              },
            });
          }

        }
      });
    } catch (error) {
      if (isPunchConflictError(error)) {
        return NextResponse.json({ error: "duplicate-punch" }, { status: 409 });
      }

      throw error;
    }

    const dynamicsToCreate: Promise<unknown>[] = [];

    if (STREAK_MILESTONES.has(nextStreak)) {
      dynamicsToCreate.push(
        createOrReuseTeamDynamic({
          teamId: user.teamId,
          actorUserId: user.id,
          type: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE,
          title: `${user.username} 连续打卡 ${nextStreak} 天`,
          summary: `${user.username} 把连签推进到了第 ${nextStreak} 天`,
          payload: {
            userId: user.id,
            username: user.username,
            streak: nextStreak,
          },
          sourceType: "streak",
          sourceId: `${user.id}:${nextStreak}:${todayDayKey}`,
          occurredAt: now,
        }),
      );
    }

    const todayPunchCount = await prisma.punchRecord.count({
      where: {
        userId: { in: teamMemberIds },
        dayKey: todayDayKey,
        punched: true,
      },
    });

    if (todayPunchCount === teamMemberCount) {
      dynamicsToCreate.push(
        createOrReuseTeamDynamic({
          teamId: user.teamId,
          type: TEAM_DYNAMIC_TYPES.TEAM_FULL_ATTENDANCE,
          title: "今天全员完成打卡",
          summary: `${todayDayKey} 团队全勤，今天没有人掉队`,
          payload: {
            dayKey: todayDayKey,
            memberCount: teamMemberCount,
          },
          sourceType: "attendance",
          sourceId: todayDayKey,
          occurredAt: now,
        }),
      );
    }

    if (
      activeSeason &&
      recordCountedForSeasonSlot &&
      nextFilledSlots === activeSeason.targetSlots
    ) {
      dynamicsToCreate.push(
        createOrReuseTeamDynamic({
          teamId: user.teamId,
          type: TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED,
          title: `赛季目标已达成：${activeSeason.goalName}`,
          summary: `${activeSeason.goalName} 冲到 ${activeSeason.targetSlots}/${activeSeason.targetSlots}`,
          payload: {
            seasonId: activeSeason.id,
            goalName: activeSeason.goalName,
            filledSlots: activeSeason.targetSlots,
            targetSlots: activeSeason.targetSlots,
          },
          sourceType: "season-target",
          sourceId: activeSeason.id,
          occurredAt: now,
        }),
      );
    }

    if (dynamicsToCreate.length > 0) {
      await Promise.all(dynamicsToCreate);
    }

    const pushTasks: Promise<unknown>[] = [];

    pushTasks.push(
      pushStreakMilestoneIfNeeded({
        teamId: user.teamId,
        userId: user.id,
        username: user.username,
        streak: nextStreak,
        dayKey: todayDayKey,
      }),
    );

    if (todayPunchCount === teamMemberCount) {
      pushTasks.push(
        pushFullTeamAttendanceIfNeeded({
          teamId: user.teamId,
          dayKey: todayDayKey,
        }),
      );
    }

    if (
      activeSeason &&
      recordCountedForSeasonSlot &&
      nextFilledSlots === activeSeason.targetSlots
    ) {
      pushTasks.push(
        pushSeasonTargetReachedIfNeeded({
          teamId: user.teamId,
          seasonId: activeSeason.id,
          goalName: activeSeason.goalName,
        }),
      );
    }

    if (pushTasks.length > 0) {
      await Promise.allSettled(pushTasks);
    }

    return buildSnapshotResponse(user.id, now);
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        teamId: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "user-not-found" }, { status: 401 });
    }

    const now = new Date();
    const todayDayKey = getShanghaiDayKey(now);

    try {
      await prisma.$transaction(async (tx) => {
        const todayPunch = await tx.punchRecord.findUnique({
          where: {
            userId_dayKey: {
              userId: user.id,
              dayKey: todayDayKey,
            },
          },
          select: {
            id: true,
            seasonId: true,
            assetAwarded: true,
            seasonContributionAwarded: true,
            boostItemUseRecordId: true,
            boostSummaryJson: true,
            countedForSeasonSlot: true,
            punched: true,
            punchType: true,
          },
        });

        if (!todayPunch) {
          throw new TodayPunchNotFoundError();
        }

        const grantLedger = shouldGrantFitnessPunchTicket(todayPunch)
          ? await tx.lotteryTicketLedger.findFirst({
              where: {
                userId: user.id,
                dayKey: todayDayKey,
                reason: FITNESS_PUNCH_TICKET_GRANT_REASON,
                sourceType: FITNESS_PUNCH_SOURCE_TYPE,
                sourceId: todayPunch.id,
              },
              select: {
                id: true,
              },
            })
          : null;

        const revokeLedger = grantLedger
          ? await tx.lotteryTicketLedger.findFirst({
              where: {
                userId: user.id,
                dayKey: todayDayKey,
                reason: FITNESS_PUNCH_TICKET_REVOKE_REASON,
                sourceType: FITNESS_PUNCH_REVERSAL_SOURCE_TYPE,
                sourceId: todayPunch.id,
              },
              select: {
                id: true,
              },
            })
          : null;

        if (grantLedger && !revokeLedger) {
          const ticketUser = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { ticketBalance: true },
          });

          if (ticketUser.ticketBalance < 1) {
            throw new FitnessTicketAlreadySpentError();
          }

          const balanceAfter = ticketUser.ticketBalance - 1;

          await tx.lotteryTicketLedger.create({
            data: {
              userId: user.id,
              teamId: user.teamId,
              dayKey: todayDayKey,
              delta: -1,
              balanceAfter,
              reason: FITNESS_PUNCH_TICKET_REVOKE_REASON,
              sourceType: FITNESS_PUNCH_REVERSAL_SOURCE_TYPE,
              sourceId: todayPunch.id,
              metadataJson: JSON.stringify({
                punchRecordId: todayPunch.id,
                grantLedgerId: grantLedger.id,
                dayKey: todayDayKey,
              }),
              createdAt: now,
            },
          });

          await tx.user.update({
            where: { id: user.id },
            data: {
              ticketBalance: balanceAfter,
            },
          });
        }

        const previousPunch = await tx.punchRecord.findFirst({
          where: {
            userId: user.id,
            dayKey: {
              lt: todayDayKey,
            },
          },
          orderBy: [{ dayKey: "desc" }, { createdAt: "desc" }],
          select: {
            dayKey: true,
            streakAfterPunch: true,
          },
        });

        const seasonRollbackAmount =
          todayPunch.seasonContributionAwarded > 0
            ? todayPunch.seasonContributionAwarded
            : todayPunch.assetAwarded;
        const consumedBoostLabel = todayPunch.boostSummaryJson
          ? (JSON.parse(todayPunch.boostSummaryJson) as { boostLabel?: string | null }).boostLabel
          : null;

        await tx.punchRecord.delete({
          where: { id: todayPunch.id },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            coins: {
              decrement: todayPunch.assetAwarded,
            },
            currentStreak: previousPunch?.streakAfterPunch ?? 0,
            lastPunchDayKey: previousPunch?.dayKey ?? null,
          },
        });

        await tx.activityEvent.create({
          data: {
            teamId: user.teamId,
            userId: user.id,
            type: ACTIVITY_EVENT_TYPES.UNDO_PUNCH,
            message: buildUndoPunchActivityMessage(user.username, consumedBoostLabel),
            assetAwarded: null,
            createdAt: now,
          },
        });

        if (todayPunch.seasonId) {
          const stat = await tx.seasonMemberStat.findUnique({
            where: {
              seasonId_userId: {
                seasonId: todayPunch.seasonId,
                userId: user.id,
              },
            },
            select: {
              slotContribution: true,
            },
          });

          if (stat) {
            await tx.seasonMemberStat.update({
              where: {
                seasonId_userId: {
                  seasonId: todayPunch.seasonId,
                  userId: user.id,
                },
              },
              data: {
                seasonIncome: {
                  decrement: seasonRollbackAmount,
                },
                ...(todayPunch.countedForSeasonSlot
                  ? {
                      slotContribution: {
                        decrement: 1,
                      },
                      ...(stat.slotContribution <= 1 ? { firstContributionAt: null } : {}),
                    }
                  : {}),
              },
            });
          }

          if (todayPunch.countedForSeasonSlot) {
            await tx.season.updateMany({
              where: {
                id: todayPunch.seasonId,
                filledSlots: {
                  gt: 0,
                },
              },
              data: {
                filledSlots: {
                  decrement: 1,
                },
              },
            });
          }
        }
      });
    } catch (error) {
      if (
        error instanceof TodayPunchNotFoundError ||
        error instanceof FitnessTicketAlreadySpentError
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      throw error;
    }

    return buildSnapshotResponse(user.id, now);
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
