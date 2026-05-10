import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "dashboard-gym-bg.webp", maxBytes: 450 * 1024 },
  { file: "niuma-hero.webp", maxBytes: 260 * 1024 },
  { file: "dock-backpack.webp", maxBytes: 90 * 1024 },
  { file: "dock-supply-machine.webp", maxBytes: 120 * 1024 },
  { file: "dock-task-record.webp", maxBytes: 90 * 1024 },
];

describe("supply dashboard media assets", () => {
  it.each(requiredAssets)(
    "ships $file within its size budget",
    ({ file, maxBytes }) => {
      const path = `public/assets/home-scenes/supply/dashboard/${file}`;

      expect(existsSync(path), `${file} should exist in public assets`).toBe(
        true,
      );
      expect(
        statSync(path).size,
        `${file} should stay within its size budget`,
      ).toBeLessThanOrEqual(maxBytes);
    },
  );
});
