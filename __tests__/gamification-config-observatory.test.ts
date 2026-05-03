import { describe, expect, it } from "vitest";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";

describe("gamification config observatory", () => {
  it("summarizes task dimensions, reward pool weights, and item catalog availability", () => {
    const snapshot = buildGamificationConfigObservatorySnapshot({
      now: new Date("2026-05-02T12:00:00+08:00"),
    });

    expect(snapshot.generatedAt).toBe("2026-05-02T04:00:00.000Z");
    expect(snapshot.dimensionPools.map((pool) => pool.key)).toEqual([
      "movement",
      "hydration",
      "social",
      "learning",
    ]);
    expect(snapshot.dimensionPools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "movement",
          enabledCardCount: 5,
          disabledCardCount: 0,
          totalEnabledWeight: 5,
        }),
        expect.objectContaining({
          key: "hydration",
          enabledCardCount: 5,
          disabledCardCount: 0,
          totalEnabledWeight: 5,
        }),
      ]),
    );
    expect(snapshot.rewardPool.activeTotalWeight).toBe(100);
    expect(snapshot.rewardPool.directCoinExpectedValue).toBeCloseTo(8.75, 5);
    expect(snapshot.rewardPool.tierWeights).toEqual([
      { tier: "coin", weight: 45, expectedWeight: 45, status: "pass" },
      { tier: "utility", weight: 27, expectedWeight: 27, status: "pass" },
      { tier: "social", weight: 24, expectedWeight: 24, status: "pass" },
      { tier: "cosmetic", weight: 0, expectedWeight: 0, status: "pass" },
      { tier: "rare", weight: 4, expectedWeight: 4, status: "pass" },
    ]);
    expect(snapshot.rewardPool.activeRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coins_005",
          probabilityLabel: "15%",
          effectSummary: "获得 5 银子",
        }),
        expect.objectContaining({
          id: "reward_luckin_coffee",
          probabilityLabel: "1%",
          effectSummary: "获得 1 个瑞幸咖啡券兑换资格",
        }),
      ]),
    );
    expect(snapshot.rewardPool.disabledRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "reward_today_title",
          enabled: false,
          effectSummary: "获得称号 legal_slacker",
        }),
      ]),
    );
    expect(snapshot.itemCatalog.availabilityCounts).toMatchObject({
      active_reward_pool: 12,
      eligible_but_not_in_pool: 1,
      unsupported_effect: 4,
      disabled_item: 0,
    });
    expect(snapshot.itemCatalog.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "lottery",
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "single_draw_guarantee_coupon",
              rewardPoolAvailability: "unsupported_effect",
              rewardPoolAvailabilityLabel: "不可进入奖池",
            }),
          ]),
        }),
        expect.objectContaining({
          category: "boost",
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "coin_rich_coupon",
              rewardPoolAvailability: "eligible_but_not_in_pool",
              rewardPoolAvailabilityLabel: "可进奖池但当前未投放",
            }),
          ]),
        }),
      ]),
    );
  });

  it("returns a passing validation snapshot for the shipped content", () => {
    const snapshot = buildGamificationConfigObservatorySnapshot({
      now: new Date("2026-05-02T12:00:00+08:00"),
    });

    expect(snapshot.validation.ok).toBe(true);
    expect(snapshot.validation.summary).toBe("当前游戏化配置校验通过。");
    expect(snapshot.validation.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "active_reward_total_weight",
          label: "Active 奖池总权重",
          status: "pass",
          detail: "当前 100，期望 100。",
        }),
        expect.objectContaining({
          key: "active_reward_tier_weights",
          label: "Active 奖池分层权重",
          status: "pass",
          detail: "coin 45 / utility 27 / social 24 / cosmetic 0 / rare 4。",
        }),
        expect.objectContaining({
          key: "content_validation",
          label: "内容结构校验",
          status: "pass",
          detail: "validateGamificationContent() 通过。",
        }),
      ]),
    );
  });
});
