import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "gym-wall-bg.webp", maxBytes: 450 * 1024 },
  { file: "gym-floor-strip.webp", maxBytes: 260 * 1024 },
  { file: "poster-no-pain.webp", maxBytes: 180 * 1024 },
  { file: "stopwatch-keep-going.webp", maxBytes: 180 * 1024 },
  { file: "dumbbell-corner.webp", maxBytes: 180 * 1024 },
  { file: "poster-believe.webp", maxBytes: 180 * 1024 },
  { file: "towel-bar.webp", maxBytes: 180 * 1024 },
  { file: "vault-safe.webp", maxBytes: 80 * 1024 },
];

describe("home punch scene assets", () => {
  it("ships compressed project-bound WebP assets for the punch scene", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/punch/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
    }
  });
});
