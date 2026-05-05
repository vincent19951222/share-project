import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "coffee-counter-bg.webp", maxBytes: 450 * 1024 },
  { file: "receipt-paper-texture.webp", maxBytes: 320 * 1024 },
  { file: "takeaway-cup.webp", maxBytes: 180 * 1024 },
  { file: "note-no-coffee-no-gain.webp", maxBytes: 160 * 1024 },
  { file: "note-but-first-coffee.webp", maxBytes: 160 * 1024 },
  { file: "sugar-packet.webp", maxBytes: 120 * 1024 },
  { file: "coffee-beans.webp", maxBytes: 120 * 1024 },
  { file: "coffee-ring-stain.webp", maxBytes: 100 * 1024 },
  { file: "coffee-stamp-paper.webp", maxBytes: 160 * 1024 },
  { file: "receipt-clip.webp", maxBytes: 120 * 1024 },
] as const;

describe("home coffee scene assets", () => {
  it("ships compressed project-bound WebP assets for the coffee receipt counter", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/coffee/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
    }
  });
});
