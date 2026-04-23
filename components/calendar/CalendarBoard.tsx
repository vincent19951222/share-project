"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCalendarState } from "@/lib/api";
import type { CalendarMonthSnapshot } from "@/lib/types";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { formatCalendarMonthLabel, getPreviousMonthKey } from "./calendar-data";

type SnapshotCache = Record<string, CalendarMonthSnapshot>;

function validateMonthSnapshot(snapshot: CalendarMonthSnapshot): CalendarMonthSnapshot {
  formatCalendarMonthLabel(snapshot.monthKey);
  formatCalendarMonthLabel(snapshot.currentMonthKey);
  return snapshot;
}

export function CalendarBoard() {
  const [snapshotCache, setSnapshotCache] = useState<SnapshotCache>({});
  const [viewedMonthKey, setViewedMonthKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const snapshot = viewedMonthKey ? snapshotCache[viewedMonthKey] ?? null : null;

  useEffect(() => {
    void loadMonth();
  }, []);

  async function loadMonth(monthKey?: string) {
    setBusy(true);
    setError(null);

    try {
      const nextSnapshot = validateMonthSnapshot(await fetchCalendarState(monthKey));
      setSnapshotCache((current) => ({
        ...current,
        [nextSnapshot.monthKey]: nextSnapshot,
      }));
      setViewedMonthKey(nextSnapshot.monthKey);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "牛马日历加载失败");
    } finally {
      setBusy(false);
    }
  }

  async function showPreviousMonth() {
    if (!snapshot) {
      return;
    }

    const previousMonthKey = getPreviousMonthKey(snapshot.monthKey);
    const cachedSnapshot = snapshotCache[previousMonthKey];

    if (cachedSnapshot) {
      setViewedMonthKey(previousMonthKey);
      return;
    }

    await loadMonth(previousMonthKey);
  }

  function showCurrentMonth() {
    if (!snapshot) {
      return;
    }

    const cachedSnapshot = snapshotCache[snapshot.currentMonthKey];

    if (cachedSnapshot) {
      setViewedMonthKey(snapshot.currentMonthKey);
      return;
    }

    void loadMonth(snapshot.currentMonthKey);
  }

  const monthLabel = useMemo(() => {
    if (!snapshot) {
      return "加载中";
    }

    return formatCalendarMonthLabel(snapshot.monthKey);
  }, [snapshot]);

  const canReturnToCurrentMonth =
    snapshot !== null && snapshot.monthKey !== snapshot.currentMonthKey;

  return (
    <section className="absolute inset-0 overflow-y-auto p-4 sm:p-6">
      <div className="soft-card calendar-board-shell flex min-h-full flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <CalendarHeader
          monthLabel={monthLabel}
          busy={busy}
          canReturnToCurrentMonth={canReturnToCurrentMonth}
          onPreviousMonth={() => {
            void showPreviousMonth();
          }}
          onReturnToCurrentMonth={showCurrentMonth}
        />
        {snapshot ? (
          <>
            {error ? (
              <div className="rounded-[1rem] border-[3px] border-rose-300 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 text-sm font-black text-slate-900">
              <div className="calendar-summary-chip bg-yellow-200">
                本月练了 {snapshot.workoutDays} 天
              </div>
              <div className="calendar-summary-chip bg-orange-100">
                本月喝了 {snapshot.coffeeCupTotal} 杯
              </div>
            </div>
            <CalendarGrid snapshot={snapshot} />
          </>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-[1.1rem] border-[3px] border-dashed border-slate-300 bg-slate-50 px-4 text-center font-black text-slate-500">
            {error ?? "牛马日历加载中..."}
          </div>
        )}
      </div>
    </section>
  );
}
