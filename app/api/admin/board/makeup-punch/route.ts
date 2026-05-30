import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

const ADMIN_MAKEUP_REWARD = 10;
const SHANGHAI_DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class AdminMakeupError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminMakeupError";
  }
}

function isPunchConflictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }

  return error instanceof Error && error.message.toLowerCase().includes("database is locked");
}

function isValidShanghaiDayKey(dayKey: string): boolean {
  if (!SHANGHAI_DAY_KEY_PATTERN.test(dayKey)) {
    return false;
  }

  const [yearText, monthText, dayText] = dayKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(0, month - 1, day, 0, 0, 0));

  candidate.setUTCFullYear(year);

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function readStringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
    const admin = await loadCurrentUser(request.cookies);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const targetUserId = readStringField(body as Record<string, unknown>, "targetUserId");
    const dayKey = readStringField(body as Record<string, unknown>, "dayKey");

    if (!targetUserId || !dayKey || !isValidShanghaiDayKey(dayKey)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const now = new Date();
    const todayDayKey = getShanghaiDayKey(now);
    const currentMonthKey = todayDayKey.slice(0, 7);

    if (!dayKey.startsWith(`${currentMonthKey}-`) || dayKey >= todayDayKey) {
      return NextResponse.json({ error: "makeup-not-allowed" }, { status: 409 });
    }

    const [target, teamUsers, activeSeason] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: targetUserId,
          teamId: admin.teamId,
        },
        select: {
          id: true,
          username: true,
          teamId: true,
        },
      }),
      prisma.user.findMany({
        where: { teamId: admin.teamId },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.season.findFirst({
        where: {
          teamId: admin.teamId,
          status: "ACTIVE",
          monthKey: currentMonthKey,
        },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
        },
      }),
    ]);

    if (!target) {
      return NextResponse.json({ error: "target-user-not-found" }, { status: 404 });
    }

    const memberOrder = Math.max(
      teamUsers.findIndex((member) => member.id === target.id),
      0,
    );
    const makeupDate = new Date(`${dayKey}T00:00:00+08:00`);
    const dayIndex = getCurrentBoardDay(makeupDate);

    try {
      await prisma.$transaction(async (tx) => {
        const freshTarget = await tx.user.findFirst({
          where: {
            id: target.id,
            teamId: admin.teamId,
          },
          select: {
            id: true,
          },
        });

        if (!freshTarget) {
          throw new AdminMakeupError("target-user-not-found", 404);
        }

        const existingPunch = await tx.punchRecord.findUnique({
          where: {
            userId_dayKey: {
              userId: target.id,
              dayKey,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingPunch) {
          throw new AdminMakeupError("duplicate-punch", 409);
        }

        let seasonForLedger = activeSeason
          ? await tx.season.findUnique({
              where: { id: activeSeason.id },
              select: {
                id: true,
                status: true,
                monthKey: true,
                targetSlots: true,
                filledSlots: true,
              },
            })
          : null;

        if (
          seasonForLedger?.status !== "ACTIVE" ||
          seasonForLedger.monthKey !== currentMonthKey
        ) {
          seasonForLedger = null;
        }

        let countsForSeasonSlot = false;

        if (seasonForLedger) {
          const seasonUpdate = await tx.season.updateMany({
            where: {
              id: seasonForLedger.id,
              status: "ACTIVE",
              monthKey: currentMonthKey,
              filledSlots: {
                lt: seasonForLedger.targetSlots,
              },
            },
            data: {
              filledSlots: {
                increment: 1,
              },
            },
          });

          countsForSeasonSlot = seasonUpdate.count === 1;

          if (!countsForSeasonSlot && seasonForLedger.filledSlots < seasonForLedger.targetSlots) {
            const currentSeason = await tx.season.findUnique({
              where: { id: seasonForLedger.id },
              select: {
                status: true,
                monthKey: true,
              },
            });

            if (
              currentSeason?.status !== "ACTIVE" ||
              currentSeason.monthKey !== currentMonthKey
            ) {
              seasonForLedger = null;
            }
          }
        }

        const seasonContributionAwarded = seasonForLedger ? ADMIN_MAKEUP_REWARD : 0;
        const punch = await tx.punchRecord.create({
          data: {
            userId: target.id,
            seasonId: seasonForLedger?.id ?? null,
            dayIndex,
            dayKey,
            punched: true,
            punchType: "admin-makeup",
            streakAfterPunch: 0,
            assetAwarded: ADMIN_MAKEUP_REWARD,
            baseAssetAwarded: ADMIN_MAKEUP_REWARD,
            boostAssetBonus: 0,
            baseSeasonContribution: seasonContributionAwarded,
            boostSeasonBonus: 0,
            seasonContributionAwarded,
            countedForSeasonSlot: Boolean(seasonForLedger && countsForSeasonSlot),
          },
        });

        await tx.user.update({
          where: { id: target.id },
          data: {
            coins: {
              increment: ADMIN_MAKEUP_REWARD,
            },
          },
        });

        if (seasonForLedger) {
          const existingStat = await tx.seasonMemberStat.findUnique({
            where: {
              seasonId_userId: {
                seasonId: seasonForLedger.id,
                userId: target.id,
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
                  userId: target.id,
                },
              },
              data: {
                seasonIncome: {
                  increment: seasonContributionAwarded,
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
                seasonId: seasonForLedger.id,
                userId: target.id,
                seasonIncome: seasonContributionAwarded,
                slotContribution: countsForSeasonSlot ? 1 : 0,
                colorIndex: memberOrder,
                memberOrder,
                firstContributionAt: countsForSeasonSlot ? now : null,
              },
            });
          }
        }

        await tx.adminMakeupPunchLedger.create({
          data: {
            teamId: admin.teamId,
            adminUserId: admin.id,
            targetUserId: target.id,
            punchRecordId: punch.id,
            monthKey: currentMonthKey,
            dayKey,
            rewardAwarded: ADMIN_MAKEUP_REWARD,
            createdAt: now,
          },
        });

        await tx.activityEvent.create({
          data: {
            teamId: admin.teamId,
            userId: target.id,
            type: ACTIVITY_EVENT_TYPES.PUNCH,
            message: `${admin.username} 给 ${target.username} 补了 ${dayKey} 的健身打卡，拿了 ${ADMIN_MAKEUP_REWARD} 银子`,
            assetAwarded: ADMIN_MAKEUP_REWARD,
            createdAt: now,
          },
        });
      });
    } catch (error) {
      if (error instanceof AdminMakeupError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      if (isPunchConflictError(error)) {
        return NextResponse.json({ error: "duplicate-punch" }, { status: 409 });
      }

      throw error;
    }

    return buildSnapshotResponse(admin.id, now);
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
