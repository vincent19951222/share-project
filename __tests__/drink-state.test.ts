import { describe, expect, it } from "vitest";
import {
  DRINK_TYPES,
  drinkCatalog,
  isDrinkType,
  normalizeDrinkNote,
} from "@/lib/drinks";

describe("drink domain", () => {
  it("defines the fixed 牛马水铺 drink catalog", () => {
    expect(DRINK_TYPES).toEqual(["water", "milkTea", "americano", "latte", "other"]);
    expect(drinkCatalog.water.label).toBe("水");
    expect(drinkCatalog.milkTea.label).toBe("奶茶");
    expect(drinkCatalog.americano.label).toBe("美式");
    expect(drinkCatalog.latte.label).toBe("拿铁");
    expect(drinkCatalog.other.label).toBe("其他");
    expect(isDrinkType("americano")).toBe(true);
    expect(isDrinkType("coffee")).toBe(false);
  });

  it("normalizes drink notes for persistence", () => {
    expect(normalizeDrinkNote("  下午用奶泡顶住  ")).toBe("下午用奶泡顶住");
    expect(normalizeDrinkNote("   ")).toBeNull();
    expect(normalizeDrinkNote("x".repeat(90))).toBe("x".repeat(80));
  });
});
