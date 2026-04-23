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
  getNextPunchRewardPreview,
  getNextPunchStreak,
  getShanghaiDayKey,
} from "@/lib/economy";

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
    const nextStreak = getNextPunchStreak(
      user.currentStreak,
      user.lastPunchDayKey,
      todayDayKey,
    );
    const reward = getNextPunchRewardPreview(
      user.currentStreak,
      user.lastPunchDayKey,
      todayDayKey,
    );
    const activeSeason = user.team.seasons[0] ?? null;
    const memberOrder = Math.max(
      user.team.users.findIndex((member) => member.id === user.id),
      0,
    );

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
        }

        await tx.punchRecord.create({
          data: {
            userId: user.id,
            seasonId: activeSeason?.id ?? null,
            dayIndex: today,
            dayKey: todayDayKey,
            punched: true,
            punchType: "default",
            streakAfterPunch: nextStreak,
            assetAwarded: reward,
            countedForSeasonSlot: countsForSeasonSlot,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            coins: {
              increment: reward,
            },
            currentStreak: nextStreak,
            lastPunchDayKey: todayDayKey,
          },
        });

        await tx.activityEvent.create({
          data: {
            teamId: user.teamId,
            userId: user.id,
            type: ACTIVITY_EVENT_TYPES.PUNCH,
            message: buildPunchActivityMessage(user.username, reward),
            assetAwarded: reward,
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
                  increment: reward,
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
                seasonIncome: reward,
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
            countedForSeasonSlot: true,
          },
        });

        if (!todayPunch) {
          throw new TodayPunchNotFoundError();
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
            message: buildUndoPunchActivityMessage(user.username),
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
                  decrement: todayPunch.assetAwarded,
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
      if (error instanceof TodayPunchNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      throw error;
    }

    return buildSnapshotResponse(user.id, now);
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
