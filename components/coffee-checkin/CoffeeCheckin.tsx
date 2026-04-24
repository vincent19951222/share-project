"use client";

import { useEffect, useState } from "react";
import {
  addTodayCoffeeCup,
  ApiError,
  fetchCoffeeState,
  removeLatestTodayCoffeeCup,
} from "@/lib/api";
import { dispatchCalendarRefresh } from "@/lib/calendar-refresh";
import type { CoffeeSnapshot } from "@/lib/types";
import { CoffeeGrid } from "./CoffeeGrid";
import { CoffeeReceipt } from "./CoffeeReceipt";

export function CoffeeCheckin() {
  const [snapshot, setSnapshot] = useState<CoffeeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function sync() {
      try {
        const next = await fetchCoffeeState();
        if (!cancelled) {
          setSnapshot(next);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          const isUnauthorized = caught instanceof ApiError && caught.status === 401;
          setError(
            isUnauthorized
              ? "登录状态过期，请重新登录。"
              : caught instanceof Error
                ? caught.message
                : "咖啡小票同步失败，稍后再试。",
          );

          if (isUnauthorized && timer) {
            window.clearInterval(timer);
          }
        }
      }
    }

    void sync();
    timer = window.setInterval(sync, 5000);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  async function runMutation(action: () => Promise<CoffeeSnapshot>) {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await action());
      dispatchCalendarRefresh();
      window.dispatchEvent(new Event("activity-events:refresh"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

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
        onAddCup={() => void runMutation(addTodayCoffeeCup)}
        onRemoveCup={() => void runMutation(removeLatestTodayCoffeeCup)}
      />
      <CoffeeGrid
        snapshot={snapshot}
        busy={busy}
        onAddCup={() => void runMutation(addTodayCoffeeCup)}
        onRemoveCup={() => void runMutation(removeLatestTodayCoffeeCup)}
      />
    </section>
  );
}
