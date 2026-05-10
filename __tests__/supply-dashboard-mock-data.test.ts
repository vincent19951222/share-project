import { describe, expect, it } from "vitest";
import { supplyDashboardAssetPaths, supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

describe("supply dashboard mock data", () => {
  it("covers the static Dashboard state required by the spec", () => {
    expect(supplyDashboardMock.dailyQuests).toHaveLength(4);
    expect(supplyDashboardMock.dailyQuests.filter((quest) => quest.completed)).toHaveLength(3);
    expect(supplyDashboardMock.dailyQuests.some((quest) => !quest.completed)).toBe(true);
    expect(supplyDashboardMock.resources.some((resource) => resource.maxValue !== undefined)).toBe(true);
    expect(supplyDashboardMock.inventoryPreview.usedSlots).toBe(18);
    expect(supplyDashboardMock.inventoryPreview.totalSlots).toBe(40);
    expect(supplyDashboardMock.supplyPreview.remainingDraws).toBe(999);
    expect(supplyDashboardMock.activeEffects.every((effect) => effect.expiresIn.length > 0)).toBe(true);
  });

  it("reuses existing raw task-card assets instead of new generated quest images", () => {
    const taskCardPaths = Object.values(supplyDashboardAssetPaths.taskCards);

    expect(taskCardPaths.every((path) => path.includes("/assets/task-cards/raw/"))).toBe(true);
    expect(taskCardPaths.join("\n")).not.toContain("/assets/home-scenes/supply/dashboard/quest-");
  });
});
