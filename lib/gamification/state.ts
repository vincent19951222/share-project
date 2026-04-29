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
  GamificationLotteryDrawSnapshot,
  GamificationLotteryRewardSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";

const LOTTERY_TICKET_PRICE = 40;
const DAILY_TOP_UP_LIMIT = 3;
const TEN_DRAW_SIZE = 10;
const TEN_DRAW_MIN_OWNED_TICKETS = 7;

function parseLotteryRewardSnapshot(raw: string): GamificationLotteryRewardSnapshot {
  try {
    const reward = JSON.parse(raw) as {
      id?: string;
      tier?: string;
      kind?: string;
      name?: string;
      description?: string;
      effectSummary?: string;
    };

    return {
      rewardId: reward.id ?? "unknown",
      rewardTier: reward.tier ?? "unknown",
      rewardKind: reward.kind ?? "unknown",
      name: reward.name ?? "未知奖励",
      description: reward.description ?? "历史奖励快照缺少描述。",
      effectSummary: reward.effectSummary ?? reward.description ?? "未知奖励",
    };
  } catch {
    return {
      rewardId: "unknown",
      rewardTier: "unknown",
      rewardKind: "unknown",
      name: "未知奖励",
      description: "历史奖励快照解析失败。",
      effectSummary: "未知奖励",
    };
  }
}

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
      coins: true,
      ticketBalance: true,
      dailyTaskAssignments: {
        where: { dayKey },
        select: {
          id: true,
          dimensionKey: true,
          taskCardId: true,
          completionText: true,
          rerollCount: true,
          completedAt: true,
        },
      },
      lotteryTicketLedgers: {
        where: { dayKey },
        select: {
          delta: true,
          reason: true,
          sourceType: true,
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
          guaranteeApplied: true,
          createdAt: true,
          results: {
            orderBy: { position: "asc" },
            select: {
              rewardId: true,
              rewardTier: true,
              rewardKind: true,
              rewardSnapshotJson: true,
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
              completionText: assignment.completionText ?? null,
              rerollCount: assignment.rerollCount,
              rerollLimit: 1,
              canComplete: !assignment.completedAt,
              canReroll: !assignment.completedAt && assignment.rerollCount < 1,
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
  const taskCompletedCount = dimensions.filter(
    (dimension) => dimension.assignment?.status === "completed",
  ).length;
  const lifeTicketEarned = user.lotteryTicketLedgers.some(
    (ledger) => ledger.reason === "DAILY_TASKS_GRANTED",
  );
  const dailyTopUpPurchased = user.lotteryTicketLedgers
    .filter(
      (ledger) =>
        ledger.reason === "COIN_PURCHASE_GRANTED" && ledger.sourceType === "lottery_topup",
    )
    .reduce((sum, ledger) => sum + Math.max(0, ledger.delta), 0);
  const tenDrawTopUpRequired = Math.max(0, TEN_DRAW_SIZE - user.ticketBalance);
  const tenDrawTopUpCoinCost = tenDrawTopUpRequired * LOTTERY_TICKET_PRICE;
  const tenDrawCanTopUp =
    user.ticketBalance >= TEN_DRAW_MIN_OWNED_TICKETS &&
    user.ticketBalance < TEN_DRAW_SIZE &&
    dailyTopUpPurchased + tenDrawTopUpRequired <= DAILY_TOP_UP_LIMIT &&
    user.coins >= tenDrawTopUpCoinCost;

  const previewItems: GamificationBackpackItemSummary[] = user.inventoryItems.map((item) => {
    const definition = getItemDefinition(item.itemId);

    return {
      itemId: item.itemId,
      name: definition?.name ?? item.itemId,
      quantity: item.quantity,
      category: definition?.category ?? "unknown",
    };
  });

  const recentDraws: GamificationLotteryDrawSnapshot[] = user.lotteryDraws.map((draw) => ({
    id: draw.id,
    drawType: draw.drawType as "SINGLE" | "TEN",
    ticketSpent: draw.ticketSpent,
    coinSpent: draw.coinSpent,
    guaranteeApplied: draw.guaranteeApplied,
    createdAt: draw.createdAt.toISOString(),
    rewards: draw.results.map((result) =>
      parseLotteryRewardSnapshot(result.rewardSnapshotJson),
    ),
  }));

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
      lifeTicketEarned,
      fitnessTicketEarned: user.lotteryTicketLedgers.some(
        (ledger) => ledger.reason === "FITNESS_PUNCH_GRANTED",
      ),
      taskCompletedCount,
      lifeTicketClaimable: taskCompletedCount === 4 && !lifeTicketEarned,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: user.ticketBalance >= 1,
      tenDrawEnabled: user.ticketBalance >= TEN_DRAW_SIZE || tenDrawCanTopUp,
      tenDrawTopUpRequired,
      tenDrawTopUpCoinCost,
      dailyTopUpPurchased,
      dailyTopUpLimit: DAILY_TOP_UP_LIMIT,
      ticketPrice: LOTTERY_TICKET_PRICE,
      message:
        user.ticketBalance >= TEN_DRAW_SIZE
          ? "十连抽已就绪。"
          : tenDrawCanTopUp
            ? `还差 ${tenDrawTopUpRequired} 张券，可用 ${tenDrawTopUpCoinCost} 银子补齐十连。`
            : "攒到 7 张券后，可以用银子补齐十连。",
      recentDraws,
    },
    backpack: {
      totalQuantity: user.inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
      previewItems,
      emptyMessage: "背包空空，等抽奖机上线上后再来进货。",
    },
    social: {
      status: "placeholder",
      pendingSentCount: user.sentSocialInvitations.length,
      pendingReceivedCount: user.receivedSocialInvitations.length,
      message: "点名喝水、出门溜达等弱社交道具将在 GM-12 开放。",
    },
  };
}
