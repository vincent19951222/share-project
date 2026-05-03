import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "office-wall-bg.webp", maxBytes: 420 * 1024 },
  { file: "cork-board-bg.webp", maxBytes: 520 * 1024 },
  { file: "clipboard-clip.webp", maxBytes: 140 * 1024 },
  { file: "poster-no-excuses.webp", maxBytes: 180 * 1024 },
  { file: "poster-focus-train-win.webp", maxBytes: 180 * 1024 },
  { file: "discipline-note.webp", maxBytes: 160 * 1024 },
  { file: "dumbbell-edge.webp", maxBytes: 160 * 1024 },
  { file: "marker-pen.webp", maxBytes: 160 * 1024 },
  { file: "pushpin-red.webp", maxBytes: 48 * 1024 },
  { file: "pushpin-blue.webp", maxBytes: 48 * 1024 },
  { file: "pushpin-yellow.webp", maxBytes: 48 * 1024 },
  { file: "paper-tape.webp", maxBytes: 80 * 1024 },
  { file: "paperclip.webp", maxBytes: 80 * 1024 },
] as const;

describe("home shared board scene assets", () => {
  it("ships compressed project-bound WebP assets for the office note wall", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/shared-board/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
    }
  });
});
