import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "editor-desk-bg.webp", maxBytes: 420 * 1024 },
  { file: "binder-clip-left.webp", maxBytes: 90 * 1024 },
  { file: "keep-going-stamp.webp", maxBytes: 80 * 1024 },
  { file: "mini-chart-slip.webp", maxBytes: 120 * 1024 },
  { file: "vault-safe-yellow.webp", maxBytes: 140 * 1024 },
  { file: "discipline-note.webp", maxBytes: 120 * 1024 },
  { file: "no-excuses-note.webp", maxBytes: 120 * 1024 },
  { file: "bar-chart-note.webp", maxBytes: 120 * 1024 },
  { file: "stronger-stamp.webp", maxBytes: 90 * 1024 },
  { file: "focus-marker.webp", maxBytes: 140 * 1024 },
];

describe("home report scene assets", () => {
  it.each(requiredAssets)("ships $file within its size budget", ({ file, maxBytes }) => {
    const path = `public/assets/home-scenes/report/${file}`;

    expect(existsSync(path), `${file} should exist in public assets`).toBe(true);
    expect(statSync(path).size, `${file} should stay within its size budget`).toBeLessThanOrEqual(
      maxBytes,
    );
  });
});
