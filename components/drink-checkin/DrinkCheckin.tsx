"use client";

import { DrinkActivityFeed } from "./DrinkActivityFeed";
import { DrinkReceipt } from "./DrinkReceipt";
import { DrinkTeamGrid } from "./DrinkTeamGrid";
import { useDrink } from "@/lib/drink-store";

export function DrinkCheckin() {
  const { snapshot, busy, error, confirmDrink, removeLatestDrink } = useDrink();

  if (!snapshot) {
    if (error) {
      return (
        <section className="min-h-[60vh] bg-[#f7eddc] px-4 py-10 text-slate-950">
          <div className="mx-auto grid min-h-[360px] max-w-2xl place-items-center rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-8 text-center shadow-[10px_10px_0_rgba(15,23,42,0.3)]">
            <div>
              <h1 className="text-3xl font-black leading-tight">水铺小票没打出来</h1>
              <p className="mt-3 text-sm font-bold text-orange-800">{error}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a
                  href="/login"
                  className="rounded-[8px] border-2 border-slate-950 bg-yellow-200 px-4 py-2 text-sm font-black"
                >
                  重新登录
                </a>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-[8px] border-2 border-slate-950 bg-white px-4 py-2 text-sm font-black"
                >
                  刷新重试
                </button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="grid min-h-[60vh] place-items-center bg-[#f7eddc] px-4 py-10">
        <div className="rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] px-6 py-5 text-lg font-black shadow-[8px_8px_0_rgba(15,23,42,0.26)]">
          正在打印今日水铺小票...
        </div>
      </section>
    );
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#f7eddc] bg-[linear-gradient(rgba(255,253,247,0.72),rgba(247,237,220,0.88))] px-4 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-[1390px] gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-cyan-700">Niuma Water Shop</p>
            <h1 className="text-4xl font-black leading-none tracking-normal sm:text-5xl">
              今天喝点什么
            </h1>
          </div>
          <div className="rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_rgba(15,23,42,0.24)]">
            今日总杯数 {snapshot.stats.todayTotalCups}
          </div>
        </header>

        <DrinkReceipt
          snapshot={snapshot}
          busy={busy}
          error={error}
          onConfirmDrink={confirmDrink}
          onRemoveDrink={removeLatestDrink}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DrinkTeamGrid snapshot={snapshot} />
          <DrinkActivityFeed />
        </div>
      </div>
    </main>
  );
}
