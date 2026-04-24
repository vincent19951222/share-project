import { getShanghaiDayKey } from "@/lib/economy";
import type { BoardState, CoffeeSnapshot } from "@/lib/types";

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

export interface CoffeeTrendPoint {
  day: number;
  cups: number;
}

export interface CoffeeReportData {
  todayTotalCups: number;
  todayDrinkers: number;
  memberCount: number;
  monthTotalCups: number;
  weekKing: {
    name: string;
    cups: number;
  } | null;
  recentDays: CoffeeTrendPoint[];
  roast: string;
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
    helper: string;
  };
  metrics: ReportMetric[];
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
  coffee: CoffeeReportData;
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
  const month = now.toLocaleString("en-US", { month: "numeric", timeZone: "Asia/Shanghai" });
  return `${month}月牛马战报`;
}

function getSummary(totalPunches: number, fullAttendanceDays: number, completionRate: number) {
  if (totalPunches === 0) {
    return "本月打卡 0 次，全勤 0 天，先攒一点数据再看趋势。";
  }

  const rhythm =
    completionRate >= 80 ? "团队节奏很稳。" : "团队节奏还有上升空间。";
  return `本月打卡 ${totalPunches} 次，全勤 ${fullAttendanceDays} 天，${rhythm}`;
}

function getCompletionHelper(completionRate: number) {
  if (completionRate >= 90) return "状态拉满，继续保持。";
  if (completionRate >= 75) return "整体不错，差一点就封神。";
  if (completionRate > 0) return "还有上升空间。";
  return "先从今天开始补数据。";
}

function getCoffeeRoast(todayTotalCups: number) {
  if (todayTotalCups === 0) return "今天全员靠意志力硬撑。";
  if (todayTotalCups <= 3) return "轻度续命，问题不大。";
  if (todayTotalCups <= 7) return "办公室空气里开始有咖啡因。";
  return "本队今日疑似改烧美式。";
}

function getShanghaiWeekStartDay(now: Date) {
  const [yearText, monthText, dayText] = getShanghaiDayKey(now).split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;

  return Math.max(1, day - daysSinceMonday);
}

function countCoffeeCupsForDay(snapshot: CoffeeSnapshot, day: number) {
  return snapshot.gridData.reduce(
    (sum, row) => sum + (row[day - 1]?.cups ?? 0),
    0,
  );
}

function buildEmptyCoffeeReport(): CoffeeReportData {
  return {
    todayTotalCups: 0,
    todayDrinkers: 0,
    memberCount: 0,
    monthTotalCups: 0,
    weekKing: null,
    recentDays: [],
    roast: getCoffeeRoast(0),
  };
}

function buildCoffeeReport(
  snapshot: CoffeeSnapshot | null | undefined,
  now: Date,
): CoffeeReportData {
  if (!snapshot) {
    return buildEmptyCoffeeReport();
  }

  const monthTotalCups = snapshot.gridData.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.cups, 0),
    0,
  );
  const weekStartDay = getShanghaiWeekStartDay(now);
  const weekRows = snapshot.members.map((member, rowIndex) => {
    const cups = snapshot.gridData[rowIndex]
      ?.slice(weekStartDay - 1, snapshot.today)
      .reduce((sum, cell) => sum + cell.cups, 0) ?? 0;

    return {
      name: member.name,
      cups,
    };
  });
  const weekKing =
    weekRows
      .filter((row) => row.cups > 0)
      .sort((left, right) => right.cups - left.cups || left.name.localeCompare(right.name))[0] ??
    null;
  const startDay = Math.max(1, snapshot.today - 6);
  const recentDays = Array.from(
    { length: snapshot.today - startDay + 1 },
    (_, index) => {
      const day = startDay + index;
      return {
        day,
        cups: countCoffeeCupsForDay(snapshot, day),
      };
    },
  );

  return {
    todayTotalCups: snapshot.stats.todayTotalCups,
    todayDrinkers: snapshot.stats.todayDrinkers,
    memberCount: snapshot.members.length,
    monthTotalCups,
    weekKing,
    recentDays,
    roast: getCoffeeRoast(snapshot.stats.todayTotalCups),
  };
}

export function buildReportData(
  state: BoardState,
  now = new Date(),
  coffeeSnapshot?: CoffeeSnapshot | null,
): ReportData {
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
  const teamVaultTotal = state.teamVaultTotal ?? 0;
  const activeSeason = state.activeSeason ?? null;

  return {
    title: getDashboardTitle(now),
    summary: getSummary(totalPunches, fullAttendanceDays, completionRate),
    teamVault: {
      current: teamVaultTotal,
      helper: activeSeason
        ? `${activeSeason.goalName} · ${Math.min(activeSeason.filledSlots, activeSeason.targetSlots)}/${activeSeason.targetSlots}`
        : "暂无进行中的赛季",
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
        helper: fullAttendanceDays > 0 ? "全员亮灯的日子。" : "还没有全员亮灯。",
        tone: "good",
      },
      {
        label: "本月高光",
        value: mostConsistentMember ? `最稳：${mostConsistentMember.name}` : "暂无高光",
        helper: mostConsistentMember
          ? `最长连续 ${mostConsistentMember.streak} 天没掉链子`
          : "等第一段连续记录出现。",
        tone: "warm",
      },
    ],
    dailyPoints,
    peakDay,
    lowDay,
    coffee: buildCoffeeReport(coffeeSnapshot, now),
  };
}
