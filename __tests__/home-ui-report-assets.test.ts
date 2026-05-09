import { execFileSync } from "child_process";
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "editor-desk-bg.webp", maxBytes: 420 * 1024, alpha: false },
  { file: "binder-clip-left.webp", maxBytes: 90 * 1024, alpha: true },
  { file: "keep-going-stamp.webp", maxBytes: 80 * 1024, alpha: true },
  { file: "mini-chart-slip.webp", maxBytes: 120 * 1024, alpha: true },
  { file: "vault-safe-yellow.webp", maxBytes: 140 * 1024, alpha: true },
  { file: "discipline-note.webp", maxBytes: 120 * 1024, alpha: true },
  { file: "no-excuses-note.webp", maxBytes: 120 * 1024, alpha: true },
  { file: "bar-chart-note.webp", maxBytes: 120 * 1024, alpha: true },
  { file: "stronger-stamp.webp", maxBytes: 90 * 1024, alpha: true },
  { file: "focus-marker.webp", maxBytes: 140 * 1024, alpha: true },
];

function identifyImage(path: string) {
  const output = execFileSync(
    "magick",
    [
      "identify",
      "-format",
      "%[channels]\n%[fx:minima.a]\n%[pixel:p{0,0}]\n%[pixel:p{10,10}]",
      path,
    ],
    { encoding: "utf8" },
  );
  const [channels, alphaMin, topLeft, insetTopLeft] = output.trim().split("\n");

  return {
    channels,
    alphaMin: Number(alphaMin),
    topLeft,
    insetTopLeft,
  };
}

function alphaFromPixel(pixel: string) {
  const match = /s?rgba?\([^,]+,[^,]+,[^,]+(?:,([^)]+))?\)/.exec(pixel);
  return match?.[1] ? Number(match[1]) : 1;
}

function greenScreenResidueRatio(path: string) {
  const output = execFileSync(
    "magick",
    [
      path,
      "-alpha",
      "on",
      "-fx",
      "((g>0.45)&&(g-r>0.12)&&(g-b>0.12)&&(a>0.15))?1:0",
      "-format",
      "%[fx:mean]",
      "info:",
    ],
    { encoding: "utf8" },
  );

  return Number(output.trim());
}

describe("home report scene assets", () => {
  it.each(requiredAssets)("ships $file within its size budget", ({ file, maxBytes }) => {
    const path = `public/assets/home-scenes/report/${file}`;

    expect(existsSync(path), `${file} should exist in public assets`).toBe(true);
    expect(statSync(path).size, `${file} should stay within its size budget`).toBeLessThanOrEqual(
      maxBytes,
    );
  });

  it.each(requiredAssets.filter((asset) => asset.alpha))(
    "ships $file as a real alpha prop without chroma-key residue",
    ({ file }) => {
      const path = `public/assets/home-scenes/report/${file}`;
      const image = identifyImage(path);

      expect(image.channels, `${file} should have an alpha channel`).toContain("a");
      expect(image.alphaMin, `${file} should contain fully transparent background pixels`).toBeLessThanOrEqual(0.05);
      expect(alphaFromPixel(image.topLeft), `${file} top-left corner should be transparent`).toBeLessThanOrEqual(0.1);
      expect(alphaFromPixel(image.insetTopLeft), `${file} padded corner should be transparent`).toBeLessThanOrEqual(0.1);
      expect(`${image.topLeft} ${image.insetTopLeft}`, `${file} should not retain green-screen pixels`).not.toMatch(
        /rgba?\((?:[0-9]|1[0-9]),\s*2[3-5][0-9],\s*(?:[0-4][0-9]|[0-9])/,
      );
      expect(
        greenScreenResidueRatio(path),
        `${file} should not leave visible green-screen pixels inside the prop silhouette`,
      ).toBeLessThanOrEqual(0.002);
    },
  );
});
