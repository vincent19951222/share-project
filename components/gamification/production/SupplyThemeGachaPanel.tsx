"use client";

import type { SupplyAiImageSnapshot } from "@/lib/types";

interface SupplyThemeGachaPanelProps {
  snapshot: SupplyAiImageSnapshot;
  isDrawingTheme?: boolean;
  onDrawTheme: () => Promise<void> | void;
}

export function SupplyThemeGachaPanel({
  snapshot,
  isDrawingTheme = false,
  onDrawTheme,
}: SupplyThemeGachaPanelProps) {
  const canDraw =
    !isDrawingTheme &&
    !snapshot.themes.allUnlocked &&
    snapshot.wallet.coins >= snapshot.wallet.themeDrawCost;

  return (
    <section className="supply-theme-gacha-panel grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="soft-card flex flex-col gap-4 p-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">THEME GACHA</p>
          <h2 className="mt-1 text-2xl font-black text-main">主题扭蛋</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border-[3px] border-slate-900 bg-white p-3 shadow-[0_4px_0_0_#1f2937]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">本次消耗</p>
            <p className="mt-2 text-xl font-black text-main">{snapshot.wallet.themeDrawCost}</p>
          </div>
          <div className="rounded-xl border-[3px] border-slate-900 bg-white p-3 shadow-[0_4px_0_0_#1f2937]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">待解锁</p>
            <p className="mt-2 text-xl font-black text-main">{snapshot.themes.locked.length}</p>
          </div>
          <div className="rounded-xl border-[3px] border-slate-900 bg-white p-3 shadow-[0_4px_0_0_#1f2937]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">已解锁</p>
            <p className="mt-2 text-xl font-black text-main">{snapshot.themes.unlocked.length}</p>
          </div>
        </div>

        <button
          className="quest-btn mt-auto w-full px-4 py-3 text-sm disabled:opacity-50"
          data-action="draw-ai-image-theme"
          disabled={!canDraw}
          onClick={() => void onDrawTheme()}
          type="button"
        >
          {snapshot.themes.allUnlocked ? "主题已抽满" : isDrawingTheme ? "抽取中..." : "抽一个新主题"}
        </button>
      </div>

      <div className="soft-card p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sub">已解锁主题</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {snapshot.themes.unlocked.map((theme) => (
            <article
              key={theme.id}
              className="rounded-xl border-[3px] border-slate-900 bg-white p-4 shadow-[0_4px_0_0_#1f2937]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-main">{theme.name}</p>
                  <p className="mt-1 text-sm font-bold text-sub">{theme.description}</p>
                </div>
                <span className="rounded-full border-2 border-slate-900 bg-yellow-100 px-2 py-1 text-[10px] font-black text-main shadow-[0_2px_0_0_#1f2937]">
                  {theme.tag}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
