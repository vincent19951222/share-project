import { describe, expect, it } from "vitest";
import {
  supplyTaskRecordAssetPaths,
  supplyTaskRecordMock,
} from "@/components/gamification/ui-lab/supply-task-record/mock-data";

describe("supply task record mock data", () => {
  it("models the prototype top bar, sidebar, filters, and day header", () => {
    expect(supplyTaskRecordMock.topBar.resources.map((resource) => resource.value)).toEqual(["2,450", "18", "68/120"]);
    expect(supplyTaskRecordMock.sidebar.menuItems).toHaveLength(5);
    expect(supplyTaskRecordMock.sidebar.menuItems.find((item) => item.active)?.label).toBe("今日记录");
    expect(supplyTaskRecordMock.sidebar.backHref).toBe("/ui-lab/supply-dashboard");
    expect(supplyTaskRecordMock.filters.map((filter) => filter.label)).toEqual([
      "全部",
      "主线任务",
      "社交互动",
      "奖励领取",
      "系统通知",
    ]);
    expect(supplyTaskRecordMock.filters.find((filter) => filter.active)?.label).toBe("全部");
    expect(supplyTaskRecordMock.day).toEqual({ label: "今天", dateLabel: "05月24日", weekday: "星期六" });
  });

  it("covers the prototype timeline record statuses and rewards", () => {
    expect(supplyTaskRecordMock.timelineRecords.map((record) => record.time)).toEqual([
      "08:21",
      "09:03",
      "10:15",
      "11:40",
      "12:02",
      "12:05",
      "12:06",
    ]);
    expect(supplyTaskRecordMock.timelineRecords.filter((record) => record.status === "completed")).toHaveLength(4);
    expect(supplyTaskRecordMock.timelineRecords.filter((record) => record.status === "claimed")).toHaveLength(3);
    expect(supplyTaskRecordMock.timelineRecords.map((record) => record.reward.label)).toEqual(
      expect.arrayContaining(["生命票", "补给券", "运动饮料（R）", "牛马币"]),
    );
  });

  it("models teammate radar and redemption side panels", () => {
    expect(supplyTaskRecordMock.radar.tabs.map((tab) => tab.label)).toEqual(["待响应 (3)", "已回应", "已过期"]);
    expect(supplyTaskRecordMock.radar.tabs.find((tab) => tab.active)?.id).toBe("pending");
    expect(supplyTaskRecordMock.radar.invites).toHaveLength(3);
    expect(supplyTaskRecordMock.radar.invites.every((invite) => invite.statusLabel === "待响应")).toBe(true);
    expect(supplyTaskRecordMock.redemptions.items.map((item) => item.statusLabel)).toEqual([
      "兑换中",
      "已完成",
      "已失效",
    ]);
  });

  it("does not serialize legacy task-record panel crop references", () => {
    const serializedMock = JSON.stringify(supplyTaskRecordMock);

    expect(serializedMock).not.toContain("panelImage");
    expect(serializedMock).not.toMatch(/task-record-(sidebar|timeline|radar|redemptions)-panel/);
  });

  it("references reused reward and avatar assets", () => {
    expect(supplyTaskRecordAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
    expect(Object.values(supplyTaskRecordAssetPaths.avatars).every((path) => path.startsWith("/avatars/"))).toBe(true);
  });
});
