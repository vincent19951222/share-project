import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

const COS_IMAGE_PREFIX = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/";

describe("supply backpack static assets", () => {
  it("does not expose old cropped prototype or legacy backpack item assets", () => {
    const serializedMock = JSON.stringify(supplyBackpackMock);

    expect(serializedMock).not.toContain("backpack-sidebar-panel");
    expect(serializedMock).not.toContain("backpack-inventory-panel");
    expect(serializedMock).not.toContain("backpack-detail-panel");
    expect(serializedMock).not.toContain("/assets/home-scenes/supply/backpack/");
    expect(serializedMock).not.toMatch(/\/assets\/home-scenes\/supply\/shop\/(?!categories\/)/);
  });

  it("uses uploaded catalog-backed inventory and detail assets", () => {
    const inventoryImages = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item.image] : [],
    );
    const detailImages = supplyBackpackMock.itemDetails.map((detail) => detail.image);
    const assets = [...new Set([...inventoryImages, ...detailImages])];

    expect(assets).toHaveLength(12);

    for (const asset of assets) {
      expect(asset.startsWith(COS_IMAGE_PREFIX), `${asset} should use COS media`).toBe(true);
    }
  });

  it("reuses existing transparent category icon media for the sidebar", () => {
    for (const category of supplyBackpackMock.sidebar.categories) {
      expect(category.iconImage, `${category.id} should use an image icon`).toMatch(
        /share_project_public_assets_home_scenes_supply_shop_categories_category_.+\.png$/,
      );
    }
  });
});
