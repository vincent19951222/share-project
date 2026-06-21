import { getAvatarUrl } from "@/lib/avatars";
import { getSeasonTheme } from "@/lib/season-theme";
import type { ActiveSeasonSnapshot, BoardContribution } from "@/lib/types";
import { EmptyState } from "./EmptyState";

const R = 50;
const EMPTY_SLOT_COLOR = "#f8fafc";

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

function buildFilledSlots(contributions: BoardContribution[]) {
  return contributions.flatMap((contribution) =>
    Array.from({ length: contribution.slotContribution }, () => contribution),
  );
}

function getContributorLabel(contribution: BoardContribution) {
  return `${contribution.name} · 贡献 ${contribution.slotContribution} 格 · 赛季收入 ${contribution.seasonIncome} 银子`;
}

function toSafeSvgId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
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
  const targetSlots = Math.max(0, season.targetSlots);
  const filledSlots = Math.max(0, Math.min(season.filledSlots, targetSlots));
  const segments = targetSlots > 0 ? targetSlots : 1;
  const filledSlotContributors = buildFilledSlots(season.contributions);
  const pieGridClipId = `report-season-pie-grid-${toSafeSvgId(season.id)}`;

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
          <div
            data-report-season-progress-grid
            className="grid h-6 w-full gap-px rounded border-2 border-[#1f2937] bg-[#1f2937] p-px"
            style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: segments }, (_, index) => {
              const isFilled = index < filledSlots;
              const contributor = filledSlotContributors[index];
              const contributorLabel = contributor ? getContributorLabel(contributor) : null;
              const backgroundColor = isFilled
                ? theme.memberColors[(contributor?.colorIndex ?? 0) % theme.memberColors.length]
                : EMPTY_SLOT_COLOR;

              return (
                <div
                  key={`${season.id}-${index}`}
                  data-report-season-slot
                  data-slot-state={isFilled ? "filled" : "empty"}
                  aria-label={contributorLabel ?? undefined}
                  tabIndex={contributorLabel ? 0 : undefined}
                  title={contributorLabel ?? undefined}
                  className="group relative h-full rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  style={{ backgroundColor }}
                >
                  {contributor ? (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 flex min-w-max -translate-x-1/2 items-center gap-2 rounded-full border-2 border-slate-200 bg-white py-1 pl-1 pr-3 text-[11px] font-black text-slate-700 opacity-0 shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                      <img
                        src={getAvatarUrl(contributor.avatarKey)}
                        alt={`${contributor.name} 的头像`}
                        className="h-6 w-6 rounded-full border border-slate-200 bg-slate-50 object-cover"
                      />
                      <span className="text-slate-900">{contributor.name}</span>
                      <span className="text-sub">
                        贡献 {contributor.slotContribution} 格 · 赛季收入 {contributor.seasonIncome} 银子
                      </span>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-sub">
            {Math.round(pct * 100)}% · 已 {season.filledSlots} / 目标 {season.targetSlots}
          </p>
        </div>
        {contributors.length > 0 && (
          <svg
            width={R * 2}
            height={R * 2}
            viewBox={`0 0 ${R * 2} ${R * 2}`}
            role="img"
            aria-label="贡献占比"
            className="shrink-0"
          >
            <defs>
              <clipPath id={pieGridClipId}>
                <circle cx={R} cy={R} r={R - 0.5} />
              </clipPath>
            </defs>
            {slices.map((s) => (
              <path
                key={s.userId}
                data-season-slice
                d={arcPath(s.start, s.end)}
                fill={theme.memberColors[s.colorIndex % theme.memberColors.length]}
                stroke="#1f2937"
                strokeWidth={1}
                tabIndex={0}
              >
                <title>{`${s.name}: ${s.slotContribution} 格 (${Math.round((s.slotContribution / totalContribution) * 100)}%)`}</title>
              </path>
            ))}
            <g clipPath={`url(#${pieGridClipId})`} pointerEvents="none" opacity={0.28}>
              {Array.from({ length: 7 }, (_, index) => {
                const pos = 12.5 * (index + 1);
                return (
                  <g key={pos}>
                    <line x1={pos} y1={0} x2={pos} y2={R * 2} stroke="#f8fafc" strokeWidth={1} />
                    <line x1={0} y1={pos} x2={R * 2} y2={pos} stroke="#f8fafc" strokeWidth={1} />
                  </g>
                );
              })}
            </g>
            <circle cx={R} cy={R} r={R - 0.5} fill="none" stroke="#111827" strokeWidth={1.5} />
          </svg>
        )}
      </div>
    </div>
  );
}
