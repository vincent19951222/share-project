import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { getRewardDefinitions } from "@/lib/gamification/content";
import {
  getRewardAsset,
  getRewardAssetId,
  REWARD_ASSETS,
  REWARD_ASSET_PROMPT_VERSION,
} from "@/content/gamification/reward-assets";
import { getRewardAssetGenerationTrace } from "@/content/gamification/reward-asset-traces";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_COLOR_TYPE_RGBA = 6;

function getActiveRewards() {
  return getRewardDefinitions().filter((reward) => reward.enabled && reward.weight > 0);
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function readRgbaPng(filePath: string) {
  const buffer = readFileSync(filePath);

  expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  const interlaceMethod = buffer.readUInt8(28);
  const idatChunks: Buffer[] = [];

  for (let offset = 8; offset < buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    }

    offset = dataEnd + 4;
  }

  expect(bitDepth).toBe(8);
  expect(colorType).toBe(PNG_COLOR_TYPE_RGBA);
  expect(interlaceMethod).toBe(0);

  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;

    for (let columnByte = 0; columnByte < rowLength; columnByte += 1) {
      const raw = inflated[inputOffset + columnByte];
      const left =
        columnByte >= bytesPerPixel ? pixels[row * rowLength + columnByte - bytesPerPixel] : 0;
      const up = row > 0 ? pixels[(row - 1) * rowLength + columnByte] : 0;
      const upLeft =
        row > 0 && columnByte >= bytesPerPixel
          ? pixels[(row - 1) * rowLength + columnByte - bytesPerPixel]
          : 0;

      let value: number;

      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          value = raw + paethPredictor(left, up, upLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }

      pixels[row * rowLength + columnByte] = value & 0xff;
    }

    inputOffset += rowLength;
  }

  function alphaAt(x: number, y: number) {
    return pixels[(y * width + x) * bytesPerPixel + 3];
  }

  return { width, height, bitDepth, colorType, alphaAt };
}

describe("gamification reward assets", () => {
  it("maps every GM-16 active reward to an asset entry", () => {
    const activeRewards = getActiveRewards();

    expect(activeRewards).toHaveLength(18);
    expect(new Set(REWARD_ASSETS.map((asset) => asset.assetId)).size).toBe(REWARD_ASSETS.length);

    for (const reward of activeRewards) {
      const asset = getRewardAsset(reward);

      expect(asset, reward.id).toBeDefined();
      expect(asset?.assetId, reward.id).toBe(getRewardAssetId(reward));
      expect(asset?.src.endsWith(".png"), reward.id).toBe(true);
      expect(asset?.promptVersion, reward.id).toBe(REWARD_ASSET_PROMPT_VERSION);
    }
  });

  it("records generation traceability for generated assets", () => {
    const asset = REWARD_ASSETS.find((entry) => entry.assetId === "task_reroll_coupon");
    const trace = getRewardAssetGenerationTrace("task_reroll_coupon");

    expect(asset).toBeDefined();
    expect(asset?.status).toBe("generated");
    expect("generationTrace" in asset!).toBe(false);
    expect(trace?.promptVersion).toBe(asset?.promptVersion);
    expect(trace?.prompt).toContain("任务换班券");
    expect(trace?.sourceImagePath).toContain("ig_");
    expect(trace?.processing).toContain("remove_chroma_key.py");
  });

  it("ships the first transparent task reroll icon as a square PNG with transparent corners", () => {
    const asset = REWARD_ASSETS.find((entry) => entry.assetId === "task_reroll_coupon");

    expect(asset).toBeDefined();

    const filePath = join(process.cwd(), "public", asset!.src.replace(/^\//, ""));

    expect(existsSync(filePath)).toBe(true);

    const metadata = readRgbaPng(filePath);

    expect(metadata.width).toBe(metadata.height);
    expect(metadata.width).toBeGreaterThanOrEqual(256);
    expect(metadata.bitDepth).toBe(8);
    expect(metadata.colorType).toBe(PNG_COLOR_TYPE_RGBA);
    expect(metadata.alphaAt(0, 0)).toBe(0);
    expect(metadata.alphaAt(metadata.width - 1, 0)).toBe(0);
    expect(metadata.alphaAt(0, metadata.height - 1)).toBe(0);
    expect(metadata.alphaAt(metadata.width - 1, metadata.height - 1)).toBe(0);
  });
});
