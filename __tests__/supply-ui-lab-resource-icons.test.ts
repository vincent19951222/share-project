import { describe, expect, it } from "vitest";

import {
  supplyUiLabResourceIconPaths,
  supplyUiLabResources,
} from "@/components/gamification/ui-lab/supply-data/resources";

const COS_IMAGE_PREFIX = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/";

describe("supply UI lab resource icons", () => {
  it("ships transparent generated icons for topbar resources", () => {
    expect(supplyUiLabResources.dashboard.map((resource) => resource.iconImage)).toEqual([
      supplyUiLabResourceIconPaths.coins,
      supplyUiLabResourceIconPaths.ticket,
      supplyUiLabResourceIconPaths.backpack,
    ]);

    for (const src of Object.values(supplyUiLabResourceIconPaths)) {
      expect(src.startsWith(COS_IMAGE_PREFIX), `${src} should use COS media`).toBe(true);
      expect(src).toMatch(/share_project_public_assets_home_scenes_supply_shared_supply_resource_.+\.png$/);
    }
  });
});
