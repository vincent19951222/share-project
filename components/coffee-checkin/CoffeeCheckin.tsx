"use client";

import { useCoffee } from "@/lib/coffee-store";
import { CoffeeGrid } from "./CoffeeGrid";
import { CoffeeReceipt } from "./CoffeeReceipt";

export function CoffeeCheckin() {
  const { snapshot, busy, error, addCup, removeCup } = useCoffee();

  if (!snapshot) {
    if (error) {
      return (
        <section className="flex h-full items-center justify-center rounded-[1.5rem] border-[6px] border-orange-100 bg-orange-50 p-6 text-center text-orange-950">
          <div className="max-w-md">
            <h2 className="text-3xl font-black leading-tight">咖啡小票没打出来</h2>
            <p className="mt-3 text-sm font-bold text-orange-800">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href="/login"
                className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-5 py-3 text-sm font-black shadow-[0_4px_0_0_#1f2937]"
              >
                重新登录
              </a>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border-[3px] border-slate-900 bg-white px-5 py-3 text-sm font-black shadow-[0_4px_0_0_#1f2937]"
              >
                刷新重试
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="flex h-full items-center justify-center rounded-[1.5rem] border-[6px] border-orange-100 bg-orange-50 font-black text-orange-900">
        正在打印今日咖啡小票...
      </section>
    );
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(320px,0.95fr)_minmax(520px,1.9fr)] gap-4 max-[980px]:grid-cols-1 max-[980px]:overflow-y-auto">
      <CoffeeReceipt
        snapshot={snapshot}
        busy={busy}
        error={error}
        onAddCup={() => void addCup()}
        onRemoveCup={() => void removeCup()}
      />
      <CoffeeGrid
        snapshot={snapshot}
        busy={busy}
        onAddCup={() => void addCup()}
        onRemoveCup={() => void removeCup()}
      />
    </section>
  );
}
