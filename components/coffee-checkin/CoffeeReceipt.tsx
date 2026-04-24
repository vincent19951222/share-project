"use client";

import { CoffeeActivityFeed } from "./CoffeeActivityFeed";
import type { CoffeeSnapshot } from "@/lib/types";

interface CoffeeReceiptProps {
  snapshot: CoffeeSnapshot;
  busy: boolean;
  error: string | null;
  onAddCup: () => void;
  onRemoveCup: () => void;
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "mint" | "latte" | "yellow" | "plain";
}) {
  const toneClass = {
    mint: "bg-teal-100",
    latte: "bg-orange-100",
    yellow: "bg-yellow-200",
    plain: "bg-white",
  }[tone];

  return (
    <article className={`min-h-24 rounded-2xl border-[3px] border-slate-900 p-4 shadow-[4px_4px_0_0_rgba(63,42,29,0.28)] ${toneClass}`}>
      <div className="text-xs font-black text-amber-800">{label}</div>
      <div className="mt-3 text-3xl font-black leading-none text-amber-950">{value}</div>
    </article>
  );
}

function CupStack({ cups }: { cups: number }) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden" aria-hidden="true">
      {Array.from({ length: Math.min(cups, 6) }, (_, index) => (
        <span
          key={index}
          className="h-6 w-5 shrink-0 rounded-b-lg rounded-t-sm border-2 border-slate-900 bg-gradient-to-b from-white from-[28%] to-orange-200"
          style={{ transform: `rotate(${[-5, 3, -2, 5, -4, 2][index]}deg)` }}
        />
      ))}
    </div>
  );
}

export function CoffeeReceipt({
  snapshot,
  busy,
  error,
  onAddCup,
  onRemoveCup,
}: CoffeeReceiptProps) {
  const myCups = snapshot.stats.currentUserTodayCups;
  const coffeeKing = snapshot.stats.coffeeKing
    ? `${snapshot.stats.coffeeKing.name} · ${snapshot.stats.coffeeKing.cups}`
    : "暂无";

  return (
    <section className="coffee-receipt flex min-h-0 flex-col overflow-hidden rounded-[1.2rem] border-4 border-slate-900 bg-orange-50 shadow-[8px_8px_0_0_rgba(63,42,29,0.9)]">
      <header className="border-b-[3px] border-dashed border-amber-900/40 bg-yellow-50 p-6">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
          Daily Coffee Receipt
        </div>
        <h1 className="mt-2 text-4xl font-black leading-none tracking-normal text-amber-950">
          今日咖啡小票
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black shadow-[0_2px_0_0_#1f2937]">
            只记录今天
          </span>
          <span className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black shadow-[0_2px_0_0_#1f2937]">
            不参与银子
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 border-b-[3px] border-dashed border-amber-900/25 p-4">
        <StatTile label="今日总杯数" value={String(snapshot.stats.todayTotalCups)} tone="mint" />
        <StatTile label="今日续命人数" value={`${snapshot.stats.todayDrinkers}/${snapshot.members.length}`} tone="latte" />
        <StatTile label="我的今日杯数" value={String(myCups)} tone="yellow" />
        <StatTile label="今日咖啡王" value={coffeeKing} tone="plain" />
      </div>

      <div className="grid gap-3 p-4">
        <div className="coffee-today-panel rounded-2xl border-[3px] border-slate-900 bg-orange-100 p-4">
          <div className="coffee-today-eyebrow text-xs font-black uppercase tracking-[0.12em] text-amber-700">
            My Coffee Today
          </div>
          <div className="coffee-today-title mt-1 text-lg font-black text-amber-950">
            {myCups === 0 ? "今天还没续命" : `今天已续命 ${myCups} 杯`}
          </div>
          <div className="coffee-today-controls mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button
              type="button"
              disabled={busy || myCups === 0}
              onClick={onRemoveCup}
              className="coffee-cup-action h-12 rounded-full border-[3px] border-slate-900 bg-orange-200 px-4 text-sm font-black shadow-[0_4px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-40"
            >
              -1 杯
            </button>
            <div className="coffee-cup-summary flex min-w-0 items-center justify-between gap-3 rounded-2xl border-[3px] border-slate-900 bg-white px-4 py-3">
              <div>
                <div className="coffee-cup-summary-label text-xs font-black text-amber-700">当前杯数</div>
                <div className="coffee-cup-summary-value text-2xl font-black text-amber-950">{myCups} 杯</div>
              </div>
              <CupStack cups={myCups} />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onAddCup}
              className="coffee-cup-action h-12 rounded-full border-[3px] border-slate-900 bg-teal-200 px-4 text-sm font-black shadow-[0_4px_0_0_#1f2937] disabled:cursor-wait disabled:opacity-60"
            >
              +1 杯
            </button>
          </div>
          {error ? <p className="mt-3 text-sm font-black text-orange-600">{error}</p> : null}
        </div>
        <CoffeeActivityFeed />
      </div>
    </section>
  );
}
