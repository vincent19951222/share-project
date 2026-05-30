import { describe, expect, it } from "vitest";
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
import {
  DEFAULT_SUPPLY_DASHBOARD_MOTTO,
  DEFAULT_SUPPLY_DASHBOARD_TEAM_ANNOUNCEMENT,
  supplyDashboardAssetPaths,
  supplyDashboardMock,
} from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

describe("supply dashboard mock data", () => {
  it("covers the static Dashboard state required by the spec", () => {
    expect(supplyDashboardMock.dailyQuests).toHaveLength(4);
    expect(supplyDashboardMock.dailyQuests.filter((quest) => quest.completed)).toHaveLength(3);
    expect(supplyDashboardMock.dailyQuests.some((quest) => !quest.completed)).toBe(true);
    expect(supplyDashboardMock.dailyQuests.map((quest) => [quest.id, quest.dimension, quest.title, quest.subtitle])).toEqual([
      ["movement_004", "movement", "窗边回血", "把电充绿"],
      ["hydration_003", "hydration", "杯子见底", "把尿喝白"],
      ["social_001", "social", "废话 KPI", "把事办黄"],
      ["learning_005", "learning", "一句话笔记", "把股看红"],
    ]);
    expect(supplyDashboardMock.motto).toBe(DEFAULT_SUPPLY_DASHBOARD_MOTTO);
    expect(DEFAULT_SUPPLY_DASHBOARD_MOTTO).toBe("不是在健身，就是在去健身的路上！");
    expect(supplyDashboardMock.resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
    expect(supplyDashboardMock.resources.map((resource) => resource.id)).toEqual(["coins", "ticket", "backpack"]);
    expect(supplyDashboardMock.inventoryPreview.usedSlots).toBe(18);
    expect(supplyDashboardMock.inventoryPreview.totalSlots).toBe(60);
    expect(supplyDashboardMock.supplyPreview.remainingDraws).toBe(999);
    expect(supplyDashboardMock.profile.totalExp).toBe(0);
    expect(supplyDashboardMock.profile.level).toBe(1);
    expect(supplyDashboardMock.profile.currentLevelExp).toBe(0);
    expect(supplyDashboardMock.profile.nextLevelExp).toBe(1000);
    expect(supplyDashboardMock.announcement.message).toBe(DEFAULT_SUPPLY_DASHBOARD_TEAM_ANNOUNCEMENT);
    expect(DEFAULT_SUPPLY_DASHBOARD_TEAM_ANNOUNCEMENT).toBe("团队公告：周六早上 8 点公园团练，记得来哦！");
    expect(supplyDashboardMock.activeEffects).toBe(supplyUiLabActiveEffects);
    expect(supplyDashboardMock.activeEffects).toHaveLength(2);
    expect(supplyDashboardMock.activeEffects.every((effect) => effect.endsAtLabel === "今日 23:59")).toBe(true);
    expect(JSON.stringify(supplyDashboardMock)).not.toContain("补给券");
    expect(JSON.stringify(supplyDashboardMock)).not.toContain("生命票");
    expect(JSON.stringify(supplyDashboardMock)).not.toContain("体力");
  });

  it("uses atomic art assets instead of cropped UI panel screenshots", () => {
    const serializedAssets = JSON.stringify(supplyDashboardAssetPaths);
    const serializedMock = JSON.stringify(supplyDashboardMock);

    expect(serializedAssets).not.toMatch(/dashboard-(status|hero|quests|shortcut|announcement)-panel/);
    expect(serializedMock).not.toMatch(/panelImages/);
    expect(supplyDashboardMock.shortcutLinks.map((link) => link.href)).toEqual([
      "/dashboard/status",
      "/dashboard/backpack",
      "/dashboard/cards",
      "/dashboard/quest",
    ]);
    expect(supplyDashboardAssetPaths.hero).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_niuma_hero.webp");
    expect(supplyDashboardAssetPaths.levelAvatar).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_topbar_cow_logo.png");
    expect(supplyDashboardAssetPaths.dockBackpack).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dock_backpack.webp");
    expect(supplyDashboardAssetPaths.dockSupplyMachine).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dock_supply_machine.webp");
    expect(supplyDashboardAssetPaths.dockTaskRecord).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dock_task_record.webp");
  });

  it("uses pure illustration task-card assets instead of raw full-card screenshots", () => {
    const taskCardPaths = Object.values(supplyDashboardAssetPaths.taskCards);

    expect(taskCardPaths).toEqual([
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_003_empty_cup.webp",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_004_window_heal.webp",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_001_small_talk.webp",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_005_one_note.webp",
    ]);
    expect(taskCardPaths.every((path) => path.includes("share_project_public_assets_task_cards_illustrations_"))).toBe(
      true,
    );
    expect(taskCardPaths.every((path) => !path.includes("/raw/"))).toBe(true);
    expect(taskCardPaths.join("\n")).not.toContain("/assets/home-scenes/supply/dashboard/quest-");
  });
});
