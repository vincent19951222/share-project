import { describe, expect, it } from "vitest";
import {
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
} from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";
import { supplyDrawPoolAssetPaths, supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

describe("supply draw pool mock data", () => {
  it("uses shared Phase 2 resources and the approved draw-pool probabilities", () => {
    const serialized = JSON.stringify(supplyDrawPoolMock);

    expect(serialized).not.toMatch(
      /(topbar|wallet|guide|rates|probability|pity|rules|recent|machine)Panel|panelImage/,
    );
    expect(supplyDrawPoolMock.topBar.resources).toBe(supplyUiLabResources.drawPool);
    expect(supplyDrawPoolMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyDrawPoolMock.wallet.ticketBalance).toBe(18);
    expect(supplyDrawPoolMock.wallet.helper).toBe("今日获取上限：18/30 张抽奖券");
    expect(supplyDrawPoolMock.poolRates.map((rate) => `${rate.tier}:${rate.percent}`)).toEqual([
      "coin:45",
      "utility:27",
      "social:24",
      "rare:4",
    ]);
    expect(serialized).not.toContain("补给券");
    expect(serialized).not.toContain("保底进度");
    expect(serialized).not.toContain("48/70");
  });

  it("models ten-draw batch guarantee and no single-draw guarantee", () => {
    expect(supplyDrawPoolMock.guarantee).toEqual({
      title: "十连保底说明",
      description: "单抽没有保底；十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。",
      eligibleTiers: ["utility", "social", "rare"],
      eligibleTierLabels: ["实用", "社交", "稀有"],
    });
    expect(supplyDrawPoolMock.machine.actions.find((action) => action.id === "single")).toMatchObject({
      drawCount: 1,
      costTicket: 1,
      guaranteeLabel: "单抽无保底",
    });
    expect(supplyDrawPoolMock.machine.actions.find((action) => action.id === "ten")).toMatchObject({
      drawCount: 10,
      costTicket: 10,
      guaranteeLabel: "十连批次保底",
    });
    expect(supplyDrawPoolMock.rules).toEqual([
      "消耗抽奖券进行抽取，随机获得银子、实用道具、社交道具或稀有奖励。",
      "单抽没有保底。",
      "十连批次如果自然十连没有实用、社交或稀有奖励，则补 1 个合格奖励。",
    ]);
  });

  it("derives recent drops and local draw results from shared coin rows and catalog items", () => {
    const catalogIds = supplyUiLabCatalog.map((item) => item.sourceItemId);
    const coinRewardIds = SUPPLY_UI_LAB_COIN_REWARD_ROWS.map((row) => row.rewardId);

    expect(supplyDrawPoolMock.recentDrops).toHaveLength(6);
    expect(supplyDrawPoolMock.recentDrops[0]).toMatchObject({
      id: "coins_120",
      name: "牛马暴富",
      quantityLabel: "银子 x120",
    });
    expect(catalogIds).toContain(supplyDrawPoolMock.recentDrops[1]?.id);
    expect(supplyDrawPoolMock.singleDrawResult).toEqual([
      expect.objectContaining({
        id: "coins_020",
        name: "今日没白来",
        quantityLabel: "银子 x20",
      }),
    ]);
    expect(supplyDrawPoolMock.tenDrawResult).toHaveLength(10);
    expect(supplyDrawPoolMock.tenDrawResult.some((result) => coinRewardIds.includes(result.id))).toBe(true);
    expect(supplyDrawPoolMock.tenDrawResult.some((result) => catalogIds.includes(result.id))).toBe(true);
    expect(
      supplyDrawPoolMock.tenDrawResult.some((result) =>
        ["utility", "social", "rare"].includes(result.tier),
      ),
    ).toBe(true);
  });

  it("keeps draw-pool media isolated while reusing catalog reward art", () => {
    expect(supplyDrawPoolAssetPaths.drawPool.machine).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/draw-pool-machine.webp");
    expect(Object.entries(supplyDrawPoolAssetPaths.drawPool).every(([key, path]) =>
      key === "machine" || path.includes("share_project_public_assets_home_scenes_supply_draw_pool_"),
    )).toBe(true);
    expect(supplyDrawPoolAssetPaths.rewardIcons.ticket).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_task_reroll_coupon.png");
    expect(supplyDrawPoolAssetPaths.rewardIcons.coins).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_120.png");
    expect(supplyDrawPoolMock.recentDrops.every((drop) => drop.image.startsWith("https://"))).toBe(true);
    expect(supplyDrawPoolMock.singleDrawResult.every((result) => result.image.startsWith("https://"))).toBe(true);
    expect(supplyDrawPoolMock.tenDrawResult.every((result) => result.image.startsWith("https://"))).toBe(true);
  });
});
