"use client";

import { useBoard } from "@/lib/store";
import { AssetIcon } from "@/components/ui/AssetIcon";
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
    <header className="team-header w-full soft-card shrink-0 z-20">
      <div className="flex shrink-0 items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center bg-orange-100 rounded-full border-2 border-orange-200 shadow-sm text-orange-500 p-2">
          <AssetIcon name="vaultTrophy" className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
          <div className="text-2xl font-extrabold flex items-baseline gap-1">
            {teamVaultTotal.toLocaleString("zh-CN")}
          </div>
          <span className="text-xs font-medium text-sub">全队个人银子总和</span>
        </div>
      </div>

      <div className="team-header-progress mx-2 max-w-2xl flex-1">
        <SeasonProgressBar activeSeason={state.activeSeason ?? null} />
      </div>

      <div className="team-header-account">
        <div className="team-header-account-inner">
          <div className="team-header-account-summary">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-sub tracking-wider">我的银子</span>
              <span className="team-header-account-subtitle">个人长期累计资产</span>
            </div>
            <div className="team-header-account-balance">
              {assetBalance.toLocaleString("zh-CN")}
            </div>
          </div>

          <div className="team-header-account-kpis">
            <div className="team-header-account-kpi bg-slate-100/80">
              <div className="team-header-account-kpi-label text-slate-400">连签</div>
              <div className="team-header-account-kpi-value">{currentStreak} 天</div>
            </div>
            <div className="team-header-account-kpi bg-amber-100/70">
              <div className="team-header-account-kpi-label text-amber-500">下次奖励</div>
              <div className="team-header-account-kpi-value">{nextReward} 银子</div>
            </div>
            <div className="team-header-account-kpi bg-slate-100/80">
              <div className="team-header-account-kpi-label text-slate-400">今日打卡</div>
              <div className="team-header-account-kpi-value">
                {todayPunchedCount}/{state.members.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
