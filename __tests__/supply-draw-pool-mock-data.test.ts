import { describe, expect, it } from "vitest";
import { supplyDrawPoolAssetPaths, supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

describe("supply draw pool mock data", () => {
  it("covers the static draw-pool state required by the spec", () => {
    const serialized = JSON.stringify(supplyDrawPoolMock);

    expect(serialized).not.toMatch(
      /(topbar|wallet|guide|rates|probability|pity|rules|recent|machine)Panel|panelImage/,
    );
    expect(supplyDrawPoolMock.media.machine).toContain("draw-pool-machine");
    expect(supplyDrawPoolMock.topBar.resources.map((resource) => resource.value)).toEqual(["18", "2,450"]);
    expect(supplyDrawPoolMock.wallet.ticketBalance).toBe(18);
    expect(supplyDrawPoolMock.wallet.dailyEarned).toBe(18);
    expect(supplyDrawPoolMock.wallet.dailyLimit).toBe(30);
    expect(supplyDrawPoolMock.machine.actions.map((action) => action.costTicket)).toEqual([1, 10]);
    expect(supplyDrawPoolMock.machine.actions.find((action) => action.id === "ten")?.guaranteeLabel).toBe(
      "必出 SR 或以上",
    );
    expect(supplyDrawPoolMock.pity).toMatchObject({
      remainingDraws: 22,
      guaranteeLabel: "SR 或以上",
      current: 48,
      target: 70,
    });
    expect(supplyDrawPoolMock.poolRates.map((rate) => `${rate.rarity}:${rate.percent}`)).toEqual([
      "SSR:3",
      "SR:17",
      "R:35",
      "N:45",
    ]);
    expect(supplyDrawPoolMock.rules).toHaveLength(3);
  });

  it("models the recent drops and isolates draw-pool-specific media", () => {
    expect(supplyDrawPoolMock.recentDrops).toHaveLength(6);
    expect(supplyDrawPoolMock.recentDrops.map((drop) => drop.name)).toEqual([
      "银子",
      "运动护腕",
      "经验加成券",
      "咖啡兑换券",
      "疾风跑鞋",
      "社交互动券",
    ]);
    expect(supplyDrawPoolMock.recentDrops.map((drop) => drop.rarity)).toEqual(["SSR", "SR", "R", "R", "SR", "R"]);
    expect(Object.values(supplyDrawPoolAssetPaths.drawPool).every((path) => path.startsWith("/assets/home-scenes/supply/draw-pool/"))).toBe(true);
    expect(supplyDrawPoolAssetPaths.rewardIcons.ticket).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(supplyDrawPoolAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
  });
});
