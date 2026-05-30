import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";
import { supplyUiLabCatalog } from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";

describe("supply backpack mock data", () => {
  it("uses shared Phase 2 resources, effects, and fixed 60-slot capacity", () => {
    const serializedMock = JSON.stringify(supplyBackpackMock);

    expect(supplyBackpackMock.topBar.resources).toBe(supplyUiLabResources.backpack);
    expect(supplyBackpackMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyBackpackMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyBackpackMock.sidebar.capacity).toBe("18/60");
    expect(supplyBackpackMock.sidebar.todayEffects).toBe(supplyUiLabActiveEffects);
    expect(supplyBackpackMock.sidebar.categories.map((category) => category.iconImage)).toEqual([
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_all.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_boost.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_task.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_social.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_real_world.png",
    ]);
    expect(supplyBackpackMock.inventory.page).toBe(1);
    expect(supplyBackpackMock.inventory.pageSize).toBe(20);
    expect(supplyBackpackMock.inventory.totalSlots).toBe(60);
    expect(supplyBackpackMock.inventory.totalPages).toBe(3);
    expect(supplyBackpackMock.inventory.slots).toHaveLength(60);
    expect(supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "item")).toHaveLength(12);
    expect(supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "empty")).toHaveLength(48);
    expect(serializedMock).not.toContain("locked");
    expect(serializedMock).not.toContain("扩容");
    expect(serializedMock).not.toContain("帮助中心");
    expect(serializedMock).not.toContain("体力");
    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("生命票");
  });

  it("derives inventory items and details from the shared catalog", () => {
    const itemSlots = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item] : [],
    );
    const catalogItems = supplyUiLabCatalog.filter((item) => item.inventory.quantity > 0);

    expect(itemSlots.map((item) => item.id)).toEqual(catalogItems.map((item) => item.sourceItemId));
    expect(itemSlots.map((item) => item.quantity)).toEqual(
      catalogItems.map((item) => item.inventory.quantity),
    );
    expect(supplyBackpackMock.itemDetails.map((detail) => detail.itemId)).toEqual(
      catalogItems.map((item) => item.sourceItemId),
    );
    expect(supplyBackpackMock.selectedItemDetail).toMatchObject({
      itemId: "task_reroll_coupon",
      name: "任务换班券",
      ownedQuantity: 2,
      tag: "任务",
      requiresAdminConfirmation: false,
    });
  });

  it("keeps catalog rarity and real-world redemption semantics available", () => {
    const items = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item] : [],
    );
    const coffeeDetail = supplyBackpackMock.itemDetails.find(
      (detail) => detail.itemId === "luckin_coffee_coupon",
    );

    expect(new Set(items.map((item) => item.rarity))).toEqual(new Set(["N", "R", "SR", "SSR"]));
    expect(items.find((item) => item.id === "luckin_coffee_coupon")).toMatchObject({
      name: "瑞幸咖啡券",
      quantity: 1,
      rarity: "SR",
      categoryId: "real",
    });
    expect(coffeeDetail).toMatchObject({
      itemId: "luckin_coffee_coupon",
      secondaryAction: "申请兑换",
      requiresAdminConfirmation: true,
      redemptionStateLabel: "等待管理员确认",
    });
  });
});
