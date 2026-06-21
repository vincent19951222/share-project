"use client";

import { useEffect, useState } from "react";
import type { DashboardPeriod, TeamDashboardSnapshot } from "@/lib/types";
import { fetchTeamDashboardState } from "@/lib/api";
import { useBoard } from "@/lib/store";
import { TeamHeader } from "./TeamHeader";
import { MetricSummary } from "./MetricSummary";
import { SeasonSprintPanel } from "./SeasonSprintPanel";
import { PunchTrendChart } from "./PunchTrendChart";
import { WorkoutBalancePanel } from "./WorkoutBalancePanel";
import { DrinkCompositionPanel } from "./DrinkCompositionPanel";
import { EmptyState } from "./EmptyState";

export function ReportCenter() {
  const { state } = useBoard();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [snapshot, setSnapshot] = useState<TeamDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTeamDashboardState(period)
      .then((snap) => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="space-y-4 p-4">
      <TeamHeader period={period} onPeriodChange={setPeriod} />

      {loading && !snapshot ? (
        <EmptyState message="加载中…" />
      ) : error ? (
        <div className="soft-card p-4">
          <EmptyState message="战报加载失败" />
          <button
            type="button"
            className="quest-btn mt-2"
            onClick={() => setPeriod(period)}
          >
            重试
          </button>
        </div>
      ) : snapshot ? (
        <>
          <MetricSummary metrics={snapshot.metrics} period={period} />
          <SeasonSprintPanel season={state.activeSeason ?? null} />
          <div className="grid gap-4 md:grid-cols-3">
            <PunchTrendChart points={snapshot.punchTrend} />
            <WorkoutBalancePanel items={snapshot.workoutBalance} />
            <DrinkCompositionPanel
              breakdown={snapshot.drinkBreakdown}
              trend={snapshot.drinkTrend}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ReportCenter;
