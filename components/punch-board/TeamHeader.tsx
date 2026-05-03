"use client";

import { useBoard } from "@/lib/store";
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
    <header className="team-header team-header-bulletin w-full soft-card shrink-0 z-20">
      <span className="team-header-pin team-header-pin-tl" aria-hidden="true" />
      <span className="team-header-pin team-header-pin-tr" aria-hidden="true" />
      <span className="team-header-pin team-header-pin-bl" aria-hidden="true" />
      <span className="team-header-pin team-header-pin-br" aria-hidden="true" />

      <div className="team-header-vault team-header-vault-note flex shrink-0 items-center gap-4">
        <div className="team-header-vault-visual" aria-hidden="true">
          <img
            src="/assets/home-scenes/punch/vault-safe.webp"
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
        <div className="team-header-vault-copy flex flex-col">
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

      <div className="team-header-account team-header-ledger">
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
