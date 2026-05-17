import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const assets = [
  {
    path: "public/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png",
    maxBytes: 16 * 1024,
  },
  {
    path: "public/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp",
    maxBytes: 260 * 1024,
  },
  {
    path: "public/assets/home-scenes/supply/team-goal/team-goal-crest.webp",
    maxBytes: 140 * 1024,
  },
  {
    path: "public/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp",
    maxBytes: 140 * 1024,
  },
];

describe("supply team goal media assets", () => {
  it.each(assets)("$path exists and stays within its size budget", ({ path, maxBytes }) => {
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeLessThanOrEqual(maxBytes);
  });
});
