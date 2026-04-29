import { GAMIFICATION_DIMENSIONS } from "@/content/gamification/dimensions";
import { ITEM_DEFINITIONS } from "@/content/gamification/item-definitions";
import { REWARD_DEFINITIONS } from "@/content/gamification/reward-pool";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  TaskCardDefinition,
} from "@/content/gamification/types";

const DEFAULT_CONTENT_BUNDLE: GamificationContentBundle = {
  dimensions: GAMIFICATION_DIMENSIONS,
  taskCards: TASK_CARDS,
  rewards: REWARD_DEFINITIONS,
  items: ITEM_DEFINITIONS,
};

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
  validateRewards(bundle.rewards, itemIds);
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

function validateRewards(rewards: RewardDefinition[], itemIds: Set<string>) {
  const rewardIds = new Set<string>();

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
  }
}
