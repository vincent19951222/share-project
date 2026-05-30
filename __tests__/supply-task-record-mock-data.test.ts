import { describe, expect, it } from "vitest";
import {
  supplyTaskRecordAssetPaths,
  supplyTaskRecordMock,
} from "@/components/gamification/ui-lab/supply-task-record/mock-data";

describe("supply task record mock data", () => {
  it("models a single-route local state machine with seven date tabs", () => {
    expect(supplyTaskRecordMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyTaskRecordMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyTaskRecordMock.activeMode).toBe("today");
    expect(supplyTaskRecordMock.activeDateKey).toBe("2026-05-18");
    expect(supplyTaskRecordMock.dates).toHaveLength(7);
    expect(supplyTaskRecordMock.dates.map((date) => date.label)).toEqual([
      "今天",
      "昨天",
      "前天",
      "3天前",
      "4天前",
      "5天前",
      "6天前",
    ]);
    expect(Object.keys(supplyTaskRecordMock.recordsByDate)).toEqual([
      "2026-05-18",
      "2026-05-17",
      "2026-05-16",
      "2026-05-15",
      "2026-05-14",
      "2026-05-13",
      "2026-05-12",
    ]);
    expect(supplyTaskRecordMock.recordsByDate["2026-05-13"]).toEqual([]);
  });

  it("covers timeline records, draw history, redemptions, radar, and rules without legacy vocabulary", () => {
    const todayRecords = supplyTaskRecordMock.recordsByDate[supplyTaskRecordMock.activeDateKey] ?? [];
    const serializedMock = JSON.stringify(supplyTaskRecordMock);

    expect(todayRecords.map((record) => record.time)).toEqual([
      "08:21",
      "09:03",
      "10:15",
      "11:40",
      "12:02",
      "12:05",
      "12:06",
    ]);
    expect(todayRecords.filter((record) => record.status === "completed")).toHaveLength(4);
    expect(todayRecords.filter((record) => record.status === "claimed")).toHaveLength(3);
    expect(todayRecords.flatMap((record) => (record.reward ? [record.reward.label] : []))).toEqual(
      expect.arrayContaining(["抽奖券", "运动饮料（R）", "银子"]),
    );
    expect(todayRecords.every((record) => record.icon.type === "image")).toBe(true);
    expect(todayRecords.map((record) => record.icon.value)).toEqual(
      expect.arrayContaining([
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_movement.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_hydration.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_chat.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_learning.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_draw.webp",
      ]),
    );

    expect(supplyTaskRecordMock.drawHistory.map((draw) => draw.drawType)).toEqual(["十连", "单抽", "十连"]);
    expect(supplyTaskRecordMock.drawHistory.map((draw) => draw.ticketSpent)).toEqual([10, 1, 10]);
    expect(supplyTaskRecordMock.drawHistory.some((draw) => draw.guaranteeApplied)).toBe(true);
    expect(supplyTaskRecordMock.drawHistory[0]?.rewards.map((reward) => reward.name)).toEqual(
      expect.arrayContaining(["任务换班券", "瑞幸咖啡券"]),
    );

    expect(supplyTaskRecordMock.radar.tabs.map((tab) => tab.label)).toEqual(["待响应 (3)", "已回应", "已过期"]);
    expect(supplyTaskRecordMock.radar.invites.map((invite) => invite.statusLabel)).toEqual(
      expect.arrayContaining(["待响应", "已回应", "已过期"]),
    );
    expect(supplyTaskRecordMock.redemptions.items.map((item) => item.statusLabel)).toEqual([
      "兑换中",
      "已完成",
      "已失效",
    ]);
    expect(supplyTaskRecordMock.rules).toHaveLength(4);
    expect(supplyTaskRecordMock.rules.join("\n")).toContain("抽卡记录展示单抽、十连、消耗抽奖券和批次保底状态");

    expect(serializedMock).not.toContain("生命票");
    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("牛马币");
    expect(serializedMock).not.toContain("panelImage");
    expect(serializedMock).not.toMatch(/task-record-(sidebar|timeline|radar|redemptions)-panel/);
  });

  it("references reused reward and avatar assets", () => {
    expect(supplyTaskRecordAssetPaths.rewardIcons.coffee).toBe("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_luckin_coffee_coupon.png");
    expect(
      Object.values(supplyTaskRecordAssetPaths.avatars).every((path) =>
        path.includes("share_project_public_avatars_"),
      ),
    ).toBe(true);
  });
});
