import type { Prisma } from "@/lib/generated/prisma/client";
import type { ItemEffect } from "@/content/gamification/types";
import { getItemDefinition } from "@/lib/gamification/content";
import {
  buildBoostMilestoneDynamic,
  safeCreateGameTeamDynamic,
  shouldHighlightBoost,
} from "@/lib/gamification/team-dynamics";
import * as teamDynamicsService from "@/lib/team-dynamics-service";

type TransactionClient = Prisma.TransactionClient;

type FitnessBoostEffect =
  | { type: "fitness_coin_multiplier"; multiplier: 1.5 | 2 }
  | { type: "fitness_season_multiplier"; multiplier: 2 }
  | { type: "fitness_coin_and_season_multiplier"; multiplier: 2 };

export interface BoostSettlementInput {
  baseAssetAwarded: number;
  baseSeasonContribution: number;
  effect: FitnessBoostEffect | null;
}

export interface BoostSettlementResult {
  assetAwarded: number;
  baseAssetAwarded: number;
  boostAssetBonus: number;
  seasonContributionAwarded: number;
  baseSeasonContribution: number;
  boostSeasonBonus: number;
  boostLabel: string | null;
  boostSummary: string | null;
}

function isFitnessBoostEffect(effect: ItemEffect | unknown): effect is FitnessBoostEffect {
  if (!effect || typeof effect !== "object" || !("type" in effect)) {
    return false;
  }

  return (
    effect.type === "fitness_coin_multiplier" ||
    effect.type === "fitness_season_multiplier" ||
    effect.type === "fitness_coin_and_season_multiplier"
  );
}

function parseEffect(raw: string): FitnessBoostEffect | null {
  try {
    const effect = JSON.parse(raw) as ItemEffect;
    return isFitnessBoostEffect(effect) ? effect : null;
  } catch {
    return null;
  }
}

function getBoostLabel(effect: FitnessBoostEffect | null) {
  if (!effect) {
    return null;
  }

  if (effect.type === "fitness_coin_multiplier" && effect.multiplier === 1.5) {
    return "小暴击券";
  }

  if (effect.type === "fitness_coin_multiplier" && effect.multiplier === 2) {
    return "银子暴富券";
  }

  if (effect.type === "fitness_season_multiplier") {
    return "赛季冲刺券";
  }

  return "双倍牛马券";
}

function buildBoostSummary(input: {
  label: string | null;
  boostAssetBonus: number;
  boostSeasonBonus: number;
}) {
  if (!input.label) {
    return null;
  }

  return `${input.label}生效：个人银子 +${input.boostAssetBonus}，赛季收入 +${input.boostSeasonBonus}`;
}

export function calculateBoostSettlement(input: BoostSettlementInput): BoostSettlementResult {
  let assetMultiplier = 1;
  let seasonMultiplier = 1;

  if (input.effect?.type === "fitness_coin_multiplier") {
    assetMultiplier = input.effect.multiplier;
  }

  if (input.effect?.type === "fitness_season_multiplier") {
    seasonMultiplier = input.effect.multiplier;
  }

  if (input.effect?.type === "fitness_coin_and_season_multiplier") {
    assetMultiplier = input.effect.multiplier;
    seasonMultiplier = input.effect.multiplier;
  }

  const assetAwarded = Math.round(input.baseAssetAwarded * assetMultiplier);
  const seasonContributionAwarded = Math.round(input.baseSeasonContribution * seasonMultiplier);
  const boostAssetBonus = assetAwarded - input.baseAssetAwarded;
  const boostSeasonBonus = seasonContributionAwarded - input.baseSeasonContribution;
  const boostLabel = getBoostLabel(input.effect);

  return {
    assetAwarded,
    baseAssetAwarded: input.baseAssetAwarded,
    boostAssetBonus,
    seasonContributionAwarded,
    baseSeasonContribution: input.baseSeasonContribution,
    boostSeasonBonus,
    boostLabel,
    boostSummary: buildBoostSummary({ label: boostLabel, boostAssetBonus, boostSeasonBonus }),
  };
}

async function consumeBoostInventory(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
}) {
  const update = await input.tx.inventoryItem.updateMany({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      quantity: { gt: 0 },
    },
    data: {
      quantity: { decrement: 1 },
    },
  });

  if (update.count !== 1) {
    throw new Error("Boost inventory is not available for settlement");
  }
}

export async function settleBoostForPunch(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  dayKey: string;
  punchRecordId: string;
  baseAssetAwarded: number;
  baseSeasonContribution: number;
  applyBonusDeltas: boolean;
}): Promise<BoostSettlementResult & { itemUseRecordId: string | null }> {
  const punch = await input.tx.punchRecord.findUniqueOrThrow({
    where: { id: input.punchRecordId },
    select: {
      boostItemUseRecordId: true,
      boostSummaryJson: true,
      assetAwarded: true,
      baseAssetAwarded: true,
      boostAssetBonus: true,
      seasonContributionAwarded: true,
      baseSeasonContribution: true,
      boostSeasonBonus: true,
      seasonId: true,
      createdAt: true,
    },
  });

  if (punch.boostItemUseRecordId) {
    if (punch.boostSummaryJson) {
      const summary = JSON.parse(punch.boostSummaryJson) as BoostSettlementResult;
      return { ...summary, itemUseRecordId: punch.boostItemUseRecordId };
    }

    return {
      assetAwarded: punch.assetAwarded,
      baseAssetAwarded: punch.baseAssetAwarded,
      boostAssetBonus: punch.boostAssetBonus,
      seasonContributionAwarded: punch.seasonContributionAwarded,
      baseSeasonContribution: punch.baseSeasonContribution,
      boostSeasonBonus: punch.boostSeasonBonus,
      boostLabel: null,
      boostSummary: null,
      itemUseRecordId: punch.boostItemUseRecordId,
    };
  }

  const itemUse = await input.tx.itemUseRecord.findFirst({
    where: {
      userId: input.userId,
      dayKey: input.dayKey,
      status: "PENDING",
      OR: [
        { targetType: null, targetId: null },
        { targetType: "FITNESS_PUNCH", targetId: null },
        { targetType: "FITNESS_PUNCH", targetId: input.punchRecordId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!itemUse) {
    const baseSettlement = calculateBoostSettlement({
      baseAssetAwarded: input.baseAssetAwarded,
      baseSeasonContribution: input.baseSeasonContribution,
      effect: null,
    });

    await input.tx.punchRecord.update({
      where: { id: input.punchRecordId },
      data: {
        assetAwarded: baseSettlement.assetAwarded,
        baseAssetAwarded: baseSettlement.baseAssetAwarded,
        boostAssetBonus: baseSettlement.boostAssetBonus,
        baseSeasonContribution: baseSettlement.baseSeasonContribution,
        boostSeasonBonus: baseSettlement.boostSeasonBonus,
        seasonContributionAwarded: baseSettlement.seasonContributionAwarded,
      },
    });

    return { ...baseSettlement, itemUseRecordId: null };
  }

  const effect = parseEffect(itemUse.effectSnapshotJson);
  const settlement = calculateBoostSettlement({
    baseAssetAwarded: input.baseAssetAwarded,
    baseSeasonContribution: input.baseSeasonContribution,
    effect,
  });
  const definition = getItemDefinition(itemUse.itemId);
  const boostLabel = definition?.name ?? settlement.boostLabel;
  const boostSummary = {
    ...settlement,
    boostLabel,
    boostSummary: buildBoostSummary({
      label: boostLabel,
      boostAssetBonus: settlement.boostAssetBonus,
      boostSeasonBonus: settlement.boostSeasonBonus,
    }),
  };

  await consumeBoostInventory({
    tx: input.tx,
    userId: input.userId,
    itemId: itemUse.itemId,
  });

  await input.tx.itemUseRecord.update({
    where: { id: itemUse.id },
    data: {
      status: "SETTLED",
      targetType: "FITNESS_PUNCH",
      targetId: input.punchRecordId,
      settledAt: new Date(),
    },
  });

  await input.tx.punchRecord.update({
    where: { id: input.punchRecordId },
    data: {
      assetAwarded: settlement.assetAwarded,
      baseAssetAwarded: settlement.baseAssetAwarded,
      boostAssetBonus: settlement.boostAssetBonus,
      baseSeasonContribution: settlement.baseSeasonContribution,
      boostSeasonBonus: settlement.boostSeasonBonus,
      seasonContributionAwarded: settlement.seasonContributionAwarded,
      boostItemUseRecordId: itemUse.id,
      boostSummaryJson: JSON.stringify(boostSummary),
    },
  });

  if (input.applyBonusDeltas) {
    if (settlement.boostAssetBonus !== 0) {
      await input.tx.user.update({
        where: { id: input.userId },
        data: { coins: { increment: settlement.boostAssetBonus } },
      });
    }

    if (punch.seasonId && settlement.boostSeasonBonus !== 0) {
      await input.tx.seasonMemberStat.update({
        where: {
          seasonId_userId: {
            seasonId: punch.seasonId,
            userId: input.userId,
          },
        },
        data: { seasonIncome: { increment: settlement.boostSeasonBonus } },
      });
    }
  }

  if (
    shouldHighlightBoost({
      baseAssetAwarded: settlement.baseAssetAwarded,
      boostAssetBonus: settlement.boostAssetBonus,
      baseSeasonContribution: settlement.baseSeasonContribution,
      boostSeasonBonus: settlement.boostSeasonBonus,
      highlightInDynamics: definition?.highlightInDynamics,
    })
  ) {
    const actor = await input.tx.user.findUnique({
      where: { id: input.userId },
      select: { username: true },
    });

    await safeCreateGameTeamDynamic(
      buildBoostMilestoneDynamic({
        teamId: input.teamId,
        userId: input.userId,
        displayName: actor?.username ?? input.userId,
        punchRecordId: input.punchRecordId,
        itemUseRecordId: itemUse.id,
        itemId: itemUse.itemId,
        itemName: boostLabel ?? itemUse.itemId,
        baseAssetAwarded: settlement.baseAssetAwarded,
        boostAssetBonus: settlement.boostAssetBonus,
        baseSeasonContribution: settlement.baseSeasonContribution,
        boostSeasonBonus: settlement.boostSeasonBonus,
        dayKey: input.dayKey,
        occurredAt: punch.createdAt,
      }),
      (dynamicInput) =>
        teamDynamicsService.createOrReuseTeamDynamic({
          ...dynamicInput,
          client: input.tx,
        }),
    );
  }

  return { ...boostSummary, itemUseRecordId: itemUse.id };
}
