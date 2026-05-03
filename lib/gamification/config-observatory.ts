import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  RewardEffect,
  RewardTier,
  TaskCardDefinition,
} from "@/content/gamification/types";
import {
  getGamificationDimensions,
  getItemDefinitions,
  getRewardDefinitions,
  getTaskCards,
  validateGamificationContent,
} from "@/lib/gamification/content";
import type {
  GamificationConfigObservatorySnapshot,
  GamificationConfigValidationCheck,
  GamificationDimensionCount,
  GamificationDimensionPoolSnapshot,
  GamificationItemCatalogSnapshot,
  GamificationItemCategorySnapshot,
  GamificationItemConfigRow,
  GamificationRewardConfigRow,
  GamificationRewardPoolAvailability,
  GamificationRewardPoolSnapshot,
  GamificationRewardTierWeightSnapshot,
} from "@/lib/types";

const EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT = 100;

const EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
} satisfies Record<RewardTier, number>;

const SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES = new Set<ItemDefinition["effect"]["type"]>([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);

interface BuildConfigObservatoryInput {
  now?: Date;
  bundle?: GamificationContentBundle;
}

function getDefaultBundle(): GamificationContentBundle {
  return {
    dimensions: getGamificationDimensions(),
    taskCards: getTaskCards(),
    rewards: getRewardDefinitions(),
    items: getItemDefinitions(),
  };
}

function countBy<T>(values: T[], getKey: (value: T) => string): GamificationDimensionCount[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function getTopTags(cards: TaskCardDefinition[]) {
  const tags = cards.flatMap((card) => card.tags);

  return countBy(tags, (tag) => tag).slice(0, 6);
}

function formatProbability(probability: number) {
  if (probability === 0) {
    return "0%";
  }

  const percent = probability * 100;

  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(2))}%`;
}

function rewardEffectSummary(effect: RewardEffect, itemNameById: Map<string, string>) {
  switch (effect.type) {
    case "grant_coins":
      return `获得 ${effect.amount} 银子`;
    case "grant_item":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}`;
    case "grant_real_world_redemption":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}兑换资格`;
    case "grant_title":
      return `获得称号 ${effect.titleId}`;
  }
}

function itemEffectSummary(item: ItemDefinition) {
  const effect = item.effect;

  switch (effect.type) {
    case "fitness_coin_multiplier":
      return `当日健身个人资产 ${effect.multiplier}x`;
    case "fitness_season_multiplier":
      return `当日健身赛季贡献 ${effect.multiplier}x`;
    case "fitness_coin_and_season_multiplier":
      return `当日健身个人资产和赛季贡献 ${effect.multiplier}x`;
    case "task_reroll":
      return "同维度重抽一个四维任务";
    case "lottery_guarantee":
      return `下一次${effect.appliesTo === "single" ? "单抽" : "十连"}至少 ${effect.minTier}`;
    case "ticket_discount":
      return `补券价格 ${Math.round(effect.discountRate * 100)} 折`;
    case "social_invitation":
      return `发起 ${effect.invitationType} 弱社交邀请`;
    case "leave_protection":
      return "保护连续记录并冻结下一次真实健身奖励档位";
    case "real_world_redemption":
      return `线下兑换 ${effect.redemptionType}`;
    case "dimension_coin_bonus":
      return `完成 ${effect.dimensionKey} 额外获得 ${effect.amount} 银子`;
    case "cosmetic":
      return `外观效果 ${effect.cosmeticType}`;
  }
}

function limitSummary(item: ItemDefinition) {
  const limits: string[] = [];

  if (item.maxUsePerUserPerDay) {
    limits.push(`每人每天 ${item.maxUsePerUserPerDay}`);
  }

  if (item.maxUsePerUserPerWeek) {
    limits.push(`每人每周 ${item.maxUsePerUserPerWeek}`);
  }

  if (item.maxUsePerTeamPerDay) {
    limits.push(`每队每天 ${item.maxUsePerTeamPerDay}`);
  }

  return limits.length > 0 ? limits.join(" / ") : "无额外限制";
}

function availabilityLabel(availability: GamificationRewardPoolAvailability) {
  switch (availability) {
    case "active_reward_pool":
      return "已进入奖池";
    case "eligible_but_not_in_pool":
      return "可进奖池但当前未投放";
    case "unsupported_effect":
      return "不可进入奖池";
    case "disabled_item":
      return "道具未启用";
  }
}

function buildDimensionPools(bundle: GamificationContentBundle): GamificationDimensionPoolSnapshot[] {
  return bundle.dimensions.map((dimension) => {
    const cards = bundle.taskCards.filter((card) => card.dimensionKey === dimension.key);
    const enabledCards = cards.filter((card) => card.enabled);

    return {
      key: dimension.key,
      title: dimension.title,
      subtitle: dimension.subtitle,
      enabledCardCount: enabledCards.length,
      disabledCardCount: cards.length - enabledCards.length,
      totalEnabledWeight: enabledCards.reduce((total, card) => total + card.weight, 0),
      scenes: countBy(enabledCards, (card) => card.scene),
      efforts: countBy(enabledCards, (card) => card.effort),
      topTags: getTopTags(enabledCards),
      sampleCards: enabledCards.slice(0, 5).map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        weight: card.weight,
        effort: card.effort,
        scene: card.scene,
        tags: card.tags,
        enabled: card.enabled,
      })),
    };
  });
}

function rewardRow(input: {
  reward: RewardDefinition;
  activeTotalWeight: number;
  itemNameById: Map<string, string>;
}): GamificationRewardConfigRow {
  const probability =
    input.reward.enabled && input.activeTotalWeight > 0
      ? input.reward.weight / input.activeTotalWeight
      : 0;

  return {
    id: input.reward.id,
    tier: input.reward.tier,
    kind: input.reward.kind,
    rarity: input.reward.rarity,
    name: input.reward.name,
    description: input.reward.description,
    weight: input.reward.weight,
    probability,
    probabilityLabel: formatProbability(probability),
    effectSummary: rewardEffectSummary(input.reward.effect, input.itemNameById),
    enabled: input.reward.enabled,
  };
}

function buildRewardPool(bundle: GamificationContentBundle): GamificationRewardPoolSnapshot {
  const activeRewards = bundle.rewards.filter((reward) => reward.enabled);
  const activeTotalWeight = activeRewards.reduce((total, reward) => total + reward.weight, 0);
  const itemNameById = new Map(bundle.items.map((item) => [item.id, item.name]));
  const tierWeights: GamificationRewardTierWeightSnapshot[] = (
    Object.keys(EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS) as RewardTier[]
  ).map((tier) => {
    const weight = activeRewards
      .filter((reward) => reward.tier === tier)
      .reduce((total, reward) => total + reward.weight, 0);
    const expectedWeight = EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS[tier];

    return {
      tier,
      weight,
      expectedWeight,
      status: weight === expectedWeight ? "pass" : "fail",
    };
  });
  const directCoinExpectedValue = activeRewards.reduce((total, reward) => {
    if (reward.effect.type !== "grant_coins" || activeTotalWeight === 0) {
      return total;
    }

    return total + (reward.weight / activeTotalWeight) * reward.effect.amount;
  }, 0);

  return {
    activeTotalWeight,
    expectedActiveTotalWeight: EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT,
    directCoinExpectedValue,
    tierWeights,
    activeRewards: activeRewards.map((reward) =>
      rewardRow({ reward, activeTotalWeight, itemNameById }),
    ),
    disabledRewards: bundle.rewards
      .filter((reward) => !reward.enabled)
      .map((reward) => rewardRow({ reward, activeTotalWeight, itemNameById })),
  };
}

function buildItemCatalog(bundle: GamificationContentBundle): GamificationItemCatalogSnapshot {
  const activeRewardItemIds = new Set(
    bundle.rewards
      .filter((reward) => reward.enabled)
      .flatMap((reward) =>
        reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption"
          ? [reward.effect.itemId]
          : [],
      ),
  );
  const availabilityCounts: Record<GamificationRewardPoolAvailability, number> = {
    active_reward_pool: 0,
    eligible_but_not_in_pool: 0,
    unsupported_effect: 0,
    disabled_item: 0,
  };
  const itemRows = bundle.items.map((item): GamificationItemConfigRow => {
    const supportedActiveEffect = SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES.has(item.effect.type);
    const rewardPoolAvailability: GamificationRewardPoolAvailability = !item.enabled
      ? "disabled_item"
      : !supportedActiveEffect
        ? "unsupported_effect"
        : activeRewardItemIds.has(item.id)
          ? "active_reward_pool"
          : "eligible_but_not_in_pool";

    availabilityCounts[rewardPoolAvailability] += 1;

    return {
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description,
      useTiming: item.useTiming,
      effectSummary: itemEffectSummary(item),
      stackable: item.stackable,
      limitSummary: limitSummary(item),
      requiresAdminConfirmation: item.requiresAdminConfirmation,
      enabled: item.enabled,
      rewardPoolAvailability,
      rewardPoolAvailabilityLabel: availabilityLabel(rewardPoolAvailability),
    };
  });
  const categories = [...new Set(itemRows.map((item) => item.category))].sort();

  return {
    availabilityCounts,
    categories: categories.map((category): GamificationItemCategorySnapshot => {
      const items = itemRows.filter((item) => item.category === category);

      return {
        category,
        enabledCount: items.filter((item) => item.enabled).length,
        disabledCount: items.filter((item) => !item.enabled).length,
        items,
      };
    }),
  };
}

function buildValidation(bundle: GamificationContentBundle): GamificationConfigObservatorySnapshot["validation"] {
  const rewardPool = buildRewardPool(bundle);
  const tierDetail = rewardPool.tierWeights.map((tier) => `${tier.tier} ${tier.weight}`).join(" / ");
  const checks: GamificationConfigValidationCheck[] = [
    {
      key: "active_reward_total_weight",
      label: "Active 奖池总权重",
      status: rewardPool.activeTotalWeight === EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT ? "pass" : "fail",
      detail: `当前 ${rewardPool.activeTotalWeight}，期望 ${EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT}。`,
    },
    {
      key: "active_reward_tier_weights",
      label: "Active 奖池分层权重",
      status: rewardPool.tierWeights.every((tier) => tier.status === "pass") ? "pass" : "fail",
      detail: `${tierDetail}。`,
    },
    {
      key: "direct_coin_expected_value",
      label: "直接银子期望",
      status: Math.abs(rewardPool.directCoinExpectedValue - 8.75) < 0.00001 ? "pass" : "fail",
      detail: `当前 ${rewardPool.directCoinExpectedValue.toFixed(2)}，期望 8.75。`,
    },
  ];

  try {
    validateGamificationContent(bundle);
    checks.push({
      key: "content_validation",
      label: "内容结构校验",
      status: "pass",
      detail: "validateGamificationContent() 通过。",
    });
  } catch (error) {
    checks.push({
      key: "content_validation",
      label: "内容结构校验",
      status: "fail",
      detail: error instanceof Error ? error.message : "validateGamificationContent() 失败。",
    });
  }

  const ok = checks.every((check) => check.status !== "fail");

  return {
    ok,
    summary: ok ? "当前游戏化配置校验通过。" : "当前游戏化配置存在风险，请先处理失败项。",
    checks,
  };
}

export function buildGamificationConfigObservatorySnapshot(
  input: BuildConfigObservatoryInput = {},
): GamificationConfigObservatorySnapshot {
  const bundle = input.bundle ?? getDefaultBundle();
  const now = input.now ?? new Date();

  return {
    generatedAt: now.toISOString(),
    validation: buildValidation(bundle),
    dimensionPools: buildDimensionPools(bundle),
    rewardPool: buildRewardPool(bundle),
    itemCatalog: buildItemCatalog(bundle),
  };
}
