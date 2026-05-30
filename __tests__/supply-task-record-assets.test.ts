import { describe, expect, it } from "vitest";
import { supplyUiLabTaskRecordIcons } from "@/components/gamification/ui-lab/supply-data/records";
import {
  supplyTaskRecordAssetPaths,
  supplyTaskRecordMock,
} from "@/components/gamification/ui-lab/supply-task-record/mock-data";

const COS_IMAGE_PREFIX = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/";

describe("supply task record reused assets", () => {
  it("uses uploaded reward and avatar assets", () => {
    const requiredAssets = [
      supplyTaskRecordAssetPaths.profileAvatar,
      supplyTaskRecordAssetPaths.rewardIcons.coins,
      supplyTaskRecordAssetPaths.rewardIcons.ticket,
      supplyTaskRecordAssetPaths.rewardIcons.coffee,
      ...Object.values(supplyTaskRecordAssetPaths.avatars),
      ...Object.values(supplyUiLabTaskRecordIcons),
    ];

    for (const asset of requiredAssets) {
      expect(asset.startsWith(COS_IMAGE_PREFIX), asset).toBe(true);
    }
  });

  it("does not depend on the prototype image as a page background", () => {
    const serializedPaths = JSON.stringify(supplyTaskRecordAssetPaths);

    expect(serializedPaths).not.toContain("design/ui-assets/任务记录.png");
    expect(serializedPaths).not.toContain("任务记录.png");
    expect(serializedPaths).not.toMatch(/task-record-(sidebar|timeline|radar|redemptions)-panel/);
  });

  it("references generated transparent menu icon media", () => {
    for (const item of supplyTaskRecordMock.sidebar.menuItems) {
      expect(item.iconImage, `${item.id} should use an image icon`).toMatch(
        /share_project_public_assets_home_scenes_supply_task_record_menu_menu_.+\.png$/,
      );
    }
  });
});
