import { describe, expect, it } from "vitest";

import {
  buildWeeklyReportSummary,
  getCurrentWeeklyReportWindow,
  type WeeklyReportSnapshot,
} from "@/lib/weekly-report";

describe("weekly-report helpers", () => {
  it("builds an Asia/Shanghai natural-week window from Monday to current day", () => {
    const window = getCurrentWeeklyReportWindow(new Date("2026-04-30T10:00:00+08:00"));

    expect(window.weekStartDayKey).toBe("2026-04-27");
    expect(window.weekEndDayKey).toBe("2026-04-30");
  });

  it("creates deterministic summary text without LLM", () => {
    const snapshot = {
      version: 1,
      weekStartDayKey: "2026-04-27",
      weekEndDayKey: "2026-04-30",
      generatedAt: "2026-04-30T10:00:00.000+08:00",
      generatedByUserId: "admin-1",
      summary: "",
      metrics: {
        totalPunches: 9,
        fullAttendanceDays: 2,
        peakDay: { dayKey: "2026-04-28", value: 4 },
        lowDay: { dayKey: "2026-04-29", value: 1 },
        seasonProgress: { filledSlots: 5, targetSlots: 8, status: "ACTIVE" },
      },
      highlights: {
        topMembers: [{ userId: "u1", label: "本周高光", value: "li · 4 次有效打卡" }],
      },
      sections: [],
    } satisfies WeeklyReportSnapshot;

    expect(buildWeeklyReportSummary(snapshot)).toBe("本周打卡 9 次，全勤 2 天，赛季进度 5/8。");
  });
});
