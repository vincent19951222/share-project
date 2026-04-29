import { getShanghaiDayKey } from "@/lib/economy";
import {
  getGamificationDimensions,
  getItemDefinition,
  getTaskCards,
} from "@/lib/gamification/content";
import { prisma } from "@/lib/prisma";
import type {
  GamificationBackpackItemSummary,
  GamificationDimensionSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";

export async function buildGamificationStateForUser(
  userId: string,
  now: Date = new Date(),
): Promise<GamificationStateSnapshot | null> {
  const dayKey = getShanghaiDayKey(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      teamId: true,
      ticketBalance: true,
      dailyTaskAssignments: {
        where: { dayKey },
        select: {
          id: true,
          dimensionKey: true,
          taskCardId: true,
          completedAt: true,
        },
      },
      lotteryTicketLedgers: {
        where: { dayKey },
        select: {
          delta: true,
          reason: true,
        },
      },
      inventoryItems: {
        where: {
          quantity: { gt: 0 },
        },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: {
          itemId: true,
          quantity: true,
        },
      },
      lotteryDraws: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          drawType: true,
          ticketSpent: true,
          coinSpent: true,
          createdAt: true,
          results: {
            orderBy: { position: "asc" },
            select: {
              rewardId: true,
              rewardTier: true,
              rewardKind: true,
            },
          },
        },
      },
      sentSocialInvitations: {
        where: {
          dayKey,
          status: "PENDING",
        },
        select: { id: true },
      },
      receivedSocialInvitations: {
        where: {
          dayKey,
          status: "PENDING",
        },
        select: { id: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const taskCardsById = new Map(getTaskCards().map((card) => [card.id, card]));
  const assignmentsByDimension = new Map(
    user.dailyTaskAssignments.map((assignment) => [assignment.dimensionKey, assignment]),
  );

  const dimensions: GamificationDimensionSnapshot[] = getGamificationDimensions().map(
    (dimension) => {
      const assignment = assignmentsByDimension.get(dimension.key);
      const taskCard = assignment ? taskCardsById.get(assignment.taskCardId) : null;

      return {
        key: dimension.key,
        title: dimension.title,
        subtitle: dimension.subtitle,
        description: dimension.description,
        assignment: assignment
          ? {
              id: assignment.id,
              taskCardId: assignment.taskCardId,
              title: taskCard?.title ?? "未知任务",
              description: taskCard?.description ?? "这张任务卡已经不在本地配置中。",
              status: assignment.completedAt ? "completed" : "pending",
              completedAt: assignment.completedAt?.toISOString() ?? null,
            }
          : null,
      };
    },
  );

  const todayEarned = user.lotteryTicketLedgers
    .filter((ledger) => ledger.delta > 0)
    .reduce((sum, ledger) => sum + ledger.delta, 0);
  const todaySpent = user.lotteryTicketLedgers
    .filter((ledger) => ledger.delta < 0)
    .reduce((sum, ledger) => sum + Math.abs(ledger.delta), 0);

  const previewItems: GamificationBackpackItemSummary[] = user.inventoryItems.map((item) => {
    const definition = getItemDefinition(item.itemId);

    return {
      itemId: item.itemId,
      name: definition?.name ?? item.itemId,
      quantity: item.quantity,
      category: definition?.category ?? "unknown",
    };
  });

  return {
    currentUserId: user.id,
    teamId: user.teamId,
    dayKey,
    ticketBalance: user.ticketBalance,
    dimensions,
    ticketSummary: {
      maxFreeTicketsToday: 2,
      todayEarned,
      todaySpent,
      lifeTicketEarned: user.lotteryTicketLedgers.some(
        (ledger) => ledger.reason === "DAILY_TASKS_GRANTED",
      ),
      fitnessTicketEarned: user.lotteryTicketLedgers.some(
        (ledger) => ledger.reason === "FITNESS_PUNCH_GRANTED",
      ),
    },
    lottery: {
      status: "placeholder",
      singleDrawEnabled: false,
      tenDrawEnabled: false,
      message: "抽奖机正在搬进办公室，GM-06 开放。",
      recentDraws: user.lotteryDraws.map((draw) => ({
        id: draw.id,
        drawType: draw.drawType,
        ticketSpent: draw.ticketSpent,
        coinSpent: draw.coinSpent,
        createdAt: draw.createdAt.toISOString(),
        rewards: draw.results.map((result) => ({
          rewardId: result.rewardId,
          rewardTier: result.rewardTier,
          rewardKind: result.rewardKind,
        })),
      })),
    },
    backpack: {
      totalQuantity: user.inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
      previewItems,
      emptyMessage: "背包空空，等抽奖机上线后再来进货。",
    },
    social: {
      status: "placeholder",
      pendingSentCount: user.sentSocialInvitations.length,
      pendingReceivedCount: user.receivedSocialInvitations.length,
      message: "点名喝水、出门溜达等弱社交道具将在 GM-12 开放。",
    },
  };
}
