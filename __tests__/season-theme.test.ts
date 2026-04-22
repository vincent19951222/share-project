import { describe, expect, it } from "vitest";
import { getSeasonTheme } from "@/lib/season-theme";

describe("season theme", () => {
  it("returns all twelve fixed monthly themes with the expected shape and color invariants", () => {
    for (const month of Array.from({ length: 12 }, (_, index) => index + 1)) {
      const theme = getSeasonTheme(month);

      expect(theme.month).toBe(month);
      expect(theme.panelBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.emptySlotColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.memberColors).toHaveLength(5);
      expect(new Set(theme.memberColors).size).toBe(5);
      expect(theme.accentColor).not.toBe(theme.emptySlotColor);
      expect(theme.memberColors[0]).not.toBe(theme.emptySlotColor);
      for (const color of theme.memberColors) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("returns a fresh clone so callers cannot mutate shared theme state", () => {
    const april = getSeasonTheme(4);
    const aprilAgain = getSeasonTheme(4);

    expect(april).not.toBe(aprilAgain);
    expect(april.memberColors).not.toBe(aprilAgain.memberColors);

    const mutableApril = april as unknown as {
      panelBackground: string;
      accentColor: string;
      emptySlotColor: string;
      memberColors: string[];
    };
    const originalAccentColor = aprilAgain.accentColor;
    const originalFirstMemberColor = aprilAgain.memberColors[0];

    mutableApril.panelBackground = "#000000";
    mutableApril.memberColors[0] = "#ffffff";

    const aprilAfterMutation = getSeasonTheme(4);

    expect(aprilAgain.accentColor).toBe(originalAccentColor);
    expect(aprilAgain.memberColors[0]).toBe(originalFirstMemberColor);
    expect(aprilAfterMutation.panelBackground).toBe(aprilAgain.panelBackground);
    expect(aprilAfterMutation.memberColors[0]).toBe(aprilAgain.memberColors[0]);
  });

  it("throws for invalid months", () => {
    for (const month of [0, 13, -1, 1.5, Number.NaN]) {
      expect(() => getSeasonTheme(month)).toThrow(RangeError);
    }
  });
});
