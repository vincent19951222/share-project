import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "calendar-desk-bg.webp", maxBytes: 450 * 1024 },
  { file: "binder-paper-texture.webp", maxBytes: 260 * 1024 },
  { file: "binder-rings-left.webp", maxBytes: 120 * 1024 },
  { file: "binder-clip.webp", maxBytes: 120 * 1024 },
  { file: "highlighter-focus-progress.webp", maxBytes: 160 * 1024 },
  { file: "sticker-just-lift.webp", maxBytes: 120 * 1024 },
  { file: "note-keep-going-purple.webp", maxBytes: 140 * 1024 },
  { file: "calendar-coffee-stamp-paper.webp", maxBytes: 140 * 1024 },
  { file: "calendar-coffee-ring-stain.webp", maxBytes: 100 * 1024 },
];

describe("home calendar scene assets", () => {
  it("ships compressed project-bound WebP assets for the calendar scene", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/calendar/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
      expect(path).not.toContain("$CODEX_HOME");
      expect(path).not.toContain("/private/tmp");
    }
  });
});
