import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compressPngFile,
  readRgbaPng,
  resizeRgbaNearestNeighbor,
  writeRgbaPng,
} from "../scripts/compress-reward-icons.mjs";

function createTestPixels(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = x * 50;
      pixels[offset + 1] = y * 50;
      pixels[offset + 2] = 180;
      pixels[offset + 3] = x === 0 && y === 0 ? 0 : 255;
    }
  }

  return pixels;
}

describe("compress reward icons script", () => {
  it("resizes RGBA pixels with nearest-neighbor sampling and preserves alpha", () => {
    const sourcePixels = createTestPixels(4, 4);
    const resized = resizeRgbaNearestNeighbor(sourcePixels, 4, 4, 2);

    expect(resized.width).toBe(2);
    expect(resized.height).toBe(2);
    expect([...resized.pixels.subarray(0, 4)]).toEqual([0, 0, 180, 0]);
    expect([...resized.pixels.subarray(4, 8)]).toEqual([100, 0, 180, 255]);
    expect([...resized.pixels.subarray(8, 12)]).toEqual([0, 100, 180, 255]);
    expect([...resized.pixels.subarray(12, 16)]).toEqual([100, 100, 180, 255]);
  });

  it("rewrites an oversized PNG to the target square size", () => {
    const dir = mkdtempSync(join(tmpdir(), "reward-icon-compress-"));
    const filePath = join(dir, "icon.png");

    writeRgbaPng(filePath, {
      width: 4,
      height: 4,
      pixels: createTestPixels(4, 4),
    });

    const result = compressPngFile(filePath, { targetSize: 2, dryRun: false });
    const compressed = readRgbaPng(filePath);

    expect(result.changed).toBe(true);
    expect(result.before.width).toBe(4);
    expect(result.after.width).toBe(2);
    expect(compressed.width).toBe(2);
    expect(compressed.height).toBe(2);
    expect(compressed.pixels[3]).toBe(0);
  });
});
