"use client";

import { useEffect, useState } from "react";
import { fetchDashboardState } from "@/lib/api";
import { CALENDAR_REFRESH_EVENT } from "@/lib/calendar-refresh";
import { currentScope } from "@/lib/dashboard-scope";
import type { DashboardScope, DashboardSnapshot } from "@/lib/types";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DashboardHeader } from "./DashboardHeader";
import { DrinkBreakdownChart } from "./DrinkBreakdownChart";
import { MetricCards } from "./MetricCards";
import { MonthCalendar } from "./MonthCalendar";
import { WorkoutBalanceChart } from "./WorkoutBalanceChart";

export function DashboardBoard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [scope, setScope] = useState<DashboardScope>(() => currentScope(new Date()));
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBusy(true);
      setError(null);

      try {
        const nextSnapshot = await fetchDashboardState(scope);
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Dashboard 加载失败");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    function handleRefresh() {
      let cancelled = false;

      async function load() {
        try {
          const nextSnapshot = await fetchDashboardState(scope);
          if (!cancelled) {
            setSnapshot(nextSnapshot);
            setError(null);
          }
        } catch (caught) {
          if (!cancelled) {
            setError(caught instanceof Error ? caught.message : "Dashboard 刷新失败");
          }
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    };
  }, [scope]);

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
            <div className="calendar-paper-surface dashboard-paper-surface">
              <DashboardHeader scope={scope} onScopeChange={setScope} />

              <div className="dashboard-content-scroll">
                {error ? (
                  <div className="dashboard-loading-state">{error}</div>
                ) : snapshot && !busy ? (
                  <>
                    <MetricCards
                      workoutSummary={snapshot.workoutSummary}
                      drinkSummary={snapshot.drinkSummary}
                    />

                    <div className="dashboard-charts-row">
                      <WorkoutBalanceChart items={snapshot.workoutBalance} />
                      <DrinkBreakdownChart items={snapshot.drinkBreakdown} />
                    </div>

                    <ActivityHeatmap days={snapshot.heatmap} />

                    <MonthCalendar snapshot={snapshot.monthCalendar} />
                  </>
                ) : (
                  <div className="dashboard-loading-state">Dashboard 加载中...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
