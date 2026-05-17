import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyShopAssetPaths } from "@/components/gamification/ui-lab/supply-shop/mock-data";

const requiredShopAssets = [
  ["shop-learning-pass.webp", 90 * 1024],
  ["shop-energy-bottle.webp", 90 * 1024],
  ["shop-training-log.webp", 90 * 1024],
  ["shop-light-meal.webp", 100 * 1024],
  ["shop-avatar-frame.webp", 100 * 1024],
  ["shop-title-badge.webp", 100 * 1024],
  ["shop-fitness-outfit.webp", 100 * 1024],
] as const;

function publicPath(src: string) {
  return `public${src}`;
}

describe("supply shop static assets", () => {
  it("ships required final shop item assets within size budgets", () => {
    for (const [fileName, maxBytes] of requiredShopAssets) {
      const path = `public/assets/home-scenes/supply/shop/${fileName}`;
      expect(existsSync(path), `${path} should exist`).toBe(true);
      expect(statSync(path).size, `${path} should fit budget`).toBeLessThanOrEqual(maxBytes);
    }
  });

  it("references existing reusable reward icons", () => {
    for (const src of Object.values(supplyShopAssetPaths.rewardIcons)) {
      expect(existsSync(publicPath(src)), `${src} should exist`).toBe(true);
    }
  });
});
