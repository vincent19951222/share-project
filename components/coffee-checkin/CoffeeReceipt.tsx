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
    mint: "coffee-stat-mint",
    latte: "coffee-stat-latte",
    yellow: "coffee-stat-yellow",
    plain: "coffee-stat-plain",
  }[tone];

  const icon = {
    mint: "☕",
    latte: "●",
    yellow: "☕",
    plain: "♕",
  }[tone];

  return (
    <article className={`coffee-stat-tile ${toneClass}`}>
      <div className="coffee-stat-label">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="coffee-stat-value">{value}</div>
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
    <section className="coffee-receipt coffee-receipt-ticket">
      <header className="coffee-receipt-header">
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

      <div className="coffee-receipt-stats">
        <StatTile label="今日总杯数" value={String(snapshot.stats.todayTotalCups)} tone="mint" />
        <StatTile label="今日续命人数" value={`${snapshot.stats.todayDrinkers}/${snapshot.members.length}`} tone="latte" />
        <StatTile label="我的今日杯数" value={String(myCups)} tone="yellow" />
        <StatTile label="今日咖啡王" value={coffeeKing} tone="plain" />
      </div>

      <div className="coffee-receipt-body">
        <div className="coffee-today-panel">
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
              className="coffee-cup-action disabled:cursor-not-allowed disabled:opacity-40"
            >
              -1 杯
            </button>
            <div className="coffee-cup-summary">
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
              className="coffee-cup-action disabled:cursor-wait disabled:opacity-60"
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
