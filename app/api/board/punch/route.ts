import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";
import {
  getNextPunchRewardPreview,
  getNextPunchStreak,
  getShanghaiDayKey,
} from "@/lib/economy";

function isPunchConflictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }

  return error instanceof Error && error.message.toLowerCase().includes("database is locked");
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

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
            countedForSeasonSlot: activeSeason !== null,
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
                slotContribution: {
                  increment: 1,
                },
                ...(existingStat.firstContributionAt ? {} : { firstContributionAt: now }),
              },
            });
          } else {
            await tx.seasonMemberStat.create({
              data: {
                seasonId: activeSeason.id,
                userId: user.id,
                seasonIncome: reward,
                slotContribution: 1,
                colorIndex: memberOrder,
                memberOrder,
                firstContributionAt: now,
              },
            });
          }

          await tx.season.updateMany({
            where: {
              id: activeSeason.id,
              filledSlots: { lt: activeSeason.targetSlots },
            },
            data: {
              filledSlots: {
                increment: 1,
              },
            },
          });
        }
      });
    } catch (error) {
      if (isPunchConflictError(error)) {
        return NextResponse.json({ error: "duplicate-punch" }, { status: 409 });
      }

      throw error;
    }

    const snapshot = await buildBoardSnapshotForUser(user.id, now);

    if (!snapshot) {
      return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
