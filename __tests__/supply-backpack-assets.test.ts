import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyBackpackAssetPaths } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

const projectPath = (publicPath: string) => `public${decodeURIComponent(publicPath)}`;

describe("supply backpack static assets", () => {
  it("does not expose cropped prototype panel assets to the backpack runtime contract", () => {
    expect(JSON.stringify(supplyBackpackAssetPaths)).not.toContain("backpack-sidebar-panel");
    expect(JSON.stringify(supplyBackpackAssetPaths)).not.toContain("backpack-inventory-panel");
    expect(JSON.stringify(supplyBackpackAssetPaths)).not.toContain("backpack-detail-panel");
  });

  it("has required backpack item assets within size budgets", () => {
    const requiredAssets = Object.values(supplyBackpackAssetPaths.backpackItems);

    expect(requiredAssets).toHaveLength(10);

    for (const asset of requiredAssets) {
      const filePath = projectPath(asset);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
      expect(statSync(filePath).size, `${filePath} should stay under 100 KB`).toBeLessThanOrEqual(
        100 * 1024,
      );
    }
  });

  it("reuses existing reward and shop assets", () => {
    for (const asset of Object.values(supplyBackpackAssetPaths.reused)) {
      const filePath = projectPath(asset);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
    }
  });
});
