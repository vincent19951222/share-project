"use client";

import type { DashboardHeatmapDay } from "@/lib/types";
import { getHeatmapMonthLabels, getHeatmapWeekCount } from "./dashboard-data";

interface ActivityHeatmapProps {
  days: DashboardHeatmapDay[];
  year: number;
}

export function ActivityHeatmap({ days, year }: ActivityHeatmapProps) {
  const weekCount = getHeatmapWeekCount(days);
  const monthLabels = getHeatmapMonthLabels(days);

  return (
    <section className="dashboard-heatmap-panel">
      <div className="dashboard-chart-heading">
        <span className="dashboard-chart-chip">全年活跃</span>
        <h2 className="dashboard-chart-title">{year} 年活跃度</h2>
      </div>

      <div className="dashboard-heatmap">
        <div className="dashboard-heatmap-scroll">
          <div
            className="dashboard-heatmap-month-track"
            aria-hidden="true"
            style={{
              gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
            }}
          >
            {monthLabels.map((item) => (
              <span
                key={item.column}
                className="dashboard-heatmap-month-name"
                style={{
                  gridColumn: item.column,
                }}
              >
                {item.label}
              </span>
            ))}
          </div>

          <div
            className="dashboard-heatmap-grid"
            style={{
              gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            }}
            role="grid"
            aria-label={`${year} 年个人活跃度热力图`}
          >
            {days.map((day) => (
              <div
                key={day.dayKey}
                className={`dashboard-heatmap-cell dashboard-heatmap-cell-intensity-${day.intensityLevel}`}
                role="gridcell"
                title={`${day.month}月${day.day}日 · 训练 ${day.workoutMinutes} 分钟 · 饮水 ${day.drinkCups} 杯`}
                aria-label={`${day.month}月${day.day}日，训练 ${day.workoutMinutes} 分钟，饮水 ${day.drinkCups} 杯`}
              />
            ))}
          </div>
        </div>

        <div className="dashboard-heatmap-legend">
          <span className="dashboard-heatmap-legend-label">少</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`dashboard-heatmap-cell dashboard-heatmap-cell-intensity-${level}`}
              aria-hidden="true"
            />
          ))}
          <span className="dashboard-heatmap-legend-label">多</span>
        </div>
      </div>
    </section>
  );
}
