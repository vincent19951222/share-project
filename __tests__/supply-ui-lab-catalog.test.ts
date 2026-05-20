import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "@/content/gamification/item-definitions";
import { REWARD_DEFINITIONS } from "@/content/gamification/reward-pool";
import {
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS,
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS,
  SUPPLY_UI_LAB_ITEM_MEDIA,
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

function publicPath(src: string) {
  return join(process.cwd(), "public", src.replace(/^\//, ""));
}

function alphaFromPixel(pixel: string) {
  const match = /s?rgba?\([^,]+,[^,]+,[^,]+(?:,([^)]+))?\)/.exec(pixel);

  return match?.[1] ? Number(match[1]) : 1;
}

function identifyWebp(path: string) {
  const output = execFileSync(
    "magick",
    [
      "identify",
      "-format",
      "%m\n%w\n%h\n%[channels]\n%[fx:minima.a]\n%[pixel:p{0,0}]\n%[pixel:p{10,10}]\n%[fx:mean.a]",
      path,
    ],
    { encoding: "utf8" },
  );
  const [format, width, height, channels, alphaMin, topLeft, insetTopLeft, alphaMean] =
    output.trim().split("\n");

  return {
    format,
    width: Number(width),
    height: Number(height),
    channels,
    alphaMin: Number(alphaMin),
    topLeft,
    insetTopLeft,
    alphaMean: Number(alphaMean),
  };
}

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
      expect(item.media.image, sourceItemId).toMatch(
        /^\/(?:gamification\/rewards\/icons\/.+\.png|assets\/home-scenes\/supply\/items\/.+\.webp)$/,
      );
      expect(item.media.assetStatus, sourceItemId).toMatch(/^(existing|needs_generated)$/);
    }
  });

  it("marks only task-02 item assets as generated UI Lab media", () => {
    expect(SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS).toEqual([
      "fitness_leave_coupon",
      "drink_water_ping",
      "walk_ping",
      "team_standup_ping",
      "chat_ping",
      "share_info_ping",
      "double_niuma_coupon",
      "season_sprint_coupon",
    ]);

    expect(
      supplyUiLabCatalog
        .filter((item) => item.media.assetStatus === "needs_generated")
        .map((item) => item.sourceItemId),
    ).toEqual(SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS);

    expect(supplyUiLabCatalogBySourceItemId.task_reroll_coupon.media).toEqual({
      image: "/gamification/rewards/icons/task_reroll_coupon.png",
      assetStatus: "existing",
    });
    expect(supplyUiLabCatalogBySourceItemId.small_boost_coupon.media).toEqual({
      image: "/gamification/rewards/icons/small_boost_coupon.png",
      assetStatus: "existing",
    });
    expect(supplyUiLabCatalogBySourceItemId.team_broadcast_coupon.media).toEqual({
      image: "/gamification/rewards/icons/team_broadcast_coupon.png",
      assetStatus: "existing",
    });
    expect(supplyUiLabCatalogBySourceItemId.luckin_coffee_coupon.media).toEqual({
      image: "/gamification/rewards/icons/luckin_coffee_coupon.png",
      assetStatus: "existing",
    });

    expect(SUPPLY_UI_LAB_ITEM_MEDIA.fitness_leave_coupon).toEqual({
      image: "/assets/home-scenes/supply/items/fitness-leave-coupon.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.drink_water_ping).toEqual({
      image: "/assets/home-scenes/supply/items/drink-water-ping.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.walk_ping).toEqual({
      image: "/assets/home-scenes/supply/items/walk-ping.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.team_standup_ping).toEqual({
      image: "/assets/home-scenes/supply/items/team-standup-ping.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.chat_ping).toEqual({
      image: "/assets/home-scenes/supply/items/chat-ping.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.share_info_ping).toEqual({
      image: "/assets/home-scenes/supply/items/share-info-ping.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.double_niuma_coupon).toEqual({
      image: "/assets/home-scenes/supply/items/double-niuma-coupon.webp",
      assetStatus: "needs_generated",
    });
    expect(SUPPLY_UI_LAB_ITEM_MEDIA.season_sprint_coupon).toEqual({
      image: "/assets/home-scenes/supply/items/season-sprint-coupon.webp",
      assetStatus: "needs_generated",
    });
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

  it("ships generated atomic item art as transparent WebP files", () => {
    const itemDirectory = join(process.cwd(), "public/assets/home-scenes/supply/items");
    const generatedItems = supplyUiLabCatalog.filter(
      (item) => item.media.assetStatus === "needs_generated",
    );

    expect(existsSync(itemDirectory), "supply item asset directory should exist").toBe(true);
    expect(generatedItems.map((item) => item.sourceItemId)).toEqual(
      SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS,
    );
    expect(readdirSync(itemDirectory).join("\n")).not.toMatch(
      /(?:panel|prototype|screenshot|design|ui-assets|商店|背包|抽卡|任务记录)/,
    );

    for (const item of generatedItems) {
      const path = publicPath(item.media.image);
      const image = identifyWebp(path);

      expect(item.media.image, item.sourceItemId).toMatch(
        /^\/assets\/home-scenes\/supply\/items\/[a-z0-9-]+\.webp$/,
      );
      expect(existsSync(path), item.sourceItemId).toBe(true);
      expect(
        statSync(path).size,
        `${item.sourceItemId} should stay within the item icon budget`,
      ).toBeLessThanOrEqual(140 * 1024);
      expect(image.format, item.sourceItemId).toBe("WEBP");
      expect(image.width, item.sourceItemId).toBe(image.height);
      expect(image.width, item.sourceItemId).toBeGreaterThanOrEqual(256);
      expect(image.width, item.sourceItemId).toBeLessThanOrEqual(1024);
      expect(image.channels, item.sourceItemId).toContain("a");
      expect(
        image.alphaMin,
        `${item.sourceItemId} should contain fully transparent pixels`,
      ).toBeLessThanOrEqual(0.05);
      expect(
        alphaFromPixel(image.topLeft),
        `${item.sourceItemId} top-left corner should be transparent`,
      ).toBeLessThanOrEqual(0.1);
      expect(
        alphaFromPixel(image.insetTopLeft),
        `${item.sourceItemId} padded corner should be transparent`,
      ).toBeLessThanOrEqual(0.1);
      expect(image.alphaMean, `${item.sourceItemId} should not be blank`).toBeGreaterThan(0.04);
      expect(
        image.alphaMean,
        `${item.sourceItemId} should remain an isolated prop, not a full panel`,
      ).toBeLessThan(0.85);
    }
  });
});
