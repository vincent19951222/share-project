import { describe, expect, it } from "vitest";
import { supplyUiLabCatalog } from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";
import { supplyShopAssetPaths, supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

describe("supply shop mock data", () => {
  it("derives every shop product from the shared buyable catalog", () => {
    const buyableCatalogItems = supplyUiLabCatalog.filter((item) => item.shop.buyable);

    expect(supplyShopMock.topBar.resources).toBe(supplyUiLabResources.shop);
    expect(supplyShopMock.sidebar.resources).toBe(supplyUiLabResources.shop);
    expect(supplyShopMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyShopMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyShopMock.products.map((product) => product.id)).toEqual(
      buyableCatalogItems.map((item) => item.sourceItemId),
    );
    expect(supplyShopMock.products).toHaveLength(12);
    expect(supplyShopMock.products.filter((product) => product.selected)).toHaveLength(1);
    expect(supplyShopMock.products.find((product) => product.selected)?.id).toBe("task_reroll_coupon");
  });

  it("keeps every product detail aligned with catalog price, effect, limits, and inventory", () => {
    for (const catalogItem of supplyUiLabCatalog.filter((item) => item.shop.buyable)) {
      const product = supplyShopMock.products.find((candidate) => candidate.id === catalogItem.sourceItemId);
      const detail = supplyShopMock.productDetails.find(
        (candidate) => candidate.productId === catalogItem.sourceItemId,
      );

      expect(product, catalogItem.sourceItemId).toMatchObject({
        id: catalogItem.sourceItemId,
        name: catalogItem.name,
        subtitle: catalogItem.effectSummary,
        image: catalogItem.media.image,
        ownedQuantity: catalogItem.inventory.quantity,
        requiresAdminConfirmation: catalogItem.shop.requiresAdminConfirmation,
        price: { currency: "coins", amount: catalogItem.shop.priceCoins },
      });
      expect(detail, catalogItem.sourceItemId).toMatchObject({
        productId: catalogItem.sourceItemId,
        description: catalogItem.description,
        effect: catalogItem.effectSummary,
        costLabel: `银子 ${catalogItem.shop.priceCoins}`,
        sourceLabel: "来源：抽卡池 / 商店",
        ownedLabel: `持有 ${catalogItem.inventory.quantity}`,
      });
      expect(detail?.useTiming.length, catalogItem.sourceItemId).toBeGreaterThan(0);
      expect(detail?.purchaseLimit.length, catalogItem.sourceItemId).toBeGreaterThan(0);
      expect(detail?.footnote.length, catalogItem.sourceItemId).toBeGreaterThan(0);
    }
  });

  it("models real-world redemption and removes old independent shop inventory", () => {
    const serializedMock = JSON.stringify(supplyShopMock);
    const coffeeProduct = supplyShopMock.products.find((product) => product.id === "luckin_coffee_coupon");
    const coffeeDetail = supplyShopMock.productDetails.find(
      (detail) => detail.productId === "luckin_coffee_coupon",
    );

    expect(coffeeProduct).toMatchObject({
      name: "瑞幸咖啡券",
      categoryId: "real_world",
      requiresAdminConfirmation: true,
    });
    expect(coffeeDetail).toMatchObject({
      adminConfirmationLabel: "真实福利：兑换后进入管理员确认流程",
      redeemLabel: "申请兑换",
      redeemFeedback: "兑换中：已提交管理员确认",
    });
    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("体力");
    expect(serializedMock).not.toContain("生命票");
    expect(serializedMock).not.toContain("学习时长券");
    expect(serializedMock).not.toContain("体力恢复剂");
    expect(serializedMock).not.toContain("轻食便当");
    expect(serializedMock).not.toContain("头像框");
    expect(serializedMock).not.toContain("称号");
    expect(serializedMock).not.toContain("健身牛马装扮");
    expect(serializedMock).not.toMatch(/shop-(sidebar|catalog|detail|topbar)-panel/);
  });

  it("keeps only catalog media paths in the rendered product set", () => {
    expect(supplyShopAssetPaths.profileAvatar).toBe("/avatars/male1.png");
    expect(supplyShopMock.products.map((product) => product.image)).toEqual(
      supplyUiLabCatalog.filter((item) => item.shop.buyable).map((item) => item.media.image),
    );
    expect(supplyShopMock.products.map((product) => product.image).join("\n")).not.toMatch(
      /\/assets\/home-scenes\/supply\/shop\//,
    );
    expect(Object.values(supplyShopAssetPaths.categoryIcons).every((src) => src.includes("/shop/categories/"))).toBe(
      true,
    );
  });
});
