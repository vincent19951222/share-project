import { getShanghaiDayKey } from "@/lib/economy";
import type { DashboardScope } from "@/lib/types";

/** 当前周期（默认月） */
export function currentScope(now: Date, type: "month" | "year" = "month"): DashboardScope {
  const todayKey = getShanghaiDayKey(now);
  if (type === "year") {
    return { type: "year", year: Number(todayKey.slice(0, 4)) };
  }
  return { type: "month", monthKey: todayKey.slice(0, 7) };
}

/** 上一个周期 */
export function prevScope(scope: DashboardScope): DashboardScope {
  if (scope.type === "year") {
    return { type: "year", year: scope.year - 1 };
  }
  const [year, month] = scope.monthKey.split("-").map(Number);
  const idx = year * 12 + (month - 1) - 1;
  return { type: "month", monthKey: formatMonthKey(Math.floor(idx / 12), (idx % 12) + 1) };
}

/** 下一个周期 */
export function nextScope(scope: DashboardScope): DashboardScope {
  if (scope.type === "year") {
    return { type: "year", year: scope.year + 1 };
  }
  const [year, month] = scope.monthKey.split("-").map(Number);
  const idx = year * 12 + (month - 1) + 1;
  return { type: "month", monthKey: formatMonthKey(Math.floor(idx / 12), (idx % 12) + 1) };
}

/** 是否为当前周期（不允许超过当前） */
export function isCurrentScope(scope: DashboardScope, now: Date): boolean {
  const todayKey = getShanghaiDayKey(now);
  if (scope.type === "year") {
    return scope.year === Number(todayKey.slice(0, 4));
  }
  return scope.monthKey === todayKey.slice(0, 7);
}

/** scope → startKey/endKey/isComplete。历史完整周期 endKey=月末/年末 */
export function scopeToStartEnd(
  scope: DashboardScope,
  now: Date,
): { startKey: string; endKey: string; isComplete: boolean } {
  const todayKey = getShanghaiDayKey(now);
  if (scope.type === "month") {
    const startKey = `${scope.monthKey}-01`;
    const isComplete = scope.monthKey < todayKey.slice(0, 7);
    const [year, month] = scope.monthKey.split("-").map(Number);
    const endKey = isComplete
      ? `${scope.monthKey}-${String(lastDayOfMonth(year, month)).padStart(2, "0")}`
      : todayKey;
    return { startKey, endKey, isComplete };
  }
  const startKey = `${scope.year}-01-01`;
  const isComplete = scope.year < Number(todayKey.slice(0, 4));
  const endKey = isComplete ? `${scope.year}-12-31` : todayKey;
  return { startKey, endKey, isComplete };
}

/** scope → 中文标签 */
export function formatScopeLabel(scope: DashboardScope): string {
  if (scope.type === "year") {
    return `${scope.year}年`;
  }
  const month = Number(scope.monthKey.slice(5, 7));
  return `${scope.monthKey.slice(0, 4)}年${month}月`;
}

/** scope → API query string */
export function scopeToQuery(scope: DashboardScope): string {
  if (scope.type === "year") {
    return `period=year&year=${scope.year}`;
  }
  return `period=month&monthKey=${scope.monthKey}`;
}

/** 从 API query 解析 scope。缺省锚点=当期；非法/未来锚点回退当期。 */
export function parseScopeFromQuery(searchParams: URLSearchParams, now: Date): DashboardScope {
  const todayKey = getShanghaiDayKey(now);
  const rawPeriod = searchParams.get("period");

  if (rawPeriod === "year") {
    const rawYear = Number(searchParams.get("year"));
    const currentYear = Number(todayKey.slice(0, 4));
    const year =
      Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= currentYear ? rawYear : currentYear;
    return { type: "year", year };
  }

  // month（默认）
  const rawMonthKey = searchParams.get("monthKey");
  const currentMonthKey = todayKey.slice(0, 7);
  const monthKey =
    rawMonthKey && isValidMonthKey(rawMonthKey) && rawMonthKey <= currentMonthKey
      ? rawMonthKey
      : currentMonthKey;
  return { type: "month", monthKey };
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  // month: 1-12。用下个月第 0 天 = 本月最后一天
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidMonthKey(monthKey: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}
