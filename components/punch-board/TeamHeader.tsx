"use client";

import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";

export function TeamHeader() {
  const { state } = useBoard();
  const progress = Math.min((state.teamCoins / state.targetCoins) * 100, 100);
  const todayPunchedCount = state.gridData.filter(
    (row) => row[state.today - 1] === true
  ).length;

  return (
    <header className="h-[12vh] w-full soft-card flex items-center justify-between px-8 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center bg-orange-100 rounded-full border-2 border-orange-200 shadow-sm text-orange-500 p-2">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.trophy }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
          <div className="text-2xl font-extrabold flex items-baseline gap-1">
            {state.teamCoins.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="flex-1 max-w-xl mx-8 flex flex-col gap-2">
        <div className="flex justify-between text-xs font-bold text-sub">
          <span className="text-main flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            WEEKLY QUEST: 星巴克下午茶
          </span>
          <span>{state.targetCoins} Pts</span>
        </div>
        <div className="h-4 w-full bg-slate-100 border-2 border-slate-200 rounded-full relative overflow-hidden">
          <div
            className="h-full bg-yellow-300 border-r-2 border-slate-800 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-sub tracking-wider uppercase">Today&apos;s Rate</span>
        <div className="text-2xl font-extrabold text-main">
          <span>{todayPunchedCount}</span>
          <span className="text-lg text-slate-300">/{state.members.length}</span>
        </div>
      </div>
    </header>
  );
}
