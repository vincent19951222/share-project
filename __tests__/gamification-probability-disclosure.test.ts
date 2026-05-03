import { describe, expect, it } from "vitest";
import { buildGamificationProbabilityDisclosure } from "@/lib/gamification/probability-disclosure";

describe("gamification probability disclosure", () => {
  it("summarizes the active reward pool weights and direct coin expected value", () => {
    const disclosure = buildGamificationProbabilityDisclosure();

    expect(disclosure.activeTotalWeight).toBe(100);
    expect(disclosure.directCoinExpectedValue).toBeCloseTo(8.75, 5);
    expect(disclosure.tierWeights).toEqual([
      { tier: "coin", weight: 45, probabilityLabel: "45%" },
      { tier: "utility", weight: 27, probabilityLabel: "27%" },
      { tier: "social", weight: 24, probabilityLabel: "24%" },
      { tier: "cosmetic", weight: 0, probabilityLabel: "0%" },
      { tier: "rare", weight: 4, probabilityLabel: "4%" },
    ]);
    expect(disclosure.activeRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coins_005",
          name: "摸鱼津贴",
          weight: 15,
          probabilityLabel: "15%",
          effectSummary: "获得 5 银子",
        }),
        expect.objectContaining({
          id: "reward_luckin_coffee",
          name: "瑞幸咖啡券",
          weight: 1,
          probabilityLabel: "1%",
          effectSummary: "获得 1 个瑞幸咖啡券兑换资格",
        }),
      ]),
    );
    expect(disclosure.activeRewards).toHaveLength(18);
  });

  it("separates disabled rewards, inactive item notes, and required docs facts", () => {
    const disclosure = buildGamificationProbabilityDisclosure();

    expect(disclosure.disabledRewards).toEqual([
      expect.objectContaining({
        id: "reward_today_title",
        name: "今日称号",
        probabilityLabel: "0%",
        effectSummary: "获得称号 legal_slacker",
      }),
    ]);
    expect(disclosure.inactiveItemNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: "single_draw_guarantee_coupon", itemName: "保底升级券" }),
        expect.objectContaining({ itemId: "ticket_discount_90", itemName: "九折购券卡" }),
        expect.objectContaining({ itemId: "hydration_bonus", itemName: "补水加班费" }),
        expect.objectContaining({ itemId: "movement_bonus", itemName: "站立补贴" }),
      ]),
    );
    expect(disclosure.requiredFacts).toEqual(
      expect.arrayContaining([
        "active_reward_total_weight=100",
        "active_reward_tier_weights=coin45_utility27_social24_cosmetic0_rare4",
        "direct_coin_ev=8.75",
        "probability_disclosure_weights_are_relative",
        "disabled_rewards_not_drawable",
        "unsupported_items_not_in_active_pool",
      ]),
    );
  });
});
