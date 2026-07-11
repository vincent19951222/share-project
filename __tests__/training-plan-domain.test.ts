import { describe, expect, it } from "vitest";
import {
  addShanghaiDays,
  deriveTrainingPlanDayStatus,
  getShanghaiWeekday,
  getTrainingPlanStartDayKey,
  parseCreateTrainingPlanInput,
} from "@/lib/training-plan/domain";

describe("training plan domain", () => {
  it("starts today on Monday and next Monday on other weekdays", () => {
    expect(getTrainingPlanStartDayKey(new Date("2026-07-13T08:00:00+08:00"))).toBe(
      "2026-07-13",
    );
    expect(getTrainingPlanStartDayKey(new Date("2026-07-14T08:00:00+08:00"))).toBe(
      "2026-07-20",
    );
  });

  it("adds calendar days without drifting at month or year boundaries", () => {
    expect(addShanghaiDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addShanghaiDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(getShanghaiWeekday("2026-07-13")).toBe(1);
    expect(getShanghaiWeekday("2026-07-19")).toBe(7);
  });

  it("normalizes weekdays and requires their count to match frequency", () => {
    expect(
      parseCreateTrainingPlanInput({
        weeklyFrequency: 4,
        sessionDurationMinutes: 45,
        weekdays: [6, 1, 3, 3],
        equipment: ["gym"],
        avoidTags: [],
      }),
    ).toEqual({ ok: false, error: "weekday-count-mismatch" });

    expect(
      parseCreateTrainingPlanInput({
        weeklyFrequency: 3,
        sessionDurationMinutes: 45,
        weekdays: [6, 1, 3],
        equipment: ["gym"],
        avoidTags: ["knee", "knee"],
      }),
    ).toEqual({
      ok: true,
      value: {
        weeklyFrequency: 3,
        sessionDurationMinutes: 45,
        weekdays: [1, 3, 6],
        equipment: ["gym"],
        avoidTags: ["knee"],
      },
    });
  });

  it("rejects unsupported equipment and invalid avoid tags", () => {
    expect(
      parseCreateTrainingPlanInput({
        weeklyFrequency: 2,
        sessionDurationMinutes: 30,
        weekdays: [2, 5],
        equipment: ["home"],
        avoidTags: [],
      }),
    ).toEqual({ ok: false, error: "unsupported-equipment" });

    expect(
      parseCreateTrainingPlanInput({
        weeklyFrequency: 2,
        sessionDurationMinutes: 30,
        weekdays: [2, 5],
        equipment: ["gym"],
        avoidTags: ["medical-diagnosis"],
      }),
    ).toEqual({ ok: false, error: "invalid-avoid-tags" });
  });

  it("derives completed, missed, today and upcoming without mutating dates", () => {
    expect(
      deriveTrainingPlanDayStatus({
        dayKey: "2026-07-13",
        todayDayKey: "2026-07-14",
        completedAt: "2026-07-13T10:00:00.000Z",
      }),
    ).toBe("completed");
    expect(
      deriveTrainingPlanDayStatus({
        dayKey: "2026-07-13",
        todayDayKey: "2026-07-14",
        completedAt: null,
      }),
    ).toBe("missed");
    expect(
      deriveTrainingPlanDayStatus({
        dayKey: "2026-07-14",
        todayDayKey: "2026-07-14",
        completedAt: null,
      }),
    ).toBe("today");
    expect(
      deriveTrainingPlanDayStatus({
        dayKey: "2026-07-15",
        todayDayKey: "2026-07-14",
        completedAt: null,
      }),
    ).toBe("upcoming");
  });
});
