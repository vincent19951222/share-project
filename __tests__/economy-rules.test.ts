import { describe, expect, it } from "vitest";
import {
  ALLOWED_TARGET_SLOTS,
  getNextPunchRewardPreview,
  getNextPunchStreak,
  getUpcomingPunchRewardPreview,
  getPunchRewardForStreak,
  getPreviousShanghaiDayKey,
  getShanghaiDayKey,
  getShanghaiWeekKey,
  isValidTargetSlots,
} from "@/lib/economy";

describe("economy rules", () => {
  it("caps the reward table at 50", () => {
    expect(getPunchRewardForStreak(1)).toBe(10);
    expect(getPunchRewardForStreak(2)).toBe(20);
    expect(getPunchRewardForStreak(3)).toBe(30);
    expect(getPunchRewardForStreak(4)).toBe(40);
    expect(getPunchRewardForStreak(5)).toBe(50);
    expect(getPunchRewardForStreak(99)).toBe(50);
  });

  it("continues a streak only from yesterday", () => {
    expect(getNextPunchStreak(3, null, "2026-04-22")).toBe(1);
    expect(getNextPunchStreak(3, "2026-04-20", "2026-04-22")).toBe(1);
    expect(getNextPunchStreak(3, "2026-04-21", "2026-04-22")).toBe(4);
  });

  it("previews the next reward from the next streak", () => {
    expect(getNextPunchRewardPreview(3, "2026-04-21", "2026-04-22")).toBe(40);
    expect(getNextPunchRewardPreview(5, "2026-04-21", "2026-04-22")).toBe(50);
    expect(getNextPunchRewardPreview(5, "2026-04-20", "2026-04-22")).toBe(10);
  });

  it("previews the next effective reward after today's punch without resetting to 10", () => {
    expect(getUpcomingPunchRewardPreview(2, "2026-04-22", "2026-04-22")).toBe(30);
    expect(getUpcomingPunchRewardPreview(5, "2026-04-22", "2026-04-22")).toBe(50);
    expect(getUpcomingPunchRewardPreview(2, "2026-04-21", "2026-04-22")).toBe(30);
  });

  it("handles UTC crossing into the next Shanghai day", () => {
    expect(getShanghaiDayKey(new Date("2026-04-23T18:10:00Z"))).toBe("2026-04-24");
  });

  it("builds Shanghai week keys from Monday", () => {
    expect(getShanghaiWeekKey("2026-04-27")).toBe("2026-04-27");
    expect(getShanghaiWeekKey("2026-05-03")).toBe("2026-04-27");
    expect(getPreviousShanghaiDayKey("2026-04-26")).toBe("2026-04-25");
  });

  it("rejects invalid Shanghai day keys before they can roll over", () => {
    for (const dayKey of ["2026-2-01", "2026-02-30", "2026/02/01"]) {
      expect(() => getNextPunchStreak(3, "2026-04-21", dayKey)).toThrow(RangeError);
      expect(() => getNextPunchStreak(3, "2026-04-21", dayKey)).toThrow(
        `Invalid Shanghai day key: ${dayKey}`,
      );
    }

    expect(() => getNextPunchStreak(3, "2026-02-30", "2026-04-22")).toThrow(RangeError);
    expect(() => getNextPunchStreak(3, null, "2026-02-30")).toThrow(RangeError);
    expect(() => getNextPunchStreak(3, "", "2026-04-22")).toThrow(RangeError);
  });

  it("rejects invalid Date values when formatting Shanghai day keys", () => {
    const invalidDate = new Date(NaN);

    expect(() => getShanghaiDayKey(invalidDate)).toThrow(RangeError);
    expect(() => getShanghaiDayKey(invalidDate)).toThrow("Invalid date value: expected a valid Date.");
  });

  it("rejects non-finite streak inputs", () => {
    expect(() => getPunchRewardForStreak(Number.NaN)).toThrow(RangeError);
    expect(() => getNextPunchStreak(Number.POSITIVE_INFINITY, "2026-04-21", "2026-04-22")).toThrow(
      RangeError,
    );
  });

  it("exposes the allowed target slot tiers", () => {
    expect(ALLOWED_TARGET_SLOTS).toEqual([50, 80, 100, 120, 150]);
    expect(isValidTargetSlots(100)).toBe(true);
    expect(isValidTargetSlots(75)).toBe(false);
  });
});
