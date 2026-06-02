"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCalendarState } from "@/lib/api";
import { CALENDAR_REFRESH_EVENT } from "@/lib/calendar-refresh";
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

  useEffect(() => {
    async function handleRefresh() {
      const currentMonthKey = snapshot?.currentMonthKey;

      if (!currentMonthKey) {
        return;
      }

      try {
        const refreshedSnapshot = validateMonthSnapshot(
          await fetchCalendarState(currentMonthKey),
        );
        setSnapshotCache((current) => ({
          ...current,
          [refreshedSnapshot.monthKey]: refreshedSnapshot,
        }));

        if (viewedMonthKey === null || viewedMonthKey === refreshedSnapshot.currentMonthKey) {
          setViewedMonthKey(refreshedSnapshot.monthKey);
        }
      } catch (caught) {
        if (viewedMonthKey === currentMonthKey) {
          setError(caught instanceof Error ? caught.message : "牛马日历加载失败");
        }
      }
    }

    window.addEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    };
  }, [snapshot, viewedMonthKey]);

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
  const drinkCupTotal = snapshot?.drinkCupTotal ?? snapshot?.coffeeCupTotal ?? 0;

  return (
    <section className="calendar-board-viewport absolute inset-0">
      <div className="calendar-scene">
        <div className="calendar-scene-background" aria-hidden="true" />
        <div className="calendar-scene-props" aria-hidden="true">
          <img
            className="calendar-prop calendar-prop-rings"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_binder_rings_left.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-clip"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_binder_clip.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-highlighter"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_highlighter_focus_progress.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-sticker"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_sticker_just_lift.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-note"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_note_keep_going_purple.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-stamp"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_calendar_coffee_stamp_paper.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-stain"
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_calendar_calendar_coffee_ring_stain.webp"
            alt=""
          />
        </div>
        <div className="calendar-scene-content">
          <div className="calendar-binder-shell">
            <div className="calendar-paper-surface">
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
                    <div className="calendar-error-message">
                      {error}
                    </div>
                  ) : null}
                  <div className="calendar-summary-row">
                    <div className="calendar-summary-chip calendar-summary-chip-workout">
                      <span className="calendar-summary-icon" aria-hidden="true">
                        <img src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_workout_pixel.svg" alt="" />
                      </span>
                      <span className="calendar-summary-label">本月练了</span>
                      <strong className="calendar-summary-value">{snapshot.workoutDays}</strong>
                      <span className="calendar-summary-unit">天</span>
                    </div>
                    <div className="calendar-summary-chip calendar-summary-chip-coffee">
                      <span className="calendar-summary-icon" aria-hidden="true">
                        <img src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_coffee_pixel.svg" alt="" />
                      </span>
                      <span className="calendar-summary-label">本月喝了</span>
                      <strong className="calendar-summary-value">{drinkCupTotal}</strong>
                      <span className="calendar-summary-unit">杯</span>
                    </div>
                  </div>
                  <CalendarGrid snapshot={snapshot} />
                </>
              ) : (
                <div className="calendar-loading-state">
                  {error ?? "牛马日历加载中..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
