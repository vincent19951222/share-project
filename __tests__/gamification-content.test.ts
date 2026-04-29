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
