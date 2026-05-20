import { describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "@/content/gamification/item-definitions";
import { REWARD_DEFINITIONS } from "@/content/gamification/reward-pool";
import {
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS,
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";

const activeNonCoinRewardItemIds = REWARD_DEFINITIONS.flatMap((reward) => {
  if (!reward.enabled || reward.kind === "coins") {
    return [];
  }

  if (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") {
    return [reward.effect.itemId];
  }

  return [];
});

const activeCoinRewardIds = REWARD_DEFINITIONS.filter(
  (reward) => reward.enabled && reward.kind === "coins",
).map((reward) => reward.id);

describe("Supply UI Lab shared catalog data", () => {
  it("matches every active non-coin draw reward from the production content config", () => {
    expect(SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS).toEqual(activeNonCoinRewardItemIds);

    for (const sourceItemId of SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS) {
      const item = supplyUiLabCatalogBySourceItemId[sourceItemId];
      const sourceItem = ITEM_DEFINITIONS.find((definition) => definition.id === sourceItemId);

      expect(item, sourceItemId).toBeDefined();
      expect(sourceItem, sourceItemId).toBeDefined();
      expect(item.name, sourceItemId).toBe(sourceItem?.name);
      expect(item.description, sourceItemId).toBe(sourceItem?.description);
      expect(item.drawPool.drawable, sourceItemId).toBe(true);
      expect(item.shop.buyable, sourceItemId).toBe(true);
      expect(item.obtainSources, sourceItemId).toEqual(["draw_pool", "shop"]);
      expect(item.inventory.quantity, sourceItemId).toBeGreaterThanOrEqual(0);
      expect(item.media.image, sourceItemId).toMatch(/^\/gamification\/rewards\/icons\/.+\.png$/);
    }
  });

  it("keeps coin rewards available for draws but outside shop and backpack catalog slots", () => {
    expect(SUPPLY_UI_LAB_COIN_REWARD_ROWS.map((row) => row.rewardId)).toEqual(activeCoinRewardIds);
    expect(supplyUiLabCatalog.map((item) => item.sourceItemId)).not.toEqual(
      expect.arrayContaining(activeCoinRewardIds),
    );
    expect(SUPPLY_UI_LAB_COIN_REWARD_ROWS.every((row) => row.amount > 0)).toBe(true);
  });

  it("uses only the shared top bar resource vocabulary", () => {
    for (const resources of Object.values(supplyUiLabResources)) {
      expect(resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
      expect(resources.map((resource) => resource.id)).toEqual(["coins", "ticket", "backpack"]);
    }

    expect(JSON.stringify(supplyUiLabResources)).not.toContain("补给券");
    expect(JSON.stringify(supplyUiLabResources)).not.toContain("体力");
  });

  it("shares only business-sourced today effects", () => {
    expect(supplyUiLabActiveEffects).toEqual([
      expect.objectContaining({ sourceItemId: "small_boost_coupon", statusLabel: "今日待生效" }),
      expect.objectContaining({ sourceItemId: "season_sprint_coupon", statusLabel: "今日已生效" }),
    ]);

    for (const effect of supplyUiLabActiveEffects) {
      expect(supplyUiLabCatalogBySourceItemId[effect.sourceItemId], effect.sourceItemId).toBeDefined();
      expect(effect.businessSource.length).toBeGreaterThan(0);
      expect(effect.endsAtLabel).toBe("今日 23:59");
    }

    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("体力");
    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("步数加成");
    expect(JSON.stringify(supplyUiLabActiveEffects)).not.toContain("经验获取");
  });
});
