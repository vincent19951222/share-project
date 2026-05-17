import { existsSync, readdirSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyDrawPoolAssetPaths } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

const requiredDrawPoolAssets = [
  ["draw-pool-machine.png", 1600 * 1024],
  ["draw-pool-capsule-bed.webp", 280 * 1024],
  ["draw-pool-guide-mascot.webp", 160 * 1024],
  ["draw-pool-wristband.webp", 90 * 1024],
  ["draw-pool-running-shoe.webp", 90 * 1024],
] as const;

function publicPath(src: string) {
  return `public${src}`;
}

describe("supply draw pool static assets", () => {
  it("ships required final draw-pool assets within size budgets", () => {
    for (const [fileName, maxBytes] of requiredDrawPoolAssets) {
      const path = `public/assets/home-scenes/supply/draw-pool/${fileName}`;
      expect(existsSync(path), `${path} should exist`).toBe(true);
      expect(statSync(path).size, `${path} should fit budget`).toBeLessThanOrEqual(maxBytes);
    }
  });

  it("does not ship cropped draw-pool panel UI assets", () => {
    const fileNames = readdirSync("public/assets/home-scenes/supply/draw-pool");

    expect(fileNames.join("\n")).not.toMatch(
      /draw-pool-(topbar|wallet|guide|rates|probability|pity|rules|recent|machine)-panel\.(png|webp)/,
    );
  });

  it("references existing reusable dashboard and reward assets", () => {
    expect(existsSync(publicPath(supplyDrawPoolAssetPaths.background))).toBe(true);
    expect(existsSync(publicPath(supplyDrawPoolAssetPaths.logo))).toBe(true);

    for (const src of Object.values(supplyDrawPoolAssetPaths.rewardIcons)) {
      expect(existsSync(publicPath(src)), `${src} should exist`).toBe(true);
    }
  });
});
