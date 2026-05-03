import { GAMIFICATION_DIMENSIONS } from "@/content/gamification/dimensions";
import { ITEM_DEFINITIONS } from "@/content/gamification/item-definitions";
import { REWARD_DEFINITIONS } from "@/content/gamification/reward-pool";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  RewardTier,
  TaskCardDefinition,
} from "@/content/gamification/types";

const DEFAULT_CONTENT_BUNDLE: GamificationContentBundle = {
  dimensions: GAMIFICATION_DIMENSIONS,
  taskCards: TASK_CARDS,
  rewards: REWARD_DEFINITIONS,
  items: ITEM_DEFINITIONS,
};

const EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT = 100;
const EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS: Record<RewardTier, number> = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
};

const SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES = new Set([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);

export function getGamificationDimensions() {
  return DEFAULT_CONTENT_BUNDLE.dimensions;
}

export function getTaskCards() {
  return DEFAULT_CONTENT_BUNDLE.taskCards;
}

export function getRewardDefinitions() {
  return DEFAULT_CONTENT_BUNDLE.rewards;
}

export function getItemDefinitions() {
  return DEFAULT_CONTENT_BUNDLE.items;
}

export function getItemDefinition(itemId: string) {
  return getItemDefinitions().find((item) => item.id === itemId);
}

export function validateGamificationContent(bundle = DEFAULT_CONTENT_BUNDLE) {
  const dimensionKeys = new Set<string>();
  const itemIds = new Set<string>();

  for (const dimension of bundle.dimensions) {
    if (dimensionKeys.has(dimension.key)) {
      throw new Error(`Duplicate dimension key: ${dimension.key}`);
    }
    dimensionKeys.add(dimension.key);
  }

  validateTaskCards(bundle.taskCards, dimensionKeys);
  validateItems(bundle.items, itemIds);
  validateRewards(bundle.rewards, bundle.items, itemIds);
}

function validateTaskCards(taskCards: TaskCardDefinition[], dimensionKeys: Set<string>) {
  const taskCardIds = new Set<string>();

  for (const card of taskCards) {
    if (taskCardIds.has(card.id)) {
      throw new Error(`Duplicate task card id: ${card.id}`);
    }
    taskCardIds.add(card.id);

    if (!dimensionKeys.has(card.dimensionKey)) {
      throw new Error(`Unknown task card dimension: ${card.dimensionKey}`);
    }

    if (card.weight <= 0) {
      throw new Error(`Invalid task card weight: ${card.id}`);
    }

    if (card.repeatCooldownDays < 0) {
      throw new Error(`Invalid task card cooldown: ${card.id}`);
    }

    if (card.completionTextOptions.length === 0) {
      throw new Error(`Missing task card completion text: ${card.id}`);
    }
  }
}

function validateItems(items: ItemDefinition[], itemIds: Set<string>) {
  for (const item of items) {
    if (itemIds.has(item.id)) {
      throw new Error(`Duplicate item id: ${item.id}`);
    }
    itemIds.add(item.id);

    for (const limit of [item.maxUsePerUserPerDay, item.maxUsePerUserPerWeek, item.maxUsePerTeamPerDay]) {
      if (limit !== undefined && limit <= 0) {
        throw new Error(`Invalid item limit: ${item.id}`);
      }
    }
  }
}

function validateRewards(
  rewards: RewardDefinition[],
  items: ItemDefinition[],
  itemIds: Set<string>,
) {
  const rewardIds = new Set<string>();
  const itemById = new Map(items.map((item) => [item.id, item]));
  const activeTierWeights: Record<RewardTier, number> = {
    coin: 0,
    utility: 0,
    social: 0,
    cosmetic: 0,
    rare: 0,
  };
  let activeTotalWeight = 0;

  for (const reward of rewards) {
    if (rewardIds.has(reward.id)) {
      throw new Error(`Duplicate reward id: ${reward.id}`);
    }
    rewardIds.add(reward.id);

    if (reward.weight <= 0) {
      throw new Error(`Invalid reward weight: ${reward.id}`);
    }

    if (
      (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") &&
      !itemIds.has(reward.effect.itemId)
    ) {
      throw new Error(`Unknown reward item: ${reward.effect.itemId}`);
    }

    if (!reward.enabled) {
      continue;
    }

    activeTotalWeight += reward.weight;
    activeTierWeights[reward.tier] += reward.weight;

    if (reward.effect.type === "grant_title") {
      throw new Error(`Active reward grants unsupported title: ${reward.id}`);
    }

    if (reward.effect.type !== "grant_item" && reward.effect.type !== "grant_real_world_redemption") {
      continue;
    }

    const item = itemById.get(reward.effect.itemId);

    if (!item) {
      throw new Error(`Unknown reward item: ${reward.effect.itemId}`);
    }

    if (!item.enabled) {
      throw new Error(`Active reward grants disabled item: ${reward.effect.itemId}`);
    }

    if (!SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES.has(item.effect.type)) {
      throw new Error(`Active reward grants unsupported item effect: ${reward.effect.itemId}`);
    }
  }

  if (activeTotalWeight !== EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT) {
    throw new Error(`Invalid active reward total weight: ${activeTotalWeight}`);
  }

  for (const tier of Object.keys(EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS) as RewardTier[]) {
    const expected = EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS[tier];

    if (activeTierWeights[tier] !== expected) {
      throw new Error(`Invalid active reward tier weight: ${tier}=${activeTierWeights[tier]}`);
    }
  }
}
