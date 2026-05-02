import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRewardDefinitions } from "@/lib/gamification/content";
import {
  getRewardAsset,
  getRewardAssetId,
  REWARD_ASSETS,
  REWARD_ASSET_PROMPT_VERSION,
} from "@/content/gamification/reward-assets";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_COLOR_TYPES_WITH_ALPHA = new Set([4, 6]);

function getActiveRewards() {
  return getRewardDefinitions().filter((reward) => reward.enabled && reward.weight > 0);
}

function readPngMetadata(filePath: string) {
  const buffer = readFileSync(filePath);

  expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);

  return { width, height, bitDepth, colorType };
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

  it("ships the first transparent task reroll icon as a square PNG with alpha", () => {
    const asset = REWARD_ASSETS.find((entry) => entry.assetId === "task_reroll_coupon");

    expect(asset).toBeDefined();

    const filePath = join(process.cwd(), "public", asset!.src.replace(/^\//, ""));

    expect(existsSync(filePath)).toBe(true);

    const metadata = readPngMetadata(filePath);

    expect(metadata.width).toBe(metadata.height);
    expect(metadata.width).toBeGreaterThanOrEqual(256);
    expect(metadata.bitDepth).toBe(8);
    expect(PNG_COLOR_TYPES_WITH_ALPHA.has(metadata.colorType)).toBe(true);
  });
});
