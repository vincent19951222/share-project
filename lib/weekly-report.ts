import { getShanghaiDayKey } from "@/lib/economy";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeeklyReportWindow {
  weekStartDayKey: string;
  weekEndDayKey: string;
  weekStartAt: Date;
  weekEndAt: Date;
}

export interface WeeklyReportSnapshot {
  version: 1;
  weekStartDayKey: string;
  weekEndDayKey: string;
  generatedAt: string;
  generatedByUserId: string;
  summary: string;
  metrics: {
    totalPunches: number;
    fullAttendanceDays: number;
    peakDay?: { dayKey: string; value: number };
    lowDay?: { dayKey: string; value: number };
    seasonProgress?: {
      filledSlots: number;
      targetSlots: number;
      status: string;
    };
  };
  highlights: {
    topMembers: Array<{ userId: string; label: string; value: string }>;
    coffee?: { userId?: string; label: string; value: string };
  };
  sections: Array<{
    id: string;
    title: string;
    summary: string;
    bullets: string[];
  }>;
}

function assertValidDate(now: Date): void {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("Invalid date value: expected a valid Date.");
  }
}

function getShanghaiStartOfDay(date: Date): Date {
  const shanghaiDate = new Date(date.getTime() + SHANGHAI_OFFSET_MS);

  return new Date(
    Date.UTC(
      shanghaiDate.getUTCFullYear(),
      shanghaiDate.getUTCMonth(),
      shanghaiDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - SHANGHAI_OFFSET_MS,
  );
}

export function getCurrentWeeklyReportWindow(now: Date = new Date()): WeeklyReportWindow {
  assertValidDate(now);

  const currentDayStart = getShanghaiStartOfDay(now);
  const shanghaiDayOfWeek = new Date(currentDayStart.getTime() + SHANGHAI_OFFSET_MS).getUTCDay();
  const daysFromMonday = (shanghaiDayOfWeek + 6) % 7;
  const weekStartAt = new Date(currentDayStart.getTime() - daysFromMonday * DAY_MS);
  const weekEndAt = new Date(currentDayStart.getTime() + DAY_MS - 1);

  return {
    weekStartDayKey: getShanghaiDayKey(weekStartAt),
    weekEndDayKey: getShanghaiDayKey(now),
    weekStartAt,
    weekEndAt,
  };
}

export function buildWeeklyReportSummary(snapshot: WeeklyReportSnapshot): string {
  const seasonText = snapshot.metrics.seasonProgress
    ? `，赛季进度 ${snapshot.metrics.seasonProgress.filledSlots}/${snapshot.metrics.seasonProgress.targetSlots}`
    : "";

  return `本周打卡 ${snapshot.metrics.totalPunches} 次，全勤 ${snapshot.metrics.fullAttendanceDays} 天${seasonText}。`;
}
