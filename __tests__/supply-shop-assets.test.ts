import { describe, expect, it } from "vitest";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

const COS_IMAGE_PREFIX = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/";

describe("supply shop static assets", () => {
  it("references existing catalog-backed product media", () => {
    for (const product of supplyShopMock.products) {
      expect(product.image.startsWith(COS_IMAGE_PREFIX), `${product.image} should use COS media`).toBe(true);
    }
  });

  it("references generated transparent category icon media", () => {
    for (const category of supplyShopMock.sidebar.categories) {
      expect(category.iconImage, `${category.id} should use an image icon`).toMatch(
        /share_project_public_assets_home_scenes_supply_shop_categories_category_.+\.png$/,
      );
    }
  });

  it("does not reference retired independent shop item media", () => {
    const productImages = supplyShopMock.products.map((product) => product.image);

    expect(productImages.every((src) => !src.includes("/assets/home-scenes/supply/shop/"))).toBe(true);
  });
});
