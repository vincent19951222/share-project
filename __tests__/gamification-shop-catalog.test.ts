import { describe, expect, it } from "vitest";
import { getShopCatalogItem, getShopCatalogItems } from "@/content/gamification/shop-catalog";
import { getItemDefinition } from "@/lib/gamification/content";

describe("gamification shop catalog", () => {
  it("exposes the approved buyable item ids with prices and limits", () => {
    const items = getShopCatalogItems();

    expect(items.map((item) => item.itemId)).toEqual([
      "task_reroll_coupon",
      "small_boost_coupon",
      "fitness_leave_coupon",
      "drink_water_ping",
      "walk_ping",
      "team_standup_ping",
      "chat_ping",
      "share_info_ping",
      "team_broadcast_coupon",
      "double_niuma_coupon",
      "season_sprint_coupon",
      "luckin_coffee_coupon",
    ]);
    expect(getShopCatalogItem("task_reroll_coupon")).toMatchObject({
      itemId: "task_reroll_coupon",
      priceCoins: 150,
      dailyLimit: 1,
    });
    expect(getShopCatalogItem("double_niuma_coupon")).toMatchObject({
      itemId: "double_niuma_coupon",
      priceCoins: 600,
      weeklyLimit: 1,
    });
    expect(getShopCatalogItem("luckin_coffee_coupon")).toMatchObject({
      itemId: "luckin_coffee_coupon",
      priceCoins: 500,
      dailyLimit: 1,
    });
  });

  it("only references enabled content item definitions", () => {
    for (const item of getShopCatalogItems()) {
      const definition = getItemDefinition(item.itemId);
      expect(definition?.enabled, item.itemId).toBe(true);
      expect(item.priceCoins, item.itemId).toBeGreaterThan(0);
    }
  });

  it("keeps non-approved lottery helper items out of the shop", () => {
    expect(getShopCatalogItem("single_draw_guarantee_coupon")).toBeNull();
    expect(getShopCatalogItems().some((item) => item.itemId === "single_draw_guarantee_coupon")).toBe(
      false,
    );
  });
});
