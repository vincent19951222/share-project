import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

import {
  supplyUiLabResourceIconPaths,
  supplyUiLabResources,
} from "@/components/gamification/ui-lab/supply-data/resources";

function publicPath(src: string) {
  return `public${src}`;
}

function hasPngAlphaChannel(path: string) {
  const png = readFileSync(path);

  return png[25] === 4 || png[25] === 6;
}

describe("supply UI lab resource icons", () => {
  it("ships transparent generated icons for topbar resources", () => {
    expect(supplyUiLabResources.dashboard.map((resource) => resource.iconImage)).toEqual([
      supplyUiLabResourceIconPaths.coins,
      supplyUiLabResourceIconPaths.ticket,
      supplyUiLabResourceIconPaths.backpack,
    ]);

    for (const src of Object.values(supplyUiLabResourceIconPaths)) {
      const path = publicPath(src);

      expect(existsSync(path), `${path} should exist`).toBe(true);
      expect(hasPngAlphaChannel(path), `${path} should include an alpha channel`).toBe(true);
    }
  });
});
