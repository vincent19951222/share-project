import { describe, expect, it } from "vitest";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

describe("supply backpack mock data", () => {
  it("matches the backpack prototype resource and layout contract", () => {
    const serializedMock = JSON.stringify(supplyBackpackMock);

    expect(serializedMock).not.toContain("panelImages");
    expect(serializedMock).not.toContain("backpack-sidebar-panel");
    expect(serializedMock).not.toContain("backpack-inventory-panel");
    expect(serializedMock).not.toContain("backpack-detail-panel");
    expect(supplyBackpackMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/40",
    ]);
    expect(supplyBackpackMock.sidebar.capacity).toBe("18/40");
    expect(supplyBackpackMock.sidebar.categories).toHaveLength(5);
    expect(supplyBackpackMock.sidebar.categories.find((category) => category.active)?.label).toBe(
      "全部",
    );
    expect(supplyBackpackMock.sidebar.todayEffects).toHaveLength(4);
    expect(supplyBackpackMock.inventory.slots).toHaveLength(20);
    expect(supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "item")).toHaveLength(
      16,
    );
    expect(
      supplyBackpackMock.inventory.slots.filter((slot) => slot.type === "locked"),
    ).toHaveLength(4);
    expect(supplyBackpackMock.inventory.page).toBe(1);
    expect(supplyBackpackMock.inventory.totalPages).toBe(2);
  });

  it("covers rarity, locked slots, and selected real-world item detail", () => {
    const items = supplyBackpackMock.inventory.slots.flatMap((slot) =>
      slot.type === "item" ? [slot.item] : [],
    );

    expect(new Set(items.map((item) => item.rarity))).toEqual(new Set(["N", "R", "SR", "SSR"]));
    expect(items.find((item) => item.selected)).toMatchObject({
      id: "coffee-coupon",
      name: "咖啡兑换券",
      quantity: 8,
      rarity: "R",
      categoryId: "real",
    });
    expect(
      supplyBackpackMock.inventory.slots.flatMap((slot) =>
        slot.type === "locked" ? [slot.unlockLevel] : [],
      ),
    ).toEqual([20, 25, 30, 35]);
    expect(supplyBackpackMock.selectedItemDetail).toMatchObject({
      itemId: "coffee-coupon",
      tag: "真实福利",
      ownedQuantity: 8,
      requiresAdminConfirmation: true,
    });
  });
});
