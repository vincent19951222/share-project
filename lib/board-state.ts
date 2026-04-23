import { prisma } from "@/lib/prisma";
import type { BoardSnapshot, CellStatus } from "@/lib/types";
import {
  getUpcomingPunchRewardPreview,
  getShanghaiDayKey,
} from "@/lib/economy";

export const BOARD_TOTAL_DAYS = 30;
export const BOARD_TARGET_COINS = 2000;
export const PUNCH_REWARD_COINS = 15;

export function getCurrentBoardDay(now: Date = new Date()): number {
  const dayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    day: "numeric",
  }).format(now);

  const day = Number(dayText);
  return Math.max(1, Math.min(day, BOARD_TOTAL_DAYS));
}

export async function buildBoardSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<BoardSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            include: {
              punchRecords: {
                select: {
                  dayIndex: true,
                  dayKey: true,
                  punched: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          seasons: {
            where: { status: "ACTIVE" },
            orderBy: { startedAt: "desc" },
            take: 1,
            include: {
              memberStats: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      avatarKey: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const today = getCurrentBoardDay(now);
  const todayDayKey = getShanghaiDayKey(now);
  const activeSeason = user.team.seasons[0] ?? null;
  const statsByUserId = new Map(
    activeSeason?.memberStats.map((stat) => [stat.userId, stat]) ?? [],
  );

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
    assetBalance: member.coins,
    seasonIncome: statsByUserId.get(member.id)?.seasonIncome ?? 0,
    slotContribution: statsByUserId.get(member.id)?.slotContribution ?? 0,
  }));

  const gridData: CellStatus[][] = user.team.users.map((member) => {
    return Array.from({ length: BOARD_TOTAL_DAYS }, (_, index) => {
      const dayIndex = index + 1;

      if (dayIndex > today) {
        return null;
      }

      const record = member.punchRecords.find(
        (item) => item.dayIndex === dayIndex,
      );
      return record ? record.punched : false;
    });
  });

  const currentUserSeasonStats = statsByUserId.get(user.id);
  const currentReward = getUpcomingPunchRewardPreview(
    user.currentStreak,
    user.lastPunchDayKey,
    todayDayKey,
  );

  const activeSeasonSnapshot = activeSeason
    ? {
        id: activeSeason.id,
        monthKey: activeSeason.monthKey,
        goalName: activeSeason.goalName,
        targetSlots: activeSeason.targetSlots,
        filledSlots: Math.min(activeSeason.filledSlots, activeSeason.targetSlots),
        contributions: user.team.users
          .map((member, index) => {
            const stat = statsByUserId.get(member.id);
            const memberOrder = stat?.memberOrder ?? index;

            return {
              userId: member.id,
              name: member.username,
              avatarKey: member.avatarKey,
              colorIndex: stat?.colorIndex ?? index,
              slotContribution: stat?.slotContribution ?? 0,
              seasonIncome: stat?.seasonIncome ?? 0,
              memberOrder,
            };
          })
          .sort(
            (left, right) =>
              right.slotContribution - left.slotContribution ||
              left.memberOrder - right.memberOrder,
          )
          .map(({ memberOrder: _memberOrder, ...contribution }) => contribution),
      }
    : null;

  return {
    members,
    gridData,
    teamVaultTotal: user.team.users.reduce(
      (sum, member) => sum + member.coins,
      0,
    ),
    currentUser: {
      assetBalance: user.coins,
      currentStreak: user.currentStreak,
      nextReward: currentReward,
      seasonIncome: currentUserSeasonStats?.seasonIncome ?? 0,
      isAdmin: user.role === "ADMIN",
    },
    activeSeason: activeSeasonSnapshot,
    today,
    totalDays: BOARD_TOTAL_DAYS,
    currentUserId: user.id,
  };
}
