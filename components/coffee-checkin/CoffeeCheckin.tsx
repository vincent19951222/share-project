"use client";

import { useEffect, useState } from "react";
import {
  addTodayCoffeeCup,
  fetchCoffeeState,
  removeLatestTodayCoffeeCup,
} from "@/lib/api";
import type { CoffeeSnapshot } from "@/lib/types";
import { CoffeeGrid } from "./CoffeeGrid";
import { CoffeeReceipt } from "./CoffeeReceipt";

export function CoffeeCheckin() {
  const [snapshot, setSnapshot] = useState<CoffeeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const next = await fetchCoffeeState();
        if (!cancelled) {
          setSnapshot(next);
        }
      } catch {
        if (!cancelled) {
          setError("咖啡小票同步失败，稍后再试。");
        }
      }
    }

    void sync();
    const timer = window.setInterval(sync, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function runMutation(action: () => Promise<CoffeeSnapshot>) {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
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
      <CoffeeGrid snapshot={snapshot} />
    </section>
  );
}
