"use client";

import { getAvatarUrl } from "@/lib/avatars";
import { getSeasonTheme } from "@/lib/season-theme";
import type { ActiveSeasonSnapshot, BoardContribution } from "@/lib/types";

interface SeasonProgressBarProps {
  activeSeason?: ActiveSeasonSnapshot | null;
}

function parseSeasonMonth(monthKey: string) {
  const month = Number(monthKey.split("-")[1]);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function getSlotColor(month: number, colorIndex: number) {
  const theme = getSeasonTheme(month);
  return theme.memberColors[colorIndex % theme.memberColors.length];
}

function buildFilledSlots(contributions: BoardContribution[]) {
  return contributions.flatMap((contribution) =>
    Array.from({ length: contribution.slotContribution }, () => contribution),
  );
}

function getContributorLabel(contribution: BoardContribution) {
  return `${contribution.name} · 贡献 ${contribution.slotContribution} 格 · 赛季收入 ${contribution.seasonIncome} 银子`;
}

const EMPTY_SLOT_COLOR = "#f8fafc";

export function SeasonProgressBar({ activeSeason }: SeasonProgressBarProps) {
  if (!activeSeason) {
    return (
      <div className="flex h-full min-h-12 items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-bold text-sub">
        暂无进行中的赛季
      </div>
    );
  }

  const month = parseSeasonMonth(activeSeason.monthKey);
  if (!month) {
    return (
      <div className="flex h-full min-h-12 items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-bold text-sub">
        赛季信息暂不可用
      </div>
    );
  }

  const theme = getSeasonTheme(month);
  const targetSlots = Math.max(0, activeSeason.targetSlots);
  const filledSlots = Math.max(0, Math.min(activeSeason.filledSlots, targetSlots));
  const segments = targetSlots > 0 ? targetSlots : 1;
  const filledSlotContributors = buildFilledSlots(activeSeason.contributions);
  const helperText =
    targetSlots > 0
      ? `${activeSeason.goalName} · ${filledSlots}/${targetSlots}`
      : `${activeSeason.goalName} · 0/0`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-sub">
        <span className="text-main">赛季进度</span>
        <span>{helperText}</span>
      </div>
      <div
        data-testid="season-progress-grid"
        className="grid h-4 gap-px rounded-full border-2 border-slate-800 bg-slate-800 p-px"
        style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: segments }, (_, index) => {
          const isFilled = index < filledSlots;
          const contributor = filledSlotContributors[index];
          const contributorLabel = contributor ? getContributorLabel(contributor) : null;
          const backgroundColor = isFilled
            ? getSlotColor(theme.month, contributor?.colorIndex ?? 0)
            : EMPTY_SLOT_COLOR;

          return (
            <div
              key={`${activeSeason.id}-${index}`}
              data-slot-state={isFilled ? "filled" : "empty"}
              aria-label={contributorLabel ?? undefined}
              tabIndex={contributorLabel ? 0 : undefined}
              title={contributorLabel ?? undefined}
              className="group relative h-full rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
    </div>
  );
}
