import type { RewardDefinition } from "@/content/gamification/types";
import { getShanghaiDayKey } from "@/lib/economy";
import { getItemDefinition, getRewardDefinitions } from "@/lib/gamification/content";
import {
  buildRarePrizeDynamic,
  type GameTeamDynamicResult,
  safeCreateGameTeamDynamic,
  shouldHighlightLotteryReward,
} from "@/lib/gamification/team-dynamics";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { prisma } from "@/lib/prisma";
import type {
  GamificationLotteryDrawSnapshot,
  GamificationLotteryRewardSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";

export const LOTTERY_TICKET_PRICE = 40;
export const DAILY_TOP_UP_LIMIT = 10;
export const TEN_DRAW_SIZE = 10;
export const SINGLE_DRAW_SIZE = 1;

const GUARANTEE_ELIGIBLE_TIERS = new Set(["utility", "social", "rare"]);

export type LotteryDrawType = "SINGLE" | "TEN";

export class LotteryDrawError extends Error {
  readonly status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "LotteryDrawError";
    this.status = status;
  }
}

interface DrawLotteryInput {
  userId: string;
  drawType: LotteryDrawType;
  useCoinTopUp?: boolean;
  rng?: () => number;
  now?: Date;
}

interface DrawLotteryResult {
  snapshot: GamificationStateSnapshot;
  draw: GamificationLotteryDrawSnapshot;
  teamDynamics: GameTeamDynamicResult[];
}

function getEnabledRewards() {
  return getRewardDefinitions().filter((reward) => reward.enabled && reward.weight > 0);
}

export function getDirectCoinExpectedValue(rewards: RewardDefinition[] = getEnabledRewards()) {
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  return rewards.reduce((sum, reward) => {
    if (reward.effect.type !== "grant_coins") {
      return sum;
    }

    return sum + (reward.weight / totalWeight) * reward.effect.amount;
  }, 0);
}

function selectWeightedReward(rewards: RewardDefinition[], rng: () => number) {
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);

  if (totalWeight <= 0) {
    throw new LotteryDrawError("抽奖奖池为空", 500);
  }

  let cursor = Math.min(Math.max(rng(), 0), 0.999999) * totalWeight;

  for (const reward of rewards) {
    cursor -= reward.weight;
    if (cursor < 0) {
      return reward;
    }
  }

  return rewards[rewards.length - 1];
}

function applyTenDrawGuarantee(rewards: RewardDefinition[], rng: () => number) {
  if (rewards.some((reward) => GUARANTEE_ELIGIBLE_TIERS.has(reward.tier))) {
    return { rewards, guaranteeApplied: false };
  }

  const utilityRewards = getEnabledRewards().filter((reward) => reward.tier === "utility");

  if (utilityRewards.length === 0) {
    throw new LotteryDrawError("保底奖池为空", 500);
  }

  const replacement = selectWeightedReward(utilityRewards, rng);
  const replacementIndex = rewards.findIndex((reward) => reward.tier === "coin");
  const nextRewards = [...rewards];
  nextRewards[replacementIndex >= 0 ? replacementIndex : rewards.length - 1] = replacement;

  return { rewards: nextRewards, guaranteeApplied: true };
}

function summarizeRewardEffect(reward: RewardDefinition) {
  switch (reward.effect.type) {
    case "grant_coins":
      return `+${reward.effect.amount} 银子`;
    case "grant_item": {
      const item = getItemDefinition(reward.effect.itemId);
      return `${item?.name ?? reward.effect.itemId} x${reward.effect.quantity}`;
    }
    case "grant_real_world_redemption": {
      const item = getItemDefinition(reward.effect.itemId);
      return `${item?.name ?? reward.effect.itemId} x${reward.effect.quantity}`;
    }
    case "grant_title":
      return reward.name;
  }
}

function rewardToSnapshot(reward: RewardDefinition): GamificationLotteryRewardSnapshot {
  return {
    rewardId: reward.id,
    rewardTier: reward.tier,
    rewardKind: reward.kind,
    name: reward.name,
    description: reward.description,
    effectSummary: summarizeRewardEffect(reward),
  };
}

function serializeRewardSnapshot(reward: RewardDefinition) {
  return JSON.stringify({
    ...reward,
    effectSummary: summarizeRewardEffect(reward),
  });
}

function parseRewardSnapshot(raw: string): GamificationLotteryRewardSnapshot {
  try {
    const parsed = JSON.parse(raw) as {
      id?: string;
      tier?: string;
      kind?: string;
      name?: string;
      description?: string;
      effectSummary?: string;
    };

    return {
      rewardId: parsed.id ?? "unknown",
      rewardTier: parsed.tier ?? "unknown",
      rewardKind: parsed.kind ?? "unknown",
      name: parsed.name ?? "未知奖励",
      description: parsed.description ?? "历史奖励快照缺少描述。",
      effectSummary: parsed.effectSummary ?? parsed.description ?? "未知奖励",
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

async function buildDrawSnapshot(drawId: string): Promise<GamificationLotteryDrawSnapshot> {
  const draw = await prisma.lotteryDraw.findUniqueOrThrow({
    where: { id: drawId },
    include: {
      results: {
        orderBy: { position: "asc" },
      },
    },
  });

  return {
    id: draw.id,
    drawType: draw.drawType as LotteryDrawType,
    ticketSpent: draw.ticketSpent,
    coinSpent: draw.coinSpent,
    guaranteeApplied: draw.guaranteeApplied,
    createdAt: draw.createdAt.toISOString(),
    rewards: draw.results.map((result) => parseRewardSnapshot(result.rewardSnapshotJson)),
  };
}

export async function drawLottery({
  userId,
  drawType,
  useCoinTopUp = false,
  rng = Math.random,
  now = new Date(),
}: DrawLotteryInput): Promise<DrawLotteryResult> {
  if (drawType !== "SINGLE" && drawType !== "TEN") {
    throw new LotteryDrawError("未知抽奖类型", 400);
  }

  const dayKey = getShanghaiDayKey(now);
  const drawCount = drawType === "SINGLE" ? SINGLE_DRAW_SIZE : TEN_DRAW_SIZE;
  const enabledRewards = getEnabledRewards();
  const naturalRewards = Array.from({ length: drawCount }, () =>
    selectWeightedReward(enabledRewards, rng),
  );
  const guaranteed =
    drawType === "TEN"
      ? applyTenDrawGuarantee(naturalRewards, rng)
      : { rewards: naturalRewards, guaranteeApplied: false };

  const drawId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        teamId: true,
        coins: true,
        ticketBalance: true,
      },
    });

    if (!user) {
      throw new LotteryDrawError("用户不存在", 401);
    }

    if (drawType === "SINGLE" && user.ticketBalance < SINGLE_DRAW_SIZE) {
      throw new LotteryDrawError("抽奖券不足");
    }

    const topUpRequired = Math.max(0, drawCount - user.ticketBalance);
    const todayTopUpLedgers = await tx.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey,
        reason: "COIN_PURCHASE_GRANTED",
        sourceType: "lottery_topup",
      },
      select: { delta: true },
    });
    const dailyTopUpPurchased = todayTopUpLedgers.reduce(
      (sum, ledger) => sum + Math.max(0, ledger.delta),
      0,
    );

    if (topUpRequired > 0) {
      if (drawType !== "TEN") {
        throw new LotteryDrawError("单抽不能用银子补券");
      }

      if (!useCoinTopUp) {
        throw new LotteryDrawError(`十连抽还差 ${topUpRequired} 张券，需要确认用银子补齐`);
      }

      if (dailyTopUpPurchased + topUpRequired > DAILY_TOP_UP_LIMIT) {
        throw new LotteryDrawError(`今天最多只能用银子补 ${DAILY_TOP_UP_LIMIT} 张券`);
      }
    }

    const coinSpent = topUpRequired * LOTTERY_TICKET_PRICE;

    if (coinSpent > user.coins) {
      throw new LotteryDrawError("银子不足，不能补券");
    }

    const draw = await tx.lotteryDraw.create({
      data: {
        userId,
        teamId: user.teamId,
        drawType,
        ticketSpent: drawCount,
        coinSpent,
        guaranteeApplied: guaranteed.guaranteeApplied,
      },
    });

    if (topUpRequired > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { decrement: coinSpent },
          ticketBalance: { increment: topUpRequired },
        },
      });

      await tx.lotteryTicketLedger.create({
        data: {
          userId,
          teamId: user.teamId,
          dayKey,
          delta: topUpRequired,
          balanceAfter: user.ticketBalance + topUpRequired,
          reason: "COIN_PURCHASE_GRANTED",
          sourceType: "lottery_topup",
          sourceId: draw.id,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        ticketBalance: { decrement: drawCount },
      },
    });

    await tx.lotteryTicketLedger.create({
      data: {
        userId,
        teamId: user.teamId,
        dayKey,
        delta: -drawCount,
        balanceAfter: user.ticketBalance + topUpRequired - drawCount,
        reason: "LOTTERY_DRAW_SPENT",
        sourceType: "lottery_draw",
        sourceId: draw.id,
      },
    });

    await tx.lotteryDrawResult.createMany({
      data: guaranteed.rewards.map((reward, index) => ({
        drawId: draw.id,
        position: index + 1,
        rewardId: reward.id,
        rewardTier: reward.tier,
        rewardKind: reward.kind,
        rewardSnapshotJson: serializeRewardSnapshot(reward),
      })),
    });

    const coinRewardTotal = guaranteed.rewards.reduce((sum, reward) => {
      return reward.effect.type === "grant_coins" ? sum + reward.effect.amount : sum;
    }, 0);

    if (coinRewardTotal > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: coinRewardTotal },
        },
      });
    }

    const itemRewards = new Map<string, number>();

    for (const reward of guaranteed.rewards) {
      if (
        reward.effect.type !== "grant_item" &&
        reward.effect.type !== "grant_real_world_redemption"
      ) {
        continue;
      }

      itemRewards.set(
        reward.effect.itemId,
        (itemRewards.get(reward.effect.itemId) ?? 0) + reward.effect.quantity,
      );
    }

    for (const [itemId, quantity] of itemRewards) {
      const existing = await tx.inventoryItem.findUnique({
        where: {
          userId_itemId: {
            userId,
            itemId,
          },
        },
      });

      await tx.inventoryItem.upsert({
        where: {
          userId_itemId: {
            userId,
            itemId,
          },
        },
        create: {
          userId,
          teamId: user.teamId,
          itemId,
          quantity,
        },
        update: {
          quantity: (existing?.quantity ?? 0) + quantity,
        },
      });
    }

    return draw.id;
  });

  const persistedDraw = await prisma.lotteryDraw.findUniqueOrThrow({
    where: { id: drawId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          teamId: true,
        },
      },
      results: {
        orderBy: { position: "asc" },
      },
    },
  });
  const teamDynamics: GameTeamDynamicResult[] = [];

  for (const result of persistedDraw.results) {
    const rewardSnapshot = parseRewardSnapshot(result.rewardSnapshotJson);

    if (
      !shouldHighlightLotteryReward({
        rewardTier: result.rewardTier,
        rewardKind: result.rewardKind,
      })
    ) {
      teamDynamics.push({ status: "SKIPPED" });
      continue;
    }

    teamDynamics.push(
      await safeCreateGameTeamDynamic(
        buildRarePrizeDynamic({
          teamId: persistedDraw.teamId,
          userId: persistedDraw.user.id,
          displayName: persistedDraw.user.username,
          drawId: persistedDraw.id,
          resultId: result.id,
          rewardId: result.rewardId,
          rewardName: rewardSnapshot.name,
          rewardTier: result.rewardTier,
          rewardKind: result.rewardKind,
          dayKey,
          occurredAt: persistedDraw.createdAt,
        }),
      ),
    );
  }

  const [draw, snapshot] = await Promise.all([
    buildDrawSnapshot(drawId),
    buildGamificationStateForUser(userId, now),
  ]);

  if (!snapshot) {
    throw new LotteryDrawError("用户不存在", 401);
  }

  return { draw, snapshot, teamDynamics };
}
