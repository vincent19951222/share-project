import { describe, expect, it } from "vitest";
import { buildDrinkEvent, drinkNoteOptions, pickDrinkNote } from "@/app/ui-prototypes/drink-update/drink-entry";

describe("drink entry helpers", () => {
  it("offers a compact random note pool for confirmation entries", () => {
    expect(drinkNoteOptions.length).toBeGreaterThanOrEqual(5);
    expect(drinkNoteOptions.length).toBeLessThanOrEqual(10);
    expect(new Set(drinkNoteOptions).size).toBe(drinkNoteOptions.length);
  });

  it("builds a confirmed drink event with the edited note", () => {
    expect(pickDrinkNote(0)).toBe(drinkNoteOptions[0]);
    expect(
      buildDrinkEvent({
        id: 123,
        drinkId: "milkTea",
        time: "14:03",
        note: "测试备注：快乐加倍",
      }),
    ).toEqual({
      id: 123,
      drinkId: "milkTea",
      time: "14:03",
      note: "测试备注：快乐加倍",
    });
  });
});
