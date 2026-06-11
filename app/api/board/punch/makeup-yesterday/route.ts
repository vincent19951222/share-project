import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCookieValue } from "@/lib/auth";
import { ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";
import {
  getNextPunchRewardPreview,
  getNextPunchStreak,
  getShanghaiDayKey,
} from "@/lib/economy";
import { createDefaultWorkoutForPunch } from "@/lib/workouts";

class MakeupNotAllowedError extends Error {
  constructor(message = "makeup-not-allowed") {
    super(message);
    this.name = "MakeupNotAllowedError";
  }
}

class DuplicatePunchError extends Error {
  constructor() {
    super("duplicate-punch");
    this.name = "DuplicatePunchError";
  }
}

function isPunchConflictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }

  return error instanceof Error && error.message.toLowerCase().includes("database is locked");
}

function shiftDateByDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

function signedIntUpdate(delta: number) {
  if (delta > 0) {
    return { increment: delta };
  }

  if (delta < 0) {
    return { decrement: Math.abs(delta) };
  }

  return undefined;
}

async function buildSnapshotResponse(userId: string, now: Date) {
  const snapshot = await buildBoardSnapshotForUser(userId, now);

  if (!snapshot) {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
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
    const todayDayKey = getShanghaiDayKey(now);
    const yesterdayDate = shiftDateByDays(now, -1);
    const yesterdayDayKey = getShanghaiDayKey(yesterdayDate);
    const todayMonthKey = monthKeyOf(todayDayKey);
    const yesterdayMonthKey = monthKeyOf(yesterdayDayKey);

    if (todayMonthKey !== yesterdayMonthKey) {
      return NextResponse.json({ error: "makeup-not-allowed" }, { status: 409 });
    }

    const activeSeason = user.team.seasons[0] ?? null;

    if (!activeSeason || activeSeason.monthKey !== yesterdayMonthKey) {
      return NextResponse.json({ error: "makeup-not-allowed" }, { status: 409 });
    }

    const yesterdayDayIndex = getCurrentBoardDay(yesterdayDate);
    const memberOrder = Math.max(
      user.team.users.findIndex((member) => member.id === user.id),
      0,
    );

    try {
      await prisma.$transaction(async (tx) => {
        const seasonForLedger = await tx.season.findUnique({
          where: { id: activeSeason.id },
          select: {
            id: true,
            status: true,
            monthKey: true,
            targetSlots: true,
            filledSlots: true,
          },
        });

        if (
          !seasonForLedger ||
          seasonForLedger.status !== "ACTIVE" ||
          seasonForLedger.monthKey !== yesterdayMonthKey
        ) {
          throw new MakeupNotAllowedError();
        }

        const yesterdayPunch = await tx.punchRecord.findUnique({
          where: {
            userId_dayKey: {
              userId: user.id,
              dayKey: yesterdayDayKey,
            },
          },
          select: { id: true },
        });

        if (yesterdayPunch) {
          throw new DuplicatePunchError();
        }

        const previousPunch = await tx.punchRecord.findFirst({
          where: {
            userId: user.id,
            dayKey: { lt: yesterdayDayKey },
            punched: true,
          },
          orderBy: [{ dayKey: "desc" }, { createdAt: "desc" }],
          select: {
            dayKey: true,
            streakAfterPunch: true,
          },
        });

        const previousStreak = previousPunch?.streakAfterPunch ?? 0;
        const previousDayKey = previousPunch?.dayKey ?? null;
        const yesterdayStreak = getNextPunchStreak(
          previousStreak,
          previousDayKey,
          yesterdayDayKey,
        );
        const yesterdayReward = getNextPunchRewardPreview(
          previousStreak,
          previousDayKey,
          yesterdayDayKey,
        );

        const seasonUpdate = await tx.season.updateMany({
          where: {
            id: seasonForLedger.id,
            status: "ACTIVE",
            filledSlots: { lt: seasonForLedger.targetSlots },
          },
          data: {
            filledSlots: { increment: 1 },
          },
        });
        let countsForSeasonSlot = seasonUpdate.count === 1;

        if (!countsForSeasonSlot && seasonForLedger.filledSlots < seasonForLedger.targetSlots) {
          const currentSeason = await tx.season.findUnique({
            where: { id: seasonForLedger.id },
            select: {
              status: true,
              monthKey: true,
            },
          });

          if (
            !currentSeason ||
            currentSeason.status !== "ACTIVE" ||
            currentSeason.monthKey !== yesterdayMonthKey
          ) {
            throw new MakeupNotAllowedError();
          }
        }

        const punch = await tx.punchRecord.create({
          data: {
            userId: user.id,
            seasonId: seasonForLedger.id,
            dayIndex: yesterdayDayIndex,
            dayKey: yesterdayDayKey,
            punched: true,
            punchType: "makeup-yesterday",
            streakAfterPunch: yesterdayStreak,
            assetAwarded: yesterdayReward,
            countedForSeasonSlot: countsForSeasonSlot,
          },
        });

        await createDefaultWorkoutForPunch({
          tx,
          userId: user.id,
          teamId: user.teamId,
          punchRecordId: punch.id,
          dayKey: yesterdayDayKey,
        });

        const existingStat = await tx.seasonMemberStat.findUnique({
          where: {
            seasonId_userId: {
              seasonId: seasonForLedger.id,
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
                seasonId: seasonForLedger.id,
                userId: user.id,
              },
            },
            data: {
              seasonIncome: { increment: yesterdayReward },
              ...(countsForSeasonSlot
                ? {
                    slotContribution: { increment: 1 },
                    ...(existingStat.firstContributionAt ? {} : { firstContributionAt: now }),
                  }
                : {}),
            },
          });
        } else {
          await tx.seasonMemberStat.create({
            data: {
              seasonId: seasonForLedger.id,
              userId: user.id,
              seasonIncome: yesterdayReward,
              slotContribution: countsForSeasonSlot ? 1 : 0,
              colorIndex: memberOrder,
              memberOrder,
              firstContributionAt: countsForSeasonSlot ? now : null,
            },
          });
        }

        let userCoinDelta = yesterdayReward;
        let nextCurrentStreak = yesterdayStreak;
        let nextLastPunchDayKey = yesterdayDayKey;

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

        if (todayPunch) {
          const repairedTodayStreak = getNextPunchStreak(
            yesterdayStreak,
            yesterdayDayKey,
            todayDayKey,
          );
          const repairedTodayReward = getNextPunchRewardPreview(
            yesterdayStreak,
            yesterdayDayKey,
            todayDayKey,
          );
          const todayRewardDelta = repairedTodayReward - todayPunch.assetAwarded;

          await tx.punchRecord.update({
            where: { id: todayPunch.id },
            data: {
              streakAfterPunch: repairedTodayStreak,
              assetAwarded: repairedTodayReward,
            },
          });

          const seasonIncomeDelta = signedIntUpdate(todayRewardDelta);

          if (todayPunch.seasonId === seasonForLedger.id && seasonIncomeDelta) {
            await tx.seasonMemberStat.update({
              where: {
                seasonId_userId: {
                  seasonId: seasonForLedger.id,
                  userId: user.id,
                },
              },
              data: {
                seasonIncome: seasonIncomeDelta,
              },
            });
          }

          userCoinDelta += todayRewardDelta;
          nextCurrentStreak = repairedTodayStreak;
          nextLastPunchDayKey = todayDayKey;
        }

        const coinDelta = signedIntUpdate(userCoinDelta);

        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(coinDelta ? { coins: coinDelta } : {}),
            currentStreak: nextCurrentStreak,
            lastPunchDayKey: nextLastPunchDayKey,
          },
        });

        await tx.activityEvent.create({
          data: {
            teamId: user.teamId,
            userId: user.id,
            type: ACTIVITY_EVENT_TYPES.PUNCH,
            message: `${user.username} 补签了昨天的健身打卡，拿了 ${yesterdayReward} 银子`,
            assetAwarded: yesterdayReward,
            createdAt: now,
          },
        });
      });
    } catch (error) {
      if (error instanceof MakeupNotAllowedError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      if (error instanceof DuplicatePunchError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

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
