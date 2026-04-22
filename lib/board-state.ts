import { prisma } from "@/lib/prisma";
import type { BoardSnapshot, CellStatus } from "@/lib/types";

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
              punchRecords: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const today = getCurrentBoardDay(now);

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
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

  return {
    members,
    gridData,
    teamCoins: user.team.users.reduce(
      (sum, member) => sum + member.coins,
      0,
    ),
    targetCoins: BOARD_TARGET_COINS,
    today,
    totalDays: BOARD_TOTAL_DAYS,
    currentUserId: user.id,
  };
}
