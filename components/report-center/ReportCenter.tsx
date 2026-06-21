"use client";

import { useEffect, useState } from "react";
import type { DashboardScope, TeamDashboardSnapshot } from "@/lib/types";
import { fetchTeamDashboardState } from "@/lib/api";
import { currentScope } from "@/lib/dashboard-scope";
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
  const [scope, setScope] = useState<DashboardScope>(() => currentScope(new Date()));
  const [snapshot, setSnapshot] = useState<TeamDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTeamDashboardState(scope)
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
  }, [scope, retryNonce]);

  return (
    <div className="space-y-4 p-4">
      <TeamHeader scope={scope} onScopeChange={setScope} />

      {loading && !snapshot ? (
        <EmptyState message="加载中…" />
      ) : error ? (
        <div className="soft-card p-4">
          <EmptyState message="战报加载失败" />
          <button
            type="button"
            className="quest-btn mt-2"
            onClick={() => setRetryNonce((n) => n + 1)}
          >
            重试
          </button>
        </div>
      ) : snapshot ? (
        <>
          <MetricSummary metrics={snapshot.metrics} period={scope.type} />
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
