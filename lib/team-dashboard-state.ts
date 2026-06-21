import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import { drinkCatalog, isDrinkType, type DrinkType } from "@/lib/drinks";
import {
  CARDIO_ITEMS,
  STRENGTH_PARTS,
  getCardioItemLabel,
  getStrengthPartLabel,
  type CardioItem,
  type StrengthPart,
} from "@/lib/workouts";
import type {
  DashboardPeriod,
  TeamDashboardSnapshot,
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
  TeamPunchTrendPoint,
  TeamWorkoutBalanceItem,
} from "@/lib/types";

function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return getShanghaiDayKey(d);
}

function countElapsedDays(startKey: string, endKey: string): number {
  let count = 0;
  let cur = startKey;
  while (cur <= endKey) {
    count += 1;
    cur = addDays(cur, 1);
  }
  return count;
}

export async function buildTeamDashboardSnapshot(
  teamId: string,
  period: DashboardPeriod,
  now: Date = new Date(),
): Promise<TeamDashboardSnapshot | null> {
  const todayDayKey = getShanghaiDayKey(now);
  const year = Number(todayDayKey.slice(0, 4));
  const monthKey = todayDayKey.slice(0, 7);
  const startKey = period === "month" ? `${monthKey}-01` : `${year}-01-01`;
  const endKey = todayDayKey;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      users: {
        select: {
          id: true,
          punchRecords: {
            where: { dayKey: { gte: startKey, lte: endKey } },
            select: { dayKey: true, punched: true },
          },
          workoutRecords: {
            where: { dayKey: { gte: startKey, lte: endKey } },
            include: { entries: true },
          },
          drinkRecords: {
            where: { dayKey: { gte: startKey, lte: endKey }, deletedAt: null },
            select: { dayKey: true, drinkType: true },
          },
        },
      },
    },
  });

  if (!team) {
    return null;
  }

  const memberCount = team.users.length;
  const elapsedDays = countElapsedDays(startKey, endKey);

  // --- punch 聚合 ---
  const punchByDay = new Map<string, number>();
  for (const u of team.users) {
    for (const p of u.punchRecords) {
      if (p.punched) {
        punchByDay.set(p.dayKey, (punchByDay.get(p.dayKey) ?? 0) + 1);
      }
    }
  }

  // --- drink by day（trend 复用，需先于 trend 构建）---
  const drinkByDay = new Map<string, number>();
  for (const u of team.users) {
    for (const dr of u.drinkRecords) {
      drinkByDay.set(dr.dayKey, (drinkByDay.get(dr.dayKey) ?? 0) + 1);
    }
  }

  // --- punchTrend / drinkTrend 构建（月视图逐天，年视图按月聚合）---
  const punchTrend: TeamPunchTrendPoint[] = [];
  const drinkTrend: TeamDrinkTrendPoint[] = [];

  if (period === "month") {
    let cur = startKey;
    while (cur <= endKey) {
      const count = punchByDay.get(cur) ?? 0;
      punchTrend.push({
        dayKey: cur,
        count,
        isFullAttendance: memberCount > 0 && count === memberCount,
      });
      drinkTrend.push({ dayKey: cur, count: drinkByDay.get(cur) ?? 0 });
      cur = addDays(cur, 1);
    }
  } else {
    // 年视图：按月聚合 1 月到当前月
    const currentMonth = Number(todayDayKey.slice(5, 7));
    const punchByMonth = new Map<string, number>();
    const drinkByMonth = new Map<string, number>();
    for (const [day, c] of punchByDay) {
      const m = day.slice(0, 7);
      punchByMonth.set(m, (punchByMonth.get(m) ?? 0) + c);
    }
    for (const [day, c] of drinkByDay) {
      const m = day.slice(0, 7);
      drinkByMonth.set(m, (drinkByMonth.get(m) ?? 0) + c);
    }
    for (let m = 1; m <= currentMonth; m++) {
      const monthKey2 = `${year}-${String(m).padStart(2, "0")}`;
      const count = punchByMonth.get(monthKey2) ?? 0;
      punchTrend.push({
        dayKey: monthKey2,
        count,
        isFullAttendance: false, // 年视图不标全勤
      });
      drinkTrend.push({ dayKey: monthKey2, count: drinkByMonth.get(monthKey2) ?? 0 });
    }
  }

  const totalPunches = Array.from(punchByDay.values()).reduce((a, b) => a + b, 0);
  const fullAttendanceDays = punchTrend.filter((p) => p.isFullAttendance).length;
  const completionRate =
    memberCount > 0 && elapsedDays > 0 ? totalPunches / (memberCount * elapsedDays) : 0;

  // --- workout balance ---
  const balanceCount = new Map<string, number>();
  for (const u of team.users) {
    for (const wr of u.workoutRecords) {
      for (const entry of wr.entries) {
        if ((STRENGTH_PARTS as readonly string[]).includes(entry.code)) {
          const part = entry.code as StrengthPart;
          balanceCount.set(part, (balanceCount.get(part) ?? 0) + 1);
        } else if ((CARDIO_ITEMS as readonly string[]).includes(entry.code)) {
          const item = entry.code as CardioItem;
          balanceCount.set(item, (balanceCount.get(item) ?? 0) + 1);
        }
      }
    }
  }
  const workoutBalance: TeamWorkoutBalanceItem[] = [
    ...STRENGTH_PARTS.map((part) => ({
      code: part,
      label: getStrengthPartLabel(part),
      count: balanceCount.get(part) ?? 0,
    })),
    ...CARDIO_ITEMS.map((item) => ({
      code: item,
      label: getCardioItemLabel(item),
      count: balanceCount.get(item) ?? 0,
    })),
  ];

  // --- drink breakdown ---
  const drinkCount = new Map<DrinkType, number>();
  for (const u of team.users) {
    for (const dr of u.drinkRecords) {
      const type: DrinkType = isDrinkType(dr.drinkType) ? dr.drinkType : "other";
      drinkCount.set(type, (drinkCount.get(type) ?? 0) + 1);
    }
  }
  const drinkBreakdown: TeamDrinkBreakdownItem[] = (Object.keys(drinkCatalog) as DrinkType[]).map(
    (type) => ({
      type,
      label: drinkCatalog[type].label,
      count: drinkCount.get(type) ?? 0,
      color: drinkCatalog[type].color,
    }),
  );

  return {
    period: { type: period, startKey, endKey },
    metrics: { completionRate, totalPunches, fullAttendanceDays },
    punchTrend,
    workoutBalance,
    drinkBreakdown,
    drinkTrend,
  };
}
