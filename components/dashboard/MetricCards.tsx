"use client";

import { AssetIcon } from "@/components/ui/AssetIcon";
import type { DashboardDrinkSummary, DashboardWorkoutSummary } from "@/lib/types";

interface MetricCardsProps {
  workoutSummary: DashboardWorkoutSummary;
  drinkSummary: DashboardDrinkSummary;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${remainder} 分钟`;
}

export function MetricCards({ workoutSummary, drinkSummary }: MetricCardsProps) {
  return (
    <section className="dashboard-metrics">
      <article className="dashboard-metric-tile dashboard-metric-tile-workout">
        <div className="dashboard-metric-accent">
          <span className="dashboard-metric-icon" aria-hidden="true">
            <img
              src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_workout_pixel.svg"
              alt=""
            />
          </span>
          <span className="dashboard-metric-tag">健身</span>
        </div>
        <div className="dashboard-metric-body">
          <div className="dashboard-metric-label">练了几天</div>
          <div className="dashboard-metric-value">{workoutSummary.days}</div>
          <div className="dashboard-metric-unit">天</div>
          <div className="dashboard-metric-secondary">
            共 {formatMinutes(workoutSummary.totalMinutes)}
          </div>
        </div>
      </article>

      <article className="dashboard-metric-tile dashboard-metric-tile-drink">
        <div className="dashboard-metric-accent">
          <span className="dashboard-metric-icon" aria-hidden="true">
            <AssetIcon name="drink" />
          </span>
          <span className="dashboard-metric-tag">喝水</span>
        </div>
        <div className="dashboard-metric-body">
          <div className="dashboard-metric-label">喝了几杯</div>
          <div className="dashboard-metric-value">{drinkSummary.cups}</div>
          <div className="dashboard-metric-unit">杯</div>
          <div className="dashboard-metric-secondary">
            你是最懂补水的人
          </div>
        </div>
      </article>
    </section>
  );
}
