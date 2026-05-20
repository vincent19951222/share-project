import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

const projectPath = (publicPath: string) => `public${decodeURIComponent(publicPath)}`;

describe("supply backpack static assets", () => {
  it("does not expose old cropped prototype or legacy backpack item assets", () => {
    const serializedMock = JSON.stringify(supplyBackpackMock);

    expect(serializedMock).not.toContain("backpack-sidebar-panel");
    expect(serializedMock).not.toContain("backpack-inventory-panel");
    expect(serializedMock).not.toContain("backpack-detail-panel");
    expect(serializedMock).not.toContain("/assets/home-scenes/supply/backpack/");
    expect(serializedMock).not.toContain("/assets/home-scenes/supply/shop/");
  });

  it("has all catalog-backed inventory and detail assets available", () => {
    const inventoryImages = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item.image] : [],
    );
    const detailImages = supplyBackpackMock.itemDetails.map((detail) => detail.image);
    const assets = [...new Set([...inventoryImages, ...detailImages])];

    expect(assets).toHaveLength(12);

    for (const asset of assets) {
      const filePath = projectPath(asset);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
      expect(statSync(filePath).size, `${filePath} should stay under 100 KB`).toBeLessThanOrEqual(
        100 * 1024,
      );
    }
  });
});
