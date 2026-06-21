import { getSeasonTheme } from "@/lib/season-theme";
import type { ActiveSeasonSnapshot } from "@/lib/types";
import { EmptyState } from "./EmptyState";

const R = 50;

function arcPath(start: number, end: number): string {
  // start/end 为 0-1 占比
  if (end - start >= 1) {
    // 整圆（单贡献成员退化）
    return `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z`;
  }
  const a0 = start * 2 * Math.PI - Math.PI / 2;
  const a1 = end * 2 * Math.PI - Math.PI / 2;
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

function parseSeasonMonth(monthKey: string) {
  const month = Number(monthKey.split("-")[1]);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

export function SeasonSprintPanel({ season }: { season: ActiveSeasonSnapshot | null }) {
  if (!season) {
    return (
      <div className="soft-card flex min-h-[120px] items-center justify-center p-4">
        <EmptyState message="休赛期，暂无冲刺目标" />
      </div>
    );
  }

  // 解析 month 用于动态调色板；失败 fallback 到 1 月主题以保证确定性
  const month = parseSeasonMonth(season.monthKey) ?? 1;
  const theme = getSeasonTheme(month);

  const pct = season.targetSlots > 0 ? season.filledSlots / season.targetSlots : 0;
  const contributors = season.contributions.filter((c) => c.slotContribution > 0);
  const totalContribution = contributors.reduce((a, c) => a + c.slotContribution, 0);

  let acc = 0;
  const slices = contributors.map((c) => {
    const start = totalContribution > 0 ? acc / totalContribution : 0;
    acc += c.slotContribution;
    const end = totalContribution > 0 ? acc / totalContribution : 1;
    return { ...c, start, end };
  });

  return (
    <div className="soft-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <h3 className="mb-2 text-sm font-bold text-main">赛季冲刺 · {season.goalName}</h3>
          <div className="h-6 w-full rounded border-2 border-[#1f2937] bg-[#f3f4f6]">
            <div
              className="h-full rounded-sm bg-[#fde047]"
              style={{ width: `${Math.min(pct, 1) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-sub">
            {Math.round(pct * 100)}% · 已 {season.filledSlots} / 目标 {season.targetSlots}
          </p>
        </div>
        {contributors.length > 0 && (
          <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} role="img" aria-label="贡献占比">
            {slices.map((s) => (
              <path
                key={s.userId}
                data-season-slice
                d={arcPath(s.start, s.end)}
                fill={theme.memberColors[s.colorIndex % theme.memberColors.length]}
                stroke="#1f2937"
                strokeWidth={1}
              >
                <title>{`${s.name}: ${s.slotContribution} 槽 (${Math.round((s.slotContribution / totalContribution) * 100)}%)`}</title>
              </path>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
