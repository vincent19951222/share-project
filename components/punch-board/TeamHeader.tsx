"use client";

import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";
import { SeasonProgressBar } from "./SeasonProgressBar";

export function TeamHeader() {
  const { state } = useBoard();
  const teamVaultTotal = state.teamVaultTotal ?? 0;
  const currentUser = state.currentUser;
  const assetBalance = currentUser?.assetBalance ?? 0;
  const currentStreak = currentUser?.currentStreak ?? 0;
  const nextReward = currentUser?.nextReward ?? 0;
  const todayIndex = state.today > 0 ? state.today - 1 : null;
  const todayPunchedCount =
    todayIndex === null
      ? 0
      : state.gridData.filter((row) => row[todayIndex] === true).length;

  return (
    <header className="h-[12vh] w-full soft-card flex items-center justify-between gap-6 px-8 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center bg-orange-100 rounded-full border-2 border-orange-200 shadow-sm text-orange-500 p-2">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.trophy }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
          <div className="text-2xl font-extrabold flex items-baseline gap-1">
            {teamVaultTotal.toLocaleString("zh-CN")}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-2">
        <SeasonProgressBar activeSeason={state.activeSeason ?? null} />
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <span className="text-[10px] font-bold text-sub tracking-wider uppercase">我的银子</span>
        <div className="text-2xl font-extrabold text-main">
          {assetBalance.toLocaleString("zh-CN")}
        </div>
        <div className="text-xs font-bold text-sub">
          连签 {currentStreak} 天 · 下次奖励 {nextReward} 银子
        </div>
        <div className="text-xs font-bold text-sub">
          今日已打卡 {todayPunchedCount}/{state.members.length}
        </div>
      </div>
    </header>
  );
}
