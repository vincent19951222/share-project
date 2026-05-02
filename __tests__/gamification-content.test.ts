import { describe, expect, it } from "vitest";
import {
  getGamificationDimensions,
  getItemDefinition,
  getItemDefinitions,
  getRewardDefinitions,
  getTaskCards,
  validateGamificationContent,
} from "@/lib/gamification/content";
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  RewardTier,
  TaskCardDefinition,
} from "@/content/gamification/types";

function cloneBundle(): GamificationContentBundle {
  return {
    dimensions: getGamificationDimensions().map((dimension) => ({ ...dimension })),
    taskCards: getTaskCards().map((card) => ({
      ...card,
      completionTextOptions: [...card.completionTextOptions],
      tags: [...card.tags],
    })),
    rewards: getRewardDefinitions().map((reward) => ({ ...reward })),
    items: getItemDefinitions().map((item) => ({ ...item })),
  };
}

const EXPECTED_ACTIVE_TIER_WEIGHTS: Record<RewardTier, number> = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
};

const SUPPORTED_ACTIVE_ITEM_EFFECT_TYPES = new Set([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);

function getActiveRewards(rewards = getRewardDefinitions()) {
  return rewards.filter((reward) => reward.enabled && reward.weight > 0);
}

function getTierWeights(rewards = getActiveRewards()) {
  return rewards.reduce<Record<RewardTier, number>>(
    (weights, reward) => ({
      ...weights,
      [reward.tier]: weights[reward.tier] + reward.weight,
    }),
    {
      coin: 0,
      utility: 0,
      social: 0,
      cosmetic: 0,
      rare: 0,
    },
  );
}

function getDirectCoinEv(rewards = getActiveRewards()) {
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);

  return rewards.reduce((sum, reward) => {
    if (reward.effect.type !== "grant_coins") {
      return sum;
    }

    return sum + (reward.weight / totalWeight) * reward.effect.amount;
  }, 0);
}

describe("gamification content", () => {
  it("defines the four fixed dimensions", () => {
    expect(getGamificationDimensions().map((dimension) => dimension.key)).toEqual([
      "movement",
      "hydration",
      "social",
      "learning",
    ]);
  });

  it("has at least five enabled task cards per dimension", () => {
    const enabledCards = getTaskCards().filter((card) => card.enabled);

    for (const dimension of getGamificationDimensions()) {
      expect(enabledCards.filter((card) => card.dimensionKey === dimension.key).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("validates the shipped content bundle", () => {
    expect(() => validateGamificationContent()).not.toThrow();
  });

  it("keeps the GM-16 active reward pool at the approved tier weights", () => {
    const activeRewards = getActiveRewards();
    const totalWeight = activeRewards.reduce((sum, reward) => sum + reward.weight, 0);

    expect(totalWeight).toBe(100);
    expect(getTierWeights(activeRewards)).toEqual(EXPECTED_ACTIVE_TIER_WEIGHTS);
    expect(getDirectCoinEv(activeRewards)).toBeCloseTo(8.75, 5);
    expect(activeRewards.map((reward) => reward.id)).not.toContain("reward_today_title");
    expect(activeRewards.some((reward) => reward.effect.type === "grant_title")).toBe(false);
  });

  it("only grants currently usable or redeemable items from the active reward pool", () => {
    const itemById = new Map(getItemDefinitions().map((item) => [item.id, item]));

    for (const reward of getActiveRewards()) {
      if (reward.effect.type !== "grant_item" && reward.effect.type !== "grant_real_world_redemption") {
        continue;
      }

      const item = itemById.get(reward.effect.itemId);

      expect(item, reward.id).toBeDefined();
      expect(item?.enabled, reward.effect.itemId).toBe(true);
      expect(SUPPORTED_ACTIVE_ITEM_EFFECT_TYPES.has(item!.effect.type), reward.effect.itemId).toBe(true);
    }
  });

  it("finds an item definition by id", () => {
    expect(getItemDefinition("task_reroll_coupon")).toMatchObject({
      name: "任务换班券",
      category: "task",
    });
  });

  it("rejects duplicate task card ids", () => {
    const bundle = cloneBundle();
    const duplicate: TaskCardDefinition = { ...bundle.taskCards[0] };
    bundle.taskCards.push(duplicate);

    expect(() => validateGamificationContent(bundle)).toThrow(/Duplicate task card id/);
  });

  it("rejects task cards with invalid dimensions", () => {
    const bundle = cloneBundle();
    bundle.taskCards[0] = { ...bundle.taskCards[0], dimensionKey: "invalid" as TaskCardDefinition["dimensionKey"] };

    expect(() => validateGamificationContent(bundle)).toThrow(/Unknown task card dimension/);
  });

  it("rejects rewards that grant missing items", () => {
    const bundle = cloneBundle();
    const reward: RewardDefinition = {
      id: "bad_reward",
      tier: "utility",
      kind: "inventory_item",
      rarity: "common",
      name: "坏奖励",
      description: "引用不存在的道具。",
      weight: 1,
      effect: { type: "grant_item", itemId: "missing_item", quantity: 1 },
      enabled: true,
    };
    bundle.rewards.push(reward);

    expect(() => validateGamificationContent(bundle)).toThrow(/Unknown reward item/);
  });

  it("rejects active title rewards until cosmetic inventory exists", () => {
    const bundle = cloneBundle();
    bundle.rewards = bundle.rewards.map((reward) =>
      reward.id === "reward_today_title"
        ? {
            ...reward,
            enabled: true,
          }
        : reward,
    );

    expect(() => validateGamificationContent(bundle)).toThrow(/Active reward grants unsupported title/);
  });

  it("rejects active rewards that grant disabled items", () => {
    const bundle = cloneBundle();
    bundle.items = bundle.items.map((item) =>
      item.id === "task_reroll_coupon"
        ? {
            ...item,
            enabled: false,
          }
        : item,
    );

    expect(() => validateGamificationContent(bundle)).toThrow(/Active reward grants disabled item/);
  });

  it("rejects active rewards that grant unsupported item effects", () => {
    const bundle = cloneBundle();
    const unsupportedItem: ItemDefinition = {
      id: "unsupported_lottery_item",
      category: "lottery",
      name: "未开放彩票道具",
      description: "这个道具定义存在，但 GM-16 不允许进入 active pool。",
      useTiming: "instant",
      effect: { type: "lottery_guarantee", minTier: "utility", appliesTo: "single" },
      stackable: true,
      requiresAdminConfirmation: false,
      enabled: true,
    };
    const unsupportedReward: RewardDefinition = {
      id: "reward_unsupported_lottery_item",
      tier: "utility",
      kind: "inventory_item",
      rarity: "common",
      name: "未开放彩票道具奖励",
      description: "主动奖励一个还没有使用入口的道具。",
      weight: 1,
      effect: { type: "grant_item", itemId: unsupportedItem.id, quantity: 1 },
      enabled: true,
    };
    bundle.items.push(unsupportedItem);
    bundle.rewards.push(unsupportedReward);

    expect(() => validateGamificationContent(bundle)).toThrow(/Active reward grants unsupported item effect/);
  });

  it("rejects invalid item use limits", () => {
    const bundle = cloneBundle();
    const invalidItem: ItemDefinition = {
      ...bundle.items[0],
      id: "invalid_limit_item",
      maxUsePerUserPerDay: 0,
    };
    bundle.items.push(invalidItem);

    expect(() => validateGamificationContent(bundle)).toThrow(/Invalid item limit/);
  });
});
