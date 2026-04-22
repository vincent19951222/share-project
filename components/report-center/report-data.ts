import type { BoardState } from "@/lib/types";

export interface ReportMetric {
  label: string;
  value: string;
  helper: string;
  tone: "plain" | "good" | "warm";
}

export interface DailyTrendPoint {
  day: number;
  count: number;
  isFullAttendance: boolean;
  isPeak: boolean;
  isLow: boolean;
}

export interface ReportHighlight {
  title: string;
  body: string;
  tone: "blue" | "green" | "rose";
}

export interface ReportDaySummary {
  day: number;
  count: number;
}

export interface ReportData {
  title: string;
  summary: string;
  teamVault: {
    current: number;
    target: number;
    progress: number;
  };
  metrics: ReportMetric[];
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
  highlights: ReportHighlight[];
}

interface StreakSummary {
  name: string;
  streak: number;
}

function clampElapsedDays(state: BoardState) {
  return Math.max(0, Math.min(state.today, state.totalDays));
}

function countPunchesForDay(state: BoardState, dayIndex: number) {
  return state.gridData.reduce((count, row) => count + (row[dayIndex] === true ? 1 : 0), 0);
}

function getLongestStreak(state: BoardState, elapsedDays: number): StreakSummary | null {
  let best: StreakSummary | null = null;

  for (let memberIndex = 0; memberIndex < state.members.length; memberIndex += 1) {
    const member = state.members[memberIndex];
    const row = state.gridData[memberIndex] ?? [];
    let current = 0;
    let longest = 0;

    for (let dayIndex = 0; dayIndex < elapsedDays; dayIndex += 1) {
      if (row[dayIndex] === true) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }

    if (!best || longest > best.streak) {
      best = { name: member.name, streak: longest };
    }
  }

  if (!best || best.streak <= 0) {
    return null;
  }

  return best;
}

function getDashboardTitle(now: Date) {
  const month = now.toLocaleString("en-US", { month: "long" }).toUpperCase();
  return `${month} DASHBOARD`;
}

function getSummary(totalPunches: number, fullAttendanceDays: number, completionRate: number) {
  if (totalPunches === 0) {
    return "本月打卡 0 次，全勤 0 天，先攒一点数据再看趋势。";
  }

  const rhythm = completionRate >= 80 ? "团队节奏稳住了" : "团队节奏还有上升空间";
  return `本月打卡 ${totalPunches} 次，全勤 ${fullAttendanceDays} 天，${rhythm}。`;
}

function getCompletionHelper(completionRate: number) {
  if (completionRate >= 90) return "很顶，几乎全员在线";
  if (completionRate >= 75) return "节奏不错，继续保持";
  if (completionRate > 0) return "还有上升空间";
  return "等第一批打卡点亮";
}

function getHighlights(
  completionRate: number,
  peakDay: ReportDaySummary | null,
  lowDay: ReportDaySummary | null,
  memberCount: number,
): ReportHighlight[] {
  const teamSummary =
    completionRate >= 80
      ? "最近整体完成率不错，说明团队节奏正在稳定。"
      : "目前波动还比较明显，先把连续打卡节奏养起来。";

  const cheerBody = peakDay
    ? `第 ${peakDay.day} 天有 ${peakDay.count}/${memberCount} 人打卡，是本段最高点。`
    : "暂无足够数据，等大家点亮第一批格子。";

  const reminderBody =
    lowDay && memberCount > 0 && lowDay.count < memberCount
      ? `第 ${lowDay.day} 天是低谷，提前约一波会更稳。`
      : "目前没有明显低谷，保持这个节奏就很好。";

  return [
    { title: "气氛组播报", body: cheerBody, tone: "blue" },
    { title: "团队小结", body: teamSummary, tone: "green" },
    { title: "轻提醒", body: reminderBody, tone: "rose" },
  ];
}

export function buildReportData(state: BoardState, now = new Date()): ReportData {
  const elapsedDays = clampElapsedDays(state);
  const memberCount = state.members.length;
  const elapsedMemberDays = memberCount * elapsedDays;

  const rawDailyCounts = Array.from({ length: elapsedDays }, (_, dayIndex) => ({
    day: dayIndex + 1,
    count: countPunchesForDay(state, dayIndex),
  }));

  const totalPunches = rawDailyCounts.reduce((sum, point) => sum + point.count, 0);
  const completionRate =
    elapsedMemberDays > 0 ? Math.round((totalPunches / elapsedMemberDays) * 100) : 0;
  const fullAttendanceDays =
    memberCount > 0 ? rawDailyCounts.filter((point) => point.count === memberCount).length : 0;

  const peakDay = rawDailyCounts.reduce<ReportDaySummary | null>(
    (best, point) => (!best || point.count > best.count ? point : best),
    null,
  );
  const lowDay = rawDailyCounts.reduce<ReportDaySummary | null>(
    (best, point) => (!best || point.count < best.count ? point : best),
    null,
  );

  const dailyPoints = rawDailyCounts.map((point) => ({
    ...point,
    isFullAttendance: memberCount > 0 && point.count === memberCount,
    isPeak: peakDay?.day === point.day,
    isLow: lowDay?.day === point.day,
  }));

  const mostConsistentMember = getLongestStreak(state, elapsedDays);
  const vaultProgress =
    state.targetCoins > 0 ? Math.min(100, Math.round((state.teamCoins / state.targetCoins) * 100)) : 0;

  return {
    title: getDashboardTitle(now),
    summary: getSummary(totalPunches, fullAttendanceDays, completionRate),
    teamVault: {
      current: state.teamCoins,
      target: state.targetCoins,
      progress: vaultProgress,
    },
    metrics: [
      {
        label: "团队完成率",
        value: `${completionRate}%`,
        helper: getCompletionHelper(completionRate),
        tone: completionRate >= 75 ? "good" : "plain",
      },
      {
        label: "总打卡次数",
        value: totalPunches.toLocaleString("zh-CN"),
        helper: `${memberCount} 人 · ${elapsedDays} 天`,
        tone: "plain",
      },
      {
        label: "全勤日",
        value: fullAttendanceDays.toLocaleString("zh-CN"),
        helper: fullAttendanceDays > 0 ? "全员亮灯的日子" : "还在等第一次全员亮灯",
        tone: "good",
      },
      {
        label: "本月高光",
        value: mostConsistentMember ? `最稳：${mostConsistentMember.name}` : "暂无高光",
        helper: mostConsistentMember
          ? `最长连续 ${mostConsistentMember.streak} 天没掉链子`
          : "先攒一点连续记录",
        tone: "warm",
      },
    ],
    dailyPoints,
    peakDay,
    lowDay,
    highlights: getHighlights(completionRate, peakDay, lowDay, memberCount),
  };
}
