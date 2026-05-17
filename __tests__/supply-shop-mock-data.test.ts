import { describe, expect, it } from "vitest";
import { supplyShopAssetPaths, supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

describe("supply shop mock data", () => {
  it("covers the static shop state required by the spec", () => {
    expect(supplyShopMock.topBar.resources.map((resource) => resource.value)).toEqual(["3,850", "18", "68/120"]);
    expect(supplyShopMock.sidebar.resources.map((resource) => resource.value)).toEqual(["3,850", "18"]);
    expect(supplyShopMock.sidebar.categories).toHaveLength(6);
    expect(supplyShopMock.sidebar.categories.find((category) => category.active)?.label).toBe("今日推荐");
    expect(supplyShopMock.filters.map((filter) => filter.label)).toEqual(["全部", "可兑换", "已拥有"]);
    expect(supplyShopMock.filters.find((filter) => filter.active)?.id).toBe("all");
    expect(supplyShopMock.selectedSort).toBe("默认排序");
    expect(supplyShopMock.products).toHaveLength(11);
    expect(supplyShopMock.products.filter((product) => product.selected)).toHaveLength(1);
    expect(JSON.stringify(supplyShopMock)).not.toContain("panelImages");
    expect(JSON.stringify(supplyShopMock)).not.toMatch(
      /shop-(sidebar|catalog|detail|topbar)-panel/,
    );
  });

  it("models the selected task reroll product and key shop labels", () => {
    const selected = supplyShopMock.products.find((product) => product.selected);

    expect(selected?.name).toBe("任务重置券");
    expect(selected?.price).toEqual({ currency: "coins", amount: 150 });
    expect(selected?.dailyLimit).toEqual({ label: "每日限购 1/1", used: 1, total: 1 });
    expect(supplyShopMock.selectedProductDetail.productId).toBe("task-reroll");
    expect(supplyShopMock.selectedProductDetail.costLabel).toBe("银子 150");
    expect(supplyShopMock.selectedProductDetail.redeemDisabled).toBe(true);
    expect(supplyShopMock.selectedProductDetail.redeemDisabledReason).toBe("今日已达限购");

    const allTags = supplyShopMock.products.flatMap((product) => product.tags);
    expect(allTags).toEqual(
      expect.arrayContaining(["推荐", "限量", "剩余 5", "剩余 3", "剩余 2", "需要管理员确认", "SR", "SSR"]),
    );
    expect(supplyShopMock.products.some((product) => product.requiresAdminConfirmation)).toBe(true);
    expect(supplyShopMock.products.filter((product) => product.categoryId === "cosmetic")).toHaveLength(3);
  });

  it("reuses existing reward icons and isolates new shop item media", () => {
    expect(supplyShopAssetPaths.rewardIcons.taskReroll).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(supplyShopAssetPaths.rewardIcons.boost).toBe("/gamification/rewards/icons/small_boost_coupon.png");
    expect(supplyShopAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
    expect(JSON.stringify(supplyShopAssetPaths)).not.toMatch(
      /shop-(sidebar|catalog|detail|topbar)-panel/,
    );
    expect(Object.values(supplyShopAssetPaths.shopItems).every((path) => path.startsWith("/assets/home-scenes/supply/shop/"))).toBe(true);
  });
});
